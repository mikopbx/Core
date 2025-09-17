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
        UserMessage.showError(globalTranslate.fw_ErrorLoadingData || 'Error loading firewall rules');
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
    return "\n            <div class=\"ui info icon message\">\n                <i class=\"info circle icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">".concat(globalTranslate.fw_DockerEnvironmentNotice || 'Docker Environment', "</div>\n                    <p>").concat(globalTranslate.fw_DockerLimitedServicesInfo || 'Some services have limited protection in Docker environment. Only HTTP, SSH, AMI and SIP protocols are fully supported.', "</p>\n                </div>\n            </div>\n        ");
  },

  /**
   * Build firewall rules table
   * @param {Array} rules - Array of firewall rules
   * @param {Object} data - Complete data object with metadata
   * @returns {string} HTML string
   */
  buildFirewallTable: function buildFirewallTable(rules, data) {
    if (!rules || rules.length === 0) {
      return '<div class="ui message">' + (globalTranslate.fw_NoRulesConfigured || 'No firewall rules configured') + '</div>';
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
          UserMessage.showMultiString((response === null || response === void 0 ? void 0 : response.messages) || globalTranslate.fw_ErrorDeletingRule || 'Error deleting rule');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsImlzRG9ja2VyIiwiYnVpbGREb2NrZXJOb3RpY2UiLCJnbG9iYWxSb290VXJsIiwiZndfQWRkTmV3UnVsZSIsImJ1aWxkRmlyZXdhbGxUYWJsZSIsIml0ZW1zIiwiYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdCIsImZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlIiwiZndfRG9ja2VyTGltaXRlZFNlcnZpY2VzSW5mbyIsInJ1bGVzIiwibGVuZ3RoIiwiZndfTm9SdWxlc0NvbmZpZ3VyZWQiLCJjYXRlZ29yaWVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsImNhdGVnb3J5RGF0YSIsImlzTGltaXRlZCIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiaW5jbHVkZXMiLCJuYW1lIiwibGltaXRlZENsYXNzIiwicnVsZSIsImJ1aWxkUnVsZVJvdyIsImlkIiwibmV0d29yayIsImRlc2NyaXB0aW9uIiwiZndfTmVlZENvbmZpZ3VyZVJ1bGUiLCJjYXRlZ29yeVJ1bGUiLCJhY3Rpb24iLCJtb2RpZnlDbGFzcyIsImJ0X1Rvb2xUaXBFZGl0IiwicGVybWFuZW50IiwiZGVsZXRlQ2xhc3MiLCJidF9Ub29sVGlwRGVsZXRlIiwic2VydmljZVBvcnRJbmZvIiwic2VydmljZU5hbWVNYXBwaW5nIiwiZmlyc3RSdWxlIiwicG9ydHMiLCJKU09OIiwic3RyaW5naWZ5Iiwib2ZmIiwib24iLCJlIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsInJ1bGVJZCIsImRlbGV0ZVJlY29yZCIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZndfRXJyb3JEZWxldGluZ1J1bGUiLCJmaW5kIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJlbmFibGVGaXJld2FsbCIsIm9uVW5jaGVja2VkIiwiZGlzYWJsZUZpcmV3YWxsIiwicG9wdXAiLCJpbml0aWFsaXplRG9ja2VyVUkiLCJlYWNoIiwiJGNlbGwiLCJjb2x1bW5JbmRleCIsImluZGV4IiwiJGhlYWRlckNlbGwiLCJlcSIsInNlcnZpY2VOYW1lIiwidGV4dCIsImNhdGVnb3J5S2V5IiwicG9ydEluZm8iLCJoYXNDbGFzcyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJlbmFibGUiLCJjYkFmdGVyRW5hYmxlZCIsImNiQWZ0ZXJEaXNhYmxlZCIsImRpc2FibGUiLCJzZW5kRXZlbnQiLCJoaWRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50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TUFBQUEsS0FBSyxDQUFDRyxTQUFOLENBQWdCLG1CQUFoQixFQUFxQyxLQUFyQyxFQUE0QyxJQUE1QztBQUNBMUMsTUFBQUEsTUFBTSxDQUFDMkMsYUFBUCxDQUFxQkosS0FBckI7QUFDSDtBQUNKO0FBMWRpQixDQUF0QixDLENBNmRBOztBQUNBcEgsQ0FBQyxDQUFDcUgsUUFBRCxDQUFELENBQVlLLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBJLEVBQUFBLGFBQWEsQ0FBQ1MsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogVGhlIGBmaXJld2FsbFRhYmxlYCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxUYWJsZVxuICovXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuICAgIC8vIGpRdWVyeSBlbGVtZW50cyAod2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBET00gY3JlYXRpb24pXG4gICAgJHN0YXR1c1RvZ2dsZTogbnVsbCxcbiAgICAkYWRkTmV3QnV0dG9uOiBudWxsLFxuICAgICRzZXR0aW5nczogbnVsbCxcbiAgICAkY29udGFpbmVyOiBudWxsLFxuICAgIFxuICAgIC8vIERhdGEgZnJvbSBBUElcbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG4gICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgc3RhdHVzOiB0cnVlLFxuICAgICAgICBtb2RpZnk6IHRydWUsXG4gICAgICAgIGRlbGV0ZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGaXJld2FsbERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdEYXRhIHx8ICdFcnJvciBsb2FkaW5nIGZpcmV3YWxsIHJ1bGVzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSBkYXRhXG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLmZpcmV3YWxsRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEJ1aWxkIHRoZSBpbnRlcmZhY2VcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuYnVpbGRJbnRlcmZhY2UocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29tcGxldGUgaW50ZXJmYWNlIGZyb20gQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBidWlsZEludGVyZmFjZShkYXRhKSB7XG4gICAgICAgIC8vIENsZWFyIGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHN0YXR1cyB0b2dnbGVcbiAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGZpcmV3YWxsVGFibGUuYnVpbGRTdGF0dXNUb2dnbGUoZGF0YS5maXJld2FsbEVuYWJsZWQgPT09ICcxJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5hcHBlbmQoc3RhdHVzSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzZXR0aW5ncyBzZWN0aW9uXG4gICAgICAgIGNvbnN0IHNldHRpbmdzSHRtbCA9IGZpcmV3YWxsVGFibGUuYnVpbGRTZXR0aW5nc1NlY3Rpb24oZGF0YSk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5hcHBlbmQoc2V0dGluZ3NIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIGpRdWVyeSBlbGVtZW50c1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUgPSAkKCcjc3RhdHVzLXRvZ2dsZScpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRhZGROZXdCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc2V0dGluZ3MgPSAkKCcjZmlyZXdhbGwtc2V0dGluZ3MnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWxsIFVJIGVsZW1lbnRzXG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZVVJRWxlbWVudHMoZGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzdGF0dXMgdG9nZ2xlIEhUTUxcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGVuYWJsZWQgLSBXaGV0aGVyIGZpcmV3YWxsIGlzIGVuYWJsZWRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkU3RhdHVzVG9nZ2xlKGVuYWJsZWQpIHtcbiAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLnN0YXR1cyA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgY29uc3QgbGFiZWxUZXh0ID0gZW5hYmxlZCA/IGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNFbmFibGVkIDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0Rpc2FibGVkO1xuICAgICAgICBjb25zdCBjaGVja2VkID0gZW5hYmxlZCA/ICdjaGVja2VkJyA6ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCAke3N0YXR1c0NsYXNzfVwiIGlkPVwic3RhdHVzLXRvZ2dsZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cInN0YXR1c1wiIGlkPVwic3RhdHVzXCIgJHtjaGVja2VkfS8+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2xhYmVsVGV4dH08L2xhYmVsPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzZXR0aW5ncyBzZWN0aW9uIHdpdGggdGFibGVcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkU2V0dGluZ3NTZWN0aW9uKGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGJhc2ljIHNlZ21lbnRcIiBpZD1cImZpcmV3YWxsLXNldHRpbmdzXCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIERvY2tlciBub3RpY2UgaWYgYXBwbGljYWJsZVxuICAgICAgICBpZiAoZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkRG9ja2VyTm90aWNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBuZXcgcnVsZSBidXR0b25cbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeVwiIGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBpZD1cImFkZC1uZXctYnV0dG9uXCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiYWRkIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FkZE5ld1J1bGV9PC9hPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGZpcmV3YWxsIHRhYmxlXG4gICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZEZpcmV3YWxsVGFibGUoZGF0YS5pdGVtcywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHNlcnZpY2UgcG9ydCBpbmZvIHNjcmlwdFxuICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdChkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgRG9ja2VyIGVudmlyb25tZW50IG5vdGljZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGREb2NrZXJOb3RpY2UoKSB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBpY29uIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlIHx8ICdEb2NrZXIgRW52aXJvbm1lbnQnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJMaW1pdGVkU2VydmljZXNJbmZvIHx8ICdTb21lIHNlcnZpY2VzIGhhdmUgbGltaXRlZCBwcm90ZWN0aW9uIGluIERvY2tlciBlbnZpcm9ubWVudC4gT25seSBIVFRQLCBTU0gsIEFNSSBhbmQgU0lQIHByb3RvY29scyBhcmUgZnVsbHkgc3VwcG9ydGVkLid9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBmaXJld2FsbCBydWxlcyB0YWJsZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJ1bGVzIC0gQXJyYXkgb2YgZmlyZXdhbGwgcnVsZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIENvbXBsZXRlIGRhdGEgb2JqZWN0IHdpdGggbWV0YWRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkRmlyZXdhbGxUYWJsZShydWxlcywgZGF0YSkge1xuICAgICAgICBpZiAoIXJ1bGVzIHx8IHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPicgKyAoZ2xvYmFsVHJhbnNsYXRlLmZ3X05vUnVsZXNDb25maWd1cmVkIHx8ICdObyBmaXJld2FsbCBydWxlcyBjb25maWd1cmVkJykgKyAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnPHRhYmxlIGNsYXNzPVwidWkgc2VsZWN0YWJsZSB2ZXJ5IGJhc2ljIGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIiBpZD1cImZpcmV3YWxsLXRhYmxlXCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGhlYWRlclxuICAgICAgICBodG1sICs9ICc8dGhlYWQ+PHRyPjx0aD48L3RoPic7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY2F0ZWdvcmllcyBmcm9tIGZpcnN0IHJ1bGVcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IE9iamVjdC5rZXlzKHJ1bGVzWzBdLnJ1bGVzIHx8IHt9KTtcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5RGF0YSA9IHJ1bGVzWzBdLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGRhdGEuaXNEb2NrZXIgJiYgIWRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoY2F0ZWdvcnlEYXRhLm5hbWUpO1xuICAgICAgICAgICAgY29uc3QgbGltaXRlZENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8dGggd2lkdGg9XCIyMHB4XCIgY2xhc3M9XCJmaXJld2FsbC1jYXRlZ29yeSAke2xpbWl0ZWRDbGFzc31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdj48c3Bhbj4ke2NhdGVnb3J5RGF0YS5uYW1lfTwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC90aD4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzx0aD48L3RoPjwvdHI+PC90aGVhZD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYm9keVxuICAgICAgICBodG1sICs9ICc8dGJvZHk+JztcbiAgICAgICAgXG4gICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRSdWxlUm93KHJ1bGUsIGNhdGVnb3JpZXMsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzaW5nbGUgcnVsZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZSAtIFJ1bGUgZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNhdGVnb3JpZXMgLSBDYXRlZ29yeSBrZXlzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDb21wbGV0ZSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRSdWxlUm93KHJ1bGUsIGNhdGVnb3JpZXMsIGRhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgPHRyIGNsYXNzPVwicnVsZS1yb3dcIiBpZD1cIiR7cnVsZS5pZCB8fCAnJ31cIj5gO1xuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBhbmQgZGVzY3JpcHRpb24gY2VsbFxuICAgICAgICBodG1sICs9ICc8dGQ+JztcbiAgICAgICAgaHRtbCArPSBgJHtydWxlLm5ldHdvcmt9IC0gJHtydWxlLmRlc2NyaXB0aW9ufWA7XG4gICAgICAgIGlmICghcnVsZS5pZCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2dsb2JhbFRyYW5zbGF0ZS5md19OZWVkQ29uZmlndXJlUnVsZX08L3NwYW4+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9ICc8L3RkPic7XG4gICAgICAgIFxuICAgICAgICAvLyBDYXRlZ29yeSBjZWxsc1xuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlSdWxlID0gcnVsZS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBpZiAoIWNhdGVnb3J5UnVsZSkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx0ZD48L3RkPic7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBkYXRhLmlzRG9ja2VyICYmICFkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKGNhdGVnb3J5UnVsZS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ZWRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGNhdGVnb3J5UnVsZS5hY3Rpb24gPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgbWFya3MgJHtsaW1pdGVkQ2xhc3N9XCIgZGF0YS1hY3Rpb249XCIke2FjdGlvbn1cIiBkYXRhLW5ldHdvcms9XCIke3J1bGUubmV0d29ya31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uc1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdhbGxvdycpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9uXCI+PC9pPic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZmlyZXdhbGxFbmFibGVkID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW1pdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgYXMgZGlzYWJsZWQgZmlyZXdhbGwgZm9yIGJsb2NrZWQgbGltaXRlZCBzZXJ2aWNlcyBpbiBEb2NrZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIj48L2k+JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2xvc2UgcmVkXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj48L2k+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIj48L2k+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9pPjwvdGQ+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBY3Rpb24gYnV0dG9ucyBjZWxsXG4gICAgICAgIGh0bWwgKz0gJzx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnNcIj4nO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFydWxlLmlkKSB7XG4gICAgICAgICAgICAvLyBOZXcgcnVsZSBmb3JtXG4gICAgICAgICAgICBodG1sICs9IGA8Zm9ybSBhY3Rpb249XCIke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5L1wiIG1ldGhvZD1cInBvc3RcIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwicGVybWl0XCIgdmFsdWU9XCIke3J1bGUubmV0d29ya31cIi8+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRlc2NyaXB0aW9uXCIgdmFsdWU9XCIke3J1bGUuZGVzY3JpcHRpb259XCIvPmA7XG4gICAgICAgICAgICBjb25zdCBtb2RpZnlDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5ID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGJ1dHRvbiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gJHttb2RpZnlDbGFzc31cIiB0eXBlPVwic3VibWl0XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+PC9idXR0b24+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBkaXNhYmxlZCBidXR0b25cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9mb3JtPic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBydWxlIGJ1dHRvbnNcbiAgICAgICAgICAgIGNvbnN0IG1vZGlmeUNsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8ke3J1bGUuaWR9XCIgYDtcbiAgICAgICAgICAgIGh0bWwgKz0gYGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZCAke21vZGlmeUNsYXNzfVwiIGA7XG4gICAgICAgICAgICBodG1sICs9IGBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT48L2E+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJ1bGUucGVybWFuZW50KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGRpc2FibGVkIGJ1dHRvblwiPjxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUNsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5kZWxldGUgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiNcIiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWQgJHtkZWxldGVDbGFzc31cIiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYGRhdGEtdmFsdWU9XCIke3J1bGUuaWR9XCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNlcnZpY2UgaW5mbyBzY3JpcHQgdGFnXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZFNlcnZpY2VJbmZvU2NyaXB0KGRhdGEpIHtcbiAgICAgICAgLy8gQ29sbGVjdCBwb3J0IGluZm9ybWF0aW9uIGZyb20gcnVsZXNcbiAgICAgICAgY29uc3Qgc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIGNvbnN0IHNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGEuaXRlbXMgJiYgZGF0YS5pdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdFJ1bGUgPSBkYXRhLml0ZW1zWzBdO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZmlyc3RSdWxlLnJ1bGVzIHx8IHt9KS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBydWxlID0gZmlyc3RSdWxlLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlUG9ydEluZm9bY2F0ZWdvcnldID0gcnVsZS5wb3J0cyB8fCBbXTtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlTmFtZU1hcHBpbmdbcnVsZS5uYW1lXSA9IGNhdGVnb3J5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8c2NyaXB0PlxuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSAke0pTT04uc3RyaW5naWZ5KHNlcnZpY2VQb3J0SW5mbyl9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSAke0pTT04uc3RyaW5naWZ5KHNlcnZpY2VOYW1lTWFwcGluZyl9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciA9ICR7ZGF0YS5pc0RvY2tlciA/ICd0cnVlJyA6ICdmYWxzZSd9O1xuICAgICAgICAgICAgPC9zY3JpcHQ+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBVSSBlbGVtZW50cyBhZnRlciBET00gY3JlYXRpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZm9yIGNvbnRleHRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlFbGVtZW50cyhkYXRhKSB7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkb3VibGUtY2xpY2sgaGFuZGxlciBmb3IgZHluYW1pY2FsbHkgY3JlYXRlZCByb3dzXG4gICAgICAgIC8vIEV4Y2x1ZGUgbGFzdCBjZWxsIHdpdGggYWN0aW9uIGJ1dHRvbnMgdG8gcHJldmVudCBhY2NpZGVudGFsIG5hdmlnYXRpb24gb24gZGVsZXRlIGJ1dHRvbiBjbGlja3NcbiAgICAgICAgJCgnLnJ1bGUtcm93IHRkOm5vdCg6bGFzdC1jaGlsZCknKS5vZmYoJ2RibGNsaWNrJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtpZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExldCBkZWxldGUtc29tZXRoaW5nLmpzIGhhbmRsZSB0aGUgZmlyc3QgY2xpY2ssIHdlIGp1c3QgcHJldmVudCBkZWZhdWx0IG5hdmlnYXRpb25cbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZS50d28tc3RlcHMtZGVsZXRlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgLy8gRG9uJ3Qgc3RvcCBwcm9wYWdhdGlvbiAtIGFsbG93IGRlbGV0ZS1zb21ldGhpbmcuanMgdG8gd29ya1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAtIHdvcmtzIHdpdGggdHdvLXN0ZXBzLWRlbGV0ZSBsb2dpY1xuICAgICAgICAvLyBUaGlzIHdpbGwgYmUgdHJpZ2dlcmVkIGFmdGVyIGRlbGV0ZS1zb21ldGhpbmcuanMgcmVtb3ZlcyB0aGUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzc1xuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBGaXJld2FsbEFQSS5kZWxldGVSZWNvcmQocnVsZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCBkYXRhIHRvIHJlZnJlc2ggdGhlIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUubG9hZEZpcmV3YWxsRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZT8ubWVzc2FnZXMgfHwgZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yRGVsZXRpbmdSdWxlIHx8ICdFcnJvciBkZWxldGluZyBydWxlJyk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlmIGRlbGV0aW9uIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXR1cCBjaGVja2JveCB0byBlbmFibGUgb3IgZGlzYWJsZSB0aGUgZmlyZXdhbGxcbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSkge1xuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlXG4gICAgICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICAgICAgb25DaGVja2VkOiBmaXJld2FsbFRhYmxlLmVuYWJsZUZpcmV3YWxsLFxuICAgICAgICAgICAgICAgICAgICBvblVuY2hlY2tlZDogZmlyZXdhbGxUYWJsZS5kaXNhYmxlRmlyZXdhbGwsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBlZGl0L2RlbGV0ZSBidXR0b25zXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRG9ja2VyLXNwZWNpZmljIFVJIGVsZW1lbnRzIHdpdGggZGF0YSBjb250ZXh0XG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZURvY2tlclVJKGRhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLy8gSW5pdGlhbGl6ZSBEb2NrZXItc3BlY2lmaWMgVUkgZWxlbWVudHNcbiAgICBpbml0aWFsaXplRG9ja2VyVUkoZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIHBvcnQgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKCF3aW5kb3cuc2VydmljZVBvcnRJbmZvIHx8ICF3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFsbCBzZXJ2aWNlIGNlbGxzIGluIHRoZSB0YWJsZVxuICAgICAgICAkKCd0ZC5tYXJrcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgc2VydmljZSBuYW1lIGZyb20gdGhlIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgY29sdW1uSW5kZXggPSAkY2VsbC5pbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlckNlbGwgPSAkY2VsbC5jbG9zZXN0KCd0YWJsZScpLmZpbmQoJ3RoZWFkIHRoJykuZXEoY29sdW1uSW5kZXgpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZU5hbWUgPSAkaGVhZGVyQ2VsbC5maW5kKCdzcGFuJykudGV4dCgpIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VydmljZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGNhdGVnb3J5IGtleSBmcm9tIHRoZSBkaXNwbGF5IG5hbWVcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9IHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2VydmljZU5hbWVdIHx8IHNlcnZpY2VOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeUtleV0gfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNlbGwuYXR0cignZGF0YS1hY3Rpb24nKSB8fCAnYWxsb3cnO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSAkY2VsbC5hdHRyKCdkYXRhLW5ldHdvcmsnKSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkY2VsbC5oYXNDbGFzcygnZG9ja2VyLWxpbWl0ZWQnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0RvY2tlciA9IGRhdGEgPyBkYXRhLmlzRG9ja2VyIDogd2luZG93LmlzRG9ja2VyO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCB1c2luZyB1bmlmaWVkIGdlbmVyYXRvclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5S2V5LFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzRG9ja2VyLFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLFxuICAgICAgICAgICAgICAgICAgICBpc0RvY2tlciAmJiBpc0xpbWl0ZWQgLy8gU2hvdyBjb3B5IGJ1dHRvbiBmb3IgRG9ja2VyIGxpbWl0ZWQgc2VydmljZXNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGNlbGwsIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIEVuYWJsZSB0aGUgZmlyZXdhbGwgYnkgbWFraW5nIGFuIEhUVFAgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICAgIGVuYWJsZUZpcmV3YWxsKCkge1xuICAgICAgICBGaXJld2FsbEFQSS5lbmFibGUoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRW5hYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRGlzYWJsZWQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBEaXNhYmxlIHRoZSBmaXJld2FsbCBieSBtYWtpbmcgYW4gSFRUUCByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIuXG4gICAgZGlzYWJsZUZpcmV3YWxsKCkge1xuICAgICAgICBGaXJld2FsbEFQSS5kaXNhYmxlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gQ2FsbGJhY2sgYWZ0ZXIgdGhlIGZpcmV3YWxsIGhhcyBiZWVuIGVuYWJsZWQuXG4gICAgY2JBZnRlckVuYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRW5hYmxlZCk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBzdXBwb3J0ZWQgc2VydmljZXMsIGNoYW5nZSBncmVlbiBjaGVja21hcmtzIHRvIHJlZCBjcm9zc2VzXG4gICAgICAgICQoJ3RkLm1hcmtzOm5vdCguZG9ja2VyLWxpbWl0ZWQpIGkuaWNvbi5jaGVja21hcmsuZ3JlZW5bZGF0YS12YWx1ZT1cIm9mZlwiXScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2Nsb3NlIHJlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGxpbWl0ZWQgc2VydmljZXMgaW4gRG9ja2VyLCBrZWVwIGdyZWVuIGNoZWNrbWFyayBidXQgaGlkZSBjb3JuZXIgY2xvc2VcbiAgICAgICAgJCgndGQuZG9ja2VyLWxpbWl0ZWQgaS5pY29uLmNvcm5lci5jbG9zZScpLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBhbGwgb3RoZXIgc2VydmljZXMsIGhpZGUgY29ybmVyIGNsb3NlXG4gICAgICAgICQoJ3RkLm1hcmtzOm5vdCguZG9ja2VyLWxpbWl0ZWQpIGkuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG5cbiAgICAgICAgaWYgKHNlbmRFdmVudCkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gQ2FsbGJhY2sgYWZ0ZXIgdGhlIGZpcmV3YWxsIGhhcyBiZWVuIGRpc2FibGVkLlxuICAgIGNiQWZ0ZXJEaXNhYmxlZChzZW5kRXZlbnQgPSBmYWxzZSkge1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuZmluZCgnbGFiZWwnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNEaXNhYmxlZCk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGFsbCBzZXJ2aWNlcywgY2hhbmdlIHJlZCBjcm9zc2VzIHRvIGdyZWVuIGNoZWNrbWFya3NcbiAgICAgICAgJCgnaS5pY29uLmNsb3NlLnJlZFtkYXRhLXZhbHVlPVwib2ZmXCJdJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2xvc2UgcmVkJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY2hlY2ttYXJrIGdyZWVuJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGNvcm5lciBjbG9zZSBmb3IgYWxsIHNlcnZpY2VzIHdoZW4gZmlyZXdhbGwgaXMgZGlzYWJsZWRcbiAgICAgICAgJCgnaS5pY29uLmNvcm5lci5jbG9zZScpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBGaXJld2FsbCBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmaXJld2FsbFRhYmxlLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==