"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, firewallTooltips, FirewallAPI, UserMessage, SecurityUtils, SemanticLocalization, $ */

/**
 * The `firewallTable` object contains methods and variables for managing the Firewall system.
 *
 * @module firewallTable
 */
var firewallTable = {
  // jQuery elements (will be initialized after DOM creation)
  $statusToggle: null,
  $addNewButton: null,
  $settings: null,
  $container: null,
  // Data from API
  firewallData: null,
  permissions: {
    status: true,
    modify: true,
    "delete": true
  },
  // This method initializes the Firewall management interface.
  initialize: function initialize() {
    // Get container
    firewallTable.$container = $('#firewall-content'); // Load firewall data from REST API

    firewallTable.loadFirewallData();
  },

  /**
   * Load firewall data from REST API
   */
  loadFirewallData: function loadFirewallData() {
    // Show loading state
    firewallTable.$container.addClass('loading');
    FirewallAPI.getList(function (response) {
      firewallTable.$container.removeClass('loading');

      if (!response || !response.result) {
        UserMessage.showError(globalTranslate.fw_ErrorLoadingData);
        return;
      } // Store data


      firewallTable.firewallData = response.data; // Build the interface

      firewallTable.buildInterface(response.data);
    });
  },

  /**
   * Build complete interface from API data
   * @param {Object} data - Firewall data from API
   */
  buildInterface: function buildInterface(data) {
    // Clear container
    firewallTable.$container.empty(); // Build status toggle

    var statusHtml = firewallTable.buildStatusToggle(data.firewallEnabled === '1');
    firewallTable.$container.append(statusHtml); // Build settings section

    var settingsHtml = firewallTable.buildSettingsSection(data);
    firewallTable.$container.append(settingsHtml); // Cache jQuery elements

    firewallTable.$statusToggle = $('#status-toggle');
    firewallTable.$addNewButton = $('#add-new-button');
    firewallTable.$settings = $('#firewall-settings'); // Initialize all UI elements

    firewallTable.initializeUIElements(data);
  },

  /**
   * Build status toggle HTML
   * @param {boolean} enabled - Whether firewall is enabled
   * @returns {string} HTML string
   */
  buildStatusToggle: function buildStatusToggle(enabled) {
    var statusClass = firewallTable.permissions.status ? '' : 'disabled';
    var labelText = enabled ? globalTranslate.fw_StatusEnabled : globalTranslate.fw_StatusDisabled;
    var checked = enabled ? 'checked' : '';
    return "\n            <div class=\"ui segment\">\n                <div class=\"ui toggle checkbox ".concat(statusClass, "\" id=\"status-toggle\">\n                    <input type=\"checkbox\" name=\"status\" id=\"status\" ").concat(checked, "/>\n                    <label>").concat(labelText, "</label>\n                </div>\n            </div>\n        ");
  },

  /**
   * Build settings section with table
   * @param {Object} data - Firewall data from API
   * @returns {string} HTML string
   */
  buildSettingsSection: function buildSettingsSection(data) {
    var html = '<div class="ui basic segment" id="firewall-settings">'; // Docker notice if applicable

    if (data.isDocker) {
      html += firewallTable.buildDockerNotice();
    } // Add new rule button


    if (firewallTable.permissions.modify) {
      html += "<a href=\"".concat(globalRootUrl, "firewall/modify\" class=\"ui blue button\" id=\"add-new-button\">");
      html += "<i class=\"add icon\"></i> ".concat(globalTranslate.fw_AddNewRule, "</a>"); // "Allow my current IP" helper button (only when client IP is public AND not yet covered by a host rule)

      html += firewallTable.buildAllowMyIpButton(data);
    } // Build firewall table


    html += firewallTable.buildFirewallTable(data.items, data);
    html += '</div>'; // Add service port info script

    html += firewallTable.buildServiceInfoScript(data);
    return html;
  },

  /**
   * Build "Allow my current IP" helper button.
   * Rendered next to #add-new-button only if the backend reports a public client IP
   * and no existing rule already covers it as a host (/32 for IPv4, /128 for IPv6).
   *
   * @param {Object} data - Firewall data from API
   * @returns {string} HTML string (empty if conditions not met)
   */
  buildAllowMyIpButton: function buildAllowMyIpButton(data) {
    var clientIp = data.clientIp || '';

    if (!clientIp || data.clientIpRuleId) {
      return '';
    } // Backend already restricts clientIp to a public IPv4 literal — /32 is the only host mask.


    var ruleName = globalTranslate.fw_MyCurrentIpRuleName || 'My current IP';
    var url = "".concat(globalRootUrl, "firewall/modify/") + "?network=".concat(encodeURIComponent(clientIp)) + "&subnet=32" + "&ruleName=".concat(encodeURIComponent(ruleName));
    return "\n            <a href=\"".concat(url, "\" class=\"ui green button\" id=\"allow-my-ip-button\">\n                <i class=\"shield alternate icon\"></i>\n                ").concat(SecurityUtils.escapeHtml(globalTranslate.fw_AllowMyIpButton), " (").concat(clientIp, ")\n            </a>\n        ");
  },

  /**
   * Build Docker environment notice
   * @returns {string} HTML string
   */
  buildDockerNotice: function buildDockerNotice() {
    return "\n            <div class=\"ui info icon message\">\n                <i class=\"info circle icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">".concat(SecurityUtils.escapeHtml(globalTranslate.fw_DockerEnvironmentNotice), "</div>\n                    <p>").concat(SecurityUtils.escapeHtml(globalTranslate.fw_DockerLimitedServicesInfo), "</p>\n                </div>\n            </div>\n        ");
  },

  /**
   * Build firewall rules table
   * @param {Array} rules - Array of firewall rules
   * @param {Object} data - Complete data object with metadata
   * @returns {string} HTML string
   */
  buildFirewallTable: function buildFirewallTable(rules, data) {
    if (!rules || rules.length === 0) {
      return '<div class="ui message">' + SecurityUtils.escapeHtml(globalTranslate.fw_NoRulesConfigured) + '</div>';
    }

    var html = '<table class="ui selectable very basic compact unstackable table" id="firewall-table">'; // Build header

    html += '<thead><tr><th class="collapsing"></th><th></th>'; // Get categories from first rule

    var categories = Object.keys(rules[0].rules || {});
    categories.forEach(function (category) {
      var categoryData = rules[0].rules[category];
      var isLimited = data.isDocker && !data.dockerSupportedServices.includes(categoryData.name);
      var limitedClass = isLimited ? 'docker-limited' : '';
      html += "<th width=\"20px\" class=\"firewall-category ".concat(limitedClass, "\">");
      html += "<div><span>".concat(SecurityUtils.escapeHtml(categoryData.name), "</span></div>");
      html += '</th>';
    });
    html += '<th></th></tr></thead>'; // Build body

    html += '<tbody>';
    rules.forEach(function (rule) {
      html += firewallTable.buildRuleRow(rule, categories, data);
    });
    html += '</tbody></table>';
    return html;
  },

  /**
   * Build single rule row
   * @param {Object} rule - Rule data
   * @param {Array} categories - Category keys
   * @param {Object} data - Complete data object
   * @returns {string} HTML string
   */
  buildRuleRow: function buildRuleRow(rule, categories, data) {
    var priority = rule.priority !== undefined ? rule.priority : 0;
    var permit = "".concat(rule.network, "/").concat(rule.subnet);
    var isCatchAll = permit === '0.0.0.0/0' || permit === '::/0';
    var noDragClass = isCatchAll ? ' nodrag nodrop' : '';
    var clientIpClass = rule.isClientIp ? ' client-ip-rule' : '';
    var html = "<tr class=\"rule-row".concat(noDragClass).concat(clientIpClass, "\" id=\"").concat(rule.id || '', "\" data-value=\"").concat(priority, "\">"); // Drag handle cell — empty for catch-all rules (not draggable)

    if (isCatchAll) {
      html += '<td class="collapsing"></td>';
    } else {
      html += '<td class="collapsing dragHandle"><i class="sort grey icon"></i></td>';
    } // Network and description cell


    html += '<td>';

    if (rule.isClientIp) {
      var hint = SecurityUtils.escapeHtml(globalTranslate.fw_ThisIsYourCurrentIpHint);
      html += "<i class=\"user circle blue icon popuped client-ip-hint\" data-content=\"".concat(hint, "\"></i> ");
    } // rule.description is admin-controlled and stored in the DB without HTML stripping —
    // escape it (and rule.network for symmetry) before injecting into the table.


    html += "".concat(SecurityUtils.escapeHtml(rule.network), " - ").concat(SecurityUtils.escapeHtml(rule.description));

    if (!rule.id) {
      html += "<br><span class=\"features\">".concat(SecurityUtils.escapeHtml(globalTranslate.fw_NeedConfigureRule), "</span>");
    }

    html += '</td>'; // Category cells

    categories.forEach(function (category) {
      var categoryRule = rule.rules[category];

      if (!categoryRule) {
        html += '<td></td>';
        return;
      }

      var isLimited = data.isDocker && !data.dockerSupportedServices.includes(categoryRule.name);
      var limitedClass = isLimited ? 'docker-limited' : '';
      var action = categoryRule.action ? 'allow' : 'block';
      html += "<td class=\"center aligned marks ".concat(limitedClass, "\" data-action=\"").concat(action, "\" data-network=\"").concat(SecurityUtils.escapeHtml(rule.network), "\">");
      html += '<i class="icons">';

      if (action === 'allow') {
        html += '<i class="icon checkmark green" data-value="on"></i>';
      } else if (data.firewallEnabled === '1') {
        if (isLimited) {
          // Show as disabled firewall for blocked limited services in Docker
          html += '<i class="icon checkmark green" data-value="off"></i>';
          html += '<i class="icon corner close red"></i>';
        } else {
          html += '<i class="icon close red" data-value="off"></i>';
          html += '<i class="icon corner close red" style="display: none;"></i>';
        }
      } else {
        html += '<i class="icon checkmark green" data-value="off"></i>';
        html += '<i class="icon corner close red"></i>';
      }

      html += '</i></td>';
    }); // Action buttons cell

    html += '<td class="right aligned collapsing">';
    html += '<div class="ui small basic icon buttons">';

    if (!rule.id) {
      // New rule - use link with URL parameters instead of form
      // Extract network and subnet from rule.network (e.g., "0.0.0.0/0" -> network=0.0.0.0&subnet=0)
      var networkParts = rule.network.split('/');
      var network = networkParts[0] || '';
      var subnet = networkParts[1] || '0';
      var ruleName = rule.description || '';
      var modifyClass = firewallTable.permissions.modify ? '' : 'disabled';
      var prefillUrl = "".concat(globalRootUrl, "firewall/modify/?network=").concat(encodeURIComponent(network), "&subnet=").concat(encodeURIComponent(subnet), "&ruleName=").concat(encodeURIComponent(ruleName));
      html += "<a href=\"".concat(prefillUrl, "\" class=\"ui icon basic mini button ").concat(modifyClass, "\">");
      html += '<i class="icon edit blue"></i></a>';
      html += '<a href="#" class="ui disabled button"><i class="icon trash red"></i></a>';
    } else {
      // Existing rule buttons
      var _modifyClass = firewallTable.permissions.modify ? '' : 'disabled';

      html += "<a href=\"".concat(globalRootUrl, "firewall/modify/").concat(rule.id, "\" ");
      html += "class=\"ui button edit popuped ".concat(_modifyClass, "\" ");
      html += "data-content=\"".concat(SecurityUtils.escapeHtml(globalTranslate.bt_ToolTipEdit), "\">");
      html += '<i class="icon edit blue"></i></a>';

      if (rule.permanent) {
        html += "<a href=\"#\" class=\"ui disabled button\"><i class=\"icon trash red\"></i></a>";
      } else {
        var deleteClass = firewallTable.permissions["delete"] ? '' : 'disabled';
        html += "<a href=\"#\" ";
        html += "class=\"ui button delete two-steps-delete popuped ".concat(deleteClass, "\" ");
        html += "data-value=\"".concat(rule.id, "\" ");
        html += "data-content=\"".concat(SecurityUtils.escapeHtml(globalTranslate.bt_ToolTipDelete), "\">");
        html += '<i class="icon trash red"></i></a>';
      }
    }

    html += '</div></td></tr>';
    return html;
  },

  /**
   * Build service info script tag
   * @param {Object} data - Firewall data
   * @returns {string} HTML string
   */
  buildServiceInfoScript: function buildServiceInfoScript(data) {
    // Collect port information from rules
    var servicePortInfo = {};
    var serviceNameMapping = {};

    if (data.items && data.items.length > 0) {
      var firstRule = data.items[0];
      Object.keys(firstRule.rules || {}).forEach(function (category) {
        var rule = firstRule.rules[category];
        servicePortInfo[category] = rule.ports || [];
        serviceNameMapping[rule.name] = category;
      });
    }

    return "\n            <script>\n                window.servicePortInfo = ".concat(JSON.stringify(servicePortInfo), ";\n                window.serviceNameMapping = ").concat(JSON.stringify(serviceNameMapping), ";\n                window.isDocker = ").concat(data.isDocker ? 'true' : 'false', ";\n            </script>\n        ");
  },

  /**
   * Initialize all UI elements after DOM creation
   * @param {Object} data - Firewall data for context
   */
  initializeUIElements: function initializeUIElements(data) {
    // Initialize drag-and-drop reordering for priority
    $('#firewall-table tbody').tableDnD({
      onDrop: firewallTable.cbOnDrop,
      onDragClass: 'hoveringRow',
      dragHandle: '.dragHandle'
    }); // Re-bind double-click handler for dynamically created rows
    // Exclude last cell with action buttons to prevent accidental navigation on delete button clicks

    $('.rule-row td:not(:last-child)').off('dblclick').on('dblclick', function (e) {
      var id = $(e.target).closest('tr').attr('id');

      if (id) {
        window.location = "".concat(globalRootUrl, "firewall/modify/").concat(id);
      }
    }); // Let delete-something.js handle the first click, we just prevent default navigation

    $('body').on('click', 'a.delete.two-steps-delete', function (e) {
      e.preventDefault(); // Don't stop propagation - allow delete-something.js to work
    }); // Delete button handler - works with two-steps-delete logic
    // This will be triggered after delete-something.js removes the two-steps-delete class

    $('body').on('click', 'a.delete:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      var $button = $(this);
      var ruleId = $button.attr('data-value'); // Add loading state

      $button.addClass('loading disabled');
      FirewallAPI.deleteRecord(ruleId, function (response) {
        if (response.result === true) {
          // Reload data to refresh the table
          firewallTable.loadFirewallData();
        } else {
          UserMessage.showMultiString((response === null || response === void 0 ? void 0 : response.messages) || globalTranslate.fw_ErrorDeletingRule);
          $button.removeClass('loading disabled'); // Restore two-steps-delete class if deletion failed

          $button.addClass('two-steps-delete');
          $button.find('i').removeClass('close').addClass('trash');
        }
      });
    }); // Setup checkbox to enable or disable the firewall

    if (firewallTable.$statusToggle) {
      firewallTable.$statusToggle.checkbox({
        onChecked: firewallTable.enableFirewall,
        onUnchecked: firewallTable.disableFirewall
      });
    } // Initialize popups for edit/delete buttons


    $('.popuped').popup(); // Initialize Docker-specific UI elements with data context

    firewallTable.initializeDockerUI(data);
  },
  // Initialize Docker-specific UI elements
  initializeDockerUI: function initializeDockerUI(data) {
    // Check if we have port information
    if (!window.servicePortInfo || !window.serviceNameMapping) {
      return;
    } // Initialize tooltips for all service cells in the table


    $('td.marks').each(function () {
      var $cell = $(this); // Find service name from the header

      var columnIndex = $cell.index();
      var $headerCell = $cell.closest('table').find('thead th').eq(columnIndex);
      var serviceName = $headerCell.find('span').text() || '';

      if (serviceName) {
        // Get the category key from the display name
        var categoryKey = window.serviceNameMapping[serviceName] || serviceName;
        var portInfo = window.servicePortInfo[categoryKey] || [];
        var action = $cell.attr('data-action') || 'allow';
        var network = $cell.attr('data-network') || '';
        var isLimited = $cell.hasClass('docker-limited');
        var isDocker = data ? data.isDocker : window.isDocker; // Generate tooltip content using unified generator

        var tooltipContent = firewallTooltips.generateContent(categoryKey, action, network, isDocker, isLimited, portInfo, isDocker && isLimited // Show copy button for Docker limited services
        ); // Initialize tooltip

        firewallTooltips.initializeTooltip($cell, {
          html: tooltipContent,
          position: 'top center'
        });
      }
    });
  },

  /**
   * Callback function triggered when a firewall rule row is dropped after drag
   * Sends updated priorities to the API
   */
  cbOnDrop: function cbOnDrop() {
    var priorityWasChanged = false;
    var priorityData = {};
    $('#firewall-table tbody tr').each(function (index, obj) {
      var ruleId = $(obj).attr('id');

      if (!ruleId) {
        return; // Skip rows without ID (unsaved rules)
      }

      var oldPriority = parseInt($(obj).attr('data-value'), 10);
      var newPriority = index + 1;

      if (oldPriority !== newPriority) {
        priorityWasChanged = true;
        priorityData[ruleId] = newPriority;
      }
    });

    if (priorityWasChanged) {
      // Update data-value attributes immediately to reflect new positions
      $('#firewall-table tbody tr').each(function (index, obj) {
        $(obj).attr('data-value', index + 1);
      });
      FirewallAPI.changePriority(priorityData, function (response) {
        if (!response.result) {
          UserMessage.showMultiString(response.messages); // Revert on failure

          firewallTable.loadFirewallData();
        }
      });
    }
  },
  // Enable the firewall by making an HTTP request to the server.
  enableFirewall: function enableFirewall() {
    FirewallAPI.enable(function (response) {
      if (response.result === true) {
        firewallTable.cbAfterEnabled(true);
      } else {
        firewallTable.cbAfterDisabled();

        if (response.messages) {
          UserMessage.showMultiString(response.messages);
        }
      }
    });
  },
  // Disable the firewall by making an HTTP request to the server.
  disableFirewall: function disableFirewall() {
    FirewallAPI.disable(function (response) {
      if (response.result === true) {
        firewallTable.cbAfterDisabled(true);
      } else {
        firewallTable.cbAfterEnabled();

        if (response.messages) {
          UserMessage.showMultiString(response.messages);
        }
      }
    });
  },
  // Callback after the firewall has been enabled.
  cbAfterEnabled: function cbAfterEnabled() {
    var sendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusEnabled);
    firewallTable.$statusToggle.checkbox('set checked'); // For supported services, change green checkmarks to red crosses

    $('td.marks:not(.docker-limited) i.icon.checkmark.green[data-value="off"]').removeClass('checkmark green').addClass('close red'); // For limited services in Docker, keep green checkmark but hide corner close

    $('td.docker-limited i.icon.corner.close').hide(); // For all other services, hide corner close

    $('td.marks:not(.docker-limited) i.icon.corner.close').hide();

    if (sendEvent) {
      var event = document.createEvent('Event');
      event.initEvent('ConfigDataChanged', false, true);
      window.dispatchEvent(event);
    }
  },
  // Callback after the firewall has been disabled.
  cbAfterDisabled: function cbAfterDisabled() {
    var sendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusDisabled);
    firewallTable.$statusToggle.checkbox('set unchecked'); // For all services, change red crosses to green checkmarks

    $('i.icon.close.red[data-value="off"]').removeClass('close red').addClass('checkmark green'); // Show corner close for all services when firewall is disabled

    $('i.icon.corner.close').show();

    if (sendEvent) {
      var event = document.createEvent('Event');
      event.initEvent('ConfigDataChanged', false, true);
      window.dispatchEvent(event);
    }
  }
}; // When the document is ready, initialize the Firewall management interface.

$(document).ready(function () {
  firewallTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsImlzRG9ja2VyIiwiYnVpbGREb2NrZXJOb3RpY2UiLCJnbG9iYWxSb290VXJsIiwiZndfQWRkTmV3UnVsZSIsImJ1aWxkQWxsb3dNeUlwQnV0dG9uIiwiYnVpbGRGaXJld2FsbFRhYmxlIiwiaXRlbXMiLCJidWlsZFNlcnZpY2VJbmZvU2NyaXB0IiwiY2xpZW50SXAiLCJjbGllbnRJcFJ1bGVJZCIsInJ1bGVOYW1lIiwiZndfTXlDdXJyZW50SXBSdWxlTmFtZSIsInVybCIsImVuY29kZVVSSUNvbXBvbmVudCIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwiZndfQWxsb3dNeUlwQnV0dG9uIiwiZndfRG9ja2VyRW52aXJvbm1lbnROb3RpY2UiLCJmd19Eb2NrZXJMaW1pdGVkU2VydmljZXNJbmZvIiwicnVsZXMiLCJsZW5ndGgiLCJmd19Ob1J1bGVzQ29uZmlndXJlZCIsImNhdGVnb3JpZXMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0ZWdvcnlEYXRhIiwiaXNMaW1pdGVkIiwiZG9ja2VyU3VwcG9ydGVkU2VydmljZXMiLCJpbmNsdWRlcyIsIm5hbWUiLCJsaW1pdGVkQ2xhc3MiLCJydWxlIiwiYnVpbGRSdWxlUm93IiwicHJpb3JpdHkiLCJ1bmRlZmluZWQiLCJwZXJtaXQiLCJuZXR3b3JrIiwic3VibmV0IiwiaXNDYXRjaEFsbCIsIm5vRHJhZ0NsYXNzIiwiY2xpZW50SXBDbGFzcyIsImlzQ2xpZW50SXAiLCJpZCIsImhpbnQiLCJmd19UaGlzSXNZb3VyQ3VycmVudElwSGludCIsImRlc2NyaXB0aW9uIiwiZndfTmVlZENvbmZpZ3VyZVJ1bGUiLCJjYXRlZ29yeVJ1bGUiLCJhY3Rpb24iLCJuZXR3b3JrUGFydHMiLCJzcGxpdCIsIm1vZGlmeUNsYXNzIiwicHJlZmlsbFVybCIsImJ0X1Rvb2xUaXBFZGl0IiwicGVybWFuZW50IiwiZGVsZXRlQ2xhc3MiLCJidF9Ub29sVGlwRGVsZXRlIiwic2VydmljZVBvcnRJbmZvIiwic2VydmljZU5hbWVNYXBwaW5nIiwiZmlyc3RSdWxlIiwicG9ydHMiLCJKU09OIiwic3RyaW5naWZ5IiwidGFibGVEbkQiLCJvbkRyb3AiLCJjYk9uRHJvcCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9mZiIsIm9uIiwiZSIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCJydWxlSWQiLCJkZWxldGVSZWNvcmQiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImZ3X0Vycm9yRGVsZXRpbmdSdWxlIiwiZmluZCIsImNoZWNrYm94Iiwib25DaGVja2VkIiwiZW5hYmxlRmlyZXdhbGwiLCJvblVuY2hlY2tlZCIsImRpc2FibGVGaXJld2FsbCIsInBvcHVwIiwiaW5pdGlhbGl6ZURvY2tlclVJIiwiZWFjaCIsIiRjZWxsIiwiY29sdW1uSW5kZXgiLCJpbmRleCIsIiRoZWFkZXJDZWxsIiwiZXEiLCJzZXJ2aWNlTmFtZSIsInRleHQiLCJjYXRlZ29yeUtleSIsInBvcnRJbmZvIiwiaGFzQ2xhc3MiLCJ0b29sdGlwQ29udGVudCIsImZpcmV3YWxsVG9vbHRpcHMiLCJnZW5lcmF0ZUNvbnRlbnQiLCJpbml0aWFsaXplVG9vbHRpcCIsInBvc2l0aW9uIiwicHJpb3JpdHlXYXNDaGFuZ2VkIiwicHJpb3JpdHlEYXRhIiwib2JqIiwib2xkUHJpb3JpdHkiLCJwYXJzZUludCIsIm5ld1ByaW9yaXR5IiwiY2hhbmdlUHJpb3JpdHkiLCJlbmFibGUiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsImRpc2FibGUiLCJzZW5kRXZlbnQiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsInNob3ciLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEI7QUFDQUMsRUFBQUEsYUFBYSxFQUFFLElBRkc7QUFHbEJDLEVBQUFBLGFBQWEsRUFBRSxJQUhHO0FBSWxCQyxFQUFBQSxTQUFTLEVBQUUsSUFKTztBQUtsQkMsRUFBQUEsVUFBVSxFQUFFLElBTE07QUFPbEI7QUFDQUMsRUFBQUEsWUFBWSxFQUFFLElBUkk7QUFTbEJDLEVBQUFBLFdBQVcsRUFBRTtBQUNUQyxJQUFBQSxNQUFNLEVBQUUsSUFEQztBQUVUQyxJQUFBQSxNQUFNLEVBQUUsSUFG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LCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlY3VyaXR5VXRpbHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCAkICovXG5cbi8qKlxuICogVGhlIGBmaXJld2FsbFRhYmxlYCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxUYWJsZVxuICovXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuICAgIC8vIGpRdWVyeSBlbGVtZW50cyAod2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBET00gY3JlYXRpb24pXG4gICAgJHN0YXR1c1RvZ2dsZTogbnVsbCxcbiAgICAkYWRkTmV3QnV0dG9uOiBudWxsLFxuICAgICRzZXR0aW5nczogbnVsbCxcbiAgICAkY29udGFpbmVyOiBudWxsLFxuICAgIFxuICAgIC8vIERhdGEgZnJvbSBBUElcbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG4gICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgc3RhdHVzOiB0cnVlLFxuICAgICAgICBtb2RpZnk6IHRydWUsXG4gICAgICAgIGRlbGV0ZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGaXJld2FsbERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdEYXRhKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIGRhdGFcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuZmlyZXdhbGxEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIGludGVyZmFjZVxuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5idWlsZEludGVyZmFjZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb21wbGV0ZSBpbnRlcmZhY2UgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGJ1aWxkSW50ZXJmYWNlKGRhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgY29udGFpbmVyXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIHRvZ2dsZVxuICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFN0YXR1c1RvZ2dsZShkYXRhLmZpcmV3YWxsRW5hYmxlZCA9PT0gJzEnKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzdGF0dXNIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb25cbiAgICAgICAgY29uc3Qgc2V0dGluZ3NIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFNldHRpbmdzU2VjdGlvbihkYXRhKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzZXR0aW5nc0h0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IGVsZW1lbnRzXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSA9ICQoJyNzdGF0dXMtdG9nZ2xlJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGFkZE5ld0J1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzZXR0aW5ncyA9ICQoJyNmaXJld2FsbC1zZXR0aW5ncycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHNcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplVUlFbGVtZW50cyhkYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHN0YXR1cyB0b2dnbGUgSFRNTFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlZCAtIFdoZXRoZXIgZmlyZXdhbGwgaXMgZW5hYmxlZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTdGF0dXNUb2dnbGUoZW5hYmxlZCkge1xuICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuc3RhdHVzID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICBjb25zdCBsYWJlbFRleHQgPSBlbmFibGVkID8gZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQgOiBnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQ7XG4gICAgICAgIGNvbnN0IGNoZWNrZWQgPSBlbmFibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94ICR7c3RhdHVzQ2xhc3N9XCIgaWQ9XCJzdGF0dXMtdG9nZ2xlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwic3RhdHVzXCIgaWQ9XCJzdGF0dXNcIiAke2NoZWNrZWR9Lz5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7bGFiZWxUZXh0fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb24gd2l0aCB0YWJsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXR0aW5nc1NlY3Rpb24oZGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiIGlkPVwiZmlyZXdhbGwtc2V0dGluZ3NcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9ja2VyIG5vdGljZSBpZiBhcHBsaWNhYmxlXG4gICAgICAgIGlmIChkYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGREb2NrZXJOb3RpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBydWxlIGJ1dHRvblxuICAgICAgICBpZiAoZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5XCIgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvblwiIGlkPVwiYWRkLW5ldy1idXR0b25cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJhZGQgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQWRkTmV3UnVsZX08L2E+YDtcblxuICAgICAgICAgICAgLy8gXCJBbGxvdyBteSBjdXJyZW50IElQXCIgaGVscGVyIGJ1dHRvbiAob25seSB3aGVuIGNsaWVudCBJUCBpcyBwdWJsaWMgQU5EIG5vdCB5ZXQgY292ZXJlZCBieSBhIGhvc3QgcnVsZSlcbiAgICAgICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZEFsbG93TXlJcEJ1dHRvbihkYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGZpcmV3YWxsIHRhYmxlXG4gICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZEZpcmV3YWxsVGFibGUoZGF0YS5pdGVtcywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHNlcnZpY2UgcG9ydCBpbmZvIHNjcmlwdFxuICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdChkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgXCJBbGxvdyBteSBjdXJyZW50IElQXCIgaGVscGVyIGJ1dHRvbi5cbiAgICAgKiBSZW5kZXJlZCBuZXh0IHRvICNhZGQtbmV3LWJ1dHRvbiBvbmx5IGlmIHRoZSBiYWNrZW5kIHJlcG9ydHMgYSBwdWJsaWMgY2xpZW50IElQXG4gICAgICogYW5kIG5vIGV4aXN0aW5nIHJ1bGUgYWxyZWFkeSBjb3ZlcnMgaXQgYXMgYSBob3N0ICgvMzIgZm9yIElQdjQsIC8xMjggZm9yIElQdjYpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgKGVtcHR5IGlmIGNvbmRpdGlvbnMgbm90IG1ldClcbiAgICAgKi9cbiAgICBidWlsZEFsbG93TXlJcEJ1dHRvbihkYXRhKSB7XG4gICAgICAgIGNvbnN0IGNsaWVudElwID0gZGF0YS5jbGllbnRJcCB8fCAnJztcbiAgICAgICAgaWYgKCFjbGllbnRJcCB8fCBkYXRhLmNsaWVudElwUnVsZUlkKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCYWNrZW5kIGFscmVhZHkgcmVzdHJpY3RzIGNsaWVudElwIHRvIGEgcHVibGljIElQdjQgbGl0ZXJhbCDigJQgLzMyIGlzIHRoZSBvbmx5IGhvc3QgbWFzay5cbiAgICAgICAgY29uc3QgcnVsZU5hbWUgPSBnbG9iYWxUcmFuc2xhdGUuZndfTXlDdXJyZW50SXBSdWxlTmFtZSB8fCAnTXkgY3VycmVudCBJUCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5L2BcbiAgICAgICAgICAgICsgYD9uZXR3b3JrPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNsaWVudElwKX1gXG4gICAgICAgICAgICArIGAmc3VibmV0PTMyYFxuICAgICAgICAgICAgKyBgJnJ1bGVOYW1lPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJ1bGVOYW1lKX1gO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8YSBocmVmPVwiJHt1cmx9XCIgY2xhc3M9XCJ1aSBncmVlbiBidXR0b25cIiBpZD1cImFsbG93LW15LWlwLWJ1dHRvblwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2hpZWxkIGFsdGVybmF0ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19BbGxvd015SXBCdXR0b24pfSAoJHtjbGllbnRJcH0pXG4gICAgICAgICAgICA8L2E+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIERvY2tlciBlbnZpcm9ubWVudCBub3RpY2VcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkRG9ja2VyTm90aWNlKCkge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gaWNvbiBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfRG9ja2VyRW52aXJvbm1lbnROb3RpY2UpfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfRG9ja2VyTGltaXRlZFNlcnZpY2VzSW5mbyl9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBmaXJld2FsbCBydWxlcyB0YWJsZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJ1bGVzIC0gQXJyYXkgb2YgZmlyZXdhbGwgcnVsZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIENvbXBsZXRlIGRhdGEgb2JqZWN0IHdpdGggbWV0YWRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkRmlyZXdhbGxUYWJsZShydWxlcywgZGF0YSkge1xuICAgICAgICBpZiAoIXJ1bGVzIHx8IHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPicgKyBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X05vUnVsZXNDb25maWd1cmVkKSArICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICc8dGFibGUgY2xhc3M9XCJ1aSBzZWxlY3RhYmxlIHZlcnkgYmFzaWMgY29tcGFjdCB1bnN0YWNrYWJsZSB0YWJsZVwiIGlkPVwiZmlyZXdhbGwtdGFibGVcIj4nO1xuXG4gICAgICAgIC8vIEJ1aWxkIGhlYWRlclxuICAgICAgICBodG1sICs9ICc8dGhlYWQ+PHRyPjx0aCBjbGFzcz1cImNvbGxhcHNpbmdcIj48L3RoPjx0aD48L3RoPic7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY2F0ZWdvcmllcyBmcm9tIGZpcnN0IHJ1bGVcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IE9iamVjdC5rZXlzKHJ1bGVzWzBdLnJ1bGVzIHx8IHt9KTtcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5RGF0YSA9IHJ1bGVzWzBdLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGRhdGEuaXNEb2NrZXIgJiYgIWRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoY2F0ZWdvcnlEYXRhLm5hbWUpO1xuICAgICAgICAgICAgY29uc3QgbGltaXRlZENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8dGggd2lkdGg9XCIyMHB4XCIgY2xhc3M9XCJmaXJld2FsbC1jYXRlZ29yeSAke2xpbWl0ZWRDbGFzc31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdj48c3Bhbj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjYXRlZ29yeURhdGEubmFtZSl9PC9zcGFuPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8L3RoPic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPHRoPjwvdGg+PC90cj48L3RoZWFkPic7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBib2R5XG4gICAgICAgIGh0bWwgKz0gJzx0Ym9keT4nO1xuICAgICAgICBcbiAgICAgICAgcnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZFJ1bGVSb3cocnVsZSwgY2F0ZWdvcmllcywgZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC90Ym9keT48L3RhYmxlPic7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNpbmdsZSBydWxlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBydWxlIC0gUnVsZSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gY2F0ZWdvcmllcyAtIENhdGVnb3J5IGtleXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIENvbXBsZXRlIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZFJ1bGVSb3cocnVsZSwgY2F0ZWdvcmllcywgZGF0YSkge1xuICAgICAgICBjb25zdCBwcmlvcml0eSA9IHJ1bGUucHJpb3JpdHkgIT09IHVuZGVmaW5lZCA/IHJ1bGUucHJpb3JpdHkgOiAwO1xuICAgICAgICBjb25zdCBwZXJtaXQgPSBgJHtydWxlLm5ldHdvcmt9LyR7cnVsZS5zdWJuZXR9YDtcbiAgICAgICAgY29uc3QgaXNDYXRjaEFsbCA9IChwZXJtaXQgPT09ICcwLjAuMC4wLzAnIHx8IHBlcm1pdCA9PT0gJzo6LzAnKTtcbiAgICAgICAgY29uc3Qgbm9EcmFnQ2xhc3MgPSBpc0NhdGNoQWxsID8gJyBub2RyYWcgbm9kcm9wJyA6ICcnO1xuICAgICAgICBjb25zdCBjbGllbnRJcENsYXNzID0gcnVsZS5pc0NsaWVudElwID8gJyBjbGllbnQtaXAtcnVsZScgOiAnJztcbiAgICAgICAgbGV0IGh0bWwgPSBgPHRyIGNsYXNzPVwicnVsZS1yb3cke25vRHJhZ0NsYXNzfSR7Y2xpZW50SXBDbGFzc31cIiBpZD1cIiR7cnVsZS5pZCB8fCAnJ31cIiBkYXRhLXZhbHVlPVwiJHtwcmlvcml0eX1cIj5gO1xuXG4gICAgICAgIC8vIERyYWcgaGFuZGxlIGNlbGwg4oCUIGVtcHR5IGZvciBjYXRjaC1hbGwgcnVsZXMgKG5vdCBkcmFnZ2FibGUpXG4gICAgICAgIGlmIChpc0NhdGNoQWxsKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dGQgY2xhc3M9XCJjb2xsYXBzaW5nXCI+PC90ZD4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSAnPHRkIGNsYXNzPVwiY29sbGFwc2luZyBkcmFnSGFuZGxlXCI+PGkgY2xhc3M9XCJzb3J0IGdyZXkgaWNvblwiPjwvaT48L3RkPic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIGFuZCBkZXNjcmlwdGlvbiBjZWxsXG4gICAgICAgIGh0bWwgKz0gJzx0ZD4nO1xuICAgICAgICBpZiAocnVsZS5pc0NsaWVudElwKSB7XG4gICAgICAgICAgICBjb25zdCBoaW50ID0gU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19UaGlzSXNZb3VyQ3VycmVudElwSGludCk7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cInVzZXIgY2lyY2xlIGJsdWUgaWNvbiBwb3B1cGVkIGNsaWVudC1pcC1oaW50XCIgZGF0YS1jb250ZW50PVwiJHtoaW50fVwiPjwvaT4gYDtcbiAgICAgICAgfVxuICAgICAgICAvLyBydWxlLmRlc2NyaXB0aW9uIGlzIGFkbWluLWNvbnRyb2xsZWQgYW5kIHN0b3JlZCBpbiB0aGUgREIgd2l0aG91dCBIVE1MIHN0cmlwcGluZyDigJRcbiAgICAgICAgLy8gZXNjYXBlIGl0IChhbmQgcnVsZS5uZXR3b3JrIGZvciBzeW1tZXRyeSkgYmVmb3JlIGluamVjdGluZyBpbnRvIHRoZSB0YWJsZS5cbiAgICAgICAgaHRtbCArPSBgJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocnVsZS5uZXR3b3JrKX0gLSAke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChydWxlLmRlc2NyaXB0aW9uKX1gO1xuICAgICAgICBpZiAoIXJ1bGUuaWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X05lZWRDb25maWd1cmVSdWxlKX08L3NwYW4+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9ICc8L3RkPic7XG4gICAgICAgIFxuICAgICAgICAvLyBDYXRlZ29yeSBjZWxsc1xuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlSdWxlID0gcnVsZS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBpZiAoIWNhdGVnb3J5UnVsZSkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx0ZD48L3RkPic7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBkYXRhLmlzRG9ja2VyICYmICFkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKGNhdGVnb3J5UnVsZS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ZWRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGNhdGVnb3J5UnVsZS5hY3Rpb24gPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgbWFya3MgJHtsaW1pdGVkQ2xhc3N9XCIgZGF0YS1hY3Rpb249XCIke2FjdGlvbn1cIiBkYXRhLW5ldHdvcms9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChydWxlLm5ldHdvcmspfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb25zXCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2FsbG93Jykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib25cIj48L2k+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5maXJld2FsbEVuYWJsZWQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbWl0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBhcyBkaXNhYmxlZCBmaXJld2FsbCBmb3IgYmxvY2tlZCBsaW1pdGVkIHNlcnZpY2VzIGluIERvY2tlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjbG9zZSByZWRcIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjb3JuZXIgY2xvc2UgcmVkXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPjwvaT4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiPjwvaT4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L2k+PC90ZD4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFjdGlvbiBidXR0b25zIGNlbGxcbiAgICAgICAgaHRtbCArPSAnPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9uc1wiPic7XG5cbiAgICAgICAgaWYgKCFydWxlLmlkKSB7XG4gICAgICAgICAgICAvLyBOZXcgcnVsZSAtIHVzZSBsaW5rIHdpdGggVVJMIHBhcmFtZXRlcnMgaW5zdGVhZCBvZiBmb3JtXG4gICAgICAgICAgICAvLyBFeHRyYWN0IG5ldHdvcmsgYW5kIHN1Ym5ldCBmcm9tIHJ1bGUubmV0d29yayAoZS5nLiwgXCIwLjAuMC4wLzBcIiAtPiBuZXR3b3JrPTAuMC4wLjAmc3VibmV0PTApXG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrUGFydHMgPSBydWxlLm5ldHdvcmsuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBuZXR3b3JrUGFydHNbMF0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBzdWJuZXQgPSBuZXR3b3JrUGFydHNbMV0gfHwgJzAnO1xuICAgICAgICAgICAgY29uc3QgcnVsZU5hbWUgPSBydWxlLmRlc2NyaXB0aW9uIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5Q2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLm1vZGlmeSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgIGNvbnN0IHByZWZpbGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8/bmV0d29yaz0ke2VuY29kZVVSSUNvbXBvbmVudChuZXR3b3JrKX0mc3VibmV0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHN1Ym5ldCl9JnJ1bGVOYW1lPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJ1bGVOYW1lKX1gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiR7cHJlZmlsbFVybH1cIiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gJHttb2RpZnlDbGFzc31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT48L2E+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBkaXNhYmxlZCBidXR0b25cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcnVsZSBidXR0b25zXG4gICAgICAgICAgICBjb25zdCBtb2RpZnlDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5ID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtydWxlLmlkfVwiIGA7XG4gICAgICAgICAgICBodG1sICs9IGBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWQgJHttb2RpZnlDbGFzc31cIiBgO1xuICAgICAgICAgICAgaHRtbCArPSBgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0KX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT48L2E+JztcblxuICAgICAgICAgICAgaWYgKHJ1bGUucGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGRpc2FibGVkIGJ1dHRvblwiPjxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUNsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5kZWxldGUgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiNcIiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWQgJHtkZWxldGVDbGFzc31cIiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYGRhdGEtdmFsdWU9XCIke3J1bGUuaWR9XCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSl9XCI+YDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc2VydmljZSBpbmZvIHNjcmlwdCB0YWdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkU2VydmljZUluZm9TY3JpcHQoZGF0YSkge1xuICAgICAgICAvLyBDb2xsZWN0IHBvcnQgaW5mb3JtYXRpb24gZnJvbSBydWxlc1xuICAgICAgICBjb25zdCBzZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgY29uc3Qgc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF0YS5pdGVtcyAmJiBkYXRhLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UnVsZSA9IGRhdGEuaXRlbXNbMF07XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhmaXJzdFJ1bGUucnVsZXMgfHwge30pLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGUgPSBmaXJzdFJ1bGUucnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgIHNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeV0gPSBydWxlLnBvcnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgIHNlcnZpY2VOYW1lTWFwcGluZ1tydWxlLm5hbWVdID0gY2F0ZWdvcnk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxzY3JpcHQ+XG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9ICR7SlNPTi5zdHJpbmdpZnkoc2VydmljZVBvcnRJbmZvKX07XG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9ICR7SlNPTi5zdHJpbmdpZnkoc2VydmljZU5hbWVNYXBwaW5nKX07XG4gICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyID0gJHtkYXRhLmlzRG9ja2VyID8gJ3RydWUnIDogJ2ZhbHNlJ307XG4gICAgICAgICAgICA8L3NjcmlwdD5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIFVJIGVsZW1lbnRzIGFmdGVyIERPTSBjcmVhdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmb3IgY29udGV4dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUVsZW1lbnRzKGRhdGEpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3AgcmVvcmRlcmluZyBmb3IgcHJpb3JpdHlcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXRhYmxlIHRib2R5JykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmaXJld2FsbFRhYmxlLmNiT25Ecm9wLFxuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgZG91YmxlLWNsaWNrIGhhbmRsZXIgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgcm93c1xuICAgICAgICAvLyBFeGNsdWRlIGxhc3QgY2VsbCB3aXRoIGFjdGlvbiBidXR0b25zIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBuYXZpZ2F0aW9uIG9uIGRlbGV0ZSBidXR0b24gY2xpY2tzXG4gICAgICAgICQoJy5ydWxlLXJvdyB0ZDpub3QoOmxhc3QtY2hpbGQpJykub2ZmKCdkYmxjbGljaycpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5LyR7aWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMZXQgZGVsZXRlLXNvbWV0aGluZy5qcyBoYW5kbGUgdGhlIGZpcnN0IGNsaWNrLCB3ZSBqdXN0IHByZXZlbnQgZGVmYXVsdCBuYXZpZ2F0aW9uXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGUudHdvLXN0ZXBzLWRlbGV0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIC8vIERvbid0IHN0b3AgcHJvcGFnYXRpb24gLSBhbGxvdyBkZWxldGUtc29tZXRoaW5nLmpzIHRvIHdvcmtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgLSB3b3JrcyB3aXRoIHR3by1zdGVwcy1kZWxldGUgbG9naWNcbiAgICAgICAgLy8gVGhpcyB3aWxsIGJlIHRyaWdnZXJlZCBhZnRlciBkZWxldGUtc29tZXRoaW5nLmpzIHJlbW92ZXMgdGhlIHR3by1zdGVwcy1kZWxldGUgY2xhc3NcbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBydWxlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuZGVsZXRlUmVjb3JkKHJ1bGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byByZWZyZXNoIHRoZSB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2U/Lm1lc3NhZ2VzIHx8IGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckRlbGV0aW5nUnVsZSk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlmIGRlbGV0aW9uIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXR1cCBjaGVja2JveCB0byBlbmFibGUgb3IgZGlzYWJsZSB0aGUgZmlyZXdhbGxcbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSkge1xuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlXG4gICAgICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICAgICAgb25DaGVja2VkOiBmaXJld2FsbFRhYmxlLmVuYWJsZUZpcmV3YWxsLFxuICAgICAgICAgICAgICAgICAgICBvblVuY2hlY2tlZDogZmlyZXdhbGxUYWJsZS5kaXNhYmxlRmlyZXdhbGwsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBlZGl0L2RlbGV0ZSBidXR0b25zXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRG9ja2VyLXNwZWNpZmljIFVJIGVsZW1lbnRzIHdpdGggZGF0YSBjb250ZXh0XG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZURvY2tlclVJKGRhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLy8gSW5pdGlhbGl6ZSBEb2NrZXItc3BlY2lmaWMgVUkgZWxlbWVudHNcbiAgICBpbml0aWFsaXplRG9ja2VyVUkoZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIHBvcnQgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKCF3aW5kb3cuc2VydmljZVBvcnRJbmZvIHx8ICF3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFsbCBzZXJ2aWNlIGNlbGxzIGluIHRoZSB0YWJsZVxuICAgICAgICAkKCd0ZC5tYXJrcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgc2VydmljZSBuYW1lIGZyb20gdGhlIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgY29sdW1uSW5kZXggPSAkY2VsbC5pbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlckNlbGwgPSAkY2VsbC5jbG9zZXN0KCd0YWJsZScpLmZpbmQoJ3RoZWFkIHRoJykuZXEoY29sdW1uSW5kZXgpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZU5hbWUgPSAkaGVhZGVyQ2VsbC5maW5kKCdzcGFuJykudGV4dCgpIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VydmljZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGNhdGVnb3J5IGtleSBmcm9tIHRoZSBkaXNwbGF5IG5hbWVcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9IHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2VydmljZU5hbWVdIHx8IHNlcnZpY2VOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeUtleV0gfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNlbGwuYXR0cignZGF0YS1hY3Rpb24nKSB8fCAnYWxsb3cnO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSAkY2VsbC5hdHRyKCdkYXRhLW5ldHdvcmsnKSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkY2VsbC5oYXNDbGFzcygnZG9ja2VyLWxpbWl0ZWQnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0RvY2tlciA9IGRhdGEgPyBkYXRhLmlzRG9ja2VyIDogd2luZG93LmlzRG9ja2VyO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCB1c2luZyB1bmlmaWVkIGdlbmVyYXRvclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5S2V5LFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzRG9ja2VyLFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLFxuICAgICAgICAgICAgICAgICAgICBpc0RvY2tlciAmJiBpc0xpbWl0ZWQgLy8gU2hvdyBjb3B5IGJ1dHRvbiBmb3IgRG9ja2VyIGxpbWl0ZWQgc2VydmljZXNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGNlbGwsIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIGEgZmlyZXdhbGwgcnVsZSByb3cgaXMgZHJvcHBlZCBhZnRlciBkcmFnXG4gICAgICogU2VuZHMgdXBkYXRlZCBwcmlvcml0aWVzIHRvIHRoZSBBUElcbiAgICAgKi9cbiAgICBjYk9uRHJvcCgpIHtcbiAgICAgICAgbGV0IHByaW9yaXR5V2FzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBwcmlvcml0eURhdGEgPSB7fTtcblxuICAgICAgICAkKCcjZmlyZXdhbGwtdGFibGUgdGJvZHkgdHInKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBydWxlSWQgPSAkKG9iaikuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICghcnVsZUlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBTa2lwIHJvd3Mgd2l0aG91dCBJRCAodW5zYXZlZCBydWxlcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG9sZFByaW9yaXR5ID0gcGFyc2VJbnQoJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSwgMTApO1xuICAgICAgICAgICAgY29uc3QgbmV3UHJpb3JpdHkgPSBpbmRleCArIDE7XG5cbiAgICAgICAgICAgIGlmIChvbGRQcmlvcml0eSAhPT0gbmV3UHJpb3JpdHkpIHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eVdhc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHByaW9yaXR5RGF0YVtydWxlSWRdID0gbmV3UHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChwcmlvcml0eVdhc0NoYW5nZWQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkYXRhLXZhbHVlIGF0dHJpYnV0ZXMgaW1tZWRpYXRlbHkgdG8gcmVmbGVjdCBuZXcgcG9zaXRpb25zXG4gICAgICAgICAgICAkKCcjZmlyZXdhbGwtdGFibGUgdGJvZHkgdHInKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnLCBpbmRleCArIDEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLmNoYW5nZVByaW9yaXR5KHByaW9yaXR5RGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV2ZXJ0IG9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gRW5hYmxlIHRoZSBmaXJld2FsbCBieSBtYWtpbmcgYW4gSFRUUCByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIuXG4gICAgZW5hYmxlRmlyZXdhbGwoKSB7XG4gICAgICAgIEZpcmV3YWxsQVBJLmVuYWJsZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIERpc2FibGUgdGhlIGZpcmV3YWxsIGJ5IG1ha2luZyBhbiBIVFRQIHJlcXVlc3QgdG8gdGhlIHNlcnZlci5cbiAgICBkaXNhYmxlRmlyZXdhbGwoKSB7XG4gICAgICAgIEZpcmV3YWxsQVBJLmRpc2FibGUoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRGlzYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBDYWxsYmFjayBhZnRlciB0aGUgZmlyZXdhbGwgaGFzIGJlZW4gZW5hYmxlZC5cbiAgICBjYkFmdGVyRW5hYmxlZChzZW5kRXZlbnQgPSBmYWxzZSkge1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuZmluZCgnbGFiZWwnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNFbmFibGVkKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHN1cHBvcnRlZCBzZXJ2aWNlcywgY2hhbmdlIGdyZWVuIGNoZWNrbWFya3MgdG8gcmVkIGNyb3NzZXNcbiAgICAgICAgJCgndGQubWFya3M6bm90KC5kb2NrZXItbGltaXRlZCkgaS5pY29uLmNoZWNrbWFyay5ncmVlbltkYXRhLXZhbHVlPVwib2ZmXCJdJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2hlY2ttYXJrIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY2xvc2UgcmVkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgbGltaXRlZCBzZXJ2aWNlcyBpbiBEb2NrZXIsIGtlZXAgZ3JlZW4gY2hlY2ttYXJrIGJ1dCBoaWRlIGNvcm5lciBjbG9zZVxuICAgICAgICAkKCd0ZC5kb2NrZXItbGltaXRlZCBpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGFsbCBvdGhlciBzZXJ2aWNlcywgaGlkZSBjb3JuZXIgY2xvc2VcbiAgICAgICAgJCgndGQubWFya3M6bm90KC5kb2NrZXItbGltaXRlZCkgaS5pY29uLmNvcm5lci5jbG9zZScpLmhpZGUoKTtcblxuICAgICAgICBpZiAoc2VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBDYWxsYmFjayBhZnRlciB0aGUgZmlyZXdhbGwgaGFzIGJlZW4gZGlzYWJsZWQuXG4gICAgY2JBZnRlckRpc2FibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0Rpc2FibGVkKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgYWxsIHNlcnZpY2VzLCBjaGFuZ2UgcmVkIGNyb3NzZXMgdG8gZ3JlZW4gY2hlY2ttYXJrc1xuICAgICAgICAkKCdpLmljb24uY2xvc2UucmVkW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZSByZWQnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjaGVja21hcmsgZ3JlZW4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgY29ybmVyIGNsb3NlIGZvciBhbGwgc2VydmljZXMgd2hlbiBmaXJld2FsbCBpcyBkaXNhYmxlZFxuICAgICAgICAkKCdpLmljb24uY29ybmVyLmNsb3NlJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNlbmRFdmVudCkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIEZpcmV3YWxsIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7Il19