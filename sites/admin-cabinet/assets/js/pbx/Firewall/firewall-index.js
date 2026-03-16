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

/* global globalRootUrl, globalTranslate, firewallTooltips, FirewallAPI, UserMessage, SemanticLocalization, $ */

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

    html += '<thead><tr><th class="collapsing"></th><th></th>'; // Get categories from first rule

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
    var priority = rule.priority !== undefined ? rule.priority : 0;
    var permit = "".concat(rule.network, "/").concat(rule.subnet);
    var isCatchAll = permit === '0.0.0.0/0' || permit === '::/0';
    var noDragClass = isCatchAll ? ' nodrag nodrop' : '';
    var html = "<tr class=\"rule-row".concat(noDragClass, "\" id=\"").concat(rule.id || '', "\" data-value=\"").concat(priority, "\">"); // Drag handle cell — empty for catch-all rules (not draggable)

    if (isCatchAll) {
      html += '<td class="collapsing"></td>';
    } else {
      html += '<td class="collapsing dragHandle"><i class="sort grey icon"></i></td>';
    } // Network and description cell


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsImlzRG9ja2VyIiwiYnVpbGREb2NrZXJOb3RpY2UiLCJnbG9iYWxSb290VXJsIiwiZndfQWRkTmV3UnVsZSIsImJ1aWxkRmlyZXdhbGxUYWJsZSIsIml0ZW1zIiwiYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdCIsImZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlIiwiZndfRG9ja2VyTGltaXRlZFNlcnZpY2VzSW5mbyIsInJ1bGVzIiwibGVuZ3RoIiwiZndfTm9SdWxlc0NvbmZpZ3VyZWQiLCJjYXRlZ29yaWVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsImNhdGVnb3J5RGF0YSIsImlzTGltaXRlZCIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiaW5jbHVkZXMiLCJuYW1lIiwibGltaXRlZENsYXNzIiwicnVsZSIsImJ1aWxkUnVsZVJvdyIsInByaW9yaXR5IiwidW5kZWZpbmVkIiwicGVybWl0IiwibmV0d29yayIsInN1Ym5ldCIsImlzQ2F0Y2hBbGwiLCJub0RyYWdDbGFzcyIsImlkIiwiZGVzY3JpcHRpb24iLCJmd19OZWVkQ29uZmlndXJlUnVsZSIsImNhdGVnb3J5UnVsZSIsImFjdGlvbiIsIm5ldHdvcmtQYXJ0cyIsInNwbGl0IiwicnVsZU5hbWUiLCJtb2RpZnlDbGFzcyIsInByZWZpbGxVcmwiLCJlbmNvZGVVUklDb21wb25lbnQiLCJidF9Ub29sVGlwRWRpdCIsInBlcm1hbmVudCIsImRlbGV0ZUNsYXNzIiwiYnRfVG9vbFRpcERlbGV0ZSIsInNlcnZpY2VQb3J0SW5mbyIsInNlcnZpY2VOYW1lTWFwcGluZyIsImZpcnN0UnVsZSIsInBvcnRzIiwiSlNPTiIsInN0cmluZ2lmeSIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvZmYiLCJvbiIsImUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiYXR0ciIsIndpbmRvdyIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwicnVsZUlkIiwiZGVsZXRlUmVjb3JkIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJmd19FcnJvckRlbGV0aW5nUnVsZSIsImZpbmQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJwb3B1cCIsImluaXRpYWxpemVEb2NrZXJVSSIsImVhY2giLCIkY2VsbCIsImNvbHVtbkluZGV4IiwiaW5kZXgiLCIkaGVhZGVyQ2VsbCIsImVxIiwic2VydmljZU5hbWUiLCJ0ZXh0IiwiY2F0ZWdvcnlLZXkiLCJwb3J0SW5mbyIsImhhc0NsYXNzIiwidG9vbHRpcENvbnRlbnQiLCJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50IiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJwb3NpdGlvbiIsInByaW9yaXR5V2FzQ2hhbmdlZCIsInByaW9yaXR5RGF0YSIsIm9iaiIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsImNoYW5nZVByaW9yaXR5IiwiZW5hYmxlIiwiY2JBZnRlckVuYWJsZWQiLCJjYkFmdGVyRGlzYWJsZWQiLCJkaXNhYmxlIiwic2VuZEV2ZW50IiwiaGlkZSIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJzaG93IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsYUFBYSxHQUFHO0FBQ2xCO0FBQ0FDLEVBQUFBLGFBQWEsRUFBRSxJQUZHO0FBR2xCQyxFQUFBQSxhQUFhLEVBQUUsSUFIRztBQUlsQkMsRUFBQUEsU0FBUyxFQUFFLElBSk87QUFLbEJDLEVBQUFBLFVBQVUsRUFBRSxJQUxNO0FBT2xCO0FBQ0FDLEVBQUFBLFlBQVksRUFBRSxJQVJJO0FBU2xCQyxFQUFBQSxXQUFXLEVBQUU7QUFDVEMsSUFBQUEsTUFBTSxFQUFFLElBREM7QUFFVEMsSUFBQUEsTUFBTSxFQUFFLElBRkM7QUFHVCxjQUFRO0FBSEMsR0FUSztBQWVsQjtBQUNBQyxFQUFBQSxVQWhCa0Isd0JBZ0JMO0FBQ1Q7QUFDQVQsSUFBQUEsYUFBYSxDQUFDSSxVQUFkLEdBQTJCTSxDQUFDLENBQUMsbUJBQUQsQ0FBNUIsQ0FGUyxDQUlUOztBQUNBVixJQUFBQSxhQUFhLENBQUNXLGdCQUFkO0FBQ0gsR0F0QmlCOztBQXdCbEI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFB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LENBQTRCZ0gsUUFBNUIsQ0FBcUMsZUFBckMsRUFGK0IsQ0FJL0I7O0FBQ0F2RyxJQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUNLTSxXQURMLENBQ2lCLFdBRGpCLEVBRUtKLFFBRkwsQ0FFYyxpQkFGZCxFQUwrQixDQVMvQjs7QUFDQUYsSUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUJnSixJQUF6Qjs7QUFFQSxRQUFJUCxTQUFKLEVBQWU7QUFDWCxVQUFNRSxLQUFLLEdBQUdDLFFBQVEsQ0FBQ0MsV0FBVCxDQUFxQixPQUFyQixDQUFkO0FBQ0FGLE1BQUFBLEtBQUssQ0FBQ0csU0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQWpELE1BQUFBLE1BQU0sQ0FBQ2tELGFBQVAsQ0FBcUJKLEtBQXJCO0FBQ0g7QUFDSjtBQXBoQmlCLENBQXRCLEMsQ0F1aEJBOztBQUNBM0ksQ0FBQyxDQUFDNEksUUFBRCxDQUFELENBQVlLLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjNKLEVBQUFBLGFBQWEsQ0FBQ1MsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uLCAkICovXG5cbi8qKlxuICogVGhlIGBmaXJld2FsbFRhYmxlYCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxUYWJsZVxuICovXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuICAgIC8vIGpRdWVyeSBlbGVtZW50cyAod2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBET00gY3JlYXRpb24pXG4gICAgJHN0YXR1c1RvZ2dsZTogbnVsbCxcbiAgICAkYWRkTmV3QnV0dG9uOiBudWxsLFxuICAgICRzZXR0aW5nczogbnVsbCxcbiAgICAkY29udGFpbmVyOiBudWxsLFxuICAgIFxuICAgIC8vIERhdGEgZnJvbSBBUElcbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG4gICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgc3RhdHVzOiB0cnVlLFxuICAgICAgICBtb2RpZnk6IHRydWUsXG4gICAgICAgIGRlbGV0ZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGaXJld2FsbERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdEYXRhKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIGRhdGFcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuZmlyZXdhbGxEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIGludGVyZmFjZVxuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5idWlsZEludGVyZmFjZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb21wbGV0ZSBpbnRlcmZhY2UgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGJ1aWxkSW50ZXJmYWNlKGRhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgY29udGFpbmVyXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIHRvZ2dsZVxuICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFN0YXR1c1RvZ2dsZShkYXRhLmZpcmV3YWxsRW5hYmxlZCA9PT0gJzEnKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzdGF0dXNIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb25cbiAgICAgICAgY29uc3Qgc2V0dGluZ3NIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFNldHRpbmdzU2VjdGlvbihkYXRhKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzZXR0aW5nc0h0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IGVsZW1lbnRzXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSA9ICQoJyNzdGF0dXMtdG9nZ2xlJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGFkZE5ld0J1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzZXR0aW5ncyA9ICQoJyNmaXJld2FsbC1zZXR0aW5ncycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHNcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplVUlFbGVtZW50cyhkYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHN0YXR1cyB0b2dnbGUgSFRNTFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlZCAtIFdoZXRoZXIgZmlyZXdhbGwgaXMgZW5hYmxlZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTdGF0dXNUb2dnbGUoZW5hYmxlZCkge1xuICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuc3RhdHVzID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICBjb25zdCBsYWJlbFRleHQgPSBlbmFibGVkID8gZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQgOiBnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQ7XG4gICAgICAgIGNvbnN0IGNoZWNrZWQgPSBlbmFibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94ICR7c3RhdHVzQ2xhc3N9XCIgaWQ9XCJzdGF0dXMtdG9nZ2xlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwic3RhdHVzXCIgaWQ9XCJzdGF0dXNcIiAke2NoZWNrZWR9Lz5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7bGFiZWxUZXh0fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb24gd2l0aCB0YWJsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXR0aW5nc1NlY3Rpb24oZGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiIGlkPVwiZmlyZXdhbGwtc2V0dGluZ3NcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9ja2VyIG5vdGljZSBpZiBhcHBsaWNhYmxlXG4gICAgICAgIGlmIChkYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGREb2NrZXJOb3RpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5ldyBydWxlIGJ1dHRvblxuICAgICAgICBpZiAoZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5XCIgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvblwiIGlkPVwiYWRkLW5ldy1idXR0b25cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJhZGQgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQWRkTmV3UnVsZX08L2E+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgZmlyZXdhbGwgdGFibGVcbiAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkRmlyZXdhbGxUYWJsZShkYXRhLml0ZW1zLCBkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc2VydmljZSBwb3J0IGluZm8gc2NyaXB0XG4gICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZFNlcnZpY2VJbmZvU2NyaXB0KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBEb2NrZXIgZW52aXJvbm1lbnQgbm90aWNlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZERvY2tlck5vdGljZSgpIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIGljb24gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZndfRG9ja2VyRW52aXJvbm1lbnROb3RpY2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlc0luZm99PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBmaXJld2FsbCBydWxlcyB0YWJsZVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHJ1bGVzIC0gQXJyYXkgb2YgZmlyZXdhbGwgcnVsZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIENvbXBsZXRlIGRhdGEgb2JqZWN0IHdpdGggbWV0YWRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkRmlyZXdhbGxUYWJsZShydWxlcywgZGF0YSkge1xuICAgICAgICBpZiAoIXJ1bGVzIHx8IHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPicgKyBnbG9iYWxUcmFuc2xhdGUuZndfTm9SdWxlc0NvbmZpZ3VyZWQgKyAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnPHRhYmxlIGNsYXNzPVwidWkgc2VsZWN0YWJsZSB2ZXJ5IGJhc2ljIGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIiBpZD1cImZpcmV3YWxsLXRhYmxlXCI+JztcblxuICAgICAgICAvLyBCdWlsZCBoZWFkZXJcbiAgICAgICAgaHRtbCArPSAnPHRoZWFkPjx0cj48dGggY2xhc3M9XCJjb2xsYXBzaW5nXCI+PC90aD48dGg+PC90aD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGNhdGVnb3JpZXMgZnJvbSBmaXJzdCBydWxlXG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBPYmplY3Qua2V5cyhydWxlc1swXS5ydWxlcyB8fCB7fSk7XG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeURhdGEgPSBydWxlc1swXS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBkYXRhLmlzRG9ja2VyICYmICFkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKGNhdGVnb3J5RGF0YS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ZWRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZCcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPHRoIHdpZHRoPVwiMjBweFwiIGNsYXNzPVwiZmlyZXdhbGwtY2F0ZWdvcnkgJHtsaW1pdGVkQ2xhc3N9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXY+PHNwYW4+JHtjYXRlZ29yeURhdGEubmFtZX08L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdGg+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8dGg+PC90aD48L3RyPjwvdGhlYWQ+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGJvZHlcbiAgICAgICAgaHRtbCArPSAnPHRib2R5Pic7XG4gICAgICAgIFxuICAgICAgICBydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkUnVsZVJvdyhydWxlLCBjYXRlZ29yaWVzLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc2luZ2xlIHJ1bGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGUgLSBSdWxlIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjYXRlZ29yaWVzIC0gQ2F0ZWdvcnkga2V5c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQ29tcGxldGUgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkUnVsZVJvdyhydWxlLCBjYXRlZ29yaWVzLCBkYXRhKSB7XG4gICAgICAgIGNvbnN0IHByaW9yaXR5ID0gcnVsZS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkID8gcnVsZS5wcmlvcml0eSA6IDA7XG4gICAgICAgIGNvbnN0IHBlcm1pdCA9IGAke3J1bGUubmV0d29ya30vJHtydWxlLnN1Ym5ldH1gO1xuICAgICAgICBjb25zdCBpc0NhdGNoQWxsID0gKHBlcm1pdCA9PT0gJzAuMC4wLjAvMCcgfHwgcGVybWl0ID09PSAnOjovMCcpO1xuICAgICAgICBjb25zdCBub0RyYWdDbGFzcyA9IGlzQ2F0Y2hBbGwgPyAnIG5vZHJhZyBub2Ryb3AnIDogJyc7XG4gICAgICAgIGxldCBodG1sID0gYDx0ciBjbGFzcz1cInJ1bGUtcm93JHtub0RyYWdDbGFzc31cIiBpZD1cIiR7cnVsZS5pZCB8fCAnJ31cIiBkYXRhLXZhbHVlPVwiJHtwcmlvcml0eX1cIj5gO1xuXG4gICAgICAgIC8vIERyYWcgaGFuZGxlIGNlbGwg4oCUIGVtcHR5IGZvciBjYXRjaC1hbGwgcnVsZXMgKG5vdCBkcmFnZ2FibGUpXG4gICAgICAgIGlmIChpc0NhdGNoQWxsKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dGQgY2xhc3M9XCJjb2xsYXBzaW5nXCI+PC90ZD4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSAnPHRkIGNsYXNzPVwiY29sbGFwc2luZyBkcmFnSGFuZGxlXCI+PGkgY2xhc3M9XCJzb3J0IGdyZXkgaWNvblwiPjwvaT48L3RkPic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXR3b3JrIGFuZCBkZXNjcmlwdGlvbiBjZWxsXG4gICAgICAgIGh0bWwgKz0gJzx0ZD4nO1xuICAgICAgICBodG1sICs9IGAke3J1bGUubmV0d29ya30gLSAke3J1bGUuZGVzY3JpcHRpb259YDtcbiAgICAgICAgaWYgKCFydWxlLmlkKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X05lZWRDb25maWd1cmVSdWxlfTwvc3Bhbj5gO1xuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gJzwvdGQ+JztcbiAgICAgICAgXG4gICAgICAgIC8vIENhdGVnb3J5IGNlbGxzXG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeVJ1bGUgPSBydWxlLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnlSdWxlKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHRkPjwvdGQ+JztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGRhdGEuaXNEb2NrZXIgJiYgIWRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoY2F0ZWdvcnlSdWxlLm5hbWUpO1xuICAgICAgICAgICAgY29uc3QgbGltaXRlZENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkJyA6ICcnO1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gY2F0ZWdvcnlSdWxlLmFjdGlvbiA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCBtYXJrcyAke2xpbWl0ZWRDbGFzc31cIiBkYXRhLWFjdGlvbj1cIiR7YWN0aW9ufVwiIGRhdGEtbmV0d29yaz1cIiR7cnVsZS5uZXR3b3JrfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb25zXCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2FsbG93Jykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib25cIj48L2k+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGF0YS5maXJld2FsbEVuYWJsZWQgPT09ICcxJykge1xuICAgICAgICAgICAgICAgIGlmIChpc0xpbWl0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBhcyBkaXNhYmxlZCBmaXJld2FsbCBmb3IgYmxvY2tlZCBsaW1pdGVkIHNlcnZpY2VzIGluIERvY2tlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjbG9zZSByZWRcIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjb3JuZXIgY2xvc2UgcmVkXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPjwvaT4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiPjwvaT4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L2k+PC90ZD4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFjdGlvbiBidXR0b25zIGNlbGxcbiAgICAgICAgaHRtbCArPSAnPHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+JztcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9uc1wiPic7XG5cbiAgICAgICAgaWYgKCFydWxlLmlkKSB7XG4gICAgICAgICAgICAvLyBOZXcgcnVsZSAtIHVzZSBsaW5rIHdpdGggVVJMIHBhcmFtZXRlcnMgaW5zdGVhZCBvZiBmb3JtXG4gICAgICAgICAgICAvLyBFeHRyYWN0IG5ldHdvcmsgYW5kIHN1Ym5ldCBmcm9tIHJ1bGUubmV0d29yayAoZS5nLiwgXCIwLjAuMC4wLzBcIiAtPiBuZXR3b3JrPTAuMC4wLjAmc3VibmV0PTApXG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrUGFydHMgPSBydWxlLm5ldHdvcmsuc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBuZXR3b3JrUGFydHNbMF0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBzdWJuZXQgPSBuZXR3b3JrUGFydHNbMV0gfHwgJzAnO1xuICAgICAgICAgICAgY29uc3QgcnVsZU5hbWUgPSBydWxlLmRlc2NyaXB0aW9uIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5Q2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLm1vZGlmeSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgIGNvbnN0IHByZWZpbGxVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8/bmV0d29yaz0ke2VuY29kZVVSSUNvbXBvbmVudChuZXR3b3JrKX0mc3VibmV0PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHN1Ym5ldCl9JnJ1bGVOYW1lPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJ1bGVOYW1lKX1gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiR7cHJlZmlsbFVybH1cIiBjbGFzcz1cInVpIGljb24gYmFzaWMgbWluaSBidXR0b24gJHttb2RpZnlDbGFzc31cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT48L2E+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBkaXNhYmxlZCBidXR0b25cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcnVsZSBidXR0b25zXG4gICAgICAgICAgICBjb25zdCBtb2RpZnlDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5ID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtydWxlLmlkfVwiIGA7XG4gICAgICAgICAgICBodG1sICs9IGBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWQgJHttb2RpZnlDbGFzc31cIiBgO1xuICAgICAgICAgICAgaHRtbCArPSBgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+PC9hPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChydWxlLnBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBkaXNhYmxlZCBidXR0b25cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuZGVsZXRlID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkICR7ZGVsZXRlQ2xhc3N9XCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBkYXRhLXZhbHVlPVwiJHtydWxlLmlkfVwiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5gO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzZXJ2aWNlIGluZm8gc2NyaXB0IHRhZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdChkYXRhKSB7XG4gICAgICAgIC8vIENvbGxlY3QgcG9ydCBpbmZvcm1hdGlvbiBmcm9tIHJ1bGVzXG4gICAgICAgIGNvbnN0IHNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICBjb25zdCBzZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhLml0ZW1zICYmIGRhdGEuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZmlyc3RSdWxlID0gZGF0YS5pdGVtc1swXTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGZpcnN0UnVsZS5ydWxlcyB8fCB7fSkuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnVsZSA9IGZpcnN0UnVsZS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICAgICAgc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5XSA9IHJ1bGUucG9ydHMgfHwgW107XG4gICAgICAgICAgICAgICAgc2VydmljZU5hbWVNYXBwaW5nW3J1bGUubmFtZV0gPSBjYXRlZ29yeTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPHNjcmlwdD5cbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0gJHtKU09OLnN0cmluZ2lmeShzZXJ2aWNlUG9ydEluZm8pfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0gJHtKU09OLnN0cmluZ2lmeShzZXJ2aWNlTmFtZU1hcHBpbmcpfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSAke2RhdGEuaXNEb2NrZXIgPyAndHJ1ZScgOiAnZmFsc2UnfTtcbiAgICAgICAgICAgIDwvc2NyaXB0PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHMgYWZ0ZXIgRE9NIGNyZWF0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZvciBjb250ZXh0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJRWxlbWVudHMoZGF0YSkge1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCByZW9yZGVyaW5nIGZvciBwcmlvcml0eVxuICAgICAgICAkKCcjZmlyZXdhbGwtdGFibGUgdGJvZHknKS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZpcmV3YWxsVGFibGUuY2JPbkRyb3AsXG4gICAgICAgICAgICBvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93JyxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkb3VibGUtY2xpY2sgaGFuZGxlciBmb3IgZHluYW1pY2FsbHkgY3JlYXRlZCByb3dzXG4gICAgICAgIC8vIEV4Y2x1ZGUgbGFzdCBjZWxsIHdpdGggYWN0aW9uIGJ1dHRvbnMgdG8gcHJldmVudCBhY2NpZGVudGFsIG5hdmlnYXRpb24gb24gZGVsZXRlIGJ1dHRvbiBjbGlja3NcbiAgICAgICAgJCgnLnJ1bGUtcm93IHRkOm5vdCg6bGFzdC1jaGlsZCknKS5vZmYoJ2RibGNsaWNrJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtpZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExldCBkZWxldGUtc29tZXRoaW5nLmpzIGhhbmRsZSB0aGUgZmlyc3QgY2xpY2ssIHdlIGp1c3QgcHJldmVudCBkZWZhdWx0IG5hdmlnYXRpb25cbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZS50d28tc3RlcHMtZGVsZXRlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgLy8gRG9uJ3Qgc3RvcCBwcm9wYWdhdGlvbiAtIGFsbG93IGRlbGV0ZS1zb21ldGhpbmcuanMgdG8gd29ya1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAtIHdvcmtzIHdpdGggdHdvLXN0ZXBzLWRlbGV0ZSBsb2dpY1xuICAgICAgICAvLyBUaGlzIHdpbGwgYmUgdHJpZ2dlcmVkIGFmdGVyIGRlbGV0ZS1zb21ldGhpbmcuanMgcmVtb3ZlcyB0aGUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzc1xuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBGaXJld2FsbEFQSS5kZWxldGVSZWNvcmQocnVsZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCBkYXRhIHRvIHJlZnJlc2ggdGhlIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUubG9hZEZpcmV3YWxsRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZT8ubWVzc2FnZXMgfHwgZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yRGVsZXRpbmdSdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaWYgZGVsZXRpb24gZmFpbGVkXG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ3R3by1zdGVwcy1kZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2Nsb3NlJykuYWRkQ2xhc3MoJ3RyYXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldHVwIGNoZWNrYm94IHRvIGVuYWJsZSBvciBkaXNhYmxlIHRoZSBmaXJld2FsbFxuICAgICAgICBpZiAoZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlKSB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGVcbiAgICAgICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgICAgICBvbkNoZWNrZWQ6IGZpcmV3YWxsVGFibGUuZW5hYmxlRmlyZXdhbGwsXG4gICAgICAgICAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmaXJld2FsbFRhYmxlLmRpc2FibGVGaXJld2FsbCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIGVkaXQvZGVsZXRlIGJ1dHRvbnNcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBEb2NrZXItc3BlY2lmaWMgVUkgZWxlbWVudHMgd2l0aCBkYXRhIGNvbnRleHRcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplRG9ja2VyVUkoZGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvLyBJbml0aWFsaXplIERvY2tlci1zcGVjaWZpYyBVSSBlbGVtZW50c1xuICAgIGluaXRpYWxpemVEb2NrZXJVSShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgcG9ydCBpbmZvcm1hdGlvblxuICAgICAgICBpZiAoIXdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gfHwgIXdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWxsIHNlcnZpY2UgY2VsbHMgaW4gdGhlIHRhYmxlXG4gICAgICAgICQoJ3RkLm1hcmtzJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjZWxsID0gJCh0aGlzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCBzZXJ2aWNlIG5hbWUgZnJvbSB0aGUgaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBjb2x1bW5JbmRleCA9ICRjZWxsLmluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyQ2VsbCA9ICRjZWxsLmNsb3Nlc3QoJ3RhYmxlJykuZmluZCgndGhlYWQgdGgnKS5lcShjb2x1bW5JbmRleCk7XG4gICAgICAgICAgICBjb25zdCBzZXJ2aWNlTmFtZSA9ICRoZWFkZXJDZWxsLmZpbmQoJ3NwYW4nKS50ZXh0KCkgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzZXJ2aWNlTmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgY2F0ZWdvcnkga2V5IGZyb20gdGhlIGRpc3BsYXkgbmFtZVxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5S2V5ID0gd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZ1tzZXJ2aWNlTmFtZV0gfHwgc2VydmljZU5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5S2V5XSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2VsbC5hdHRyKCdkYXRhLWFjdGlvbicpIHx8ICdhbGxvdyc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9ICRjZWxsLmF0dHIoJ2RhdGEtbmV0d29yaycpIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRjZWxsLmhhc0NsYXNzKCdkb2NrZXItbGltaXRlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRG9ja2VyID0gZGF0YSA/IGRhdGEuaXNEb2NrZXIgOiB3aW5kb3cuaXNEb2NrZXI7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgdG9vbHRpcCBjb250ZW50IHVzaW5nIHVuaWZpZWQgZ2VuZXJhdG9yXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnlLZXksXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yayxcbiAgICAgICAgICAgICAgICAgICAgaXNEb2NrZXIsXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCxcbiAgICAgICAgICAgICAgICAgICAgcG9ydEluZm8sXG4gICAgICAgICAgICAgICAgICAgIGlzRG9ja2VyICYmIGlzTGltaXRlZCAvLyBTaG93IGNvcHkgYnV0dG9uIGZvciBEb2NrZXIgbGltaXRlZCBzZXJ2aWNlc1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy5pbml0aWFsaXplVG9vbHRpcCgkY2VsbCwge1xuICAgICAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gYSBmaXJld2FsbCBydWxlIHJvdyBpcyBkcm9wcGVkIGFmdGVyIGRyYWdcbiAgICAgKiBTZW5kcyB1cGRhdGVkIHByaW9yaXRpZXMgdG8gdGhlIEFQSVxuICAgICAqL1xuICAgIGNiT25Ecm9wKCkge1xuICAgICAgICBsZXQgcHJpb3JpdHlXYXNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHByaW9yaXR5RGF0YSA9IHt9O1xuXG4gICAgICAgICQoJyNmaXJld2FsbC10YWJsZSB0Ym9keSB0cicpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCFydWxlSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFNraXAgcm93cyB3aXRob3V0IElEICh1bnNhdmVkIHJ1bGVzKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb2xkUHJpb3JpdHkgPSBwYXJzZUludCgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpLCAxMCk7XG4gICAgICAgICAgICBjb25zdCBuZXdQcmlvcml0eSA9IGluZGV4ICsgMTtcblxuICAgICAgICAgICAgaWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuICAgICAgICAgICAgICAgIHByaW9yaXR5V2FzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHlEYXRhW3J1bGVJZF0gPSBuZXdQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHByaW9yaXR5V2FzQ2hhbmdlZCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRhdGEtdmFsdWUgYXR0cmlidXRlcyBpbW1lZGlhdGVseSB0byByZWZsZWN0IG5ldyBwb3NpdGlvbnNcbiAgICAgICAgICAgICQoJyNmaXJld2FsbC10YWJsZSB0Ym9keSB0cicpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignZGF0YS12YWx1ZScsIGluZGV4ICsgMSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuY2hhbmdlUHJpb3JpdHkocHJpb3JpdHlEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXZlcnQgb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBFbmFibGUgdGhlIGZpcmV3YWxsIGJ5IG1ha2luZyBhbiBIVFRQIHJlcXVlc3QgdG8gdGhlIHNlcnZlci5cbiAgICBlbmFibGVGaXJld2FsbCgpIHtcbiAgICAgICAgRmlyZXdhbGxBUEkuZW5hYmxlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gRGlzYWJsZSB0aGUgZmlyZXdhbGwgYnkgbWFraW5nIGFuIEhUVFAgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICAgIGRpc2FibGVGaXJld2FsbCgpIHtcbiAgICAgICAgRmlyZXdhbGxBUEkuZGlzYWJsZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRW5hYmxlZCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIENhbGxiYWNrIGFmdGVyIHRoZSBmaXJld2FsbCBoYXMgYmVlbiBlbmFibGVkLlxuICAgIGNiQWZ0ZXJFbmFibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igc3VwcG9ydGVkIHNlcnZpY2VzLCBjaGFuZ2UgZ3JlZW4gY2hlY2ttYXJrcyB0byByZWQgY3Jvc3Nlc1xuICAgICAgICAkKCd0ZC5tYXJrczpub3QoLmRvY2tlci1saW1pdGVkKSBpLmljb24uY2hlY2ttYXJrLmdyZWVuW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjaGVja21hcmsgZ3JlZW4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjbG9zZSByZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBsaW1pdGVkIHNlcnZpY2VzIGluIERvY2tlciwga2VlcCBncmVlbiBjaGVja21hcmsgYnV0IGhpZGUgY29ybmVyIGNsb3NlXG4gICAgICAgICQoJ3RkLmRvY2tlci1saW1pdGVkIGkuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgYWxsIG90aGVyIHNlcnZpY2VzLCBoaWRlIGNvcm5lciBjbG9zZVxuICAgICAgICAkKCd0ZC5tYXJrczpub3QoLmRvY2tlci1saW1pdGVkKSBpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuXG4gICAgICAgIGlmIChzZW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIENhbGxiYWNrIGFmdGVyIHRoZSBmaXJld2FsbCBoYXMgYmVlbiBkaXNhYmxlZC5cbiAgICBjYkFmdGVyRGlzYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBhbGwgc2VydmljZXMsIGNoYW5nZSByZWQgY3Jvc3NlcyB0byBncmVlbiBjaGVja21hcmtzXG4gICAgICAgICQoJ2kuaWNvbi5jbG9zZS5yZWRbZGF0YS12YWx1ZT1cIm9mZlwiXScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlIHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBjb3JuZXIgY2xvc2UgZm9yIGFsbCBzZXJ2aWNlcyB3aGVuIGZpcmV3YWxsIGlzIGRpc2FibGVkXG4gICAgICAgICQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplKCk7XG59KTsiXX0=