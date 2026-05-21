"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalTranslate, PbxApi, Form, globalRootUrl, Datatable, SemanticLocalization, FirewallAPI, Fail2BanAPI, Fail2BanTooltipManager, fail2banWhitelist, PbxDateTime */

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
      // formatted in server TZ for display. Without this DataTables
      // falls back to lexicographic sort on the rendered string and
      // 05.05.2026 ends up "before" 30.04.2026.
      {
        orderable: true,
        searchable: false,
        type: 'num',
        render: function render(data, type) {
          if (type === 'display') {
            return Number.isFinite(data) && data > 0 ? fail2BanIndex.renderServerTime(data) : '';
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
            return Number.isFinite(data) && data > 0 ? fail2BanIndex.renderServerTime(data) : '';
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
        }); // Ban-date / Expires cells — Fomantic's `html` setting
        // accepts a raw HTML string (or a function). We stash the
        // payload in data-html and bind per-element so each cell
        // gets its own rendered template.

        fail2BanIndex.$bannedIpListTable.find('.ban-date-tooltip').each(function () {
          var $el = $(this);
          $el.popup('destroy');
          $el.popup({
            html: $el.attr('data-html'),
            hoverable: true,
            position: 'top center',
            variation: 'inverted',
            delay: {
              show: 200,
              hide: 100
            }
          });
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
    } // The backend wraps the IP map under `items` and ships server TZ
    // metadata under `_meta`. Older cached payloads (and the legacy v1
    // shape if it ever leaks through) skip the wrapper — handle both.


    var payload = response.data || {};
    var bannedIps = payload && _typeof(payload) === 'object' && payload.items ? payload.items : payload;

    if (payload && payload._meta) {
      PbxDateTime.setServerMeta(payload._meta);
    }

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
   * Render a unix timestamp in the PBX server's timezone, with a Fomantic
   * popup that also shows the browser-local rendering. Both labels carry
   * the IANA name and UTC offset so the operator can't mistake one for
   * the other. The popup is initialised in `drawCallback` after each
   * DataTables redraw — keeping the markup pure data lets us re-bind
   * popups across pagination without leaking handlers.
   *
   * @param {number} timestamp - Unix timestamp in seconds.
   * @returns {string} HTML <span> carrying popup metadata.
   */
  renderServerTime: function renderServerTime(timestamp) {
    var visible = PbxDateTime.formatServerTime(timestamp);
    var tooltipHtml = PbxDateTime.buildDualTooltipHtml(timestamp); // Escape the HTML payload for safe attribute embedding.

    var safe = tooltipHtml.replace(/"/g, '&quot;');
    return "<span class=\"ban-date-tooltip\" data-html=\"".concat(safe, "\" data-position=\"top center\" data-variation=\"inverted\">") + "".concat(visible, "</span>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkYmFubmVkSXBMaXN0VGFibGUiLCIkYmFubmVkSXBUYWJTZWdtZW50IiwiJHNlY3VyaXR5UHJlc2V0U2xpZGVyIiwic2VjdXJpdHlQcmVzZXRzIiwibWF4cmV0cnkiLCJmaW5kdGltZSIsImJhbnRpbWUiLCJtYXhSZXFTZWMiLCJzZWN1cml0eU1vZGUiLCJleHRlbnNpb25zQ291bnQiLCJkYXRhVGFibGUiLCIkdW5iYW5CdXR0b25zIiwiJGdsb2JhbFNlYXJjaCIsInZhbGlkYXRlUnVsZXMiLCJpbml0aWFsaXplIiwiJCIsImNsb3Nlc3QiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9TZWN1cml0eVByZXNldFdlYWsiLCJmMmJfU2VjdXJpdHlQcmVzZXROb3JtYWwiLCJmMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJwcmVzZXQiLCJmb3JtIiwiU3RyaW5nIiwidXBkYXRlUHJlc2V0SW5mb1BhbmVsIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidGV4dCIsImZvcm1hdER1cmF0aW9uIiwiZjJiX01heFJlcVNlY1VubGltaXRlZCIsInNlY29uZHMiLCJtaW51dGVzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZjJiX0R1cmF0aW9uRGF5cyIsImYyYl9EdXJhdGlvbkhvdXJzIiwiZjJiX0R1cmF0aW9uTWludXRlcyIsImRldGVjdFByZXNldExldmVsIiwiaSIsInAiLCJtaW5EaWZmIiwiSW5maW5pdHkiLCJkaWZmIiwiYWJzIiwiamFpbFRhZ01hcCIsInRhZyIsImNvbG9yIiwib25WaXNpYmxlIiwiZGF0YSIsIm5ld1BhZ2VMZW5ndGgiLCJjYWxjdWxhdGVQYWdlTGVuZ3RoIiwicGFnZSIsImxlbiIsImRyYXciLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJwYWdlTGVuZ3RoIiwic2Nyb2xsQ29sbGFwc2UiLCJkZWZlclJlbmRlciIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwidHlwZSIsInJlbmRlciIsIk51bWJlciIsImlzRmluaXRlIiwicmVuZGVyU2VydmVyVGltZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNyZWF0ZWRSb3ciLCJyb3ciLCJlcSIsImFkZENsYXNzIiwiZHJhd0NhbGxiYWNrIiwiZmluZCIsInBvcHVwIiwiaG92ZXJhYmxlIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiZWFjaCIsIiRlbCIsImh0bWwiLCJ2YXJpYXRpb24iLCJidWlsZFJlYXNvblRhZ3MiLCJiYW5zIiwidGFnR3JvdXBzIiwiZm9yRWFjaCIsImJhbiIsImphaWwiLCJtYXBwaW5nIiwidHJhbnNsYXRlS2V5IiwiZnVsbFJlYXNvbiIsInJlYXNvbnMiLCJpbmRleE9mIiwicHVzaCIsIk9iamVjdCIsImtleXMiLCJncm91cCIsInRvb2x0aXBDb250ZW50Iiwiam9pbiIsInJlc3BvbnNlIiwiaGlkZUJhbm5lZExpc3RMb2FkZXIiLCJyZXN1bHQiLCJwYXlsb2FkIiwiYmFubmVkSXBzIiwiaXRlbXMiLCJfbWV0YSIsIlBieERhdGVUaW1lIiwic2V0U2VydmVyTWV0YSIsImNsZWFyIiwibmV3RGF0YSIsImlwIiwiaXBEYXRhIiwiY291bnRyeSIsImNvdW50cnlOYW1lIiwiaXBEaXNwbGF5IiwidG9Mb3dlckNhc2UiLCJyZWFzb25UYWdzIiwiZWFybGllc3RCYW4iLCJsYXRlc3RFeHBpcnkiLCJ0aW1lb2ZiYW4iLCJ0aW1ldW5iYW4iLCJiYW5EYXRlVmFsdWUiLCJleHBpcmVzVmFsdWUiLCJmMmJfVW5iYW4iLCJyb3dzIiwiYWRkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwid2hpdGVsaXN0IiwiY2JBZnRlclNlbmRGb3JtIiwiRmFpbDJCYW5BUEkiLCJnZXRTZXR0aW5ncyIsIlBCWEZpcmV3YWxsTWF4UmVxU2VjIiwicGFyc2VJbnQiLCJwcmVzZXRJZHgiLCJ0aW1lc3RhbXAiLCJ2aXNpYmxlIiwiZm9ybWF0U2VydmVyVGltZSIsInRvb2x0aXBIdG1sIiwiYnVpbGREdWFsVG9vbHRpcEh0bWwiLCJzYWZlIiwicmVwbGFjZSIsInJvd0hlaWdodCIsImxhc3QiLCJvdXRlckhlaWdodCIsIndpbmRvd0hlaWdodCIsIndpbmRvdyIsImlubmVySGVpZ2h0IiwiaGVhZGVyRm9vdGVySGVpZ2h0IiwiYXBwZW5kIiwiZXhfTG9hZGluZ0RhdGEiLCJyZW1vdmVDbGFzcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEs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YUFBYSxDQUFDc0ssZ0JBQXRDO0FBQ0E3RyxJQUFBQSxJQUFJLENBQUNnSCxlQUFMLEdBQXVCekssYUFBYSxDQUFDeUssZUFBckMsQ0FKYSxDQU1iOztBQUNBaEgsSUFBQUEsSUFBSSxDQUFDdUksV0FBTCxHQUFtQjtBQUNmQyxNQUFBQSxPQUFPLEVBQUUsSUFETTtBQUVmQyxNQUFBQSxTQUFTLEVBQUV4QixXQUZJO0FBR2Z5QixNQUFBQSxVQUFVLEVBQUUsUUFIRyxDQUdNOztBQUhOLEtBQW5CO0FBTUExSSxJQUFBQSxJQUFJLENBQUN6QyxVQUFMO0FBQ0g7QUFwbUJpQixDQUF0QixDLENBdW1CQTs7QUFDQUMsQ0FBQyxDQUFDbUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJNLEVBQUFBLGFBQWEsQ0FBQ2dCLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBGb3JtLCBnbG9iYWxSb290VXJsLCBEYXRhdGFibGUsIFNlbWFudGljTG9jYWxpemF0aW9uLCBGaXJld2FsbEFQSSwgRmFpbDJCYW5BUEksIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIsIGZhaWwyYmFuV2hpdGVsaXN0LCBQYnhEYXRlVGltZSAqL1xuLyoqXG4gKiBUaGUgYGZhaWwyQmFuSW5kZXhgIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGYWlsMkJhbiBzeXN0ZW0uXG4gKlxuICogQG1vZHVsZSBmYWlsMkJhbkluZGV4XG4gKi9cbmNvbnN0IGZhaWwyQmFuSW5kZXggPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRiYW5uZWRJcExpc3RUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBwYXJlbnQgc2VnbWVudCBjb250YWluaW5nIHRoZSBiYW5uZWQgSVBzIHRhYiAoZm9yIGRpbW1lciBvdmVybGF5KVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJhbm5lZElwVGFiU2VnbWVudDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNlY3VyaXR5UHJlc2V0U2xpZGVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgcHJlc2V0IGRlZmluaXRpb25zLlxuICAgICAqIEVhY2ggcHJlc2V0IGRlZmluZXMgbWF4cmV0cnksIGZpbmR0aW1lIChzZWNvbmRzKSwgYW5kIGJhbnRpbWUgKHNlY29uZHMpLlxuICAgICAqL1xuICAgIHNlY3VyaXR5UHJlc2V0czogW1xuICAgICAgICB7IC8vIDA6IFdlYWtcbiAgICAgICAgICAgIG1heHJldHJ5OiAyMCxcbiAgICAgICAgICAgIGZpbmR0aW1lOiA2MDAsICAgICAvLyAxMCBtaW5cbiAgICAgICAgICAgIGJhbnRpbWU6IDYwMCwgICAgICAvLyAxMCBtaW5cbiAgICAgICAgICAgIG1heFJlcVNlYzogNTAwLCAgICAvLyBTSVAgcmF0ZSBsaW1pdCAoZGlzYWJsZWQgaWYgPjIwMCBleHRlbnNpb25zKVxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAncmVsYXhlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gMTogTm9ybWFsXG4gICAgICAgICAgICBtYXhyZXRyeTogMTAsXG4gICAgICAgICAgICBmaW5kdGltZTogMzYwMCwgICAgLy8gMSBob3VyXG4gICAgICAgICAgICBiYW50aW1lOiA4NjQwMCwgICAgLy8gMSBkYXlcbiAgICAgICAgICAgIG1heFJlcVNlYzogMzAwLFxuICAgICAgICAgICAgc2VjdXJpdHlNb2RlOiAnYmFsYW5jZWQnLFxuICAgICAgICB9LFxuICAgICAgICB7IC8vIDI6IEVuaGFuY2VkXG4gICAgICAgICAgICBtYXhyZXRyeTogNSxcbiAgICAgICAgICAgIGZpbmR0aW1lOiAyMTYwMCwgICAvLyA2IGhvdXJzXG4gICAgICAgICAgICBiYW50aW1lOiA2MDQ4MDAsICAgLy8gNyBkYXlzXG4gICAgICAgICAgICBtYXhSZXFTZWM6IDE1MCxcbiAgICAgICAgICAgIHNlY3VyaXR5TW9kZTogJ3N0cmljdCcsXG4gICAgICAgIH0sXG4gICAgICAgIHsgLy8gMzogUGFyYW5vaWRcbiAgICAgICAgICAgIG1heHJldHJ5OiAzLFxuICAgICAgICAgICAgZmluZHRpbWU6IDg2NDAwLCAgIC8vIDI0IGhvdXJzXG4gICAgICAgICAgICBiYW50aW1lOiAyNTkyMDAwLCAgLy8gMzAgZGF5c1xuICAgICAgICAgICAgbWF4UmVxU2VjOiAxMDAsXG4gICAgICAgICAgICBzZWN1cml0eU1vZGU6ICdwYXJhbm9pZCcsXG4gICAgICAgIH0sXG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIE51bWJlciBvZiBleHRlbnNpb25zIOKAlCBsb2FkZWQgZnJvbSBBUEkgdG8gZGV0ZXJtaW5lIE1heFJlcVNlYyBiZWhhdmlvci5cbiAgICAgKiBJZiA+MjAwLCBNYXhSZXFTZWMgaXMgZGlzYWJsZWQgKE5BVCBzY2VuYXJpbykuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICBleHRlbnNpb25zQ291bnQ6IDAsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge0RhdGF0YWJsZX1cbiAgICAgKi9cbiAgICBkYXRhVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdW5iYW4gYnV0dG9uc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHVuYmFuQnV0dG9uczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBnbG9iYWwgc2VhcmNoIGlucHV0IGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZ2xvYmFsU2VhcmNoOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8vIFRoaXMgbWV0aG9kIGluaXRpYWxpemVzIHRoZSBGYWlsMkJhbiBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqID0gJCgnI2ZhaWwyYmFuLXNldHRpbmdzLWZvcm0nKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUgPSAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50ID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuY2xvc2VzdCgnLnNlZ21lbnQnKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIgPSAkKCcjU2VjdXJpdHlQcmVzZXRTbGlkZXInKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kdW5iYW5CdXR0b25zID0gJCgnLnVuYmFuLWJ1dHRvbicpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRnbG9iYWxTZWFyY2ggPSAkKCcjZ2xvYmFsLXNlYXJjaCcpO1xuXG4gICAgICAgICQoJyNmYWlsMmJhbi10YWItbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICAgIGlmICh0eXBlb2YgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUub24oJ2NsaWNrJywgJy51bmJhbi1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHVuYmFubmVkSXAgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcCh1bmJhbm5lZElwLCBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJVbkJhbklwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyXG4gICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogMyxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFdlYWssXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldE5vcm1hbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0RW5oYW5jZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFBhcmFub2lkLFxuICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZmFpbDJCYW5JbmRleC5jYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWN1cml0eSBwcmVzZXQgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogVXBkYXRlcyBtYXhyZXRyeSwgZmluZHRpbWUsIGJhbnRpbWUgdmFsdWVzIGFuZCB0aGUgaW5mbyBwYW5lbC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgcHJlc2V0IGluZGV4ICgwLTMpLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTZWN1cml0eVByZXNldCh2YWx1ZSkge1xuICAgICAgICBjb25zdCBwcmVzZXQgPSBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1t2YWx1ZV07XG4gICAgICAgIGlmICghcHJlc2V0KSByZXR1cm47XG5cbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBmb3JtIGZpZWxkc1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdtYXhyZXRyeScsIHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbmR0aW1lJywgcHJlc2V0LmZpbmR0aW1lKTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnYmFudGltZScsIHByZXNldC5iYW50aW1lKTtcblxuICAgICAgICAvLyBTZXQgTWF4UmVxU2VjOiBkaXNhYmxlZCAoMCkgaWYgPjIwMCBleHRlbnNpb25zIChOQVQgc2NlbmFyaW8pXG4gICAgICAgIGNvbnN0IG1heFJlcVNlYyA9IGZhaWwyQmFuSW5kZXguZXh0ZW5zaW9uc0NvdW50ID4gMjAwID8gMCA6IHByZXNldC5tYXhSZXFTZWM7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWEZpcmV3YWxsTWF4UmVxU2VjJywgU3RyaW5nKG1heFJlcVNlYykpO1xuXG4gICAgICAgIC8vIEhUVFAgcmF0ZS1saW1pdCBwcm9maWxlIHJlYWQgYnkgdW5pZmllZC1zZWN1cml0eS5sdWFcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYU2VjdXJpdHlNb2RlJywgcHJlc2V0LnNlY3VyaXR5TW9kZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGluZm8gcGFuZWxcbiAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KTtcblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgaW5mbyBwYW5lbCB1bmRlciB0aGUgc2xpZGVyIHdpdGggdGhlIGN1cnJlbnQgcHJlc2V0J3MgdmFsdWVzLlxuICAgICAqIE1heFJlcVNlYyBzaG93cyDiiJ4gd2hlbiB0aGUgcmF0ZSBsaW1pdCBpcyBhdXRvLWRpc2FibGVkICg+MjAwIGV4dGVuc2lvbnMg4oCUXG4gICAgICogTkFUIHNjZW5hcmlvIHdoZXJlIHRoZSBwZXItc291cmNlIGxpbWl0IGlzIHVuc2FmZSBhbmQgd2UgYWxyZWFkeSBkcm9wIGl0XG4gICAgICogdG8gMCBpbiBjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHByZXNldCAtIFRoZSBwcmVzZXQgb2JqZWN0IHdpdGggbWF4cmV0cnksIGZpbmR0aW1lLCBiYW50aW1lLCBtYXhSZXFTZWMuXG4gICAgICovXG4gICAgdXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCkge1xuICAgICAgICAkKCcjcHJlc2V0LW1heHJldHJ5LXZhbHVlJykudGV4dChwcmVzZXQubWF4cmV0cnkpO1xuICAgICAgICAkKCcjcHJlc2V0LWZpbmR0aW1lLXZhbHVlJykudGV4dChmYWlsMkJhbkluZGV4LmZvcm1hdER1cmF0aW9uKHByZXNldC5maW5kdGltZSkpO1xuICAgICAgICAkKCcjcHJlc2V0LWJhbnRpbWUtdmFsdWUnKS50ZXh0KGZhaWwyQmFuSW5kZXguZm9ybWF0RHVyYXRpb24ocHJlc2V0LmJhbnRpbWUpKTtcblxuICAgICAgICBjb25zdCBtYXhSZXFTZWMgPSBmYWlsMkJhbkluZGV4LmV4dGVuc2lvbnNDb3VudCA+IDIwMCA/IDAgOiBwcmVzZXQubWF4UmVxU2VjO1xuICAgICAgICAkKCcjcHJlc2V0LW1heHJlcXNlYy12YWx1ZScpLnRleHQoXG4gICAgICAgICAgICBtYXhSZXFTZWMgPT09IDBcbiAgICAgICAgICAgICAgICA/IChnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlY1VubGltaXRlZCB8fCAn4oieJylcbiAgICAgICAgICAgICAgICA6IG1heFJlcVNlY1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgc2Vjb25kcyBpbnRvIGEgaHVtYW4tcmVhZGFibGUgZHVyYXRpb24gc3RyaW5nLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gRHVyYXRpb24gaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZHVyYXRpb24uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25EYXlzfWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkhvdXJzfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uTWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3Qgd2hpY2ggc2VjdXJpdHkgcHJlc2V0IG1hdGNoZXMgY3VycmVudCB2YWx1ZXMuXG4gICAgICogUmV0dXJucyBwcmVzZXQgaW5kZXggKDAtMykgb3IgZGVmYXVsdHMgdG8gMSAoTm9ybWFsKSBpZiBubyBleGFjdCBtYXRjaC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4cmV0cnlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZmluZHRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhbnRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge251bWJlcn0gUHJlc2V0IGluZGV4LlxuICAgICAqL1xuICAgIGRldGVjdFByZXNldExldmVsKG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV07XG4gICAgICAgICAgICBpZiAocC5tYXhyZXRyeSA9PT0gbWF4cmV0cnkgJiYgcC5maW5kdGltZSA9PT0gZmluZHRpbWUgJiYgcC5iYW50aW1lID09PSBiYW50aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gZXhhY3QgbWF0Y2gg4oCUIGZpbmQgY2xvc2VzdCBieSBjb21wYXJpbmcgYmFudGltZVxuICAgICAgICBsZXQgY2xvc2VzdCA9IDE7XG4gICAgICAgIGxldCBtaW5EaWZmID0gSW5maW5pdHk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXS5iYW50aW1lIC0gYmFudGltZSk7XG4gICAgICAgICAgICBpZiAoZGlmZiA8IG1pbkRpZmYpIHtcbiAgICAgICAgICAgICAgICBtaW5EaWZmID0gZGlmZjtcbiAgICAgICAgICAgICAgICBjbG9zZXN0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VzdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5nIG9mIGphaWwgbmFtZXMgdG8gc2hvcnQgdGFnIGxhYmVscyBhbmQgY29sb3JzLlxuICAgICAqIFVzZWQgdG8gcmVuZGVyIGNvbXBhY3QgY29sb3JlZCBsYWJlbHMgaW5zdGVhZCBvZiB2ZXJib3NlIGJhbiByZWFzb24gdGV4dC5cbiAgICAgKi9cbiAgICBqYWlsVGFnTWFwOiB7XG4gICAgICAgICdhc3Rlcmlza19hbWlfdjInOiB7IHRhZzogJ0FNSScsIGNvbG9yOiAnb3JhbmdlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfZXJyb3JfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3B1YmxpY192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfc2VjdXJpdHlfbG9nX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfaWF4X3YyJzogeyB0YWc6ICdJQVgnLCBjb2xvcjogJ3RlYWwnIH0sXG4gICAgICAgICdkcm9wYmVhcl92Mic6IHsgdGFnOiAnU1NIJywgY29sb3I6ICdncmV5JyB9LFxuICAgICAgICAnbWlrb3BieC1leHBsb2l0LXNjYW5uZXJfdjInOiB7IHRhZzogJ1NDQU4nLCBjb2xvcjogJ3JlZCcgfSxcbiAgICAgICAgJ21pa29wYngtbmdpbngtZXJyb3JzX3YyJzogeyB0YWc6ICdOR0lOWCcsIGNvbG9yOiAncHVycGxlJyB9LFxuICAgICAgICAnbWlrb3BieC13d3dfdjInOiB7IHRhZzogJ1dFQicsIGNvbG9yOiAnb2xpdmUnIH0sXG4gICAgfSxcblxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvbiB0YWdzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJhbiBkYXRlIOKAlCBvcnRob2dvbmFsIGRhdGE6IG51bWVyaWMgdGltZXN0YW1wIGZvciBzb3J0aW5nLFxuICAgICAgICAgICAgICAgIC8vIGZvcm1hdHRlZCBpbiBzZXJ2ZXIgVFogZm9yIGRpc3BsYXkuIFdpdGhvdXQgdGhpcyBEYXRhVGFibGVzXG4gICAgICAgICAgICAgICAgLy8gZmFsbHMgYmFjayB0byBsZXhpY29ncmFwaGljIHNvcnQgb24gdGhlIHJlbmRlcmVkIHN0cmluZyBhbmRcbiAgICAgICAgICAgICAgICAvLyAwNS4wNS4yMDI2IGVuZHMgdXAgXCJiZWZvcmVcIiAzMC4wNC4yMDI2LlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhLCB0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShkYXRhKSAmJiBkYXRhID4gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGZhaWwyQmFuSW5kZXgucmVuZGVyU2VydmVyVGltZShkYXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBFeHBpcmVzIOKAlCBzYW1lIG9ydGhvZ29uYWwtZGF0YSBwYXR0ZXJuIGFzIEJhbiBkYXRlLlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bScsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcihkYXRhLCB0eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShkYXRhKSAmJiBkYXRhID4gMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGZhaWwyQmFuSW5kZXgucmVuZGVyU2VydmVyVGltZShkYXRhKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAvLyBCdXR0b25zXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG9yZGVyOiBbMCwgJ2FzYyddLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGNyZWF0ZWRSb3cocm93KSB7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDApLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDIpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDMpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICAgICAgJCgndGQnLCByb3cpLmVxKDQpLmFkZENsYXNzKCdjb2xsYXBzaW5nJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrKCkge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGFmdGVyIGVhY2ggRGF0YVRhYmxlIGRyYXcgKGhhbmRsZXMgcGFnaW5hdGlvbilcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuY291bnRyeS1mbGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgnLmJhbi1yZWFzb24tdGFnJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7IHNob3c6IDMwMCwgaGlkZTogMTAwIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gQmFuLWRhdGUgLyBFeHBpcmVzIGNlbGxzIOKAlCBGb21hbnRpYydzIGBodG1sYCBzZXR0aW5nXG4gICAgICAgICAgICAgICAgLy8gYWNjZXB0cyBhIHJhdyBIVE1MIHN0cmluZyAob3IgYSBmdW5jdGlvbikuIFdlIHN0YXNoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHBheWxvYWQgaW4gZGF0YS1odG1sIGFuZCBiaW5kIHBlci1lbGVtZW50IHNvIGVhY2ggY2VsbFxuICAgICAgICAgICAgICAgIC8vIGdldHMgaXRzIG93biByZW5kZXJlZCB0ZW1wbGF0ZS5cbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuYmFuLWRhdGUtdG9vbHRpcCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZWwgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICAkZWwucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAgICAgJGVsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWw6ICRlbC5hdHRyKCdkYXRhLWh0bWwnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdpbnZlcnRlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxheTogeyBzaG93OiAyMDAsIGhpZGU6IDEwMCB9LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGZvciByZWFzb24gdGFncyBmcm9tIGJhbiBlbnRyaWVzLlxuICAgICAqIEdyb3VwcyBiYW5zIGJ5IHRhZyBsYWJlbCwgZGVkdXBsaWNhdGVzLCBhbmQgcmVuZGVycyBjb2xvcmVkIGxhYmVscyB3aXRoIHBvcHVwIHRvb2x0aXBzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gYmFucyAtIEFycmF5IG9mIGJhbiBvYmplY3RzIHdpdGggamFpbCwgdGltZW9mYmFuLCB0aW1ldW5iYW4gcHJvcGVydGllcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyB3aXRoIHRhZyBsYWJlbHMuXG4gICAgICovXG4gICAgYnVpbGRSZWFzb25UYWdzKGJhbnMpIHtcbiAgICAgICAgLy8gR3JvdXAgYnkgdGFnIGxhYmVsIHRvIGRlZHVwbGljYXRlIChlLmcuIG11bHRpcGxlIFNJUCBqYWlscyDihpIgb25lIFNJUCB0YWcpXG4gICAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IHt9O1xuICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGphaWwgPSBiYW4uamFpbCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1hcHBpbmcgPSBmYWlsMkJhbkluZGV4LmphaWxUYWdNYXBbamFpbF0gfHwgeyB0YWc6IGphaWwsIGNvbG9yOiAnZ3JleScgfTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBmMmJfSmFpbF8ke2phaWx9YDtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxSZWFzb24gPSBnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XSB8fCBqYWlsO1xuXG4gICAgICAgICAgICBpZiAoIXRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10pIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddID0ge1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogbWFwcGluZy5jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uczogW10sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSByZWFzb25zIHdpdGhpbiB0aGUgc2FtZSB0YWcgZ3JvdXBcbiAgICAgICAgICAgIGlmICh0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMuaW5kZXhPZihmdWxsUmVhc29uKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMucHVzaChmdWxsUmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgT2JqZWN0LmtleXModGFnR3JvdXBzKS5mb3JFYWNoKHRhZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRhZ0dyb3Vwc1t0YWddO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBncm91cC5yZWFzb25zLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBodG1sICs9IGA8c3BhbiBjbGFzcz1cInVpIG1pbmkgJHtncm91cC5jb2xvcn0gbGFiZWwgYmFuLXJlYXNvbi10YWdcIiBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+JHt0YWd9PC9zcGFuPiBgO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaGlkZUJhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUaGUgYmFja2VuZCB3cmFwcyB0aGUgSVAgbWFwIHVuZGVyIGBpdGVtc2AgYW5kIHNoaXBzIHNlcnZlciBUWlxuICAgICAgICAvLyBtZXRhZGF0YSB1bmRlciBgX21ldGFgLiBPbGRlciBjYWNoZWQgcGF5bG9hZHMgKGFuZCB0aGUgbGVnYWN5IHYxXG4gICAgICAgIC8vIHNoYXBlIGlmIGl0IGV2ZXIgbGVha3MgdGhyb3VnaCkgc2tpcCB0aGUgd3JhcHBlciDigJQgaGFuZGxlIGJvdGguXG4gICAgICAgIGNvbnN0IHBheWxvYWQgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuICAgICAgICBjb25zdCBiYW5uZWRJcHMgPSAocGF5bG9hZCAmJiB0eXBlb2YgcGF5bG9hZCA9PT0gJ29iamVjdCcgJiYgcGF5bG9hZC5pdGVtcylcbiAgICAgICAgICAgID8gcGF5bG9hZC5pdGVtc1xuICAgICAgICAgICAgOiBwYXlsb2FkO1xuICAgICAgICBpZiAocGF5bG9hZCAmJiBwYXlsb2FkLl9tZXRhKSB7XG4gICAgICAgICAgICBQYnhEYXRlVGltZS5zZXRTZXJ2ZXJNZXRhKHBheWxvYWQuX21ldGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUuY2xlYXIoKTtcblxuICAgICAgICBjb25zdCBuZXdEYXRhID0gW107XG4gICAgICAgIE9iamVjdC5rZXlzKGJhbm5lZElwcykuZm9yRWFjaChpcCA9PiB7XG4gICAgICAgICAgICBjb25zdCBpcERhdGEgPSBiYW5uZWRJcHNbaXBdO1xuICAgICAgICAgICAgY29uc3QgYmFucyA9IGlwRGF0YS5iYW5zIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeSA9IGlwRGF0YS5jb3VudHJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeU5hbWUgPSBpcERhdGEuY291bnRyeU5hbWUgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIElQIGRpc3BsYXkgd2l0aCBjb3VudHJ5IGZsYWdcbiAgICAgICAgICAgIGxldCBpcERpc3BsYXkgPSBpcDtcbiAgICAgICAgICAgIGlmIChjb3VudHJ5KSB7XG4gICAgICAgICAgICAgICAgaXBEaXNwbGF5ID0gYDxzcGFuIGNsYXNzPVwiY291bnRyeS1mbGFnXCIgZGF0YS1jb250ZW50PVwiJHtjb3VudHJ5TmFtZX1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPjxpIGNsYXNzPVwiZmxhZyAke2NvdW50cnkudG9Mb3dlckNhc2UoKX1cIj48L2k+PC9zcGFuPiR7aXB9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQnVpbGQgcmVhc29uIHRhZ3NcbiAgICAgICAgICAgIGNvbnN0IHJlYXNvblRhZ3MgPSBmYWlsMkJhbkluZGV4LmJ1aWxkUmVhc29uVGFncyhiYW5zKTtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGVhcmxpZXN0IGJhbiBkYXRlIGFuZCBsYXRlc3QgZXhwaXJ5IGFjcm9zcyBhbGwgYmFuc1xuICAgICAgICAgICAgbGV0IGVhcmxpZXN0QmFuID0gSW5maW5pdHk7XG4gICAgICAgICAgICBsZXQgbGF0ZXN0RXhwaXJ5ID0gMDtcbiAgICAgICAgICAgIGJhbnMuZm9yRWFjaChiYW4gPT4ge1xuICAgICAgICAgICAgICAgIGlmIChiYW4udGltZW9mYmFuIDwgZWFybGllc3RCYW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZWFybGllc3RCYW4gPSBiYW4udGltZW9mYmFuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoYmFuLnRpbWV1bmJhbiA+IGxhdGVzdEV4cGlyeSkge1xuICAgICAgICAgICAgICAgICAgICBsYXRlc3RFeHBpcnkgPSBiYW4udGltZXVuYmFuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBQYXNzIHJhdyB0aW1lc3RhbXBzOyB0aGUgY29sdW1uJ3MgcmVuZGVyKCkgZm9ybWF0cyBmb3IgZGlzcGxheVxuICAgICAgICAgICAgLy8gYW5kIHJldHVybnMgdGhlIG51bWJlciBmb3Igc29ydC90eXBlL2ZpbHRlciAob3J0aG9nb25hbCBkYXRhKS5cbiAgICAgICAgICAgIC8vIG51bGwgZm9yIFwidW5rbm93blwiIHNvIERhdGFUYWJsZXMgc29ydHMgdGhvc2Ugcm93cyB0byB0aGUgZW5kIG9uIGFzYy5cbiAgICAgICAgICAgIGNvbnN0IGJhbkRhdGVWYWx1ZSA9IGVhcmxpZXN0QmFuIDwgSW5maW5pdHkgPyBlYXJsaWVzdEJhbiA6IG51bGw7XG4gICAgICAgICAgICBjb25zdCBleHBpcmVzVmFsdWUgPSBsYXRlc3RFeHBpcnkgPiAwID8gbGF0ZXN0RXhwaXJ5IDogbnVsbDtcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSxcbiAgICAgICAgICAgICAgICByZWFzb25UYWdzLFxuICAgICAgICAgICAgICAgIGJhbkRhdGVWYWx1ZSxcbiAgICAgICAgICAgICAgICBleHBpcmVzVmFsdWUsXG4gICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uIHJpZ2h0IGZsb2F0ZWQgdW5iYW4tYnV0dG9uXCIgZGF0YS12YWx1ZT1cIiR7aXB9XCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZjJiX1VuYmFufTwvYnV0dG9uPmAsXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgbmV3RGF0YS5wdXNoKHJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLnJvd3MuYWRkKG5ld0RhdGEpLmRyYXcoKTtcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBjYWxsYmFjayBtZXRob2QgaXMgdXNlZCBhZnRlciBhbiBJUCBoYXMgYmVlbiB1bmJhbm5lZC5cbiAgICBjYkFmdGVyVW5CYW5JcCgpIHtcbiAgICAgICAgZmFpbDJCYW5JbmRleC5zaG93QmFubmVkTGlzdExvYWRlcigpO1xuICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoZmFpbDJCYW5JbmRleC5jYkdldEJhbm5lZElwTGlzdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudC5cbiAgICAgKiBXaGl0ZWxpc3QgaXMgbWFuYWdlZCBpbiBpdHMgb3duIHRhYiB2aWEgZmFpbDJiYW4td2hpdGVsaXN0LmpzIGFuZCBpcyBOT1RcbiAgICAgKiBwYXJ0IG9mIHRoaXMgZm9ybSDigJQgZG8gbm90IGluY2x1ZGUgaXQgaW4gdGhlIFBBVENIIHBheWxvYWQsIG90aGVyd2lzZSB3ZSdkXG4gICAgICogY2xvYmJlciBlZGl0cyBtYWRlIHRocm91Z2ggdGhlIGRlZGljYXRlZCB0YWIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGEud2hpdGVsaXN0O1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxpbmcgaXMgZG9uZSBieSBGb3JtLmpzXG4gICAgICAgIC8vIFRoaXMgY2FsbGJhY2sgaXMgZm9yIGFkZGl0aW9uYWwgcHJvY2Vzc2luZyBpZiBuZWVkZWRcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBGYWlsMkJhbiBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgRmFpbDJCYW5BUEkuZ2V0U2V0dGluZ3MoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgKHdoaXRlbGlzdCBpcyBtYW5hZ2VkIGluIGl0cyBvd24gdGFiIOKAlCBub3QgcGFydCBvZiB0aGlzIGZvcm0pLlxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjLFxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgZXh0ZW5zaW9ucyBjb3VudCBmb3IgTWF4UmVxU2VjIGNhbGN1bGF0aW9uXG4gICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC5leHRlbnNpb25zQ291bnQgPSBwYXJzZUludChkYXRhLmV4dGVuc2lvbnNDb3VudCwgMTApIHx8IDA7XG5cbiAgICAgICAgICAgICAgICAvLyBEZXRlY3QgYW5kIHNldCBzZWN1cml0eSBwcmVzZXQgbGV2ZWwuIFRoZSBzbGlkZXIgaXMgdGhlIHNpbmdsZSBzb3VyY2Ugb2ZcbiAgICAgICAgICAgICAgICAvLyB0cnV0aCBmb3IgUEJYU2VjdXJpdHlNb2RlIOKAlCB0YWtpbmcgdGhlIHNhdmVkIHZhbHVlIGZyb20gdGhlIEFQSSB3b3VsZCBsZXRcbiAgICAgICAgICAgICAgICAvLyBpdCBzaWxlbnRseSBkcmlmdCBhd2F5IGZyb20gdGhlIHNsaWRlciBvbiB0aGUgbmV4dCBudWRnZS5cbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcmVzZXRJZHggPSBmYWlsMkJhbkluZGV4LmRldGVjdFByZXNldExldmVsKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5tYXhyZXRyeSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5maW5kdGltZSwgMTApLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VJbnQoZGF0YS5iYW50aW1lLCAxMClcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kc2VjdXJpdHlQcmVzZXRTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBwcmVzZXRJZHgsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgZmFpbDJCYW5JbmRleC51cGRhdGVQcmVzZXRJbmZvUGFuZWwoZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbcHJlc2V0SWR4XSk7XG4gICAgICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybShcbiAgICAgICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1BCWFNlY3VyaXR5TW9kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdLnNlY3VyaXR5TW9kZVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBhIHVuaXggdGltZXN0YW1wIGluIHRoZSBQQlggc2VydmVyJ3MgdGltZXpvbmUsIHdpdGggYSBGb21hbnRpY1xuICAgICAqIHBvcHVwIHRoYXQgYWxzbyBzaG93cyB0aGUgYnJvd3Nlci1sb2NhbCByZW5kZXJpbmcuIEJvdGggbGFiZWxzIGNhcnJ5XG4gICAgICogdGhlIElBTkEgbmFtZSBhbmQgVVRDIG9mZnNldCBzbyB0aGUgb3BlcmF0b3IgY2FuJ3QgbWlzdGFrZSBvbmUgZm9yXG4gICAgICogdGhlIG90aGVyLiBUaGUgcG9wdXAgaXMgaW5pdGlhbGlzZWQgaW4gYGRyYXdDYWxsYmFja2AgYWZ0ZXIgZWFjaFxuICAgICAqIERhdGFUYWJsZXMgcmVkcmF3IOKAlCBrZWVwaW5nIHRoZSBtYXJrdXAgcHVyZSBkYXRhIGxldHMgdXMgcmUtYmluZFxuICAgICAqIHBvcHVwcyBhY3Jvc3MgcGFnaW5hdGlvbiB3aXRob3V0IGxlYWtpbmcgaGFuZGxlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdGltZXN0YW1wIC0gVW5peCB0aW1lc3RhbXAgaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIDxzcGFuPiBjYXJyeWluZyBwb3B1cCBtZXRhZGF0YS5cbiAgICAgKi9cbiAgICByZW5kZXJTZXJ2ZXJUaW1lKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCB2aXNpYmxlID0gUGJ4RGF0ZVRpbWUuZm9ybWF0U2VydmVyVGltZSh0aW1lc3RhbXApO1xuICAgICAgICBjb25zdCB0b29sdGlwSHRtbCA9IFBieERhdGVUaW1lLmJ1aWxkRHVhbFRvb2x0aXBIdG1sKHRpbWVzdGFtcCk7XG4gICAgICAgIC8vIEVzY2FwZSB0aGUgSFRNTCBwYXlsb2FkIGZvciBzYWZlIGF0dHJpYnV0ZSBlbWJlZGRpbmcuXG4gICAgICAgIGNvbnN0IHNhZmUgPSB0b29sdGlwSHRtbC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICBgPHNwYW4gY2xhc3M9XCJiYW4tZGF0ZS10b29sdGlwXCIgZGF0YS1odG1sPVwiJHtzYWZlfVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCIgZGF0YS12YXJpYXRpb249XCJpbnZlcnRlZFwiPmBcbiAgICAgICAgICAgICsgYCR7dmlzaWJsZX08L3NwYW4+YFxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZGF0YSB0YWJsZSBwYWdlIGxlbmd0aFxuICAgICAqXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgndHInKS5sYXN0KCkub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCAxMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZGltbWVyIHdpdGggbG9hZGVyIG9uIHRoZSBiYW5uZWQgSVBzIHRhYiBzZWdtZW50XG4gICAgICovXG4gICAgc2hvd0Jhbm5lZExpc3RMb2FkZXIoKSB7XG4gICAgICAgIGlmICghZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmxlbmd0aCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmFwcGVuZChcbiAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgZGltbWVyIG9uIHRoZSBiYW5uZWQgSVBzIHRhYiBzZWdtZW50XG4gICAgICovXG4gICAgaGlkZUJhbm5lZExpc3RMb2FkZXIoKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZhaWwyQmFuSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogRmFpbDJCYW5BUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIEZhaWwyQmFuIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=