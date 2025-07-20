"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate */

/**
 * Unified tooltip generator for firewall rules
 * @module firewallTooltips
 */
var firewallTooltips = {
  /**
   * Generate tooltip content based on service, action and context
   * @param {string} service - Service category name
   * @param {string} action - Current action (allow/block)
   * @param {string} network - Network address with subnet
   * @param {boolean} isDocker - Whether running in Docker
   * @param {boolean} isLimited - Whether service is limited in Docker
   * @param {Object} portInfo - Port information for the service
   * @param {boolean} showCopyButton - Whether to show copy button
   * @returns {string} HTML content for tooltip
   */
  generateContent: function generateContent(service, action, network, isDocker, isLimited, portInfo) {
    var showCopyButton = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : false;
    var content = '<div class="content">'; // Service name header

    var serviceDescription = globalTranslate["fw_".concat(service.toLowerCase(), "Description")] || service;
    content += "<div class=\"header\"><b>".concat(serviceDescription, "</b></div>"); // Port information

    if (portInfo && portInfo.length > 0) {
      content += "<div class=\"ui divider\"></div>";
      content += "<p><strong>".concat(globalTranslate.fw_ServicePortsInfo || 'Used ports', ":</strong></p>");
      content += '<ul class="ui list">';
      portInfo.forEach(function (port) {
        var portStr = '';

        if (port.port !== undefined) {
          portStr = "".concat(port.protocol, " ").concat(port.port);
        } else if (port.range) {
          portStr = "".concat(port.protocol, " ").concat(port.range);
        } else if (port.protocol === 'ICMP') {
          portStr = 'ICMP';
        }

        if (port.description && !port.description.startsWith('fw_')) {
          portStr += " - ".concat(port.description);
        } else if (port.description && globalTranslate[port.description]) {
          portStr += " - ".concat(globalTranslate[port.description]);
        }

        content += "<li>".concat(portStr, "</li>");
      });
      content += '</ul>';
    } // Context-specific content


    content += "<div class=\"ui divider\"></div>";

    if (isDocker && isLimited) {
      // Docker limited service - always show host configuration
      content += "<div class=\"ui warning message\">";
      content += "<i class=\"warning icon\"></i> ".concat(globalTranslate.fw_DockerLimitedService || 'This service is always enabled in Docker environment. Firewall rules must be configured on the Docker host.');
      content += "</div>";
      content += "<p><strong>".concat(globalTranslate.fw_DockerConfigureRules || 'Configure firewall rules on Docker host', ":</strong></p>");
      content += '<div class="ui segment">';

      if (showCopyButton) {
        content += "<div class=\"ui top right attached label copy-command\" style=\"cursor: pointer;\">";
        content += "<i class=\"copy icon\"></i> ".concat(globalTranslate.fw_CopyCommand || 'Copy');
        content += '</div>';
      }

      content += '<pre style="font-size: 0.85em; margin: 0;">';

      if (portInfo && portInfo.length > 0) {
        portInfo.forEach(function (port) {
          var iptablesAction = action === 'allow' ? 'ACCEPT' : 'DROP';

          if (port.protocol === 'ICMP') {
            content += "iptables -A DOCKER-USER -s ".concat(network, " -p icmp -j ").concat(iptablesAction, "\n");
          } else if (port.port !== undefined && port.port !== 0) {
            content += "iptables -A DOCKER-USER -s ".concat(network, " -p ").concat(port.protocol.toLowerCase(), " --dport ").concat(port.port, " -j ").concat(iptablesAction, "\n");
          } else if (port.range) {
            var _port$range$split = port.range.split('-'),
                _port$range$split2 = _slicedToArray(_port$range$split, 2),
                from = _port$range$split2[0],
                to = _port$range$split2[1];

            content += "iptables -A DOCKER-USER -s ".concat(network, " -p ").concat(port.protocol.toLowerCase(), " --dport ").concat(from, ":").concat(to, " -j ").concat(iptablesAction, "\n");
          }
        });
      }

      content += '</pre>';
      content += '</div>';
    } else if (isDocker) {
      // Docker supported service - just information
      if (action === 'allow') {
        content += "<p>".concat(globalTranslate.fw_AccessAllowedForSubnet || 'Access will be allowed for subnet', " <strong>").concat(network, "</strong></p>");
      } else {
        content += "<p>".concat(globalTranslate.fw_AccessBlockedForSubnet || 'Access will be blocked for subnet', " <strong>").concat(network, "</strong></p>");
      }
    } else {
      // Regular environment - show iptables rules
      content += "<p><strong>".concat(globalTranslate.fw_IptablesRulesApplied || 'Following iptables rules will be applied', ":</strong></p>");
      content += '<div class="ui segment">';
      content += '<pre style="font-size: 0.85em; margin: 0;">';

      if (portInfo && portInfo.length > 0) {
        portInfo.forEach(function (port) {
          var iptablesAction = action === 'allow' ? 'ACCEPT' : 'DROP';

          if (port.protocol === 'ICMP') {
            content += "iptables -A INPUT -s ".concat(network, " -p icmp -j ").concat(iptablesAction, "\n");
          } else if (port.port !== undefined && port.port !== 0) {
            content += "iptables -A INPUT -s ".concat(network, " -p ").concat(port.protocol.toLowerCase(), " --dport ").concat(port.port, " -j ").concat(iptablesAction, "\n");
          } else if (port.range) {
            var _port$range$split3 = port.range.split('-'),
                _port$range$split4 = _slicedToArray(_port$range$split3, 2),
                from = _port$range$split4[0],
                to = _port$range$split4[1];

            content += "iptables -A INPUT -s ".concat(network, " -p ").concat(port.protocol.toLowerCase(), " --dport ").concat(from, ":").concat(to, " -j ").concat(iptablesAction, "\n");
          }
        });
      }

      content += '</pre>';
      content += '</div>';
    }

    content += '</div>';
    return content;
  },

  /**
   * Initialize tooltip on element
   * @param {jQuery} $element - jQuery element to attach tooltip to
   * @param {Object} options - Tooltip options
   */
  initializeTooltip: function initializeTooltip($element, options) {
    var defaults = {
      position: 'top center',
      hoverable: true,
      delay: {
        show: 300,
        hide: 100
      },
      variation: 'flowing'
    };
    var settings = $.extend({}, defaults, options);

    if (settings.onShow) {
      var originalOnShow = settings.onShow;

      settings.onShow = function () {
        originalOnShow.call(this); // Initialize copy buttons after popup is shown

        setTimeout(function () {
          $('.copy-command').off('click').on('click', firewallTooltips.copyToClipboard);
        }, 100);
      };
    } else {
      settings.onShow = function () {
        setTimeout(function () {
          $('.copy-command').off('click').on('click', firewallTooltips.copyToClipboard);
        }, 100);
      };
    }

    $element.popup(settings);
  },

  /**
   * Copy command to clipboard
   */
  copyToClipboard: function copyToClipboard(e) {
    e.preventDefault();
    var $label = $(e.currentTarget);
    var $pre = $label.siblings('pre');
    var text = $pre.text(); // Create temporary textarea

    var $temp = $('<textarea>');
    $('body').append($temp);
    $temp.val(text).select();

    try {
      document.execCommand('copy');
      $label.html("<i class=\"check icon\"></i> ".concat(globalTranslate.fw_CommandCopied || 'Copied!'));
      setTimeout(function () {
        $label.html("<i class=\"copy icon\"></i> ".concat(globalTranslate.fw_CopyCommand || 'Copy'));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }

    $temp.remove();
  },

  /**
   * Update tooltip content dynamically
   * @param {jQuery} $element - Element with tooltip
   * @param {string} newContent - New HTML content
   * @param {Object} additionalOptions - Additional options to merge
   */
  updateContent: function updateContent($element, newContent) {
    var additionalOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var options = {
      html: newContent,
      position: 'top center',
      hoverable: true,
      delay: {
        show: 300,
        hide: 100
      },
      variation: 'flowing',
      onShow: function onShow() {
        setTimeout(function () {
          $('.copy-command').off('click').on('click', firewallTooltips.copyToClipboard);
        }, 100);
      }
    }; // Merge additional options

    $.extend(options, additionalOptions);
    $element.popup('destroy');
    $element.popup(options);
  },

  /**
   * Generate tooltip content for special checkboxes (newer_block_ip and local_network)
   * @param {string} type - Type of checkbox ('newer_block_ip' or 'local_network')
   * @param {string} network - Network address with subnet
   * @param {boolean} isChecked - Whether checkbox is checked
   * @returns {string} HTML content for tooltip
   */
  generateSpecialCheckboxContent: function generateSpecialCheckboxContent(type, network, isChecked) {
    var content = '<div class="content">';

    if (type === 'newer_block_ip') {
      // Header
      content += "<div class=\"header\"><b>".concat(globalTranslate.fw_NewerBlockIp || 'Never block IPs', "</b></div>");
      content += "<div class=\"ui divider\"></div>"; // Description

      content += "<p>".concat(globalTranslate.fw_NewerBlockIpTooltip || 'IP addresses from this subnet will never be blocked by Fail2ban service, even after multiple failed login attempts. Use this option for trusted networks such as office network or VPN.', "</p>"); // Effect

      content += "<div class=\"ui divider\"></div>";
      content += "<p><strong>".concat(globalTranslate.fw_Effect || 'Effect', ":</strong></p>");

      if (isChecked) {
        content += "<div class=\"ui segment\">";
        content += "<i class=\"shield alternate icon\"></i> ".concat(globalTranslate.fw_Fail2banWillIgnore || 'Fail2ban will ignore failed authentication attempts from', " <strong>").concat(network, "</strong>");
        content += "</div>";
        content += "<p class=\"ui warning message\">";
        content += "<i class=\"warning icon\"></i> ".concat(globalTranslate.fw_SecurityWarning || 'Warning: This reduces security for the specified network. Use only for trusted networks.');
        content += "</p>";
      } else {
        content += "<p>".concat(globalTranslate.fw_Fail2banWillMonitor || 'Fail2ban will monitor and may block IPs from', " <strong>").concat(network, "</strong> ").concat(globalTranslate.fw_AfterFailedAttempts || 'after failed authentication attempts.', "</p>");
      }
    } else if (type === 'local_network') {
      // Header
      content += "<div class=\"header\"><b>".concat(globalTranslate.fw_ItIsLocalNetwork || 'Local network or VPN', "</b></div>");
      content += "<div class=\"ui divider\"></div>"; // Description

      content += "<p>".concat(globalTranslate.fw_LocalNetworkTooltip || 'Specify this option for local networks or VPN where devices connect to MikoPBX directly without NAT. This affects SIP packet processing and allows proper device address detection in the local network.', "</p>"); // Effect

      content += "<div class=\"ui divider\"></div>";
      content += "<p><strong>".concat(globalTranslate.fw_Effect || 'Effect', ":</strong></p>");

      if (isChecked) {
        content += "<div class=\"ui segment\">";
        content += "<ul class=\"ui list\">";
        content += "<li><i class=\"check icon\"></i> ".concat(globalTranslate.fw_DirectSIPRouting || 'SIP packets will be routed directly without NAT handling', "</li>");
        content += "<li><i class=\"check icon\"></i> ".concat(globalTranslate.fw_NoContactRewriting || 'Contact headers will not be rewritten', "</li>");
        content += "<li><i class=\"check icon\"></i> ".concat(globalTranslate.fw_LocalAddressDetection || 'Device addresses will be detected as local', "</li>");
        content += "</ul>";
        content += "</div>";
      } else {
        content += "<p>".concat(globalTranslate.fw_NATHandling || 'Network', " <strong>").concat(network, "</strong> ").concat(globalTranslate.fw_WillBeHandledAsExternal || 'will be handled as external network with NAT traversal enabled.', "</p>");
      }
    }

    content += '</div>';
    return content;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC10b29sdGlwcy5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50Iiwic2VydmljZSIsImFjdGlvbiIsIm5ldHdvcmsiLCJpc0RvY2tlciIsImlzTGltaXRlZCIsInBvcnRJbmZvIiwic2hvd0NvcHlCdXR0b24iLCJjb250ZW50Iiwic2VydmljZURlc2NyaXB0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9Mb3dlckNhc2UiLCJsZW5ndGgiLCJmd19TZXJ2aWNlUG9ydHNJbmZvIiwiZm9yRWFjaCIsInBvcnQiLCJwb3J0U3RyIiwidW5kZWZpbmVkIiwicHJvdG9jb2wiLCJyYW5nZSIsImRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlIiwiZndfRG9ja2VyQ29uZmlndXJlUnVsZXMiLCJmd19Db3B5Q29tbWFuZCIsImlwdGFibGVzQWN0aW9uIiwic3BsaXQiLCJmcm9tIiwidG8iLCJmd19BY2Nlc3NBbGxvd2VkRm9yU3VibmV0IiwiZndfQWNjZXNzQmxvY2tlZEZvclN1Ym5ldCIsImZ3X0lwdGFibGVzUnVsZXNBcHBsaWVkIiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCIkZWxlbWVudCIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiJCIsImV4dGVuZCIsIm9uU2hvdyIsIm9yaWdpbmFsT25TaG93IiwiY2FsbCIsInNldFRpbWVvdXQiLCJvZmYiLCJvbiIsImNvcHlUb0NsaXBib2FyZCIsInBvcHVwIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiY3VycmVudFRhcmdldCIsIiRwcmUiLCJzaWJsaW5ncyIsInRleHQiLCIkdGVtcCIsImFwcGVuZCIsInZhbCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJodG1sIiwiZndfQ29tbWFuZENvcGllZCIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsInJlbW92ZSIsInVwZGF0ZUNvbnRlbnQiLCJuZXdDb250ZW50IiwiYWRkaXRpb25hbE9wdGlvbnMiLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ0eXBlIiwiaXNDaGVja2VkIiwiZndfTmV3ZXJCbG9ja0lwIiwiZndfTmV3ZXJCbG9ja0lwVG9vbHRpcCIsImZ3X0VmZmVjdCIsImZ3X0ZhaWwyYmFuV2lsbElnbm9yZSIsImZ3X1NlY3VyaXR5V2FybmluZyIsImZ3X0ZhaWwyYmFuV2lsbE1vbml0b3IiLCJmd19BZnRlckZhaWxlZEF0dGVtcHRzIiwiZndfSXRJc0xvY2FsTmV0d29yayIsImZ3X0xvY2FsTmV0d29ya1Rvb2x0aXAiLCJmd19EaXJlY3RTSVBSb3V0aW5nIiwiZndfTm9Db250YWN0UmV3cml0aW5nIiwiZndfTG9jYWxBZGRyZXNzRGV0ZWN0aW9uIiwiZndfTkFUSGFuZGxpbmciLCJmd19XaWxsQmVIYW5kbGVkQXNFeHRlcm5hbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQVpxQiwyQkFZTEMsT0FaSyxFQVlJQyxNQVpKLEVBWVlDLE9BWlosRUFZcUJDLFFBWnJCLEVBWStCQyxTQVovQixFQVkwQ0MsUUFaMUMsRUFZNEU7QUFBQSxRQUF4QkMsY0FBd0IsdUVBQVAsS0FBTztBQUM3RixRQUFJQyxPQUFPLEdBQUcsdUJBQWQsQ0FENkYsQ0FHN0Y7O0FBQ0EsUUFBTUMsa0JBQWtCLEdBQUdDLGVBQWUsY0FBT1Qs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LE9BQU8sK0NBQXNDRSxlQUFlLENBQUM2RSxtQkFBaEIsSUFBdUMsMERBQTdFLFVBQVA7QUFDQS9FLFFBQUFBLE9BQU8sK0NBQXNDRSxlQUFlLENBQUM4RSxxQkFBaEIsSUFBeUMsdUNBQS9FLFVBQVA7QUFDQWhGLFFBQUFBLE9BQU8sK0NBQXNDRSxlQUFlLENBQUMrRSx3QkFBaEIsSUFBNEMsNENBQWxGLFVBQVA7QUFDQWpGLFFBQUFBLE9BQU8sV0FBUDtBQUNBQSxRQUFBQSxPQUFPLFlBQVA7QUFDSCxPQVJELE1BUU87QUFDSEEsUUFBQUEsT0FBTyxpQkFBVUUsZUFBZSxDQUFDZ0YsY0FBaEIsSUFBa0MsU0FBNUMsc0JBQWlFdkYsT0FBakUsdUJBQXFGTyxlQUFlLENBQUNpRiwwQkFBaEIsSUFBOEMsaUVBQW5JLFNBQVA7QUFDSDtBQUNKOztBQUVEbkYsSUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDQSxXQUFPQSxPQUFQO0FBQ0g7QUFsUm9CLENBQXpCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFVuaWZpZWQgdG9vbHRpcCBnZW5lcmF0b3IgZm9yIGZpcmV3YWxsIHJ1bGVzXG4gKiBAbW9kdWxlIGZpcmV3YWxsVG9vbHRpcHNcbiAqL1xuY29uc3QgZmlyZXdhbGxUb29sdGlwcyA9IHtcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB0b29sdGlwIGNvbnRlbnQgYmFzZWQgb24gc2VydmljZSwgYWN0aW9uIGFuZCBjb250ZXh0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlcnZpY2UgLSBTZXJ2aWNlIGNhdGVnb3J5IG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQ3VycmVudCBhY3Rpb24gKGFsbG93L2Jsb2NrKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXR3b3JrIC0gTmV0d29yayBhZGRyZXNzIHdpdGggc3VibmV0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzTGltaXRlZCAtIFdoZXRoZXIgc2VydmljZSBpcyBsaW1pdGVkIGluIERvY2tlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwb3J0SW5mbyAtIFBvcnQgaW5mb3JtYXRpb24gZm9yIHRoZSBzZXJ2aWNlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzaG93Q29weUJ1dHRvbiAtIFdoZXRoZXIgdG8gc2hvdyBjb3B5IGJ1dHRvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqL1xuICAgIGdlbmVyYXRlQ29udGVudChzZXJ2aWNlLCBhY3Rpb24sIG5ldHdvcmssIGlzRG9ja2VyLCBpc0xpbWl0ZWQsIHBvcnRJbmZvLCBzaG93Q29weUJ1dHRvbiA9IGZhbHNlKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcnZpY2UgbmFtZSBoZWFkZXJcbiAgICAgICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gZ2xvYmFsVHJhbnNsYXRlW2Bmd18ke3NlcnZpY2UudG9Mb3dlckNhc2UoKX1EZXNjcmlwdGlvbmBdIHx8IHNlcnZpY2U7XG4gICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48Yj4ke3NlcnZpY2VEZXNjcmlwdGlvbn08L2I+PC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcnQgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKHBvcnRJbmZvICYmIHBvcnRJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfU2VydmljZVBvcnRzSW5mbyB8fCAnVXNlZCBwb3J0cyd9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHBvcnRTdHIgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciA9IGAke3BvcnQucHJvdG9jb2x9ICR7cG9ydC5wb3J0fWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgPSBgJHtwb3J0LnByb3RvY29sfSAke3BvcnQucmFuZ2V9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyID0gJ0lDTVAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocG9ydC5kZXNjcmlwdGlvbiAmJiAhcG9ydC5kZXNjcmlwdGlvbi5zdGFydHNXaXRoKCdmd18nKSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyICs9IGAgLSAke3BvcnQuZGVzY3JpcHRpb259YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuZGVzY3JpcHRpb24gJiYgZ2xvYmFsVHJhbnNsYXRlW3BvcnQuZGVzY3JpcHRpb25dKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgKz0gYCAtICR7Z2xvYmFsVHJhbnNsYXRlW3BvcnQuZGVzY3JpcHRpb25dfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT4ke3BvcnRTdHJ9PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dC1zcGVjaWZpYyBjb250ZW50XG4gICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0RvY2tlciAmJiBpc0xpbWl0ZWQpIHtcbiAgICAgICAgICAgIC8vIERvY2tlciBsaW1pdGVkIHNlcnZpY2UgLSBhbHdheXMgc2hvdyBob3N0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlIHx8ICdUaGlzIHNlcnZpY2UgaXMgYWx3YXlzIGVuYWJsZWQgaW4gRG9ja2VyIGVudmlyb25tZW50LiBGaXJld2FsbCBydWxlcyBtdXN0IGJlIGNvbmZpZ3VyZWQgb24gdGhlIERvY2tlciBob3N0Lid9YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckNvbmZpZ3VyZVJ1bGVzIHx8ICdDb25maWd1cmUgZmlyZXdhbGwgcnVsZXMgb24gRG9ja2VyIGhvc3QnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNob3dDb3B5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCByaWdodCBhdHRhY2hlZCBsYWJlbCBjb3B5LWNvbW1hbmRcIiBzdHlsZT1cImN1cnNvcjogcG9pbnRlcjtcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwiY29weSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db3B5Q29tbWFuZCB8fCAnQ29weSd9YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8cHJlIHN0eWxlPVwiZm9udC1zaXplOiAwLjg1ZW07IG1hcmdpbjogMDtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocG9ydEluZm8gJiYgcG9ydEluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlwdGFibGVzQWN0aW9uID0gYWN0aW9uID09PSAnYWxsb3cnID8gJ0FDQ0VQVCcgOiAnRFJPUCc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocG9ydC5wcm90b2NvbCA9PT0gJ0lDTVAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wIGljbXAgLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucG9ydCAhPT0gdW5kZWZpbmVkICYmIHBvcnQucG9ydCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke3BvcnQucG9ydH0gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBwb3J0LnJhbmdlLnNwbGl0KCctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7ZnJvbX06JHt0b30gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRG9ja2VyKSB7XG4gICAgICAgICAgICAvLyBEb2NrZXIgc3VwcG9ydGVkIHNlcnZpY2UgLSBqdXN0IGluZm9ybWF0aW9uXG4gICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnYWxsb3cnKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfQWNjZXNzQWxsb3dlZEZvclN1Ym5ldCB8fCAnQWNjZXNzIHdpbGwgYmUgYWxsb3dlZCBmb3Igc3VibmV0J30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FjY2Vzc0Jsb2NrZWRGb3JTdWJuZXQgfHwgJ0FjY2VzcyB3aWxsIGJlIGJsb2NrZWQgZm9yIHN1Ym5ldCd9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVndWxhciBlbnZpcm9ubWVudCAtIHNob3cgaXB0YWJsZXMgcnVsZXNcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfSXB0YWJsZXNSdWxlc0FwcGxpZWQgfHwgJ0ZvbGxvd2luZyBpcHRhYmxlcyBydWxlcyB3aWxsIGJlIGFwcGxpZWQnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxwcmUgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgbWFyZ2luOiAwO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwb3J0SW5mbyAmJiBwb3J0SW5mby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcG9ydEluZm8uZm9yRWFjaChwb3J0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXB0YWJsZXNBY3Rpb24gPSBhY3Rpb24gPT09ICdhbGxvdycgPyAnQUNDRVBUJyA6ICdEUk9QJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3J0LnByb3RvY29sID09PSAnSUNNUCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgaWNtcCAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQgJiYgcG9ydC5wb3J0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBJTlBVVCAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7cG9ydC5wb3J0fSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IHBvcnQucmFuZ2Uuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtmcm9tfToke3RvfSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwIG9uIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgZWxlbWVudCB0byBhdHRhY2ggdG9vbHRpcCB0b1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gVG9vbHRpcCBvcHRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXAoJGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5vblNob3cpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsT25TaG93ID0gc2V0dGluZ3Mub25TaG93O1xuICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxPblNob3cuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGNvcHkgYnV0dG9ucyBhZnRlciBwb3B1cCBpcyBzaG93blxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldHRpbmdzLm9uU2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJGVsZW1lbnQucG9wdXAoc2V0dGluZ3MpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29weSBjb21tYW5kIHRvIGNsaXBib2FyZFxuICAgICAqL1xuICAgIGNvcHlUb0NsaXBib2FyZChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGxhYmVsID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBjb25zdCAkcHJlID0gJGxhYmVsLnNpYmxpbmdzKCdwcmUnKTtcbiAgICAgICAgY29uc3QgdGV4dCA9ICRwcmUudGV4dCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIHRlbXBvcmFyeSB0ZXh0YXJlYVxuICAgICAgICBjb25zdCAkdGVtcCA9ICQoJzx0ZXh0YXJlYT4nKTtcbiAgICAgICAgJCgnYm9keScpLmFwcGVuZCgkdGVtcCk7XG4gICAgICAgICR0ZW1wLnZhbCh0ZXh0KS5zZWxlY3QoKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpO1xuICAgICAgICAgICAgJGxhYmVsLmh0bWwoYDxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQ29tbWFuZENvcGllZCB8fCAnQ29waWVkISd9YCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkbGFiZWwuaHRtbChgPGkgY2xhc3M9XCJjb3B5IGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0NvcHlDb21tYW5kIHx8ICdDb3B5J31gKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjb3B5OicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICR0ZW1wLnJlbW92ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRvb2x0aXAgY29udGVudCBkeW5hbWljYWxseVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIEVsZW1lbnQgd2l0aCB0b29sdGlwXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0NvbnRlbnQgLSBOZXcgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFkZGl0aW9uYWxPcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zIHRvIG1lcmdlXG4gICAgICovXG4gICAgdXBkYXRlQ29udGVudCgkZWxlbWVudCwgbmV3Q29udGVudCwgYWRkaXRpb25hbE9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgaHRtbDogbmV3Q29udGVudCxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJyxcbiAgICAgICAgICAgIG9uU2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBhZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgICAgJC5leHRlbmQob3B0aW9ucywgYWRkaXRpb25hbE9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgJGVsZW1lbnQucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgJGVsZW1lbnQucG9wdXAob3B0aW9ucyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB0b29sdGlwIGNvbnRlbnQgZm9yIHNwZWNpYWwgY2hlY2tib3hlcyAobmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmspXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUeXBlIG9mIGNoZWNrYm94ICgnbmV3ZXJfYmxvY2tfaXAnIG9yICdsb2NhbF9uZXR3b3JrJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV0d29yayAtIE5ldHdvcmsgYWRkcmVzcyB3aXRoIHN1Ym5ldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDaGVja2VkIC0gV2hldGhlciBjaGVja2JveCBpcyBjaGVja2VkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICovXG4gICAgZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KHR5cGUsIG5ldHdvcmssIGlzQ2hlY2tlZCkge1xuICAgICAgICBsZXQgY29udGVudCA9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZSA9PT0gJ25ld2VyX2Jsb2NrX2lwJykge1xuICAgICAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PGI+JHtnbG9iYWxUcmFuc2xhdGUuZndfTmV3ZXJCbG9ja0lwIHx8ICdOZXZlciBibG9jayBJUHMnfTwvYj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfTmV3ZXJCbG9ja0lwVG9vbHRpcCB8fCAnSVAgYWRkcmVzc2VzIGZyb20gdGhpcyBzdWJuZXQgd2lsbCBuZXZlciBiZSBibG9ja2VkIGJ5IEZhaWwyYmFuIHNlcnZpY2UsIGV2ZW4gYWZ0ZXIgbXVsdGlwbGUgZmFpbGVkIGxvZ2luIGF0dGVtcHRzLiBVc2UgdGhpcyBvcHRpb24gZm9yIHRydXN0ZWQgbmV0d29ya3Mgc3VjaCBhcyBvZmZpY2UgbmV0d29yayBvciBWUE4uJ308L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRWZmZWN0XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0VmZmVjdCB8fCAnRWZmZWN0J306PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJzaGllbGQgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0ZhaWwyYmFuV2lsbElnbm9yZSB8fCAnRmFpbDJiYW4gd2lsbCBpZ25vcmUgZmFpbGVkIGF1dGhlbnRpY2F0aW9uIGF0dGVtcHRzIGZyb20nfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHAgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19TZWN1cml0eVdhcm5pbmcgfHwgJ1dhcm5pbmc6IFRoaXMgcmVkdWNlcyBzZWN1cml0eSBmb3IgdGhlIHNwZWNpZmllZCBuZXR3b3JrLiBVc2Ugb25seSBmb3IgdHJ1c3RlZCBuZXR3b3Jrcy4nfWA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPC9wPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0ZhaWwyYmFuV2lsbE1vbml0b3IgfHwgJ0ZhaWwyYmFuIHdpbGwgbW9uaXRvciBhbmQgbWF5IGJsb2NrIElQcyBmcm9tJ30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FmdGVyRmFpbGVkQXR0ZW1wdHMgfHwgJ2FmdGVyIGZhaWxlZCBhdXRoZW50aWNhdGlvbiBhdHRlbXB0cy4nfTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2xvY2FsX25ldHdvcmsnKSB7XG4gICAgICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48Yj4ke2dsb2JhbFRyYW5zbGF0ZS5md19JdElzTG9jYWxOZXR3b3JrIHx8ICdMb2NhbCBuZXR3b3JrIG9yIFZQTid9PC9iPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19Mb2NhbE5ldHdvcmtUb29sdGlwIHx8ICdTcGVjaWZ5IHRoaXMgb3B0aW9uIGZvciBsb2NhbCBuZXR3b3JrcyBvciBWUE4gd2hlcmUgZGV2aWNlcyBjb25uZWN0IHRvIE1pa29QQlggZGlyZWN0bHkgd2l0aG91dCBOQVQuIFRoaXMgYWZmZWN0cyBTSVAgcGFja2V0IHByb2Nlc3NpbmcgYW5kIGFsbG93cyBwcm9wZXIgZGV2aWNlIGFkZHJlc3MgZGV0ZWN0aW9uIGluIHRoZSBsb2NhbCBuZXR3b3JrLid9PC9wPmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVmZmVjdFxuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19FZmZlY3QgfHwgJ0VmZmVjdCd9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDx1bCBjbGFzcz1cInVpIGxpc3RcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT48aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RpcmVjdFNJUFJvdXRpbmcgfHwgJ1NJUCBwYWNrZXRzIHdpbGwgYmUgcm91dGVkIGRpcmVjdGx5IHdpdGhvdXQgTkFUIGhhbmRsaW5nJ308L2xpPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGxpPjxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfTm9Db250YWN0UmV3cml0aW5nIHx8ICdDb250YWN0IGhlYWRlcnMgd2lsbCBub3QgYmUgcmV3cml0dGVuJ308L2xpPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGxpPjxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfTG9jYWxBZGRyZXNzRGV0ZWN0aW9uIHx8ICdEZXZpY2UgYWRkcmVzc2VzIHdpbGwgYmUgZGV0ZWN0ZWQgYXMgbG9jYWwnfTwvbGk+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L3VsPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPC9kaXY+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfTkFUSGFuZGxpbmcgfHwgJ05ldHdvcmsnfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz4gJHtnbG9iYWxUcmFuc2xhdGUuZndfV2lsbEJlSGFuZGxlZEFzRXh0ZXJuYWwgfHwgJ3dpbGwgYmUgaGFuZGxlZCBhcyBleHRlcm5hbCBuZXR3b3JrIHdpdGggTkFUIHRyYXZlcnNhbCBlbmFibGVkLid9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH1cbn07Il19