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
      // New rule form
      html += "<form action=\"".concat(globalRootUrl, "firewall/modify/\" method=\"post\">");
      html += "<input type=\"hidden\" name=\"permit\" value=\"".concat(rule.network, "\"/>");
      html += "<input type=\"hidden\" name=\"description\" value=\"".concat(rule.description, "\"/>");
      var modifyClass = firewallTable.permissions.modify ? '' : 'disabled';
      html += "<button class=\"ui icon basic mini button ".concat(modifyClass, "\" type=\"submit\">");
      html += '<i class="icon edit blue"></i></button>';
      html += '<a href="#" class="ui disabled button"><i class="icon trash red"></i></a>';
      html += '</form>';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsImlzRG9ja2VyIiwiYnVpbGREb2NrZXJOb3RpY2UiLCJnbG9iYWxSb290VXJsIiwiZndfQWRkTmV3UnVsZSIsImJ1aWxkRmlyZXdhbGxUYWJsZSIsIml0ZW1zIiwiYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdCIsImZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlIiwiZndfRG9ja2VyTGltaXRlZFNlcnZpY2VzSW5mbyIsInJ1bGVzIiwibGVuZ3RoIiwiZndfTm9SdWxlc0NvbmZpZ3VyZWQiLCJjYXRlZ29yaWVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsImNhdGVnb3J5RGF0YSIsImlzTGltaXRlZCIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiaW5jbHVkZXMiLCJuYW1lIiwibGltaXRlZENsYXNzIiwicnVsZSIsImJ1aWxkUnVsZVJvdyIsImlkIiwibmV0d29yayIsImRlc2NyaXB0aW9uIiwiZndfTmVlZENvbmZpZ3VyZVJ1bGUiLCJjYXRlZ29yeVJ1bGUiLCJhY3Rpb24iLCJtb2RpZnlDbGFzcyIsImJ0X1Rvb2xUaXBFZGl0IiwicGVybWFuZW50IiwiZGVsZXRlQ2xhc3MiLCJidF9Ub29sVGlwRGVsZXRlIiwic2VydmljZVBvcnRJbmZvIiwic2VydmljZU5hbWVNYXBwaW5nIiwiZmlyc3RSdWxlIiwicG9ydHMiLCJKU09OIiwic3RyaW5naWZ5Iiwib2ZmIiwib24iLCJlIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsInJ1bGVJZCIsImRlbGV0ZVJlY29yZCIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZndfRXJyb3JEZWxldGluZ1J1bGUiLCJmaW5kIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJlbmFibGVGaXJld2FsbCIsIm9uVW5jaGVja2VkIiwiZGlzYWJsZUZpcmV3YWxsIiwicG9wdXAiLCJpbml0aWFsaXplRG9ja2VyVUkiLCJlYWNoIiwiJGNlbGwiLCJjb2x1bW5JbmRleCIsImluZGV4IiwiJGhlYWRlckNlbGwiLCJlcSIsInNlcnZpY2VOYW1lIiwidGV4dCIsImNhdGVnb3J5S2V5IiwicG9ydEluZm8iLCJoYXNDbGFzcyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJlbmFibGUiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsImRpc2FibGUiLCJzZW5kRXZlbnQiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50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LE1BQUFBLE1BQU0sQ0FBQzJDLGFBQVAsQ0FBcUJKLEtBQXJCO0FBQ0g7QUFDSjtBQTFkaUIsQ0FBdEIsQyxDQTZkQTs7QUFDQXBILENBQUMsQ0FBQ3FILFFBQUQsQ0FBRCxDQUFZSyxLQUFaLENBQWtCLFlBQU07QUFDcEJwSSxFQUFBQSxhQUFhLENBQUNTLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgZmlyZXdhbGxUb29sdGlwcywgRmlyZXdhbGxBUEksIFVzZXJNZXNzYWdlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIFRoZSBgZmlyZXdhbGxUYWJsZWAgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZpcmV3YWxsIHN5c3RlbS5cbiAqXG4gKiBAbW9kdWxlIGZpcmV3YWxsVGFibGVcbiAqL1xuY29uc3QgZmlyZXdhbGxUYWJsZSA9IHtcbiAgICAvLyBqUXVlcnkgZWxlbWVudHMgKHdpbGwgYmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgRE9NIGNyZWF0aW9uKVxuICAgICRzdGF0dXNUb2dnbGU6IG51bGwsXG4gICAgJGFkZE5ld0J1dHRvbjogbnVsbCxcbiAgICAkc2V0dGluZ3M6IG51bGwsXG4gICAgJGNvbnRhaW5lcjogbnVsbCxcbiAgICBcbiAgICAvLyBEYXRhIGZyb20gQVBJXG4gICAgZmlyZXdhbGxEYXRhOiBudWxsLFxuICAgIHBlcm1pc3Npb25zOiB7XG4gICAgICAgIHN0YXR1czogdHJ1ZSxcbiAgICAgICAgbW9kaWZ5OiB0cnVlLFxuICAgICAgICBkZWxldGU6IHRydWVcbiAgICB9LFxuXG4gICAgLy8gVGhpcyBtZXRob2QgaW5pdGlhbGl6ZXMgdGhlIEZpcmV3YWxsIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEdldCBjb250YWluZXJcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyID0gJCgnI2ZpcmV3YWxsLWNvbnRlbnQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIGZpcmV3YWxsVGFibGUubG9hZEZpcmV3YWxsRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRmlyZXdhbGxEYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBGaXJld2FsbEFQSS5nZXRMaXN0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZndfRXJyb3JMb2FkaW5nRGF0YSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBkYXRhXG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLmZpcmV3YWxsRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEJ1aWxkIHRoZSBpbnRlcmZhY2VcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuYnVpbGRJbnRlcmZhY2UocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29tcGxldGUgaW50ZXJmYWNlIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBidWlsZEludGVyZmFjZShkYXRhKSB7XG4gICAgICAgIC8vIENsZWFyIGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHN0YXR1cyB0b2dnbGVcbiAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGZpcmV3YWxsVGFibGUuYnVpbGRTdGF0dXNUb2dnbGUoZGF0YS5maXJld2FsbEVuYWJsZWQgPT09ICcxJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5hcHBlbmQoc3RhdHVzSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzZXR0aW5ncyBzZWN0aW9uXG4gICAgICAgIGNvbnN0IHNldHRpbmdzSHRtbCA9IGZpcmV3YWxsVGFibGUuYnVpbGRTZXR0aW5nc1NlY3Rpb24oZGF0YSk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5hcHBlbmQoc2V0dGluZ3NIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIGpRdWVyeSBlbGVtZW50c1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUgPSAkKCcjc3RhdHVzLXRvZ2dsZScpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRhZGROZXdCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc2V0dGluZ3MgPSAkKCcjZmlyZXdhbGwtc2V0dGluZ3MnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsIFVJIGVsZW1lbnRzXG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZVVJRWxlbWVudHMoZGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzdGF0dXMgdG9nZ2xlIEhUTUxcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZWQgLSBXaGV0aGVyIGZpcmV3YWxsIGlzIGVuYWJsZWRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkU3RhdHVzVG9nZ2xlKGVuYWJsZWQpIHtcbiAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLnN0YXR1cyA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgY29uc3QgbGFiZWxUZXh0ID0gZW5hYmxlZCA/IGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNFbmFibGVkIDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0Rpc2FibGVkO1xuICAgICAgICBjb25zdCBjaGVja2VkID0gZW5hYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCAke3N0YXR1c0NsYXNzfVwiIGlkPVwic3RhdHVzLXRvZ2dsZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cInN0YXR1c1wiIGlkPVwic3RhdHVzXCIgJHtjaGVja2VkfS8+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2xhYmVsVGV4dH08L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzZXR0aW5ncyBzZWN0aW9uIHdpdGggdGFibGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkU2V0dGluZ3NTZWN0aW9uKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGJhc2ljIHNlZ21lbnRcIiBpZD1cImZpcmV3YWxsLXNldHRpbmdzXCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIERvY2tlciBub3RpY2UgaWYgYXBwbGljYWJsZVxuICAgICAgICBpZiAoZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkRG9ja2VyTm90aWNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcgcnVsZSBidXR0b25cbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeVwiIGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBpZD1cImFkZC1uZXctYnV0dG9uXCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiYWRkIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FkZE5ld1J1bGV9PC9hPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGZpcmV3YWxsIHRhYmxlXG4gICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZEZpcmV3YWxsVGFibGUoZGF0YS5pdGVtcywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHNlcnZpY2UgcG9ydCBpbmZvIHNjcmlwdFxuICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdChkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgRG9ja2VyIGVudmlyb25tZW50IG5vdGljZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGREb2NrZXJOb3RpY2UoKSB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBpY29uIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJMaW1pdGVkU2VydmljZXNJbmZvfTwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgZmlyZXdhbGwgcnVsZXMgdGFibGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBydWxlcyAtIEFycmF5IG9mIGZpcmV3YWxsIHJ1bGVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDb21wbGV0ZSBkYXRhIG9iamVjdCB3aXRoIG1ldGFkYXRhXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZEZpcmV3YWxsVGFibGUocnVsZXMsIGRhdGEpIHtcbiAgICAgICAgaWYgKCFydWxlcyB8fCBydWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInVpIG1lc3NhZ2VcIj4nICsgZ2xvYmFsVHJhbnNsYXRlLmZ3X05vUnVsZXNDb25maWd1cmVkICsgJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJzx0YWJsZSBjbGFzcz1cInVpIHNlbGVjdGFibGUgdmVyeSBiYXNpYyBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCIgaWQ9XCJmaXJld2FsbC10YWJsZVwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBoZWFkZXJcbiAgICAgICAgaHRtbCArPSAnPHRoZWFkPjx0cj48dGg+PC90aD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGNhdGVnb3JpZXMgZnJvbSBmaXJzdCBydWxlXG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBPYmplY3Qua2V5cyhydWxlc1swXS5ydWxlcyB8fCB7fSk7XG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeURhdGEgPSBydWxlc1swXS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBkYXRhLmlzRG9ja2VyICYmICFkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKGNhdGVnb3J5RGF0YS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ZWRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZCcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPHRoIHdpZHRoPVwiMjBweFwiIGNsYXNzPVwiZmlyZXdhbGwtY2F0ZWdvcnkgJHtsaW1pdGVkQ2xhc3N9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXY+PHNwYW4+JHtjYXRlZ29yeURhdGEubmFtZX08L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdGg+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8dGg+PC90aD48L3RyPjwvdGhlYWQ+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGJvZHlcbiAgICAgICAgaHRtbCArPSAnPHRib2R5Pic7XG4gICAgICAgIFxuICAgICAgICBydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkUnVsZVJvdyhydWxlLCBjYXRlZ29yaWVzLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc2luZ2xlIHJ1bGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGUgLSBSdWxlIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjYXRlZ29yaWVzIC0gQ2F0ZWdvcnkga2V5c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQ29tcGxldGUgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkUnVsZVJvdyhydWxlLCBjYXRlZ29yaWVzLCBkYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gYDx0ciBjbGFzcz1cInJ1bGUtcm93XCIgaWQ9XCIke3J1bGUuaWQgfHwgJyd9XCI+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgYW5kIGRlc2NyaXB0aW9uIGNlbGxcbiAgICAgICAgaHRtbCArPSAnPHRkPic7XG4gICAgICAgIGh0bWwgKz0gYCR7cnVsZS5uZXR3b3JrfSAtICR7cnVsZS5kZXNjcmlwdGlvbn1gO1xuICAgICAgICBpZiAoIXJ1bGUuaWQpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxicj48c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtnbG9iYWxUcmFuc2xhdGUuZndfTmVlZENvbmZpZ3VyZVJ1bGV9PC9zcGFuPmA7XG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSAnPC90ZD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2F0ZWdvcnkgY2VsbHNcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5UnVsZSA9IHJ1bGUucnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeVJ1bGUpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dGQ+PC90ZD4nO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gZGF0YS5pc0RvY2tlciAmJiAhZGF0YS5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcy5pbmNsdWRlcyhjYXRlZ29yeVJ1bGUubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBsaW1pdGVkQ2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSBjYXRlZ29yeVJ1bGUuYWN0aW9uID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIG1hcmtzICR7bGltaXRlZENsYXNzfVwiIGRhdGEtYWN0aW9uPVwiJHthY3Rpb259XCIgZGF0YS1uZXR3b3JrPVwiJHtydWxlLm5ldHdvcmt9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbnNcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnYWxsb3cnKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvblwiPjwvaT4nO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLmZpcmV3YWxsRW5hYmxlZCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGltaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGFzIGRpc2FibGVkIGZpcmV3YWxsIGZvciBibG9ja2VkIGxpbWl0ZWQgc2VydmljZXMgaW4gRG9ja2VyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjb3JuZXIgY2xvc2UgcmVkXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNsb3NlIHJlZFwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+PC9pPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjb3JuZXIgY2xvc2UgcmVkXCI+PC9pPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvaT48L3RkPic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY2VsbFxuICAgICAgICBodG1sICs9ICc8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zXCI+JztcbiAgICAgICAgXG4gICAgICAgIGlmICghcnVsZS5pZCkge1xuICAgICAgICAgICAgLy8gTmV3IHJ1bGUgZm9ybVxuICAgICAgICAgICAgaHRtbCArPSBgPGZvcm0gYWN0aW9uPVwiJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS9cIiBtZXRob2Q9XCJwb3N0XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInBlcm1pdFwiIHZhbHVlPVwiJHtydWxlLm5ldHdvcmt9XCIvPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkZXNjcmlwdGlvblwiIHZhbHVlPVwiJHtydWxlLmRlc2NyaXB0aW9ufVwiLz5gO1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5Q2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLm1vZGlmeSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxidXR0b24gY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uICR7bW9kaWZ5Q2xhc3N9XCIgdHlwZT1cInN1Ym1pdFwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPjwvYnV0dG9uPic7XG4gICAgICAgICAgICBodG1sICs9ICc8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgZGlzYWJsZWQgYnV0dG9uXCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZm9ybT4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcnVsZSBidXR0b25zXG4gICAgICAgICAgICBjb25zdCBtb2RpZnlDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5ID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtydWxlLmlkfVwiIGA7XG4gICAgICAgICAgICBodG1sICs9IGBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWQgJHttb2RpZnlDbGFzc31cIiBgO1xuICAgICAgICAgICAgaHRtbCArPSBgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+PC9hPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChydWxlLnBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBkaXNhYmxlZCBidXR0b25cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuZGVsZXRlID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkICR7ZGVsZXRlQ2xhc3N9XCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBkYXRhLXZhbHVlPVwiJHtydWxlLmlkfVwiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5gO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzZXJ2aWNlIGluZm8gc2NyaXB0IHRhZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdChkYXRhKSB7XG4gICAgICAgIC8vIENvbGxlY3QgcG9ydCBpbmZvcm1hdGlvbiBmcm9tIHJ1bGVzXG4gICAgICAgIGNvbnN0IHNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICBjb25zdCBzZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhLml0ZW1zICYmIGRhdGEuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZmlyc3RSdWxlID0gZGF0YS5pdGVtc1swXTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGZpcnN0UnVsZS5ydWxlcyB8fCB7fSkuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnVsZSA9IGZpcnN0UnVsZS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICAgICAgc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5XSA9IHJ1bGUucG9ydHMgfHwgW107XG4gICAgICAgICAgICAgICAgc2VydmljZU5hbWVNYXBwaW5nW3J1bGUubmFtZV0gPSBjYXRlZ29yeTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPHNjcmlwdD5cbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0gJHtKU09OLnN0cmluZ2lmeShzZXJ2aWNlUG9ydEluZm8pfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0gJHtKU09OLnN0cmluZ2lmeShzZXJ2aWNlTmFtZU1hcHBpbmcpfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSAke2RhdGEuaXNEb2NrZXIgPyAndHJ1ZScgOiAnZmFsc2UnfTtcbiAgICAgICAgICAgIDwvc2NyaXB0PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHMgYWZ0ZXIgRE9NIGNyZWF0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZvciBjb250ZXh0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJRWxlbWVudHMoZGF0YSkge1xuXG4gICAgICAgIC8vIFJlLWJpbmQgZG91YmxlLWNsaWNrIGhhbmRsZXIgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgcm93c1xuICAgICAgICAvLyBFeGNsdWRlIGxhc3QgY2VsbCB3aXRoIGFjdGlvbiBidXR0b25zIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBuYXZpZ2F0aW9uIG9uIGRlbGV0ZSBidXR0b24gY2xpY2tzXG4gICAgICAgICQoJy5ydWxlLXJvdyB0ZDpub3QoOmxhc3QtY2hpbGQpJykub2ZmKCdkYmxjbGljaycpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5LyR7aWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMZXQgZGVsZXRlLXNvbWV0aGluZy5qcyBoYW5kbGUgdGhlIGZpcnN0IGNsaWNrLCB3ZSBqdXN0IHByZXZlbnQgZGVmYXVsdCBuYXZpZ2F0aW9uXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGUudHdvLXN0ZXBzLWRlbGV0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIC8vIERvbid0IHN0b3AgcHJvcGFnYXRpb24gLSBhbGxvdyBkZWxldGUtc29tZXRoaW5nLmpzIHRvIHdvcmtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgLSB3b3JrcyB3aXRoIHR3by1zdGVwcy1kZWxldGUgbG9naWNcbiAgICAgICAgLy8gVGhpcyB3aWxsIGJlIHRyaWdnZXJlZCBhZnRlciBkZWxldGUtc29tZXRoaW5nLmpzIHJlbW92ZXMgdGhlIHR3by1zdGVwcy1kZWxldGUgY2xhc3NcbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBydWxlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuZGVsZXRlUmVjb3JkKHJ1bGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byByZWZyZXNoIHRoZSB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2U/Lm1lc3NhZ2VzIHx8IGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckRlbGV0aW5nUnVsZSk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlmIGRlbGV0aW9uIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXR1cCBjaGVja2JveCB0byBlbmFibGUgb3IgZGlzYWJsZSB0aGUgZmlyZXdhbGxcbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSkge1xuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlXG4gICAgICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICAgICAgb25DaGVja2VkOiBmaXJld2FsbFRhYmxlLmVuYWJsZUZpcmV3YWxsLFxuICAgICAgICAgICAgICAgICAgICBvblVuY2hlY2tlZDogZmlyZXdhbGxUYWJsZS5kaXNhYmxlRmlyZXdhbGwsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBlZGl0L2RlbGV0ZSBidXR0b25zXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRG9ja2VyLXNwZWNpZmljIFVJIGVsZW1lbnRzIHdpdGggZGF0YSBjb250ZXh0XG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZURvY2tlclVJKGRhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLy8gSW5pdGlhbGl6ZSBEb2NrZXItc3BlY2lmaWMgVUkgZWxlbWVudHNcbiAgICBpbml0aWFsaXplRG9ja2VyVUkoZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIHBvcnQgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKCF3aW5kb3cuc2VydmljZVBvcnRJbmZvIHx8ICF3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFsbCBzZXJ2aWNlIGNlbGxzIGluIHRoZSB0YWJsZVxuICAgICAgICAkKCd0ZC5tYXJrcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgc2VydmljZSBuYW1lIGZyb20gdGhlIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgY29sdW1uSW5kZXggPSAkY2VsbC5pbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlckNlbGwgPSAkY2VsbC5jbG9zZXN0KCd0YWJsZScpLmZpbmQoJ3RoZWFkIHRoJykuZXEoY29sdW1uSW5kZXgpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZU5hbWUgPSAkaGVhZGVyQ2VsbC5maW5kKCdzcGFuJykudGV4dCgpIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VydmljZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGNhdGVnb3J5IGtleSBmcm9tIHRoZSBkaXNwbGF5IG5hbWVcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9IHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2VydmljZU5hbWVdIHx8IHNlcnZpY2VOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeUtleV0gfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNlbGwuYXR0cignZGF0YS1hY3Rpb24nKSB8fCAnYWxsb3cnO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSAkY2VsbC5hdHRyKCdkYXRhLW5ldHdvcmsnKSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkY2VsbC5oYXNDbGFzcygnZG9ja2VyLWxpbWl0ZWQnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0RvY2tlciA9IGRhdGEgPyBkYXRhLmlzRG9ja2VyIDogd2luZG93LmlzRG9ja2VyO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCB1c2luZyB1bmlmaWVkIGdlbmVyYXRvclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5S2V5LFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzRG9ja2VyLFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLFxuICAgICAgICAgICAgICAgICAgICBpc0RvY2tlciAmJiBpc0xpbWl0ZWQgLy8gU2hvdyBjb3B5IGJ1dHRvbiBmb3IgRG9ja2VyIGxpbWl0ZWQgc2VydmljZXNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGNlbGwsIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIEVuYWJsZSB0aGUgZmlyZXdhbGwgYnkgbWFraW5nIGFuIEhUVFAgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICAgIGVuYWJsZUZpcmV3YWxsKCkge1xuICAgICAgICBGaXJld2FsbEFQSS5lbmFibGUoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRW5hYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRGlzYWJsZWQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBEaXNhYmxlIHRoZSBmaXJld2FsbCBieSBtYWtpbmcgYW4gSFRUUCByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIuXG4gICAgZGlzYWJsZUZpcmV3YWxsKCkge1xuICAgICAgICBGaXJld2FsbEFQSS5kaXNhYmxlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gQ2FsbGJhY2sgYWZ0ZXIgdGhlIGZpcmV3YWxsIGhhcyBiZWVuIGVuYWJsZWQuXG4gICAgY2JBZnRlckVuYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRW5hYmxlZCk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBzdXBwb3J0ZWQgc2VydmljZXMsIGNoYW5nZSBncmVlbiBjaGVja21hcmtzIHRvIHJlZCBjcm9zc2VzXG4gICAgICAgICQoJ3RkLm1hcmtzOm5vdCguZG9ja2VyLWxpbWl0ZWQpIGkuaWNvbi5jaGVja21hcmsuZ3JlZW5bZGF0YS12YWx1ZT1cIm9mZlwiXScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2Nsb3NlIHJlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGxpbWl0ZWQgc2VydmljZXMgaW4gRG9ja2VyLCBrZWVwIGdyZWVuIGNoZWNrbWFyayBidXQgaGlkZSBjb3JuZXIgY2xvc2VcbiAgICAgICAgJCgndGQuZG9ja2VyLWxpbWl0ZWQgaS5pY29uLmNvcm5lci5jbG9zZScpLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBhbGwgb3RoZXIgc2VydmljZXMsIGhpZGUgY29ybmVyIGNsb3NlXG4gICAgICAgICQoJ3RkLm1hcmtzOm5vdCguZG9ja2VyLWxpbWl0ZWQpIGkuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG5cbiAgICAgICAgaWYgKHNlbmRFdmVudCkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gQ2FsbGJhY2sgYWZ0ZXIgdGhlIGZpcmV3YWxsIGhhcyBiZWVuIGRpc2FibGVkLlxuICAgIGNiQWZ0ZXJEaXNhYmxlZChzZW5kRXZlbnQgPSBmYWxzZSkge1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuZmluZCgnbGFiZWwnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNEaXNhYmxlZCk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGFsbCBzZXJ2aWNlcywgY2hhbmdlIHJlZCBjcm9zc2VzIHRvIGdyZWVuIGNoZWNrbWFya3NcbiAgICAgICAgJCgnaS5pY29uLmNsb3NlLnJlZFtkYXRhLXZhbHVlPVwib2ZmXCJdJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2UgcmVkJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY2hlY2ttYXJrIGdyZWVuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGNvcm5lciBjbG9zZSBmb3IgYWxsIHNlcnZpY2VzIHdoZW4gZmlyZXdhbGwgaXMgZGlzYWJsZWRcbiAgICAgICAgJCgnaS5pY29uLmNvcm5lci5jbG9zZScpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBGaXJld2FsbCBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmaXJld2FsbFRhYmxlLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==