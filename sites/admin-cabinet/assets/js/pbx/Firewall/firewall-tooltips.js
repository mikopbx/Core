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
    content += "<div class=\"header\"><b>".concat(serviceDescription, "</b></div>"); // Detailed hint (if available)

    var serviceHintKey = "fw_".concat(service.toLowerCase(), "DescriptionHint");

    if (globalTranslate[serviceHintKey]) {
      content += "<div class=\"ui divider\"></div>";
      content += "<div class=\"ui info message\">".concat(globalTranslate[serviceHintKey], "</div>");
    } // Port information


    if (portInfo && portInfo.length > 0) {
      content += "<div class=\"ui divider\"></div>";
      content += "<p><strong>".concat(globalTranslate.fw_ServicePortsInfo, ":</strong></p>");
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
      content += "<i class=\"warning icon\"></i> ".concat(globalTranslate.fw_DockerLimitedService);
      content += "</div>";
      content += "<p><strong>".concat(globalTranslate.fw_DockerConfigureRules, ":</strong></p>");
      content += '<div class="ui segment">';

      if (showCopyButton) {
        content += "<div class=\"ui top right attached label copy-command\" style=\"cursor: pointer;\">";
        content += "<i class=\"copy icon\"></i> ".concat(globalTranslate.fw_CopyCommand);
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
        content += "<p>".concat(globalTranslate.fw_AccessAllowedForSubnet, " <strong>").concat(network, "</strong></p>");
      } else {
        content += "<p>".concat(globalTranslate.fw_AccessBlockedForSubnet, " <strong>").concat(network, "</strong></p>");
      }
    } else {
      // Regular environment - show iptables rules
      content += "<p><strong>".concat(globalTranslate.fw_IptablesRulesApplied, ":</strong></p>");
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
      $label.html("<i class=\"check icon\"></i> ".concat(globalTranslate.fw_CommandCopied));
      setTimeout(function () {
        $label.html("<i class=\"copy icon\"></i> ".concat(globalTranslate.fw_CopyCommand));
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
      content += "<div class=\"header\"><b>".concat(globalTranslate.fw_NewerBlockIp, "</b></div>");
      content += "<div class=\"ui divider\"></div>"; // Description

      content += "<p>".concat(globalTranslate.fw_NewerBlockIpTooltip, "</p>"); // Effect

      content += "<div class=\"ui divider\"></div>";
      content += "<p><strong>".concat(globalTranslate.fw_Effect, ":</strong></p>");

      if (isChecked) {
        content += "<div class=\"ui segment\">";
        content += "<i class=\"shield alternate icon\"></i> ".concat(globalTranslate.fw_Fail2banWillIgnore, " <strong>").concat(network, "</strong>");
        content += "</div>";
        content += "<p class=\"ui warning message\">";
        content += "<i class=\"warning icon\"></i> ".concat(globalTranslate.fw_SecurityWarning);
        content += "</p>";
      } else {
        content += "<p>".concat(globalTranslate.fw_Fail2banWillMonitor, " <strong>").concat(network, "</strong> ").concat(globalTranslate.fw_AfterFailedAttempts, "</p>");
      }
    } else if (type === 'local_network') {
      // Header
      content += "<div class=\"header\"><b>".concat(globalTranslate.fw_ItIsLocalNetwork, "</b></div>");
      content += "<div class=\"ui divider\"></div>"; // Description

      content += "<p>".concat(globalTranslate.fw_LocalNetworkTooltip, "</p>"); // Effect

      content += "<div class=\"ui divider\"></div>";
      content += "<p><strong>".concat(globalTranslate.fw_Effect, ":</strong></p>");

      if (isChecked) {
        content += "<div class=\"ui segment\">";
        content += "<ul class=\"ui list\">";
        content += "<li><i class=\"check icon\"></i> ".concat(globalTranslate.fw_DirectSIPRouting, "</li>");
        content += "<li><i class=\"check icon\"></i> ".concat(globalTranslate.fw_NoContactRewriting, "</li>");
        content += "<li><i class=\"check icon\"></i> ".concat(globalTranslate.fw_LocalAddressDetection, "</li>");
        content += "</ul>";
        content += "</div>";
      } else {
        content += "<p>".concat(globalTranslate.fw_NATHandling, " <strong>").concat(network, "</strong> ").concat(globalTranslate.fw_WillBeHandledAsExternal, "</p>");
      }
    }

    content += '</div>';
    return content;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC10b29sdGlwcy5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50Iiwic2VydmljZSIsImFjdGlvbiIsIm5ldHdvcmsiLCJpc0RvY2tlciIsImlzTGltaXRlZCIsInBvcnRJbmZvIiwic2hvd0NvcHlCdXR0b24iLCJjb250ZW50Iiwic2VydmljZURlc2NyaXB0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9Mb3dlckNhc2UiLCJzZXJ2aWNlSGludEtleSIsImxlbmd0aCIsImZ3X1NlcnZpY2VQb3J0c0luZm8iLCJmb3JFYWNoIiwicG9ydCIsInBvcnRTdHIiLCJ1bmRlZmluZWQiLCJwcm90b2NvbCIsInJhbmdlIiwiZGVzY3JpcHRpb24iLCJzdGFydHNXaXRoIiwiZndfRG9ja2VyTGltaXRlZFNlcnZpY2UiLCJmd19Eb2NrZXJDb25maWd1cmVSdWxlcyIsImZ3X0NvcHlDb21tYW5kIiwiaXB0YWJsZXNBY3Rpb24iLCJzcGxpdCIsImZyb20iLCJ0byIsImZ3X0FjY2Vzc0FsbG93ZWRGb3JTdWJuZXQiLCJmd19BY2Nlc3NCbG9ja2VkRm9yU3VibmV0IiwiZndfSXB0YWJsZXNSdWxlc0FwcGxpZWQiLCJpbml0aWFsaXplVG9vbHRpcCIsIiRlbGVtZW50Iiwib3B0aW9ucyIsImRlZmF1bHRzIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInNob3ciLCJoaWRlIiwidmFyaWF0aW9uIiwic2V0dGluZ3MiLCIkIiwiZXh0ZW5kIiwib25TaG93Iiwib3JpZ2luYWxPblNob3ciLCJjYWxsIiwic2V0VGltZW91dCIsIm9mZiIsIm9uIiwiY29weVRvQ2xpcGJvYXJkIiwiaXMiLCJjbG9zZXN0IiwicG9wdXAiLCJlIiwic3RvcFByb3BhZ2F0aW9uIiwicHJldmVudERlZmF1bHQiLCIkbGFiZWwiLCJjdXJyZW50VGFyZ2V0IiwiJHByZSIsInNpYmxpbmdzIiwidGV4dCIsIiR0ZW1wIiwiYXBwZW5kIiwidmFsIiwic2VsZWN0IiwiZG9jdW1lbnQiLCJleGVjQ29tbWFuZCIsImh0bWwiLCJmd19Db21tYW5kQ29waWVkIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwicmVtb3ZlIiwidXBkYXRlQ29udGVudCIsIm5ld0NvbnRlbnQiLCJhZGRpdGlvbmFsT3B0aW9ucyIsImdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudCIsInR5cGUiLCJpc0NoZWNrZWQiLCJmd19OZXdlckJsb2NrSXAiLCJmd19OZXdlckJsb2NrSXBUb29sdGlwIiwiZndfRWZmZWN0IiwiZndfRmFpbDJiYW5XaWxsSWdub3JlIiwiZndfU2VjdXJpdHlXYXJuaW5nIiwiZndfRmFpbDJiYW5XaWxsTW9uaXRvciIsImZ3X0FmdGVyRmFpbGVkQXR0ZW1wdHMiLCJmd19JdElzTG9jYWxOZXR3b3JrIiwiZndfTG9jYWxOZXR3b3JrVG9vbHRpcCIsImZ3X0RpcmVjdFNJUFJvdXRpbmciLCJmd19Ob0NvbnRhY3RSZXdyaXRpbmciLCJmd19Mb2NhbEFkZHJlc3NEZXRlY3Rpb24iLCJmd19OQVRIYW5kbGluZyIsImZ3X1dpbGxCZUhhbmRsZWRBc0V4dGVybmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBWnFCLDJCQVlMQyxPQVpLLEVBWUlDLE1BWkosRUFZWUMsT0FaWixFQVlxQkMsUUFackIsRUFZK0JDLFNBWi9CLEVBWTBDQyxRQVoxQyxFQVk0RTtBQUFBLFFBQXhCQyxjQUF3Qix1RUFBUCxLQUFPO0FBQzdGLFFBQUlDLE9BQU8sR0FBRyx1QkFB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LE1BT087QUFDSEEsUUFBQUEsT0FBTyxpQkFBVUUsZUFBZSxDQUFDNkUsc0JBQTFCLHNCQUE0RHBGLE9BQTVELHVCQUFnRk8sZUFBZSxDQUFDOEUsc0JBQWhHLFNBQVA7QUFDSDtBQUVKLEtBdkJELE1BdUJPLElBQUlSLElBQUksS0FBSyxlQUFiLEVBQThCO0FBQ2pDO0FBQ0F4RSxNQUFBQSxPQUFPLHVDQUE4QkUsZUFBZSxDQUFDK0UsbUJBQTlDLGVBQVA7QUFDQWpGLE1BQUFBLE9BQU8sc0NBQVAsQ0FIaUMsQ0FLakM7O0FBQ0FBLE1BQUFBLE9BQU8saUJBQVVFLGVBQWUsQ0FBQ2dGLHNCQUExQixTQUFQLENBTmlDLENBUWpDOztBQUNBbEYsTUFBQUEsT0FBTyxzQ0FBUDtBQUNBQSxNQUFBQSxPQUFPLHlCQUFrQkUsZUFBZSxDQUFDMEUsU0FBbEMsbUJBQVA7O0FBRUEsVUFBSUgsU0FBSixFQUFlO0FBQ1h6RSxRQUFBQSxPQUFPLGdDQUFQO0FBQ0FBLFFBQUFBLE9BQU8sNEJBQVA7QUFDQUEsUUFBQUEsT0FBTywrQ0FBc0NFLGVBQWUsQ0FBQ2lGLG1CQUF0RCxVQUFQO0FBQ0FuRixRQUFBQSxPQUFPLCtDQUFzQ0UsZUFBZSxDQUFDa0YscUJBQXRELFVBQVA7QUFDQXBGLFFBQUFBLE9BQU8sK0NBQXNDRSxlQUFlLENBQUNtRix3QkFBdEQsVUFBUDtBQUNBckYsUUFBQUEsT0FBTyxXQUFQO0FBQ0FBLFFBQUFBLE9BQU8sWUFBUDtBQUNILE9BUkQsTUFRTztBQUNIQSxRQUFBQSxPQUFPLGlCQUFVRSxlQUFlLENBQUNvRixjQUExQixzQkFBb0QzRixPQUFwRCx1QkFBd0VPLGVBQWUsQ0FBQ3FGLDBCQUF4RixTQUFQO0FBQ0g7QUFDSjs7QUFFRHZGLElBQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0EsV0FBT0EsT0FBUDtBQUNIO0FBeFNvQixDQUF6QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVbmlmaWVkIHRvb2x0aXAgZ2VuZXJhdG9yIGZvciBmaXJld2FsbCBydWxlc1xuICogQG1vZHVsZSBmaXJld2FsbFRvb2x0aXBzXG4gKi9cbmNvbnN0IGZpcmV3YWxsVG9vbHRpcHMgPSB7XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgdG9vbHRpcCBjb250ZW50IGJhc2VkIG9uIHNlcnZpY2UsIGFjdGlvbiBhbmQgY29udGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2aWNlIC0gU2VydmljZSBjYXRlZ29yeSBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIEN1cnJlbnQgYWN0aW9uIChhbGxvdy9ibG9jaylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV0d29yayAtIE5ldHdvcmsgYWRkcmVzcyB3aXRoIHN1Ym5ldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0xpbWl0ZWQgLSBXaGV0aGVyIHNlcnZpY2UgaXMgbGltaXRlZCBpbiBEb2NrZXJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcG9ydEluZm8gLSBQb3J0IGluZm9ybWF0aW9uIGZvciB0aGUgc2VydmljZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc2hvd0NvcHlCdXR0b24gLSBXaGV0aGVyIHRvIHNob3cgY29weSBidXR0b25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUNvbnRlbnQoc2VydmljZSwgYWN0aW9uLCBuZXR3b3JrLCBpc0RvY2tlciwgaXNMaW1pdGVkLCBwb3J0SW5mbywgc2hvd0NvcHlCdXR0b24gPSBmYWxzZSkge1xuICAgICAgICBsZXQgY29udGVudCA9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXJ2aWNlIG5hbWUgaGVhZGVyXG4gICAgICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IGdsb2JhbFRyYW5zbGF0ZVtgZndfJHtzZXJ2aWNlLnRvTG93ZXJDYXNlKCl9RGVzY3JpcHRpb25gXSB8fCBzZXJ2aWNlO1xuICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PGI+JHtzZXJ2aWNlRGVzY3JpcHRpb259PC9iPjwvZGl2PmA7XG5cbiAgICAgICAgLy8gRGV0YWlsZWQgaGludCAoaWYgYXZhaWxhYmxlKVxuICAgICAgICBjb25zdCBzZXJ2aWNlSGludEtleSA9IGBmd18ke3NlcnZpY2UudG9Mb3dlckNhc2UoKX1EZXNjcmlwdGlvbkhpbnRgO1xuICAgICAgICBpZiAoZ2xvYmFsVHJhbnNsYXRlW3NlcnZpY2VIaW50S2V5XSkge1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPiR7Z2xvYmFsVHJhbnNsYXRlW3NlcnZpY2VIaW50S2V5XX08L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUG9ydCBpbmZvcm1hdGlvblxuICAgICAgICBpZiAocG9ydEluZm8gJiYgcG9ydEluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19TZXJ2aWNlUG9ydHNJbmZvfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwb3J0SW5mby5mb3JFYWNoKHBvcnQgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBwb3J0U3RyID0gJyc7XG4gICAgICAgICAgICAgICAgaWYgKHBvcnQucG9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgPSBgJHtwb3J0LnByb3RvY29sfSAke3BvcnQucG9ydH1gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyID0gYCR7cG9ydC5wcm90b2NvbH0gJHtwb3J0LnJhbmdlfWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnByb3RvY29sID09PSAnSUNNUCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciA9ICdJQ01QJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKHBvcnQuZGVzY3JpcHRpb24gJiYgIXBvcnQuZGVzY3JpcHRpb24uc3RhcnRzV2l0aCgnZndfJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciArPSBgIC0gJHtwb3J0LmRlc2NyaXB0aW9ufWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LmRlc2NyaXB0aW9uICYmIGdsb2JhbFRyYW5zbGF0ZVtwb3J0LmRlc2NyaXB0aW9uXSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyICs9IGAgLSAke2dsb2JhbFRyYW5zbGF0ZVtwb3J0LmRlc2NyaXB0aW9uXX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+JHtwb3J0U3RyfTwvbGk+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L3VsPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnRleHQtc3BlY2lmaWMgY29udGVudFxuICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNEb2NrZXIgJiYgaXNMaW1pdGVkKSB7XG4gICAgICAgICAgICAvLyBEb2NrZXIgbGltaXRlZCBzZXJ2aWNlIC0gYWx3YXlzIHNob3cgaG9zdCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJMaW1pdGVkU2VydmljZX1gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfRG9ja2VyQ29uZmlndXJlUnVsZXN9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2hvd0NvcHlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIHJpZ2h0IGF0dGFjaGVkIGxhYmVsIGNvcHktY29tbWFuZFwiIHN0eWxlPVwiY3Vyc29yOiBwb2ludGVyO1wiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJjb3B5IGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0NvcHlDb21tYW5kfWA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPHByZSBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBtYXJnaW46IDA7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBvcnRJbmZvICYmIHBvcnRJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwb3J0SW5mby5mb3JFYWNoKHBvcnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpcHRhYmxlc0FjdGlvbiA9IGFjdGlvbiA9PT0gJ2FsbG93JyA/ICdBQ0NFUFQnIDogJ0RST1AnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCBpY21wIC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnBvcnQgIT09IHVuZGVmaW5lZCAmJiBwb3J0LnBvcnQgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIERPQ0tFUi1VU0VSIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtwb3J0LnBvcnR9IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbZnJvbSwgdG9dID0gcG9ydC5yYW5nZS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke2Zyb219OiR7dG99IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L3ByZT4nO1xuICAgICAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgfSBlbHNlIGlmIChpc0RvY2tlcikge1xuICAgICAgICAgICAgLy8gRG9ja2VyIHN1cHBvcnRlZCBzZXJ2aWNlIC0ganVzdCBpbmZvcm1hdGlvblxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ2FsbG93Jykge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FjY2Vzc0FsbG93ZWRGb3JTdWJuZXR9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19BY2Nlc3NCbG9ja2VkRm9yU3VibmV0fSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFJlZ3VsYXIgZW52aXJvbm1lbnQgLSBzaG93IGlwdGFibGVzIHJ1bGVzXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0lwdGFibGVzUnVsZXNBcHBsaWVkfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxwcmUgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgbWFyZ2luOiAwO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwb3J0SW5mbyAmJiBwb3J0SW5mby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcG9ydEluZm8uZm9yRWFjaChwb3J0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXB0YWJsZXNBY3Rpb24gPSBhY3Rpb24gPT09ICdhbGxvdycgPyAnQUNDRVBUJyA6ICdEUk9QJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3J0LnByb3RvY29sID09PSAnSUNNUCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgaWNtcCAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQgJiYgcG9ydC5wb3J0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBJTlBVVCAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7cG9ydC5wb3J0fSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IHBvcnQucmFuZ2Uuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtmcm9tfToke3RvfSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwIG9uIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGVsZW1lbnQgLSBqUXVlcnkgZWxlbWVudCB0byBhdHRhY2ggdG9vbHRpcCB0b1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gVG9vbHRpcCBvcHRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXAoJGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgZGVmYXVsdHMgPSB7XG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gJC5leHRlbmQoe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzZXR0aW5ncy5vblNob3cpIHtcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsT25TaG93ID0gc2V0dGluZ3Mub25TaG93O1xuICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgb3JpZ2luYWxPblNob3cuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGNvcHkgYnV0dG9ucyBhZnRlciBwb3B1cCBpcyBzaG93blxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNldHRpbmdzLm9uU2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudCBpcyBhbiBpY29uIGluc2lkZSBhIGxhYmVsIChmb3IgY2hlY2tib3ggdG9nZ2xlIHByZXZlbnRpb24pXG4gICAgICAgIGlmICgkZWxlbWVudC5pcygnLnNwZWNpYWwtY2hlY2tib3gtaW5mbywgLnNlcnZpY2UtaW5mby1pY29uJykgJiYgJGVsZW1lbnQuY2xvc2VzdCgnbGFiZWwnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBVc2UgbWFudWFsIGNvbnRyb2wgZm9yIGljb25zIGluc2lkZSBsYWJlbHNcbiAgICAgICAgICAgIHNldHRpbmdzLm9uID0gJ21hbnVhbCc7XG4gICAgICAgICAgICAkZWxlbWVudC5wb3B1cChzZXR0aW5ncyk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIHNob3cgcG9wdXAgYW5kIHByZXZlbnQgY2hlY2tib3ggdG9nZ2xlXG4gICAgICAgICAgICAkZWxlbWVudC5vZmYoJ2NsaWNrLnBvcHVwLXRyaWdnZXInKS5vbignY2xpY2sucG9wdXAtdHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnBvcHVwKCd0b2dnbGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVndWxhciBwb3B1cCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgJGVsZW1lbnQucG9wdXAoc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb3B5IGNvbW1hbmQgdG8gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY29weVRvQ2xpcGJvYXJkKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIGNvbnN0ICRwcmUgPSAkbGFiZWwuc2libGluZ3MoJ3ByZScpO1xuICAgICAgICBjb25zdCB0ZXh0ID0gJHByZS50ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IHRleHRhcmVhXG4gICAgICAgIGNvbnN0ICR0ZW1wID0gJCgnPHRleHRhcmVhPicpO1xuICAgICAgICAkKCdib2R5JykuYXBwZW5kKCR0ZW1wKTtcbiAgICAgICAgJHRlbXAudmFsKHRleHQpLnNlbGVjdCgpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAkbGFiZWwuaHRtbChgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db21tYW5kQ29waWVkfWApO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGxhYmVsLmh0bWwoYDxpIGNsYXNzPVwiY29weSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db3B5Q29tbWFuZH1gKTtcbiAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjb3B5OicsIGVycik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICR0ZW1wLnJlbW92ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRvb2x0aXAgY29udGVudCBkeW5hbWljYWxseVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIEVsZW1lbnQgd2l0aCB0b29sdGlwXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0NvbnRlbnQgLSBOZXcgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IGFkZGl0aW9uYWxPcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zIHRvIG1lcmdlXG4gICAgICovXG4gICAgdXBkYXRlQ29udGVudCgkZWxlbWVudCwgbmV3Q29udGVudCwgYWRkaXRpb25hbE9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgaHRtbDogbmV3Q29udGVudCxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJyxcbiAgICAgICAgICAgIG9uU2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBhZGRpdGlvbmFsIG9wdGlvbnNcbiAgICAgICAgJC5leHRlbmQob3B0aW9ucywgYWRkaXRpb25hbE9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgJGVsZW1lbnQucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgJGVsZW1lbnQucG9wdXAob3B0aW9ucyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSB0b29sdGlwIGNvbnRlbnQgZm9yIHNwZWNpYWwgY2hlY2tib3hlcyAobmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmspXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBUeXBlIG9mIGNoZWNrYm94ICgnbmV3ZXJfYmxvY2tfaXAnIG9yICdsb2NhbF9uZXR3b3JrJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV0d29yayAtIE5ldHdvcmsgYWRkcmVzcyB3aXRoIHN1Ym5ldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDaGVja2VkIC0gV2hldGhlciBjaGVja2JveCBpcyBjaGVja2VkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICovXG4gICAgZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KHR5cGUsIG5ldHdvcmssIGlzQ2hlY2tlZCkge1xuICAgICAgICBsZXQgY29udGVudCA9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZSA9PT0gJ25ld2VyX2Jsb2NrX2lwJykge1xuICAgICAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PGI+JHtnbG9iYWxUcmFuc2xhdGUuZndfTmV3ZXJCbG9ja0lwfTwvYj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfTmV3ZXJCbG9ja0lwVG9vbHRpcH08L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRWZmZWN0XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0VmZmVjdH06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJzaGllbGQgYWx0ZXJuYXRlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0ZhaWwyYmFuV2lsbElnbm9yZX0gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwIGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8aSBjbGFzcz1cIndhcm5pbmcgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfU2VjdXJpdHlXYXJuaW5nfWA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPC9wPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0ZhaWwyYmFuV2lsbE1vbml0b3J9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPiAke2dsb2JhbFRyYW5zbGF0ZS5md19BZnRlckZhaWxlZEF0dGVtcHRzfTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2xvY2FsX25ldHdvcmsnKSB7XG4gICAgICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48Yj4ke2dsb2JhbFRyYW5zbGF0ZS5md19JdElzTG9jYWxOZXR3b3JrfTwvYj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfTG9jYWxOZXR3b3JrVG9vbHRpcH08L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRWZmZWN0XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0VmZmVjdH06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHVsIGNsYXNzPVwidWkgbGlzdFwiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGxpPjxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfRGlyZWN0U0lQUm91dGluZ308L2xpPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGxpPjxpIGNsYXNzPVwiY2hlY2sgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfTm9Db250YWN0UmV3cml0aW5nfTwvbGk+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+PGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Mb2NhbEFkZHJlc3NEZXRlY3Rpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvdWw+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19OQVRIYW5kbGluZ30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X1dpbGxCZUhhbmRsZWRBc0V4dGVybmFsfTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gY29udGVudDtcbiAgICB9XG59OyJdfQ==