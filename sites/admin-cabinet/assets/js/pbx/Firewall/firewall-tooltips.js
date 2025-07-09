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
      content += "<p><strong>".concat(globalTranslate.fw_ConfigureOnHost || 'Configure rules on Docker host', ":</strong></p>");
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
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC10b29sdGlwcy5qcyJdLCJuYW1lcyI6WyJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50Iiwic2VydmljZSIsImFjdGlvbiIsIm5ldHdvcmsiLCJpc0RvY2tlciIsImlzTGltaXRlZCIsInBvcnRJbmZvIiwic2hvd0NvcHlCdXR0b24iLCJjb250ZW50Iiwic2VydmljZURlc2NyaXB0aW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwidG9Mb3dlckNhc2UiLCJsZW5ndGgiLCJmd19TZXJ2aWNlUG9ydHNJbmZvIiwiZm9yRWFjaCIsInBvcnQiLCJwb3J0U3RyIiwidW5kZWZpbmVkIiwicHJvdG9jb2wiLCJyYW5nZSIsImRlc2NyaXB0aW9uIiwic3RhcnRzV2l0aCIsImZ3X0NvbmZpZ3VyZU9uSG9zdCIsImZ3X0NvcHlDb21tYW5kIiwiaXB0YWJsZXNBY3Rpb24iLCJzcGxpdCIsImZyb20iLCJ0byIsImZ3X0FjY2Vzc0FsbG93ZWRGb3JTdWJuZXQiLCJmd19BY2Nlc3NCbG9ja2VkRm9yU3VibmV0IiwiZndfSXB0YWJsZXNSdWxlc0FwcGxpZWQiLCJpbml0aWFsaXplVG9vbHRpcCIsIiRlbGVtZW50Iiwib3B0aW9ucyIsImRlZmF1bHRzIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInNob3ciLCJoaWRlIiwidmFyaWF0aW9uIiwic2V0dGluZ3MiLCIkIiwiZXh0ZW5kIiwib25TaG93Iiwib3JpZ2luYWxPblNob3ciLCJjYWxsIiwic2V0VGltZW91dCIsIm9mZiIsIm9uIiwiY29weVRvQ2xpcGJvYXJkIiwicG9wdXAiLCJlIiwicHJldmVudERlZmF1bHQiLCIkbGFiZWwiLCJjdXJyZW50VGFyZ2V0IiwiJHByZSIsInNpYmxpbmdzIiwidGV4dCIsIiR0ZW1wIiwiYXBwZW5kIiwidmFsIiwic2VsZWN0IiwiZG9jdW1lbnQiLCJleGVjQ29tbWFuZCIsImh0bWwiLCJmd19Db21tYW5kQ29waWVkIiwi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QTlFO0FBQ0FuQixNQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNiTyxRQUFBQSxNQUFNLENBQUNXLElBQVAsdUNBQXlDdkQsZUFBZSxDQUFDYSxjQUFoQixJQUFrQyxNQUEzRTtBQUNILE9BRlMsRUFFUCxJQUZPLENBQVY7QUFHSCxLQU5ELENBTUUsT0FBTzRDLEdBQVAsRUFBWTtBQUNWQyxNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxpQkFBZCxFQUFpQ0YsR0FBakM7QUFDSDs7QUFFRFIsSUFBQUEsS0FBSyxDQUFDVyxNQUFOO0FBQ0gsR0FuTG9COztBQXFMckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQTFMcUIseUJBMExQdkMsUUExTE8sRUEwTEd3QyxVQTFMSCxFQTBMZTtBQUNoQ3hDLElBQUFBLFFBQVEsQ0FBQ21CLEtBQVQsQ0FBZSxTQUFmO0FBQ0FuQixJQUFBQSxRQUFRLENBQUNtQixLQUFULENBQWU7QUFDWGMsTUFBQUEsSUFBSSxFQUFFTyxVQURLO0FBRVhyQyxNQUFBQSxRQUFRLEVBQUUsWUFGQztBQUdYQyxNQUFBQSxTQUFTLEVBQUUsSUFIQTtBQUlYQyxNQUFBQSxLQUFLLEVBQUU7QUFDSEMsUUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSEMsUUFBQUEsSUFBSSxFQUFFO0FBRkgsT0FKSTtBQVFYQyxNQUFBQSxTQUFTLEVBQUUsU0FSQTtBQVNYSSxNQUFBQSxNQUFNLEVBQUUsa0JBQVc7QUFDZkcsUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYkwsVUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQk0sR0FBbkIsQ0FBdUIsT0FBdkIsRUFBZ0NDLEVBQWhDLENBQW1DLE9BQW5DLEVBQTRDbEQsZ0JBQWdCLENBQUNtRCxlQUE3RDtBQUNILFNBRlMsRUFFUCxHQUZPLENBQVY7QUFHSDtBQWJVLEtBQWY7QUFlSDtBQTNNb0IsQ0FBekIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogVW5pZmllZCB0b29sdGlwIGdlbmVyYXRvciBmb3IgZmlyZXdhbGwgcnVsZXNcbiAqIEBtb2R1bGUgZmlyZXdhbGxUb29sdGlwc1xuICovXG5jb25zdCBmaXJld2FsbFRvb2x0aXBzID0ge1xuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIHRvb2x0aXAgY29udGVudCBiYXNlZCBvbiBzZXJ2aWNlLCBhY3Rpb24gYW5kIGNvbnRleHRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VydmljZSAtIFNlcnZpY2UgY2F0ZWdvcnkgbmFtZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBDdXJyZW50IGFjdGlvbiAoYWxsb3cvYmxvY2spXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ldHdvcmsgLSBOZXR3b3JrIGFkZHJlc3Mgd2l0aCBzdWJuZXRcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzRG9ja2VyIC0gV2hldGhlciBydW5uaW5nIGluIERvY2tlclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNMaW1pdGVkIC0gV2hldGhlciBzZXJ2aWNlIGlzIGxpbWl0ZWQgaW4gRG9ja2VyXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBvcnRJbmZvIC0gUG9ydCBpbmZvcm1hdGlvbiBmb3IgdGhlIHNlcnZpY2VcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHNob3dDb3B5QnV0dG9uIC0gV2hldGhlciB0byBzaG93IGNvcHkgYnV0dG9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICovXG4gICAgZ2VuZXJhdGVDb250ZW50KHNlcnZpY2UsIGFjdGlvbiwgbmV0d29yaywgaXNEb2NrZXIsIGlzTGltaXRlZCwgcG9ydEluZm8sIHNob3dDb3B5QnV0dG9uID0gZmFsc2UpIHtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gU2VydmljZSBuYW1lIGhlYWRlclxuICAgICAgICBjb25zdCBzZXJ2aWNlRGVzY3JpcHRpb24gPSBnbG9iYWxUcmFuc2xhdGVbYGZ3XyR7c2VydmljZS50b0xvd2VyQ2FzZSgpfURlc2NyaXB0aW9uYF0gfHwgc2VydmljZTtcbiAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxiPiR7c2VydmljZURlc2NyaXB0aW9ufTwvYj48L2Rpdj5gO1xuICAgICAgICBcbiAgICAgICAgLy8gUG9ydCBpbmZvcm1hdGlvblxuICAgICAgICBpZiAocG9ydEluZm8gJiYgcG9ydEluZm8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19TZXJ2aWNlUG9ydHNJbmZvIHx8ICdVc2VkIHBvcnRzJ306PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICBjb250ZW50ICs9ICc8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcG9ydEluZm8uZm9yRWFjaChwb3J0ID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgcG9ydFN0ciA9ICcnO1xuICAgICAgICAgICAgICAgIGlmIChwb3J0LnBvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBwb3J0U3RyID0gYCR7cG9ydC5wcm90b2NvbH0gJHtwb3J0LnBvcnR9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBvcnQucmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciA9IGAke3BvcnQucHJvdG9jb2x9ICR7cG9ydC5yYW5nZX1gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5wcm90b2NvbCA9PT0gJ0lDTVAnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgPSAnSUNNUCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChwb3J0LmRlc2NyaXB0aW9uICYmICFwb3J0LmRlc2NyaXB0aW9uLnN0YXJ0c1dpdGgoJ2Z3XycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRTdHIgKz0gYCAtICR7cG9ydC5kZXNjcmlwdGlvbn1gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5kZXNjcmlwdGlvbiAmJiBnbG9iYWxUcmFuc2xhdGVbcG9ydC5kZXNjcmlwdGlvbl0pIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydFN0ciArPSBgIC0gJHtnbG9iYWxUcmFuc2xhdGVbcG9ydC5kZXNjcmlwdGlvbl19YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGxpPiR7cG9ydFN0cn08L2xpPmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPC91bD4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDb250ZXh0LXNwZWNpZmljIGNvbnRlbnRcbiAgICAgICAgY29udGVudCArPSBgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5gO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRG9ja2VyICYmIGlzTGltaXRlZCkge1xuICAgICAgICAgICAgLy8gRG9ja2VyIGxpbWl0ZWQgc2VydmljZSAtIGFsd2F5cyBzaG93IGhvc3QgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19Db25maWd1cmVPbkhvc3QgfHwgJ0NvbmZpZ3VyZSBydWxlcyBvbiBEb2NrZXIgaG9zdCd9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc2hvd0NvcHlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIHJpZ2h0IGF0dGFjaGVkIGxhYmVsIGNvcHktY29tbWFuZFwiIHN0eWxlPVwiY3Vyc29yOiBwb2ludGVyO1wiPmA7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPGkgY2xhc3M9XCJjb3B5IGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmZ3X0NvcHlDb21tYW5kIHx8ICdDb3B5J31gO1xuICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzxwcmUgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgbWFyZ2luOiAwO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChwb3J0SW5mbyAmJiBwb3J0SW5mby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcG9ydEluZm8uZm9yRWFjaChwb3J0ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXB0YWJsZXNBY3Rpb24gPSBhY3Rpb24gPT09ICdhbGxvdycgPyAnQUNDRVBUJyA6ICdEUk9QJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIChwb3J0LnByb3RvY29sID09PSAnSUNNUCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIERPQ0tFUi1VU0VSIC1zICR7bmV0d29ya30gLXAgaWNtcCAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5wb3J0ICE9PSB1bmRlZmluZWQgJiYgcG9ydC5wb3J0ICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGBpcHRhYmxlcyAtQSBET0NLRVItVVNFUiAtcyAke25ldHdvcmt9IC1wICR7cG9ydC5wcm90b2NvbC50b0xvd2VyQ2FzZSgpfSAtLWRwb3J0ICR7cG9ydC5wb3J0fSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocG9ydC5yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgW2Zyb20sIHRvXSA9IHBvcnQucmFuZ2Uuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIERPQ0tFUi1VU0VSIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtmcm9tfToke3RvfSAtaiAke2lwdGFibGVzQWN0aW9ufVxcbmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udGVudCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIC8vIERvY2tlciBzdXBwb3J0ZWQgc2VydmljZSAtIGp1c3QgaW5mb3JtYXRpb25cbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT09ICdhbGxvdycpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ICs9IGA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5md19BY2Nlc3NBbGxvd2VkRm9yU3VibmV0IHx8ICdBY2Nlc3Mgd2lsbCBiZSBhbGxvd2VkIGZvciBzdWJuZXQnfSA8c3Ryb25nPiR7bmV0d29ya308L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGVudCArPSBgPHA+JHtnbG9iYWxUcmFuc2xhdGUuZndfQWNjZXNzQmxvY2tlZEZvclN1Ym5ldCB8fCAnQWNjZXNzIHdpbGwgYmUgYmxvY2tlZCBmb3Igc3VibmV0J30gPHN0cm9uZz4ke25ldHdvcmt9PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBSZWd1bGFyIGVudmlyb25tZW50IC0gc2hvdyBpcHRhYmxlcyBydWxlc1xuICAgICAgICAgICAgY29udGVudCArPSBgPHA+PHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5md19JcHRhYmxlc1J1bGVzQXBwbGllZCB8fCAnRm9sbG93aW5nIGlwdGFibGVzIHJ1bGVzIHdpbGwgYmUgYXBwbGllZCd9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgY29udGVudCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj4nO1xuICAgICAgICAgICAgY29udGVudCArPSAnPHByZSBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBtYXJnaW46IDA7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBvcnRJbmZvICYmIHBvcnRJbmZvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwb3J0SW5mby5mb3JFYWNoKHBvcnQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpcHRhYmxlc0FjdGlvbiA9IGFjdGlvbiA9PT0gJ2FsbG93JyA/ICdBQ0NFUFQnIDogJ0RST1AnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBvcnQucHJvdG9jb2wgPT09ICdJQ01QJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgSU5QVVQgLXMgJHtuZXR3b3JrfSAtcCBpY21wIC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnBvcnQgIT09IHVuZGVmaW5lZCAmJiBwb3J0LnBvcnQgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGlwdGFibGVzIC1BIElOUFVUIC1zICR7bmV0d29ya30gLXAgJHtwb3J0LnByb3RvY29sLnRvTG93ZXJDYXNlKCl9IC0tZHBvcnQgJHtwb3J0LnBvcnR9IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwb3J0LnJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBbZnJvbSwgdG9dID0gcG9ydC5yYW5nZS5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgaXB0YWJsZXMgLUEgSU5QVVQgLXMgJHtuZXR3b3JrfSAtcCAke3BvcnQucHJvdG9jb2wudG9Mb3dlckNhc2UoKX0gLS1kcG9ydCAke2Zyb219OiR7dG99IC1qICR7aXB0YWJsZXNBY3Rpb259XFxuYDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb250ZW50ICs9ICc8L3ByZT4nO1xuICAgICAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29udGVudCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXAgb24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZWxlbWVudCAtIGpRdWVyeSBlbGVtZW50IHRvIGF0dGFjaCB0b29sdGlwIHRvXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBUb29sdGlwIG9wdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcCgkZWxlbWVudCwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSAkLmV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHNldHRpbmdzLm9uU2hvdykge1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxPblNob3cgPSBzZXR0aW5ncy5vblNob3c7XG4gICAgICAgICAgICBzZXR0aW5ncy5vblNob3cgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBvcmlnaW5hbE9uU2hvdy5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgY29weSBidXR0b25zIGFmdGVyIHBvcHVwIGlzIHNob3duXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy5jb3B5LWNvbW1hbmQnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZmlyZXdhbGxUb29sdGlwcy5jb3B5VG9DbGlwYm9hcmQpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkZWxlbWVudC5wb3B1cChzZXR0aW5ncyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb3B5IGNvbW1hbmQgdG8gY2xpcGJvYXJkXG4gICAgICovXG4gICAgY29weVRvQ2xpcGJvYXJkKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIGNvbnN0ICRwcmUgPSAkbGFiZWwuc2libGluZ3MoJ3ByZScpO1xuICAgICAgICBjb25zdCB0ZXh0ID0gJHByZS50ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IHRleHRhcmVhXG4gICAgICAgIGNvbnN0ICR0ZW1wID0gJCgnPHRleHRhcmVhPicpO1xuICAgICAgICAkKCdib2R5JykuYXBwZW5kKCR0ZW1wKTtcbiAgICAgICAgJHRlbXAudmFsKHRleHQpLnNlbGVjdCgpO1xuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAkbGFiZWwuaHRtbChgPGkgY2xhc3M9XCJjaGVjayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5md19Db21tYW5kQ29waWVkIHx8ICdDb3BpZWQhJ31gKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRsYWJlbC5odG1sKGA8aSBjbGFzcz1cImNvcHkgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZndfQ29weUNvbW1hbmQgfHwgJ0NvcHknfWApO1xuICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHk6JywgZXJyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJHRlbXAucmVtb3ZlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRlbGVtZW50IC0gRWxlbWVudCB3aXRoIHRvb2x0aXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Q29udGVudCAtIE5ldyBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICB1cGRhdGVDb250ZW50KCRlbGVtZW50LCBuZXdDb250ZW50KSB7XG4gICAgICAgICRlbGVtZW50LnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICRlbGVtZW50LnBvcHVwKHtcbiAgICAgICAgICAgIGh0bWw6IG5ld0NvbnRlbnQsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZycsXG4gICAgICAgICAgICBvblNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcuY29weS1jb21tYW5kJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsIGZpcmV3YWxsVG9vbHRpcHMuY29weVRvQ2xpcGJvYXJkKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==