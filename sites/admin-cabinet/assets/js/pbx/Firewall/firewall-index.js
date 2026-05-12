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
    var html = '<div class="ui basic segment" id="firewall-settings">'; // Bouncer banner: only when we know the local firewall path is blind
    // (Docker bridge AND remote_addr is hidden behind docker0 gateway).
    // Surfaces the external-bouncer workflow as a CTA so junior admins do not
    // need to find the documentation page on their own.

    var showBouncerBanner = data.dockerNetworkMode === 'bridge' && data.clientIpVisible === false; // Generic Docker notice is redundant when the more actionable bouncer banner is rendered.

    if (data.isDocker && !showBouncerBanner) {
      html += firewallTable.buildDockerNotice();
    }

    if (showBouncerBanner) {
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
    // `trust=1` is the explicit marker that this is the "Allow my current IP" helper,
    // so the modify form can default `newer_block_ip=true` only for this flow and not
    // for generic prefill links (e.g. edit buttons for default rows).


    var ruleName = globalTranslate.fw_MyCurrentIpRuleName || 'My current IP';
    var url = "".concat(globalRootUrl, "firewall/modify/") + "?network=".concat(encodeURIComponent(clientIp)) + "&subnet=32" + "&trust=1" + "&ruleName=".concat(encodeURIComponent(ruleName));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1pbmRleC5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRhYmxlIiwiJHN0YXR1c1RvZ2dsZSIsIiRhZGROZXdCdXR0b24iLCIkc2V0dGluZ3MiLCIkY29udGFpbmVyIiwiZmlyZXdhbGxEYXRhIiwicGVybWlzc2lvbnMiLCJzdGF0dXMiLCJtb2RpZnkiLCJpbml0aWFsaXplIiwiJCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X0Vycm9yTG9hZGluZ0RhdGEiLCJkYXRhIiwiYnVpbGRJbnRlcmZhY2UiLCJlbXB0eSIsInN0YXR1c0h0bWwiLCJidWlsZFN0YXR1c1RvZ2dsZSIsImZpcmV3YWxsRW5hYmxlZCIsImFwcGVuZCIsInNldHRpbmdzSHRtbCIsImJ1aWxkU2V0dGluZ3NTZWN0aW9uIiwiaW5pdGlhbGl6ZVVJRWxlbWVudHMiLCJlbmFibGVkIiwic3RhdHVzQ2xhc3MiLCJsYWJlbFRleHQiLCJmd19TdGF0dXNFbmFibGVkIiwiZndfU3RhdHVzRGlzYWJsZWQiLCJjaGVja2VkIiwiaHRtbCIsInNob3dCb3VuY2VyQmFubmVyIiwiZG9ja2VyTmV0d29ya01vZGUiLCJjbGllbnRJcFZpc2libGUiLCJpc0RvY2tlciIsImJ1aWxkRG9ja2VyTm90aWNlIiwiYnVpbGRCb3VuY2VyQmFubmVyIiwiZ2xvYmFsUm9vdFVybCIsImZ3X0FkZE5ld1J1bGUiLCJidWlsZEFsbG93TXlJcEJ1dHRvbiIsImJ1aWxkRmlyZXdhbGxUYWJsZSIsIml0ZW1zIiwiYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdCIsImNsaWVudElwIiwiY2xpZW50SXBSdWxlSWQiLCJydWxlTmFtZSIsImZ3X015Q3VycmVudElwUnVsZU5hbWUiLCJ1cmwiLCJlbmNvZGVVUklDb21wb25lbnQiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsImZ3X0FsbG93TXlJcEJ1dHRvbiIsImZ3X0RvY2tlckVudmlyb25tZW50Tm90aWNlIiwiZndfRG9ja2VyTGltaXRlZFNlcnZpY2VzSW5mbyIsInRpdGxlIiwiZndfQm91bmNlckJhbm5lclRpdGxlIiwiYm9keSIsImZ3X0JvdW5jZXJCYW5uZXJCb2R5IiwiY3RhIiwiZndfQm91bmNlckJhbm5lckN0YSIsImNoZWNrQnRuIiwiZndfQ2hlY2tJcFZpc2liaWxpdHkiLCJhcGlLZXlzVXJsIiwiaW5pdEJvdW5jZXJCYW5uZXJIYW5kbGVycyIsIiRidG4iLCJsZW5ndGgiLCIkcmVzdWx0Iiwib24iLCJoaWRlIiwiU3lzdGVtQVBJIiwiY2hlY2tDbGllbnRJcFZpc2liaWxpdHkiLCJzaG93IiwicmVuZGVyQ2xpZW50SXBWZXJkaWN0IiwicmVtb3RlIiwicmVtb3RlX2FkZHIiLCJ4ZmYiLCJ4X2ZvcndhcmRlZF9mb3IiLCJTdHJpbmciLCJ4UmVhbElwIiwieF9yZWFsX2lwIiwibW9kZSIsImNvbnRhaW5lcl9tb2RlIiwidmVyZGljdEtleSIsImNvbG9yIiwidmVyZGljdCIsInZlcmRpY3RUZXh0IiwicnVsZXMiLCJmd19Ob1J1bGVzQ29uZmlndXJlZCIsImNhdGVnb3JpZXMiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0ZWdvcnlEYXRhIiwiaXNMaW1pdGVkIiwiZG9ja2VyU3VwcG9ydGVkU2VydmljZXMiLCJpbmNsdWRlcyIsIm5hbWUiLCJsaW1pdGVkQ2xhc3MiLCJydWxlIiwiYnVpbGRSdWxlUm93IiwicHJpb3JpdHkiLCJ1bmRlZmluZWQiLCJwZXJtaXQiLCJuZXR3b3JrIiwic3VibmV0IiwiaXNDYXRjaEFsbCIsIm5vRHJhZ0NsYXNzIiwiY2xpZW50SXBDbGFzcyIsImlzQ2xpZW50SXAiLCJpZCIsImhpbnQiLCJmd19UaGlzSXNZb3VyQ3VycmVudElwSGludCIsImRlc2NyaXB0aW9uIiwiZndfTmVlZENvbmZpZ3VyZVJ1bGUiLCJjYXRlZ29yeVJ1bGUiLCJhY3Rpb24iLCJuZXR3b3JrUGFydHMiLCJzcGxpdCIsIm1vZGlmeUNsYXNzIiwicHJlZmlsbFVybCIsImJ0X1Rvb2xUaXBFZGl0IiwicGVybWFuZW50IiwiZGVsZXRlQ2xhc3MiLCJidF9Ub29sVGlwRGVsZXRlIiwic2VydmljZVBvcnRJbmZvIiwic2VydmljZU5hbWVNYXBwaW5nIiwiZmlyc3RSdWxlIiwicG9ydHMiLCJKU09OIiwic3RyaW5naWZ5IiwidGFibGVEbkQiLCJvbkRyb3AiLCJjYk9uRHJvcCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9mZiIsImUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiYXR0ciIsIndpbmRvdyIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwicnVsZUlkIiwiZGVsZXRlUmVjb3JkIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJmd19FcnJvckRlbGV0aW5nUnVsZSIsImZpbmQiLCJjaGVja2JveCIsIm9uQ2hlY2tlZCIsImVuYWJsZUZpcmV3YWxsIiwib25VbmNoZWNrZWQiLCJkaXNhYmxlRmlyZXdhbGwiLCJwb3B1cCIsImluaXRpYWxpemVEb2NrZXJVSSIsImVhY2giLCIkY2VsbCIsImNvbHVtbkluZGV4IiwiaW5kZXgiLCIkaGVhZGVyQ2VsbCIsImVxIiwic2VydmljZU5hbWUiLCJ0ZXh0IiwiY2F0ZWdvcnlLZXkiLCJwb3J0SW5mbyIsImhhc0NsYXNzIiwidG9vbHRpcENvbnRlbnQiLCJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50IiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJwb3NpdGlvbiIsInByaW9yaXR5V2FzQ2hhbmdlZCIsInByaW9yaXR5RGF0YSIsIm9iaiIsIm9sZFByaW9yaXR5IiwicGFyc2VJbnQiLCJuZXdQcmlvcml0eSIsImNoYW5nZVByaW9yaXR5IiwiZW5hYmxlIiwiY2JBZnRlckVuYWJsZWQiLCJjYkFmdGVyRGlzYWJsZWQiLCJkaXNhYmxlIiwic2VuZEV2ZW50IiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGFBQWEsR0FBRztBQUNsQjtBQUNBQyxFQUFBQSxhQUFhLEVBQUUsSUFGRztBQUdsQkMsRUFBQUEsYUFBYSxFQUFFLElBSEc7QUFJbEJDLEVBQUFBLFNBQVMsRUFBRSxJQUpPO0FBS2xCQyxFQUFBQSxVQUFVLEVBQUUsSUFMTTtBQU9sQjtBQUNBQyxFQUFBQSxZQUFZLEVBQUUsSUFSSTtBQVNsQkMsRUFBQUEsV0FBVyxFQUFFO0FBQ1RDLElBQUFBLE1BQU0sRUFBRSxJQURDO0FBRVRDLElBQUFBLE1BQU0sRUFBRSxJQUZDO0FBR1QsY0FBUTtBQUhDLEdBVEs7QUFlbEI7QUFDQUMsRUFBQUEsVUFoQmtCLHdCQWdCTDtBQUNUO0FBQ0FULElBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxHQUEyQk0sQ0FBQyxDQUFDLG1CQUFELENBQTVCLENBRlMsQ0FJVDs7QUFDQVYsSUFBQUEsYUFBYSxDQUFDVyxnQkFBZDtBQUNILEdBdEJpQjs7QUF3QmxCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxnQkEzQmtCLDhCQTJCQztBQUNmO0FBQ0FYLElBQUFBLGFBQWEsQ0FBQ0ksVUFBZCxDQUF5QlEsUUFBekIsQ0FBa0MsU0FBbEM7QUFFQUMsSUFBQUEsV0FBVyxDQUFDQyxPQUFaLENBQW9CLFVBQUNDLFFBQUQsRUFBYztBQUM5QmYsTUFBQUEsYUFBYSxDQUFDSSxVQUFkLENBQXlCWSxXQUF6QixDQUFxQyxTQUFyQzs7QUFFQSxVQUFJLENBQUNELFFBQUQsSUFBYSxDQUFDQSxRQUFRLENBQUNFLE1BQTNCLEVBQW1D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SixFQUFlO0FBQ1gsVUFBTUMsS0FBSyxHQUFHQyxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsT0FBckIsQ0FBZDtBQUNBRixNQUFBQSxLQUFLLENBQUNHLFNBQU4sQ0FBZ0IsbUJBQWhCLEVBQXFDLEtBQXJDLEVBQTRDLElBQTVDO0FBQ0FoRCxNQUFBQSxNQUFNLENBQUNpRCxhQUFQLENBQXFCSixLQUFyQjtBQUNIO0FBQ0o7QUFockJpQixDQUF0QixDLENBbXJCQTs7QUFDQXhMLENBQUMsQ0FBQ3lMLFFBQUQsQ0FBRCxDQUFZSSxLQUFaLENBQWtCLFlBQU07QUFDcEJ2TSxFQUFBQSxhQUFhLENBQUNTLFVBQWQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgZmlyZXdhbGxUb29sdGlwcywgRmlyZXdhbGxBUEksIFN5c3RlbUFQSSwgVXNlck1lc3NhZ2UsIFNlY3VyaXR5VXRpbHMsIFNlbWFudGljTG9jYWxpemF0aW9uLCAkICovXG5cbi8qKlxuICogVGhlIGBmaXJld2FsbFRhYmxlYCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgc3lzdGVtLlxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxUYWJsZVxuICovXG5jb25zdCBmaXJld2FsbFRhYmxlID0ge1xuICAgIC8vIGpRdWVyeSBlbGVtZW50cyAod2lsbCBiZSBpbml0aWFsaXplZCBhZnRlciBET00gY3JlYXRpb24pXG4gICAgJHN0YXR1c1RvZ2dsZTogbnVsbCxcbiAgICAkYWRkTmV3QnV0dG9uOiBudWxsLFxuICAgICRzZXR0aW5nczogbnVsbCxcbiAgICAkY29udGFpbmVyOiBudWxsLFxuICAgIFxuICAgIC8vIERhdGEgZnJvbSBBUElcbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG4gICAgcGVybWlzc2lvbnM6IHtcbiAgICAgICAgc3RhdHVzOiB0cnVlLFxuICAgICAgICBtb2RpZnk6IHRydWUsXG4gICAgICAgIGRlbGV0ZTogdHJ1ZVxuICAgIH0sXG5cbiAgICAvLyBUaGlzIG1ldGhvZCBpbml0aWFsaXplcyB0aGUgRmlyZXdhbGwgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IGNvbnRhaW5lclxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIgPSAkKCcjZmlyZXdhbGwtY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGZpcmV3YWxsIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGaXJld2FsbERhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIEZpcmV3YWxsQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBmaXJld2FsbFRhYmxlLiRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdEYXRhKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIGRhdGFcbiAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuZmlyZXdhbGxEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQnVpbGQgdGhlIGludGVyZmFjZVxuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5idWlsZEludGVyZmFjZShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb21wbGV0ZSBpbnRlcmZhY2UgZnJvbSBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGJ1aWxkSW50ZXJmYWNlKGRhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgY29udGFpbmVyXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGNvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIHRvZ2dsZVxuICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFN0YXR1c1RvZ2dsZShkYXRhLmZpcmV3YWxsRW5hYmxlZCA9PT0gJzEnKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzdGF0dXNIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb25cbiAgICAgICAgY29uc3Qgc2V0dGluZ3NIdG1sID0gZmlyZXdhbGxUYWJsZS5idWlsZFNldHRpbmdzU2VjdGlvbihkYXRhKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kY29udGFpbmVyLmFwcGVuZChzZXR0aW5nc0h0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IGVsZW1lbnRzXG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSA9ICQoJyNzdGF0dXMtdG9nZ2xlJyk7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJGFkZE5ld0J1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzZXR0aW5ncyA9ICQoJyNmaXJld2FsbC1zZXR0aW5ncycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHNcbiAgICAgICAgZmlyZXdhbGxUYWJsZS5pbml0aWFsaXplVUlFbGVtZW50cyhkYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHN0YXR1cyB0b2dnbGUgSFRNTFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gZW5hYmxlZCAtIFdoZXRoZXIgZmlyZXdhbGwgaXMgZW5hYmxlZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTdGF0dXNUb2dnbGUoZW5hYmxlZCkge1xuICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMuc3RhdHVzID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICBjb25zdCBsYWJlbFRleHQgPSBlbmFibGVkID8gZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0VuYWJsZWQgOiBnbG9iYWxUcmFuc2xhdGUuZndfU3RhdHVzRGlzYWJsZWQ7XG4gICAgICAgIGNvbnN0IGNoZWNrZWQgPSBlbmFibGVkID8gJ2NoZWNrZWQnIDogJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94ICR7c3RhdHVzQ2xhc3N9XCIgaWQ9XCJzdGF0dXMtdG9nZ2xlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBuYW1lPVwic3RhdHVzXCIgaWQ9XCJzdGF0dXNcIiAke2NoZWNrZWR9Lz5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7bGFiZWxUZXh0fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHNldHRpbmdzIHNlY3Rpb24gd2l0aCB0YWJsZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXR0aW5nc1NlY3Rpb24oZGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiIGlkPVwiZmlyZXdhbGwtc2V0dGluZ3NcIj4nO1xuXG4gICAgICAgIC8vIEJvdW5jZXIgYmFubmVyOiBvbmx5IHdoZW4gd2Uga25vdyB0aGUgbG9jYWwgZmlyZXdhbGwgcGF0aCBpcyBibGluZFxuICAgICAgICAvLyAoRG9ja2VyIGJyaWRnZSBBTkQgcmVtb3RlX2FkZHIgaXMgaGlkZGVuIGJlaGluZCBkb2NrZXIwIGdhdGV3YXkpLlxuICAgICAgICAvLyBTdXJmYWNlcyB0aGUgZXh0ZXJuYWwtYm91bmNlciB3b3JrZmxvdyBhcyBhIENUQSBzbyBqdW5pb3IgYWRtaW5zIGRvIG5vdFxuICAgICAgICAvLyBuZWVkIHRvIGZpbmQgdGhlIGRvY3VtZW50YXRpb24gcGFnZSBvbiB0aGVpciBvd24uXG4gICAgICAgIGNvbnN0IHNob3dCb3VuY2VyQmFubmVyID0gZGF0YS5kb2NrZXJOZXR3b3JrTW9kZSA9PT0gJ2JyaWRnZScgJiYgZGF0YS5jbGllbnRJcFZpc2libGUgPT09IGZhbHNlO1xuXG4gICAgICAgIC8vIEdlbmVyaWMgRG9ja2VyIG5vdGljZSBpcyByZWR1bmRhbnQgd2hlbiB0aGUgbW9yZSBhY3Rpb25hYmxlIGJvdW5jZXIgYmFubmVyIGlzIHJlbmRlcmVkLlxuICAgICAgICBpZiAoZGF0YS5pc0RvY2tlciAmJiAhc2hvd0JvdW5jZXJCYW5uZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZERvY2tlck5vdGljZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNob3dCb3VuY2VyQmFubmVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGZpcmV3YWxsVGFibGUuYnVpbGRCb3VuY2VyQmFubmVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbmV3IHJ1bGUgYnV0dG9uXG4gICAgICAgIGlmIChmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLm1vZGlmeSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnlcIiBjbGFzcz1cInVpIGJsdWUgYnV0dG9uXCIgaWQ9XCJhZGQtbmV3LWJ1dHRvblwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImFkZCBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19BZGROZXdSdWxlfTwvYT5gO1xuXG4gICAgICAgICAgICAvLyBcIkFsbG93IG15IGN1cnJlbnQgSVBcIiBoZWxwZXIgYnV0dG9uIChvbmx5IHdoZW4gY2xpZW50IElQIGlzIHB1YmxpYyBBTkQgbm90IHlldCBjb3ZlcmVkIGJ5IGEgaG9zdCBydWxlKVxuICAgICAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkQWxsb3dNeUlwQnV0dG9uKGRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgZmlyZXdhbGwgdGFibGVcbiAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkRmlyZXdhbGxUYWJsZShkYXRhLml0ZW1zLCBkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc2VydmljZSBwb3J0IGluZm8gc2NyaXB0XG4gICAgICAgIGh0bWwgKz0gZmlyZXdhbGxUYWJsZS5idWlsZFNlcnZpY2VJbmZvU2NyaXB0KGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBcIkFsbG93IG15IGN1cnJlbnQgSVBcIiBoZWxwZXIgYnV0dG9uLlxuICAgICAqIFJlbmRlcmVkIG5leHQgdG8gI2FkZC1uZXctYnV0dG9uIG9ubHkgaWYgdGhlIGJhY2tlbmQgcmVwb3J0cyBhIHB1YmxpYyBjbGllbnQgSVBcbiAgICAgKiBhbmQgbm8gZXhpc3RpbmcgcnVsZSBhbHJlYWR5IGNvdmVycyBpdCBhcyBhIGhvc3QgKC8zMiBmb3IgSVB2NCwgLzEyOCBmb3IgSVB2NikuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyAoZW1wdHkgaWYgY29uZGl0aW9ucyBub3QgbWV0KVxuICAgICAqL1xuICAgIGJ1aWxkQWxsb3dNeUlwQnV0dG9uKGRhdGEpIHtcbiAgICAgICAgY29uc3QgY2xpZW50SXAgPSBkYXRhLmNsaWVudElwIHx8ICcnO1xuICAgICAgICBpZiAoIWNsaWVudElwIHx8IGRhdGEuY2xpZW50SXBSdWxlSWQpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJhY2tlbmQgYWxyZWFkeSByZXN0cmljdHMgY2xpZW50SXAgdG8gYSBwdWJsaWMgSVB2NCBsaXRlcmFsIOKAlCAvMzIgaXMgdGhlIG9ubHkgaG9zdCBtYXNrLlxuICAgICAgICAvLyBgdHJ1c3Q9MWAgaXMgdGhlIGV4cGxpY2l0IG1hcmtlciB0aGF0IHRoaXMgaXMgdGhlIFwiQWxsb3cgbXkgY3VycmVudCBJUFwiIGhlbHBlcixcbiAgICAgICAgLy8gc28gdGhlIG1vZGlmeSBmb3JtIGNhbiBkZWZhdWx0IGBuZXdlcl9ibG9ja19pcD10cnVlYCBvbmx5IGZvciB0aGlzIGZsb3cgYW5kIG5vdFxuICAgICAgICAvLyBmb3IgZ2VuZXJpYyBwcmVmaWxsIGxpbmtzIChlLmcuIGVkaXQgYnV0dG9ucyBmb3IgZGVmYXVsdCByb3dzKS5cbiAgICAgICAgY29uc3QgcnVsZU5hbWUgPSBnbG9iYWxUcmFuc2xhdGUuZndfTXlDdXJyZW50SXBSdWxlTmFtZSB8fCAnTXkgY3VycmVudCBJUCc7XG4gICAgICAgIGNvbnN0IHVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5L2BcbiAgICAgICAgICAgICsgYD9uZXR3b3JrPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNsaWVudElwKX1gXG4gICAgICAgICAgICArIGAmc3VibmV0PTMyYFxuICAgICAgICAgICAgKyBgJnRydXN0PTFgXG4gICAgICAgICAgICArIGAmcnVsZU5hbWU9JHtlbmNvZGVVUklDb21wb25lbnQocnVsZU5hbWUpfWA7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxhIGhyZWY9XCIke3VybH1cIiBjbGFzcz1cInVpIGdyZWVuIGJ1dHRvblwiIGlkPVwiYWxsb3ctbXktaXAtYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzaGllbGQgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0FsbG93TXlJcEJ1dHRvbil9ICgke2NsaWVudElwfSlcbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgRG9ja2VyIGVudmlyb25tZW50IG5vdGljZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGREb2NrZXJOb3RpY2UoKSB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBpY29uIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJFbnZpcm9ubWVudE5vdGljZSl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJMaW1pdGVkU2VydmljZXNJbmZvKX08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgdGhlIFwiRG9ja2VyIGJyaWRnZSDigJQgZXh0ZXJuYWwgYm91bmNlciBuZWVkZWRcIiBiYW5uZXIuXG4gICAgICpcbiAgICAgKiBPbmx5IHNob3duIHdoZW4gR2V0TGlzdEFjdGlvbiByZXBvcnRzIGBkb2NrZXJOZXR3b3JrTW9kZSA9PT0gJ2JyaWRnZSdgXG4gICAgICogYW5kIGBjbGllbnRJcFZpc2libGUgPT09IGZhbHNlYC4gVGhlIFwiQ2hlY2sgbXkgSVAgdmlzaWJpbGl0eVwiIGJ1dHRvblxuICAgICAqIGNhbGxzIHN5c3RlbTpjaGVja0NsaWVudElwVmlzaWJpbGl0eSBhbmQgcmVuZGVycyB0aGUgdmVyZGljdCBpbmxpbmUgc29cbiAgICAgKiB0aGUgYWRtaW4gY2FuIGNvbmZpcm0gdGhlIGRpYWdub3NpcyB3aXRob3V0IHJlLWxvYWRpbmcgdGhlIHBhZ2UuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkQm91bmNlckJhbm5lcigpIHtcbiAgICAgICAgY29uc3QgdGl0bGUgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0JvdW5jZXJCYW5uZXJUaXRsZSk7XG4gICAgICAgIGNvbnN0IGJvZHkgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0JvdW5jZXJCYW5uZXJCb2R5KTtcbiAgICAgICAgY29uc3QgY3RhID0gU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19Cb3VuY2VyQmFubmVyQ3RhKTtcbiAgICAgICAgY29uc3QgY2hlY2tCdG4gPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X0NoZWNrSXBWaXNpYmlsaXR5KTtcbiAgICAgICAgY29uc3QgYXBpS2V5c1VybCA9IGAke2dsb2JhbFJvb3RVcmx9YXBpLWtleXMvbW9kaWZ5P3ByZXNldD1ib3VuY2VyYDtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIGljb24gbWVzc2FnZVwiIGlkPVwiZmlyZXdhbGwtYm91bmNlci1iYW5uZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInNoaWVsZCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3RpdGxlfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2JvZHl9PC9wPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7YXBpS2V5c1VybH1cIiBjbGFzcz1cInVpIG9yYW5nZSBidXR0b25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImtleSBpY29uXCI+PC9pPiAke2N0YX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBiYXNpYyBidXR0b25cIiBpZD1cImNoZWNrLWlwLXZpc2liaWxpdHktYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleWUgaWNvblwiPjwvaT4gJHtjaGVja0J0bn1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBpZD1cImlwLXZpc2liaWxpdHktcmVzdWx0XCIgY2xhc3M9XCJ1aSBiYXNpYyBzZWdtZW50XCIgc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogV2lyZSB0aGUgc2VsZi1jaGVjayBidXR0b24gb24gdGhlIGJvdW5jZXIgYmFubmVyLlxuICAgICAqXG4gICAgICogQ2FsbGVkIGZyb20gaW5pdGlhbGl6ZVVJRWxlbWVudHMgYWZ0ZXIgdGhlIGJhbm5lciBpcyBpbiB0aGUgRE9NLlxuICAgICAqL1xuICAgIGluaXRCb3VuY2VyQmFubmVySGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0ICRidG4gPSAkKCcjY2hlY2staXAtdmlzaWJpbGl0eS1idXR0b24nKTtcbiAgICAgICAgaWYgKCRidG4ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJHJlc3VsdCA9ICQoJyNpcC12aXNpYmlsaXR5LXJlc3VsdCcpO1xuXG4gICAgICAgICRidG4ub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgJHJlc3VsdC5oaWRlKCkuZW1wdHkoKTtcblxuICAgICAgICAgICAgU3lzdGVtQVBJLmNoZWNrQ2xpZW50SXBWaXNpYmlsaXR5KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHJlc3BvbnNlLnJlc3VsdCAhPT0gdHJ1ZSB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAkcmVzdWx0Lmh0bWwoYDxkaXYgY2xhc3M9XCJ1aSByZWQgbWVzc2FnZVwiPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckxvYWRpbmdEYXRhKX08L2Rpdj5gKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJHJlc3VsdC5odG1sKGZpcmV3YWxsVGFibGUucmVuZGVyQ2xpZW50SXBWZXJkaWN0KHJlc3BvbnNlLmRhdGEpKS5zaG93KCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgdmVyZGljdCArIHJhdyBoZWFkZXIgZGF0YSByZXR1cm5lZCBieSB0aGUgc2VsZi1jaGVjayBlbmRwb2ludC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFNlbGYtY2hlY2sgcGF5bG9hZCAocmVtb3RlX2FkZHIgLyB2ZXJkaWN0IC8gZXRjLilcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MXG4gICAgICovXG4gICAgcmVuZGVyQ2xpZW50SXBWZXJkaWN0KGRhdGEpIHtcbiAgICAgICAgY29uc3QgcmVtb3RlID0gU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRhdGEucmVtb3RlX2FkZHIgfHwgJycpO1xuICAgICAgICBjb25zdCB4ZmYgPSBkYXRhLnhfZm9yd2FyZGVkX2ZvciA/IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChTdHJpbmcoZGF0YS54X2ZvcndhcmRlZF9mb3IpKSA6ICfigJQnO1xuICAgICAgICBjb25zdCB4UmVhbElwID0gZGF0YS54X3JlYWxfaXAgPyBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoU3RyaW5nKGRhdGEueF9yZWFsX2lwKSkgOiAn4oCUJztcbiAgICAgICAgY29uc3QgbW9kZSA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhLmNvbnRhaW5lcl9tb2RlIHx8ICcnKTtcblxuICAgICAgICBsZXQgdmVyZGljdEtleSA9ICdmd19DaGVja0lwVmlzaWJpbGl0eVJlc3VsdFZpc2libGUnO1xuICAgICAgICBsZXQgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICBpZiAoZGF0YS52ZXJkaWN0ID09PSAnaXBfbm90X3Zpc2libGUnKSB7XG4gICAgICAgICAgICB2ZXJkaWN0S2V5ID0gJ2Z3X0NoZWNrSXBWaXNpYmlsaXR5UmVzdWx0Tm90VmlzaWJsZSc7XG4gICAgICAgICAgICBjb2xvciA9ICdyZWQnO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEudmVyZGljdCA9PT0gJ3Byb3h5X2RldGVjdGVkJykge1xuICAgICAgICAgICAgdmVyZGljdEtleSA9ICdmd19DaGVja0lwVmlzaWJpbGl0eVJlc3VsdFByb3h5JztcbiAgICAgICAgICAgIGNvbG9yID0gJ3llbGxvdyc7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdmVyZGljdFRleHQgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlW3ZlcmRpY3RLZXldIHx8IHZlcmRpY3RLZXkpO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtjb2xvcn0gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+ICR7dmVyZGljdFRleHR9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj48Yj5yZW1vdGVfYWRkcjo8L2I+IDxjb2RlPiR7cmVtb3RlfTwvY29kZT48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj48Yj5YLUZvcndhcmRlZC1Gb3I6PC9iPiA8Y29kZT4ke3hmZn08L2NvZGU+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+PGI+WC1SZWFsLUlQOjwvYj4gPGNvZGU+JHt4UmVhbElwfTwvY29kZT48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj48Yj5jb250YWluZXJfbW9kZTo8L2I+IDxjb2RlPiR7bW9kZX08L2NvZGU+PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGZpcmV3YWxsIHJ1bGVzIHRhYmxlXG4gICAgICogQHBhcmFtIHtBcnJheX0gcnVsZXMgLSBBcnJheSBvZiBmaXJld2FsbCBydWxlc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQ29tcGxldGUgZGF0YSBvYmplY3Qgd2l0aCBtZXRhZGF0YVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRGaXJld2FsbFRhYmxlKHJ1bGVzLCBkYXRhKSB7XG4gICAgICAgIGlmICghcnVsZXMgfHwgcnVsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJzxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlXCI+JyArIFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfTm9SdWxlc0NvbmZpZ3VyZWQpICsgJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJzx0YWJsZSBjbGFzcz1cInVpIHNlbGVjdGFibGUgdmVyeSBiYXNpYyBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCIgaWQ9XCJmaXJld2FsbC10YWJsZVwiPic7XG5cbiAgICAgICAgLy8gQnVpbGQgaGVhZGVyXG4gICAgICAgIGh0bWwgKz0gJzx0aGVhZD48dHI+PHRoIGNsYXNzPVwiY29sbGFwc2luZ1wiPjwvdGg+PHRoPjwvdGg+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjYXRlZ29yaWVzIGZyb20gZmlyc3QgcnVsZVxuICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gT2JqZWN0LmtleXMocnVsZXNbMF0ucnVsZXMgfHwge30pO1xuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlEYXRhID0gcnVsZXNbMF0ucnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gZGF0YS5pc0RvY2tlciAmJiAhZGF0YS5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcy5pbmNsdWRlcyhjYXRlZ29yeURhdGEubmFtZSk7XG4gICAgICAgICAgICBjb25zdCBsaW1pdGVkQ2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQnIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gYDx0aCB3aWR0aD1cIjIwcHhcIiBjbGFzcz1cImZpcmV3YWxsLWNhdGVnb3J5ICR7bGltaXRlZENsYXNzfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2PjxzcGFuPiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGNhdGVnb3J5RGF0YS5uYW1lKX08L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdGg+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8dGg+PC90aD48L3RyPjwvdGhlYWQ+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGJvZHlcbiAgICAgICAgaHRtbCArPSAnPHRib2R5Pic7XG4gICAgICAgIFxuICAgICAgICBydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgaHRtbCArPSBmaXJld2FsbFRhYmxlLmJ1aWxkUnVsZVJvdyhydWxlLCBjYXRlZ29yaWVzLCBkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L3Rib2R5PjwvdGFibGU+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgc2luZ2xlIHJ1bGUgcm93XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGUgLSBSdWxlIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjYXRlZ29yaWVzIC0gQ2F0ZWdvcnkga2V5c1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQ29tcGxldGUgZGF0YSBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGJ1aWxkUnVsZVJvdyhydWxlLCBjYXRlZ29yaWVzLCBkYXRhKSB7XG4gICAgICAgIGNvbnN0IHByaW9yaXR5ID0gcnVsZS5wcmlvcml0eSAhPT0gdW5kZWZpbmVkID8gcnVsZS5wcmlvcml0eSA6IDA7XG4gICAgICAgIGNvbnN0IHBlcm1pdCA9IGAke3J1bGUubmV0d29ya30vJHtydWxlLnN1Ym5ldH1gO1xuICAgICAgICBjb25zdCBpc0NhdGNoQWxsID0gKHBlcm1pdCA9PT0gJzAuMC4wLjAvMCcgfHwgcGVybWl0ID09PSAnOjovMCcpO1xuICAgICAgICBjb25zdCBub0RyYWdDbGFzcyA9IGlzQ2F0Y2hBbGwgPyAnIG5vZHJhZyBub2Ryb3AnIDogJyc7XG4gICAgICAgIGNvbnN0IGNsaWVudElwQ2xhc3MgPSBydWxlLmlzQ2xpZW50SXAgPyAnIGNsaWVudC1pcC1ydWxlJyA6ICcnO1xuICAgICAgICBsZXQgaHRtbCA9IGA8dHIgY2xhc3M9XCJydWxlLXJvdyR7bm9EcmFnQ2xhc3N9JHtjbGllbnRJcENsYXNzfVwiIGlkPVwiJHtydWxlLmlkIHx8ICcnfVwiIGRhdGEtdmFsdWU9XCIke3ByaW9yaXR5fVwiPmA7XG5cbiAgICAgICAgLy8gRHJhZyBoYW5kbGUgY2VsbCDigJQgZW1wdHkgZm9yIGNhdGNoLWFsbCBydWxlcyAobm90IGRyYWdnYWJsZSlcbiAgICAgICAgaWYgKGlzQ2F0Y2hBbGwpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzx0ZCBjbGFzcz1cImNvbGxhcHNpbmdcIj48L3RkPic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dGQgY2xhc3M9XCJjb2xsYXBzaW5nIGRyYWdIYW5kbGVcIj48aSBjbGFzcz1cInNvcnQgZ3JleSBpY29uXCI+PC9pPjwvdGQ+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5ldHdvcmsgYW5kIGRlc2NyaXB0aW9uIGNlbGxcbiAgICAgICAgaHRtbCArPSAnPHRkPic7XG4gICAgICAgIGlmIChydWxlLmlzQ2xpZW50SXApIHtcbiAgICAgICAgICAgIGNvbnN0IGhpbnQgPSBTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZ2xvYmFsVHJhbnNsYXRlLmZ3X1RoaXNJc1lvdXJDdXJyZW50SXBIaW50KTtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwidXNlciBjaXJjbGUgYmx1ZSBpY29uIHBvcHVwZWQgY2xpZW50LWlwLWhpbnRcIiBkYXRhLWNvbnRlbnQ9XCIke2hpbnR9XCI+PC9pPiBgO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJ1bGUuZGVzY3JpcHRpb24gaXMgYWRtaW4tY29udHJvbGxlZCBhbmQgc3RvcmVkIGluIHRoZSBEQiB3aXRob3V0IEhUTUwgc3RyaXBwaW5nIOKAlFxuICAgICAgICAvLyBlc2NhcGUgaXQgKGFuZCBydWxlLm5ldHdvcmsgZm9yIHN5bW1ldHJ5KSBiZWZvcmUgaW5qZWN0aW5nIGludG8gdGhlIHRhYmxlLlxuICAgICAgICBodG1sICs9IGAke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChydWxlLm5ldHdvcmspfSAtICR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJ1bGUuZGVzY3JpcHRpb24pfWA7XG4gICAgICAgIGlmICghcnVsZS5pZCkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGJyPjxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuZndfTmVlZENvbmZpZ3VyZVJ1bGUpfTwvc3Bhbj5gO1xuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gJzwvdGQ+JztcbiAgICAgICAgXG4gICAgICAgIC8vIENhdGVnb3J5IGNlbGxzXG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeVJ1bGUgPSBydWxlLnJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnlSdWxlKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPHRkPjwvdGQ+JztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGRhdGEuaXNEb2NrZXIgJiYgIWRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMuaW5jbHVkZXMoY2F0ZWdvcnlSdWxlLm5hbWUpO1xuICAgICAgICAgICAgY29uc3QgbGltaXRlZENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkJyA6ICcnO1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gY2F0ZWdvcnlSdWxlLmFjdGlvbiA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCBtYXJrcyAke2xpbWl0ZWRDbGFzc31cIiBkYXRhLWFjdGlvbj1cIiR7YWN0aW9ufVwiIGRhdGEtbmV0d29yaz1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKHJ1bGUubmV0d29yayl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbnNcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnYWxsb3cnKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNoZWNrbWFyayBncmVlblwiIGRhdGEtdmFsdWU9XCJvblwiPjwvaT4nO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChkYXRhLmZpcmV3YWxsRW5hYmxlZCA9PT0gJzEnKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzTGltaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGFzIGRpc2FibGVkIGZpcmV3YWxsIGZvciBibG9ja2VkIGxpbWl0ZWQgc2VydmljZXMgaW4gRG9ja2VyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjaGVja21hcmsgZ3JlZW5cIiBkYXRhLXZhbHVlPVwib2ZmXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjb3JuZXIgY2xvc2UgcmVkXCI+PC9pPic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNsb3NlIHJlZFwiIGRhdGEtdmFsdWU9XCJvZmZcIj48L2k+JztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJpY29uIGNvcm5lciBjbG9zZSByZWRcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+PC9pPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gY2hlY2ttYXJrIGdyZWVuXCIgZGF0YS12YWx1ZT1cIm9mZlwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiBjb3JuZXIgY2xvc2UgcmVkXCI+PC9pPic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvaT48L3RkPic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY2VsbFxuICAgICAgICBodG1sICs9ICc8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj4nO1xuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zXCI+JztcblxuICAgICAgICBpZiAoIXJ1bGUuaWQpIHtcbiAgICAgICAgICAgIC8vIE5ldyBydWxlIC0gdXNlIGxpbmsgd2l0aCBVUkwgcGFyYW1ldGVycyBpbnN0ZWFkIG9mIGZvcm1cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgbmV0d29yayBhbmQgc3VibmV0IGZyb20gcnVsZS5uZXR3b3JrIChlLmcuLCBcIjAuMC4wLjAvMFwiIC0+IG5ldHdvcms9MC4wLjAuMCZzdWJuZXQ9MClcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmtQYXJ0cyA9IHJ1bGUubmV0d29yay5zcGxpdCgnLycpO1xuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IG5ldHdvcmtQYXJ0c1swXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldCA9IG5ldHdvcmtQYXJ0c1sxXSB8fCAnMCc7XG4gICAgICAgICAgICBjb25zdCBydWxlTmFtZSA9IHJ1bGUuZGVzY3JpcHRpb24gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBtb2RpZnlDbGFzcyA9IGZpcmV3YWxsVGFibGUucGVybWlzc2lvbnMubW9kaWZ5ID8gJycgOiAnZGlzYWJsZWQnO1xuICAgICAgICAgICAgY29uc3QgcHJlZmlsbFVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5Lz9uZXR3b3JrPSR7ZW5jb2RlVVJJQ29tcG9uZW50KG5ldHdvcmspfSZzdWJuZXQ9JHtlbmNvZGVVUklDb21wb25lbnQoc3VibmV0KX0mcnVsZU5hbWU9JHtlbmNvZGVVUklDb21wb25lbnQocnVsZU5hbWUpfWA7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiJHtwcmVmaWxsVXJsfVwiIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBtaW5pIGJ1dHRvbiAke21vZGlmeUNsYXNzfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPjwvYT4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGRpc2FibGVkIGJ1dHRvblwiPjxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBydWxlIGJ1dHRvbnNcbiAgICAgICAgICAgIGNvbnN0IG1vZGlmeUNsYXNzID0gZmlyZXdhbGxUYWJsZS5wZXJtaXNzaW9ucy5tb2RpZnkgPyAnJyA6ICdkaXNhYmxlZCc7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS8ke3J1bGUuaWR9XCIgYDtcbiAgICAgICAgICAgIGh0bWwgKz0gYGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZCAke21vZGlmeUNsYXNzfVwiIGA7XG4gICAgICAgICAgICBodG1sICs9IGBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXQpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPjwvYT4nO1xuXG4gICAgICAgICAgICBpZiAocnVsZS5wZXJtYW5lbnQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgZGlzYWJsZWQgYnV0dG9uXCI+PGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT48L2E+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVsZXRlQ2xhc3MgPSBmaXJld2FsbFRhYmxlLnBlcm1pc3Npb25zLmRlbGV0ZSA/ICcnIDogJ2Rpc2FibGVkJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiI1wiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZCAke2RlbGV0ZUNsYXNzfVwiIGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgZGF0YS12YWx1ZT1cIiR7cnVsZS5pZH1cIiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGdsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlKX1cIj5gO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+PC9hPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvdGQ+PC90cj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBzZXJ2aWNlIGluZm8gc2NyaXB0IHRhZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gRmlyZXdhbGwgZGF0YVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgYnVpbGRTZXJ2aWNlSW5mb1NjcmlwdChkYXRhKSB7XG4gICAgICAgIC8vIENvbGxlY3QgcG9ydCBpbmZvcm1hdGlvbiBmcm9tIHJ1bGVzXG4gICAgICAgIGNvbnN0IHNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICBjb25zdCBzZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhLml0ZW1zICYmIGRhdGEuaXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZmlyc3RSdWxlID0gZGF0YS5pdGVtc1swXTtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGZpcnN0UnVsZS5ydWxlcyB8fCB7fSkuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnVsZSA9IGZpcnN0UnVsZS5ydWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICAgICAgc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5XSA9IHJ1bGUucG9ydHMgfHwgW107XG4gICAgICAgICAgICAgICAgc2VydmljZU5hbWVNYXBwaW5nW3J1bGUubmFtZV0gPSBjYXRlZ29yeTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPHNjcmlwdD5cbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0gJHtKU09OLnN0cmluZ2lmeShzZXJ2aWNlUG9ydEluZm8pfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0gJHtKU09OLnN0cmluZ2lmeShzZXJ2aWNlTmFtZU1hcHBpbmcpfTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSAke2RhdGEuaXNEb2NrZXIgPyAndHJ1ZScgOiAnZmFsc2UnfTtcbiAgICAgICAgICAgIDwvc2NyaXB0PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgVUkgZWxlbWVudHMgYWZ0ZXIgRE9NIGNyZWF0aW9uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZvciBjb250ZXh0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJRWxlbWVudHMoZGF0YSkge1xuXG4gICAgICAgIC8vIEJvdW5jZXIgYmFubmVyIHNlbGYtY2hlY2sgYnV0dG9uIChvbmx5IHJlbmRlcmVkIGluIERvY2tlciBicmlkZ2Ugd2l0aFxuICAgICAgICAvLyBoaWRkZW4gY2xpZW50IElQIOKAlCBpbml0aWFsaXphdGlvbiBpcyBhIG5vLW9wIHdoZW4gdGhlIGJ1dHRvbiBpcyBhYnNlbnQpLlxuICAgICAgICBmaXJld2FsbFRhYmxlLmluaXRCb3VuY2VyQmFubmVySGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3AgcmVvcmRlcmluZyBmb3IgcHJpb3JpdHlcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXRhYmxlIHRib2R5JykudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiBmaXJld2FsbFRhYmxlLmNiT25Ecm9wLFxuICAgICAgICAgICAgb25EcmFnQ2xhc3M6ICdob3ZlcmluZ1JvdycsXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgZG91YmxlLWNsaWNrIGhhbmRsZXIgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgcm93c1xuICAgICAgICAvLyBFeGNsdWRlIGxhc3QgY2VsbCB3aXRoIGFjdGlvbiBidXR0b25zIHRvIHByZXZlbnQgYWNjaWRlbnRhbCBuYXZpZ2F0aW9uIG9uIGRlbGV0ZSBidXR0b24gY2xpY2tzXG4gICAgICAgICQoJy5ydWxlLXJvdyB0ZDpub3QoOmxhc3QtY2hpbGQpJykub2ZmKCdkYmxjbGljaycpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvbW9kaWZ5LyR7aWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMZXQgZGVsZXRlLXNvbWV0aGluZy5qcyBoYW5kbGUgdGhlIGZpcnN0IGNsaWNrLCB3ZSBqdXN0IHByZXZlbnQgZGVmYXVsdCBuYXZpZ2F0aW9uXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGUudHdvLXN0ZXBzLWRlbGV0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIC8vIERvbid0IHN0b3AgcHJvcGFnYXRpb24gLSBhbGxvdyBkZWxldGUtc29tZXRoaW5nLmpzIHRvIHdvcmtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgLSB3b3JrcyB3aXRoIHR3by1zdGVwcy1kZWxldGUgbG9naWNcbiAgICAgICAgLy8gVGhpcyB3aWxsIGJlIHRyaWdnZXJlZCBhZnRlciBkZWxldGUtc29tZXRoaW5nLmpzIHJlbW92ZXMgdGhlIHR3by1zdGVwcy1kZWxldGUgY2xhc3NcbiAgICAgICAgJCgnYm9keScpLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBydWxlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuZGVsZXRlUmVjb3JkKHJ1bGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZWxvYWQgZGF0YSB0byByZWZyZXNoIHRoZSB0YWJsZVxuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2U/Lm1lc3NhZ2VzIHx8IGdsb2JhbFRyYW5zbGF0ZS5md19FcnJvckRlbGV0aW5nUnVsZSk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVzdG9yZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlmIGRlbGV0aW9uIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG4gICAgICAgICAgICAgICAgICAgICRidXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXR1cCBjaGVja2JveCB0byBlbmFibGUgb3IgZGlzYWJsZSB0aGUgZmlyZXdhbGxcbiAgICAgICAgaWYgKGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZSkge1xuICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlXG4gICAgICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICAgICAgb25DaGVja2VkOiBmaXJld2FsbFRhYmxlLmVuYWJsZUZpcmV3YWxsLFxuICAgICAgICAgICAgICAgICAgICBvblVuY2hlY2tlZDogZmlyZXdhbGxUYWJsZS5kaXNhYmxlRmlyZXdhbGwsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBlZGl0L2RlbGV0ZSBidXR0b25zXG4gICAgICAgICQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRG9ja2VyLXNwZWNpZmljIFVJIGVsZW1lbnRzIHdpdGggZGF0YSBjb250ZXh0XG4gICAgICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZURvY2tlclVJKGRhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLy8gSW5pdGlhbGl6ZSBEb2NrZXItc3BlY2lmaWMgVUkgZWxlbWVudHNcbiAgICBpbml0aWFsaXplRG9ja2VyVUkoZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIHBvcnQgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKCF3aW5kb3cuc2VydmljZVBvcnRJbmZvIHx8ICF3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFsbCBzZXJ2aWNlIGNlbGxzIGluIHRoZSB0YWJsZVxuICAgICAgICAkKCd0ZC5tYXJrcycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgc2VydmljZSBuYW1lIGZyb20gdGhlIGhlYWRlclxuICAgICAgICAgICAgY29uc3QgY29sdW1uSW5kZXggPSAkY2VsbC5pbmRleCgpO1xuICAgICAgICAgICAgY29uc3QgJGhlYWRlckNlbGwgPSAkY2VsbC5jbG9zZXN0KCd0YWJsZScpLmZpbmQoJ3RoZWFkIHRoJykuZXEoY29sdW1uSW5kZXgpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZU5hbWUgPSAkaGVhZGVyQ2VsbC5maW5kKCdzcGFuJykudGV4dCgpIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2VydmljZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGNhdGVnb3J5IGtleSBmcm9tIHRoZSBkaXNwbGF5IG5hbWVcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9IHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2VydmljZU5hbWVdIHx8IHNlcnZpY2VOYW1lO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeUtleV0gfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNlbGwuYXR0cignZGF0YS1hY3Rpb24nKSB8fCAnYWxsb3cnO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSAkY2VsbC5hdHRyKCdkYXRhLW5ldHdvcmsnKSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkY2VsbC5oYXNDbGFzcygnZG9ja2VyLWxpbWl0ZWQnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0RvY2tlciA9IGRhdGEgPyBkYXRhLmlzRG9ja2VyIDogd2luZG93LmlzRG9ja2VyO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCB1c2luZyB1bmlmaWVkIGdlbmVyYXRvclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5S2V5LFxuICAgICAgICAgICAgICAgICAgICBhY3Rpb24sXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgICAgIGlzRG9ja2VyLFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLFxuICAgICAgICAgICAgICAgICAgICBpc0RvY2tlciAmJiBpc0xpbWl0ZWQgLy8gU2hvdyBjb3B5IGJ1dHRvbiBmb3IgRG9ja2VyIGxpbWl0ZWQgc2VydmljZXNcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGNlbGwsIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRyaWdnZXJlZCB3aGVuIGEgZmlyZXdhbGwgcnVsZSByb3cgaXMgZHJvcHBlZCBhZnRlciBkcmFnXG4gICAgICogU2VuZHMgdXBkYXRlZCBwcmlvcml0aWVzIHRvIHRoZSBBUElcbiAgICAgKi9cbiAgICBjYk9uRHJvcCgpIHtcbiAgICAgICAgbGV0IHByaW9yaXR5V2FzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBwcmlvcml0eURhdGEgPSB7fTtcblxuICAgICAgICAkKCcjZmlyZXdhbGwtdGFibGUgdGJvZHkgdHInKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBydWxlSWQgPSAkKG9iaikuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmICghcnVsZUlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBTa2lwIHJvd3Mgd2l0aG91dCBJRCAodW5zYXZlZCBydWxlcylcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG9sZFByaW9yaXR5ID0gcGFyc2VJbnQoJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKSwgMTApO1xuICAgICAgICAgICAgY29uc3QgbmV3UHJpb3JpdHkgPSBpbmRleCArIDE7XG5cbiAgICAgICAgICAgIGlmIChvbGRQcmlvcml0eSAhPT0gbmV3UHJpb3JpdHkpIHtcbiAgICAgICAgICAgICAgICBwcmlvcml0eVdhc0NoYW5nZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHByaW9yaXR5RGF0YVtydWxlSWRdID0gbmV3UHJpb3JpdHk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChwcmlvcml0eVdhc0NoYW5nZWQpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkYXRhLXZhbHVlIGF0dHJpYnV0ZXMgaW1tZWRpYXRlbHkgdG8gcmVmbGVjdCBuZXcgcG9zaXRpb25zXG4gICAgICAgICAgICAkKCcjZmlyZXdhbGwtdGFibGUgdGJvZHkgdHInKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnLCBpbmRleCArIDEpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLmNoYW5nZVByaW9yaXR5KHByaW9yaXR5RGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV2ZXJ0IG9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gRW5hYmxlIHRoZSBmaXJld2FsbCBieSBtYWtpbmcgYW4gSFRUUCByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIuXG4gICAgZW5hYmxlRmlyZXdhbGwoKSB7XG4gICAgICAgIEZpcmV3YWxsQVBJLmVuYWJsZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJFbmFibGVkKHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRhYmxlLmNiQWZ0ZXJEaXNhYmxlZCgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIERpc2FibGUgdGhlIGZpcmV3YWxsIGJ5IG1ha2luZyBhbiBIVFRQIHJlcXVlc3QgdG8gdGhlIHNlcnZlci5cbiAgICBkaXNhYmxlRmlyZXdhbGwoKSB7XG4gICAgICAgIEZpcmV3YWxsQVBJLmRpc2FibGUoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUYWJsZS5jYkFmdGVyRGlzYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpcmV3YWxsVGFibGUuY2JBZnRlckVuYWJsZWQoKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvLyBDYWxsYmFjayBhZnRlciB0aGUgZmlyZXdhbGwgaGFzIGJlZW4gZW5hYmxlZC5cbiAgICBjYkFmdGVyRW5hYmxlZChzZW5kRXZlbnQgPSBmYWxzZSkge1xuICAgICAgICBmaXJld2FsbFRhYmxlLiRzdGF0dXNUb2dnbGUuZmluZCgnbGFiZWwnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5md19TdGF0dXNFbmFibGVkKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHN1cHBvcnRlZCBzZXJ2aWNlcywgY2hhbmdlIGdyZWVuIGNoZWNrbWFya3MgdG8gcmVkIGNyb3NzZXNcbiAgICAgICAgJCgndGQubWFya3M6bm90KC5kb2NrZXItbGltaXRlZCkgaS5pY29uLmNoZWNrbWFyay5ncmVlbltkYXRhLXZhbHVlPVwib2ZmXCJdJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnY2hlY2ttYXJrIGdyZWVuJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnY2xvc2UgcmVkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgbGltaXRlZCBzZXJ2aWNlcyBpbiBEb2NrZXIsIGtlZXAgZ3JlZW4gY2hlY2ttYXJrIGJ1dCBoaWRlIGNvcm5lciBjbG9zZVxuICAgICAgICAkKCd0ZC5kb2NrZXItbGltaXRlZCBpLmljb24uY29ybmVyLmNsb3NlJykuaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIGFsbCBvdGhlciBzZXJ2aWNlcywgaGlkZSBjb3JuZXIgY2xvc2VcbiAgICAgICAgJCgndGQubWFya3M6bm90KC5kb2NrZXItbGltaXRlZCkgaS5pY29uLmNvcm5lci5jbG9zZScpLmhpZGUoKTtcblxuICAgICAgICBpZiAoc2VuZEV2ZW50KSB7XG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBDYWxsYmFjayBhZnRlciB0aGUgZmlyZXdhbGwgaGFzIGJlZW4gZGlzYWJsZWQuXG4gICAgY2JBZnRlckRpc2FibGVkKHNlbmRFdmVudCA9IGZhbHNlKSB7XG4gICAgICAgIGZpcmV3YWxsVGFibGUuJHN0YXR1c1RvZ2dsZS5maW5kKCdsYWJlbCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmZ3X1N0YXR1c0Rpc2FibGVkKTtcbiAgICAgICAgZmlyZXdhbGxUYWJsZS4kc3RhdHVzVG9nZ2xlLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3IgYWxsIHNlcnZpY2VzLCBjaGFuZ2UgcmVkIGNyb3NzZXMgdG8gZ3JlZW4gY2hlY2ttYXJrc1xuICAgICAgICAkKCdpLmljb24uY2xvc2UucmVkW2RhdGEtdmFsdWU9XCJvZmZcIl0nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdjbG9zZSByZWQnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdjaGVja21hcmsgZ3JlZW4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgY29ybmVyIGNsb3NlIGZvciBhbGwgc2VydmljZXMgd2hlbiBmaXJld2FsbCBpcyBkaXNhYmxlZFxuICAgICAgICAkKCdpLmljb24uY29ybmVyLmNsb3NlJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNlbmRFdmVudCkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIEZpcmV3YWxsIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7Il19