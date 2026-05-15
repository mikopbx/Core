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

/* global globalTranslate, PbxApi, Form, globalRootUrl, Datatable, SemanticLocalization, FirewallAPI, Fail2BanAPI, Fail2BanTooltipManager, fail2banWhitelist */

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
   * Update the info panel under the slider with the current preset's values.
   * MaxReqSec shows ∞ when the rate limit is auto-disabled (>200 extensions —
   * NAT scenario where the per-source limit is unsafe and we already drop it
   * to 0 in cbAfterSelectSecurityPreset).
   *
   * @param {Object} preset - The preset object with maxretry, findtime, bantime, maxReqSec.
   */
  updatePresetInfoPanel: function updatePresetInfoPanel(preset) {
    $('#preset-maxretry-value').text(preset.maxretry);
    $('#preset-findtime-value').text(fail2BanIndex.formatDuration(preset.findtime));
    $('#preset-bantime-value').text(fail2BanIndex.formatDuration(preset.bantime));
    var maxReqSec = fail2BanIndex.extensionsCount > 200 ? 0 : preset.maxReqSec;
    $('#preset-maxreqsec-value').text(maxReqSec === 0 ? globalTranslate.f2b_MaxReqSecUnlimited || '∞' : maxReqSec);
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
      }, // Ban date — orthogonal data: numeric timestamp for sorting,
      // formatted DD.MM.YYYY HH:MM for display. Without this DataTables
      // falls back to lexicographic sort on the rendered string and
      // 05.05.2026 ends up "before" 30.04.2026.
      {
        orderable: true,
        searchable: false,
        type: 'num',
        render: function render(data, type) {
          if (type === 'display') {
            return Number.isFinite(data) && data > 0 ? fail2BanIndex.formatDateTime(data) : '';
          }

          return data;
        }
      }, // Expires — same orthogonal-data pattern as Ban date.
      {
        orderable: true,
        searchable: false,
        type: 'num',
        render: function render(data, type) {
          if (type === 'display') {
            return Number.isFinite(data) && data > 0 ? fail2BanIndex.formatDateTime(data) : '';
          }

          return data;
        }
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
      }); // Pass raw timestamps; the column's render() formats for display
      // and returns the number for sort/type/filter (orthogonal data).
      // null for "unknown" so DataTables sorts those rows to the end on asc.

      var banDateValue = earliestBan < Infinity ? earliestBan : null;
      var expiresValue = latestExpiry > 0 ? latestExpiry : null;
      var row = [ipDisplay, reasonTags, banDateValue, expiresValue, "<button class=\"ui icon basic mini button right floated unban-button\" data-value=\"".concat(ip, "\"><i class=\"icon trash red\"></i> ").concat(globalTranslate.f2b_Unban, "</button>")];
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
   * Callback function to be called before the form is sent.
   * Whitelist is managed in its own tab via fail2ban-whitelist.js and is NOT
   * part of this form — do not include it in the PATCH payload, otherwise we'd
   * clobber edits made through the dedicated tab.
   *
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = fail2BanIndex.$formObj.form('get values');
    delete result.data.whitelist;
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
        var data = response.data; // Set form values (whitelist is managed in its own tab — not part of this form).

        fail2BanIndex.$formObj.form('set values', {
          maxretry: data.maxretry,
          bantime: data.bantime,
          findtime: data.findtime,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkYmFubmVkSXBMaXN0VGFibGUiLCIkYmFubmVkSXBUYWJTZWdtZW50IiwiJHNlY3VyaXR5UHJlc2V0U2xpZGVyIiwic2VjdXJpdHlQcmVzZXRzIiwibWF4cmV0cnkiLCJmaW5kdGltZSIsImJhbnRpbWUiLCJtYXhSZXFTZWMiLCJzZWN1cml0eU1vZGUiLCJleHRlbnNpb25zQ291bnQiLCJkYXRhVGFibGUiLCIkdW5iYW5CdXR0b25zIiwiJGdsb2JhbFNlYXJjaCIsInZhbGlkYXRlUnVsZXMiLCJpbml0aWFsaXplIiwiJCIsImNsb3Nlc3QiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwiZjJiX01heFJlcVNlY1VubGltaXRlZCIsInNlY29uZHMiLCJtaW51dGVzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZjJiX0R1cmF0aW9uRGF5cyIsImYyYl9EdXJhdGlvbkhvdXJzIiwiZjJiX0R1cmF0aW9uTWludXRlcyIsImRldGVjdFByZXNldExldmVsIiwiaSIsInAiLCJtaW5EaWZmIiwiSW5maW5pdHkiLCJkaWZmIiwiYWJzIiwiamFpbFRhZ01hcCIsInRhZyIsImNvbG9yIiwib25WaXNpYmxlIiwiZGF0YSIsIm5ld1BhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwicGFnZSIsImxlbiIsImRyYXciLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJwYWdlTGVuZ3RoIiwic2Nyb2xsQ29sbGFwc2UiLCJkZWZlclJlbmRlciIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidHlwZSIsInJlbmRlciIsIk51bWJlciIsImlzRmluaXRlIiwiZm9ybWF0RGF0ZVRpbWUiLCJvcmRlciIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJjcmVhdGVkUm93Iiwicm93IiwiZXEiLCJhZGRDbGFzcyIsImRyYXdDYWxsYmFjayIsImZpbmQiLCJwb3B1cCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkUmVhc29uVGFncyIsImJhbnMiLCJ0YWdHcm91cHMiLCJmb3JFYWNoIiwiYmFuIiwiamFpbCIsIm1hcHBpbmciLCJ0cmFuc2xhdGVLZXkiLCJmdWxsUmVhc29uIiwicmVhc29ucyIsImluZGV4T2YiLCJwdXNoIiwiaHRtbCIsIk9iamVjdCIsImtleXMiLCJncm91cCIsInRvb2x0aXBDb250ZW50Iiwiam9pbiIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJiYW5uZWRJcHMiLCJjbGVhciIsIm5ld0RhdGEiLCJpcCIsImlwRGF0YSIsImNvdW50cnkiLCJjb3VudHJ5TmFtZSIsImlwRGlzcGxheSIsInRvTG93ZXJDYXNlIiwicmVhc29uVGFncyIsImVhcmxpZXN0QmFuIiwibGF0ZXN0RXhwaXJ5IiwidGltZW9mYmFuIiwidGltZXVuYmFuIiwiYmFuRGF0ZVZhbHVlIiwiZXhwaXJlc1ZhbHVlIiwiZjJiX1VuYmFuIiwicm93cyIsImFkZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsIndoaXRlbGlzdCIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZhaWwyQmFuQVBJIiwiZ2V0U2V0dGluZ3MiLCJQQlhGaXJld2FsbE1heFJlcVNlYyIsInBhcnNlSW50IiwicHJlc2V0SWR4IiwidGltZXN0YW1wIiwiZCIsIkRhdGUiLCJkYXkiLCJnZXREYXRlIiwicGFkU3RhcnQiLCJtb250aCIsImdldE1vbnRoIiwieWVhciIsImdldEZ1bGxZZWFyIiwiZ2V0SG91cnMiLCJnZXRNaW51dGVzIiwicm93SGVpZ2h0IiwibGFzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJhcHBlbmQiLCJleF9Mb2FkaW5nRGF0YSIsInJlbW92ZUNsYXNzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBUFE7O0FB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LENBQUM2SSxjQUZ0RDtBQUtIOztBQUNEM0wsSUFBQUEsYUFBYSxDQUFDRyxtQkFBZCxDQUFrQzRHLElBQWxDLENBQXVDLGNBQXZDLEVBQXVERixRQUF2RCxDQUFnRSxRQUFoRTtBQUNILEdBNWlCaUI7O0FBOGlCbEI7QUFDSjtBQUNBO0FBQ0k0QixFQUFBQSxvQkFqakJrQixrQ0FpakJLO0FBQ25CekksSUFBQUEsYUFBYSxDQUFDRyxtQkFBZCxDQUFrQzRHLElBQWxDLENBQXVDLGNBQXZDLEVBQXVENkUsV0FBdkQsQ0FBbUUsUUFBbkU7QUFDSCxHQW5qQmlCOztBQXFqQmxCO0FBQ0o7QUFDQTtBQUNJdkssRUFBQUEsY0F4akJrQiw0QkF3akJEO0FBQ2JvQyxJQUFBQSxJQUFJLENBQUN4RCxRQUFMLEdBQWdCRCxhQUFhLENBQUNDLFFBQTlCO0FBQ0F3RCxJQUFBQSxJQUFJLENBQUMxQyxhQUFMLEdBQXFCZixhQUFhLENBQUNlLGFBQW5DO0FBQ0EwQyxJQUFBQSxJQUFJLENBQUNxRyxnQkFBTCxHQUF3QjlKLGFBQWEsQ0FBQzhKLGdCQUF0QztBQUNBckcsSUFBQUEsSUFBSSxDQUFDd0csZUFBTCxHQUF1QmpLLGFBQWEsQ0FBQ2lLLGVBQXJDLENBSmEsQ0FNYjs7QUFDQXhHLElBQUFBLElBQUksQ0FBQ29JLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFN0IsV0FGSTtBQUdmOEIsTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BdkksSUFBQUEsSUFBSSxDQUFDekMsVUFBTDtBQUNIO0FBdGtCaUIsQ0FBdEIsQyxDQXlrQkE7O0FBQ0FDLENBQUMsQ0FBQ2dMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJsTSxFQUFBQSxhQUFhLENBQUNnQixVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRm9ybSwgZ2xvYmFsUm9vdFVybCwgRGF0YXRhYmxlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlyZXdhbGxBUEksIEZhaWwyQmFuQVBJLCBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyLCBmYWlsMmJhbldoaXRlbGlzdCAqL1xuLyoqXG4gKiBUaGUgYGZhaWwyQmFuSW5kZXhgIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGYWlsMkJhbiBzeXN0ZW0uXG4gKlxuICogQG1vZHVsZSBmYWlsMkJhbkluZGV4XG4gKi9cbmNvbnN0IGZhaWwyQmFuSW5kZXggPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5uZWRJcExpc3RUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJlbnQgc2VnbWVudCBjb250YWluaW5nIHRoZSBiYW5uZWQgSVBzIHRhYiAoZm9yIGRpbW1lciBvdmVybGF5KVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwVGFiU2VnbWVudDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3VyaXR5UHJlc2V0U2xpZGVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgcHJlc2V0IGRlZmluaXRpb25zLlxuICAgICAqIEVhY2ggcHJlc2V0IGRlZmluZXMgbWF4cmV0cnksIGZpbmR0aW1lIChzZWNvbmRzKSwgYW5kIGJhbnRpbWUgKHNlY29uZHMpLlxuICAgICAqL1xuICAgIHNlY3VyaXR5UHJlc2V0czogW1xuICAgICAgICB7IC8vIDA6IFdlYWtcbiAgICAgICAgICAgIG1heHJldHJ5OiAyMCxcbiAgICAgICAgICAgIGZpbmR0aW1lOiA2MDAsICAgICAvLyAxMCBtaW5cbiAgICAgICAgICAgIGJhbnRpbWU6IDYwMCwgICAgICAvLyAxMCBtaW5cbiAgICAgICAgICAgIG1heFJlcVNlYzogNTAwLCAgICAvLyBTSVAgcmF0ZSBsaW1pdCAoZGlzYWJsZWQgaWYgPjIwMCBleHRlbnNpb25zKVxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAncmVsYXhlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gMTogTm9ybWFsXG4gICAgICAgICAgICBtYXhyZXRyeTogMTAsXG4gICAgICAgICAgICBmaW5kdGltZTogMzYwMCwgICAgLy8gMSBob3VyXG4gICAgICAgICAgICBiYW50aW1lOiA4NjQwMCwgICAgLy8gMSBkYXlcbiAgICAgICAgICAgIG1heFJlcVNlYzogMzAwLFxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAnYmFsYW5jZWQnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDI6IEVuaGFuY2VkXG4gICAgICAgICAgICBtYXhyZXRyeTogNSxcbiAgICAgICAgICAgIGZpbmR0aW1lOiAyMTYwMCwgICAvLyA2IGhvdXJzXG4gICAgICAgICAgICBiYW50aW1lOiA2MDQ4MDAsICAgLy8gNyBkYXlzXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDE1MCxcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ3N0cmljdCcsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gMzogUGFyYW5vaWRcbiAgICAgICAgICAgIG1heHJldHJ5OiAzLFxuICAgICAgICAgICAgZmluZHRpbWU6IDg2NDAwLCAgIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICBiYW50aW1lOiAyNTkyMDAwLCAgLy8gMzAgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxMDAsXG4gICAgICAgICAgICBzZWN1cml0eU1vZGU6ICdwYXJhbm9pZCcsXG4gICAgICAgIH0sXG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIE51bWJlciBvZiBleHRlbnNpb25zIOKAlCBsb2FkZWQgZnJvbSBBUEkgdG8gZGV0ZXJtaW5lIE1heFJlcVNlYyBiZWhhdmlvci5cbiAgICAgKiBJZiA+MjAwLCBNYXhSZXFTZWMgaXMgZGlzYWJsZWQgKE5BVCBzY2VuYXJpbykuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBleHRlbnNpb25zQ291bnQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge0RhdGF0YWJsZX1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdW5iYW4gYnV0dG9uc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVuYmFuQnV0dG9uczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8vIFRoaXMgbWV0aG9kIGluaXRpYWxpemVzIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqID0gJCgnI2ZhaWwyYmFuLXNldHRpbmdzLWZvcm0nKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUgPSAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50ID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuY2xvc2VzdCgnLnNlZ21lbnQnKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIgPSAkKCcjU2VjdXJpdHlQcmVzZXRTbGlkZXInKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kdW5iYW5CdXR0b25zID0gJCgnLnVuYmFuLWJ1dHRvbicpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRnbG9iYWxTZWFyY2ggPSAkKCcjZ2xvYmFsLXNlYXJjaCcpO1xuXG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGlmICh0eXBlb2YgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUub24oJ2NsaWNrJywgJy51bmJhbi1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHVuYmFubmVkSXAgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcCh1bmJhbm5lZElwLCBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJVbkJhbklwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyXG4gICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMyxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFdlYWssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldE5vcm1hbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0RW5oYW5jZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogVXBkYXRlcyBtYXhyZXRyeSwgZmluZHRpbWUsIGJhbnRpbWUgdmFsdWVzIGFuZCB0aGUgaW5mbyBwYW5lbC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgcHJlc2V0IGluZGV4ICgwLTMpLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTZWN1cml0eVByZXNldCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBwcmVzZXQgPSBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1t2YWx1ZV07XG4gICAgICAgIGlmICghcHJlc2V0KSByZXR1cm47XG5cbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmb3JtIGZpZWxkc1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtYXhyZXRyeScsIHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbmR0aW1lJywgcHJlc2V0LmZpbmR0aW1lKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnYmFudGltZScsIHByZXNldC5iYW50aW1lKTtcblxuICAgICAgICAvLyBTZXQgTWF4UmVxU2VjOiBkaXNhYmxlZCAoMCkgaWYgPjIwMCBleHRlbnNpb25zIChOQVQgc2NlbmFyaW8pXG4gICAgICAgIGNvbnN0IG1heFJlcVNlYyA9IGZhaWwyQmFuSW5kZXguZXh0ZW5zaW9uc0NvdW50ID4gMjAwID8gMCA6IHByZXNldC5tYXhSZXFTZWM7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWEZpcmV3YWxsTWF4UmVxU2VjJywgU3RyaW5nKG1heFJlcVNlYykpO1xuXG4gICAgICAgIC8vIEhUVFAgcmF0ZS1saW1pdCBwcm9maWxlIHJlYWQgYnkgdW5pZmllZC1zZWN1cml0eS5sdWFcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYU2VjdXJpdHlNb2RlJywgcHJlc2V0LnNlY3VyaXR5TW9kZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZm8gcGFuZWxcbiAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KTtcblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgaW5mbyBwYW5lbCB1bmRlciB0aGUgc2xpZGVyIHdpdGggdGhlIGN1cnJlbnQgcHJlc2V0J3MgdmFsdWVzLlxuICAgICAqIE1heFJlcVNlYyBzaG93cyDiiJ4gd2hlbiB0aGUgcmF0ZSBsaW1pdCBpcyBhdXRvLWRpc2FibGVkICg+MjAwIGV4dGVuc2lvbnMg4oCUXG4gICAgICogTkFUIHNjZW5hcmlvIHdoZXJlIHRoZSBwZXItc291cmNlIGxpbWl0IGlzIHVuc2FmZSBhbmQgd2UgYWxyZWFkeSBkcm9wIGl0XG4gICAgICogdG8gMCBpbiBjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHByZXNldCAtIFRoZSBwcmVzZXQgb2JqZWN0IHdpdGggbWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lLCBtYXhSZXFTZWMuXG4gICAgICovXG4gICAgdXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCkge1xuICAgICAgICAkKCcjcHJlc2V0LW1heHJldHJ5LXZhbHVlJykudGV4dChwcmVzZXQubWF4cmV0cnkpO1xuICAgICAgICAkKCcjcHJlc2V0LWZpbmR0aW1lLXZhbHVlJykudGV4dChmYWlsMkJhbkluZGV4LmZvcm1hdER1cmF0aW9uKHByZXNldC5maW5kdGltZSkpO1xuICAgICAgICAkKCcjcHJlc2V0LWJhbnRpbWUtdmFsdWUnKS50ZXh0KGZhaWwyQmFuSW5kZXguZm9ybWF0RHVyYXRpb24ocHJlc2V0LmJhbnRpbWUpKTtcblxuICAgICAgICBjb25zdCBtYXhSZXFTZWMgPSBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA+IDIwMCA/IDAgOiBwcmVzZXQubWF4UmVxU2VjO1xuICAgICAgICAkKCcjcHJlc2V0LW1heHJlcXNlYy12YWx1ZScpLnRleHQoXG4gICAgICAgICAgICBtYXhSZXFTZWMgPT09IDBcbiAgICAgICAgICAgICAgICA/IChnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlY1VubGltaXRlZCB8fCAn4oieJylcbiAgICAgICAgICAgICAgICA6IG1heFJlcVNlY1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgc2Vjb25kcyBpbnRvIGEgaHVtYW4tcmVhZGFibGUgZHVyYXRpb24gc3RyaW5nLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gRHVyYXRpb24gaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZHVyYXRpb24uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25EYXlzfWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkhvdXJzfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uTWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3Qgd2hpY2ggc2VjdXJpdHkgcHJlc2V0IG1hdGNoZXMgY3VycmVudCB2YWx1ZXMuXG4gICAgICogUmV0dXJucyBwcmVzZXQgaW5kZXggKDAtMykgb3IgZGVmYXVsdHMgdG8gMSAoTm9ybWFsKSBpZiBubyBleGFjdCBtYXRjaC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4cmV0cnlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZmluZHRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhbnRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge251bWJlcn0gUHJlc2V0IGluZGV4LlxuICAgICAqL1xuICAgIGRldGVjdFByZXNldExldmVsKG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV07XG4gICAgICAgICAgICBpZiAocC5tYXhyZXRyeSA9PT0gbWF4cmV0cnkgJiYgcC5maW5kdGltZSA9PT0gZmluZHRpbWUgJiYgcC5iYW50aW1lID09PSBiYW50aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gZXhhY3QgbWF0Y2gg4oCUIGZpbmQgY2xvc2VzdCBieSBjb21wYXJpbmcgYmFudGltZVxuICAgICAgICBsZXQgY2xvc2VzdCA9IDE7XG4gICAgICAgIGxldCBtaW5EaWZmID0gSW5maW5pdHk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXS5iYW50aW1lIC0gYmFudGltZSk7XG4gICAgICAgICAgICBpZiAoZGlmZiA8IG1pbkRpZmYpIHtcbiAgICAgICAgICAgICAgICBtaW5EaWZmID0gZGlmZjtcbiAgICAgICAgICAgICAgICBjbG9zZXN0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VzdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5nIG9mIGphaWwgbmFtZXMgdG8gc2hvcnQgdGFnIGxhYmVscyBhbmQgY29sb3JzLlxuICAgICAqIFVzZWQgdG8gcmVuZGVyIGNvbXBhY3QgY29sb3JlZCBsYWJlbHMgaW5zdGVhZCBvZiB2ZXJib3NlIGJhbiByZWFzb24gdGV4dC5cbiAgICAgKi9cbiAgICBqYWlsVGFnTWFwOiB7XG4gICAgICAgICdhc3Rlcmlza19hbWlfdjInOiB7IHRhZzogJ0FNSScsIGNvbG9yOiAnb3JhbmdlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfZXJyb3JfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3B1YmxpY192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfc2VjdXJpdHlfbG9nX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfaWF4X3YyJzogeyB0YWc6ICdJQVgnLCBjb2xvcjogJ3RlYWwnIH0sXG4gICAgICAgICdkcm9wYmVhcl92Mic6IHsgdGFnOiAnU1NIJywgY29sb3I6ICdncmV5JyB9LFxuICAgICAgICAnbWlrb3BieC1leHBsb2l0LXNjYW5uZXJfdjInOiB7IHRhZzogJ1NDQU4nLCBjb2xvcjogJ3JlZCcgfSxcbiAgICAgICAgJ21pa29wYngtbmdpbngtZXJyb3JzX3YyJzogeyB0YWc6ICdOR0lOWCcsIGNvbG9yOiAncHVycGxlJyB9LFxuICAgICAgICAnbWlrb3BieC13d3dfdjInOiB7IHRhZzogJ1dFQicsIGNvbG9yOiAnb2xpdmUnIH0sXG4gICAgfSxcblxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvbiB0YWdzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJhbiBkYXRlIOKAlCBvcnRob2dvbmFsIGRhdGE6IG51bWVyaWMgdGltZXN0YW1wIGZvciBzb3J0aW5nLFxuICAgICAgICAgICAgICAgIC8vIGZvcm1hdHRlZCBERC5NTS5ZWVlZIEhIOk1NIGZvciBkaXNwbGF5LiBXaXRob3V0IHRoaXMgRGF0YVRhYmxlc1xuICAgICAgICAgICAgICAgIC8vIGZhbGxzIGJhY2sgdG8gbGV4aWNvZ3JhcGhpYyBzb3J0IG9uIHRoZSByZW5kZXJlZCBzdHJpbmcgYW5kXG4gICAgICAgICAgICAgICAgLy8gMDUuMDUuMjAyNiBlbmRzIHVwIFwiYmVmb3JlXCIgMzAuMDQuMjAyNi5cbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW0nLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXIoZGF0YSwgdHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkaXNwbGF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBOdW1iZXIuaXNGaW5pdGUoZGF0YSkgJiYgZGF0YSA+IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBmYWlsMkJhbkluZGV4LmZvcm1hdERhdGVUaW1lKGRhdGEpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEV4cGlyZXMg4oCUIHNhbWUgb3J0aG9nb25hbC1kYXRhIHBhdHRlcm4gYXMgQmFuIGRhdGUuXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtJyxcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyKGRhdGEsIHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKGRhdGEpICYmIGRhdGEgPiAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gZmFpbDJCYW5JbmRleC5mb3JtYXREYXRlVGltZShkYXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCdXR0b25zXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbMCwgJ2FzYyddLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93KSB7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGFmdGVyIGVhY2ggRGF0YVRhYmxlIGRyYXcgKGhhbmRsZXMgcGFnaW5hdGlvbilcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuY291bnRyeS1mbGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgnLmJhbi1yZWFzb24tdGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBmb3IgcmVhc29uIHRhZ3MgZnJvbSBiYW4gZW50cmllcy5cbiAgICAgKiBHcm91cHMgYmFucyBieSB0YWcgbGFiZWwsIGRlZHVwbGljYXRlcywgYW5kIHJlbmRlcnMgY29sb3JlZCBsYWJlbHMgd2l0aCBwb3B1cCB0b29sdGlwcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJhbnMgLSBBcnJheSBvZiBiYW4gb2JqZWN0cyB3aXRoIGphaWwsIHRpbWVvZmJhbiwgdGltZXVuYmFuIHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgd2l0aCB0YWcgbGFiZWxzLlxuICAgICAqL1xuICAgIGJ1aWxkUmVhc29uVGFncyhiYW5zKSB7XG4gICAgICAgIC8vIEdyb3VwIGJ5IHRhZyBsYWJlbCB0byBkZWR1cGxpY2F0ZSAoZS5nLiBtdWx0aXBsZSBTSVAgamFpbHMg4oaSIG9uZSBTSVAgdGFnKVxuICAgICAgICBjb25zdCB0YWdHcm91cHMgPSB7fTtcbiAgICAgICAgYmFucy5mb3JFYWNoKGJhbiA9PiB7XG4gICAgICAgICAgICBjb25zdCBqYWlsID0gYmFuLmphaWwgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBtYXBwaW5nID0gZmFpbDJCYW5JbmRleC5qYWlsVGFnTWFwW2phaWxdIHx8IHsgdGFnOiBqYWlsLCBjb2xvcjogJ2dyZXknIH07XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgZjJiX0phaWxfJHtqYWlsfWA7XG4gICAgICAgICAgICBjb25zdCBmdWxsUmVhc29uID0gZ2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV0gfHwgamFpbDtcblxuICAgICAgICAgICAgaWYgKCF0YWdHcm91cHNbbWFwcGluZy50YWddKSB7XG4gICAgICAgICAgICAgICAgdGFnR3JvdXBzW21hcHBpbmcudGFnXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IG1hcHBpbmcuY29sb3IsXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbnM6IFtdLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBdm9pZCBkdXBsaWNhdGUgcmVhc29ucyB3aXRoaW4gdGhlIHNhbWUgdGFnIGdyb3VwXG4gICAgICAgICAgICBpZiAodGFnR3JvdXBzW21hcHBpbmcudGFnXS5yZWFzb25zLmluZGV4T2YoZnVsbFJlYXNvbikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGFnR3JvdXBzW21hcHBpbmcudGFnXS5yZWFzb25zLnB1c2goZnVsbFJlYXNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIE9iamVjdC5rZXlzKHRhZ0dyb3VwcykuZm9yRWFjaCh0YWcgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0YWdHcm91cHNbdGFnXTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZ3JvdXAucmVhc29ucy5qb2luKCcsICcpO1xuICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gY2xhc3M9XCJ1aSBtaW5pICR7Z3JvdXAuY29sb3J9IGxhYmVsIGJhbi1yZWFzb24tdGFnXCIgZGF0YS1jb250ZW50PVwiJHt0b29sdGlwQ29udGVudH1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPiR7dGFnfTwvc3Bhbj4gYDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIHRvIGRpc3BsYXkgdGhlIGxpc3Qgb2YgYmFubmVkIElQcy5cbiAgICBjYkdldEJhbm5lZElwTGlzdChyZXNwb25zZSkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LmhpZGVCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmFubmVkSXBzID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5jbGVhcigpO1xuXG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBbXTtcbiAgICAgICAgT2JqZWN0LmtleXMoYmFubmVkSXBzKS5mb3JFYWNoKGlwID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwRGF0YSA9IGJhbm5lZElwc1tpcF07XG4gICAgICAgICAgICBjb25zdCBiYW5zID0gaXBEYXRhLmJhbnMgfHwgW107XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5ID0gaXBEYXRhLmNvdW50cnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5TmFtZSA9IGlwRGF0YS5jb3VudHJ5TmFtZSB8fCAnJztcblxuICAgICAgICAgICAgLy8gQnVpbGQgSVAgZGlzcGxheSB3aXRoIGNvdW50cnkgZmxhZ1xuICAgICAgICAgICAgbGV0IGlwRGlzcGxheSA9IGlwO1xuICAgICAgICAgICAgaWYgKGNvdW50cnkpIHtcbiAgICAgICAgICAgICAgICBpcERpc3BsYXkgPSBgPHNwYW4gY2xhc3M9XCJjb3VudHJ5LWZsYWdcIiBkYXRhLWNvbnRlbnQ9XCIke2NvdW50cnlOYW1lfVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+PGkgY2xhc3M9XCJmbGFnICR7Y291bnRyeS50b0xvd2VyQ2FzZSgpfVwiPjwvaT48L3NwYW4+JHtpcH1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCdWlsZCByZWFzb24gdGFnc1xuICAgICAgICAgICAgY29uc3QgcmVhc29uVGFncyA9IGZhaWwyQmFuSW5kZXguYnVpbGRSZWFzb25UYWdzKGJhbnMpO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgZWFybGllc3QgYmFuIGRhdGUgYW5kIGxhdGVzdCBleHBpcnkgYWNyb3NzIGFsbCBiYW5zXG4gICAgICAgICAgICBsZXQgZWFybGllc3RCYW4gPSBJbmZpbml0eTtcbiAgICAgICAgICAgIGxldCBsYXRlc3RFeHBpcnkgPSAwO1xuICAgICAgICAgICAgYmFucy5mb3JFYWNoKGJhbiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1lb2ZiYW4gPCBlYXJsaWVzdEJhbikge1xuICAgICAgICAgICAgICAgICAgICBlYXJsaWVzdEJhbiA9IGJhbi50aW1lb2ZiYW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChiYW4udGltZXVuYmFuID4gbGF0ZXN0RXhwaXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxhdGVzdEV4cGlyeSA9IGJhbi50aW1ldW5iYW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFBhc3MgcmF3IHRpbWVzdGFtcHM7IHRoZSBjb2x1bW4ncyByZW5kZXIoKSBmb3JtYXRzIGZvciBkaXNwbGF5XG4gICAgICAgICAgICAvLyBhbmQgcmV0dXJucyB0aGUgbnVtYmVyIGZvciBzb3J0L3R5cGUvZmlsdGVyIChvcnRob2dvbmFsIGRhdGEpLlxuICAgICAgICAgICAgLy8gbnVsbCBmb3IgXCJ1bmtub3duXCIgc28gRGF0YVRhYmxlcyBzb3J0cyB0aG9zZSByb3dzIHRvIHRoZSBlbmQgb24gYXNjLlxuICAgICAgICAgICAgY29uc3QgYmFuRGF0ZVZhbHVlID0gZWFybGllc3RCYW4gPCBJbmZpbml0eSA/IGVhcmxpZXN0QmFuIDogbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IGV4cGlyZXNWYWx1ZSA9IGxhdGVzdEV4cGlyeSA+IDAgPyBsYXRlc3RFeHBpcnkgOiBudWxsO1xuXG4gICAgICAgICAgICBjb25zdCByb3cgPSBbXG4gICAgICAgICAgICAgICAgaXBEaXNwbGF5LFxuICAgICAgICAgICAgICAgIHJlYXNvblRhZ3MsXG4gICAgICAgICAgICAgICAgYmFuRGF0ZVZhbHVlLFxuICAgICAgICAgICAgICAgIGV4cGlyZXNWYWx1ZSxcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gcmlnaHQgZmxvYXRlZCB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtpcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+YCxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBuZXdEYXRhLnB1c2gocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucm93cy5hZGQobmV3RGF0YSkuZHJhdygpO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIGFmdGVyIGFuIElQIGhhcyBiZWVuIHVuYmFubmVkLlxuICAgIGNiQWZ0ZXJVbkJhbklwKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50LlxuICAgICAqIFdoaXRlbGlzdCBpcyBtYW5hZ2VkIGluIGl0cyBvd24gdGFiIHZpYSBmYWlsMmJhbi13aGl0ZWxpc3QuanMgYW5kIGlzIE5PVFxuICAgICAqIHBhcnQgb2YgdGhpcyBmb3JtIOKAlCBkbyBub3QgaW5jbHVkZSBpdCBpbiB0aGUgUEFUQ0ggcGF5bG9hZCwgb3RoZXJ3aXNlIHdlJ2RcbiAgICAgKiBjbG9iYmVyIGVkaXRzIG1hZGUgdGhyb3VnaCB0aGUgZGVkaWNhdGVkIHRhYi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YS53aGl0ZWxpc3Q7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyAod2hpdGVsaXN0IGlzIG1hbmFnZWQgaW4gaXRzIG93biB0YWIg4oCUIG5vdCBwYXJ0IG9mIHRoaXMgZm9ybSkuXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBtYXhyZXRyeTogZGF0YS5tYXhyZXRyeSxcbiAgICAgICAgICAgICAgICAgICAgYmFudGltZTogZGF0YS5iYW50aW1lLFxuICAgICAgICAgICAgICAgICAgICBmaW5kdGltZTogZGF0YS5maW5kdGltZSxcbiAgICAgICAgICAgICAgICAgICAgUEJYRmlyZXdhbGxNYXhSZXFTZWM6IGRhdGEuUEJYRmlyZXdhbGxNYXhSZXFTZWMsXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBleHRlbnNpb25zIGNvdW50IGZvciBNYXhSZXFTZWMgY2FsY3VsYXRpb25cbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA9IHBhcnNlSW50KGRhdGEuZXh0ZW5zaW9uc0NvdW50LCAxMCkgfHwgMDtcblxuICAgICAgICAgICAgICAgIC8vIERldGVjdCBhbmQgc2V0IHNlY3VyaXR5IHByZXNldCBsZXZlbC4gVGhlIHNsaWRlciBpcyB0aGUgc2luZ2xlIHNvdXJjZSBvZlxuICAgICAgICAgICAgICAgIC8vIHRydXRoIGZvciBQQlhTZWN1cml0eU1vZGUg4oCUIHRha2luZyB0aGUgc2F2ZWQgdmFsdWUgZnJvbSB0aGUgQVBJIHdvdWxkIGxldFxuICAgICAgICAgICAgICAgIC8vIGl0IHNpbGVudGx5IGRyaWZ0IGF3YXkgZnJvbSB0aGUgc2xpZGVyIG9uIHRoZSBuZXh0IG51ZGdlLlxuICAgICAgICAgICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXNldElkeCA9IGZhaWwyQmFuSW5kZXguZGV0ZWN0UHJlc2V0TGV2ZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLm1heHJldHJ5LCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLmZpbmR0aW1lLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLmJhbnRpbWUsIDEwKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIHByZXNldElkeCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnVwZGF0ZVByZXNldEluZm9QYW5lbChmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3NldCB2YWx1ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnUEJYU2VjdXJpdHlNb2RlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzW3ByZXNldElkeF0uc2VjdXJpdHlNb2RlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHVuaXggdGltZXN0YW1wIGFzIERELk1NLllZWVkgSEg6TU1cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aW1lc3RhbXAgLSBVbml4IHRpbWVzdGFtcCBpbiBzZWNvbmRzLlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBkYXRlIHN0cmluZy5cbiAgICAgKi9cbiAgICBmb3JtYXREYXRlVGltZSh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3QgZCA9IG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApO1xuICAgICAgICBjb25zdCBkYXkgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1vbnRoID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IHllYXIgPSBkLmdldEZ1bGxZZWFyKCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gU3RyaW5nKGQuZ2V0SG91cnMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IFN0cmluZyhkLmdldE1pbnV0ZXMoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgcmV0dXJuIGAke2RheX0uJHttb250aH0uJHt5ZWFyfSAke2hvdXJzfToke21pbnV0ZXN9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGRhdGEgdGFibGUgcGFnZSBsZW5ndGhcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlUGFnZUxlbmd0aCgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHJvdyBoZWlnaHRcbiAgICAgICAgbGV0IHJvd0hlaWdodCA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJ3RyJykubGFzdCgpLm91dGVySGVpZ2h0KCk7XG4gICAgICAgIC8vIENhbGN1bGF0ZSB3aW5kb3cgaGVpZ2h0IGFuZCBhdmFpbGFibGUgc3BhY2UgZm9yIHRhYmxlXG4gICAgICAgIGNvbnN0IHdpbmRvd0hlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgICAgY29uc3QgaGVhZGVyRm9vdGVySGVpZ2h0ID0gNDAwOyAvLyBFc3RpbWF0ZSBoZWlnaHQgZm9yIGhlYWRlciwgZm9vdGVyLCBhbmQgb3RoZXIgZWxlbWVudHNcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbmV3IHBhZ2UgbGVuZ3RoXG4gICAgICAgIHJldHVybiBNYXRoLm1heChNYXRoLmZsb29yKCh3aW5kb3dIZWlnaHQgLSBoZWFkZXJGb290ZXJIZWlnaHQpIC8gcm93SGVpZ2h0KSwgMTApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGRpbW1lciB3aXRoIGxvYWRlciBvbiB0aGUgYmFubmVkIElQcyB0YWIgc2VnbWVudFxuICAgICAqL1xuICAgIHNob3dCYW5uZWRMaXN0TG9hZGVyKCkge1xuICAgICAgICBpZiAoIWZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5hcHBlbmQoXG4gICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTG9hZGluZ0RhdGF9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIGRpbW1lciBvbiB0aGUgYmFubmVkIElQcyB0YWIgc2VnbWVudFxuICAgICAqL1xuICAgIGhpZGVCYW5uZWRMaXN0TG9hZGVyKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBmYWlsMkJhbkluZGV4LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IEZhaWwyQmFuQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3VwZGF0ZScgLy8gVXNpbmcgc3RhbmRhcmQgUFVUIGZvciBzaW5nbGV0b24gdXBkYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuIl19