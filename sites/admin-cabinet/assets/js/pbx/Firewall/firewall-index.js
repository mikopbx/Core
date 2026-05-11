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

/* global globalRootUrl, globalTranslate, firewallTooltips, FirewallAPI, SystemAPI, UserMessage, SecurityUtils, SemanticLocalization, $ */

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
    } // Bouncer banner: only when we know the local firewall path is blind
    // (Docker bridge AND remote_addr is hidden behind docker0 gateway).
    // Surfaces the external-bouncer workflow as a CTA so junior admins do not
    // need to find the documentation page on their own.


    if (data.dockerNetworkMode === 'bridge' && data.clientIpVisible === false) {
      html += firewallTable.buildBouncerBanner();
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
   * Build the "Docker bridge — external bouncer needed" banner.
   *
   * Only shown when GetListAction reports `dockerNetworkMode === 'bridge'`
   * and `clientIpVisible === false`. The "Check my IP visibility" button
   * calls system:checkClientIpVisibility and renders the verdict inline so
   * the admin can confirm the diagnosis without re-loading the page.
   *
   * @returns {string} HTML string
   */
  buildBouncerBanner: function buildBouncerBanner() {
    var title = SecurityUtils.escapeHtml(globalTranslate.fw_BouncerBannerTitle);
    var body = SecurityUtils.escapeHtml(globalTranslate.fw_BouncerBannerBody);
    var cta = SecurityUtils.escapeHtml(globalTranslate.fw_BouncerBannerCta);
    var checkBtn = SecurityUtils.escapeHtml(globalTranslate.fw_CheckIpVisibility);
    var apiKeysUrl = "".concat(globalRootUrl, "api-keys/modify?preset=bouncer");
    return "\n            <div class=\"ui warning icon message\" id=\"firewall-bouncer-banner\">\n                <i class=\"shield icon\"></i>\n                <div class=\"content\">\n                    <div class=\"header\">".concat(title, "</div>\n                    <p>").concat(body, "</p>\n                    <div class=\"ui buttons\">\n                        <a href=\"").concat(apiKeysUrl, "\" class=\"ui orange button\">\n                            <i class=\"key icon\"></i> ").concat(cta, "\n                        </a>\n                        <button class=\"ui basic button\" id=\"check-ip-visibility-button\">\n                            <i class=\"eye icon\"></i> ").concat(checkBtn, "\n                        </button>\n                    </div>\n                    <div id=\"ip-visibility-result\" class=\"ui basic segment\" style=\"display:none;\"></div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Wire the self-check button on the bouncer banner.
   *
   * Called from initializeUIElements after the banner is in the DOM.
   */
  initBouncerBannerHandlers: function initBouncerBannerHandlers() {
    var $btn = $('#check-ip-visibility-button');

    if ($btn.length === 0) {
      return;
    }

    var $result = $('#ip-visibility-result');
    $btn.on('click', function () {
      $btn.addClass('loading disabled');
      $result.hide().empty();
      SystemAPI.checkClientIpVisibility(function (response) {
        $btn.removeClass('loading disabled');

        if (!response || response.result !== true || !response.data) {
          $result.html("<div class=\"ui red message\">".concat(SecurityUtils.escapeHtml(globalTranslate.fw_ErrorLoadingData), "</div>")).show();
          return;
        }

        $result.html(firewallTable.renderClientIpVerdict(response.data)).show();
      });
    });
  },

  /**
   * Render the verdict + raw header data returned by the self-check endpoint.
   *
   * @param {Object} data Self-check payload (remote_addr / verdict / etc.)
   * @returns {string} HTML
   */
  renderClientIpVerdict: function renderClientIpVerdict(data) {
    var remote = SecurityUtils.escapeHtml(data.remote_addr || '');
    var xff = data.x_forwarded_for ? SecurityUtils.escapeHtml(String(data.x_forwarded_for)) : '—';
    var xRealIp = data.x_real_ip ? SecurityUtils.escapeHtml(String(data.x_real_ip)) : '—';
    var mode = SecurityUtils.escapeHtml(data.container_mode || '');
    var verdictKey = 'fw_CheckIpVisibilityResultVisible';
    var color = 'green';

    if (data.verdict === 'ip_not_visible') {
      verdictKey = 'fw_CheckIpVisibilityResultNotVisible';
      color = 'red';
    } else if (data.verdict === 'proxy_detected') {
      verdictKey = 'fw_CheckIpVisibilityResultProxy';
      color = 'yellow';
    }

    var verdictText = SecurityUtils.escapeHtml(globalTranslate[verdictKey] || verdictKey);
    return "\n            <div class=\"ui ".concat(color, " message\">\n                <div class=\"header\"><i class=\"info circle icon\"></i> ").concat(verdictText, "</div>\n                <div class=\"ui list\">\n                    <div class=\"item\"><b>remote_addr:</b> <code>").concat(remote, "</code></div>\n                    <div class=\"item\"><b>X-Forwarded-For:</b> <code>").concat(xff, "</code></div>\n                    <div class=\"item\"><b>X-Real-IP:</b> <code>").concat(xRealIp, "</code></div>\n                    <div class=\"item\"><b>container_mode:</b> <code>").concat(mode, "</code></div>\n                </div>\n            </div>\n        ");
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
    // Bouncer banner self-check button (only rendered in Docker bridge with
    // hidden client IP — initialization is a no-op when the button is absent).
    firewallTable.initBouncerBannerHandlers(); // Initialize drag-and-drop reordering for priority

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsImlzRG9ja2VyIiwiYnVpbGREb2NrZXJOb3RpY2UiLCJkb2NrZXJOZXR3b3JrTW9kZSIsImNsaWVudElwVmlzaWJsZSIsImJ1aWxkQm91bmNlckJhbm5lciIsImdsb2JhbFJvb3RVcmwiLCJmd19BZGROZXdSdWxlIiwiYnVpbGRBbGxvd015SXBCdXR0b24iLCJidWlsZEZpcmV3YWxsVGFibGUiLCJpdGVtcyIsImJ1aWxkU2VydmljZUluZm9TY3JpcHQiLCJjbGllbnRJcCIsImNsaWVudElwUnVsZUlkIiwicnVsZU5hbWUiLCJmd19NeUN1cnJlbnRJcFJ1bGVOYW1lIiwidXJsIiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJmd19BbGxvd015SXBCdXR0b24iLCJmd19Eb2NrZXJFbnZpcm9ubWVudE5vdGljZSIsImZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlc0luZm8iLCJ0aXRsZSIsImZ3X0JvdW5jZXJCYW5uZXJUaXRsZSIsImJvZHkiLCJmd19Cb3VuY2VyQmFubmVyQm9keSIsImN0YSIsImZ3X0JvdW5jZXJCYW5uZXJDdGEiLCJjaGVja0J0biIsImZ3X0NoZWNrSXBWaXNpYmlsaXR5IiwiYXBpS2V5c1VybCIsImluaXRCb3VuY2VyQmFubmVySGFuZGxlcnMiLCIkYnRuIiwibGVuZ3RoIiwiJHJlc3VsdCIsIm9uIiwiaGlkZSIsIlN5c3RlbUFQSSIsImNoZWNrQ2xpZW50SXBWaXNpYmlsaXR5Iiwic2hvdyIsInJlbmRlckNsaWVudElwVmVyZGljdCIsInJlbW90ZSIsInJlbW90ZV9hZGRyIiwieGZmIiwieF9mb3J3YXJkZWRfZm9yIiwiU3RyaW5nIiwieFJlYWxJcCIsInhfcmVhbF9pcCIsIm1vZGUiLCJjb250YWluZXJfbW9kZSIsInZlcmRpY3RLZXkiLCJjb2xvciIsInZlcmRpY3QiLCJ2ZXJkaWN0VGV4dCIsInJ1bGVzIiwiZndfTm9SdWxlc0NvbmZpZ3VyZWQiLCJjYXRlZ29yaWVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsImNhdGVnb3J5RGF0YSIsImlzTGltaXRlZCIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiaW5jbHVkZXMiLCJuYW1lIiwibGltaXRlZENsYXNzIiwicnVsZSIsImJ1aWxkUnVsZVJvdyIsInByaW9yaXR5IiwidW5kZWZpbmVkIiwicGVybWl0IiwibmV0d29yayIsInN1Ym5ldCIsImlzQ2F0Y2hBbGwiLCJub0RyYWdDbGFzcyIsImNsaWVudElwQ2xhc3MiLCJpc0NsaWVudElwIiwiaWQiLCJoaW50IiwiZndfVGhpc0lzWW91ckN1cnJlbnRJcEhpbnQiLCJkZXNjcmlwdGlvbiIsImZ3X05lZWRDb25maWd1cmVSdWxlIiwiY2F0ZWdvcnlSdWxlIiwiYWN0aW9uIiwibmV0d29ya1BhcnRzIiwic3BsaXQiLCJtb2RpZnlDbGFzcyIsInByZWZpbGxVcmwiLCJidF9Ub29sVGlwRWRpdCIsInBlcm1hbmVudCIsImRlbGV0ZUNsYXNzIiwiYnRfVG9vbFRpcERlbGV0ZSIsInNlcnZpY2VQb3J0SW5mbyIsInNlcnZpY2VOYW1lTWFwcGluZyIsImZpcnN0UnVsZSIsInBvcnRzIiwiSlNPTiIsInN0cmluZ2lmeSIsInRhYmxlRG5EIiwib25Ecm9wIiwiY2JPbkRyb3AiLCJvbkRyYWdDbGFzcyIsImRyYWdIYW5kbGUiLCJvZmYiLCJlIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsInJ1bGVJZCIsImRlbGV0ZVJlY29yZCIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZndfRXJyb3JEZWxldGluZ1J1bGUiLCJmaW5kIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJlbmFibGVGaXJld2FsbCIsIm9uVW5jaGVja2VkIiwiZGlzYWJsZUZpcmV3YWxsIiwicG9wdXAiLCJpbml0aWFsaXplRG9ja2VyVUkiLCJlYWNoIiwiJGNlbGwiLCJjb2x1bW5JbmRleCIsImluZGV4IiwiJGhlYWRlckNlbGwiLCJlcSIsInNlcnZpY2VOYW1lIiwidGV4dCIsImNhdGVnb3J5S2V5IiwicG9ydEluZm8iLCJoYXNDbGFzcyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJwcmlvcml0eVdhc0NoYW5nZWQiLCJwcmlvcml0eURhdGEiLCJvYmoiLCJvbGRQcmlvcml0eSIsInBhcnNlSW50IiwibmV3UHJpb3JpdHkiLCJjaGFuZ2VQcmlvcml0eSIsImVuYWJsZSIsImNiQWZ0ZXJFbmFibGVkIiwiY2JBZnRlckRpc2FibGVkIiwiZGlzYWJsZSIsInNlbmRFdmVudCIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxhQUFhLEdBQUc7QUFDbEI7QUFDQUMsRUFBQUEsYUFBYSxFQUFFLElBRkc7QUFHbEJDLEVBQUFBLGFBQWEsRUFBRSxJQUhHO0FBSWxCQyxFQUFBQSxTQUFTLEVBQUUsSUFKTztBQUtsQkMsRUFBQUEsVUFBVSxFQUFFLElBTE07QUFPbEI7QUFDQUMsRUFBQUEsWUFBWSxFQUFFLElBUkk7QUFTbEJDLEVBQUFBLFdBQVcsRUFBRTtBQUNUQyxJQUFBQSxNQUFNLEVBQUUsSUFEQztBQUVUQyxJQUFBQSxNQUFNLEVBQUUsSUFGQztBQUdULGNBQVE7QUFIQyxHQVRLO0FBZWxCO0FBQ0FDLEVBQUFBLFVBaEJrQix3QkFnQkw7QUFDVDtBQUNBVCxJQUFBQSxhQUFhLENBQUNJLFVBQWQsR0FBMkJNLENBQUMsQ0FBQyxtQkFBRCxDQUE1QixDQUZTLENBSVQ7O0FBQ0FWLElBQUFBLGFBQWEsQ0FBQ1csZ0JBQWQ7QUFDSCxHQXRCaUI7O0FBd0JsQjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsZ0JBM0JrQiw4QkEyQkM7QUFDZjtBQUNBWCxJQUFBQSxhQUFhLENBQUNJLFVBQWQsQ0FBeUJRLFFBQXpCLENBQWtDLFNBQWxDO0FBRUFDLElBQUFBLFdBQVcsQ0FBQ0MsT0FBWixDQUFvQixVQUFDQyxRQUFELEVBQWM7QUFDOUJmLE1BQUFBLGFBQWEsQ0FBQ0ksVUFBZCxDQUF5QlksV0FBekIsQ0FBcUMsU0FBckM7O0FBRUEsVUFBSSxDQUFDRCxRQUFELElBQWEsQ0FBQ0EsUUFBUSxDQUFDRSxNQUEzQixFQUFtQztBQUMvQkMsUUFBQUEsV0FBVyxD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U0FBTixDQUFnQixtQkFBaEIsRUFBcUMsS0FBckMsRUFBNEMsSUFBNUM7QUFDQWhELE1BQUFBLE1BQU0sQ0FBQ2lELGFBQVAsQ0FBcUJKLEtBQXJCO0FBQ0g7QUFDSjtBQTFxQmlCLENBQXRCLEMsQ0E2cUJBOztBQUNBdkwsQ0FBQyxDQUFDd0wsUUFBRCxDQUFELENBQVlJLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnRNLEVBQUFBLGFBQWEsQ0FBQ1MsVUFBZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgU3lzdGVtQVBJLCBVc2VyTWVzc2FnZSwgU2VjdXJpdHlVdGlscywgU2VtYW50aWNMb2NhbGl6YXRpb24sICQgKi9cblxuLyoqXG4gKiBUaGUgYGZpcmV3YWxsVGFibGVgIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGaXJld2FsbCBzeXN0ZW0uXG4gKlxuICogQG1vZHVsZSBmaXJld2FsbFRhYmxlXG4gKi9cbmNvbnN0IGZpcmV3YWxsVGFibGUgPSB7XG4gICAgLy8galF1ZXJ5IGVsZW1lbnRzICh3aWxsIGJlIGluaXRpYWxpemVkIGFmdGVyIERPTSBjcmVhdGlvbilcbiAgICAkc3RhdHVzVG9nZ2xlOiBudWxsLFxuICAgICRhZGROZXdCdXR0b246IG51bGwsXG4gICAgJHNldHRpbmdzOiBudWxsLFxuICAgICRjb250YWluZXI6IG51bGwsXG4gICAgXG4gICAgLy8gRGF0YSBmcm9tIEFQSVxuICAgIGZpcmV3YWxsRGF0YTogbnVsbCxcbiAgICBwZXJtaXNzaW9uczoge1xuICAgICAgICBzdGF0dXM6IHRydWUsXG4gICAgICAgIG1vZGlmeTogdHJ1ZSxcbiAgICAgICAgZGVsZXRlOiB0cnVlXG4gICAgfSxcblxuICAgIC8vIFRoaXMgbWV0aG9kIGluaXRpYWxpemVzIHRoZSBGaXJld2FsbCBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBHZXQgY29udGFpbmVyXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lciA9ICQoJyNmaXJld2FsbC1jb250ZW50Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBmaXJld2FsbFRhYmxlLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZpcmV3YWxsRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0TGlzdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yTG9hZGluZ0RhdGEpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgZGF0YVxuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5maXJld2FsbERhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBCdWlsZCB0aGUgaW50ZXJmYWNlXG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLmJ1aWxkSW50ZXJmYWNlKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvbXBsZXRlIGludGVyZmFjZSBmcm9tIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgYnVpbGRJbnRlcmZhY2UoZGF0YSkge1xuICAgICAgICAvLyBDbGVhciBjb250YWluZXJcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzdGF0dXMgdG9nZ2xlXG4gICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBmaXJld2FsbFRhYmxlLmJ1aWxkU3RhdHVzVG9nZ2xlKGRhdGEuZmlyZXdhbGxFbmFibGVkID09PSAnMScpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYXBwZW5kKHN0YXR1c0h0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc2V0dGluZ3Mgc2VjdGlvblxuICAgICAgICBjb25zdCBzZXR0aW5nc0h0bWwgPSBmaXJld2FsbFRhYmxlLmJ1aWxkU2V0dGluZ3NTZWN0aW9uKGRhdGEpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYXBwZW5kKHNldHRpbmdzSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBqUXVlcnkgZWxlbWVudHNcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlID0gJCgnI3N0YXR1cy10b2dnbGUnKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kYWRkTmV3QnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHNldHRpbmdzID0gJCgnI2ZpcmV3YWxsLXNldHRpbmdzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFsbCBVSSBlbGVtZW50c1xuICAgICAgICBmaXJld2FsbFRhYmxlLmluaXRpYWxpemVVSUVsZW1lbnRzKGRhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc3RhdHVzIHRvZ2dsZSBIVE1MXG4gICAgICogQHBhcmFtIHtib29sZWFufSBlbmFibGVkIC0gV2hldGhlciBmaXJld2FsbCBpcyBlbmFibGVkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZFN0YXR1c1RvZ2dsZShlbmFibGVkKSB7XG4gICAgICAgIGNvbnN0IHN0YXR1c0NsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5zdGF0dXMgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgIGNvbnN0IGxhYmVsVGV4dCA9IGVuYWJsZWQgPyBnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRW5hYmxlZCA6IGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNEaXNhYmxlZDtcbiAgICAgICAgY29uc3QgY2hlY2tlZCA9IGVuYWJsZWQgPyAnY2hlY2tlZCcgOiAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggJHtzdGF0dXNDbGFzc31cIiBpZD1cInN0YXR1cy10b2dnbGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJzdGF0dXNcIiBpZD1cInN0YXR1c1wiICR7Y2hlY2tlZH0vPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtsYWJlbFRleHR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc2V0dGluZ3Mgc2VjdGlvbiB3aXRoIHRhYmxlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZFNldHRpbmdzU2VjdGlvbihkYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBzZWdtZW50XCIgaWQ9XCJmaXJld2FsbC1zZXR0aW5nc1wiPic7XG5cbiAgICAgICAgLy8gRG9ja2VyIG5vdGljZSBpZiBhcHBsaWNhYmxlXG4gICAgICAgIGlmIChkYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGREb2NrZXJOb3RpY2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJvdW5jZXIgYmFubmVyOiBvbmx5IHdoZW4gd2Uga25vdyB0aGUgbG9jYWwgZmlyZXdhbGwgcGF0aCBpcyBibGluZFxuICAgICAgICAvLyAoRG9ja2VyIGJyaWRnZSBBTkQgcmVtb3RlX2FkZHIgaXMgaGlkZGVuIGJlaGluZCBkb2NrZXIwIGdhdGV3YXkpLlxuICAgICAgICAvLyBTdXJmYWNlcyB0aGUgZXh0ZXJuYWwtYm91bmNlciB3b3JrZmxvdyBhcyBhIENUQSBzbyBqdW5pb3IgYWRtaW5zIGRvIG5vdFxuICAgICAgICAvLyBuZWVkIHRvIGZpbmQgdGhlIGRvY3VtZW50YXRpb24gcGFnZSBvbiB0aGVpciBvd24uXG4gICAgICAgIGlmIChkYXRhLmRvY2tlck5ldHdvcmtNb2RlID09PSAnYnJpZGdlJyAmJiBkYXRhLmNsaWVudElwVmlzaWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZEJvdW5jZXJCYW5uZXIoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBuZXcgcnVsZSBidXR0b25cbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5KSB7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeVwiIGNsYXNzPVwidWkgYmx1ZSBidXR0b25cIiBpZD1cImFkZC1uZXctYnV0dG9uXCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiYWRkIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FkZE5ld1J1bGV9PC9hPmA7XG5cbiAgICAgICAgICAgIC8vIFwiQWxsb3cgbXkgY3VycmVudCBJUFwiIGhlbHBlciBidXR0b24gKG9ubHkgd2hlbiBjbGllbnQgSVAgaXMgcHVibGljIEFORCBub3QgeWV0IGNvdmVyZWQgYnkgYSBob3N0IHJ1bGUpXG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRBbGxvd015SXBCdXR0b24oZGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBmaXJld2FsbCB0YWJsZVxuICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRGaXJld2FsbFRhYmxlKGRhdGEuaXRlbXMsIGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzZXJ2aWNlIHBvcnQgaW5mbyBzY3JpcHRcbiAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkU2VydmljZUluZm9TY3JpcHQoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIFwiQWxsb3cgbXkgY3VycmVudCBJUFwiIGhlbHBlciBidXR0b24uXG4gICAgICogUmVuZGVyZWQgbmV4dCB0byAjYWRkLW5ldy1idXR0b24gb25seSBpZiB0aGUgYmFja2VuZCByZXBvcnRzIGEgcHVibGljIGNsaWVudCBJUFxuICAgICAqIGFuZCBubyBleGlzdGluZyBydWxlIGFscmVhZHkgY292ZXJzIGl0IGFzIGEgaG9zdCAoLzMyIGZvciBJUHY0LCAvMTI4IGZvciBJUHY2KS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIChlbXB0eSBpZiBjb25kaXRpb25zIG5vdCBtZXQpXG4gICAgICovXG4gICAgYnVpbGRBbGxvd015SXBCdXR0b24oZGF0YSkge1xuICAgICAgICBjb25zdCBjbGllbnRJcCA9IGRhdGEuY2xpZW50SXAgfHwgJyc7XG4gICAgICAgIGlmICghY2xpZW50SXAgfHwgZGF0YS5jbGllbnRJcFJ1bGVJZCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQmFja2VuZCBhbHJlYWR5IHJlc3RyaWN0cyBjbGllbnRJcCB0byBhIHB1YmxpYyBJUHY0IGxpdGVyYWwg4oCUIC8zMiBpcyB0aGUgb25seSBob3N0IG1hc2suXG4gICAgICAgIGNvbnN0IHJ1bGVOYW1lID0gZ2xvYmFsVHJhbnNsYXRlLmZ3X015Q3VycmVudElwUnVsZU5hbWUgfHwgJ015IGN1cnJlbnQgSVAnO1xuICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS9gXG4gICAgICAgICAgICArIGA/bmV0d29yaz0ke2VuY29kZVVSSUNvbXBvbmVudChjbGllbnRJcCl9YFxuICAgICAgICAgICAgKyBgJnN1Ym5ldD0zMmBcbiAgICAgICAgICAgICsgYCZydWxlTmFtZT0ke2VuY29kZVVSSUNvbXBvbmVudChydWxlTmFtZSl9YDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGEgaHJlZj1cIiR7dXJsfVwiIGNsYXNzPVwidWkgZ3JlZW4gYnV0dG9uXCIgaWQ9XCJhbGxvdy1teS1pcC1idXR0b25cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNoaWVsZCBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfQWxsb3dNeUlwQnV0dG9uKX0gKCR7Y2xpZW50SXB9KVxuICAgICAgICAgICAgPC9hPlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBEb2NrZXIgZW52aXJvbm1lbnQgbm90aWNlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZERvY2tlck5vdGljZSgpIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIGljb24gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlc0luZm8pfTwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB0aGUgXCJEb2NrZXIgYnJpZGdlIOKAlCBleHRlcm5hbCBib3VuY2VyIG5lZWRlZFwiIGJhbm5lci5cbiAgICAgKlxuICAgICAqIE9ubHkgc2hvd24gd2hlbiBHZXRMaXN0QWN0aW9uIHJlcG9ydHMgYGRvY2tlck5ldHdvcmtNb2RlID09PSAnYnJpZGdlJ2BcbiAgICAgKiBhbmQgYGNsaWVudElwVmlzaWJsZSA9PT0gZmFsc2VgLiBUaGUgXCJDaGVjayBteSBJUCB2aXNpYmlsaXR5XCIgYnV0dG9uXG4gICAgICogY2FsbHMgc3lzdGVtOmNoZWNrQ2xpZW50SXBWaXNpYmlsaXR5IGFuZCByZW5kZXJzIHRoZSB2ZXJkaWN0IGlubGluZSBzb1xuICAgICAqIHRoZSBhZG1pbiBjYW4gY29uZmlybSB0aGUgZGlhZ25vc2lzIHdpdGhvdXQgcmUtbG9hZGluZyB0aGUgcGFnZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRCb3VuY2VyQmFubmVyKCkge1xuICAgICAgICBjb25zdCB0aXRsZSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfQm91bmNlckJhbm5lclRpdGxlKTtcbiAgICAgICAgY29uc3QgYm9keSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfQm91bmNlckJhbm5lckJvZHkpO1xuICAgICAgICBjb25zdCBjdGEgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0JvdW5jZXJCYW5uZXJDdGEpO1xuICAgICAgICBjb25zdCBjaGVja0J0biA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfQ2hlY2tJcFZpc2liaWxpdHkpO1xuICAgICAgICBjb25zdCBhcGlLZXlzVXJsID0gYCR7Z2xvYmFsUm9vdFVybH1hcGkta2V5cy9tb2RpZnk/cHJlc2V0PWJvdW5jZXJgO1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgaWNvbiBtZXNzYWdlXCIgaWQ9XCJmaXJld2FsbC1ib3VuY2VyLWJhbm5lclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic2hpZWxkIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dGl0bGV9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7Ym9keX08L3A+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBidXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHthcGlLZXlzVXJsfVwiIGNsYXNzPVwidWkgb3JhbmdlIGJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwia2V5IGljb25cIj48L2k+ICR7Y3RhfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJhc2ljIGJ1dHRvblwiIGlkPVwiY2hlY2staXAtdmlzaWJpbGl0eS1idXR0b25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV5ZSBpY29uXCI+PC9pPiAke2NoZWNrQnRufVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiaXAtdmlzaWJpbGl0eS1yZXN1bHRcIiBjbGFzcz1cInVpIGJhc2ljIHNlZ21lbnRcIiBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBXaXJlIHRoZSBzZWxmLWNoZWNrIGJ1dHRvbiBvbiB0aGUgYm91bmNlciBiYW5uZXIuXG4gICAgICpcbiAgICAgKiBDYWxsZWQgZnJvbSBpbml0aWFsaXplVUlFbGVtZW50cyBhZnRlciB0aGUgYmFubmVyIGlzIGluIHRoZSBET00uXG4gICAgICovXG4gICAgaW5pdEJvdW5jZXJCYW5uZXJIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3QgJGJ0biA9ICQoJyNjaGVjay1pcC12aXNpYmlsaXR5LWJ1dHRvbicpO1xuICAgICAgICBpZiAoJGJ0bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkcmVzdWx0ID0gJCgnI2lwLXZpc2liaWxpdHktcmVzdWx0Jyk7XG5cbiAgICAgICAgJGJ0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAkcmVzdWx0LmhpZGUoKS5lbXB0eSgpO1xuXG4gICAgICAgICAgICBTeXN0ZW1BUEkuY2hlY2tDbGllbnRJcFZpc2liaWxpdHkoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgcmVzcG9uc2UucmVzdWx0ICE9PSB0cnVlIHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICRyZXN1bHQuaHRtbChgPGRpdiBjbGFzcz1cInVpIHJlZCBtZXNzYWdlXCI+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yTG9hZGluZ0RhdGEpfTwvZGl2PmApLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkcmVzdWx0Lmh0bWwoZmlyZXdhbGxUYWJsZS5yZW5kZXJDbGllbnRJcFZlcmRpY3QocmVzcG9uc2UuZGF0YSkpLnNob3coKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHRoZSB2ZXJkaWN0ICsgcmF3IGhlYWRlciBkYXRhIHJldHVybmVkIGJ5IHRoZSBzZWxmLWNoZWNrIGVuZHBvaW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgU2VsZi1jaGVjayBwYXlsb2FkIChyZW1vdGVfYWRkciAvIHZlcmRpY3QgLyBldGMuKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUxcbiAgICAgKi9cbiAgICByZW5kZXJDbGllbnRJcFZlcmRpY3QoZGF0YSkge1xuICAgICAgICBjb25zdCByZW1vdGUgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YS5yZW1vdGVfYWRkciB8fCAnJyk7XG4gICAgICAgIGNvbnN0IHhmZiA9IGRhdGEueF9mb3J3YXJkZWRfZm9yID8gU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKFN0cmluZyhkYXRhLnhfZm9yd2FyZGVkX2ZvcikpIDogJ+KAlCc7XG4gICAgICAgIGNvbnN0IHhSZWFsSXAgPSBkYXRhLnhfcmVhbF9pcCA/IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChTdHJpbmcoZGF0YS54X3JlYWxfaXApKSA6ICfigJQnO1xuICAgICAgICBjb25zdCBtb2RlID0gU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEuY29udGFpbmVyX21vZGUgfHwgJycpO1xuXG4gICAgICAgIGxldCB2ZXJkaWN0S2V5ID0gJ2Z3X0NoZWNrSXBWaXNpYmlsaXR5UmVzdWx0VmlzaWJsZSc7XG4gICAgICAgIGxldCBjb2xvciA9ICdncmVlbic7XG4gICAgICAgIGlmIChkYXRhLnZlcmRpY3QgPT09ICdpcF9ub3RfdmlzaWJsZScpIHtcbiAgICAgICAgICAgIHZlcmRpY3RLZXkgPSAnZndfQ2hlY2tJcFZpc2liaWxpdHlSZXN1bHROb3RWaXNpYmxlJztcbiAgICAgICAgICAgIGNvbG9yID0gJ3JlZCc7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS52ZXJkaWN0ID09PSAncHJveHlfZGV0ZWN0ZWQnKSB7XG4gICAgICAgICAgICB2ZXJkaWN0S2V5ID0gJ2Z3X0NoZWNrSXBWaXNpYmlsaXR5UmVzdWx0UHJveHknO1xuICAgICAgICAgICAgY29sb3IgPSAneWVsbG93JztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2ZXJkaWN0VGV4dCA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGVbdmVyZGljdEtleV0gfHwgdmVyZGljdEtleSk7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke2NvbG9yfSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT4gJHt2ZXJkaWN0VGV4dH08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxiPnJlbW90ZV9hZGRyOjwvYj4gPGNvZGU+JHtyZW1vdGV9PC9jb2RlPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxiPlgtRm9yd2FyZGVkLUZvcjo8L2I+IDxjb2RlPiR7eGZmfTwvY29kZT48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj48Yj5YLVJlYWwtSVA6PC9iPiA8Y29kZT4ke3hSZWFsSXB9PC9jb2RlPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxiPmNvbnRhaW5lcl9tb2RlOjwvYj4gPGNvZGU+JHttb2RlfTwvY29kZT48L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgZmlyZXdhbGwgcnVsZXMgdGFibGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBydWxlcyAtIEFycmF5IG9mIGZpcmV3YWxsIHJ1bGVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDb21wbGV0ZSBkYXRhIG9iamVjdCB3aXRoIG1ldGFkYXRhXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZEZpcmV3YWxsVGFibGUocnVsZXMsIGRhdGEpIHtcbiAgICAgICAgaWYgKCFydWxlcyB8fCBydWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnPGRpdiBjbGFzcz1cInVpIG1lc3NhZ2VcIj4nICsgU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19Ob1J1bGVzQ29uZmlndXJlZCkgKyAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnPHRhYmxlIGNsYXNzPVwidWkgc2VsZWN0YWJsZSB2ZXJ5IGJhc2ljIGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIiBpZD1cImZpcmV3YWxsLXRhYmxlXCI+JztcblxuICAgICAgICAvLyBCdWlsZCBoZWFkZXJcbiAgICAgICAgaHRtbCArPSAnPHRoZWFkPjx0cj48dGggY2xhc3M9XCJjb2xsYXBzaW5nXCI+PC90aD48dGg+PC90aD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGNhdGVnb3JpZXMgZnJvbSBmaXJzdCBydWxlXG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBPYmplY3Qua2V5cyhydWxlc1swXS5ydWxlcyB8fCB7fSk7XG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeURhdGEgPSBydWxlc1swXS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSBkYXRhLmlzRG9ja2VyICYmICFkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKGNhdGVnb3J5RGF0YS5uYW1lKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ZWRDbGFzcyA9IGlzTGltaXRlZCA/ICdkb2NrZXItbGltaXRlZCcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPHRoIHdpZHRoPVwiMjBweFwiIGNsYXNzPVwiZmlyZXdhbGwtY2F0ZWdvcnkgJHtsaW1pdGVkQ2xhc3N9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXY+PHNwYW4+JHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoY2F0ZWdvcnlEYXRhLm5hbWUpfTwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC90aD4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzx0aD48L3RoPjwvdHI+PC90aGVhZD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgYm9keVxuICAgICAgICBodG1sICs9ICc8dGJvZHk+JztcbiAgICAgICAgXG4gICAgICAgIHJ1bGVzLmZvckVhY2gocnVsZSA9PiB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRSdWxlUm93KHJ1bGUsIGNhdGVnb3JpZXMsIGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvdGJvZHk+PC90YWJsZT4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzaW5nbGUgcnVsZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcnVsZSAtIFJ1bGUgZGF0YVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNhdGVnb3JpZXMgLSBDYXRlZ29yeSBrZXlzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBDb21wbGV0ZSBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRSdWxlUm93KHJ1bGUsIGNhdGVnb3JpZXMsIGRhdGEpIHtcbiAgICAgICAgY29uc3QgcHJpb3JpdHkgPSBydWxlLnByaW9yaXR5ICE9PSB1bmRlZmluZWQgPyBydWxlLnByaW9yaXR5IDogMDtcbiAgICAgICAgY29uc3QgcGVybWl0ID0gYCR7cnVsZS5uZXR3b3JrfS8ke3J1bGUuc3VibmV0fWA7XG4gICAgICAgIGNvbnN0IGlzQ2F0Y2hBbGwgPSAocGVybWl0ID09PSAnMC4wLjAuMC8wJyB8fCBwZXJtaXQgPT09ICc6Oi8wJyk7XG4gICAgICAgIGNvbnN0IG5vRHJhZ0NsYXNzID0gaXNDYXRjaEFsbCA/ICcgbm9kcmFnIG5vZHJvcCcgOiAnJztcbiAgICAgICAgY29uc3QgY2xpZW50SXBDbGFzcyA9IHJ1bGUuaXNDbGllbnRJcCA/ICcgY2xpZW50LWlwLXJ1bGUnIDogJyc7XG4gICAgICAgIGxldCBodG1sID0gYDx0ciBjbGFzcz1cInJ1bGUtcm93JHtub0RyYWdDbGFzc30ke2NsaWVudElwQ2xhc3N9XCIgaWQ9XCIke3J1bGUuaWQgfHwgJyd9XCIgZGF0YS12YWx1ZT1cIiR7cHJpb3JpdHl9XCI+YDtcblxuICAgICAgICAvLyBEcmFnIGhhbmRsZSBjZWxsIOKAlCBlbXB0eSBmb3IgY2F0Y2gtYWxsIHJ1bGVzIChub3QgZHJhZ2dhYmxlKVxuICAgICAgICBpZiAoaXNDYXRjaEFsbCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPjwvdGQ+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzx0ZCBjbGFzcz1cImNvbGxhcHNpbmcgZHJhZ0hhbmRsZVwiPjxpIGNsYXNzPVwic29ydCBncmV5IGljb25cIj48L2k+PC90ZD4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTmV0d29yayBhbmQgZGVzY3JpcHRpb24gY2VsbFxuICAgICAgICBodG1sICs9ICc8dGQ+JztcbiAgICAgICAgaWYgKHJ1bGUuaXNDbGllbnRJcCkge1xuICAgICAgICAgICAgY29uc3QgaGludCA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfVGhpc0lzWW91ckN1cnJlbnRJcEhpbnQpO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJ1c2VyIGNpcmNsZSBibHVlIGljb24gcG9wdXBlZCBjbGllbnQtaXAtaGludFwiIGRhdGEtY29udGVudD1cIiR7aGludH1cIj48L2k+IGA7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcnVsZS5kZXNjcmlwdGlvbiBpcyBhZG1pbi1jb250cm9sbGVkIGFuZCBzdG9yZWQgaW4gdGhlIERCIHdpdGhvdXQgSFRNTCBzdHJpcHBpbmcg4oCUXG4gICAgICAgIC8vIGVzY2FwZSBpdCAoYW5kIHJ1bGUubmV0d29yayBmb3Igc3ltbWV0cnkpIGJlZm9yZSBpbmplY3RpbmcgaW50byB0aGUgdGFibGUuXG4gICAgICAgIGh0bWwgKz0gYCR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJ1bGUubmV0d29yayl9IC0gJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocnVsZS5kZXNjcmlwdGlvbil9YDtcbiAgICAgICAgaWYgKCFydWxlLmlkKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8YnI+PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19OZWVkQ29uZmlndXJlUnVsZSl9PC9zcGFuPmA7XG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSAnPC90ZD4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2F0ZWdvcnkgY2VsbHNcbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5UnVsZSA9IHJ1bGUucnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeVJ1bGUpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dGQ+PC90ZD4nO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gZGF0YS5pc0RvY2tlciAmJiAhZGF0YS5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcy5pbmNsdWRlcyhjYXRlZ29yeVJ1bGUubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBsaW1pdGVkQ2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSBjYXRlZ29yeVJ1bGUuYWN0aW9uID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIG1hcmtzICR7bGltaXRlZENsYXNzfVwiIGRhdGEtYWN0aW9uPVwiJHthY3Rpb259XCIgZGF0YS1uZXR3b3JrPVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwocnVsZS5uZXR3b3JrKX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uc1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdhbGxvdycpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9uXCI+PC9pPic7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZmlyZXdhbGxFbmFibGVkID09PSAnMScpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNMaW1pdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgYXMgZGlzYWJsZWQgZmlyZXdhbGwgZm9yIGJsb2NrZWQgbGltaXRlZCBzZXJ2aWNlcyBpbiBEb2NrZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIj48L2k+JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2xvc2UgcmVkXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY29ybmVyIGNsb3NlIHJlZFwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj48L2k+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIj48L2k+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9pPjwvdGQ+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBY3Rpb24gYnV0dG9ucyBjZWxsXG4gICAgICAgIGh0bWwgKz0gJzx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnNcIj4nO1xuXG4gICAgICAgIGlmICghcnVsZS5pZCkge1xuICAgICAgICAgICAgLy8gTmV3IHJ1bGUgLSB1c2UgbGluayB3aXRoIFVSTCBwYXJhbWV0ZXJzIGluc3RlYWQgb2YgZm9ybVxuICAgICAgICAgICAgLy8gRXh0cmFjdCBuZXR3b3JrIGFuZCBzdWJuZXQgZnJvbSBydWxlLm5ldHdvcmsgKGUuZy4sIFwiMC4wLjAuMC8wXCIgLT4gbmV0d29yaz0wLjAuMC4wJnN1Ym5ldD0wKVxuICAgICAgICAgICAgY29uc3QgbmV0d29ya1BhcnRzID0gcnVsZS5uZXR3b3JrLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gbmV0d29ya1BhcnRzWzBdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3Qgc3VibmV0ID0gbmV0d29ya1BhcnRzWzFdIHx8ICcwJztcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVOYW1lID0gcnVsZS5kZXNjcmlwdGlvbiB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IG1vZGlmeUNsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICBjb25zdCBwcmVmaWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvP25ldHdvcms9JHtlbmNvZGVVUklDb21wb25lbnQobmV0d29yayl9JnN1Ym5ldD0ke2VuY29kZVVSSUNvbXBvbmVudChzdWJuZXQpfSZydWxlTmFtZT0ke2VuY29kZVVSSUNvbXBvbmVudChydWxlTmFtZSl9YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke3ByZWZpbGxVcmx9XCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIG1pbmkgYnV0dG9uICR7bW9kaWZ5Q2xhc3N9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+PC9hPic7XG4gICAgICAgICAgICBodG1sICs9ICc8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgZGlzYWJsZWQgYnV0dG9uXCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEV4aXN0aW5nIHJ1bGUgYnV0dG9uc1xuICAgICAgICAgICAgY29uc3QgbW9kaWZ5Q2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLm1vZGlmeSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5LyR7cnVsZS5pZH1cIiBgO1xuICAgICAgICAgICAgaHRtbCArPSBgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkICR7bW9kaWZ5Q2xhc3N9XCIgYDtcbiAgICAgICAgICAgIGh0bWwgKz0gYGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdCl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+PC9hPic7XG5cbiAgICAgICAgICAgIGlmIChydWxlLnBlcm1hbmVudCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBkaXNhYmxlZCBidXR0b25cIj48aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPjwvYT5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkZWxldGVDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuZGVsZXRlID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxhIGhyZWY9XCIjXCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkICR7ZGVsZXRlQ2xhc3N9XCIgYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBkYXRhLXZhbHVlPVwiJHtydWxlLmlkfVwiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGUpfVwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+PC90ZD48L3RyPic7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNlcnZpY2UgaW5mbyBzY3JpcHQgdGFnXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmdcbiAgICAgKi9cbiAgICBidWlsZFNlcnZpY2VJbmZvU2NyaXB0KGRhdGEpIHtcbiAgICAgICAgLy8gQ29sbGVjdCBwb3J0IGluZm9ybWF0aW9uIGZyb20gcnVsZXNcbiAgICAgICAgY29uc3Qgc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIGNvbnN0IHNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGEuaXRlbXMgJiYgZGF0YS5pdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdFJ1bGUgPSBkYXRhLml0ZW1zWzBdO1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZmlyc3RSdWxlLnJ1bGVzIHx8IHt9KS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBydWxlID0gZmlyc3RSdWxlLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlUG9ydEluZm9bY2F0ZWdvcnldID0gcnVsZS5wb3J0cyB8fCBbXTtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlTmFtZU1hcHBpbmdbcnVsZS5uYW1lXSA9IGNhdGVnb3J5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8c2NyaXB0PlxuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSAke0pTT04uc3RyaW5naWZ5KHNlcnZpY2VQb3J0SW5mbyl9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSAke0pTT04uc3RyaW5naWZ5KHNlcnZpY2VOYW1lTWFwcGluZyl9O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciA9ICR7ZGF0YS5pc0RvY2tlciA/ICd0cnVlJyA6ICdmYWxzZSd9O1xuICAgICAgICAgICAgPC9zY3JpcHQ+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBVSSBlbGVtZW50cyBhZnRlciBET00gY3JlYXRpb25cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZm9yIGNvbnRleHRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlFbGVtZW50cyhkYXRhKSB7XG5cbiAgICAgICAgLy8gQm91bmNlciBiYW5uZXIgc2VsZi1jaGVjayBidXR0b24gKG9ubHkgcmVuZGVyZWQgaW4gRG9ja2VyIGJyaWRnZSB3aXRoXG4gICAgICAgIC8vIGhpZGRlbiBjbGllbnQgSVAg4oCUIGluaXRpYWxpemF0aW9uIGlzIGEgbm8tb3Agd2hlbiB0aGUgYnV0dG9uIGlzIGFic2VudCkuXG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdEJvdW5jZXJCYW5uZXJIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcCByZW9yZGVyaW5nIGZvciBwcmlvcml0eVxuICAgICAgICAkKCcjZmlyZXdhbGwtdGFibGUgdGJvZHknKS50YWJsZURuRCh7XG4gICAgICAgICAgICBvbkRyb3A6IGZpcmV3YWxsVGFibGUuY2JPbkRyb3AsXG4gICAgICAgICAgICBvbkRyYWdDbGFzczogJ2hvdmVyaW5nUm93JyxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkb3VibGUtY2xpY2sgaGFuZGxlciBmb3IgZHluYW1pY2FsbHkgY3JlYXRlZCByb3dzXG4gICAgICAgIC8vIEV4Y2x1ZGUgbGFzdCBjZWxsIHdpdGggYWN0aW9uIGJ1dHRvbnMgdG8gcHJldmVudCBhY2NpZGVudGFsIG5hdmlnYXRpb24gb24gZGVsZXRlIGJ1dHRvbiBjbGlja3NcbiAgICAgICAgJCgnLnJ1bGUtcm93IHRkOm5vdCg6bGFzdC1jaGlsZCknKS5vZmYoJ2RibGNsaWNrJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvJHtpZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExldCBkZWxldGUtc29tZXRoaW5nLmpzIGhhbmRsZSB0aGUgZmlyc3QgY2xpY2ssIHdlIGp1c3QgcHJldmVudCBkZWZhdWx0IG5hdmlnYXRpb25cbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZS50d28tc3RlcHMtZGVsZXRlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgLy8gRG9uJ3Qgc3RvcCBwcm9wYWdhdGlvbiAtIGFsbG93IGRlbGV0ZS1zb21ldGhpbmcuanMgdG8gd29ya1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAtIHdvcmtzIHdpdGggdHdvLXN0ZXBzLWRlbGV0ZSBsb2dpY1xuICAgICAgICAvLyBUaGlzIHdpbGwgYmUgdHJpZ2dlcmVkIGFmdGVyIGRlbGV0ZS1zb21ldGhpbmcuanMgcmVtb3ZlcyB0aGUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzc1xuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBGaXJld2FsbEFQSS5kZWxldGVSZWNvcmQocnVsZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCBkYXRhIHRvIHJlZnJlc2ggdGhlIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUubG9hZEZpcmV3YWxsRGF0YSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZT8ubWVzc2FnZXMgfHwgZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yRGVsZXRpbmdSdWxlKTtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaWYgZGVsZXRpb24gZmFpbGVkXG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ3R3by1zdGVwcy1kZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgJGJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2Nsb3NlJykuYWRkQ2xhc3MoJ3RyYXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldHVwIGNoZWNrYm94IHRvIGVuYWJsZSBvciBkaXNhYmxlIHRoZSBmaXJld2FsbFxuICAgICAgICBpZiAoZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlKSB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGVcbiAgICAgICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgICAgICBvbkNoZWNrZWQ6IGZpcmV3YWxsVGFibGUuZW5hYmxlRmlyZXdhbGwsXG4gICAgICAgICAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmaXJld2FsbFRhYmxlLmRpc2FibGVGaXJld2FsbCxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIGVkaXQvZGVsZXRlIGJ1dHRvbnNcbiAgICAgICAgJCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBEb2NrZXItc3BlY2lmaWMgVUkgZWxlbWVudHMgd2l0aCBkYXRhIGNvbnRleHRcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplRG9ja2VyVUkoZGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvLyBJbml0aWFsaXplIERvY2tlci1zcGVjaWZpYyBVSSBlbGVtZW50c1xuICAgIGluaXRpYWxpemVEb2NrZXJVSShkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgcG9ydCBpbmZvcm1hdGlvblxuICAgICAgICBpZiAoIXdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gfHwgIXdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgYWxsIHNlcnZpY2UgY2VsbHMgaW4gdGhlIHRhYmxlXG4gICAgICAgICQoJ3RkLm1hcmtzJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjZWxsID0gJCh0aGlzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCBzZXJ2aWNlIG5hbWUgZnJvbSB0aGUgaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBjb2x1bW5JbmRleCA9ICRjZWxsLmluZGV4KCk7XG4gICAgICAgICAgICBjb25zdCAkaGVhZGVyQ2VsbCA9ICRjZWxsLmNsb3Nlc3QoJ3RhYmxlJykuZmluZCgndGhlYWQgdGgnKS5lcShjb2x1bW5JbmRleCk7XG4gICAgICAgICAgICBjb25zdCBzZXJ2aWNlTmFtZSA9ICRoZWFkZXJDZWxsLmZpbmQoJ3NwYW4nKS50ZXh0KCkgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzZXJ2aWNlTmFtZSkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgY2F0ZWdvcnkga2V5IGZyb20gdGhlIGRpc3BsYXkgbmFtZVxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5S2V5ID0gd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZ1tzZXJ2aWNlTmFtZV0gfHwgc2VydmljZU5hbWU7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5S2V5XSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2VsbC5hdHRyKCdkYXRhLWFjdGlvbicpIHx8ICdhbGxvdyc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9ICRjZWxsLmF0dHIoJ2RhdGEtbmV0d29yaycpIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRjZWxsLmhhc0NsYXNzKCdkb2NrZXItbGltaXRlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzRG9ja2VyID0gZGF0YSA/IGRhdGEuaXNEb2NrZXIgOiB3aW5kb3cuaXNEb2NrZXI7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgdG9vbHRpcCBjb250ZW50IHVzaW5nIHVuaWZpZWQgZ2VuZXJhdG9yXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnlLZXksXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yayxcbiAgICAgICAgICAgICAgICAgICAgaXNEb2NrZXIsXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCxcbiAgICAgICAgICAgICAgICAgICAgcG9ydEluZm8sXG4gICAgICAgICAgICAgICAgICAgIGlzRG9ja2VyICYmIGlzTGltaXRlZCAvLyBTaG93IGNvcHkgYnV0dG9uIGZvciBEb2NrZXIgbGltaXRlZCBzZXJ2aWNlc1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy5pbml0aWFsaXplVG9vbHRpcCgkY2VsbCwge1xuICAgICAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdHJpZ2dlcmVkIHdoZW4gYSBmaXJld2FsbCBydWxlIHJvdyBpcyBkcm9wcGVkIGFmdGVyIGRyYWdcbiAgICAgKiBTZW5kcyB1cGRhdGVkIHByaW9yaXRpZXMgdG8gdGhlIEFQSVxuICAgICAqL1xuICAgIGNiT25Ecm9wKCkge1xuICAgICAgICBsZXQgcHJpb3JpdHlXYXNDaGFuZ2VkID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IHByaW9yaXR5RGF0YSA9IHt9O1xuXG4gICAgICAgICQoJyNmaXJld2FsbC10YWJsZSB0Ym9keSB0cicpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKCFydWxlSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFNraXAgcm93cyB3aXRob3V0IElEICh1bnNhdmVkIHJ1bGVzKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb2xkUHJpb3JpdHkgPSBwYXJzZUludCgkKG9iaikuYXR0cignZGF0YS12YWx1ZScpLCAxMCk7XG4gICAgICAgICAgICBjb25zdCBuZXdQcmlvcml0eSA9IGluZGV4ICsgMTtcblxuICAgICAgICAgICAgaWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuICAgICAgICAgICAgICAgIHByaW9yaXR5V2FzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHlEYXRhW3J1bGVJZF0gPSBuZXdQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHByaW9yaXR5V2FzQ2hhbmdlZCkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGRhdGEtdmFsdWUgYXR0cmlidXRlcyBpbW1lZGlhdGVseSB0byByZWZsZWN0IG5ldyBwb3NpdGlvbnNcbiAgICAgICAgICAgICQoJyNmaXJld2FsbC10YWJsZSB0Ym9keSB0cicpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgICAgICAkKG9iaikuYXR0cignZGF0YS12YWx1ZScsIGluZGV4ICsgMSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuY2hhbmdlUHJpb3JpdHkocHJpb3JpdHlEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZXZlcnQgb24gZmFpbHVyZVxuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBFbmFibGUgdGhlIGZpcmV3YWxsIGJ5IG1ha2luZyBhbiBIVFRQIHJlcXVlc3QgdG8gdGhlIHNlcnZlci5cbiAgICBlbmFibGVGaXJld2FsbCgpIHtcbiAgICAgICAgRmlyZXdhbGxBUEkuZW5hYmxlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckRpc2FibGVkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gRGlzYWJsZSB0aGUgZmlyZXdhbGwgYnkgbWFraW5nIGFuIEhUVFAgcmVxdWVzdCB0byB0aGUgc2VydmVyLlxuICAgIGRpc2FibGVGaXJld2FsbCgpIHtcbiAgICAgICAgRmlyZXdhbGxBUEkuZGlzYWJsZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCh0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRW5hYmxlZCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIENhbGxiYWNrIGFmdGVyIHRoZSBmaXJld2FsbCBoYXMgYmVlbiBlbmFibGVkLlxuICAgIGNiQWZ0ZXJFbmFibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igc3VwcG9ydGVkIHNlcnZpY2VzLCBjaGFuZ2UgZ3JlZW4gY2hlY2ttYXJrcyB0byByZWQgY3Jvc3Nlc1xuICAgICAgICAkKCd0ZC5tYXJrczpub3QoLmRvY2tlci1saW1pdGVkKSBpLmljb24uY2hlY2ttYXJrLmdyZWVuW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjaGVja21hcmsgZ3JlZW4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjbG9zZSByZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBsaW1pdGVkIHNlcnZpY2VzIGluIERvY2tlciwga2VlcCBncmVlbiBjaGVja21hcmsgYnV0IGhpZGUgY29ybmVyIGNsb3NlXG4gICAgICAgICQoJ3RkLmRvY2tlci1saW1pdGVkIGkuaWNvbi5jb3JuZXIuY2xvc2UnKS5oaWRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgYWxsIG90aGVyIHNlcnZpY2VzLCBoaWRlIGNvcm5lciBjbG9zZVxuICAgICAgICAkKCd0ZC5tYXJrczpub3QoLmRvY2tlci1saW1pdGVkKSBpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuXG4gICAgICAgIGlmIChzZW5kRXZlbnQpIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIENhbGxiYWNrIGFmdGVyIHRoZSBmaXJld2FsbCBoYXMgYmVlbiBkaXNhYmxlZC5cbiAgICBjYkFmdGVyRGlzYWJsZWQoc2VuZEV2ZW50ID0gZmFsc2UpIHtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmZpbmQoJ2xhYmVsJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBhbGwgc2VydmljZXMsIGNoYW5nZSByZWQgY3Jvc3NlcyB0byBncmVlbiBjaGVja21hcmtzXG4gICAgICAgICQoJ2kuaWNvbi5jbG9zZS5yZWRbZGF0YS12YWx1ZT1cIm9mZlwiXScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Nsb3NlIHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2NoZWNrbWFyayBncmVlbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBjb3JuZXIgY2xvc2UgZm9yIGFsbCBzZXJ2aWNlcyB3aGVuIGZpcmV3YWxsIGlzIGRpc2FibGVkXG4gICAgICAgICQoJ2kuaWNvbi5jb3JuZXIuY2xvc2UnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplKCk7XG59KTsiXX0=