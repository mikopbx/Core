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
    } // Check if element is an icon inside a label (for checkbox toggle prevention)


    if ($element.is('.special-checkbox-info, .service-info-icon') && $element.closest('label').length > 0) {
      // Use manual control for icons inside labels
      settings.on = 'manual';
      $element.popup(settings); // Add click handler to show popup and prevent checkbox toggle

      $element.off('click.popup-trigger').on('click.popup-trigger', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).popup('toggle');
      });
    } else {
      // Regular popup initialization
      $element.popup(settings);
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC10b29sdGlwcy5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50Iiwic2VydmljZSIsImFjdGlvbiIsIm5ldHdvcmsiLCJpc0RvY2tlciIsImlzTGltaXRlZCIsInBvcnRJbmZvIiwic2hvd0NvcHlCdXR0b24iLCJjb250ZW50Iiwic2VydmljZURlc2NyaXB0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9Mb3dlckNhc2UiLCJsZW5ndGgiLCJmd19TZXJ2aWNlUG9ydHNJbmZvIiwiZm9yRWFjaCIsInBvcnQiLCJwb3J0U3RyIiwidW5kZWZpbmVkIiwicHJvdG9jb2wiLCJyYW5nZSIsImRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlIiwiZndfRG9ja2VyQ29uZmlndXJlUnVsZXMiLCJmd19Db3B5Q29tbWFuZCIsImlwdGFibGVzQWN0aW9uIiwic3BsaXQiLCJmcm9tIiwidG8iLCJmd19BY2Nlc3NBbGxvd2VkRm9yU3VibmV0IiwiZndfQWNjZXNzQmxvY2tlZEZvclN1Ym5ldCIsImZ3X0lwdGFibGVzUnVsZXNBcHBsaWVkIiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCIkZWxlbWVudCIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiJCIsImV4dGVuZCIsIm9uU2hvdyIsIm9yaWdpbmFsT25TaG93IiwiY2FsbCIsInNldFRpbWVvdXQiLCJvZmYiLCJvbiIsImNvcHlUb0NsaXBib2FyZCIsImlzIiwiY2xvc2VzdCIsInBvcHVwIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiY3VycmVudFRhcmdldCIsIiRwcmUiLCJzaWJsaW5ncyIsInRleHQiLCIkdGVtcCIsImFwcGVuZCIsInZhbCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJodG1sIiwiZndfQ29tbWFuZENvcGllZCIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsInJlbW92ZSIsInVwZGF0ZUNvbnRlbnQiLCJuZXdDb250ZW50IiwiYWRkaXRpb25hbE9wdGlvbnMiLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ0eXBlIiwiaXNDaGVja2VkIiwiZndfTmV3ZXJCbG9ja0lwIiwiZndfTmV3ZXJCbG9ja0lwVG9vbHRpcCIsImZ3X0VmZmVjdCIsImZ3X0ZhaWwyYmFuV2lsbElnbm9yZSIsImZ3X1NlY3VyaXR5V2FybmluZyIsImZ3X0ZhaWwyYmFuV2lsbE1vbml0b3IiLCJmd19BZnRlckZhaWxlZEF0dGVtcHRzIiwiZndfSXRJc0xvY2FsTmV0d29yayIsImZ3X0xvY2FsTmV0d29ya1Rvb2x0aXAiLCJmd19EaXJlY3RTSVBSb3V0aW5nIiwiZndfTm9Db250YWN0UmV3cml0aW5nIiwiZndfTG9jYWxBZGRyZXNzRGV0ZWN0aW9uIiwiZndfTkFUSGFuZGxpbmciLCJmd19XaWxsQmVIYW5kbGVkQXNFeHRlcm5hbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQVpxQiwyQkFZTEMsT0FaSyxFQVlJQyxNQVpKLEVBWVlDLE9BWlosRUFZcUJDLFFBWnJCLEVBWStCQyxTQVovQixFQVkwQ0MsUUFaMUMsRUFZNEU7QUFBQSxRQUF4QkMsY0FBd0IsdUVBQVAsS0FBTztBQUM3RixRQUFJQyxPQUFPLEdBQUcsdUJBQWQsQ0FENkYsQ0FHN0Y7O0FB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QUFqU29CLENBQXpCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFVuaWZpZWQgdG9vbHRpcCBnZW5lcmF0b3IgZm9yIGZpcmV3YWxsIHJ1bGVzXG4gKiBAbW9kdWxlIGZpcmV3YWxsVG9vbHRpcHNcbiAqL1xuY29uc3QgZmlyZXdhbGxUb29sdGlwcyA9IHtcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB0b29sdGlwIGNvbnRlbnQgYmFzZWQgb24gc2VydmljZSwgYWN0aW9uIGFuZCBjb250ZXh0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlcnZpY2UgLSBTZXJ2aWNlIGNhdGVnb3J5IG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQ3VycmVudCBhY3Rpb24gKGFsbG93L2Jsb2NrKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXR3b3JrIC0gTmV0d29yayBhZGRyZXNzIHdpdGggc3VibmV0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzTGltaXRlZCAtIFdoZXRoZXIgc2VydmljZSBpcyBsaW1pdGVkIGluIERvY2tlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwb3J0SW5mbyAtIFBvcnQgaW5mb3JtYXRpb24gZm9yIHRoZSBzZXJ2aWNlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzaG93Q29weUJ1dHRvbiAtIFdoZXRoZXIgdG8gc2hvdyBjb3B5IGJ1dHRvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqL1xuICAgIGdlbmVyYXRlQ29udGVudChzZXJ2aWNlLCBhY3Rpb24sIG5ldHdvcmssIGlzRG9ja2VyLCBpc0xpbWl0ZWQsIHBvcnRJbmZvLCBzaG93Q29weUJ1dHRvbiA9IGZhbHNlKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNlcnZpY2UgbmFtZSBoZWFkZXJcbiAgICAgICAgY29uc3Qgc2VydmljZURlc2NyaXB0aW9uID0gZ2xvYmFsVHJhbnNsYXRlW2Bmd18ke3NlcnZpY2UudG9Mb3dlckNhc2UoKX1EZXNjcmlwdGlvbmBdIHx8IHNlcnZpY2U7XG4gICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48Yj4ke3NlcnZpY2VEZXNjcmlwdGlvbn08L2I+PC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFBvcnQgaW5mb3JtYXRpb25cbiAgICAgICAgaWYgKHBvcnRJbmZvICYmIHBvcnRJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfU2VydmljZVBvcnRzSW5mbyB8fCAnVXNlZCBwb3J0cyd9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHBvcnRTdHIgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciA9IGAke3BvcnQucHJvdG9jb2x9ICR7cG9ydC5wb3J0fWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgPSBgJHtwb3J0LnByb3RvY29sfSAke3BvcnQucmFuZ2V9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyID0gJ0lDTVAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocG9ydC5kZXNjcmlwdGlvbiAmJiAhcG9ydC5kZXNjcmlwdGlvbi5zdGFydHNXaXRoKCdmd18nKSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyICs9IGAgLSAke3BvcnQuZGVzY3JpcHRpb259YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuZGVzY3JpcHRpb24gJiYgZ2xvYmFsVHJhbnNsYXRlW3BvcnQuZGVzY3JpcHRpb25dKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgKz0gYCAtICR7Z2xvYmFsVHJhbnNsYXRlW3BvcnQuZGVzY3JpcHRpb25dfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT4ke3BvcnRTdHJ9PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dC1zcGVjaWZpYyBjb250ZW50XG4gICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0RvY2tlciAmJiBpc0xpbWl0ZWQpIHtcbiAgICAgICAgICAgIC8vIERvY2tlciBsaW1pdGVkIHNlcnZpY2UgLSBhbHdheXMgc2hvdyBob3N0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlIHx8ICdUaGlzIHNlcnZpY2UgaXMgYWx3YXlzIGVuYWJsZWQgaW4gRG9ja2VyIGVudmlyb25tZW50LiBGaXJld2FsbCBydWxlcyBtdXN0IGJlIGNvbmZpZ3VyZWQgb24gdGhlIERvY2tlciBob3N0Lid9YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckNvbmZpZ3VyZVJ1bGVzIHx8ICdDb25maWd1cmUgZmlyZXdhbGwgcnVsZXMgb24gRG9ja2VyIGhvc3QnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNob3dDb3B5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCByaWdodCBhdHRhY2hlZCBsYWJlbCBjb3B5LWNvbW1hbmRcIiBzdHlsZT1cImN1cnNvcjogcG9pbnRlcjtcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwiY29weSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db3B5Q29tbWFuZCB8fCAnQ29weSd9YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8cHJlIHN0eWxlPVwiZm9udC1zaXplOiAwLjg1ZW07IG1hcmdpbjogMDtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocG9ydEluZm8gJiYgcG9ydEluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlwdGFibGVzQWN0aW9uID0gYWN0aW9uID09PSAnYWxsb3cnID8gJ0FDQ0VQVCcgOiAnRFJPUCc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocG9ydC5wcm90b2NvbCA9PT0gJ0lDTVAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wIGljbXAgLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucG9ydCAhPT0gdW5kZWZpbmVkICYmIHBvcnQucG9ydCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke3BvcnQucG9ydH0gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBwb3J0LnJhbmdlLnNwbGl0KCctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7ZnJvbX06JHt0b30gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRG9ja2VyKSB7XG4gICAgICAgICAgICAvLyBEb2NrZXIgc3VwcG9ydGVkIHNlcnZpY2UgLSBqdXN0IGluZm9ybWF0aW9uXG4gICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnYWxsb3cnKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfQWNjZXNzQWxsb3dlZEZvclN1Ym5ldCB8fCAnQWNjZXNzIHdpbGwgYmUgYWxsb3dlZCBmb3Igc3VibmV0J30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FjY2Vzc0Jsb2NrZWRGb3JTdWJuZXQgfHwgJ0FjY2VzcyB3aWxsIGJlIGJsb2NrZWQgZm9yIHN1Ym5ldCd9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVndWxhciBlbnZpcm9ubWVudCAtIHNob3cgaXB0YWJsZXMgcnVsZXNcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfSXB0YWJsZXNSdWxlc0FwcGxpZWQgfHwgJ0ZvbGxvd2luZyBpcHRhYmxlcyBydWxlcyB3aWxsIGJlIGFwcGxpZWQnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxwcmUgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgbWFyZ2luOiAwO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwb3J0SW5mbyAmJiBwb3J0SW5mby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcG9ydEluZm8uZm9yRWFjaChwb3J0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXB0YWJsZXNBY3Rpb24gPSBhY3Rpb24gPT09ICdhbGxvdycgPyAnQUNDRVBUJyA6ICdEUk9QJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3J0LnByb3RvY29sID09PSAnSUNNUCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgaWNtcCAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQgJiYgcG9ydC5wb3J0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBJTlBVVCAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7cG9ydC5wb3J0fSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IHBvcnQucmFuZ2Uuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtmcm9tfToke3RvfSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwIG9uIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgZWxlbWVudCB0byBhdHRhY2ggdG9vbHRpcCB0b1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gVG9vbHRpcCBvcHRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXAoJGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5vblNob3cpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsT25TaG93ID0gc2V0dGluZ3Mub25TaG93O1xuICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxPblNob3cuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGNvcHkgYnV0dG9ucyBhZnRlciBwb3B1cCBpcyBzaG93blxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldHRpbmdzLm9uU2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudCBpcyBhbiBpY29uIGluc2lkZSBhIGxhYmVsIChmb3IgY2hlY2tib3ggdG9nZ2xlIHByZXZlbnRpb24pXG4gICAgICAgIGlmICgkZWxlbWVudC5pcygnLnNwZWNpYWwtY2hlY2tib3gtaW5mbywgLnNlcnZpY2UtaW5mby1pY29uJykgJiYgJGVsZW1lbnQuY2xvc2VzdCgnbGFiZWwnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBVc2UgbWFudWFsIGNvbnRyb2wgZm9yIGljb25zIGluc2lkZSBsYWJlbHNcbiAgICAgICAgICAgIHNldHRpbmdzLm9uID0gJ21hbnVhbCc7XG4gICAgICAgICAgICAkZWxlbWVudC5wb3B1cChzZXR0aW5ncyk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIHNob3cgcG9wdXAgYW5kIHByZXZlbnQgY2hlY2tib3ggdG9nZ2xlXG4gICAgICAgICAgICAkZWxlbWVudC5vZmYoJ2NsaWNrLnBvcHVwLXRyaWdnZXInKS5vbignY2xpY2sucG9wdXAtdHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnBvcHVwKCd0b2dnbGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVndWxhciBwb3B1cCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgJGVsZW1lbnQucG9wdXAoc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb3B5IGNvbW1hbmQgdG8gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY29weVRvQ2xpcGJvYXJkKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIGNvbnN0ICRwcmUgPSAkbGFiZWwuc2libGluZ3MoJ3ByZScpO1xuICAgICAgICBjb25zdCB0ZXh0ID0gJHByZS50ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IHRleHRhcmVhXG4gICAgICAgIGNvbnN0ICR0ZW1wID0gJCgnPHRleHRhcmVhPicpO1xuICAgICAgICAkKCdib2R5JykuYXBwZW5kKCR0ZW1wKTtcbiAgICAgICAgJHRlbXAudmFsKHRleHQpLnNlbGVjdCgpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAkbGFiZWwuaHRtbChgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db21tYW5kQ29waWVkIHx8ICdDb3BpZWQhJ31gKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRsYWJlbC5odG1sKGA8aSBjbGFzcz1cImNvcHkgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQ29weUNvbW1hbmQgfHwgJ0NvcHknfWApO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHk6JywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJHRlbXAucmVtb3ZlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0gRWxlbWVudCB3aXRoIHRvb2x0aXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Q29udGVudCAtIE5ldyBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYWRkaXRpb25hbE9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gbWVyZ2VcbiAgICAgKi9cbiAgICB1cGRhdGVDb250ZW50KCRlbGVtZW50LCBuZXdDb250ZW50LCBhZGRpdGlvbmFsT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBodG1sOiBuZXdDb250ZW50LFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnLFxuICAgICAgICAgICAgb25TaG93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktY29tbWFuZCcpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmaXJld2FsbFRvb2x0aXBzLmNvcHlUb0NsaXBib2FyZCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIGFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAgICAkLmV4dGVuZChvcHRpb25zLCBhZGRpdGlvbmFsT3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAkZWxlbWVudC5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAkZWxlbWVudC5wb3B1cChvcHRpb25zKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCBmb3Igc3BlY2lhbCBjaGVja2JveGVzIChuZXdlcl9ibG9ja19pcCBhbmQgbG9jYWxfbmV0d29yaylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFR5cGUgb2YgY2hlY2tib3ggKCduZXdlcl9ibG9ja19pcCcgb3IgJ2xvY2FsX25ldHdvcmsnKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXR3b3JrIC0gTmV0d29yayBhZGRyZXNzIHdpdGggc3VibmV0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NoZWNrZWQgLSBXaGV0aGVyIGNoZWNrYm94IGlzIGNoZWNrZWRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQodHlwZSwgbmV0d29yaywgaXNDaGVja2VkKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlID09PSAnbmV3ZXJfYmxvY2tfaXAnKSB7XG4gICAgICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48Yj4ke2dsb2JhbFRyYW5zbGF0ZS5md19OZXdlckJsb2NrSXAgfHwgJ05ldmVyIGJsb2NrIElQcyd9PC9iPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19OZXdlckJsb2NrSXBUb29sdGlwIHx8ICdJUCBhZGRyZXNzZXMgZnJvbSB0aGlzIHN1Ym5ldCB3aWxsIG5ldmVyIGJlIGJsb2NrZWQgYnkgRmFpbDJiYW4gc2VydmljZSwgZXZlbiBhZnRlciBtdWx0aXBsZSBmYWlsZWQgbG9naW4gYXR0ZW1wdHMuIFVzZSB0aGlzIG9wdGlvbiBmb3IgdHJ1c3RlZCBuZXR3b3JrcyBzdWNoIGFzIG9mZmljZSBuZXR3b3JrIG9yIFZQTi4nfTwvcD5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFZmZlY3RcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfRWZmZWN0IHx8ICdFZmZlY3QnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8aSBjbGFzcz1cInNoaWVsZCBhbHRlcm5hdGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfRmFpbDJiYW5XaWxsSWdub3JlIHx8ICdGYWlsMmJhbiB3aWxsIGlnbm9yZSBmYWlsZWQgYXV0aGVudGljYXRpb24gYXR0ZW1wdHMgZnJvbSd9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cCBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X1NlY3VyaXR5V2FybmluZyB8fCAnV2FybmluZzogVGhpcyByZWR1Y2VzIHNlY3VyaXR5IGZvciB0aGUgc3BlY2lmaWVkIG5ldHdvcmsuIFVzZSBvbmx5IGZvciB0cnVzdGVkIG5ldHdvcmtzLid9YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L3A+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfRmFpbDJiYW5XaWxsTW9uaXRvciB8fCAnRmFpbDJiYW4gd2lsbCBtb25pdG9yIGFuZCBtYXkgYmxvY2sgSVBzIGZyb20nfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQWZ0ZXJGYWlsZWRBdHRlbXB0cyB8fCAnYWZ0ZXIgZmFpbGVkIGF1dGhlbnRpY2F0aW9uIGF0dGVtcHRzLid9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnbG9jYWxfbmV0d29yaycpIHtcbiAgICAgICAgICAgIC8vIEhlYWRlclxuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxiPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0l0SXNMb2NhbE5ldHdvcmsgfHwgJ0xvY2FsIG5ldHdvcmsgb3IgVlBOJ308L2I+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0xvY2FsTmV0d29ya1Rvb2x0aXAgfHwgJ1NwZWNpZnkgdGhpcyBvcHRpb24gZm9yIGxvY2FsIG5ldHdvcmtzIG9yIFZQTiB3aGVyZSBkZXZpY2VzIGNvbm5lY3QgdG8gTWlrb1BCWCBkaXJlY3RseSB3aXRob3V0IE5BVC4gVGhpcyBhZmZlY3RzIFNJUCBwYWNrZXQgcHJvY2Vzc2luZyBhbmQgYWxsb3dzIHByb3BlciBkZXZpY2UgYWRkcmVzcyBkZXRlY3Rpb24gaW4gdGhlIGxvY2FsIG5ldHdvcmsuJ308L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRWZmZWN0XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0VmZmVjdCB8fCAnRWZmZWN0J306PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHVsIGNsYXNzPVwidWkgbGlzdFwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGxpPjxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfRGlyZWN0U0lQUm91dGluZyB8fCAnU0lQIHBhY2tldHMgd2lsbCBiZSByb3V0ZWQgZGlyZWN0bHkgd2l0aG91dCBOQVQgaGFuZGxpbmcnfTwvbGk+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+PGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Ob0NvbnRhY3RSZXdyaXRpbmcgfHwgJ0NvbnRhY3QgaGVhZGVycyB3aWxsIG5vdCBiZSByZXdyaXR0ZW4nfTwvbGk+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+PGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Mb2NhbEFkZHJlc3NEZXRlY3Rpb24gfHwgJ0RldmljZSBhZGRyZXNzZXMgd2lsbCBiZSBkZXRlY3RlZCBhcyBsb2NhbCd9PC9saT5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvdWw+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19OQVRIYW5kbGluZyB8fCAnTmV0d29yayd9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPiAke2dsb2JhbFRyYW5zbGF0ZS5md19XaWxsQmVIYW5kbGVkQXNFeHRlcm5hbCB8fCAnd2lsbCBiZSBoYW5kbGVkIGFzIGV4dGVybmFsIG5ldHdvcmsgd2l0aCBOQVQgdHJhdmVyc2FsIGVuYWJsZWQuJ308L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfVxufTsiXX0=