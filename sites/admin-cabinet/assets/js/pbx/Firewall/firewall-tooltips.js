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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC10b29sdGlwcy5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50Iiwic2VydmljZSIsImFjdGlvbiIsIm5ldHdvcmsiLCJpc0RvY2tlciIsImlzTGltaXRlZCIsInBvcnRJbmZvIiwic2hvd0NvcHlCdXR0b24iLCJjb250ZW50Iiwic2VydmljZURlc2NyaXB0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9Mb3dlckNhc2UiLCJsZW5ndGgiLCJmd19TZXJ2aWNlUG9ydHNJbmZvIiwiZm9yRWFjaCIsInBvcnQiLCJwb3J0U3RyIiwidW5kZWZpbmVkIiwicHJvdG9jb2wiLCJyYW5nZSIsImRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlIiwiZndfRG9ja2VyQ29uZmlndXJlUnVsZXMiLCJmd19Db3B5Q29tbWFuZCIsImlwdGFibGVzQWN0aW9uIiwic3BsaXQiLCJmcm9tIiwidG8iLCJmd19BY2Nlc3NBbGxvd2VkRm9yU3VibmV0IiwiZndfQWNjZXNzQmxvY2tlZEZvclN1Ym5ldCIsImZ3X0lwdGFibGVzUnVsZXNBcHBsaWVkIiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCIkZWxlbWVudCIsIm9wdGlvbnMiLCJkZWZhdWx0cyIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiJCIsImV4dGVuZCIsIm9uU2hvdyIsIm9yaWdpbmFsT25TaG93IiwiY2FsbCIsInNldFRpbWVvdXQiLCJvZmYiLCJvbiIsImNvcHlUb0NsaXBib2FyZCIsImlzIiwiY2xvc2VzdCIsInBvcHVwIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiY3VycmVudFRhcmdldCIsIiRwcmUiLCJzaWJsaW5ncyIsInRleHQiLCIkdGVtcCIsImFwcGVuZCIsInZhbCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJodG1sIiwiZndfQ29tbWFuZENvcGllZCIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsInJlbW92ZSIsInVwZGF0ZUNvbnRlbnQiLCJuZXdDb250ZW50IiwiYWRkaXRpb25hbE9wdGlvbnMiLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ0eXBlIiwiaXNDaGVja2VkIiwiZndfTmV3ZXJCbG9ja0lwIiwiZndfTmV3ZXJCbG9ja0lwVG9vbHRpcCIsImZ3X0VmZmVjdCIsImZ3X0ZhaWwyYmFuV2lsbElnbm9yZSIsImZ3X1NlY3VyaXR5V2FybmluZyIsImZ3X0ZhaWwyYmFuV2lsbE1vbml0b3IiLCJmd19BZnRlckZhaWxlZEF0dGVtcHRzIiwiZndfSXRJc0xvY2FsTmV0d29yayIsImZ3X0xvY2FsTmV0d29ya1Rvb2x0aXAiLCJmd19EaXJlY3RTSVBSb3V0aW5nIiwiZndfTm9Db250YWN0UmV3cml0aW5nIiwiZndfTG9jYWxBZGRyZXNzRGV0ZWN0aW9uIiwiZndfTkFUSGFuZGxpbmciLCJmd19XaWxsQmVIYW5kbGVkQXNFeHRlcm5hbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQVpxQiwyQkFZTEMsT0FaSyxFQVlJQyxNQVpKLEVBWVlDLE9BWlosRUFZcUJDLFFBWnJCLEVBWStCQyxTQVovQixFQVkwQ0MsUUFaMUMsRUFZNEU7QUFBQSxRQUF4QkMsY0FBd0IsdUVBQVAsS0FBTztBQUM3RixRQUFJQyxPQUFPLEdBQUcsdUJBQWQsQ0FENkYsQ0FHN0Y7O0FBQ0EsUUFBTUMsa0JBQWtCLEdBQUdDLGVBQWUsY0FBT1QsT0FBTyxDQUFDVSxXQUFSLEVBQVAsaUJBQWYsSUFBNkRWLE9BQXhGO0FBQ0FPLElBQUFBLE9BQU8sdUNBQThCQyxrQkFBOUIsZUFBUCxDQUw2RixDQU83Rjs7QUFDQSxRQUFJSCxRQUFRLElBQUlBLFFBQVEsQ0FBQ00sTUFBVCxHQUFrQixDQUFsQyxFQUFxQztBQUNqQ0osTUFBQUEsT0FBTyxzQ0FBUDtBQUNBQSxNQUFBQSxPQUFPLHlCQUFrQkUsZUFBZSxDQUFDRyxtQkFBbEMsbUJBQVA7QUFDQUwsTUFBQUEsT0FBTyxJQUFJLHNCQUFYO0FBRUFGLE1BQUFBLFFBQVEsQ0FBQ1EsT0FBVCxDQUFpQixVQUFBQyxJQUFJLEVBQUk7QUFDckIsWUFBSUMsT0FBTyxHQUFHLEVBQWQ7O0FBQ0EsWUFBSUQsSUFBSSxDQUFDQSxJQUFMLEtBQWNFLFNBQWxCLEVBQTZCO0FBQ3pCRCxVQUFBQSxPQUFPLGFBQU1ELElBQUksQ0FBQ0csUUFBWCxjQUF1QkgsSUFBSSxDQUFDQSxJQUE1QixDQUFQO0FBQ0gsU0FGRCxNQUVPLElBQUlBLElBQUksQ0FBQ0ksS0FBVCxFQUFnQjtBQUNuQkgsVUFBQUEsT0FBTyxhQUFNRCxJQUFJLENBQUNHLFFBQVgsY0FBdUJILElBQUksQ0FBQ0ksS0FBNUIsQ0FBUDtBQUNILFNBRk0sTUFFQSxJQUFJSixJQUFJLENBQUNHLFFBQUwsS0FBa0IsTUFBdEIsRUFBOEI7QUFDakNGLFVBQUFBLE9BQU8sR0FBRyxNQUFWO0FBQ0g7O0FBRUQsWUFBSUQsSUFBSSxDQUFDSyxXQUFMLElBQW9CLENBQUNMLElBQUksQ0FBQ0ssV0FBTCxDQUFpQkMsVUFBakIsQ0FBNEIsS0FBNUIsQ0FBekIsRUFBNkQ7QUFDekRMLFVBQUFBLE9BQU8saUJBQVVELElBQUksQ0FBQ0ssV0FBZixDQUFQO0FBQ0gsU0FGRCxNQUVPLElBQUlMLElBQUksQ0FBQ0ssV0FBTCxJQUFvQlYsZUFBZSxDQUFDSyxJQUFJLENBQUNLLFdBQU4sQ0FBdkMsRUFBMkQ7QUFDOURKLFVBQUFBLE9BQU8saUJBQVVOLGVBQWUsQ0FBQ0ssSUFBSSxDQUFDSyxXQUFOLENBQXpCLENBQVA7QUFDSDs7QUFFRFosUUFBQUEsT0FBTyxrQkFBV1EsT0FBWCxVQUFQO0FBQ0gsT0FqQkQ7QUFtQkFSLE1BQUFBLE9BQU8sSUFBSSxPQUFYO0FBQ0gsS0FqQzRGLENBbUM3Rjs7O0FBQ0FBLElBQUFBLE9BQU8sc0NBQVA7O0FBRUEsUUFBSUosUUFBUSxJQUFJQyxTQUFoQixFQUEyQjtBQUN2QjtBQUNBRyxNQUFBQSxPQUFPLHdDQUFQO0FBQ0FBLE1BQUFBLE9BQU8sNkNBQW9DRSxlQUFlLENBQUNZLHVCQUFwRCxDQUFQO0FBQ0FkLE1BQUFBLE9BQU8sWUFBUDtBQUNBQSxNQUFBQSxPQUFPLHlCQUFrQkUsZUFBZSxDQUFDYSx1QkFBbEMsbUJBQVA7QUFDQWYsTUFBQUEsT0FBTyxJQUFJLDBCQUFYOztBQUVBLFVBQUlELGNBQUosRUFBb0I7QUFDaEJDLFFBQUFBLE9BQU8seUZBQVA7QUFDQUEsUUFBQUEsT0FBTywwQ0FBaUNFLGVBQWUsQ0FBQ2MsY0FBakQsQ0FBUDtBQUNBaEIsUUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDSDs7QUFFREEsTUFBQUEsT0FBTyxJQUFJLDZDQUFYOztBQUVBLFVBQUlGLFFBQVEsSUFBSUEsUUFBUSxDQUFDTSxNQUFULEdBQWtCLENBQWxDLEVBQXFDO0FBQ2pDTixRQUFBQSxRQUFRLENBQUNRLE9BQVQsQ0FBaUIsVUFBQUMsSUFBSSxFQUFJO0FBQ3JCLGNBQU1VLGNBQWMsR0FBR3ZCLE1BQU0sS0FBSyxPQUFYLEdBQXFCLFFBQXJCLEdBQWdDLE1BQXZEOztBQUVBLGNBQUlhLElBQUksQ0FBQ0csUUFBTCxLQUFrQixNQUF0QixFQUE4QjtBQUMxQlYsWUFBQUEsT0FBTyx5Q0FBa0NMLE9BQWxDLHlCQUF3RHNCLGNBQXhELE9BQVA7QUFDSCxXQUZELE1BRU8sSUFBSVYsSUFBSSxDQUFDQSxJQUFMLEtBQWNFLFNBQWQsSUFBMkJGLElBQUksQ0FBQ0EsSUFBTCxLQUFjLENBQTdDLEVBQWdEO0FBQ25EUCxZQUFBQSxPQUFPLHlDQUFrQ0wsT0FBbEMsaUJBQWdEWSxJQUFJLENBQUNHLFFBQUwsQ0FBY1AsV0FBZCxFQUFoRCxzQkFBdUZJLElBQUksQ0FBQ0EsSUFBNUYsaUJBQXVHVSxjQUF2RyxPQUFQO0FBQ0gsV0FGTSxNQUVBLElBQUlWLElBQUksQ0FBQ0ksS0FBVCxFQUFnQjtBQUNuQixvQ0FBbUJKLElBQUksQ0FBQ0ksS0FBTCxDQUFXTyxLQUFYLENBQWlCLEdBQWpCLENBQW5CO0FBQUE7QUFBQSxnQkFBT0MsSUFBUDtBQUFBLGdCQUFhQyxFQUFiOztBQUNBcEIsWUFBQUEsT0FBTyx5Q0FBa0NMLE9BQWxDLGlCQUFnRFksSUFBSSxDQUFDRyxRQUFMLENBQWNQLFdBQWQsRUFBaEQsc0JBQXVGZ0IsSUFBdkYsY0FBK0ZDLEVBQS9GLGlCQUF3R0gsY0FBeEcsT0FBUDtBQUNIO0FBQ0osU0FYRDtBQVlIOztBQUVEakIsTUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDQUEsTUFBQUEsT0FBTyxJQUFJLFFBQVg7QUFDSCxLQWpDRCxNQWlDTyxJQUFJSixRQUFKLEVBQWM7QUFDakI7QUFDQSxVQUFJRixNQUFNLEtBQUssT0FBZixFQUF3QjtBQUNwQk0sUUFBQUEsT0FBTyxpQkFBVUUsZUFBZSxDQUFDbUIseUJBQTFCLHNCQUErRDFCLE9BQS9ELGtCQUFQO0FBQ0gsT0FGRCxNQUVPO0FBQ0hLLFFBQUFBLE9BQU8saUJBQVVFLGVBQWUsQ0FBQ29CLHlCQUExQixzQkFBK0QzQixPQUEvRCxrQkFBUDtBQUNIO0FBQ0osS0FQTSxNQU9BO0FBQ0g7QUFDQUssTUFBQUEsT0FBTyx5QkFBa0JFLGVBQWUsQ0FBQ3FCLHVCQUFsQyxtQkFBUDtBQUNBdkIsTUFBQUEsT0FBTyxJQUFJLDBCQUFYO0FBQ0FBLE1BQUFBLE9BQU8sSUFBSSw2Q0FBWDs7QUFFQSxVQUFJRixRQUFRLElBQUlBLFFBQVEsQ0FBQ00sTUFBVCxHQUFrQixDQUFsQyxFQUFxQztBQUNqQ04sUUFBQUEsUUFBUSxDQUFDUSxPQUFULENBQWlCLFVBQUFDLElBQUksRUFBSTtBQUNyQixjQUFNVSxjQUFjLEdBQUd2QixNQUFNLEtBQUssT0FBWCxHQUFxQixRQUFyQixHQUFnQyxNQUF2RDs7QUFFQSxjQUFJYSxJQUFJLENBQUNHLFFBQUwsS0FBa0IsTUFBdEIsRUFBOEI7QUFDMUJWLFlBQUFBLE9BQU8sbUNBQTRCTCxPQUE1Qix5QkFBa0RzQixjQUFsRCxPQUFQO0FBQ0gsV0FGRCxNQUVPLElBQUlWLElBQUksQ0FBQ0EsSUFBTCxLQUFjRSxTQUFkLElBQTJCRixJQUFJLENBQUNBLElBQUwsS0FBYyxDQUE3QyxFQUFnRDtBQUNuRFAsWUFBQUEsT0FBTyxtQ0FBNEJMLE9BQTVCLGlCQUEwQ1ksSUFBSSxDQUFDRyxRQUFMLENBQWNQLFdBQWQsRUFBMUMsc0JBQWlGSSxJQUFJLENBQUNBLElBQXRGLGlCQUFpR1UsY0FBakcsT0FBUDtBQUNILFdBRk0sTUFFQSxJQUFJVixJQUFJLENBQUNJLEtBQVQsRUFBZ0I7QUFDbkIscUNBQW1CSixJQUFJLENBQUNJLEtBQUwsQ0FBV08sS0FBWCxDQUFpQixHQUFqQixDQUFuQjtBQUFBO0FBQUEsZ0JBQU9DLElBQVA7QUFBQSxnQkFBYUMsRUFBYjs7QUFDQXBCLFlBQUFBLE9BQU8sbUNBQTRCTCxPQUE1QixpQkFBMENZLElBQUksQ0FBQ0csUUFBTCxDQUFjUCxXQUFkLEVBQTFDLHNCQUFpRmdCLElBQWpGLGNBQXlGQyxFQUF6RixpQkFBa0dILGNBQWxHLE9BQVA7QUFDSDtBQUNKLFNBWEQ7QUFZSDs7QUFFRGpCLE1BQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0FBLE1BQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0g7O0FBRURBLElBQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0EsV0FBT0EsT0FBUDtBQUNILEdBckhvQjs7QUF1SHJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXdCLEVBQUFBLGlCQTVIcUIsNkJBNEhIQyxRQTVIRyxFQTRIT0MsT0E1SFAsRUE0SGdCO0FBQ2pDLFFBQU1DLFFBQVEsR0FBRztBQUNiQyxNQUFBQSxRQUFRLEVBQUUsWUFERztBQUViQyxNQUFBQSxTQUFTLEVBQUUsSUFGRTtBQUdiQyxNQUFBQSxLQUFLLEVBQUU7QUFDSEMsUUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSEMsUUFBQUEsSUFBSSxFQUFFO0FBRkgsT0FITTtBQU9iQyxNQUFBQSxTQUFTLEVBQUU7QUFQRSxLQUFqQjtBQVVBLFFBQU1DLFFBQVEsR0FBR0MsQ0FBQyxDQUFDQyxNQUFGLENBQVMsRUFBVCxFQUFhVCxRQUFiLEVBQXVCRCxPQUF2QixDQUFqQjs7QUFFQSxRQUFJUSxRQUFRLENBQUNHLE1BQWIsRUFBcUI7QUFDakIsVUFBTUMsY0FBYyxHQUFHSixRQUFRLENBQUNHLE1BQWhDOztBQUNBSCxNQUFBQSxRQUFRLENBQUNHLE1BQVQsR0FBa0IsWUFBVztBQUN6QkMsUUFBQUEsY0FBYyxDQUFDQyxJQUFmLENBQW9CLElBQXBCLEVBRHlCLENBRXpCOztBQUNBQyxRQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiTCxVQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CTSxHQUFuQixDQUF1QixPQUF2QixFQUFnQ0MsRUFBaEMsQ0FBbUMsT0FBbkMsRUFBNENuRCxnQkFBZ0IsQ0FBQ29ELGVBQTdEO0FBQ0gsU0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdILE9BTkQ7QUFPSCxLQVRELE1BU087QUFDSFQsTUFBQUEsUUFBUSxDQUFDRyxNQUFULEdBQWtCLFlBQVc7QUFDekJHLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JMLFVBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJNLEdBQW5CLENBQXVCLE9BQXZCLEVBQWdDQyxFQUFoQyxDQUFtQyxPQUFuQyxFQUE0Q25ELGdCQUFnQixDQUFDb0QsZUFBN0Q7QUFDSCxTQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0gsT0FKRDtBQUtILEtBNUJnQyxDQThCakM7OztBQUNBLFFBQUlsQixRQUFRLENBQUNtQixFQUFULENBQVksNENBQVosS0FBNkRuQixRQUFRLENBQUNvQixPQUFULENBQWlCLE9BQWpCLEVBQTBCekMsTUFBMUIsR0FBbUMsQ0FBcEcsRUFBdUc7QUFDbkc7QUFDQThCLE1BQUFBLFFBQVEsQ0FBQ1EsRUFBVCxHQUFjLFFBQWQ7QUFDQWpCLE1BQUFBLFFBQVEsQ0FBQ3FCLEtBQVQsQ0FBZVosUUFBZixFQUhtRyxDQUtuRzs7QUFDQVQsTUFBQUEsUUFBUSxDQUFDZ0IsR0FBVCxDQUFhLHFCQUFiLEVBQW9DQyxFQUFwQyxDQUF1QyxxQkFBdkMsRUFBOEQsVUFBU0ssQ0FBVCxFQUFZO0FBQ3RFQSxRQUFBQSxDQUFDLENBQUNDLGVBQUY7QUFDQUQsUUFBQUEsQ0FBQyxDQUFDRSxjQUFGO0FBQ0FkLFFBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUVcsS0FBUixDQUFjLFFBQWQ7QUFDSCxPQUpEO0FBS0gsS0FYRCxNQVdPO0FBQ0g7QUFDQXJCLE1BQUFBLFFBQVEsQ0FBQ3FCLEtBQVQsQ0FBZVosUUFBZjtBQUNIO0FBQ0osR0ExS29COztBQTRLckI7QUFDSjtBQUNBO0FBQ0lTLEVBQUFBLGVBL0txQiwyQkErS0xJLENBL0tLLEVBK0tGO0FBQ2ZBLElBQUFBLENBQUMsQ0FBQ0UsY0FBRjtBQUNBLFFBQU1DLE1BQU0sR0FBR2YsQ0FBQyxDQUFDWSxDQUFDLENBQUNJLGFBQUgsQ0FBaEI7QUFDQSxRQUFNQyxJQUFJLEdBQUdGLE1BQU0sQ0FBQ0csUUFBUCxDQUFnQixLQUFoQixDQUFiO0FBQ0EsUUFBTUMsSUFBSSxHQUFHRixJQUFJLENBQUNFLElBQUwsRUFBYixDQUplLENBTWY7O0FBQ0EsUUFBTUMsS0FBSyxHQUFHcEIsQ0FBQyxDQUFDLFlBQUQsQ0FBZjtBQUNBQSxJQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQVVxQixNQUFWLENBQWlCRCxLQUFqQjtBQUNBQSxJQUFBQSxLQUFLLENBQUNFLEdBQU4sQ0FBVUgsSUFBVixFQUFnQkksTUFBaEI7O0FBRUEsUUFBSTtBQUNBQyxNQUFBQSxRQUFRLENBQUNDLFdBQVQsQ0FBcUIsTUFBckI7QUFDQVYsTUFBQUEsTUFBTSxDQUFDVyxJQUFQLHdDQUEwQzNELGVBQWUsQ0FBQzRELGdCQUExRDtBQUNBdEIsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYlUsUUFBQUEsTUFBTSxDQUFDVyxJQUFQLHVDQUF5QzNELGVBQWUsQ0FBQ2MsY0FBekQ7QUFDSCxPQUZTLEVBRVAsSUFGTyxDQUFWO0FBR0gsS0FORCxDQU1FLE9BQU8rQyxHQUFQLEVBQVk7QUFDVkMsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsaUJBQWQsRUFBaUNGLEdBQWpDO0FBQ0g7O0FBRURSLElBQUFBLEtBQUssQ0FBQ1csTUFBTjtBQUNILEdBck1vQjs7QUF1TXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQTdNcUIseUJBNk1QMUMsUUE3TU8sRUE2TUcyQyxVQTdNSCxFQTZNdUM7QUFBQSxRQUF4QkMsaUJBQXdCLHVFQUFKLEVBQUk7QUFDeEQsUUFBTTNDLE9BQU8sR0FBRztBQUNabUMsTUFBQUEsSUFBSSxFQUFFTyxVQURNO0FBRVp4QyxNQUFBQSxRQUFRLEVBQUUsWUFGRTtBQUdaQyxNQUFBQSxTQUFTLEVBQUUsSUFIQztBQUlaQyxNQUFBQSxLQUFLLEVBQUU7QUFDSEMsUUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSEMsUUFBQUEsSUFBSSxFQUFFO0FBRkgsT0FKSztBQVFaQyxNQUFBQSxTQUFTLEVBQUUsU0FSQztBQVNaSSxNQUFBQSxNQUFNLEVBQUUsa0JBQVc7QUFDZkcsUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYkwsVUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQk0sR0FBbkIsQ0FBdUIsT0FBdkIsRUFBZ0NDLEVBQWhDLENBQW1DLE9BQW5DLEVBQTRDbkQsZ0JBQWdCLENBQUNvRCxlQUE3RDtBQUNILFNBRlMsRUFFUCxHQUZPLENBQVY7QUFHSDtBQWJXLEtBQWhCLENBRHdELENBaUJ4RDs7QUFDQVIsSUFBQUEsQ0FBQyxDQUFDQyxNQUFGLENBQVNWLE9BQVQsRUFBa0IyQyxpQkFBbEI7QUFFQTVDLElBQUFBLFFBQVEsQ0FBQ3FCLEtBQVQsQ0FBZSxTQUFmO0FBQ0FyQixJQUFBQSxRQUFRLENBQUNxQixLQUFULENBQWVwQixPQUFmO0FBQ0gsR0FuT29COztBQXFPckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTRDLEVBQUFBLDhCQTVPcUIsMENBNE9VQyxJQTVPVixFQTRPZ0I1RSxPQTVPaEIsRUE0T3lCNkUsU0E1T3pCLEVBNE9vQztBQUNyRCxRQUFJeEUsT0FBTyxHQUFHLHVCQUFkOztBQUVBLFFBQUl1RSxJQUFJLEtBQUssZ0JBQWIsRUFBK0I7QUFDM0I7QUFDQXZFLE1BQUFBLE9BQU8sdUNBQThCRSxlQUFlLENBQUN1RSxlQUE5QyxlQUFQO0FBQ0F6RSxNQUFBQSxPQUFPLHNDQUFQLENBSDJCLENBSzNCOztBQUNBQSxNQUFBQSxPQUFPLGlCQUFVRSxlQUFlLENBQUN3RSxzQkFBMUIsU0FBUCxDQU4yQixDQVEzQjs7QUFDQTFFLE1BQUFBLE9BQU8sc0NBQVA7QUFDQUEsTUFBQUEsT0FBTyx5QkFBa0JFLGVBQWUsQ0FBQ3lFLFNBQWxDLG1CQUFQOztBQUVBLFVBQUlILFNBQUosRUFBZTtBQUNYeEUsUUFBQUEsT0FBTyxnQ0FBUDtBQUNBQSxRQUFBQSxPQUFPLHNEQUE2Q0UsZUFBZSxDQUFDMEUscUJBQTdELHNCQUE4RmpGLE9BQTlGLGNBQVA7QUFDQUssUUFBQUEsT0FBTyxZQUFQO0FBQ0FBLFFBQUFBLE9BQU8sc0NBQVA7QUFDQUEsUUFBQUEsT0FBTyw2Q0FBb0NFLGVBQWUsQ0FBQzJFLGtCQUFwRCxDQUFQO0FBQ0E3RSxRQUFBQSxPQUFPLFVBQVA7QUFDSCxPQVBELE1BT087QUFDSEEsUUFBQUEsT0FBTyxpQkFBVUUsZUFBZSxDQUFDNEUsc0JBQTFCLHNCQUE0RG5GLE9BQTVELHVCQUFnRk8sZUFBZSxDQUFDNkUsc0JBQWhHLFNBQVA7QUFDSDtBQUVKLEtBdkJELE1BdUJPLElBQUlSLElBQUksS0FBSyxlQUFiLEVBQThCO0FBQ2pDO0FBQ0F2RSxNQUFBQSxPQUFPLHVDQUE4QkUsZUFBZSxDQUFDOEUsbUJBQTlDLGVBQVA7QUFDQWhGLE1BQUFBLE9BQU8sc0NBQVAsQ0FIaUMsQ0FLakM7O0FBQ0FBLE1BQUFBLE9BQU8saUJBQVVFLGVBQWUsQ0FBQytFLHNCQUExQixTQUFQLENBTmlDLENBUWpDOztBQUNBakYsTUFBQUEsT0FBTyxzQ0FBUDtBQUNBQSxNQUFBQSxPQUFPLHlCQUFrQkUsZUFBZSxDQUFDeUUsU0FBbEMsbUJBQVA7O0FBRUEsVUFBSUgsU0FBSixFQUFlO0FBQ1h4RSxRQUFBQSxPQUFPLGdDQUFQO0FBQ0FBLFFBQUFBLE9BQU8sNEJBQVA7QUFDQUEsUUFBQUEsT0FBTywrQ0FBc0NFLGVBQWUsQ0FBQ2dGLG1CQUF0RCxVQUFQO0FBQ0FsRixRQUFBQSxPQUFPLCtDQUFzQ0UsZUFBZSxDQUFDaUYscUJBQXRELFVBQVA7QUFDQW5GLFFBQUFBLE9BQU8sK0NBQXNDRSxlQUFlLENBQUNrRix3QkFBdEQsVUFBUDtBQUNBcEYsUUFBQUEsT0FBTyxXQUFQO0FBQ0FBLFFBQUFBLE9BQU8sWUFBUDtBQUNILE9BUkQsTUFRTztBQUNIQSxRQUFBQSxPQUFPLGlCQUFVRSxlQUFlLENBQUNtRixjQUExQixzQkFBb0QxRixPQUFwRCx1QkFBd0VPLGVBQWUsQ0FBQ29GLDBCQUF4RixTQUFQO0FBQ0g7QUFDSjs7QUFFRHRGLElBQUFBLE9BQU8sSUFBSSxRQUFYO0FBQ0EsV0FBT0EsT0FBUDtBQUNIO0FBalNvQixDQUF6QiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBVbmlmaWVkIHRvb2x0aXAgZ2VuZXJhdG9yIGZvciBmaXJld2FsbCBydWxlc1xuICogQG1vZHVsZSBmaXJld2FsbFRvb2x0aXBzXG4gKi9cbmNvbnN0IGZpcmV3YWxsVG9vbHRpcHMgPSB7XG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgdG9vbHRpcCBjb250ZW50IGJhc2VkIG9uIHNlcnZpY2UsIGFjdGlvbiBhbmQgY29udGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2aWNlIC0gU2VydmljZSBjYXRlZ29yeSBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIEN1cnJlbnQgYWN0aW9uIChhbGxvdy9ibG9jaylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV0d29yayAtIE5ldHdvcmsgYWRkcmVzcyB3aXRoIHN1Ym5ldFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0xpbWl0ZWQgLSBXaGV0aGVyIHNlcnZpY2UgaXMgbGltaXRlZCBpbiBEb2NrZXJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcG9ydEluZm8gLSBQb3J0IGluZm9ybWF0aW9uIGZvciB0aGUgc2VydmljZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc2hvd0NvcHlCdXR0b24gLSBXaGV0aGVyIHRvIHNob3cgY29weSBidXR0b25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUNvbnRlbnQoc2VydmljZSwgYWN0aW9uLCBuZXR3b3JrLCBpc0RvY2tlciwgaXNMaW1pdGVkLCBwb3J0SW5mbywgc2hvd0NvcHlCdXR0b24gPSBmYWxzZSkge1xuICAgICAgICBsZXQgY29udGVudCA9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXJ2aWNlIG5hbWUgaGVhZGVyXG4gICAgICAgIGNvbnN0IHNlcnZpY2VEZXNjcmlwdGlvbiA9IGdsb2JhbFRyYW5zbGF0ZVtgZndfJHtzZXJ2aWNlLnRvTG93ZXJDYXNlKCl9RGVzY3JpcHRpb25gXSB8fCBzZXJ2aWNlO1xuICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PGI+JHtzZXJ2aWNlRGVzY3JpcHRpb259PC9iPjwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICAvLyBQb3J0IGluZm9ybWF0aW9uXG4gICAgICAgIGlmIChwb3J0SW5mbyAmJiBwb3J0SW5mby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD48c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X1NlcnZpY2VQb3J0c0luZm99Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHBvcnRTdHIgPSAnJztcbiAgICAgICAgICAgICAgICBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciA9IGAke3BvcnQucHJvdG9jb2x9ICR7cG9ydC5wb3J0fWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgPSBgJHtwb3J0LnByb3RvY29sfSAke3BvcnQucmFuZ2V9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyID0gJ0lDTVAnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAocG9ydC5kZXNjcmlwdGlvbiAmJiAhcG9ydC5kZXNjcmlwdGlvbi5zdGFydHNXaXRoKCdmd18nKSkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyICs9IGAgLSAke3BvcnQuZGVzY3JpcHRpb259YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQuZGVzY3JpcHRpb24gJiYgZ2xvYmFsVHJhbnNsYXRlW3BvcnQuZGVzY3JpcHRpb25dKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgKz0gYCAtICR7Z2xvYmFsVHJhbnNsYXRlW3BvcnQuZGVzY3JpcHRpb25dfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT4ke3BvcnRTdHJ9PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udGV4dC1zcGVjaWZpYyBjb250ZW50XG4gICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIGlmIChpc0RvY2tlciAmJiBpc0xpbWl0ZWQpIHtcbiAgICAgICAgICAgIC8vIERvY2tlciBsaW1pdGVkIHNlcnZpY2UgLSBhbHdheXMgc2hvdyBob3N0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJ3YXJuaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0RvY2tlckxpbWl0ZWRTZXJ2aWNlfWA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19Eb2NrZXJDb25maWd1cmVSdWxlc306PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzaG93Q29weUJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSB0b3AgcmlnaHQgYXR0YWNoZWQgbGFiZWwgY29weS1jb21tYW5kXCIgc3R5bGU9XCJjdXJzb3I6IHBvaW50ZXI7XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8aSBjbGFzcz1cImNvcHkgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQ29weUNvbW1hbmR9YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8cHJlIHN0eWxlPVwiZm9udC1zaXplOiAwLjg1ZW07IG1hcmdpbjogMDtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocG9ydEluZm8gJiYgcG9ydEluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHBvcnRJbmZvLmZvckVhY2gocG9ydCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlwdGFibGVzQWN0aW9uID0gYWN0aW9uID09PSAnYWxsb3cnID8gJ0FDQ0VQVCcgOiAnRFJPUCc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAocG9ydC5wcm90b2NvbCA9PT0gJ0lDTVAnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wIGljbXAgLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucG9ydCAhPT0gdW5kZWZpbmVkICYmIHBvcnQucG9ydCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgRE9DS0VSLVVTRVIgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke3BvcnQucG9ydH0gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IFtmcm9tLCB0b10gPSBwb3J0LnJhbmdlLnNwbGl0KCctJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7ZnJvbX06JHt0b30gLWogJHtpcHRhYmxlc0FjdGlvbn1cXG5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvcHJlPic7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L2Rpdj4nO1xuICAgICAgICB9IGVsc2UgaWYgKGlzRG9ja2VyKSB7XG4gICAgICAgICAgICAvLyBEb2NrZXIgc3VwcG9ydGVkIHNlcnZpY2UgLSBqdXN0IGluZm9ybWF0aW9uXG4gICAgICAgICAgICBpZiAoYWN0aW9uID09PSAnYWxsb3cnKSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfQWNjZXNzQWxsb3dlZEZvclN1Ym5ldH0gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FjY2Vzc0Jsb2NrZWRGb3JTdWJuZXR9IDxzdHJvbmc+JHtuZXR3b3JrfTwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gUmVndWxhciBlbnZpcm9ubWVudCAtIHNob3cgaXB0YWJsZXMgcnVsZXNcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfSXB0YWJsZXNSdWxlc0FwcGxpZWR9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj4nO1xuICAgICAgICAgICAgY29udGVudCArPSAnPHByZSBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBtYXJnaW46IDA7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBvcnRJbmZvICYmIHBvcnRJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwb3J0SW5mby5mb3JFYWNoKHBvcnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpcHRhYmxlc0FjdGlvbiA9IGFjdGlvbiA9PT0gJ2FsbG93JyA/ICdBQ0NFUFQnIDogJ0RST1AnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgSU5QVVQgLXMgJHtuZXR3b3JrfSAtcCBpY21wIC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnBvcnQgIT09IHVuZGVmaW5lZCAmJiBwb3J0LnBvcnQgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtwb3J0LnBvcnR9IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbZnJvbSwgdG9dID0gcG9ydC5yYW5nZS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgSU5QVVQgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke2Zyb219OiR7dG99IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L3ByZT4nO1xuICAgICAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXAgb24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIGpRdWVyeSBlbGVtZW50IHRvIGF0dGFjaCB0b29sdGlwIHRvXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBUb29sdGlwIG9wdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcCgkZWxlbWVudCwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSAkLmV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNldHRpbmdzLm9uU2hvdykge1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxPblNob3cgPSBzZXR0aW5ncy5vblNob3c7XG4gICAgICAgICAgICBzZXR0aW5ncy5vblNob3cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE9uU2hvdy5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgY29weSBidXR0b25zIGFmdGVyIHBvcHVwIGlzIHNob3duXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBlbGVtZW50IGlzIGFuIGljb24gaW5zaWRlIGEgbGFiZWwgKGZvciBjaGVja2JveCB0b2dnbGUgcHJldmVudGlvbilcbiAgICAgICAgaWYgKCRlbGVtZW50LmlzKCcuc3BlY2lhbC1jaGVja2JveC1pbmZvLCAuc2VydmljZS1pbmZvLWljb24nKSAmJiAkZWxlbWVudC5jbG9zZXN0KCdsYWJlbCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFVzZSBtYW51YWwgY29udHJvbCBmb3IgaWNvbnMgaW5zaWRlIGxhYmVsc1xuICAgICAgICAgICAgc2V0dGluZ3Mub24gPSAnbWFudWFsJztcbiAgICAgICAgICAgICRlbGVtZW50LnBvcHVwKHNldHRpbmdzKTtcblxuICAgICAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gc2hvdyBwb3B1cCBhbmQgcHJldmVudCBjaGVja2JveCB0b2dnbGVcbiAgICAgICAgICAgICRlbGVtZW50Lm9mZignY2xpY2sucG9wdXAtdHJpZ2dlcicpLm9uKCdjbGljay5wb3B1cC10cmlnZ2VyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQodGhpcykucG9wdXAoJ3RvZ2dsZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZWd1bGFyIHBvcHVwIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAkZWxlbWVudC5wb3B1cChzZXR0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvcHkgY29tbWFuZCB0byBjbGlwYm9hcmRcbiAgICAgKi9cbiAgICBjb3B5VG9DbGlwYm9hcmQoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRsYWJlbCA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgY29uc3QgJHByZSA9ICRsYWJlbC5zaWJsaW5ncygncHJlJyk7XG4gICAgICAgIGNvbnN0IHRleHQgPSAkcHJlLnRleHQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wb3JhcnkgdGV4dGFyZWFcbiAgICAgICAgY29uc3QgJHRlbXAgPSAkKCc8dGV4dGFyZWE+Jyk7XG4gICAgICAgICQoJ2JvZHknKS5hcHBlbmQoJHRlbXApO1xuICAgICAgICAkdGVtcC52YWwodGV4dCkuc2VsZWN0KCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKTtcbiAgICAgICAgICAgICRsYWJlbC5odG1sKGA8aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0NvbW1hbmRDb3BpZWR9YCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkbGFiZWwuaHRtbChgPGkgY2xhc3M9XCJjb3B5IGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0NvcHlDb21tYW5kfWApO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHk6JywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJHRlbXAucmVtb3ZlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0gRWxlbWVudCB3aXRoIHRvb2x0aXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Q29udGVudCAtIE5ldyBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gYWRkaXRpb25hbE9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgdG8gbWVyZ2VcbiAgICAgKi9cbiAgICB1cGRhdGVDb250ZW50KCRlbGVtZW50LCBuZXdDb250ZW50LCBhZGRpdGlvbmFsT3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICBodG1sOiBuZXdDb250ZW50LFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnLFxuICAgICAgICAgICAgb25TaG93OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLmNvcHktY29tbWFuZCcpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmaXJld2FsbFRvb2x0aXBzLmNvcHlUb0NsaXBib2FyZCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIGFkZGl0aW9uYWwgb3B0aW9uc1xuICAgICAgICAkLmV4dGVuZChvcHRpb25zLCBhZGRpdGlvbmFsT3B0aW9ucyk7XG4gICAgICAgIFxuICAgICAgICAkZWxlbWVudC5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAkZWxlbWVudC5wb3B1cChvcHRpb25zKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCBmb3Igc3BlY2lhbCBjaGVja2JveGVzIChuZXdlcl9ibG9ja19pcCBhbmQgbG9jYWxfbmV0d29yaylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFR5cGUgb2YgY2hlY2tib3ggKCduZXdlcl9ibG9ja19pcCcgb3IgJ2xvY2FsX25ldHdvcmsnKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXR3b3JrIC0gTmV0d29yayBhZGRyZXNzIHdpdGggc3VibmV0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0NoZWNrZWQgLSBXaGV0aGVyIGNoZWNrYm94IGlzIGNoZWNrZWRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQodHlwZSwgbmV0d29yaywgaXNDaGVja2VkKSB7XG4gICAgICAgIGxldCBjb250ZW50ID0gJzxkaXYgY2xhc3M9XCJjb250ZW50XCI+JztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlID09PSAnbmV3ZXJfYmxvY2tfaXAnKSB7XG4gICAgICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48Yj4ke2dsb2JhbFRyYW5zbGF0ZS5md19OZXdlckJsb2NrSXB9PC9iPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19OZXdlckJsb2NrSXBUb29sdGlwfTwvcD5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFZmZlY3RcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfRWZmZWN0fTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8aSBjbGFzcz1cInNoaWVsZCBhbHRlcm5hdGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfRmFpbDJiYW5XaWxsSWdub3JlfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHAgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxpIGNsYXNzPVwid2FybmluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19TZWN1cml0eVdhcm5pbmd9YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8L3A+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfRmFpbDJiYW5XaWxsTW9uaXRvcn0gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0FmdGVyRmFpbGVkQXR0ZW1wdHN9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnbG9jYWxfbmV0d29yaycpIHtcbiAgICAgICAgICAgIC8vIEhlYWRlclxuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxiPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0l0SXNMb2NhbE5ldHdvcmt9PC9iPjwvZGl2PmA7XG4gICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PmA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19Mb2NhbE5ldHdvcmtUb29sdGlwfTwvcD5gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFZmZlY3RcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+YDtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPjxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUuZndfRWZmZWN0fTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+PGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19EaXJlY3RTSVBSb3V0aW5nfTwvbGk+YDtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8bGk+PGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Ob0NvbnRhY3RSZXdyaXRpbmd9PC9saT5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxsaT48aSBjbGFzcz1cImNoZWNrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0xvY2FsQWRkcmVzc0RldGVjdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPC91bD5gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmZ3X05BVEhhbmRsaW5nfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz4gJHtnbG9iYWxUcmFuc2xhdGUuZndfV2lsbEJlSGFuZGxlZEFzRXh0ZXJuYWx9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBjb250ZW50O1xuICAgIH1cbn07Il19