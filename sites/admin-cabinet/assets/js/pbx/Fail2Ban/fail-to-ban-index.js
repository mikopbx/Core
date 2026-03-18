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
   * jQuery object for the security preset slider.
   * @type {jQuery}
   */
  $securityPresetSlider: $('#SecurityPresetSlider'),

  /**
   * Possible period values for the records retention.
   */
  maxReqValue: ['10', '30', '100', '300', '0'],

  /**
   * Security preset definitions.
   * Each preset defines maxretry, findtime (seconds), and bantime (seconds).
   */
  securityPresets: [{
    // 0: Weak
    maxretry: 10,
    findtime: 1800,
    // 30 min
    bantime: 3600 // 1 hour

  }, {
    // 1: Normal
    maxretry: 5,
    findtime: 10800,
    // 3 hours
    bantime: 604800 // 7 days

  }, {
    // 2: Enhanced
    maxretry: 3,
    findtime: 21600,
    // 6 hours
    bantime: 2592000 // 30 days

  }, {
    // 3: Paranoid
    maxretry: 1,
    findtime: 43200,
    // 12 hours
    bantime: 5184000 // 60 days

  }],

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
    } // Initialize security preset slider


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
   * Handle event after the select save period slider is changed.
   * @param {number} value - The selected value from the slider.
   */
  cbAfterSelectMaxReqSlider: function cbAfterSelectMaxReqSlider(value) {
    var maxReq = fail2BanIndex.maxReqValue[value];
    fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', maxReq);
    Form.dataChanged();
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
    fail2BanIndex.$formObj.form('set value', 'bantime', preset.bantime); // Update info panel

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
        }); // Update MaxReqSec slider if it exists

        if (fail2BanIndex.$maxReqSlider.length > 0) {
          var maxReq = data.PBXFirewallMaxReqSec || '10';
          fail2BanIndex.$maxReqSlider.slider('set value', fail2BanIndex.maxReqValue.indexOf(maxReq), false);
        } // Detect and set security preset level


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsLXRvLWJhbi1pbmRleC5qcyJdLCJuYW1lcyI6WyJmYWlsMkJhbkluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJGJhbm5lZElwTGlzdFRhYmxlIiwiJGJhbm5lZElwVGFiU2VnbWVudCIsImNsb3Nlc3QiLCIkbWF4UmVxU2xpZGVyIiwiJHNlY3VyaXR5UHJlc2V0U2xpZGVyIiwibWF4UmVxVmFsdWUiLCJzZWN1cml0eVByZXNldHMiLCJtYXhyZXRyeSIsImZpbmR0aW1lIiwiYmFudGltZSIsImRhdGFUYWJsZSIsIiR1bmJhbkJ1dHRvbnMiLCIkZ2xvYmFsU2VhcmNoIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJ0YWIiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIiwic2hvd0Jhbm5lZExpc3RMb2FkZXIiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImNiR2V0QmFubmVkSXBMaXN0Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJ1bmJhbm5lZElwIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJ1bmJhbklwIiwiY2JBZnRlclVuQmFuSXAiLCJsZW5ndGgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsImYyYl9NYXhSZXFTZWMxMCIsImYyYl9NYXhSZXFTZWMzMCIsImYyYl9NYXhSZXFTZWMxMDAiLCJmMmJfTWF4UmVxU2VjMzAwIiwiZjJiX01heFJlcVNlY1VubGltaXRlZCIsIm9uQ2hhbmdlIiwiY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlciIsIm1heFJlcSIsImZvcm0iLCJpbmRleE9mIiwiZjJiX1NlY3VyaXR5UHJlc2V0V2VhayIsImYyYl9TZWN1cml0eVByZXNldE5vcm1hbCIsImYyYl9TZWN1cml0eVByZXNldEVuaGFuY2VkIiwiZjJiX1NlY3VyaXR5UHJlc2V0UGFyYW5vaWQiLCJjYkFmdGVyU2VsZWN0U2VjdXJpdHlQcmVzZXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJwcmVzZXQiLCJ1cGRhdGVQcmVzZXRJbmZvUGFuZWwiLCJ0ZXh0IiwiZm9ybWF0RHVyYXRpb24iLCJzZWNvbmRzIiwibWludXRlcyIsIk1hdGgiLCJmbG9vciIsImhvdXJzIiwiZGF5cyIsImYyYl9EdXJhdGlvbkRheXMiLCJmMmJfRHVyYXRpb25Ib3VycyIsImYyYl9EdXJhdGlvbk1pbnV0ZXMiLCJkZXRlY3RQcmVzZXRMZXZlbCIsImkiLCJwIiwibWluRGlmZiIsIkluZmluaXR5IiwiZGlmZiIsImFicyIsImphaWxUYWdNYXAiLCJ0YWciLCJjb2xvciIsIm9uVmlzaWJsZSIsImRhdGEiLCJuZXdQYWdlTGVuZ3RoIiwiY2FsY3VsYXRlUGFnZUxlbmd0aCIsInBhZ2UiLCJsZW4iLCJkcmF3IiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwicGFnZUxlbmd0aCIsInNjcm9sbENvbGxhcHNlIiwiZGVmZXJSZW5kZXIiLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImNyZWF0ZWRSb3ciLCJyb3ciLCJlcSIsImFkZENsYXNzIiwiZHJhd0NhbGxiYWNrIiwiZmluZCIsInBvcHVwIiwiaG92ZXJhYmxlIiwicG9zaXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiYnVpbGRSZWFzb25UYWdzIiwiYmFucyIsInRhZ0dyb3VwcyIsImZvckVhY2giLCJiYW4iLCJqYWlsIiwibWFwcGluZyIsInRyYW5zbGF0ZUtleSIsImZ1bGxSZWFzb24iLCJyZWFzb25zIiwicHVzaCIsImh0bWwiLCJPYmplY3QiLCJrZXlzIiwiZ3JvdXAiLCJ0b29sdGlwQ29udGVudCIsImpvaW4iLCJyZXNwb25zZSIsImhpZGVCYW5uZWRMaXN0TG9hZGVyIiwicmVzdWx0IiwiYmFubmVkSXBzIiwiY2xlYXIiLCJuZXdEYXRhIiwiaXAiLCJpcERhdGEiLCJjb3VudHJ5IiwiY291bnRyeU5hbWUiLCJpcERpc3BsYXkiLCJ0b0xvd2VyQ2FzZSIsInJlYXNvblRhZ3MiLCJlYXJsaWVzdEJhbiIsImxhdGVzdEV4cGlyeSIsInRpbWVvZmJhbiIsInRpbWV1bmJhbiIsImJhbkRhdGVTdHIiLCJmb3JtYXREYXRlVGltZSIsImV4cGlyZXNTdHIiLCJmMmJfVW5iYW4iLCJyb3dzIiwiYWRkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwid2hpdGVsaXN0IiwiZW50cmllcyIsInNwbGl0IiwiZmlsdGVyIiwiZW50cnkiLCJ0cmltIiwidGVzdCIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZhaWwyQmFuQVBJIiwiZ2V0U2V0dGluZ3MiLCJQQlhGaXJld2FsbE1heFJlcVNlYyIsInByZXNldElkeCIsInBhcnNlSW50IiwidGltZXN0YW1wIiwiZCIsIkRhdGUiLCJkYXkiLCJTdHJpbmciLCJnZXREYXRlIiwicGFkU3RhcnQiLCJtb250aCIsImdldE1vbnRoIiwieWVhciIsImdldEZ1bGxZZWFyIiwiZ2V0SG91cnMiLCJnZXRNaW51dGVzIiwicm93SGVpZ2h0IiwibGFzdCIsIm91dGVySGVpZ2h0Iiwid2luZG93SGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJoZWFkZXJGb290ZXJIZWlnaHQiLCJhcHBlbmQiLCJleF9Mb2FkaW5nRGF0YSIsInJlbW92ZUNsYXNzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBRWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHlCQUFELENBTk87O0FBUWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMsdUJBQUQsQ0FaSDs7QUFjbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsbUJBQW1CLEVBQUVGLENBQUMsQ0FBQyx1QkFBRCxDQUFELENBQTJCRyxPQUEzQixDQUFtQyxVQUFuQyxDQWxCSDs7QUFvQmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBeEJFOztBQTBCbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEscUJBQXFCLEVBQUVMLENBQUMsQ0FBQyx1QkFBRCxDQTlCTjs7QUFnQ2xCO0FBQ0o7QUFDQTtBQUNJTSxFQUFBQSxXQUFXLEVBQUUsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLEtBQWIsRUFBb0IsS0FBcEIsRUFBMkIsR0FBM0IsQ0FuQ0s7O0FBcUNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsQ0FDYjtBQUFFO0FBQ0VDLElBQUFBLFFBQVEsRUFBRSxFQURkO0FBRUlDLElBQUFBLFFBQVEsRUFBRSxJQUZkO0FBRXVCO0FBQ25CQyxJQUFBQSxPQUFPLEVBQUUsSUFIYixDQUd1Qjs7QUFIdkIsR0FEYSxFQU1iO0FBQUU7QUFDRUYsSUFBQUEsUUFBUSxFQUFFLENBRGQ7QUFFSUMsSUFBQUEsUUFBUSxFQUFFLEtBRmQ7QUFFdUI7QUFDbkJDLElBQUFBLE9BQU8sRUFBRSxNQUhiLENBR3VCOztBQUh2QixHQU5hLEVBV2I7QUFBRTtBQUNFRixJQUFBQSxRQUFRLEVBQUUsQ0FEZDtBQUVJQyxJQUFBQSxRQUFRLEVBQUUsS0FGZDtBQUV1QjtBQUNuQkMsSUFBQUEsT0FBTyxFQUFFLE9BSGIsQ0FHdUI7O0FBSHZCLEdBWGEsRUFnQmI7QUFBRTtBQUNFRixJQUFBQSxRQUFRLEVBQUUsQ0FEZDtBQUVJQyxJQUFBQSxRQUFRLEVBQUUsS0FGZDtBQUV1QjtBQUNuQkMsSUFBQUEsT0FBTyxFQUFFLE9BSGIsQ0FHdUI7O0FBSHZCLEdBaEJhLENBekNDOztBQWdFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBcEVPOztBQXNFbEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFWixDQUFDLENBQUMsZUFBRCxDQTFFRTs7QUE0RWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lhLEVBQUFBLGFBQWEsRUFBRWIsQ0FBQyxDQUFDLGdCQUFELENBaEZFOztBQWtGbEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJYyxFQUFBQSxhQUFhLEVBQUUsRUF2Rkc7QUF5RmxCO0FBQ0FDLEVBQUFBLFVBMUZrQix3QkEwRkw7QUFDVGYsSUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJnQixHQUE5QjtBQUNBbEIsSUFBQUEsYUFBYSxDQUFDbUIsbUJBQWQ7QUFDQW5CLElBQUFBLGFBQWEsQ0FBQ29CLGNBQWQ7QUFDQXBCLElBQUFBLGFBQWEsQ0FBQ3FCLFlBQWQsR0FKUyxDQU1UOztBQUNBLFFBQUksT0FBT0Msc0JBQVAsS0FBa0MsV0FBdEMsRUFBbUQ7QUFDL0NBLE1BQUFBLHNCQUFzQixDQUFDTCxVQUF2QjtBQUNIOztBQUVEakIsSUFBQUEsYUFBYSxDQUFDdUIsb0JBQWQ7QUFDQUMsSUFBQUEsV0FBVyxDQUFDQyxZQUFaLENBQXlCekIsYUFBYSxDQUFDMEIsaUJBQXZDO0FBRUExQixJQUFBQSxhQUFhLENBQUNHLGtCQUFkLENBQWlDd0IsRUFBakMsQ0FBb0MsT0FBcEMsRUFBNkMsZUFBN0MsRUFBOEQsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2pFQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUQsTUFBQUEsQ0FBQyxDQUFDRSxlQUFGO0FBQ0EsVUFBTUMsVUFBVSxHQUFHN0IsQ0FBQyxDQUFDMEIsQ0FBQyxDQUFDSSxhQUFILENBQUQsQ0FBbUJDLElBQW5CLENBQXdCLFlBQXhCLENBQW5CO0FBQ0FqQyxNQUFBQSxhQUFhLENBQUN1QixvQkFBZDtBQUNBQyxNQUFBQSxXQUFXLENBQUNVLE9BQVosQ0FBb0JILFVBQXBCLEVBQWdDL0IsYUFBYSxDQUFDbUMsY0FBOUM7QUFDSCxLQU5ELEVBZFMsQ0FzQlQ7O0FBQ0EsUUFBSW5DLGFBQWEsQ0FBQ00sYUFBZCxDQUE0QjhCLE1BQTVCLEdBQXFDLENBQXpDLEVBQTRDO0FBQ3hDcEMsTUFBQUEsYUFBYSxDQUFDTSxhQUFkLENBQ0srQixNQURMLENBQ1k7QUFDSkMsUUFBQUEsR0FBRyxFQUFFLENBREQ7QUFFSkMsUUFBQUEsR0FBRyxFQUFFLENBRkQ7QUFHSkMsUUFBQUEsSUFBSSxFQUFFLENBSEY7QUFJSkMsUUFBQUEsTUFBTSxFQUFFLElBSko7QUFLSkMsUUFBQUEsY0FBYyxFQUFFLHdCQUFVQyxLQUFWLEVBQWlCO0FBQzdCLGNBQUlDLE1BQU0sR0FBRyxDQUNUQyxlQUFlLENBQUNDLGVBRFAsRUFFVEQsZUFBZSxDQUFDRSxlQUZQLEVBR1RGLGVBQWUsQ0FBQ0csZ0JBSFAsRUFJVEgsZUFBZSxDQUFDSSxnQkFKUCxFQUtUSixlQUFlLENBQUNLLHNCQUxQLENBQWI7QUFPQSxpQkFBT04sTUFBTSxDQUFDRCxLQUFELENBQWI7QUFDSCxTQWRHO0FBZUpRLFFBQUFBLFFBQVEsRUFBRW5ELGFBQWEsQ0FBQ29EO0FBZnBCLE9BRFo7QUFtQkEsVUFBTUMsTUFBTSxHQUFHckQsYUFBYSxDQUFDQyxRQUFkLENBQXVCcUQsSUFBdkIsQ0FBNEIsV0FBNUIsRUFBeUMsc0JBQXpDLENBQWY7QUFDQXRELE1BQUFBLGFBQWEsQ0FBQ00sYUFBZCxDQUNLK0IsTUFETCxDQUNZLFdBRFosRUFDeUJyQyxhQUFhLENBQUNRLFdBQWQsQ0FBMEIrQyxPQUExQixDQUFrQ0YsTUFBbEMsQ0FEekIsRUFDb0UsS0FEcEU7QUFFSCxLQTlDUSxDQWdEVDs7O0FBQ0EsUUFBSXJELGFBQWEsQ0FBQ08scUJBQWQsQ0FBb0M2QixNQUFwQyxHQUE2QyxDQUFqRCxFQUFvRDtBQUNoRHBDLE1BQUFBLGFBQWEsQ0FBQ08scUJBQWQsQ0FDSzhCLE1BREwsQ0FDWTtBQUNKQyxRQUFBQSxHQUFHLEVBQUUsQ0FERDtBQUVKQyxRQUFBQSxHQUFHLEVBQUUsQ0FGRDtBQUdKQyxRQUFBQSxJQUFJLEVBQUUsQ0FIRjtBQUlKQyxRQUFBQSxNQUFNLEVBQUUsSUFKSjtBQUtKQyxRQUFBQSxjQUFjLEVBQUUsd0JBQVVDLEtBQVYsRUFBaUI7QUFDN0IsY0FBTUMsTUFBTSxHQUFHLENBQ1hDLGVBQWUsQ0FBQ1csc0JBREwsRUFFWFgsZUFBZSxDQUFDWSx3QkFGTCxFQUdYWixlQUFlLENBQUNhLDBCQUhMLEVBSVhiLGVBQWUsQ0FBQ2MsMEJBSkwsQ0FBZjtBQU1BLGlCQUFPZixNQUFNLENBQUNELEtBQUQsQ0FBYjtBQUNILFNBYkc7QUFjSlEsUUFBQUEsUUFBUSxFQUFFbkQsYUFBYSxDQUFDNEQ7QUFkcEIsT0FEWjtBQWlCSDtBQUNKLEdBOUppQjs7QUFnS2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lSLEVBQUFBLHlCQXBLa0IscUNBb0tRVCxLQXBLUixFQW9LZTtBQUM3QixRQUFNVSxNQUFNLEdBQUdyRCxhQUFhLENBQUNRLFdBQWQsQ0FBMEJtQyxLQUExQixDQUFmO0FBQ0EzQyxJQUFBQSxhQUFhLENBQUNDLFFBQWQsQ0FBdUJxRCxJQUF2QixDQUE0QixXQUE1QixFQUF5QyxzQkFBekMsRUFBaUVELE1BQWpFO0FBQ0FRLElBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILEdBeEtpQjs7QUEwS2xCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUYsRUFBQUEsMkJBL0trQix1Q0ErS1VqQixLQS9LVixFQStLaUI7QUFDL0IsUUFBTW9CLE1BQU0sR0FBRy9ELGFBQWEsQ0FBQ1MsZUFBZCxDQUE4QmtDLEtBQTlCLENBQWY7QUFDQSxRQUFJLENBQUNvQixNQUFMLEVBQWEsT0FGa0IsQ0FJL0I7O0FBQ0EvRCxJQUFBQSxhQUFhLENBQUNDLFFBQWQsQ0FBdUJxRCxJQUF2QixDQUE0QixXQUE1QixFQUF5QyxVQUF6QyxFQUFxRFMsTUFBTSxDQUFDckQsUUFBNUQ7QUFDQVYsSUFBQUEsYUFBYSxDQUFDQyxRQUFkLENBQXVCcUQsSUFBdkIsQ0FBNEIsV0FBNUIsRUFBeUMsVUFBekMsRUFBcURTLE1BQU0sQ0FBQ3BELFFBQTVEO0FBQ0FYLElBQUFBLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QnFELElBQXZCLENBQTRCLFdBQTVCLEVBQXlDLFNBQXpDLEVBQW9EUyxNQUFNLENBQUNuRCxPQUEzRCxFQVArQixDQVMvQjs7QUFDQVosSUFBQUEsYUFBYSxDQUFDZ0UscUJBQWQsQ0FBb0NELE1BQXBDO0FBRUFGLElBQUFBLElBQUksQ0FBQ0MsV0FBTDtBQUNILEdBNUxpQjs7QUE4TGxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLHFCQWxNa0IsaUNBa01JRCxNQWxNSixFQWtNWTtBQUMxQjdELElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCK0QsSUFBNUIsQ0FBaUNGLE1BQU0sQ0FBQ3JELFFBQXhDO0FBQ0FSLElBQUFBLENBQUMsQ0FBQyx3QkFBRCxDQUFELENBQTRCK0QsSUFBNUIsQ0FBaUNqRSxhQUFhLENBQUNrRSxjQUFkLENBQTZCSCxNQUFNLENBQUNwRCxRQUFwQyxDQUFqQztBQUNBVCxJQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQitELElBQTNCLENBQWdDakUsYUFBYSxDQUFDa0UsY0FBZCxDQUE2QkgsTUFBTSxDQUFDbkQsT0FBcEMsQ0FBaEM7QUFDSCxHQXRNaUI7O0FBd01sQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lzRCxFQUFBQSxjQTdNa0IsMEJBNk1IQyxPQTdNRyxFQTZNTTtBQUNwQixRQUFNQyxPQUFPLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXSCxPQUFPLEdBQUcsRUFBckIsQ0FBaEI7QUFDQSxRQUFNSSxLQUFLLEdBQUdGLElBQUksQ0FBQ0MsS0FBTCxDQUFXRixPQUFPLEdBQUcsRUFBckIsQ0FBZDtBQUNBLFFBQU1JLElBQUksR0FBR0gsSUFBSSxDQUFDQyxLQUFMLENBQVdDLEtBQUssR0FBRyxFQUFuQixDQUFiOztBQUVBLFFBQUlDLElBQUksR0FBRyxDQUFYLEVBQWM7QUFDVix1QkFBVUEsSUFBVixTQUFpQjNCLGVBQWUsQ0FBQzRCLGdCQUFqQztBQUNIOztBQUNELFFBQUlGLEtBQUssR0FBRyxDQUFaLEVBQWU7QUFDWCx1QkFBVUEsS0FBVixTQUFrQjFCLGVBQWUsQ0FBQzZCLGlCQUFsQztBQUNIOztBQUNELHFCQUFVTixPQUFWLFNBQW9CdkIsZUFBZSxDQUFDOEIsbUJBQXBDO0FBQ0gsR0F6TmlCOztBQTJObEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFuT2tCLDZCQW1PQWxFLFFBbk9BLEVBbU9VQyxRQW5PVixFQW1Pb0JDLE9Bbk9wQixFQW1PNkI7QUFDM0MsU0FBSyxJQUFJaUUsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRzdFLGFBQWEsQ0FBQ1MsZUFBZCxDQUE4QjJCLE1BQWxELEVBQTBEeUMsQ0FBQyxFQUEzRCxFQUErRDtBQUMzRCxVQUFNQyxDQUFDLEdBQUc5RSxhQUFhLENBQUNTLGVBQWQsQ0FBOEJvRSxDQUE5QixDQUFWOztBQUNBLFVBQUlDLENBQUMsQ0FBQ3BFLFFBQUYsS0FBZUEsUUFBZixJQUEyQm9FLENBQUMsQ0FBQ25FLFFBQUYsS0FBZUEsUUFBMUMsSUFBc0RtRSxDQUFDLENBQUNsRSxPQUFGLEtBQWNBLE9BQXhFLEVBQWlGO0FBQzdFLGVBQU9pRSxDQUFQO0FBQ0g7QUFDSixLQU4wQyxDQU8zQzs7O0FBQ0EsUUFBSXhFLE9BQU8sR0FBRyxDQUFkO0FBQ0EsUUFBSTBFLE9BQU8sR0FBR0MsUUFBZDs7QUFDQSxTQUFLLElBQUlILEVBQUMsR0FBRyxDQUFiLEVBQWdCQSxFQUFDLEdBQUc3RSxhQUFhLENBQUNTLGVBQWQsQ0FBOEIyQixNQUFsRCxFQUEwRHlDLEVBQUMsRUFBM0QsRUFBK0Q7QUFDM0QsVUFBTUksSUFBSSxHQUFHWixJQUFJLENBQUNhLEdBQUwsQ0FBU2xGLGFBQWEsQ0FBQ1MsZUFBZCxDQUE4Qm9FLEVBQTlCLEVBQWlDakUsT0FBakMsR0FBMkNBLE9BQXBELENBQWI7O0FBQ0EsVUFBSXFFLElBQUksR0FBR0YsT0FBWCxFQUFvQjtBQUNoQkEsUUFBQUEsT0FBTyxHQUFHRSxJQUFWO0FBQ0E1RSxRQUFBQSxPQUFPLEdBQUd3RSxFQUFWO0FBQ0g7QUFDSjs7QUFDRCxXQUFPeEUsT0FBUDtBQUNILEdBclBpQjs7QUF3UGxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k4RSxFQUFBQSxVQUFVLEVBQUU7QUFDUix1QkFBbUI7QUFBRUMsTUFBQUEsR0FBRyxFQUFFLEtBQVA7QUFBY0MsTUFBQUEsS0FBSyxFQUFFO0FBQXJCLEtBRFg7QUFFUix5QkFBcUI7QUFBRUQsTUFBQUEsR0FBRyxFQUFFLEtBQVA7QUFBY0MsTUFBQUEsS0FBSyxFQUFFO0FBQXJCLEtBRmI7QUFHUiwwQkFBc0I7QUFBRUQsTUFBQUEsR0FBRyxFQUFFLEtBQVA7QUFBY0MsTUFBQUEsS0FBSyxFQUFFO0FBQXJCLEtBSGQ7QUFJUixnQ0FBNEI7QUFBRUQsTUFBQUEsR0FBRyxFQUFFLEtBQVA7QUFBY0MsTUFBQUEsS0FBSyxFQUFFO0FBQXJCLEtBSnBCO0FBS1IsbUJBQWU7QUFBRUQsTUFBQUEsR0FBRyxFQUFFLEtBQVA7QUFBY0MsTUFBQUEsS0FBSyxFQUFFO0FBQXJCLEtBTFA7QUFNUix1QkFBbUI7QUFBRUQsTUFBQUEsR0FBRyxFQUFFLEtBQVA7QUFBY0MsTUFBQUEsS0FBSyxFQUFFO0FBQXJCLEtBTlg7QUFPUixtQkFBZTtBQUFFRCxNQUFBQSxHQUFHLEVBQUUsS0FBUDtBQUFjQyxNQUFBQSxLQUFLLEVBQUU7QUFBckIsS0FQUDtBQVFSLGtDQUE4QjtBQUFFRCxNQUFBQSxHQUFHLEVBQUUsTUFBUDtBQUFlQyxNQUFBQSxLQUFLLEVBQUU7QUFBdEIsS0FSdEI7QUFTUiwrQkFBMkI7QUFBRUQsTUFBQUEsR0FBRyxFQUFFLE9BQVA7QUFBZ0JDLE1BQUFBLEtBQUssRUFBRTtBQUF2QixLQVRuQjtBQVVSLHNCQUFrQjtBQUFFRCxNQUFBQSxHQUFHLEVBQUUsS0FBUDtBQUFjQyxNQUFBQSxLQUFLLEVBQUU7QUFBckI7QUFWVixHQTVQTTtBQXlRbEJsRSxFQUFBQSxtQkF6UWtCLGlDQXlRRztBQUNqQmpCLElBQUFBLENBQUMsQ0FBQywwQkFBRCxDQUFELENBQThCZ0IsR0FBOUIsQ0FBa0M7QUFDOUJvRSxNQUFBQSxTQUQ4Qix1QkFDbkI7QUFDUCxZQUFJcEYsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRcUYsSUFBUixDQUFhLEtBQWIsTUFBc0IsUUFBdEIsSUFBa0N2RixhQUFhLENBQUNhLFNBQWQsS0FBMEIsSUFBaEUsRUFBcUU7QUFDakUsY0FBTTJFLGFBQWEsR0FBR3hGLGFBQWEsQ0FBQ3lGLG1CQUFkLEVBQXRCO0FBQ0F6RixVQUFBQSxhQUFhLENBQUNhLFNBQWQsQ0FBd0I2RSxJQUF4QixDQUE2QkMsR0FBN0IsQ0FBaUNILGFBQWpDLEVBQWdESSxJQUFoRCxDQUFxRCxLQUFyRDtBQUNIO0FBQ0o7QUFONkIsS0FBbEM7QUFTQTVGLElBQUFBLGFBQWEsQ0FBQ2EsU0FBZCxHQUEwQmIsYUFBYSxDQUFDRyxrQkFBZCxDQUFpQzBGLFNBQWpDLENBQTJDO0FBQ2pFQyxNQUFBQSxZQUFZLEVBQUUsS0FEbUQ7QUFFakVDLE1BQUFBLE1BQU0sRUFBRSxJQUZ5RDtBQUdqRUMsTUFBQUEsVUFBVSxFQUFFaEcsYUFBYSxDQUFDeUYsbUJBQWQsRUFIcUQ7QUFJakVRLE1BQUFBLGNBQWMsRUFBRSxJQUppRDtBQUtqRUMsTUFBQUEsV0FBVyxFQUFFLElBTG9EO0FBTWpFQyxNQUFBQSxPQUFPLEVBQUUsQ0FDTDtBQUNBO0FBQ0lDLFFBQUFBLFNBQVMsRUFBRSxJQURmO0FBRUlDLFFBQUFBLFVBQVUsRUFBRTtBQUZoQixPQUZLLEVBTUw7QUFDQTtBQUNJRCxRQUFBQSxTQUFTLEVBQUUsS0FEZjtBQUVJQyxRQUFBQSxVQUFVLEVBQUU7QUFGaEIsT0FQSyxFQVdMO0FBQ0E7QUFDSUQsUUFBQUEsU0FBUyxFQUFFLElBRGY7QUFFSUMsUUFBQUEsVUFBVSxFQUFFO0FBRmhCLE9BWkssRUFnQkw7QUFDQTtBQUNJRCxRQUFBQSxTQUFTLEVBQUUsSUFEZjtBQUVJQyxRQUFBQSxVQUFVLEVBQUU7QUFGaEIsT0FqQkssRUFxQkw7QUFDQTtBQUNJRCxRQUFBQSxTQUFTLEVBQUUsS0FEZjtBQUVJQyxRQUFBQSxVQUFVLEVBQUU7QUFGaEIsT0F0QkssQ0FOd0Q7QUFpQ2pFQyxNQUFBQSxLQUFLLEVBQUUsQ0FBQyxDQUFELEVBQUksS0FBSixDQWpDMEQ7QUFrQ2pFQyxNQUFBQSxRQUFRLEVBQUVDLG9CQUFvQixDQUFDQyxxQkFsQ2tDO0FBbUNqRUMsTUFBQUEsVUFuQ2lFLHNCQW1DdERDLEdBbkNzRCxFQW1DakQ7QUFDWnpHLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU95RyxHQUFQLENBQUQsQ0FBYUMsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsUUFBbkIsQ0FBNEIsWUFBNUI7QUFDQTNHLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU95RyxHQUFQLENBQUQsQ0FBYUMsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsUUFBbkIsQ0FBNEIsWUFBNUI7QUFDQTNHLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU95RyxHQUFQLENBQUQsQ0FBYUMsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsUUFBbkIsQ0FBNEIsWUFBNUI7QUFDQTNHLFFBQUFBLENBQUMsQ0FBQyxJQUFELEVBQU95RyxHQUFQLENBQUQsQ0FBYUMsRUFBYixDQUFnQixDQUFoQixFQUFtQkMsUUFBbkIsQ0FBNEIsWUFBNUI7QUFDSCxPQXhDZ0U7QUF5Q2pFQyxNQUFBQSxZQXpDaUUsMEJBeUNsRDtBQUNYO0FBQ0E5RyxRQUFBQSxhQUFhLENBQUNHLGtCQUFkLENBQWlDNEcsSUFBakMsQ0FBc0MsZUFBdEMsRUFBdURDLEtBQXZELENBQTZEO0FBQ3pEQyxVQUFBQSxTQUFTLEVBQUUsSUFEOEM7QUFFekRDLFVBQUFBLFFBQVEsRUFBRSxZQUYrQztBQUd6REMsVUFBQUEsS0FBSyxFQUFFO0FBQUVDLFlBQUFBLElBQUksRUFBRSxHQUFSO0FBQWFDLFlBQUFBLElBQUksRUFBRTtBQUFuQjtBQUhrRCxTQUE3RDtBQUtBckgsUUFBQUEsYUFBYSxDQUFDRyxrQkFBZCxDQUFpQzRHLElBQWpDLENBQXNDLGlCQUF0QyxFQUF5REMsS0FBekQsQ0FBK0Q7QUFDM0RDLFVBQUFBLFNBQVMsRUFBRSxJQURnRDtBQUUzREMsVUFBQUEsUUFBUSxFQUFFLFlBRmlEO0FBRzNEQyxVQUFBQSxLQUFLLEVBQUU7QUFBRUMsWUFBQUEsSUFBSSxFQUFFLEdBQVI7QUFBYUMsWUFBQUEsSUFBSSxFQUFFO0FBQW5CO0FBSG9ELFNBQS9EO0FBS0g7QUFyRGdFLEtBQTNDLENBQTFCO0FBdURILEdBMVVpQjs7QUE0VWxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBblZrQiwyQkFtVkZDLElBblZFLEVBbVZJO0FBQ2xCO0FBQ0EsUUFBTUMsU0FBUyxHQUFHLEVBQWxCO0FBQ0FELElBQUFBLElBQUksQ0FBQ0UsT0FBTCxDQUFhLFVBQUFDLEdBQUcsRUFBSTtBQUNoQixVQUFNQyxJQUFJLEdBQUdELEdBQUcsQ0FBQ0MsSUFBSixJQUFZLEVBQXpCO0FBQ0EsVUFBTUMsT0FBTyxHQUFHNUgsYUFBYSxDQUFDbUYsVUFBZCxDQUF5QndDLElBQXpCLEtBQWtDO0FBQUV2QyxRQUFBQSxHQUFHLEVBQUV1QyxJQUFQO0FBQWF0QyxRQUFBQSxLQUFLLEVBQUU7QUFBcEIsT0FBbEQ7QUFDQSxVQUFNd0MsWUFBWSxzQkFBZUYsSUFBZixDQUFsQjtBQUNBLFVBQU1HLFVBQVUsR0FBR2pGLGVBQWUsQ0FBQ2dGLFlBQUQsQ0FBZixJQUFpQ0YsSUFBcEQ7O0FBRUEsVUFBSSxDQUFDSCxTQUFTLENBQUNJLE9BQU8sQ0FBQ3hDLEdBQVQsQ0FBZCxFQUE2QjtBQUN6Qm9DLFFBQUFBLFNBQVMsQ0FBQ0ksT0FBTyxDQUFDeEMsR0FBVCxDQUFULEdBQXlCO0FBQ3JCQyxVQUFBQSxLQUFLLEVBQUV1QyxPQUFPLENBQUN2QyxLQURNO0FBRXJCMEMsVUFBQUEsT0FBTyxFQUFFO0FBRlksU0FBekI7QUFJSCxPQVhlLENBWWhCOzs7QUFDQSxVQUFJUCxTQUFTLENBQUNJLE9BQU8sQ0FBQ3hDLEdBQVQsQ0FBVCxDQUF1QjJDLE9BQXZCLENBQStCeEUsT0FBL0IsQ0FBdUN1RSxVQUF2QyxNQUF1RCxDQUFDLENBQTVELEVBQStEO0FBQzNETixRQUFBQSxTQUFTLENBQUNJLE9BQU8sQ0FBQ3hDLEdBQVQsQ0FBVCxDQUF1QjJDLE9BQXZCLENBQStCQyxJQUEvQixDQUFvQ0YsVUFBcEM7QUFDSDtBQUNKLEtBaEJEO0FBa0JBLFFBQUlHLElBQUksR0FBRyxFQUFYO0FBQ0FDLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZWCxTQUFaLEVBQXVCQyxPQUF2QixDQUErQixVQUFBckMsR0FBRyxFQUFJO0FBQ2xDLFVBQU1nRCxLQUFLLEdBQUdaLFNBQVMsQ0FBQ3BDLEdBQUQsQ0FBdkI7QUFDQSxVQUFNaUQsY0FBYyxHQUFHRCxLQUFLLENBQUNMLE9BQU4sQ0FBY08sSUFBZCxDQUFtQixJQUFuQixDQUF2QjtBQUNBTCxNQUFBQSxJQUFJLG9DQUE0QkcsS0FBSyxDQUFDL0MsS0FBbEMsb0RBQStFZ0QsY0FBL0UsNkNBQTZIakQsR0FBN0gsYUFBSjtBQUNILEtBSkQ7QUFLQSxXQUFPNkMsSUFBUDtBQUNILEdBL1dpQjtBQWlYbEI7QUFDQXZHLEVBQUFBLGlCQWxYa0IsNkJBa1hBNkcsUUFsWEEsRUFrWFU7QUFDeEJ2SSxJQUFBQSxhQUFhLENBQUN3SSxvQkFBZDs7QUFDQSxRQUFJRCxRQUFRLEtBQUssS0FBYixJQUFzQixDQUFDQSxRQUFRLENBQUNFLE1BQXBDLEVBQTRDO0FBQ3hDO0FBQ0g7O0FBRUQsUUFBTUMsU0FBUyxHQUFHSCxRQUFRLENBQUNoRCxJQUFULElBQWlCLEVBQW5DO0FBRUF2RixJQUFBQSxhQUFhLENBQUNhLFNBQWQsQ0FBd0I4SCxLQUF4QjtBQUVBLFFBQU1DLE9BQU8sR0FBRyxFQUFoQjtBQUNBVixJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWU8sU0FBWixFQUF1QmpCLE9BQXZCLENBQStCLFVBQUFvQixFQUFFLEVBQUk7QUFDakMsVUFBTUMsTUFBTSxHQUFHSixTQUFTLENBQUNHLEVBQUQsQ0FBeEI7QUFDQSxVQUFNdEIsSUFBSSxHQUFHdUIsTUFBTSxDQUFDdkIsSUFBUCxJQUFlLEVBQTVCO0FBQ0EsVUFBTXdCLE9BQU8sR0FBR0QsTUFBTSxDQUFDQyxPQUFQLElBQWtCLEVBQWxDO0FBQ0EsVUFBTUMsV0FBVyxHQUFHRixNQUFNLENBQUNFLFdBQVAsSUFBc0IsRUFBMUMsQ0FKaUMsQ0FNakM7O0FBQ0EsVUFBSUMsU0FBUyxHQUFHSixFQUFoQjs7QUFDQSxVQUFJRSxPQUFKLEVBQWE7QUFDVEUsUUFBQUEsU0FBUyx5REFBK0NELFdBQS9DLDZEQUF5R0QsT0FBTyxDQUFDRyxXQUFSLEVBQXpHLDJCQUE4SUwsRUFBOUksQ0FBVDtBQUNILE9BVmdDLENBWWpDOzs7QUFDQSxVQUFNTSxVQUFVLEdBQUduSixhQUFhLENBQUNzSCxlQUFkLENBQThCQyxJQUE5QixDQUFuQixDQWJpQyxDQWVqQzs7QUFDQSxVQUFJNkIsV0FBVyxHQUFHcEUsUUFBbEI7QUFDQSxVQUFJcUUsWUFBWSxHQUFHLENBQW5CO0FBQ0E5QixNQUFBQSxJQUFJLENBQUNFLE9BQUwsQ0FBYSxVQUFBQyxHQUFHLEVBQUk7QUFDaEIsWUFBSUEsR0FBRyxDQUFDNEIsU0FBSixHQUFnQkYsV0FBcEIsRUFBaUM7QUFDN0JBLFVBQUFBLFdBQVcsR0FBRzFCLEdBQUcsQ0FBQzRCLFNBQWxCO0FBQ0g7O0FBQ0QsWUFBSTVCLEdBQUcsQ0FBQzZCLFNBQUosR0FBZ0JGLFlBQXBCLEVBQWtDO0FBQzlCQSxVQUFBQSxZQUFZLEdBQUczQixHQUFHLENBQUM2QixTQUFuQjtBQUNIO0FBQ0osT0FQRDtBQVNBLFVBQU1DLFVBQVUsR0FBR0osV0FBVyxHQUFHcEUsUUFBZCxnQ0FDUW9FLFdBRFIsZ0JBQ3dCcEosYUFBYSxDQUFDeUosY0FBZCxDQUE2QkwsV0FBN0IsQ0FEeEIsZUFFYixFQUZOO0FBR0EsVUFBTU0sVUFBVSxHQUFHTCxZQUFZLEdBQUcsQ0FBZixnQ0FDUUEsWUFEUixnQkFDeUJySixhQUFhLENBQUN5SixjQUFkLENBQTZCSixZQUE3QixDQUR6QixlQUViLEVBRk47QUFJQSxVQUFNMUMsR0FBRyxHQUFHLENBQ1JzQyxTQURRLEVBRVJFLFVBRlEsRUFHUkssVUFIUSxFQUlSRSxVQUpRLGdHQUs0RWIsRUFMNUUsaURBS2tIaEcsZUFBZSxDQUFDOEcsU0FMbEksZUFBWjtBQU9BZixNQUFBQSxPQUFPLENBQUNaLElBQVIsQ0FBYXJCLEdBQWI7QUFDSCxLQTFDRDtBQTRDQTNHLElBQUFBLGFBQWEsQ0FBQ2EsU0FBZCxDQUF3QitJLElBQXhCLENBQTZCQyxHQUE3QixDQUFpQ2pCLE9BQWpDLEVBQTBDaEQsSUFBMUM7QUFDSCxHQTFhaUI7QUE0YWxCO0FBQ0F6RCxFQUFBQSxjQTdha0IsNEJBNmFEO0FBQ2JuQyxJQUFBQSxhQUFhLENBQUN1QixvQkFBZDtBQUNBQyxJQUFBQSxXQUFXLENBQUNDLFlBQVosQ0FBeUJ6QixhQUFhLENBQUMwQixpQkFBdkM7QUFDSCxHQWhiaUI7O0FBa2JsQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lvSSxFQUFBQSxnQkF2YmtCLDRCQXViREMsUUF2YkMsRUF1YlM7QUFDdkIsUUFBTXRCLE1BQU0sR0FBR3NCLFFBQWY7QUFDQXRCLElBQUFBLE1BQU0sQ0FBQ2xELElBQVAsR0FBY3ZGLGFBQWEsQ0FBQ0MsUUFBZCxDQUF1QnFELElBQXZCLENBQTRCLFlBQTVCLENBQWQsQ0FGdUIsQ0FJdkI7O0FBQ0EsUUFBSW1GLE1BQU0sQ0FBQ2xELElBQVAsQ0FBWXlFLFNBQWhCLEVBQTJCO0FBQ3ZCLFVBQU1DLE9BQU8sR0FBR3hCLE1BQU0sQ0FBQ2xELElBQVAsQ0FBWXlFLFNBQVosQ0FBc0JFLEtBQXRCLENBQTRCLFNBQTVCLEVBQXVDQyxNQUF2QyxDQUE4QyxVQUFBQyxLQUFLLEVBQUk7QUFDbkVBLFFBQUFBLEtBQUssR0FBR0EsS0FBSyxDQUFDQyxJQUFOLEVBQVI7QUFDQSxZQUFJLENBQUNELEtBQUwsRUFBWSxPQUFPLEtBQVAsQ0FGdUQsQ0FHbkU7O0FBQ0EsZUFBTyxzQ0FBc0NFLElBQXRDLENBQTJDRixLQUEzQyxLQUNBLDhCQUE4QkUsSUFBOUIsQ0FBbUNGLEtBQW5DLENBRFA7QUFFSCxPQU5lLENBQWhCO0FBT0EzQixNQUFBQSxNQUFNLENBQUNsRCxJQUFQLENBQVl5RSxTQUFaLEdBQXdCQyxPQUFPLENBQUMzQixJQUFSLENBQWEsR0FBYixDQUF4QjtBQUNIOztBQUVELFdBQU9HLE1BQVA7QUFDSCxHQXhjaUI7O0FBMGNsQjtBQUNKO0FBQ0E7QUFDQTtBQUNJOEIsRUFBQUEsZUE5Y2tCLDJCQThjRmhDLFFBOWNFLEVBOGNRLENBQ3RCO0FBQ0E7QUFDSCxHQWpkaUI7O0FBbWRsQjtBQUNKO0FBQ0E7QUFDSWxILEVBQUFBLFlBdGRrQiwwQkFzZEg7QUFDWG1KLElBQUFBLFdBQVcsQ0FBQ0MsV0FBWixDQUF3QixVQUFDbEMsUUFBRCxFQUFjO0FBQ2xDLFVBQUlBLFFBQVEsQ0FBQ0UsTUFBVCxJQUFtQkYsUUFBUSxDQUFDaEQsSUFBaEMsRUFBc0M7QUFDbEMsWUFBTUEsSUFBSSxHQUFHZ0QsUUFBUSxDQUFDaEQsSUFBdEIsQ0FEa0MsQ0FFbEM7O0FBQ0F2RixRQUFBQSxhQUFhLENBQUNDLFFBQWQsQ0FBdUJxRCxJQUF2QixDQUE0QixZQUE1QixFQUEwQztBQUN0QzVDLFVBQUFBLFFBQVEsRUFBRTZFLElBQUksQ0FBQzdFLFFBRHVCO0FBRXRDRSxVQUFBQSxPQUFPLEVBQUUyRSxJQUFJLENBQUMzRSxPQUZ3QjtBQUd0Q0QsVUFBQUEsUUFBUSxFQUFFNEUsSUFBSSxDQUFDNUUsUUFIdUI7QUFJdENxSixVQUFBQSxTQUFTLEVBQUV6RSxJQUFJLENBQUN5RSxTQUpzQjtBQUt0Q1UsVUFBQUEsb0JBQW9CLEVBQUVuRixJQUFJLENBQUNtRjtBQUxXLFNBQTFDLEVBSGtDLENBV2xDOztBQUNBLFlBQUkxSyxhQUFhLENBQUNNLGFBQWQsQ0FBNEI4QixNQUE1QixHQUFxQyxDQUF6QyxFQUE0QztBQUN4QyxjQUFNaUIsTUFBTSxHQUFHa0MsSUFBSSxDQUFDbUYsb0JBQUwsSUFBNkIsSUFBNUM7QUFDQTFLLFVBQUFBLGFBQWEsQ0FBQ00sYUFBZCxDQUE0QitCLE1BQTVCLENBQW1DLFdBQW5DLEVBQWdEckMsYUFBYSxDQUFDUSxXQUFkLENBQTBCK0MsT0FBMUIsQ0FBa0NGLE1BQWxDLENBQWhELEVBQTJGLEtBQTNGO0FBQ0gsU0FmaUMsQ0FpQmxDOzs7QUFDQSxZQUFJckQsYUFBYSxDQUFDTyxxQkFBZCxDQUFvQzZCLE1BQXBDLEdBQTZDLENBQWpELEVBQW9EO0FBQ2hELGNBQU11SSxTQUFTLEdBQUczSyxhQUFhLENBQUM0RSxpQkFBZCxDQUNkZ0csUUFBUSxDQUFDckYsSUFBSSxDQUFDN0UsUUFBTixFQUFnQixFQUFoQixDQURNLEVBRWRrSyxRQUFRLENBQUNyRixJQUFJLENBQUM1RSxRQUFOLEVBQWdCLEVBQWhCLENBRk0sRUFHZGlLLFFBQVEsQ0FBQ3JGLElBQUksQ0FBQzNFLE9BQU4sRUFBZSxFQUFmLENBSE0sQ0FBbEI7QUFLQVosVUFBQUEsYUFBYSxDQUFDTyxxQkFBZCxDQUFvQzhCLE1BQXBDLENBQTJDLFdBQTNDLEVBQXdEc0ksU0FBeEQsRUFBbUUsS0FBbkU7QUFDQTNLLFVBQUFBLGFBQWEsQ0FBQ2dFLHFCQUFkLENBQW9DaEUsYUFBYSxDQUFDUyxlQUFkLENBQThCa0ssU0FBOUIsQ0FBcEM7QUFDSDtBQUNKO0FBQ0osS0E3QkQ7QUE4QkgsR0FyZmlCOztBQXVmbEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lsQixFQUFBQSxjQTdma0IsMEJBNmZIb0IsU0E3ZkcsRUE2ZlE7QUFDdEIsUUFBTUMsQ0FBQyxHQUFHLElBQUlDLElBQUosQ0FBU0YsU0FBUyxHQUFHLElBQXJCLENBQVY7QUFDQSxRQUFNRyxHQUFHLEdBQUdDLE1BQU0sQ0FBQ0gsQ0FBQyxDQUFDSSxPQUFGLEVBQUQsQ0FBTixDQUFvQkMsUUFBcEIsQ0FBNkIsQ0FBN0IsRUFBZ0MsR0FBaEMsQ0FBWjtBQUNBLFFBQU1DLEtBQUssR0FBR0gsTUFBTSxDQUFDSCxDQUFDLENBQUNPLFFBQUYsS0FBZSxDQUFoQixDQUFOLENBQXlCRixRQUF6QixDQUFrQyxDQUFsQyxFQUFxQyxHQUFyQyxDQUFkO0FBQ0EsUUFBTUcsSUFBSSxHQUFHUixDQUFDLENBQUNTLFdBQUYsRUFBYjtBQUNBLFFBQU1oSCxLQUFLLEdBQUcwRyxNQUFNLENBQUNILENBQUMsQ0FBQ1UsUUFBRixFQUFELENBQU4sQ0FBcUJMLFFBQXJCLENBQThCLENBQTlCLEVBQWlDLEdBQWpDLENBQWQ7QUFDQSxRQUFNL0csT0FBTyxHQUFHNkcsTUFBTSxDQUFDSCxDQUFDLENBQUNXLFVBQUYsRUFBRCxDQUFOLENBQXVCTixRQUF2QixDQUFnQyxDQUFoQyxFQUFtQyxHQUFuQyxDQUFoQjtBQUNBLHFCQUFVSCxHQUFWLGNBQWlCSSxLQUFqQixjQUEwQkUsSUFBMUIsY0FBa0MvRyxLQUFsQyxjQUEyQ0gsT0FBM0M7QUFDSCxHQXJnQmlCOztBQXVnQmxCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXFCLEVBQUFBLG1CQTVnQmtCLGlDQTRnQkk7QUFDbEI7QUFDQSxRQUFJaUcsU0FBUyxHQUFHMUwsYUFBYSxDQUFDRyxrQkFBZCxDQUFpQzRHLElBQWpDLENBQXNDLElBQXRDLEVBQTRDNEUsSUFBNUMsR0FBbURDLFdBQW5ELEVBQWhCLENBRmtCLENBR2xCOztBQUNBLFFBQU1DLFlBQVksR0FBR0MsTUFBTSxDQUFDQyxXQUE1QjtBQUNBLFFBQU1DLGtCQUFrQixHQUFHLEdBQTNCLENBTGtCLENBS2M7QUFFaEM7O0FBQ0EsV0FBTzNILElBQUksQ0FBQzlCLEdBQUwsQ0FBUzhCLElBQUksQ0FBQ0MsS0FBTCxDQUFXLENBQUN1SCxZQUFZLEdBQUdHLGtCQUFoQixJQUFzQ04sU0FBakQsQ0FBVCxFQUFzRSxFQUF0RSxDQUFQO0FBQ0gsR0FyaEJpQjs7QUF1aEJsQjtBQUNKO0FBQ0E7QUFDSW5LLEVBQUFBLG9CQTFoQmtCLGtDQTBoQks7QUFDbkIsUUFBSSxDQUFDdkIsYUFBYSxDQUFDSSxtQkFBZCxDQUFrQzJHLElBQWxDLENBQXVDLGNBQXZDLEVBQXVEM0UsTUFBNUQsRUFBb0U7QUFDaEVwQyxNQUFBQSxhQUFhLENBQUNJLG1CQUFkLENBQWtDNkwsTUFBbEMsaUdBRXNDcEosZUFBZSxDQUFDcUosY0FGdEQ7QUFLSDs7QUFDRGxNLElBQUFBLGFBQWEsQ0FBQ0ksbUJBQWQsQ0FBa0MyRyxJQUFsQyxDQUF1QyxjQUF2QyxFQUF1REYsUUFBdkQsQ0FBZ0UsUUFBaEU7QUFDSCxHQW5pQmlCOztBQXFpQmxCO0FBQ0o7QUFDQTtBQUNJMkIsRUFBQUEsb0JBeGlCa0Isa0NBd2lCSztBQUNuQnhJLElBQUFBLGFBQWEsQ0FBQ0ksbUJBQWQsQ0FBa0MyRyxJQUFsQyxDQUF1QyxjQUF2QyxFQUF1RG9GLFdBQXZELENBQW1FLFFBQW5FO0FBQ0gsR0ExaUJpQjs7QUE0aUJsQjtBQUNKO0FBQ0E7QUFDSS9LLEVBQUFBLGNBL2lCa0IsNEJBK2lCRDtBQUNieUMsSUFBQUEsSUFBSSxDQUFDNUQsUUFBTCxHQUFnQkQsYUFBYSxDQUFDQyxRQUE5QjtBQUNBNEQsSUFBQUEsSUFBSSxDQUFDN0MsYUFBTCxHQUFxQmhCLGFBQWEsQ0FBQ2dCLGFBQW5DO0FBQ0E2QyxJQUFBQSxJQUFJLENBQUNpRyxnQkFBTCxHQUF3QjlKLGFBQWEsQ0FBQzhKLGdCQUF0QztBQUNBakcsSUFBQUEsSUFBSSxDQUFDMEcsZUFBTCxHQUF1QnZLLGFBQWEsQ0FBQ3VLLGVBQXJDLENBSmEsQ0FNYjs7QUFDQTFHLElBQUFBLElBQUksQ0FBQ3VJLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFOUIsV0FGSTtBQUdmK0IsTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BMUksSUFBQUEsSUFBSSxDQUFDNUMsVUFBTDtBQUNIO0FBN2pCaUIsQ0FBdEIsQyxDQWdrQkE7O0FBQ0FmLENBQUMsQ0FBQ3NNLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6TSxFQUFBQSxhQUFhLENBQUNpQixVQUFkO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRm9ybSwgZ2xvYmFsUm9vdFVybCwgRGF0YXRhYmxlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgRmlyZXdhbGxBUEksIEZhaWwyQmFuQVBJLCBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICovXG4vKipcbiAqIFRoZSBgZmFpbDJCYW5JbmRleGAgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZhaWwyQmFuIHN5c3RlbS5cbiAqXG4gKiBAbW9kdWxlIGZhaWwyQmFuSW5kZXhcbiAqL1xuY29uc3QgZmFpbDJCYW5JbmRleCA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNmYWlsMmJhbi1zZXR0aW5ncy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgbGlzdCBvZiBiYW5uZWQgSVBzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBMaXN0VGFibGU6ICQoJyNiYW5uZWQtaXAtbGlzdC10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHBhcmVudCBzZWdtZW50IGNvbnRhaW5pbmcgdGhlIGJhbm5lZCBJUHMgdGFiIChmb3IgZGltbWVyIG92ZXJsYXkpXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYmFubmVkSXBUYWJTZWdtZW50OiAkKCcjYmFubmVkLWlwLWxpc3QtdGFibGUnKS5jbG9zZXN0KCcuc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBNYXhpbXVtIG51bWJlciBvZiByZXF1ZXN0cy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXhSZXFTbGlkZXI6ICQoJyNQQlhGaXJld2FsbE1heFJlcVNlYycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNlY3VyaXR5IHByZXNldCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2VjdXJpdHlQcmVzZXRTbGlkZXI6ICQoJyNTZWN1cml0eVByZXNldFNsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uLlxuICAgICAqL1xuICAgIG1heFJlcVZhbHVlOiBbJzEwJywgJzMwJywgJzEwMCcsICczMDAnLCAnMCddLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgcHJlc2V0IGRlZmluaXRpb25zLlxuICAgICAqIEVhY2ggcHJlc2V0IGRlZmluZXMgbWF4cmV0cnksIGZpbmR0aW1lIChzZWNvbmRzKSwgYW5kIGJhbnRpbWUgKHNlY29uZHMpLlxuICAgICAqL1xuICAgIHNlY3VyaXR5UHJlc2V0czogW1xuICAgICAgICB7IC8vIDA6IFdlYWtcbiAgICAgICAgICAgIG1heHJldHJ5OiAxMCxcbiAgICAgICAgICAgIGZpbmR0aW1lOiAxODAwLCAgICAvLyAzMCBtaW5cbiAgICAgICAgICAgIGJhbnRpbWU6IDM2MDAsICAgICAvLyAxIGhvdXJcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAxOiBOb3JtYWxcbiAgICAgICAgICAgIG1heHJldHJ5OiA1LFxuICAgICAgICAgICAgZmluZHRpbWU6IDEwODAwLCAgIC8vIDMgaG91cnNcbiAgICAgICAgICAgIGJhbnRpbWU6IDYwNDgwMCwgICAvLyA3IGRheXNcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAyOiBFbmhhbmNlZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDMsXG4gICAgICAgICAgICBmaW5kdGltZTogMjE2MDAsICAgLy8gNiBob3Vyc1xuICAgICAgICAgICAgYmFudGltZTogMjU5MjAwMCwgIC8vIDMwIGRheXNcbiAgICAgICAgfSxcbiAgICAgICAgeyAvLyAzOiBQYXJhbm9pZFxuICAgICAgICAgICAgbWF4cmV0cnk6IDEsXG4gICAgICAgICAgICBmaW5kdGltZTogNDMyMDAsICAgLy8gMTIgaG91cnNcbiAgICAgICAgICAgIGJhbnRpbWU6IDUxODQwMDAsICAvLyA2MCBkYXlzXG4gICAgICAgIH0sXG4gICAgXSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBsaXN0IG9mIGJhbm5lZCBJUHNcbiAgICAgKiBAdHlwZSB7RGF0YXRhYmxlfVxuICAgICAqL1xuICAgIGRhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSB1bmJhbiBidXR0b25zXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdW5iYW5CdXR0b25zOiAkKCcudW5iYW4tYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgZ2xvYmFsIHNlYXJjaCBpbnB1dCBlbGVtZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdsb2JhbFNlYXJjaDogJCgnI2dsb2JhbC1zZWFyY2gnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmFpbDJCYW4gbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgIGZhaWwyQmFuSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgICAgaWYgKHR5cGVvZiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRmFpbDJCYW5Ub29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgICAgIH1cblxuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcblxuICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5vbignY2xpY2snLCAnLnVuYmFuLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgdW5iYW5uZWRJcCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgICAgICBGaXJld2FsbEFQSS51bmJhbklwKHVuYmFubmVkSXAsIGZhaWwyQmFuSW5kZXguY2JBZnRlclVuQmFuSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyIG9ubHkgaWYgaXQgZXhpc3RzIChub3QgaW4gRG9ja2VyKVxuICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgICAgIG1heDogNCxcbiAgICAgICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFiZWxzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmVxU2VjMTAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXFTZWMzMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzEwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlYzMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJlcVNlY1VubGltaXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbGVjdE1heFJlcVNsaWRlcixcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgY29uc3QgbWF4UmVxID0gZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnUEJYRmlyZXdhbGxNYXhSZXFTZWMnKTtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJG1heFJlcVNsaWRlclxuICAgICAgICAgICAgICAgIC5zbGlkZXIoJ3NldCB2YWx1ZScsIGZhaWwyQmFuSW5kZXgubWF4UmVxVmFsdWUuaW5kZXhPZihtYXhSZXEpLCBmYWxzZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHNlY3VyaXR5IHByZXNldCBzbGlkZXJcbiAgICAgICAgaWYgKGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJHNlY3VyaXR5UHJlc2V0U2xpZGVyXG4gICAgICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICAgICAgbWF4OiAzLFxuICAgICAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0V2VhayxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0Tm9ybWFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRFbmhhbmNlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0UGFyYW5vaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBmYWlsMkJhbkluZGV4LmNiQWZ0ZXJTZWxlY3RTZWN1cml0eVByZXNldCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RNYXhSZXFTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgY29uc3QgbWF4UmVxID0gZmFpbDJCYW5JbmRleC5tYXhSZXFWYWx1ZVt2YWx1ZV07XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWEZpcmV3YWxsTWF4UmVxU2VjJywgbWF4UmVxKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlY3VyaXR5IHByZXNldCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBVcGRhdGVzIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSB2YWx1ZXMgYW5kIHRoZSBpbmZvIHBhbmVsLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCBwcmVzZXQgaW5kZXggKDAtMykuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNlY3VyaXR5UHJlc2V0KHZhbHVlKSB7XG4gICAgICAgIGNvbnN0IHByZXNldCA9IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzW3ZhbHVlXTtcbiAgICAgICAgaWYgKCFwcmVzZXQpIHJldHVybjtcblxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGZvcm0gZmllbGRzXG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ21heHJldHJ5JywgcHJlc2V0Lm1heHJldHJ5KTtcbiAgICAgICAgZmFpbDJCYW5JbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmluZHRpbWUnLCBwcmVzZXQuZmluZHRpbWUpO1xuICAgICAgICBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdiYW50aW1lJywgcHJlc2V0LmJhbnRpbWUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpbmZvIHBhbmVsXG4gICAgICAgIGZhaWwyQmFuSW5kZXgudXBkYXRlUHJlc2V0SW5mb1BhbmVsKHByZXNldCk7XG5cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIGluZm8gcGFuZWwgd2l0aCBwcmVzZXQgdmFsdWVzLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwcmVzZXQgLSBUaGUgcHJlc2V0IG9iamVjdCB3aXRoIG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZS5cbiAgICAgKi9cbiAgICB1cGRhdGVQcmVzZXRJbmZvUGFuZWwocHJlc2V0KSB7XG4gICAgICAgICQoJyNwcmVzZXQtbWF4cmV0cnktdmFsdWUnKS50ZXh0KHByZXNldC5tYXhyZXRyeSk7XG4gICAgICAgICQoJyNwcmVzZXQtZmluZHRpbWUtdmFsdWUnKS50ZXh0KGZhaWwyQmFuSW5kZXguZm9ybWF0RHVyYXRpb24ocHJlc2V0LmZpbmR0aW1lKSk7XG4gICAgICAgICQoJyNwcmVzZXQtYmFudGltZS12YWx1ZScpLnRleHQoZmFpbDJCYW5JbmRleC5mb3JtYXREdXJhdGlvbihwcmVzZXQuYmFudGltZSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgc2Vjb25kcyBpbnRvIGEgaHVtYW4tcmVhZGFibGUgZHVyYXRpb24gc3RyaW5nLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzZWNvbmRzIC0gRHVyYXRpb24gaW4gc2Vjb25kcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgZHVyYXRpb24uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2dsb2JhbFRyYW5zbGF0ZS5mMmJfRHVyYXRpb25EYXlzfWA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7Z2xvYmFsVHJhbnNsYXRlLmYyYl9EdXJhdGlvbkhvdXJzfWA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHtnbG9iYWxUcmFuc2xhdGUuZjJiX0R1cmF0aW9uTWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3Qgd2hpY2ggc2VjdXJpdHkgcHJlc2V0IG1hdGNoZXMgY3VycmVudCB2YWx1ZXMuXG4gICAgICogUmV0dXJucyBwcmVzZXQgaW5kZXggKDAtMykgb3IgZGVmYXVsdHMgdG8gMSAoTm9ybWFsKSBpZiBubyBleGFjdCBtYXRjaC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4cmV0cnlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZmluZHRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJhbnRpbWUgLSBpbiBzZWNvbmRzXG4gICAgICogQHJldHVybnMge251bWJlcn0gUHJlc2V0IGluZGV4LlxuICAgICAqL1xuICAgIGRldGVjdFByZXNldExldmVsKG1heHJldHJ5LCBmaW5kdGltZSwgYmFudGltZSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZhaWwyQmFuSW5kZXguc2VjdXJpdHlQcmVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBwID0gZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHNbaV07XG4gICAgICAgICAgICBpZiAocC5tYXhyZXRyeSA9PT0gbWF4cmV0cnkgJiYgcC5maW5kdGltZSA9PT0gZmluZHRpbWUgJiYgcC5iYW50aW1lID09PSBiYW50aW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTm8gZXhhY3QgbWF0Y2gg4oCUIGZpbmQgY2xvc2VzdCBieSBjb21wYXJpbmcgYmFudGltZVxuICAgICAgICBsZXQgY2xvc2VzdCA9IDE7XG4gICAgICAgIGxldCBtaW5EaWZmID0gSW5maW5pdHk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmFpbDJCYW5JbmRleC5zZWN1cml0eVByZXNldHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1tpXS5iYW50aW1lIC0gYmFudGltZSk7XG4gICAgICAgICAgICBpZiAoZGlmZiA8IG1pbkRpZmYpIHtcbiAgICAgICAgICAgICAgICBtaW5EaWZmID0gZGlmZjtcbiAgICAgICAgICAgICAgICBjbG9zZXN0ID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY2xvc2VzdDtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBNYXBwaW5nIG9mIGphaWwgbmFtZXMgdG8gc2hvcnQgdGFnIGxhYmVscyBhbmQgY29sb3JzLlxuICAgICAqIFVzZWQgdG8gcmVuZGVyIGNvbXBhY3QgY29sb3JlZCBsYWJlbHMgaW5zdGVhZCBvZiB2ZXJib3NlIGJhbiByZWFzb24gdGV4dC5cbiAgICAgKi9cbiAgICBqYWlsVGFnTWFwOiB7XG4gICAgICAgICdhc3Rlcmlza19hbWlfdjInOiB7IHRhZzogJ0FNSScsIGNvbG9yOiAnb3JhbmdlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfZXJyb3JfdjInOiB7IHRhZzogJ1NJUCcsIGNvbG9yOiAnYmx1ZScgfSxcbiAgICAgICAgJ2FzdGVyaXNrX3B1YmxpY192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfc2VjdXJpdHlfbG9nX3YyJzogeyB0YWc6ICdTSVAnLCBjb2xvcjogJ2JsdWUnIH0sXG4gICAgICAgICdhc3Rlcmlza192Mic6IHsgdGFnOiAnU0lQJywgY29sb3I6ICdibHVlJyB9LFxuICAgICAgICAnYXN0ZXJpc2tfaWF4X3YyJzogeyB0YWc6ICdJQVgnLCBjb2xvcjogJ3RlYWwnIH0sXG4gICAgICAgICdkcm9wYmVhcl92Mic6IHsgdGFnOiAnU1NIJywgY29sb3I6ICdncmV5JyB9LFxuICAgICAgICAnbWlrb3BieC1leHBsb2l0LXNjYW5uZXJfdjInOiB7IHRhZzogJ1NDQU4nLCBjb2xvcjogJ3JlZCcgfSxcbiAgICAgICAgJ21pa29wYngtbmdpbngtZXJyb3JzX3YyJzogeyB0YWc6ICdOR0lOWCcsIGNvbG9yOiAncHVycGxlJyB9LFxuICAgICAgICAnbWlrb3BieC13d3dfdjInOiB7IHRhZzogJ1dFQicsIGNvbG9yOiAnb2xpdmUnIH0sXG4gICAgfSxcblxuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKXtcbiAgICAgICAgJCgnI2ZhaWwyYmFuLXRhYi1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZSgpe1xuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLmRhdGEoJ3RhYicpPT09J2Jhbm5lZCcgJiYgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUhPT1udWxsKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3UGFnZUxlbmd0aCA9IGZhaWwyQmFuSW5kZXguY2FsY3VsYXRlUGFnZUxlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LmRhdGFUYWJsZS5wYWdlLmxlbihuZXdQYWdlTGVuZ3RoKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IHRydWUsXG4gICAgICAgICAgICBwYWdlTGVuZ3RoOiBmYWlsMkJhbkluZGV4LmNhbGN1bGF0ZVBhZ2VMZW5ndGgoKSxcbiAgICAgICAgICAgIHNjcm9sbENvbGxhcHNlOiB0cnVlLFxuICAgICAgICAgICAgZGVmZXJSZW5kZXI6IHRydWUsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAgLy8gSVBcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIFJlYXNvbiB0YWdzXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJhbiBkYXRlXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgLy8gRXhwaXJlc1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIC8vIEJ1dHRvbnNcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgb3JkZXI6IFswLCAnYXNjJ10sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgY3JlYXRlZFJvdyhyb3cpIHtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMikuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoMykuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgICAgICAkKCd0ZCcsIHJvdykuZXEoNCkuYWRkQ2xhc3MoJ2NvbGxhcHNpbmcnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgYWZ0ZXIgZWFjaCBEYXRhVGFibGUgZHJhdyAoaGFuZGxlcyBwYWdpbmF0aW9uKVxuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwTGlzdFRhYmxlLmZpbmQoJy5jb3VudHJ5LWZsYWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRiYW5uZWRJcExpc3RUYWJsZS5maW5kKCcuYmFuLXJlYXNvbi10YWcnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMzAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGZvciByZWFzb24gdGFncyBmcm9tIGJhbiBlbnRyaWVzLlxuICAgICAqIEdyb3VwcyBiYW5zIGJ5IHRhZyBsYWJlbCwgZGVkdXBsaWNhdGVzLCBhbmQgcmVuZGVycyBjb2xvcmVkIGxhYmVscyB3aXRoIHBvcHVwIHRvb2x0aXBzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gYmFucyAtIEFycmF5IG9mIGJhbiBvYmplY3RzIHdpdGggamFpbCwgdGltZW9mYmFuLCB0aW1ldW5iYW4gcHJvcGVydGllcy5cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyB3aXRoIHRhZyBsYWJlbHMuXG4gICAgICovXG4gICAgYnVpbGRSZWFzb25UYWdzKGJhbnMpIHtcbiAgICAgICAgLy8gR3JvdXAgYnkgdGFnIGxhYmVsIHRvIGRlZHVwbGljYXRlIChlLmcuIG11bHRpcGxlIFNJUCBqYWlscyDihpIgb25lIFNJUCB0YWcpXG4gICAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IHt9O1xuICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGphaWwgPSBiYW4uamFpbCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1hcHBpbmcgPSBmYWlsMkJhbkluZGV4LmphaWxUYWdNYXBbamFpbF0gfHwgeyB0YWc6IGphaWwsIGNvbG9yOiAnZ3JleScgfTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZUtleSA9IGBmMmJfSmFpbF8ke2phaWx9YDtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxSZWFzb24gPSBnbG9iYWxUcmFuc2xhdGVbdHJhbnNsYXRlS2V5XSB8fCBqYWlsO1xuXG4gICAgICAgICAgICBpZiAoIXRhZ0dyb3Vwc1ttYXBwaW5nLnRhZ10pIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddID0ge1xuICAgICAgICAgICAgICAgICAgICBjb2xvcjogbWFwcGluZy5jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgcmVhc29uczogW10sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEF2b2lkIGR1cGxpY2F0ZSByZWFzb25zIHdpdGhpbiB0aGUgc2FtZSB0YWcgZ3JvdXBcbiAgICAgICAgICAgIGlmICh0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMuaW5kZXhPZihmdWxsUmVhc29uKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICB0YWdHcm91cHNbbWFwcGluZy50YWddLnJlYXNvbnMucHVzaChmdWxsUmVhc29uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgT2JqZWN0LmtleXModGFnR3JvdXBzKS5mb3JFYWNoKHRhZyA9PiB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IHRhZ0dyb3Vwc1t0YWddO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBncm91cC5yZWFzb25zLmpvaW4oJywgJyk7XG4gICAgICAgICAgICBodG1sICs9IGA8c3BhbiBjbGFzcz1cInVpIG1pbmkgJHtncm91cC5jb2xvcn0gbGFiZWwgYmFuLXJlYXNvbi10YWdcIiBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCI+JHt0YWd9PC9zcGFuPiBgO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8vIFRoaXMgY2FsbGJhY2sgbWV0aG9kIGlzIHVzZWQgdG8gZGlzcGxheSB0aGUgbGlzdCBvZiBiYW5uZWQgSVBzLlxuICAgIGNiR2V0QmFubmVkSXBMaXN0KHJlc3BvbnNlKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguaGlkZUJhbm5lZExpc3RMb2FkZXIoKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBiYW5uZWRJcHMgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgIGZhaWwyQmFuSW5kZXguZGF0YVRhYmxlLmNsZWFyKCk7XG5cbiAgICAgICAgY29uc3QgbmV3RGF0YSA9IFtdO1xuICAgICAgICBPYmplY3Qua2V5cyhiYW5uZWRJcHMpLmZvckVhY2goaXAgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXBEYXRhID0gYmFubmVkSXBzW2lwXTtcbiAgICAgICAgICAgIGNvbnN0IGJhbnMgPSBpcERhdGEuYmFucyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnkgPSBpcERhdGEuY291bnRyeSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGNvdW50cnlOYW1lID0gaXBEYXRhLmNvdW50cnlOYW1lIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBJUCBkaXNwbGF5IHdpdGggY291bnRyeSBmbGFnXG4gICAgICAgICAgICBsZXQgaXBEaXNwbGF5ID0gaXA7XG4gICAgICAgICAgICBpZiAoY291bnRyeSkge1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj4ke2lwfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIHJlYXNvbiB0YWdzXG4gICAgICAgICAgICBjb25zdCByZWFzb25UYWdzID0gZmFpbDJCYW5JbmRleC5idWlsZFJlYXNvblRhZ3MoYmFucyk7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBlYXJsaWVzdCBiYW4gZGF0ZSBhbmQgbGF0ZXN0IGV4cGlyeSBhY3Jvc3MgYWxsIGJhbnNcbiAgICAgICAgICAgIGxldCBlYXJsaWVzdEJhbiA9IEluZmluaXR5O1xuICAgICAgICAgICAgbGV0IGxhdGVzdEV4cGlyeSA9IDA7XG4gICAgICAgICAgICBiYW5zLmZvckVhY2goYmFuID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmFuLnRpbWVvZmJhbiA8IGVhcmxpZXN0QmFuKSB7XG4gICAgICAgICAgICAgICAgICAgIGVhcmxpZXN0QmFuID0gYmFuLnRpbWVvZmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGJhbi50aW1ldW5iYW4gPiBsYXRlc3RFeHBpcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGF0ZXN0RXhwaXJ5ID0gYmFuLnRpbWV1bmJhbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgYmFuRGF0ZVN0ciA9IGVhcmxpZXN0QmFuIDwgSW5maW5pdHlcbiAgICAgICAgICAgICAgICA/IGA8c3BhbiBkYXRhLW9yZGVyPVwiJHtlYXJsaWVzdEJhbn1cIj4ke2ZhaWwyQmFuSW5kZXguZm9ybWF0RGF0ZVRpbWUoZWFybGllc3RCYW4pfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGV4cGlyZXNTdHIgPSBsYXRlc3RFeHBpcnkgPiAwXG4gICAgICAgICAgICAgICAgPyBgPHNwYW4gZGF0YS1vcmRlcj1cIiR7bGF0ZXN0RXhwaXJ5fVwiPiR7ZmFpbDJCYW5JbmRleC5mb3JtYXREYXRlVGltZShsYXRlc3RFeHBpcnkpfTwvc3Bhbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gW1xuICAgICAgICAgICAgICAgIGlwRGlzcGxheSxcbiAgICAgICAgICAgICAgICByZWFzb25UYWdzLFxuICAgICAgICAgICAgICAgIGJhbkRhdGVTdHIsXG4gICAgICAgICAgICAgICAgZXhwaXJlc1N0cixcbiAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gcmlnaHQgZmxvYXRlZCB1bmJhbi1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtpcH1cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5mMmJfVW5iYW59PC9idXR0b24+YCxcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBuZXdEYXRhLnB1c2gocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZmFpbDJCYW5JbmRleC5kYXRhVGFibGUucm93cy5hZGQobmV3RGF0YSkuZHJhdygpO1xuICAgIH0sXG5cbiAgICAvLyBUaGlzIGNhbGxiYWNrIG1ldGhvZCBpcyB1c2VkIGFmdGVyIGFuIElQIGhhcyBiZWVuIHVuYmFubmVkLlxuICAgIGNiQWZ0ZXJVbkJhbklwKCkge1xuICAgICAgICBmYWlsMkJhbkluZGV4LnNob3dCYW5uZWRMaXN0TG9hZGVyKCk7XG4gICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcyhmYWlsMkJhbkluZGV4LmNiR2V0QmFubmVkSXBMaXN0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBmYWlsMkJhbkluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgd2hpdGVsaXN0OiBzcGxpdCBieSBhbnkgZGVsaW1pdGVyLCBrZWVwIG9ubHkgdmFsaWQgSVBzL0NJRFJzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS53aGl0ZWxpc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSByZXN1bHQuZGF0YS53aGl0ZWxpc3Quc3BsaXQoL1tcXHMsO10rLykuZmlsdGVyKGVudHJ5ID0+IHtcbiAgICAgICAgICAgICAgICBlbnRyeSA9IGVudHJ5LnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAoIWVudHJ5KSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgLy8gQmFzaWMgSVB2NCwgSVB2NiwgQ0lEUiB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuIC9eKFxcZHsxLDN9XFwuKXszfVxcZHsxLDN9KFxcL1xcZHsxLDJ9KT8kLy50ZXN0KGVudHJ5KVxuICAgICAgICAgICAgICAgICAgICB8fCAvXlswLTlhLWZBLUY6XSsoXFwvXFxkezEsM30pPyQvLnRlc3QoZW50cnkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS53aGl0ZWxpc3QgPSBlbnRyaWVzLmpvaW4oJyAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGluZyBpcyBkb25lIGJ5IEZvcm0uanNcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBpcyBmb3IgYWRkaXRpb25hbCBwcm9jZXNzaW5nIGlmIG5lZWRlZFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIEZhaWwyQmFuIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBGYWlsMkJhbkFQSS5nZXRTZXR0aW5ncygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgIGZhaWwyQmFuSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgbWF4cmV0cnk6IGRhdGEubWF4cmV0cnksXG4gICAgICAgICAgICAgICAgICAgIGJhbnRpbWU6IGRhdGEuYmFudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZmluZHRpbWU6IGRhdGEuZmluZHRpbWUsXG4gICAgICAgICAgICAgICAgICAgIHdoaXRlbGlzdDogZGF0YS53aGl0ZWxpc3QsXG4gICAgICAgICAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiBkYXRhLlBCWEZpcmV3YWxsTWF4UmVxU2VjXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgTWF4UmVxU2VjIHNsaWRlciBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoZmFpbDJCYW5JbmRleC4kbWF4UmVxU2xpZGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF4UmVxID0gZGF0YS5QQlhGaXJld2FsbE1heFJlcVNlYyB8fCAnMTAnO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRtYXhSZXFTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBmYWlsMkJhbkluZGV4Lm1heFJlcVZhbHVlLmluZGV4T2YobWF4UmVxKSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIERldGVjdCBhbmQgc2V0IHNlY3VyaXR5IHByZXNldCBsZXZlbFxuICAgICAgICAgICAgICAgIGlmIChmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByZXNldElkeCA9IGZhaWwyQmFuSW5kZXguZGV0ZWN0UHJlc2V0TGV2ZWwoXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLm1heHJldHJ5LCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLmZpbmR0aW1lLCAxMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZUludChkYXRhLmJhbnRpbWUsIDEwKVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LiRzZWN1cml0eVByZXNldFNsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIHByZXNldElkeCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBmYWlsMkJhbkluZGV4LnVwZGF0ZVByZXNldEluZm9QYW5lbChmYWlsMkJhbkluZGV4LnNlY3VyaXR5UHJlc2V0c1twcmVzZXRJZHhdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdW5peCB0aW1lc3RhbXAgYXMgREQuTU0uWVlZWSBISDpNTVxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWVzdGFtcCAtIFVuaXggdGltZXN0YW1wIGluIHNlY29uZHMuXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIGRhdGUgc3RyaW5nLlxuICAgICAqL1xuICAgIGZvcm1hdERhdGVUaW1lKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBkID0gbmV3IERhdGUodGltZXN0YW1wICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheSA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgbW9udGggPSBTdHJpbmcoZC5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgICAgICAgY29uc3QgeWVhciA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBTdHJpbmcoZC5nZXRIb3VycygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gU3RyaW5nKGQuZ2V0TWludXRlcygpKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgICByZXR1cm4gYCR7ZGF5fS4ke21vbnRofS4ke3llYXJ9ICR7aG91cnN9OiR7bWludXRlc31gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZGF0YSB0YWJsZSBwYWdlIGxlbmd0aFxuICAgICAqXG4gICAgICogQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBjYWxjdWxhdGVQYWdlTGVuZ3RoKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgcm93IGhlaWdodFxuICAgICAgICBsZXQgcm93SGVpZ2h0ID0gZmFpbDJCYW5JbmRleC4kYmFubmVkSXBMaXN0VGFibGUuZmluZCgndHInKS5sYXN0KCkub3V0ZXJIZWlnaHQoKTtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHdpbmRvdyBoZWlnaHQgYW5kIGF2YWlsYWJsZSBzcGFjZSBmb3IgdGFibGVcbiAgICAgICAgY29uc3Qgd2luZG93SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgICAgICBjb25zdCBoZWFkZXJGb290ZXJIZWlnaHQgPSA0MDA7IC8vIEVzdGltYXRlIGhlaWdodCBmb3IgaGVhZGVyLCBmb290ZXIsIGFuZCBvdGhlciBlbGVtZW50c1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBuZXcgcGFnZSBsZW5ndGhcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KE1hdGguZmxvb3IoKHdpbmRvd0hlaWdodCAtIGhlYWRlckZvb3RlckhlaWdodCkgLyByb3dIZWlnaHQpLCAxMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZGltbWVyIHdpdGggbG9hZGVyIG9uIHRoZSBiYW5uZWQgSVBzIHRhYiBzZWdtZW50XG4gICAgICovXG4gICAgc2hvd0Jhbm5lZExpc3RMb2FkZXIoKSB7XG4gICAgICAgIGlmICghZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmZpbmQoJz4gLnVpLmRpbW1lcicpLmxlbmd0aCkge1xuICAgICAgICAgICAgZmFpbDJCYW5JbmRleC4kYmFubmVkSXBUYWJTZWdtZW50LmFwcGVuZChcbiAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgZGltbWVyIG9uIHRoZSBiYW5uZWQgSVBzIHRhYiBzZWdtZW50XG4gICAgICovXG4gICAgaGlkZUJhbm5lZExpc3RMb2FkZXIoKSB7XG4gICAgICAgIGZhaWwyQmFuSW5kZXguJGJhbm5lZElwVGFiU2VnbWVudC5maW5kKCc+IC51aS5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGZhaWwyQmFuSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZhaWwyQmFuSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZmFpbDJCYW5JbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZhaWwyQmFuSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogRmFpbDJCYW5BUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIEZhaWwyQmFuIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZhaWwyQmFuSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=