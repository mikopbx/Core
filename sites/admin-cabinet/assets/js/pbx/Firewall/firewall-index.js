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

/* global globalRootUrl, globalTranslate, firewallTooltips, FirewallAPI, UserMessage, SemanticLocalization */

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
      html += "<i class=\"add icon\"></i> ".concat(globalTranslate.fw_AddNewRule, "</a>");
    } // Build firewall table


    html += firewallTable.buildFirewallTable(data.items, data);
    html += '</div>'; // Add service port info script

    html += firewallTable.buildServiceInfoScript(data);
    return html;
  },

  /**
   * Build Docker environment notice
   * @returns {string} HTML string
   */
  buildDockerNotice: function buildDockerNotice() {
    return "\n            <div class=\"ui info icon message\">\n                <i class=\"info circle icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">".concat(globalTranslate.fw_DockerEnvironmentNotice, "</div>\n                    <p>").concat(globalTranslate.fw_DockerLimitedServicesInfo, "</p>\n                </div>\n            </div>\n        ");
  },

  /**
   * Build firewall rules table
   * @param {Array} rules - Array of firewall rules
   * @param {Object} data - Complete data object with metadata
   * @returns {string} HTML string
   */
  buildFirewallTable: function buildFirewallTable(rules, data) {
    if (!rules || rules.length === 0) {
      return '<div class="ui message">' + globalTranslate.fw_NoRulesConfigured + '</div>';
    }

    var html = '<table class="ui selectable very basic compact unstackable table" id="firewall-table">'; // Build header

    html += '<thead><tr><th></th>'; // Get categories from first rule

    var categories = Object.keys(rules[0].rules || {});
    categories.forEach(function (category) {
      var categoryData = rules[0].rules[category];
      var isLimited = data.isDocker && !data.dockerSupportedServices.includes(categoryData.name);
      var limitedClass = isLimited ? 'docker-limited' : '';
      html += "<th width=\"20px\" class=\"firewall-category ".concat(limitedClass, "\">");
      html += "<div><span>".concat(categoryData.name, "</span></div>");
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
    var html = "<tr class=\"rule-row\" id=\"".concat(rule.id || '', "\">"); // Network and description cell

    html += '<td>';
    html += "".concat(rule.network, " - ").concat(rule.description);

    if (!rule.id) {
      html += "<br><span class=\"features\">".concat(globalTranslate.fw_NeedConfigureRule, "</span>");
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
      html += "<td class=\"center aligned marks ".concat(limitedClass, "\" data-action=\"").concat(action, "\" data-network=\"").concat(rule.network, "\">");
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
      html += "data-content=\"".concat(globalTranslate.bt_ToolTipEdit, "\">");
      html += '<i class="icon edit blue"></i></a>';

      if (rule.permanent) {
        html += "<a href=\"#\" class=\"ui disabled button\"><i class=\"icon trash red\"></i></a>";
      } else {
        var deleteClass = firewallTable.permissions["delete"] ? '' : 'disabled';
        html += "<a href=\"#\" ";
        html += "class=\"ui button delete two-steps-delete popuped ".concat(deleteClass, "\" ");
        html += "data-value=\"".concat(rule.id, "\" ");
        html += "data-content=\"".concat(globalTranslate.bt_ToolTipDelete, "\">");
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
    // Re-bind double-click handler for dynamically created rows
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsImlzRG9ja2VyIiwiYnVpbGREb2NrZXJOb3RpY2UiLCJnbG9iYWxSb290VXJsIiwiZndfQWRkTmV3UnVsZSIsImJ1aWxkRmlyZXdhbGxUYWJsZSIsIml0ZW1zIiwiYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdCIsImZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlIiwiZndfRG9ja2VyTGltaXRlZFNlcnZpY2VzSW5mbyIsInJ1bGVzIiwibGVuZ3RoIiwiZndfTm9SdWxlc0NvbmZpZ3VyZWQiLCJjYXRlZ29yaWVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsImNhdGVnb3J5RGF0YSIsImlzTGltaXRlZCIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiaW5jbHVkZXMiLCJuYW1lIiwibGltaXRlZENsYXNzIiwicnVsZSIsImJ1aWxkUnVsZVJvdyIsImlkIiwibmV0d29yayIsImRlc2NyaXB0aW9uIiwiZndfTmVlZENvbmZpZ3VyZVJ1bGUiLCJjYXRlZ29yeVJ1bGUiLCJhY3Rpb24iLCJuZXR3b3JrUGFydHMiLCJzcGxpdCIsInN1Ym5ldCIsInJ1bGVOYW1lIiwibW9kaWZ5Q2xhc3MiLCJwcmVmaWxsVXJsIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiYnRfVG9vbFRpcEVkaXQiLCJwZXJtYW5lbnQiLCJkZWxldGVDbGFzcyIsImJ0X1Rvb2xUaXBEZWxldGUiLCJzZXJ2aWNlUG9ydEluZm8iLCJzZXJ2aWNlTmFtZU1hcHBpbmciLCJmaXJzdFJ1bGUiLCJwb3J0cyIsIkpTT04iLCJzdHJpbmdpZnkiLCJvZmYiLCJvbiIsImUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiYXR0ciIsIndpbmRvdyIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwicnVsZUlkIiwiZGVsZXRlUmVjb3JkIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJmd19FcnJvckRlbGV0aW5nUnVsZSIsImZpbmQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJwb3B1cCIsImluaXRpYWxpemVEb2NrZXJVSSIsImVhY2giLCIkY2VsbCIsImNvbHVtbkluZGV4IiwiaW5kZXgiLCIkaGVhZGVyQ2VsbCIsImVxIiwic2VydmljZU5hbWUiLCJ0ZXh0IiwiY2F0ZWdvcnlLZXkiLCJwb3J0SW5mbyIsImhhc0NsYXNzIiwidG9vbHRpcENvbnRlbnQiLCJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50IiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJwb3NpdGlvbiIsImVuYWJsZSIsImNiQWZ0ZXJFbmFibGVkIiwiY2JBZnRlckRpc2FibGVkIiwiZGlzYWJsZSIsInNlbmRFdmVudCIsImhpZGUiLCJldmVudCIsImRvY3VtZW50IiwiY3JlYXRlRXZlbnQiLCJpbml0RXZlbnQiLCJkaXNwYXRjaEV2ZW50Iiwic2hvdyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQjtBQUNBQyxFQUFBQSxhQUFhLEVBQUUsSUFGRztBQUdsQkMsRUFBQUEsYUFBYSxFQUFFLElBSEc7QUFJbEJDLEVBQUFBLFNBQVMsRUFBRSxJQUpPO0FBS2xCQyxFQUFBQSxVQUFVLEVBQUUsSUFMTTtBQU9sQjtBQUNBQyxFQUFBQSxZQUFZLEVBQUUsSUFSSTtBQVNsQkMsRUFBQUEsV0FBVyxFQUFFO0FBQ1RDLElBQUFBLE1BQU0sRUFBRSxJQURDO0FBRVRDLElBQUFBLE1BQU0sRUFBRSxJQUZDO0FBR1QsY0FBUTtBQUhDLEdBVEs7QUFlbEI7QUFDQUMsRUFBQUEsVUFoQmtCLHdCQWdCTDtBQUNUO0FBQ0FULElBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxHQUEyQk0sQ0FBQyxDQUFDLG1CQUFELENBQTVCLENBRlMsQ0FJVDs7QUFDQVYsSUFBQUEsYUFBYSxDQUFDVyxnQkFBZDtBQUNILEdBdEJpQjs7QUF3QmxCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxnQkEzQmtCLDhCQTJCQztBQUNmO0FBQ0FYLElBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxDQUF5QlEsUUFBekIsQ0FBa0MsU0FBbEM7QUFFQUMsSUFBQUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLFVBQUNDLFFBQUQsRUFBYztBQUM5QmYsTUFBQUEsYUFBYSxDQUFDSSxVQUFkLENBQXlCWSxXQUF6QixDQUFxQyxTQUFyQzs7QUFFQSxVQUFJLENBQUNELFFBQUQsSUFBYSxDQUFDQSxRQUFR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QUkvQjs7QUFDQTdGLElBQUFBLENBQUMsQ0FBQyxvQ0FBRCxDQUFELENBQ0tNLFdBREwsQ0FDaUIsV0FEakIsRUFFS0osUUFGTCxDQUVjLGlCQUZkLEVBTCtCLENBUy9COztBQUNBRixJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QitILElBQXpCOztBQUVBLFFBQUlQLFNBQUosRUFBZTtBQUNYLFVBQU1FLEtBQUssR0FBR0MsUUFBUSxDQUFDQyxXQUFULENBQXFCLE9BQXJCLENBQWQ7QUFDQUYsTUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBMUMsTUFBQUEsTUFBTSxDQUFDMkMsYUFBUCxDQUFxQkosS0FBckI7QUFDSDtBQUNKO0FBNWRpQixDQUF0QixDLENBK2RBOztBQUNBMUgsQ0FBQyxDQUFDMkgsUUFBRCxDQUFELENBQVlLLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFJLEVBQUFBLGFBQWEsQ0FBQ1MsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogVGhlIGBmaXJld2FsbFRhYmxlYCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxUYWJsZVxuICovXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuICAgIC8vIGpRdWVyeSBlbGVtZW50cyAod2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBET00gY3JlYXRpb24pXG4gICAgJHN0YXR1c1RvZ2dsZTogbnVsbCxcbiAgICAkYWRkTmV3QnV0dG9uOiBudWxsLFxuICAgICRzZXR0aW5nczogbnVsbCxcbiAgICAkY29udGFpbmVyOiBudWxsLFxuICAgIFxuICAgIC8vIERhdGEgZnJvbSBBUElcbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG4gICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgc3RhdHVzOiB0cnVlLFxuICAgICAgICBtb2RpZnk6IHRydWUsXG4gICAgICAgIGRlbGV0ZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGaXJld2FsbERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdEYXRhKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIGRhdGFcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuZmlyZXdhbGxEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIGludGVyZmFjZVxuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5idWlsZEludGVyZmFjZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb21wbGV0ZSBpbnRlcmZhY2UgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGJ1aWxkSW50ZXJmYWNlKGRhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgY29udGFpbmVyXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIHRvZ2dsZVxuICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFN0YXR1c1RvZ2dsZShkYXRhLmZpcmV3YWxsRW5hYmxlZCA9PT0gJzEnKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzdGF0dXNIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb25cbiAgICAgICAgY29uc3Qgc2V0dGluZ3NIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFNldHRpbmdzU2VjdGlvbihkYXRhKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzZXR0aW5nc0h0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IGVsZW1lbnRzXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSA9ICQoJyNzdGF0dXMtdG9nZ2xlJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGFkZE5ld0J1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzZXR0aW5ncyA9ICQoJyNmaXJld2FsbC1zZXR0aW5ncycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHNcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplVUlFbGVtZW50cyhkYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHN0YXR1cyB0b2dnbGUgSFRNTFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlZCAtIFdoZXRoZXIgZmlyZXdhbGwgaXMgZW5hYmxlZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTdGF0dXNUb2dnbGUoZW5hYmxlZCkge1xuICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuc3RhdHVzID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICBjb25zdCBsYWJlbFRleHQgPSBlbmFibGVkID8gZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQgOiBnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQ7XG4gICAgICAgIGNvbnN0IGNoZWNrZWQgPSBlbmFibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94ICR7c3RhdHVzQ2xhc3N9XCIgaWQ9XCJzdGF0dXMtdG9nZ2xlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwic3RhdHVzXCIgaWQ9XCJzdGF0dXNcIiAke2NoZWNrZWR9Lz5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7bGFiZWxUZXh0fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb24gd2l0aCB0YWJsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXR0aW5nc1NlY3Rpb24oZGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiIGlkPVwiZmlyZXdhbGwtc2V0dGluZ3NcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9ja2VyIG5vdGljZSBpZiBhcHBsaWNhYmxlXG4gICAgICAgIGlmIChkYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGREb2NrZXJOb3RpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBydWxlIGJ1dHRvblxuICAgICAgICBpZiAoZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5XCIgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvblwiIGlkPVwiYWRkLW5ldy1idXR0b25cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJhZGQgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQWRkTmV3UnVsZX08L2E+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgZmlyZXdhbGwgdGFibGVcbiAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkRmlyZXdhbGxUYWJsZShkYXRhLml0ZW1zLCBkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc2VydmljZSBwb3J0IGluZm8gc2NyaXB0XG4gICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZFNlcnZpY2VJbmZvU2NyaXB0KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBEb2NrZXIgZW52aXJvbm1lbnQgbm90aWNlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZERvY2tlck5vdGljZSgpIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIGljb24gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZndfRG9ja2VyRW52aXJvbm1lbnROb3RpY2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlc0luZm99PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBmaXJld2FsbCBydWxlcyB0YWJsZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJ1bGVzIC0gQXJyYXkgb2YgZmlyZXdhbGwgcnVsZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIENvbXBsZXRlIGRhdGEgb2JqZWN0IHdpdGggbWV0YWRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkRmlyZXdhbGxUYWJsZShydWxlcywgZGF0YSkge1xuICAgICAgICBpZiAoIXJ1bGVzIHx8IHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPicgKyBnbG9iYWxUcmFuc2xhdGUuZndfTm9SdWxlc0NvbmZpZ3VyZWQgKyAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnPHRhYmxlIGNsYXNzPVwidWkgc2VsZWN0YWJsZSB2ZXJ5IGJhc2ljIGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIiBpZD1cImZpcmV3YWxsLXRhYmxlXCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGhlYWRlclxuICAgICAgICBodG1sICs9ICc8dGhlYWQ+PHRyPjx0aD48L3RoPic7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY2F0ZWdvcmllcyBmcm9tIGZpcnN0IHJ1bGVcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IE9iamVjdC5rZXlzKHJ1bGVzWzBdLnJ1bGVzIHx8IHt9KTtcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5RGF0YSA9IHJ1bGVzWzBdLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGRhdGEuaXNEb2NrZXIgJiYgIWRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoY2F0ZWdvcnlEYXRhLm5hbWUpO1xuICAgICAgICAgICAgY29uc3QgbGltaXRlZENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8dGggd2lkdGg9XCIyMHB4XCIgY2xhc3M9XCJmaXJld2FsbC1jYXRlZ29yeSAke2xpbWl0ZWRDbGFzc31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdj48c3Bhbj4ke2NhdGVnb3J5RGF0YS5uYW1lfTwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC90aD4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzx0aD48L3RoPjwvdHI+PC90aGVhZD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYm9keVxuICAgICAgICBodG1sICs9ICc8dGJvZHk+JztcbiAgICAgICAgXG4gICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRSdWxlUm93KHJ1bGUsIGNhdGVnb3JpZXMsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzaW5nbGUgcnVsZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZSAtIFJ1bGUgZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNhdGVnb3JpZXMgLSBDYXRlZ29yeSBrZXlzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDb21wbGV0ZSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRSdWxlUm93KHJ1bGUsIGNhdGVnb3JpZXMsIGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgPHRyIGNsYXNzPVwicnVsZS1yb3dcIiBpZD1cIiR7cnVsZS5pZCB8fCAnJ31cIj5gO1xuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBhbmQgZGVzY3JpcHRpb24gY2VsbFxuICAgICAgICBodG1sICs9ICc8dGQ+JztcbiAgICAgICAgaHRtbCArPSBgJHtydWxlLm5ldHdvcmt9IC0gJHtydWxlLmRlc2NyaXB0aW9ufWA7XG4gICAgICAgIGlmICghcnVsZS5pZCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2dsb2JhbFRyYW5zbGF0ZS5md19OZWVkQ29uZmlndXJlUnVsZX08L3NwYW4+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9ICc8L3RkPic7XG4gICAgICAgIFxuICAgICAgICAvLyBDYXRlZ29yeSBjZWxsc1xuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlSdWxlID0gcnVsZS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBpZiAoIWNhdGVnb3J5UnVsZSkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx0ZD48L3RkPic7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBkYXRhLmlzRG9ja2VyICYmICFkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKGNhdGVnb3J5UnVsZS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ZWRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGNhdGVnb3J5UnVsZS5hY3Rpb24gPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgbWFya3MgJHtsaW1pdGVkQ2xhc3N9XCIgZGF0YS1hY3Rpb249XCIke2FjdGlvbn1cIiBkYXRhLW5ldHdvcms9XCIke3J1bGUubmV0d29ya31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uc1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdhbGxvdycpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9uXCI+PC9pPic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZmlyZXdhbGxFbmFibGVkID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW1pdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgYXMgZGlzYWJsZWQgZmlyZXdhbGwgZm9yIGJsb2NrZWQgbGltaXRlZCBzZXJ2aWNlcyBpbiBEb2NrZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIj48L2k+JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2xvc2UgcmVkXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj48L2k+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIj48L2k+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9pPjwvdGQ+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBY3Rpb24gYnV0dG9ucyBjZWxsXG4gICAgICAgIGh0bWwgKz0gJzx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnNcIj4nO1xuXG4gICAgICAgIGlmICghcnVsZS5pZCkge1xuICAgICAgICAgICAgLy8gTmV3IHJ1bGUgLSB1c2UgbGluayB3aXRoIFVSTCBwYXJhbWV0ZXJzIGluc3RlYWQgb2YgZm9ybVxuICAgICAgICAgICAgLy8gRXh0cmFjdCBuZXR3b3JrIGFuZCBzdWJuZXQgZnJvbSBydWxlLm5ldHdvcmsgKGUuZy4sIFwiMC4wLjAuMC8wXCIgLT4gbmV0d29yaz0wLjAuMC4wJnN1Ym5ldD0wKVxuICAgICAgICAgICAgY29uc3QgbmV0d29ya1BhcnRzID0gcnVsZS5uZXR3b3JrLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gbmV0d29ya1BhcnRzWzBdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3Qgc3VibmV0ID0gbmV0d29ya1BhcnRzWzFdIHx8ICcwJztcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVOYW1lID0gcnVsZS5kZXNjcmlwdGlvbiB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1vZGlmeUNsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICBjb25zdCBwcmVmaWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvP25ldHdvcms9JHtlbmNvZGVVUklDb21wb25lbnQobmV0d29yayl9JnN1Ym5ldD0ke2VuY29kZVVSSUNvbXBvbmVudChzdWJuZXQpfSZydWxlTmFtZT0ke2VuY29kZVVSSUNvbXBvbmVudChydWxlTmFtZSl9YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke3ByZWZpbGxVcmx9XCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uICR7bW9kaWZ5Q2xhc3N9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+PC9hPic7XG4gICAgICAgICAgICBodG1sICs9ICc8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgZGlzYWJsZWQgYnV0dG9uXCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIHJ1bGUgYnV0dG9uc1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5Q2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLm1vZGlmeSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5LyR7cnVsZS5pZH1cIiBgO1xuICAgICAgICAgICAgaHRtbCArPSBgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkICR7bW9kaWZ5Q2xhc3N9XCIgYDtcbiAgICAgICAgICAgIGh0bWwgKz0gYGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0fVwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPjwvYT4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocnVsZS5wZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgZGlzYWJsZWQgYnV0dG9uXCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVsZXRlQ2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLmRlbGV0ZSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiI1wiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZCAke2RlbGV0ZUNsYXNzfVwiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgZGF0YS12YWx1ZT1cIiR7cnVsZS5pZH1cIiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+YDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj48L3RkPjwvdHI+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc2VydmljZSBpbmZvIHNjcmlwdCB0YWdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkU2VydmljZUluZm9TY3JpcHQoZGF0YSkge1xuICAgICAgICAvLyBDb2xsZWN0IHBvcnQgaW5mb3JtYXRpb24gZnJvbSBydWxlc1xuICAgICAgICBjb25zdCBzZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgY29uc3Qgc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF0YS5pdGVtcyAmJiBkYXRhLml0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZpcnN0UnVsZSA9IGRhdGEuaXRlbXNbMF07XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhmaXJzdFJ1bGUucnVsZXMgfHwge30pLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGUgPSBmaXJzdFJ1bGUucnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgIHNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeV0gPSBydWxlLnBvcnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgIHNlcnZpY2VOYW1lTWFwcGluZ1tydWxlLm5hbWVdID0gY2F0ZWdvcnk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxzY3JpcHQ+XG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9ICR7SlNPTi5zdHJpbmdpZnkoc2VydmljZVBvcnRJbmZvKX07XG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9ICR7SlNPTi5zdHJpbmdpZnkoc2VydmljZU5hbWVNYXBwaW5nKX07XG4gICAgICAgICAgICAgICAgd2luZG93LmlzRG9ja2VyID0gJHtkYXRhLmlzRG9ja2VyID8gJ3RydWUnIDogJ2ZhbHNlJ307XG4gICAgICAgICAgICA8L3NjcmlwdD5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIFVJIGVsZW1lbnRzIGFmdGVyIERPTSBjcmVhdGlvblxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmb3IgY29udGV4dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUVsZW1lbnRzKGRhdGEpIHtcblxuICAgICAgICAvLyBSZS1iaW5kIGRvdWJsZS1jbGljayBoYW5kbGVyIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIHJvd3NcbiAgICAgICAgLy8gRXhjbHVkZSBsYXN0IGNlbGwgd2l0aCBhY3Rpb24gYnV0dG9ucyB0byBwcmV2ZW50IGFjY2lkZW50YWwgbmF2aWdhdGlvbiBvbiBkZWxldGUgYnV0dG9uIGNsaWNrc1xuICAgICAgICAkKCcucnVsZS1yb3cgdGQ6bm90KDpsYXN0LWNoaWxkKScpLm9mZignZGJsY2xpY2snKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8ke2lkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTGV0IGRlbGV0ZS1zb21ldGhpbmcuanMgaGFuZGxlIHRoZSBmaXJzdCBjbGljaywgd2UganVzdCBwcmV2ZW50IGRlZmF1bHQgbmF2aWdhdGlvblxuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgJ2EuZGVsZXRlLnR3by1zdGVwcy1kZWxldGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAvLyBEb24ndCBzdG9wIHByb3BhZ2F0aW9uIC0gYWxsb3cgZGVsZXRlLXNvbWV0aGluZy5qcyB0byB3b3JrXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIC0gd29ya3Mgd2l0aCB0d28tc3RlcHMtZGVsZXRlIGxvZ2ljXG4gICAgICAgIC8vIFRoaXMgd2lsbCBiZSB0cmlnZ2VyZWQgYWZ0ZXIgZGVsZXRlLXNvbWV0aGluZy5qcyByZW1vdmVzIHRoZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgcnVsZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLmRlbGV0ZVJlY29yZChydWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVsb2FkIGRhdGEgdG8gcmVmcmVzaCB0aGUgdGFibGVcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlPy5tZXNzYWdlcyB8fCBnbG9iYWxUcmFuc2xhdGUuZndfRXJyb3JEZWxldGluZ1J1bGUpO1xuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpZiBkZWxldGlvbiBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygndHdvLXN0ZXBzLWRlbGV0ZScpO1xuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnY2xvc2UnKS5hZGRDbGFzcygndHJhc2gnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0dXAgY2hlY2tib3ggdG8gZW5hYmxlIG9yIGRpc2FibGUgdGhlIGZpcmV3YWxsXG4gICAgICAgIGlmIChmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUpIHtcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZVxuICAgICAgICAgICAgICAgIC5jaGVja2JveCh7XG4gICAgICAgICAgICAgICAgICAgIG9uQ2hlY2tlZDogZmlyZXdhbGxUYWJsZS5lbmFibGVGaXJld2FsbCxcbiAgICAgICAgICAgICAgICAgICAgb25VbmNoZWNrZWQ6IGZpcmV3YWxsVGFibGUuZGlzYWJsZUZpcmV3YWxsLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwcyBmb3IgZWRpdC9kZWxldGUgYnV0dG9uc1xuICAgICAgICAkKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIERvY2tlci1zcGVjaWZpYyBVSSBlbGVtZW50cyB3aXRoIGRhdGEgY29udGV4dFxuICAgICAgICBmaXJld2FsbFRhYmxlLmluaXRpYWxpemVEb2NrZXJVSShkYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8vIEluaXRpYWxpemUgRG9ja2VyLXNwZWNpZmljIFVJIGVsZW1lbnRzXG4gICAgaW5pdGlhbGl6ZURvY2tlclVJKGRhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSBwb3J0IGluZm9ybWF0aW9uXG4gICAgICAgIGlmICghd2luZG93LnNlcnZpY2VQb3J0SW5mbyB8fCAhd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBhbGwgc2VydmljZSBjZWxscyBpbiB0aGUgdGFibGVcbiAgICAgICAgJCgndGQubWFya3MnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNlbGwgPSAkKHRoaXMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIHNlcnZpY2UgbmFtZSBmcm9tIHRoZSBoZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGNvbHVtbkluZGV4ID0gJGNlbGwuaW5kZXgoKTtcbiAgICAgICAgICAgIGNvbnN0ICRoZWFkZXJDZWxsID0gJGNlbGwuY2xvc2VzdCgndGFibGUnKS5maW5kKCd0aGVhZCB0aCcpLmVxKGNvbHVtbkluZGV4KTtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZpY2VOYW1lID0gJGhlYWRlckNlbGwuZmluZCgnc3BhbicpLnRleHQoKSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNlcnZpY2VOYW1lKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBjYXRlZ29yeSBrZXkgZnJvbSB0aGUgZGlzcGxheSBuYW1lXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlLZXkgPSB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nW3NlcnZpY2VOYW1lXSB8fCBzZXJ2aWNlTmFtZTtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3J0SW5mbyA9IHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bY2F0ZWdvcnlLZXldIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICRjZWxsLmF0dHIoJ2RhdGEtYWN0aW9uJykgfHwgJ2FsbG93JztcbiAgICAgICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gJGNlbGwuYXR0cignZGF0YS1uZXR3b3JrJykgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gJGNlbGwuaGFzQ2xhc3MoJ2RvY2tlci1saW1pdGVkJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNEb2NrZXIgPSBkYXRhID8gZGF0YS5pc0RvY2tlciA6IHdpbmRvdy5pc0RvY2tlcjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSB0b29sdGlwIGNvbnRlbnQgdXNpbmcgdW5pZmllZCBnZW5lcmF0b3JcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeUtleSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uLFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgICAgICBpc0RvY2tlcixcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkLFxuICAgICAgICAgICAgICAgICAgICBwb3J0SW5mbyxcbiAgICAgICAgICAgICAgICAgICAgaXNEb2NrZXIgJiYgaXNMaW1pdGVkIC8vIFNob3cgY29weSBidXR0b24gZm9yIERvY2tlciBsaW1pdGVkIHNlcnZpY2VzXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLmluaXRpYWxpemVUb29sdGlwKCRjZWxsLCB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBFbmFibGUgdGhlIGZpcmV3YWxsIGJ5IG1ha2luZyBhbiBIVFRQIHJlcXVlc3QgdG8gdGhlIHNlcnZlci5cbiAgICBlbmFibGVGaXJld2FsbCgpIHtcbiAgICAgICAgRmlyZXdhbGxBUEkuZW5hYmxlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gRGlzYWJsZSB0aGUgZmlyZXdhbGwgYnkgbWFraW5nIGFuIEhUVFAgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICAgIGRpc2FibGVGaXJld2FsbCgpIHtcbiAgICAgICAgRmlyZXdhbGxBUEkuZGlzYWJsZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRW5hYmxlZCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIENhbGxiYWNrIGFmdGVyIHRoZSBmaXJld2FsbCBoYXMgYmVlbiBlbmFibGVkLlxuICAgIGNiQWZ0ZXJFbmFibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igc3VwcG9ydGVkIHNlcnZpY2VzLCBjaGFuZ2UgZ3JlZW4gY2hlY2ttYXJrcyB0byByZWQgY3Jvc3Nlc1xuICAgICAgICAkKCd0ZC5tYXJrczpub3QoLmRvY2tlci1saW1pdGVkKSBpLmljb24uY2hlY2ttYXJrLmdyZWVuW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjaGVja21hcmsgZ3JlZW4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjbG9zZSByZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBsaW1pdGVkIHNlcnZpY2VzIGluIERvY2tlciwga2VlcCBncmVlbiBjaGVja21hcmsgYnV0IGhpZGUgY29ybmVyIGNsb3NlXG4gICAgICAgICQoJ3RkLmRvY2tlci1saW1pdGVkIGkuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgYWxsIG90aGVyIHNlcnZpY2VzLCBoaWRlIGNvcm5lciBjbG9zZVxuICAgICAgICAkKCd0ZC5tYXJrczpub3QoLmRvY2tlci1saW1pdGVkKSBpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuXG4gICAgICAgIGlmIChzZW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIENhbGxiYWNrIGFmdGVyIHRoZSBmaXJld2FsbCBoYXMgYmVlbiBkaXNhYmxlZC5cbiAgICBjYkFmdGVyRGlzYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBhbGwgc2VydmljZXMsIGNoYW5nZSByZWQgY3Jvc3NlcyB0byBncmVlbiBjaGVja21hcmtzXG4gICAgICAgICQoJ2kuaWNvbi5jbG9zZS5yZWRbZGF0YS12YWx1ZT1cIm9mZlwiXScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlIHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBjb3JuZXIgY2xvc2UgZm9yIGFsbCBzZXJ2aWNlcyB3aGVuIGZpcmV3YWxsIGlzIGRpc2FibGVkXG4gICAgICAgICQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplKCk7XG59KTsiXX0=