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
   */
  updateContent: function updateContent($element, newContent) {
    $element.popup('destroy');
    $element.popup({
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
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC10b29sdGlwcy5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50Iiwic2VydmljZSIsImFjdGlvbiIsIm5ldHdvcmsiLCJpc0RvY2tlciIsImlzTGltaXRlZCIsInBvcnRJbmZvIiwic2hvd0NvcHlCdXR0b24iLCJjb250ZW50Iiwic2VydmljZURlc2NyaXB0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9Mb3dlckNhc2UiLCJsZW5ndGgiLCJmd19TZXJ2aWNlUG9ydHNJbmZvIiwiZm9yRWFjaCIsInBvcnQiLCJwb3J0U3RyIiwidW5kZWZpbmVkIiwicHJvdG9jb2wiLCJyYW5nZSIsImRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlIiwiZndfRG9ja2VyQ29uZmlndXJlUnVsZXMiLCJmd19Db3B5Q29tbWFuZCIsImlwdGFibGVzQWN0aW9uIiwic3BsaXQiLCJmcm9tIiwidG8iLCJmd19BY2Nlc3NBbGxvd2VkRm9yU3VibmV0IiwiZndfQWNjZXNzQmxvY2tlZEZvclN1Ym5ldCIsImZ3X0lwdGFibGVzUnVsZXNBcHBsaWVkIiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCIkZWxlbWVudCIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiJCIsImV4dGVuZCIsIm9uU2hvdyIsIm9yaWdpbmFsT25TaG93IiwiY2FsbCIsInNldFRpbWVvdXQiLCJvZmYiLCJvbiIsImNvcHlUb0NsaXBib2FyZCIsInBvcHVwIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiY3VycmVudFRhcmdldCIsIiRwcmUiLCJzaWJsaW5ncyIsInRleHQiLCIkdGVtcCIsImFwcGVuZCIsInZhbCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJodG1sIiwiZndfQ29tbWFuZENvcGllZCIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsInJlbW92ZSIsInVwZGF0ZUNvbnRlbnQiLCJuZXdDb250ZW50IiwiZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50IiwidHlwZSIsImlzQ2hlY2tlZCIsImZ3X05ld2VyQmxvY2tJcCIsImZ3X05ld2VyQmxvY2tJcFRvb2x0aXAiLCJmd19FZmZlY3QiLCJmd19GYWlsMmJhbldpbGxJZ25vcmUiLCJmd19TZWN1cml0eVdhcm5pbmciLCJmd19GYWlsMmJhbldpbGxNb25pdG9yIiwiZndfQWZ0ZXJGYWlsZWRBdHRlbXB0cyIsImZ3X0l0SXNMb2NhbE5ldHdvcmsiLCJmd19Mb2NhbE5ldHdvcmtUb29sdGlwIiwiZndfRGlyZWN0U0lQUm91dGluZyIsImZ3X05vQ29udGFjdFJld3JpdGluZyIsImZ3X0xvY2FsQWRkcmVzc0RldGVjdGlvbiIsImZ3X05BVEhhbmRsaW5nIiwiZndfV2lsbEJlSGFuZGxlZEFzRXh0ZXJuYWwiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3JCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZUFacUIsMkJBWUxDLE9BWkssRUFZSUMsTUFaSixFQVlZQyxPQVpaLEVBWXFCQyxRQVpyQixFQVkrQkMsU0FaL0IsRUFZMENDLFFBWjFDLEVBWTRFO0FBQUEsUUFBeEJDLGNBQXdCLHVFQUFQLEtBQU87QUFDN0YsUUFBSUMsT0FBTyxHQUFHLHVCQUFkLENBRDZGLENBRzdGOztBQUNBLFFBQU1DLGtCQUFrQixHQUFHQyxlQUFlLGNBQU9ULE9BQU8sQ0FBQ1UsV0FBUixFQUFQLGlCQUFmLElBQTZEVixPQUF4RjtBQUNBTyxJQUFBQSxPQUFPLHVDQUE4QkMsa0JBQTlCLGVBQVAsQ0FMNkYsQ0FPN0Y7O0FBQ0EsUUFBSUgsUUFBUSxJQUFJQSxRQUFRLENBQUNNLE1BQVQsR0FBa0IsQ0FBbEMsRUFBcUM7QUFDakNKLE1BQUFBLE9BQU8sc0NBQVA7QUFDQUEsTUFBQUEsT0FBTyx5QkFBa0JFLGVBQWUsQ0FBQ0csbUJBQWhCLElBQXVDLFlBQXpELG1CQUFQO0FBQ0FMLE1BQUFBLE9BQU8sSUFBSSxzQkFBWDtBQUVBRixNQUFBQSxRQUFRLENBQUNRLE9BQVQsQ0FBaUIsVUFBQUMsSUFBSSxFQUFJO0FBQ3JCLFlBQUlDLE9BQU8sR0FBRyxFQUFkOztBQUNBLFlBQUlELElBQUksQ0FBQ0EsSUFBTCxLQUFjRSxTQUFsQixFQUE2QjtBQUN6QkQsVUFBQUEsT0FBTyxhQUFNRCxJQUFJLENBQUNHLFFBQVgsY0FBdUJILElBQUksQ0FBQ0EsSUFBNUIsQ0FBUDtBQUNILFNBRkQsTUFFTyxJQUFJQSxJQUFJLENBQUNJLEtBQVQsRUFBZ0I7QUFDbkJILFVBQUFBLE9BQU8sYUFBTUQsSUFBSSxDQUFDRyxRQUFYLGNBQXVCSCxJQUFJLENBQUNJLEtBQTVCLENBQVA7QUFDSCxTQUZNLE1BRUEsSUFBSUosSUFBSSxDQUFDRyxRQUFMLEtBQWtCLE1BQXRCLEVBQThCO0FBQ2pDRixVQUFBQSxPQUFPLEdBQUcsTUFBVjtBQUNIOztBQUVELFlBQUlELElBQUksQ0FBQ0ssV0FBTCxJQUFvQixDQUFDTCxJQUFJLENBQUNLLFdBQUwsQ0FBaUJDLFVBQWpCLENBQTRCLEtBQTVCLENBQXpCLEVBQTZEO0FBQ3pETCxVQUFBQSxPQUFPLGlCQUFVRCxJQUFJLENBQUNLLFdBQWYsQ0FBUDtBQUNILFNBRkQsTUFFTyxJQUFJTCxJQUFJLENBQUNLLFdBQUwsSUFBb0JWLGVBQWUsQ0FBQ0ssSUFBSSxDQUFDSyxXQUFOLENBQXZDLEVBQTJEO0FBQzlESixVQUFBQSxPQUFPLGlCQUFVTixlQUFlLENBQUNLLElBQUksQ0FBQ0ssV0FBTixDQUF6QixDQUFQO0FBQ0g7O0FBRURaLFFBQUFBLE9BQU8sa0JBQVdRLE9BQVgsVUFBUDtBQUNILE9BakJEO0FBbUJBUixNQUFBQSxPQUFPLElBQUksT0FBWDtBQUNILEtBakM0RixDQW1DN0Y7OztBQUNBQSxJQUFBQSxPQUFPLHNDQUFQOztBQUVBLFFBQUlKLFFBQVEsSUFBSUMsU0FBaEIsRUFBMkI7QUFDdkI7QUFDQUcsTUFBQUEsT0FBTyx3Q0FBUDtBQUNBQSxNQUFBQSxPQUFPLDZDQUFvQ0UsZUFBZSxDQUFDWSx1QkFBaEIsSUFBMkMsNkdBQS9FLENBQVA7QUFDQWQsTUFBQUEsT0FBTyxZQUFQO0FBQ0FBLE1BQUFBLE9BQU8seUJBQWtCRSxlQUFlLENBQUNhLHVCQUFoQixJQUEyQyx5Q0FBN0QsbUJBQVA7QUFDQWYsTUFBQUEsT0FBTyxJQUFJLDBCQUFYOztBQUVBLFVBQUlELGNBQUosRUFBb0I7QUFDaEJDLFFBQUFBLE9BQU8seUZBQVA7QUFDQUEsUUFBQUEsT0FBTywwQ0FBaUNFLGVBQWUsQ0FBQ2MsY0FBaEIsSUFBa0MsTUFBbkUsQ0FBUDtBQUNBaEIsUUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDSDs7QUFFREEsTUFBQUEsT0FBTyxJQUFJLDZDQUFYOztBQUVBLFVBQUlGLFFBQVEsSUFBSUEsUUFBUSxDQUFDTSxNQUFULEdBQWtCLENBQWxDLEVBQXFDO0FBQ2pDTixRQUFBQSxRQUFRLENBQUNRLE9BQVQsQ0FBaUIsVUFBQUMsSUFBSSxFQUFJO0FBQ3JCLGNBQU1VLGNBQWMsR0FBR3ZCLE1BQU0sS0FBSyxPQUFYLEdBQXFCLFFBQXJCLEdBQWdDLE1BQXZEOztBQUVBLGNBQUlhLElBQUksQ0FBQ0csUUFBTCxLQUFrQixNQUF0QixFQUE4QjtBQUMxQlYsWUFBQUEsT0FBTyx5Q0FBa0NMLE9BQWxDLHlCQUF3RHNCLGNBQXhELE9BQVA7QUFDSCxXQUZELE1BRU8sSUFBSVYsSUFBSSxDQUFDQSxJQUFMLEtBQWNFLFNBQWQsSUFBMkJGLElBQUksQ0FBQ0EsSUFBTCxLQUFjLENBQTdDLEVBQWdEO0FBQ25EUCxZQUFBQSxPQUFPLHlDQUFrQ0wsT0FBbEMsaUJBQWdEWSxJQUFJLENBQUNHLFFBQUwsQ0FBY1AsV0FBZCxFQUFoRCxzQkFBdUZJLElBQUksQ0FBQ0EsSUFBNUYsaUJBQXVHVSxjQUF2RyxPQUFQO0FBQ0gsV0FGTSxNQUVBLElBQUlWLElBQUksQ0FBQ0ksS0FBVCxFQUFnQjtBQUNuQixvQ0FBbUJKLElBQUksQ0FBQ0ksS0FBTCxDQUFXTyxLQUFYLENBQWlCLEdBQWpCLENBQW5CO0FBQUE7QUFBQSxnQkFBT0MsSUFBUDtBQUFBLGdCQUFhQyxFQUFiOztBQUNBcEIsWUFBQUEsT0FBTyx5Q0FBa0NMLE9BQWxDLGlCQUFnRFksSUFBSSxDQUFDRyxRQUFMLENBQWNQLFdBQWQsRUFBaEQsc0JBQXVGZ0IsSUFBdkYsY0FBK0ZDLEVBQS9GLGlCQUF3R0gsY0FBeEcsT0FBUDtBQUNIO0FBQ0osU0FYRDtBQVlIOztBQUVEakIsTUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDQUEsTUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDSCxLQWpDRCxNQWlDTyxJQUFJSixRQUFKLEVBQWM7QUFDakI7QUFDQSxVQUFJRixNQUFNLEtBQUssT0FBZixFQUF3QjtBQUNwQk0sUUFBQUEsT0FBTyxpQkFBVUUsZUFBZSxDQUFDbUIseUJBQWhCLElBQTZDLG1DQUF2RCxzQkFBc0cxQixPQUF0RyxrQkFBUDtBQUNILE9BRkQsTUFFTztBQUNISyxRQUFBQSxPQUFPLGlCQUFVRSxlQUFlLENBQUNvQix5QkFBaEIsSUFBNkMsbUNBQXZELHNCQUFzRzNCLE9BQXRHLGtCQUFQO0FBQ0g7QUFDSixLQVBNLE1BT0E7QUFDSDtBQUNBSyxNQUFBQSxPQUFPLHlCQUFrQkUsZUFBZSxDQUFDcUIsdUJBQWhCLElBQTJDLDBDQUE3RCxtQkFBUDtBQUNBdkIsTUFBQUEsT0FBTyxJQUFJLDBCQUFYO0FBQ0FBLE1BQUFBLE9BQU8sSUFBSSw2Q0FBWDs7QUFFQSxVQUFJRixRQUFRLElBQUlBLFFBQVEsQ0FBQ00sTUFBVCxHQUFrQixDQUFsQyxFQUFxQztBQUNqQ04sUUFBQUEsUUFBUSxDQUFDUSxPQUFULENBQWlCLFVBQUFDLElBQUksRUFBSTtBQUNyQixjQUFNVSxjQUFjLEdBQUd2QixNQUFNLEtBQUssT0FBWCxHQUFxQixRQUFyQixHQUFnQyxNQUF2RDs7QUFFQSxjQUFJYSxJQUFJLENBQUNHLFFBQUwsS0FBa0IsTUFBdEIsRUFBOEI7QUFDMUJWLFlBQUFBLE9BQU8sbUNBQTRCTCxPQUE1Qix5QkFBa0RzQixjQUFsRCxPQUFQO0FBQ0gsV0FGRCxNQUVPLElBQUlWLElBQUksQ0FBQ0EsSUFBTCxLQUFjRSxTQUFkLElBQTJCRixJQUFJLENBQUNBLElBQUwsS0FBYyxDQUE3QyxFQUFnRDtBQUNuRFAsWUFBQUEsT0FBTyxtQ0FBNEJMLE9BQTVCLGlCQUEwQ1ksSUFBSSxDQUFDRyxRQUFMLENBQWNQLFdBQWQsRUFBMUMsc0JBQWlGSSxJQUFJLENBQUNBLElBQXRGLGlCQUFpR1UsY0FBakcsT0FBUDtBQUNILFdBRk0sTUFFQSxJQUFJVixJQUFJLENBQUNJLEtBQVQsRUFBZ0I7QUFDbkIscUNBQW1CSixJQUFJLENBQUNJLEtBQUwsQ0FBV08sS0FBWCxDQUFpQixHQUFqQixDQUFuQjtBQUFBO0FBQUEsZ0JBQU9DLElBQVA7QUFBQSxnQkFBYUMsRUFBYjs7QUFDQXBCLFlBQUFBLE9BQU8sbUNBQTRCTCxPQUE1QixpQkFBMENZLElBQUksQ0FBQ0csUUFBTCxDQUFjUCxXQUFkLEVBQTFDLHNCQUFpRmdCLElBQWpGLGNBQXlGQyxFQUF6RixpQkFBa0dILGNBQWxHLE9BQVA7QUFDSDtBQUNKLFNBWEQ7QUFZSDs7QUFFRGpCLE1BQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0FBLE1BQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0g7O0FBRURBLElBQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0EsV0FBT0EsT0FBUDtBQUNILEdBckhvQjs7QUF1SHJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXdCLEVBQUFBLGlCQTVIcUIsNkJBNEhIQyxRQTVIRyxFQTRIT0MsT0E1SFAsRUE0SGdCO0FBQ2pDLFFBQU1DLFFBQVEsR0FBRztBQUNiQyxNQUFBQSxRQUFRLEVBQUUsWUFERztBQUViQyxNQUFBQSxTQUFTLEVBQUUsSUFGRTtBQUdiQyxNQUFBQSxLQUFLLEVBQUU7QUFDSEMsUUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSEMsUUFBQUEsSUFBSSxFQUFFO0FBRkgsT0FITTtBQU9iQyxNQUFBQSxTQUFTLEVBQUU7QUFQRSxLQUFqQjtBQVVBLFFBQU1DLFFBQVEsR0FBR0MsQ0FBQyxDQUFDQyxNQUFGLENBQVMsRUFBVCxFQUFhVCxRQUFiLEVBQXVCRCxPQUF2QixDQUFqQjs7QUFFQSxRQUFJUSxRQUFRLENBQUNHLE1BQWIsRUFBcUI7QUFDakIsVUFBTUMsY0FBYyxHQUFHSixRQUFRLENBQUNHLE1BQWhDOztBQUNBSCxNQUFBQSxRQUFRLENBQUNHLE1BQVQsR0FBa0IsWUFBVztBQUN6QkMsUUFBQUEsY0FBYyxDQUFDQyxJQUFmLENBQW9CLElBQXBCLEVBRHlCLENBRXpCOztBQUNBQyxRQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiTCxVQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CTSxHQUFuQixDQUF1QixPQUF2QixFQUFnQ0MsRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNENuRCxnQkFBZ0IsQ0FBQ29ELGVBQTdEO0FBQ0gsU0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdILE9BTkQ7QUFPSCxLQVRELE1BU087QUFDSFQsTUFBQUEsUUFBUSxDQUFDRyxNQUFULEdBQWtCLFlBQVc7QUFDekJHLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JMLFVBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJNLEdBQW5CLENBQXVCLE9BQXZCLEVBQWdDQyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0Q25ELGdCQUFnQixDQUFDb0QsZUFBN0Q7QUFDSCxTQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0gsT0FKRDtBQUtIOztBQUVEbEIsSUFBQUEsUUFBUSxDQUFDbUIsS0FBVCxDQUFlVixRQUFmO0FBQ0gsR0EzSm9COztBQTZKckI7QUFDSjtBQUNBO0FBQ0lTLEVBQUFBLGVBaEtxQiwyQkFnS0xFLENBaEtLLEVBZ0tGO0FBQ2ZBLElBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFFBQU1DLE1BQU0sR0FBR1osQ0FBQyxDQUFDVSxDQUFDLENBQUNHLGFBQUgsQ0FBaEI7QUFDQSxRQUFNQyxJQUFJLEdBQUdGLE1BQU0sQ0FBQ0csUUFBUCxDQUFnQixLQUFoQixDQUFiO0FBQ0EsUUFBTUMsSUFBSSxHQUFHRixJQUFJLENBQUNFLElBQUwsRUFBYixDQUplLENBTWY7O0FBQ0EsUUFBTUMsS0FBSyxHQUFHakIsQ0FBQyxDQUFDLFlBQUQsQ0FBZjtBQUNBQSxJQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQVVrQixNQUFWLENBQWlCRCxLQUFqQjtBQUNBQSxJQUFBQSxLQUFLLENBQUNFLEdBQU4sQ0FBVUgsSUFBVixFQUFnQkksTUFBaEI7O0FBRUEsUUFBSTtBQUNBQyxNQUFBQSxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsTUFBckI7QUFDQVYsTUFBQUEsTUFBTSxDQUFDVyxJQUFQLHdDQUEwQ3hELGVBQWUsQ0FBQ3lELGdCQUFoQixJQUFvQyxTQUE5RTtBQUNBbkIsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYk8sUUFBQUEsTUFBTSxDQUFDVyxJQUFQLHVDQUF5Q3hELGVBQWUsQ0FBQ2MsY0FBaEIsSUFBa0MsTUFBM0U7QUFDSCxPQUZTLEVBRVAsSUFGTyxDQUFWO0FBR0gsS0FORCxDQU1FLE9BQU80QyxHQUFQLEVBQVk7QUFDVkMsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsaUJBQWQsRUFBaUNGLEdBQWpDO0FBQ0g7O0FBRURSLElBQUFBLEtBQUssQ0FBQ1csTUFBTjtBQUNILEdBdExvQjs7QUF3THJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUE3THFCLHlCQTZMUHZDLFFBN0xPLEVBNkxHd0MsVUE3TEgsRUE2TGU7QUFDaEN4QyxJQUFBQSxRQUFRLENBQUNtQixLQUFULENBQWUsU0FBZjtBQUNBbkIsSUFBQUEsUUFBUSxDQUFDbUIsS0FBVCxDQUFlO0FBQ1hjLE1BQUFBLElBQUksRUFBRU8sVUFESztBQUVYckMsTUFBQUEsUUFBUSxFQUFFLFlBRkM7QUFHWEMsTUFBQUEsU0FBUyxFQUFFLElBSEE7QUFJWEMsTUFBQUEsS0FBSyxFQUFFO0FBQ0hDLFFBQUFBLElBQUksRUFBRSxHQURIO0FBRUhDLFFBQUFBLElBQUksRUFBRTtBQUZILE9BSkk7QUFRWEMsTUFBQUEsU0FBUyxFQUFFLFNBUkE7QUFTWEksTUFBQUEsTUFBTSxFQUFFLGtCQUFXO0FBQ2ZHLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JMLFVBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJNLEdBQW5CLENBQXVCLE9BQXZCLEVBQWdDQyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0Q25ELGdCQUFnQixDQUFDb0QsZUFBN0Q7QUFDSCxTQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0g7QUFiVSxLQUFmO0FBZUgsR0E5TW9COztBQWdOckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXVCLEVBQUFBLDhCQXZOcUIsMENBdU5VQyxJQXZOVixFQXVOZ0J4RSxPQXZOaEIsRUF1TnlCeUUsU0F2TnpCLEVBdU5vQztBQUNyRCxRQUFJcEUsT0FBTyxHQUFHLHVCQUFkOztBQUVBLFFBQUltRSxJQUFJLEtBQUssZ0JBQWIsRUFBK0I7QUFDM0I7QUFDQW5FLE1BQUFBLE9BQU8sdUNBQThCRSxlQUFlLENBQUNtRSxlQUFoQixJQUFtQyxpQkFBakUsZUFBUDtBQUNBckUsTUFBQUEsT0FBTyxzQ0FBUCxDQUgyQixDQUszQjs7QUFDQUEsTUFBQUEsT0FBTyxpQkFBVUUsZUFBZSxDQUFDb0Usc0JBQWhCLElBQTBDLHlMQUFwRCxTQUFQLENBTjJCLENBUTNCOztBQUNBdEUsTUFBQUEsT0FBTyxzQ0FBUDtBQUNBQSxNQUFBQSxPQUFPLHlCQUFrQkUsZUFBZSxDQUFDcUUsU0FBaEIsSUFBNkIsUUFBL0MsbUJBQVA7O0FBRUEsVUFBSUgsU0FBSixFQUFlO0FBQ1hwRSxRQUFBQSxPQUFPLGdDQUFQO0FBQ0FBLFFBQUFBLE9BQU8sc0RBQTZDRSxlQUFlLENBQUNzRSxxQkFBaEIsSUFBeUMsMERBQXRGLHNCQUE0SjdFLE9BQTVKLGNBQVA7QUFDQUssUUFBQUEsT0FBTyxZQUFQO0FBQ0FBLFFBQUFBLE9BQU8sc0NBQVA7QUFDQUEsUUFBQUEsT0FBTyw2Q0FBb0NFLGVBQWUsQ0FBQ3VFLGtCQUFoQixJQUFzQywwRkFBMUUsQ0FBUDtBQUNBekUsUUFBQUEsT0FBTyxVQUFQO0FBQ0gsT0FQRCxNQU9PO0FBQ0hBLFFBQUFBLE9BQU8saUJBQVVFLGVBQWUsQ0FBQ3dFLHNCQUFoQixJQUEwQyw4Q0FBcEQsc0JBQThHL0UsT0FBOUcsdUJBQWtJTyxlQUFlLENBQUN5RSxzQkFBaEIsSUFBMEMsdUNBQTVLLFNBQVA7QUFDSDtBQUVKLEtBdkJELE1BdUJPLElBQUlSLElBQUksS0FBSyxlQUFiLEVBQThCO0FBQ2pDO0FBQ0FuRSxNQUFBQSxPQUFPLHVDQUE4QkUsZUFBZSxDQUFDMEUsbUJBQWhCLElBQXVDLHNCQUFyRSxlQUFQO0FBQ0E1RSxNQUFBQSxPQUFPLHNDQUFQLENBSGlDLENBS2pDOztBQUNBQSxNQUFBQSxPQUFPLGlCQUFVRSxlQUFlLENBQUMyRSxzQkFBaEIsSUFBMEMsME1BQXBELFNBQVAsQ0FOaUMsQ0FRakM7O0FBQ0E3RSxNQUFBQSxPQUFPLHNDQUFQO0FBQ0FBLE1BQUFBLE9BQU8seUJBQWtCRSxlQUFlLENBQUNxRSxTQUFoQixJQUE2QixRQUEvQyxtQkFBUDs7QUFFQSxVQUFJSCxTQUFKLEVBQWU7QUFDWHBFLFFBQUFBLE9BQU8sZ0NBQVA7QUFDQUEsUUFBQUEsT0FBTyw0QkFBUDtBQUNBQSxRQUFBQSxPQUFPLCtDQUFzQ0UsZUFBZSxDQUFDNEUsbUJBQWhCLElBQXVDLDBEQUE3RSxVQUFQO0FBQ0E5RSxRQUFBQSxPQUFPLCtDQUFzQ0UsZUFBZSxDQUFDNkUscUJBQWhCLElBQXlDLHVDQUEvRSxVQUFQO0FBQ0EvRSxRQUFBQSxPQUFPLCtDQUFzQ0UsZUFBZSxDQUFDOEUsd0JBQWhCLElBQTRDLDRDQUFsRixVQUFQO0FBQ0FoRixRQUFBQSxPQUFPLFdBQVA7QUFDQUEsUUFBQUEsT0FBTyxZQUFQO0FBQ0gsT0FSRCxNQVFPO0FBQ0hBLFFBQUFBLE9BQU8saUJBQVVFLGVBQWUsQ0FBQytFLGNBQWhCLElBQWtDLFNBQTVDLHNCQUFpRXRGLE9BQWpFLHVCQUFxRk8sZUFBZSxDQUFDZ0YsMEJBQWhCLElBQThDLGlFQUFuSSxTQUFQO0FBQ0g7QUFDSjs7QUFFRGxGLElBQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0EsV0FBT0EsT0FBUDtBQUNIO0FBNVFvQixDQUF6QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVbmlmaWVkIHRvb2x0aXAgZ2VuZXJhdG9yIGZvciBmaXJld2FsbCBydWxlc1xuICogQG1vZHVsZSBmaXJld2FsbFRvb2x0aXBzXG4gKi9cbmNvbnN0IGZpcmV3YWxsVG9vbHRpcHMgPSB7XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgdG9vbHRpcCBjb250ZW50IGJhc2VkIG9uIHNlcnZpY2UsIGFjdGlvbiBhbmQgY29udGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2aWNlIC0gU2VydmljZSBjYXRlZ29yeSBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIEN1cnJlbnQgYWN0aW9uIChhbGxvdy9ibG9jaylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV0d29yayAtIE5ldHdvcmsgYWRkcmVzcyB3aXRoIHN1Ym5ldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0xpbWl0ZWQgLSBXaGV0aGVyIHNlcnZpY2UgaXMgbGltaXRlZCBpbiBEb2NrZXJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcG9ydEluZm8gLSBQb3J0IGluZm9ybWF0aW9uIGZvciB0aGUgc2VydmljZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc2hvd0NvcHlCdXR0b24gLSBXaGV0aGVyIHRvIHNob3cgY29weSBidXR0b25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUNvbnRlbnQoc2VydmljZSwgYWN0aW9uLCBuZXR3b3JrLCBpc0RvY2tlciwgaXNMaW1pdGVkLCBwb3J0SW5mbywgc2hvd0NvcHlCdXR0b24gPSBmYWxzZSkge1xuICAgICAgICBsZXQgY29udGVudCA9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXJ2aWNlIG5hbWUgaGVhZGVyXG4gICAgICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IGdsb2JhbFRyYW5zbGF0ZVtgZndfJHtzZXJ2aWNlLnRvTG93ZXJDYXNlKCl9RGVzY3JpcHRpb25gXSB8fCBzZXJ2aWNlO1xuICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PGI+JHtzZXJ2aWNlRGVzY3JpcHRpb259PC9iPjwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICAvLyBQb3J0IGluZm9ybWF0aW9uXG4gICAgICAgIGlmIChwb3J0SW5mbyAmJiBwb3J0SW5mby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X1NlcnZpY2VQb3J0c0luZm8gfHwgJ1VzZWQgcG9ydHMnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwb3J0SW5mby5mb3JFYWNoKHBvcnQgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBwb3J0U3RyID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKHBvcnQucG9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgPSBgJHtwb3J0LnByb3RvY29sfSAke3BvcnQucG9ydH1gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyID0gYCR7cG9ydC5wcm90b2NvbH0gJHtwb3J0LnJhbmdlfWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnByb3RvY29sID09PSAnSUNNUCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciA9ICdJQ01QJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHBvcnQuZGVzY3JpcHRpb24gJiYgIXBvcnQuZGVzY3JpcHRpb24uc3RhcnRzV2l0aCgnZndfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciArPSBgIC0gJHtwb3J0LmRlc2NyaXB0aW9ufWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LmRlc2NyaXB0aW9uICYmIGdsb2JhbFRyYW5zbGF0ZVtwb3J0LmRlc2NyaXB0aW9uXSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyICs9IGAgLSAke2dsb2JhbFRyYW5zbGF0ZVtwb3J0LmRlc2NyaXB0aW9uXX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+JHtwb3J0U3RyfTwvbGk+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L3VsPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnRleHQtc3BlY2lmaWMgY29udGVudFxuICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNEb2NrZXIgJiYgaXNMaW1pdGVkKSB7XG4gICAgICAgICAgICAvLyBEb2NrZXIgbGltaXRlZCBzZXJ2aWNlIC0gYWx3YXlzIHNob3cgaG9zdCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJMaW1pdGVkU2VydmljZSB8fCAnVGhpcyBzZXJ2aWNlIGlzIGFsd2F5cyBlbmFibGVkIGluIERvY2tlciBlbnZpcm9ubWVudC4gRmlyZXdhbGwgcnVsZXMgbXVzdCBiZSBjb25maWd1cmVkIG9uIHRoZSBEb2NrZXIgaG9zdC4nfWA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJDb25maWd1cmVSdWxlcyB8fCAnQ29uZmlndXJlIGZpcmV3YWxsIHJ1bGVzIG9uIERvY2tlciBob3N0J306PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzaG93Q29weUJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSB0b3AgcmlnaHQgYXR0YWNoZWQgbGFiZWwgY29weS1jb21tYW5kXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8aSBjbGFzcz1cImNvcHkgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQ29weUNvbW1hbmQgfHwgJ0NvcHknfWA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPHByZSBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBtYXJnaW46IDA7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBvcnRJbmZvICYmIHBvcnRJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwb3J0SW5mby5mb3JFYWNoKHBvcnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpcHRhYmxlc0FjdGlvbiA9IGFjdGlvbiA9PT0gJ2FsbG93JyA/ICdBQ0NFUFQnIDogJ0RST1AnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCBpY21wIC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnBvcnQgIT09IHVuZGVmaW5lZCAmJiBwb3J0LnBvcnQgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIERPQ0tFUi1VU0VSIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtwb3J0LnBvcnR9IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbZnJvbSwgdG9dID0gcG9ydC5yYW5nZS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke2Zyb219OiR7dG99IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L3ByZT4nO1xuICAgICAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChpc0RvY2tlcikge1xuICAgICAgICAgICAgLy8gRG9ja2VyIHN1cHBvcnRlZCBzZXJ2aWNlIC0ganVzdCBpbmZvcm1hdGlvblxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2FsbG93Jykge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FjY2Vzc0FsbG93ZWRGb3JTdWJuZXQgfHwgJ0FjY2VzcyB3aWxsIGJlIGFsbG93ZWQgZm9yIHN1Ym5ldCd9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19BY2Nlc3NCbG9ja2VkRm9yU3VibmV0IHx8ICdBY2Nlc3Mgd2lsbCBiZSBibG9ja2VkIGZvciBzdWJuZXQnfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJlZ3VsYXIgZW52aXJvbm1lbnQgLSBzaG93IGlwdGFibGVzIHJ1bGVzXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0lwdGFibGVzUnVsZXNBcHBsaWVkIHx8ICdGb2xsb3dpbmcgaXB0YWJsZXMgcnVsZXMgd2lsbCBiZSBhcHBsaWVkJ306PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8cHJlIHN0eWxlPVwiZm9udC1zaXplOiAwLjg1ZW07IG1hcmdpbjogMDtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocG9ydEluZm8gJiYgcG9ydEluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlwdGFibGVzQWN0aW9uID0gYWN0aW9uID09PSAnYWxsb3cnID8gJ0FDQ0VQVCcgOiAnRFJPUCc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocG9ydC5wcm90b2NvbCA9PT0gJ0lDTVAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBJTlBVVCAtcyAke25ldHdvcmt9IC1wIGljbXAgLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucG9ydCAhPT0gdW5kZWZpbmVkICYmIHBvcnQucG9ydCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgSU5QVVQgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke3BvcnQucG9ydH0gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBwb3J0LnJhbmdlLnNwbGl0KCctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBJTlBVVCAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7ZnJvbX06JHt0b30gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcCBvbiBlbGVtZW50XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0galF1ZXJ5IGVsZW1lbnQgdG8gYXR0YWNoIHRvb2x0aXAgdG9cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIFRvb2x0aXAgb3B0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwKCRlbGVtZW50LCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9ICQuZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoc2V0dGluZ3Mub25TaG93KSB7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbE9uU2hvdyA9IHNldHRpbmdzLm9uU2hvdztcbiAgICAgICAgICAgIHNldHRpbmdzLm9uU2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsT25TaG93LmNhbGwodGhpcyk7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb3B5IGJ1dHRvbnMgYWZ0ZXIgcG9wdXAgaXMgc2hvd25cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktY29tbWFuZCcpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmaXJld2FsbFRvb2x0aXBzLmNvcHlUb0NsaXBib2FyZCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZXR0aW5ncy5vblNob3cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktY29tbWFuZCcpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmaXJld2FsbFRvb2x0aXBzLmNvcHlUb0NsaXBib2FyZCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICRlbGVtZW50LnBvcHVwKHNldHRpbmdzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvcHkgY29tbWFuZCB0byBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjb3B5VG9DbGlwYm9hcmQoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRsYWJlbCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgY29uc3QgJHByZSA9ICRsYWJlbC5zaWJsaW5ncygncHJlJyk7XG4gICAgICAgIGNvbnN0IHRleHQgPSAkcHJlLnRleHQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wb3JhcnkgdGV4dGFyZWFcbiAgICAgICAgY29uc3QgJHRlbXAgPSAkKCc8dGV4dGFyZWE+Jyk7XG4gICAgICAgICQoJ2JvZHknKS5hcHBlbmQoJHRlbXApO1xuICAgICAgICAkdGVtcC52YWwodGV4dCkuc2VsZWN0KCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKTtcbiAgICAgICAgICAgICRsYWJlbC5odG1sKGA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0NvbW1hbmRDb3BpZWQgfHwgJ0NvcGllZCEnfWApO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGxhYmVsLmh0bWwoYDxpIGNsYXNzPVwiY29weSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db3B5Q29tbWFuZCB8fCAnQ29weSd9YCk7XG4gICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY29weTonLCBlcnIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkdGVtcC5yZW1vdmUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0b29sdGlwIGNvbnRlbnQgZHluYW1pY2FsbHlcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBFbGVtZW50IHdpdGggdG9vbHRpcFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdDb250ZW50IC0gTmV3IEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHVwZGF0ZUNvbnRlbnQoJGVsZW1lbnQsIG5ld0NvbnRlbnQpIHtcbiAgICAgICAgJGVsZW1lbnQucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgJGVsZW1lbnQucG9wdXAoe1xuICAgICAgICAgICAgaHRtbDogbmV3Q29udGVudCxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJyxcbiAgICAgICAgICAgIG9uU2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgdG9vbHRpcCBjb250ZW50IGZvciBzcGVjaWFsIGNoZWNrYm94ZXMgKG5ld2VyX2Jsb2NrX2lwIGFuZCBsb2NhbF9uZXR3b3JrKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gVHlwZSBvZiBjaGVja2JveCAoJ25ld2VyX2Jsb2NrX2lwJyBvciAnbG9jYWxfbmV0d29yaycpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ldHdvcmsgLSBOZXR3b3JrIGFkZHJlc3Mgd2l0aCBzdWJuZXRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2hlY2tlZCAtIFdoZXRoZXIgY2hlY2tib3ggaXMgY2hlY2tlZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqL1xuICAgIGdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudCh0eXBlLCBuZXR3b3JrLCBpc0NoZWNrZWQpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGUgPT09ICduZXdlcl9ibG9ja19pcCcpIHtcbiAgICAgICAgICAgIC8vIEhlYWRlclxuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxiPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X05ld2VyQmxvY2tJcCB8fCAnTmV2ZXIgYmxvY2sgSVBzJ308L2I+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X05ld2VyQmxvY2tJcFRvb2x0aXAgfHwgJ0lQIGFkZHJlc3NlcyBmcm9tIHRoaXMgc3VibmV0IHdpbGwgbmV2ZXIgYmUgYmxvY2tlZCBieSBGYWlsMmJhbiBzZXJ2aWNlLCBldmVuIGFmdGVyIG11bHRpcGxlIGZhaWxlZCBsb2dpbiBhdHRlbXB0cy4gVXNlIHRoaXMgb3B0aW9uIGZvciB0cnVzdGVkIG5ldHdvcmtzIHN1Y2ggYXMgb2ZmaWNlIG5ldHdvcmsgb3IgVlBOLid9PC9wPmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVmZmVjdFxuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19FZmZlY3QgfHwgJ0VmZmVjdCd9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaXNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwic2hpZWxkIGFsdGVybmF0ZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19GYWlsMmJhbldpbGxJZ25vcmUgfHwgJ0ZhaWwyYmFuIHdpbGwgaWdub3JlIGZhaWxlZCBhdXRoZW50aWNhdGlvbiBhdHRlbXB0cyBmcm9tJ30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwIGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfU2VjdXJpdHlXYXJuaW5nIHx8ICdXYXJuaW5nOiBUaGlzIHJlZHVjZXMgc2VjdXJpdHkgZm9yIHRoZSBzcGVjaWZpZWQgbmV0d29yay4gVXNlIG9ubHkgZm9yIHRydXN0ZWQgbmV0d29ya3MuJ31gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvcD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19GYWlsMmJhbldpbGxNb25pdG9yIHx8ICdGYWlsMmJhbiB3aWxsIG1vbml0b3IgYW5kIG1heSBibG9jayBJUHMgZnJvbSd9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPiAke2dsb2JhbFRyYW5zbGF0ZS5md19BZnRlckZhaWxlZEF0dGVtcHRzIHx8ICdhZnRlciBmYWlsZWQgYXV0aGVudGljYXRpb24gYXR0ZW1wdHMuJ308L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdsb2NhbF9uZXR3b3JrJykge1xuICAgICAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PGI+JHtnbG9iYWxUcmFuc2xhdGUuZndfSXRJc0xvY2FsTmV0d29yayB8fCAnTG9jYWwgbmV0d29yayBvciBWUE4nfTwvYj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfTG9jYWxOZXR3b3JrVG9vbHRpcCB8fCAnU3BlY2lmeSB0aGlzIG9wdGlvbiBmb3IgbG9jYWwgbmV0d29ya3Mgb3IgVlBOIHdoZXJlIGRldmljZXMgY29ubmVjdCB0byBNaWtvUEJYIGRpcmVjdGx5IHdpdGhvdXQgTkFULiBUaGlzIGFmZmVjdHMgU0lQIHBhY2tldCBwcm9jZXNzaW5nIGFuZCBhbGxvd3MgcHJvcGVyIGRldmljZSBhZGRyZXNzIGRldGVjdGlvbiBpbiB0aGUgbG9jYWwgbmV0d29yay4nfTwvcD5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFZmZlY3RcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfRWZmZWN0IHx8ICdFZmZlY3QnfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+PGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19EaXJlY3RTSVBSb3V0aW5nIHx8ICdTSVAgcGFja2V0cyB3aWxsIGJlIHJvdXRlZCBkaXJlY3RseSB3aXRob3V0IE5BVCBoYW5kbGluZyd9PC9saT5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT48aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X05vQ29udGFjdFJld3JpdGluZyB8fCAnQ29udGFjdCBoZWFkZXJzIHdpbGwgbm90IGJlIHJld3JpdHRlbid9PC9saT5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT48aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0xvY2FsQWRkcmVzc0RldGVjdGlvbiB8fCAnRGV2aWNlIGFkZHJlc3NlcyB3aWxsIGJlIGRldGVjdGVkIGFzIGxvY2FsJ308L2xpPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPC91bD5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X05BVEhhbmRsaW5nIHx8ICdOZXR3b3JrJ30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X1dpbGxCZUhhbmRsZWRBc0V4dGVybmFsIHx8ICd3aWxsIGJlIGhhbmRsZWQgYXMgZXh0ZXJuYWwgbmV0d29yayB3aXRoIE5BVCB0cmF2ZXJzYWwgZW5hYmxlZC4nfTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICB9XG59OyJdfQ==