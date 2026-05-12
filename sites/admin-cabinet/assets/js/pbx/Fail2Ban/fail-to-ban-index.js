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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkYmFubmVkSXBMaXN0VGFibGUiLCIkYmFubmVkSXBUYWJTZWdtZW50IiwiJHNlY3VyaXR5UHJlc2V0U2xpZGVyIiwic2VjdXJpdHlQcmVzZXRzIiwibWF4cmV0cnkiLCJmaW5kdGltZSIsImJhbnRpbWUiLCJtYXhSZXFTZWMiLCJzZWN1cml0eU1vZGUiLCJleHRlbnNpb25zQ291bnQiLCJkYXRhVGFibGUiLCIkdW5iYW5CdXR0b25zIiwiJGdsb2JhbFNlYXJjaCIsInZhbGlkYXRlUnVsZXMiLCJpbml0aWFsaXplIiwiJCIsImNsb3Nlc3QiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwiZjJiX01heFJlcVNlY1VubGltaXRlZCIsInNlY29uZHMiLCJtaW51dGVzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZjJiX0R1cmF0aW9uRGF5cyIsImYyYl9EdXJhdGlvbkhvdXJzIiwiZjJiX0R1cmF0aW9uTWludXRlcyIsImRldGVjdFByZXNldExldmVsIiwiaSIsInAiLCJtaW5EaWZmIiwiSW5maW5pdHkiLCJkaWZmIiwiYWJzIiwiamFpbFRhZ01hcCIsInRhZyIsImNvbG9yIiwib25WaXNpYmxlIiwiZGF0YSIsIm5ld1BhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwicGFnZSIsImxlbiIsImRyYXciLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJwYWdlTGVuZ3RoIiwic2Nyb2xsQ29sbGFwc2UiLCJkZWZlclJlbmRlciIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwib3JkZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiY3JlYXRlZFJvdyIsInJvdyIsImVxIiwiYWRkQ2xhc3MiLCJkcmF3Q2FsbGJhY2siLCJmaW5kIiwicG9wdXAiLCJob3ZlcmFibGUiLCJwb3NpdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJidWlsZFJlYXNvblRhZ3MiLCJiYW5zIiwidGFnR3JvdXBzIiwiZm9yRWFjaCIsImJhbiIsImphaWwiLCJtYXBwaW5nIiwidHJhbnNsYXRlS2V5IiwiZnVsbFJlYXNvbiIsInJlYXNvbnMiLCJpbmRleE9mIiwicHVzaCIsImh0bWwiLCJPYmplY3QiLCJrZXlzIiwiZ3JvdXAiLCJ0b29sdGlwQ29udGVudCIsImpvaW4iLCJyZXNwb25zZSIsImhpZGVCYW5uZWRMaXN0TG9hZGVyIiwicmVzdWx0IiwiYmFubmVkSXBzIiwiY2xlYXIiLCJuZXdEYXRhIiwiaXAiLCJpcERhdGEiLCJjb3VudHJ5IiwiY291bnRyeU5hbWUiLCJpcERpc3BsYXkiLCJ0b0xvd2VyQ2FzZSIsInJlYXNvblRhZ3MiLCJlYXJsaWVzdEJhbiIsImxhdGVzdEV4cGlyeSIsInRpbWVvZmJhbiIsInRpbWV1bmJhbiIsImJhbkRhdGVTdHIiLCJmb3JtYXREYXRlVGltZSIsImV4cGlyZXNTdHIiLCJmMmJfVW5iYW4iLCJyb3dzIiwiYWRkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwid2hpdGVsaXN0IiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicGFyc2VJbnQiLCJwcmVzZXRJZHgiLCJ0aW1lc3RhbXAiLCJkIiwiRGF0ZSIsImRheSIsImdldERhdGUiLCJwYWRTdGFydCIsIm1vbnRoIiwiZ2V0TW9udGgiLCJ5ZWFyIiwiZ2V0RnVsbFllYXIiLCJnZXRIb3VycyIsImdldE1pbnV0ZXMiLCJyb3dIZWlnaHQiLCJsYXN0Iiwib3V0ZXJIZWlnaHQiLCJ3aW5kb3dIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImhlYWRlckZvb3RlckhlaWdodCIsImFwcGVuZCIsImV4X0xvYWRpbmdEYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFQUTs7QUFTbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVB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QUFyQyxDQUphLENBTWI7O0FBQ0FwRyxJQUFBQSxJQUFJLENBQUNnSSxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRTdCLFdBRkk7QUFHZjhCLE1BQUFBLFVBQVUsRUFBRSxRQUhHLENBR007O0FBSE4sS0FBbkI7QUFNQW5JLElBQUFBLElBQUksQ0FBQ3pDLFVBQUw7QUFDSDtBQWxqQmlCLENBQXRCLEMsQ0FxakJBOztBQUNBQyxDQUFDLENBQUM0SyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUwsRUFBQUEsYUFBYSxDQUFDZ0IsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIEZvcm0sIGdsb2JhbFJvb3RVcmwsIERhdGF0YWJsZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIEZpcmV3YWxsQVBJLCBGYWlsMkJhbkFQSSwgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciwgZmFpbDJiYW5XaGl0ZWxpc3QgKi9cbi8qKlxuICogVGhlIGBmYWlsMkJhbkluZGV4YCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmFpbDJCYW4gc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmFpbDJCYW5JbmRleFxuICovXG5jb25zdCBmYWlsMkJhbkluZGV4ID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBMaXN0VGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGFyZW50IHNlZ21lbnQgY29udGFpbmluZyB0aGUgYmFubmVkIElQcyB0YWIgKGZvciBkaW1tZXIgb3ZlcmxheSlcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5uZWRJcFRhYlNlZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzZWN1cml0eVByZXNldFNsaWRlcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNlY3VyaXR5IHByZXNldCBkZWZpbml0aW9ucy5cbiAgICAgKiBFYWNoIHByZXNldCBkZWZpbmVzIG1heHJldHJ5LCBmaW5kdGltZSAoc2Vjb25kcyksIGFuZCBiYW50aW1lIChzZWNvbmRzKS5cbiAgICAgKi9cbiAgICBzZWN1cml0eVByZXNldHM6IFtcbiAgICAgICAgeyAvLyAwOiBXZWFrXG4gICAgICAgICAgICBtYXhyZXRyeTogMjAsXG4gICAgICAgICAgICBmaW5kdGltZTogNjAwLCAgICAgLy8gMTAgbWluXG4gICAgICAgICAgICBiYW50aW1lOiA2MDAsICAgICAgLy8gMTAgbWluXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDUwMCwgICAgLy8gU0lQIHJhdGUgbGltaXQgKGRpc2FibGVkIGlmID4yMDAgZXh0ZW5zaW9ucylcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ3JlbGF4ZWQnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDE6IE5vcm1hbFxuICAgICAgICAgICAgbWF4cmV0cnk6IDEwLFxuICAgICAgICAgICAgZmluZHRpbWU6IDM2MDAsICAgIC8vIDEgaG91clxuICAgICAgICAgICAgYmFudGltZTogODY0MDAsICAgIC8vIDEgZGF5XG4gICAgICAgICAgICBtYXhSZXFTZWM6IDMwMCxcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ2JhbGFuY2VkJyxcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAyOiBFbmhhbmNlZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDUsXG4gICAgICAgICAgICBmaW5kdGltZTogMjE2MDAsICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogNjA0ODAwLCAgIC8vIDcgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxNTAsXG4gICAgICAgICAgICBzZWN1cml0eU1vZGU6ICdzdHJpY3QnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDM6IFBhcmFub2lkXG4gICAgICAgICAgICBtYXhyZXRyeTogMyxcbiAgICAgICAgICAgIGZpbmR0aW1lOiA4NjQwMCwgICAvLyAyNCBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogMjU5MjAwMCwgIC8vIDMwIGRheXNcbiAgICAgICAgICAgIG1heFJlcVNlYzogMTAwLFxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAncGFyYW5vaWQnLFxuICAgICAgICB9LFxuICAgIF0sXG5cbiAgICAvKipcbiAgICAgKiBOdW1iZXIgb2YgZXh0ZW5zaW9ucyDigJQgbG9hZGVkIGZyb20gQVBJIHRvIGRldGVybWluZSBNYXhSZXFTZWMgYmVoYXZpb3IuXG4gICAgICogSWYgPjIwMCwgTWF4UmVxU2VjIGlzIGRpc2FibGVkIChOQVQgc2NlbmFyaW8pLlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgZXh0ZW5zaW9uc0NvdW50OiAwLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGxpc3Qgb2YgYmFubmVkIElQc1xuICAgICAqIEB0eXBlIHtEYXRhdGFibGV9XG4gICAgICovXG4gICAgZGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHVuYmFuIGJ1dHRvbnNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1bmJhbkJ1dHRvbnM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iaiA9ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlID0gJCgnI2Jhbm5lZC1pcC1saXN0LXRhYmxlJyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudCA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmNsb3Nlc3QoJy5zZWdtZW50Jyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyID0gJCgnI1NlY3VyaXR5UHJlc2V0U2xpZGVyJyk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJHVuYmFuQnV0dG9ucyA9ICQoJy51bmJhbi1idXR0b24nKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZ2xvYmFsU2VhcmNoID0gJCgnI2dsb2JhbC1zZWFyY2gnKTtcblxuICAgICAgICAkKCcjZmFpbDJiYW4tdGFiLW1lbnUgLml0ZW0nKS50YWIoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAgICBpZiAodHlwZW9mIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKGZhaWwyQmFuSW5kZXguY2JHZXRCYW5uZWRJcExpc3QpO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLm9uKCdjbGljaycsICcudW5iYW4tYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCB1bmJhbm5lZElwID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguc2hvd0Jhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLnVuYmFuSXAodW5iYW5uZWRJcCwgZmFpbDJCYW5JbmRleC5jYkFmdGVyVW5CYW5JcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlclxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXJcbiAgICAgICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgICAgICBtYXg6IDMsXG4gICAgICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRXZWFrLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldEVuaGFuY2VkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRQYXJhbm9pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdFNlY3VyaXR5UHJlc2V0LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VjdXJpdHkgcHJlc2V0IHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIFVwZGF0ZXMgbWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lIHZhbHVlcyBhbmQgdGhlIGluZm8gcGFuZWwuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHByZXNldCBpbmRleCAoMC0zKS5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQodmFsdWUpIHtcbiAgICAgICAgY29uc3QgcHJlc2V0ID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbdmFsdWVdO1xuICAgICAgICBpZiAoIXByZXNldCkgcmV0dXJuO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZm9ybSBmaWVsZHNcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbWF4cmV0cnknLCBwcmVzZXQubWF4cmV0cnkpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaW5kdGltZScsIHByZXNldC5maW5kdGltZSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2JhbnRpbWUnLCBwcmVzZXQuYmFudGltZSk7XG5cbiAgICAgICAgLy8gU2V0IE1heFJlcVNlYzogZGlzYWJsZWQgKDApIGlmID4yMDAgZXh0ZW5zaW9ucyAoTkFUIHNjZW5hcmlvKVxuICAgICAgICBjb25zdCBtYXhSZXFTZWMgPSBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA+IDIwMCA/IDAgOiBwcmVzZXQubWF4UmVxU2VjO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhGaXJld2FsbE1heFJlcVNlYycsIFN0cmluZyhtYXhSZXFTZWMpKTtcblxuICAgICAgICAvLyBIVFRQIHJhdGUtbGltaXQgcHJvZmlsZSByZWFkIGJ5IHVuaWZpZWQtc2VjdXJpdHkubHVhXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFNlY3VyaXR5TW9kZScsIHByZXNldC5zZWN1cml0eU1vZGUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbmZvIHBhbmVsXG4gICAgICAgIGZhaWwyQmFuSW5kZXgudXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGluZm8gcGFuZWwgdW5kZXIgdGhlIHNsaWRlciB3aXRoIHRoZSBjdXJyZW50IHByZXNldCdzIHZhbHVlcy5cbiAgICAgKiBNYXhSZXFTZWMgc2hvd3Mg4oieIHdoZW4gdGhlIHJhdGUgbGltaXQgaXMgYXV0by1kaXNhYmxlZCAoPjIwMCBleHRlbnNpb25zIOKAlFxuICAgICAqIE5BVCBzY2VuYXJpbyB3aGVyZSB0aGUgcGVyLXNvdXJjZSBsaW1pdCBpcyB1bnNhZmUgYW5kIHdlIGFscmVhZHkgZHJvcCBpdFxuICAgICAqIHRvIDAgaW4gY2JBZnRlclNlbGVjdFNlY3VyaXR5UHJlc2V0KS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcmVzZXQgLSBUaGUgcHJlc2V0IG9iamVjdCB3aXRoIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSwgbWF4UmVxU2VjLlxuICAgICAqL1xuICAgIHVwZGF0ZVByZXNldEluZm9QYW5lbChwcmVzZXQpIHtcbiAgICAgICAgJCgnI3ByZXNldC1tYXhyZXRyeS12YWx1ZScpLnRleHQocHJlc2V0Lm1heHJldHJ5KTtcbiAgICAgICAgJCgnI3ByZXNldC1maW5kdGltZS12YWx1ZScpLnRleHQoZmFpbDJCYW5JbmRleC5mb3JtYXREdXJhdGlvbihwcmVzZXQuZmluZHRpbWUpKTtcbiAgICAgICAgJCgnI3ByZXNldC1iYW50aW1lLXZhbHVlJykudGV4dChmYWlsMkJhbkluZGV4LmZvcm1hdER1cmF0aW9uKHByZXNldC5iYW50aW1lKSk7XG5cbiAgICAgICAgY29uc3QgbWF4UmVxU2VjID0gZmFpbDJCYW5JbmRleC5leHRlbnNpb25zQ291bnQgPiAyMDAgPyAwIDogcHJlc2V0Lm1heFJlcVNlYztcbiAgICAgICAgJCgnI3ByZXNldC1tYXhyZXFzZWMtdmFsdWUnKS50ZXh0KFxuICAgICAgICAgICAgbWF4UmVxU2VjID09PSAwXG4gICAgICAgICAgICAgICAgPyAoZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWNVbmxpbWl0ZWQgfHwgJ+KInicpXG4gICAgICAgICAgICAgICAgOiBtYXhSZXFTZWNcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHNlY29uZHMgaW50byBhIGh1bWFuLXJlYWRhYmxlIGR1cmF0aW9uIHN0cmluZy5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc2Vjb25kcyAtIER1cmF0aW9uIGluIHNlY29uZHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIGR1cmF0aW9uLlxuICAgICAqL1xuICAgIGZvcm1hdER1cmF0aW9uKHNlY29uZHMpIHtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDYwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGhvdXJzIC8gMjQpO1xuXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uRGF5c31gO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25Ib3Vyc31gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgJHttaW51dGVzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbk1pbnV0ZXN9YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IHdoaWNoIHNlY3VyaXR5IHByZXNldCBtYXRjaGVzIGN1cnJlbnQgdmFsdWVzLlxuICAgICAqIFJldHVybnMgcHJlc2V0IGluZGV4ICgwLTMpIG9yIGRlZmF1bHRzIHRvIDEgKE5vcm1hbCkgaWYgbm8gZXhhY3QgbWF0Y2guXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1heHJldHJ5XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGZpbmR0aW1lIC0gaW4gc2Vjb25kc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBiYW50aW1lIC0gaW4gc2Vjb25kc1xuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IFByZXNldCBpbmRleC5cbiAgICAgKi9cbiAgICBkZXRlY3RQcmVzZXRMZXZlbChtYXhyZXRyeSwgZmluZHRpbWUsIGJhbnRpbWUpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgcCA9IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzW2ldO1xuICAgICAgICAgICAgaWYgKHAubWF4cmV0cnkgPT09IG1heHJldHJ5ICYmIHAuZmluZHRpbWUgPT09IGZpbmR0aW1lICYmIHAuYmFudGltZSA9PT0gYmFudGltZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIE5vIGV4YWN0IG1hdGNoIOKAlCBmaW5kIGNsb3Nlc3QgYnkgY29tcGFyaW5nIGJhbnRpbWVcbiAgICAgICAgbGV0IGNsb3Nlc3QgPSAxO1xuICAgICAgICBsZXQgbWluRGlmZiA9IEluZmluaXR5O1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBkaWZmID0gTWF0aC5hYnMoZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV0uYmFudGltZSAtIGJhbnRpbWUpO1xuICAgICAgICAgICAgaWYgKGRpZmYgPCBtaW5EaWZmKSB7XG4gICAgICAgICAgICAgICAgbWluRGlmZiA9IGRpZmY7XG4gICAgICAgICAgICAgICAgY2xvc2VzdCA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsb3Nlc3Q7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTWFwcGluZyBvZiBqYWlsIG5hbWVzIHRvIHNob3J0IHRhZyBsYWJlbHMgYW5kIGNvbG9ycy5cbiAgICAgKiBVc2VkIHRvIHJlbmRlciBjb21wYWN0IGNvbG9yZWQgbGFiZWxzIGluc3RlYWQgb2YgdmVyYm9zZSBiYW4gcmVhc29uIHRleHQuXG4gICAgICovXG4gICAgamFpbFRhZ01hcDoge1xuICAgICAgICAnYXN0ZXJpc2tfYW1pX3YyJzogeyB0YWc6ICdBTUknLCBjb2xvcjogJ29yYW5nZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX2Vycm9yX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza19wdWJsaWNfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3NlY3VyaXR5X2xvZ192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX2lheF92Mic6IHsgdGFnOiAnSUFYJywgY29sb3I6ICd0ZWFsJyB9LFxuICAgICAgICAnZHJvcGJlYXJfdjInOiB7IHRhZzogJ1NTSCcsIGNvbG9yOiAnZ3JleScgfSxcbiAgICAgICAgJ21pa29wYngtZXhwbG9pdC1zY2FubmVyX3YyJzogeyB0YWc6ICdTQ0FOJywgY29sb3I6ICdyZWQnIH0sXG4gICAgICAgICdtaWtvcGJ4LW5naW54LWVycm9yc192Mic6IHsgdGFnOiAnTkdJTlgnLCBjb2xvcjogJ3B1cnBsZScgfSxcbiAgICAgICAgJ21pa29wYngtd3d3X3YyJzogeyB0YWc6ICdXRUInLCBjb2xvcjogJ29saXZlJyB9LFxuICAgIH0sXG5cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCl7XG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGUoKXtcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5kYXRhKCd0YWInKT09PSdiYW5uZWQnICYmIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlIT09bnVsbCl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhZ2VMZW5ndGggPSBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucGFnZS5sZW4obmV3UGFnZUxlbmd0aCkuZHJhdyhmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZSA9IGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiB0cnVlLFxuICAgICAgICAgICAgcGFnZUxlbmd0aDogZmFpbDJCYW5JbmRleC5jYWxjdWxhdGVQYWdlTGVuZ3RoKCksXG4gICAgICAgICAgICBzY3JvbGxDb2xsYXBzZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlZmVyUmVuZGVyOiB0cnVlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIC8vIElQXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBSZWFzb24gdGFnc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCYW4gZGF0ZVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEV4cGlyZXNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCdXR0b25zXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbMCwgJ2FzYyddLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93KSB7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGFmdGVyIGVhY2ggRGF0YVRhYmxlIGRyYXcgKGhhbmRsZXMgcGFnaW5hdGlvbilcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuY291bnRyeS1mbGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgnLmJhbi1yZWFzb24tdGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBmb3IgcmVhc29uIHRhZ3MgZnJvbSBiYW4gZW50cmllcy5cbiAgICAgKiBHcm91cHMgYmFucyBieSB0YWcgbGFiZWwsIGRlZHVwbGljYXRlcywgYW5kIHJlbmRlcnMgY29sb3JlZCBsYWJlbHMgd2l0aCBwb3B1cCB0b29sdGlwcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGJhbnMgLSBBcnJheSBvZiBiYW4gb2JqZWN0cyB3aXRoIGphaWwsIHRpbWVvZmJhbiwgdGltZXVuYmFuIHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgd2l0aCB0YWcgbGFiZWxzLlxuICAgICAqL1xuICAgIGJ1aWxkUmVhc29uVGFncyhiYW5zKSB7XG4gICAgICAgIC8vIEdyb3VwIGJ5IHRhZyBsYWJlbCB0byBkZWR1cGxpY2F0ZSAoZS5nLiBtdWx0aXBsZSBTSVAgamFpbHMg4oaSIG9uZSBTSVAgdGFnKVxuICAgICAgICBjb25zdCB0YWdHcm91cHMgPSB7fTtcbiAgICAgICAgYmFucy5mb3JFYWNoKGJhbiA9PiB7XG4gICAgICAgICAgICBjb25zdCBqYWlsID0gYmFuLmphaWwgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBtYXBwaW5nID0gZmFpbDJCYW5JbmRleC5qYWlsVGFnTWFwW2phaWxdIHx8IHsgdGFnOiBqYWlsLCBjb2xvcjogJ2dyZXknIH07XG4gICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVLZXkgPSBgZjJiX0phaWxfJHtqYWlsfWA7XG4gICAgICAgICAgICBjb25zdCBmdWxsUmVhc29uID0gZ2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0ZUtleV0gfHwgamFpbDtcblxuICAgICAgICAgICAgaWYgKCF0YWdHcm91cHNbbWFwcGluZy50YWddKSB7XG4gICAgICAgICAgICAgICAgdGFnR3JvdXBzW21hcHBpbmcudGFnXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3I6IG1hcHBpbmcuY29sb3IsXG4gICAgICAgICAgICAgICAgICAgIHJlYXNvbnM6IFtdLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBdm9pZCBkdXBsaWNhdGUgcmVhc29ucyB3aXRoaW4gdGhlIHNhbWUgdGFnIGdyb3VwXG4gICAgICAgICAgICBpZiAodGFnR3JvdXBzW21hcHBpbmcudGFnXS5yZWFzb25zLmluZGV4T2YoZnVsbFJlYXNvbikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgdGFnR3JvdXBzW21hcHBpbmcudGFnXS5yZWFzb25zLnB1c2goZnVsbFJlYXNvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIE9iamVjdC5rZXlzKHRhZ0dyb3VwcykuZm9yRWFjaCh0YWcgPT4ge1xuICAgICAgICAgICAgY29uc3QgZ3JvdXAgPSB0YWdHcm91cHNbdGFnXTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZ3JvdXAucmVhc29ucy5qb2luKCcsICcpO1xuICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gY2xhc3M9XCJ1aSBtaW5pICR7Z3JvdXAuY29sb3J9IGxhYmVsIGJhbi1yZWFzb24tdGFnXCIgZGF0YS1jb250ZW50PVwiJHt0b29sdGlwQ29udGVudH1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPiR7dGFnfTwvc3Bhbj4gYDtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIHRvIGRpc3BsYXkgdGhlIGxpc3Qgb2YgYmFubmVkIElQcy5cbiAgICBjYkdldEJhbm5lZElwTGlzdChyZXNwb25zZSkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LmhpZGVCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYmFubmVkSXBzID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5jbGVhcigpO1xuXG4gICAgICAgIGNvbnN0IG5ld0RhdGEgPSBbXTtcbiAgICAgICAgT2JqZWN0LmtleXMoYmFubmVkSXBzKS5mb3JFYWNoKGlwID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwRGF0YSA9IGJhbm5lZElwc1tpcF07XG4gICAgICAgICAgICBjb25zdCBiYW5zID0gaXBEYXRhLmJhbnMgfHwgW107XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5ID0gaXBEYXRhLmNvdW50cnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBjb3VudHJ5TmFtZSA9IGlwRGF0YS5jb3VudHJ5TmFtZSB8fCAnJztcblxuICAgICAgICAgICAgLy8gQnVpbGQgSVAgZGlzcGxheSB3aXRoIGNvdW50cnkgZmxhZ1xuICAgICAgICAgICAgbGV0IGlwRGlzcGxheSA9IGlwO1xuICAgICAgICAgICAgaWYgKGNvdW50cnkpIHtcbiAgICAgICAgICAgICAgICBpcERpc3BsYXkgPSBgPHNwYW4gY2xhc3M9XCJjb3VudHJ5LWZsYWdcIiBkYXRhLWNvbnRlbnQ9XCIke2NvdW50cnlOYW1lfVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+PGkgY2xhc3M9XCJmbGFnICR7Y291bnRyeS50b0xvd2VyQ2FzZSgpfVwiPjwvaT48L3NwYW4+JHtpcH1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCdWlsZCByZWFzb24gdGFnc1xuICAgICAgICAgICAgY29uc3QgcmVhc29uVGFncyA9IGZhaWwyQmFuSW5kZXguYnVpbGRSZWFzb25UYWdzKGJhbnMpO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgZWFybGllc3QgYmFuIGRhdGUgYW5kIGxhdGVzdCBleHBpcnkgYWNyb3NzIGFsbCBiYW5zXG4gICAgICAgICAgICBsZXQgZWFybGllc3RCYW4gPSBJbmZpbml0eTtcbiAgICAgICAgICAgIGxldCBsYXRlc3RFeHBpcnkgPSAwO1xuICAgICAgICAgICAgYmFucy5mb3JFYWNoKGJhbiA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1lb2ZiYW4gPCBlYXJsaWVzdEJhbikge1xuICAgICAgICAgICAgICAgICAgICBlYXJsaWVzdEJhbiA9IGJhbi50aW1lb2ZiYW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChiYW4udGltZXVuYmFuID4gbGF0ZXN0RXhwaXJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxhdGVzdEV4cGlyeSA9IGJhbi50aW1ldW5iYW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJhbkRhdGVTdHIgPSBlYXJsaWVzdEJhbiA8IEluZmluaXR5XG4gICAgICAgICAgICAgICAgPyBgPHNwYW4gZGF0YS1vcmRlcj1cIiR7ZWFybGllc3RCYW59XCI+JHtmYWlsMkJhbkluZGV4LmZvcm1hdERhdGVUaW1lKGVhcmxpZXN0QmFuKX08L3NwYW4+YFxuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBleHBpcmVzU3RyID0gbGF0ZXN0RXhwaXJ5ID4gMFxuICAgICAgICAgICAgICAgID8gYDxzcGFuIGRhdGEtb3JkZXI9XCIke2xhdGVzdEV4cGlyeX1cIj4ke2ZhaWwyQmFuSW5kZXguZm9ybWF0RGF0ZVRpbWUobGF0ZXN0RXhwaXJ5KX08L3NwYW4+YFxuICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IFtcbiAgICAgICAgICAgICAgICBpcERpc3BsYXksXG4gICAgICAgICAgICAgICAgcmVhc29uVGFncyxcbiAgICAgICAgICAgICAgICBiYW5EYXRlU3RyLFxuICAgICAgICAgICAgICAgIGV4cGlyZXNTdHIsXG4gICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uIHJpZ2h0IGZsb2F0ZWQgdW5iYW4tYnV0dG9uXCIgZGF0YS12YWx1ZT1cIiR7aXB9XCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZjJiX1VuYmFufTwvYnV0dG9uPmAsXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgbmV3RGF0YS5wdXNoKHJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLnJvd3MuYWRkKG5ld0RhdGEpLmRyYXcoKTtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCBhZnRlciBhbiBJUCBoYXMgYmVlbiB1bmJhbm5lZC5cbiAgICBjYkFmdGVyVW5CYW5JcCgpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudC5cbiAgICAgKiBXaGl0ZWxpc3QgaXMgbWFuYWdlZCBpbiBpdHMgb3duIHRhYiB2aWEgZmFpbDJiYW4td2hpdGVsaXN0LmpzIGFuZCBpcyBOT1RcbiAgICAgKiBwYXJ0IG9mIHRoaXMgZm9ybSDigJQgZG8gbm90IGluY2x1ZGUgaXQgaW4gdGhlIFBBVENIIHBheWxvYWQsIG90aGVyd2lzZSB3ZSdkXG4gICAgICogY2xvYmJlciBlZGl0cyBtYWRlIHRocm91Z2ggdGhlIGRlZGljYXRlZCB0YWIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEud2hpdGVsaXN0O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxpbmcgaXMgZG9uZSBieSBGb3JtLmpzXG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgaXMgZm9yIGFkZGl0aW9uYWwgcHJvY2Vzc2luZyBpZiBuZWVkZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBGYWlsMkJhbiBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgRmFpbDJCYW5BUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgKHdoaXRlbGlzdCBpcyBtYW5hZ2VkIGluIGl0cyBvd24gdGFiIOKAlCBub3QgcGFydCBvZiB0aGlzIGZvcm0pLlxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjLFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9ucyBjb3VudCBmb3IgTWF4UmVxU2VjIGNhbGN1bGF0aW9uXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5leHRlbnNpb25zQ291bnQgPSBwYXJzZUludChkYXRhLmV4dGVuc2lvbnNDb3VudCwgMTApIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBEZXRlY3QgYW5kIHNldCBzZWN1cml0eSBwcmVzZXQgbGV2ZWwuIFRoZSBzbGlkZXIgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2ZcbiAgICAgICAgICAgICAgICAvLyB0cnV0aCBmb3IgUEJYU2VjdXJpdHlNb2RlIOKAlCB0YWtpbmcgdGhlIHNhdmVkIHZhbHVlIGZyb20gdGhlIEFQSSB3b3VsZCBsZXRcbiAgICAgICAgICAgICAgICAvLyBpdCBzaWxlbnRseSBkcmlmdCBhd2F5IGZyb20gdGhlIHNsaWRlciBvbiB0aGUgbmV4dCBudWRnZS5cbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmVzZXRJZHggPSBmYWlsMkJhbkluZGV4LmRldGVjdFByZXNldExldmVsKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5tYXhyZXRyeSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5maW5kdGltZSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5iYW50aW1lLCAxMClcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBwcmVzZXRJZHgsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwoZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbcHJlc2V0SWR4XSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybShcbiAgICAgICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1BCWFNlY3VyaXR5TW9kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdLnNlY3VyaXR5TW9kZVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB1bml4IHRpbWVzdGFtcCBhcyBERC5NTS5ZWVlZIEhIOk1NXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZGF0ZSBzdHJpbmcuXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGQgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5ID0gU3RyaW5nKGQuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtb250aCA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCB5ZWFyID0gZC5nZXRGdWxsWWVhcigpO1xuICAgICAgICBjb25zdCBob3VycyA9IFN0cmluZyhkLmdldEhvdXJzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBTdHJpbmcoZC5nZXRNaW51dGVzKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgIHJldHVybiBgJHtkYXl9LiR7bW9udGh9LiR7eWVhcn0gJHtob3Vyc306JHttaW51dGVzfWA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkYXRhIHRhYmxlIHBhZ2UgbGVuZ3RoXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSByb3cgaGVpZ2h0XG4gICAgICAgIGxldCByb3dIZWlnaHQgPSBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCd0cicpLmxhc3QoKS5vdXRlckhlaWdodCgpO1xuICAgICAgICAvLyBDYWxjdWxhdGUgd2luZG93IGhlaWdodCBhbmQgYXZhaWxhYmxlIHNwYWNlIGZvciB0YWJsZVxuICAgICAgICBjb25zdCB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICAgIGNvbnN0IGhlYWRlckZvb3RlckhlaWdodCA9IDQwMDsgLy8gRXN0aW1hdGUgaGVpZ2h0IGZvciBoZWFkZXIsIGZvb3RlciwgYW5kIG90aGVyIGVsZW1lbnRzXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG5ldyBwYWdlIGxlbmd0aFxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoTWF0aC5mbG9vcigod2luZG93SGVpZ2h0IC0gaGVhZGVyRm9vdGVySGVpZ2h0KSAvIHJvd0hlaWdodCksIDEwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBkaW1tZXIgd2l0aCBsb2FkZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBzaG93QmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgaWYgKCFmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuZmluZCgnPiAudWkuZGltbWVyJykubGVuZ3RoKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcFRhYlNlZ21lbnQuYXBwZW5kKFxuICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSBkaW1tZXIgb24gdGhlIGJhbm5lZCBJUHMgdGFiIHNlZ21lbnRcbiAgICAgKi9cbiAgICBoaWRlQmFubmVkTGlzdExvYWRlcigpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmFpbDJCYW5JbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmYWlsMkJhbkluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBGYWlsMkJhbkFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==