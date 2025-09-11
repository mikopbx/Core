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

/* global globalRootUrl, globalTranslate, EventBus, ExtensionsAPI */

/**
 * Extension Modify Status Monitor
 * Simplified status monitoring for extension modify page:
 * - Single API call on initialization
 * - Real-time updates via EventBus only
 * - No periodic polling
 * - Clean device list and history display
 */
var ExtensionModifyStatusMonitor = {
  channelId: 'extension-status',
  isInitialized: false,
  currentExtensionId: null,

  /**
   * jQuery objects
   */
  $statusLabel: null,
  $activeDevicesList: null,
  $deviceHistoryList: null,

  /**
   * Initialize the extension status monitor
   */
  initialize: function initialize() {
    if (this.isInitialized) {
      return;
    } // Get extension number from form


    this.currentExtensionId = this.extractExtensionId();

    if (!this.currentExtensionId) {
      return;
    } // Cache DOM elements


    this.cacheElements(); // Subscribe to EventBus for real-time updates

    this.subscribeToEvents(); // Make single initial API call

    this.loadInitialStatus();
    this.isInitialized = true;
  },

  /**
   * Extract extension ID from the form
   */
  extractExtensionId: function extractExtensionId() {
    // First, try to get the phone number from form field (primary)
    var $numberField = $('input[name="number"]');

    if ($numberField.length && $numberField.val()) {
      // Try to get unmasked value if inputmask is applied
      var extensionNumber; // Check if inputmask is available and applied to the field

      if (typeof $numberField.inputmask === 'function') {
        try {
          // Get unmasked value (only the actual input without mask characters)
          extensionNumber = $numberField.inputmask('unmaskedvalue');
        } catch (e) {
          // Fallback if inputmask method fails
          extensionNumber = $numberField.val();
        }
      } else {
        extensionNumber = $numberField.val();
      } // Clean up the value - remove any remaining mask characters like underscore


      extensionNumber = extensionNumber.replace(/[^0-9]/g, ''); // Only return if we have actual digits

      if (extensionNumber && extensionNumber.length > 0) {
        return extensionNumber;
      }
    } // Fallback to URL parameter


    var urlMatch = window.location.pathname.match(/\/extensions\/modify\/(\d+)/);

    if (urlMatch && urlMatch[1]) {
      // This is database ID, we need to wait for form to load
      // We'll get the actual extension number after form loads
      return null;
    }

    return null;
  },

  /**
   * Cache DOM elements
   */
  cacheElements: function cacheElements() {
    this.$statusLabel = $('#status');
    this.$activeDevicesList = $('#active-devices-list');
    this.$deviceHistoryList = $('#device-history-list');
  },

  /**
   * Load initial status with single API call
   */
  loadInitialStatus: function loadInitialStatus() {
    var _this = this;

    // Re-check extension ID after form loads
    if (!this.currentExtensionId) {
      this.currentExtensionId = this.extractExtensionId();

      if (!this.currentExtensionId) {
        // Try again after delay (form might still be loading)
        setTimeout(function () {
          return _this.loadInitialStatus();
        }, 500);
        return;
      }
    } // Make single API call for current status


    ExtensionsAPI.getStatus(this.currentExtensionId, function (response) {
      if (response && response.result && response.data) {
        _this.updateStatus(response.data);
      }
    }); // Also load historical data

    this.loadHistoricalData();
  },

  /**
   * Load historical data from API
   */
  loadHistoricalData: function loadHistoricalData() {
    var _this2 = this;

    if (!this.currentExtensionId) {
      return;
    } // Fetch history from API


    ExtensionsAPI.getHistory(this.currentExtensionId, {
      limit: 50
    }, function (response) {
      if (response && response.result && response.data && response.data.history) {
        _this2.displayHistoricalData(response.data.history);
      }
    });
  },

  /**
   * Subscribe to EventBus for real-time updates
   */
  subscribeToEvents: function subscribeToEvents() {
    var _this3 = this;

    if (typeof EventBus !== 'undefined') {
      EventBus.subscribe('extension-status', function (message) {
        _this3.handleEventBusMessage(message);
      });
    }
  },

  /**
   * Handle EventBus message
   */
  handleEventBusMessage: function handleEventBusMessage(message) {
    if (!message) {
      return;
    } // EventBus now sends data directly without double nesting


    var data = message;

    if (data.statuses && data.statuses[this.currentExtensionId]) {
      this.updateStatus(data.statuses[this.currentExtensionId]);
    }
  },

  /**
   * Update status display
   */
  updateStatus: function updateStatus(statusData) {
    if (!statusData) {
      return;
    } // Update status label


    this.updateStatusLabel(statusData.status); // Update active devices

    this.updateActiveDevices(statusData.devices || []); // Don't add to history - history is loaded from API only
    // this.addToHistory(statusData);
  },

  /**
   * Update status label
   */
  updateStatusLabel: function updateStatusLabel(status) {
    if (!this.$statusLabel) {
      return;
    }

    var color = this.getColorForStatus(status);
    var label = globalTranslate["ex_Status".concat(status)] || status; // Remove loading class and update content

    this.$statusLabel.removeClass('grey green red yellow loading').addClass(color).html("".concat(label));
  },

  /**
   * Get color for status value
   */
  getColorForStatus: function getColorForStatus(status) {
    switch (status) {
      case 'Available':
        return 'green';

      case 'Unavailable':
        return 'grey';

      case 'Disabled':
        return 'grey';

      default:
        return 'grey';
    }
  },

  /**
   * Update active devices list
   */
  updateActiveDevices: function updateActiveDevices(devices) {
    if (!this.$activeDevicesList || !Array.isArray(devices)) {
      return;
    }

    if (devices.length === 0) {
      this.$activeDevicesList.html("\n                <div class=\"ui message\">\n                    <div class=\"content\">\n                        ".concat(globalTranslate.ex_NoActiveDevices || 'No active devices', "\n                    </div>\n                </div>\n            "));
      return;
    } // Use horizontal list with teal labels like the old endpoint-list


    var devicesHtml = '<div class="ui horizontal list">';
    devices.forEach(function (device) {
      var userAgent = device.user_agent || 'Unknown';
      var ip = device.ip || device.contact_ip || '-';
      var port = device.port || '';
      var ipDisplay = port ? "".concat(ip, ":").concat(port) : ip;
      var rtt = device.rtt !== null && device.rtt !== undefined ? " (".concat(device.rtt.toFixed(2), " ms)") : '';
      var id = "".concat(userAgent, "|").concat(ip);
      devicesHtml += "\n                <div class=\"item\" data-id=\"".concat(id, "\">\n                    <div class=\"ui teal label\">\n                        ").concat(userAgent, "\n                        <div class=\"detail\">").concat(ipDisplay).concat(rtt, "</div>\n                    </div>\n                </div>\n            ");
    });
    devicesHtml += '</div>';
    this.$activeDevicesList.html(devicesHtml);
  },

  /**
   * Display historical data from API with device grouping
   */
  displayHistoricalData: function displayHistoricalData(historyData) {
    var _this4 = this;

    if (!this.$deviceHistoryList || !Array.isArray(historyData)) {
      return;
    }

    if (historyData.length === 0) {
      this.$deviceHistoryList.html("\n                <div class=\"ui message\">\n                    <div class=\"content\">\n                        ".concat(globalTranslate.ex_NoHistoryAvailable || 'No history available', "\n                    </div>\n                </div>\n            "));
      return;
    } // Group history by device


    var deviceGroups = this.groupHistoryByDevice(historyData); // Build HTML for grouped display - simplified structure

    var historyHtml = '<div class="ui divided list">';
    Object.entries(deviceGroups).forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          deviceKey = _ref2[0],
          sessions = _ref2[1];

      var _deviceKey$split = deviceKey.split('|'),
          _deviceKey$split2 = _slicedToArray(_deviceKey$split, 2),
          userAgent = _deviceKey$split2[0],
          ip = _deviceKey$split2[1];

      var deviceName = userAgent || 'Unknown Device';
      var deviceIP = ip && ip !== 'Unknown' ? ip : ''; // Device header - exactly as requested

      historyHtml += "\n                <div class=\"item\">\n                    <div class=\"content\">\n                        <div class=\"ui small header\">\n                            <i class=\"mobile icon\"></i>\n                            <div class=\"content\">\n                                ".concat(deviceName, "\n                                ").concat(deviceIP ? "<span class=\"ui tiny grey text\">(".concat(deviceIP, ")</span>") : '', "\n                            </div>\n                        </div>\n                        <div class=\"description\">\n            "); // Sessions timeline - simplified

      sessions.forEach(function (session, index) {
        var _sessions;

        var isOnline = session.status === 'Available';

        var duration = _this4.calculateDuration(session.timestamp, (_sessions = sessions[index - 1]) === null || _sessions === void 0 ? void 0 : _sessions.timestamp);

        var rttLabel = _this4.getRttLabel(session.rtt);

        var time = _this4.formatTime(session.date || session.timestamp); // Use circular labels like in extensions list


        var statusClass = isOnline ? 'green' : 'grey';
        var statusTitle = isOnline ? 'Online' : 'Offline'; // Format duration with translation

        var durationText = duration && isOnline ? "".concat(globalTranslate.ex_Online || 'Online', " ").concat(duration) : duration ? "".concat(globalTranslate.ex_Offline || 'Offline', " ").concat(duration) : '';
        historyHtml += "\n                    <div class=\"ui small text\" style=\"margin: 6px 20px; display: flex; align-items: center;\">\n                        <div class=\"ui ".concat(statusClass, " empty circular label\" \n                             style=\"width: 8px; height: 8px; min-height: 8px; margin-right: 8px;\" \n                             title=\"").concat(statusTitle, "\">\n                        </div>\n                        ").concat(time, "\n                        ").concat(rttLabel, "\n                        ").concat(durationText ? "<span class=\"ui grey text\" style=\"margin-left: 8px;\">".concat(durationText, "</span>") : '', "\n                    </div>\n                ");
      });
      historyHtml += "\n                        </div>\n                    </div>\n                </div>\n            ";
    });
    historyHtml += '</div>';
    this.$deviceHistoryList.html(historyHtml);
  },

  /**
   * Group history events by device
   */
  groupHistoryByDevice: function groupHistoryByDevice(historyData) {
    var groups = {};
    historyData.forEach(function (entry) {
      // Create device key from user_agent and IP
      var deviceKey = 'Unknown|Unknown';

      if (entry.user_agent || entry.ip_address) {
        deviceKey = "".concat(entry.user_agent || 'Unknown', "|").concat(entry.ip_address || 'Unknown');
      } else if (entry.details) {
        // Try to extract device info from details
        var match = entry.details.match(/([\w\s.]+)\s*-\s*([\d.]+)/);

        if (match) {
          deviceKey = "".concat(match[1].trim(), "|").concat(match[2].trim());
        }
      }

      if (!groups[deviceKey]) {
        groups[deviceKey] = [];
      }

      groups[deviceKey].push(entry);
    }); // Sort sessions within each group by timestamp (newest first)

    Object.keys(groups).forEach(function (key) {
      groups[key].sort(function (a, b) {
        return b.timestamp - a.timestamp;
      });
    });
    return groups;
  },

  /**
   * Calculate duration between two timestamps
   */
  calculateDuration: function calculateDuration(currentTimestamp, previousTimestamp) {
    if (!previousTimestamp) return null;
    var diff = Math.abs(previousTimestamp - currentTimestamp);
    var minutes = Math.floor(diff / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (days > 0) {
      return "".concat(days, "d ").concat(hours % 24, "h");
    } else if (hours > 0) {
      return "".concat(hours, "h ").concat(minutes % 60, "m");
    } else if (minutes > 0) {
      return "".concat(minutes, "m");
    } else {
      return "".concat(diff, "s");
    }
  },

  /**
   * Format time for display
   */
  formatTime: function formatTime(dateStr) {
    if (!dateStr) return ''; // If it's already a formatted date string like "2025-09-11 11:30:36"

    if (typeof dateStr === 'string' && dateStr.includes(' ')) {
      var timePart = dateStr.split(' ')[1];
      return timePart || dateStr;
    } // If it's a timestamp


    if (typeof dateStr === 'number') {
      var date = new Date(dateStr * 1000);
      return date.toLocaleTimeString();
    }

    return dateStr;
  },

  /**
   * Get RTT label with color coding
   */
  getRttLabel: function getRttLabel(rtt) {
    if (rtt === null || rtt === undefined || rtt <= 0) {
      return '';
    }

    var color = 'green';

    if (rtt > 150) {
      color = 'red';
    } else if (rtt > 50) {
      color = 'olive'; // yellow can be hard to see, olive is better
    }

    return "<span class=\"ui ".concat(color, " text\" style=\"margin-left: 8px;\">[RTT: ").concat(rtt.toFixed(0), "ms]</span>");
  },

  /**
   * Cleanup on page unload
   */
  destroy: function destroy() {
    if (typeof EventBus !== 'undefined') {
      EventBus.unsubscribe('extension-status');
    }

    this.isInitialized = false;
    this.currentExtensionId = null;
  }
}; // Export for use in extension-modify.js

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionModifyStatusMonitor;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCJpbml0aWFsaXplIiwiZXh0cmFjdEV4dGVuc2lvbklkIiwiY2FjaGVFbGVtZW50cyIsInN1YnNjcmliZVRvRXZlbnRzIiwibG9hZEluaXRpYWxTdGF0dXMiLCIkbnVtYmVyRmllbGQiLCIkIiwibGVuZ3RoIiwidmFsIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaW5wdXRtYXNrIiwiZSIsInJlcGxhY2UiLCJ1cmxNYXRjaCIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJtYXRjaCIsInNldFRpbWVvdXQiLCJFeHRlbnNpb25zQVBJIiwiZ2V0U3RhdHVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwidXBkYXRlU3RhdHVzIiwibG9hZEhpc3RvcmljYWxEYXRhIiwiZ2V0SGlzdG9yeSIsImxpbWl0IiwiaGlzdG9yeSIsImRpc3BsYXlIaXN0b3JpY2FsRGF0YSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInN0YXR1c2VzIiwic3RhdHVzRGF0YSIsInVwZGF0ZVN0YXR1c0xhYmVsIiwic3RhdHVzIiwidXBkYXRlQWN0aXZlRGV2aWNlcyIsImRldmljZXMiLCJjb2xvciIsImdldENvbG9yRm9yU3RhdHVzIiwibGFiZWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiaHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImV4X05vQWN0aXZlRGV2aWNlcyIsImRldmljZXNIdG1sIiwiZm9yRWFjaCIsImRldmljZSIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJpcCIsImNvbnRhY3RfaXAiLCJwb3J0IiwiaXBEaXNwbGF5IiwicnR0IiwidW5kZWZpbmVkIiwidG9GaXhlZCIsImlkIiwiaGlzdG9yeURhdGEiLCJleF9Ob0hpc3RvcnlBdmFpbGFibGUiLCJkZXZpY2VHcm91cHMiLCJncm91cEhpc3RvcnlCeURldmljZSIsImhpc3RvcnlIdG1sIiwiT2JqZWN0IiwiZW50cmllcyIsImRldmljZUtleSIsInNlc3Npb25zIiwic3BsaXQiLCJkZXZpY2VOYW1lIiwiZGV2aWNlSVAiLCJzZXNzaW9uIiwiaW5kZXgiLCJpc09ubGluZSIsImR1cmF0aW9uIiwiY2FsY3VsYXRlRHVyYXRpb24iLCJ0aW1lc3RhbXAiLCJydHRMYWJlbCIsImdldFJ0dExhYmVsIiwidGltZSIsImZvcm1hdFRpbWUiLCJkYXRlIiwic3RhdHVzQ2xhc3MiLCJzdGF0dXNUaXRsZSIsImR1cmF0aW9uVGV4dCIsImV4X09ubGluZSIsImV4X09mZmxpbmUiLCJncm91cHMiLCJlbnRyeSIsImlwX2FkZHJlc3MiLCJkZXRhaWxzIiwidHJpbSIsInB1c2giLCJrZXlzIiwia2V5Iiwic29ydCIsImEiLCJiIiwiY3VycmVudFRpbWVzdGFtcCIsInByZXZpb3VzVGltZXN0YW1wIiwiZGlmZiIsIk1hdGgiLCJhYnMiLCJtaW51dGVzIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJkYXRlU3RyIiwiaW5jbHVkZXMiLCJ0aW1lUGFydCIsIkRhdGUiLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJkZXN0cm95IiwidW5zdWJzY3JpYmUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLDRCQUE0QixHQUFHO0FBQ2pDQyxFQUFBQSxTQUFTLEVBQUUsa0JBRHNCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUUsS0FGa0I7QUFHakNDLEVBQUFBLGtCQUFrQixFQUFFLElBSGE7O0FBS2pDO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFSbUI7QUFTakNDLEVBQUFBLGtCQUFrQixFQUFFLElBVGE7QUFVakNDLEVBQUFBLGtCQUFrQixFQUFFLElBVmE7O0FBWWpDO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWZpQyx3QkFlcEI7QUFDVCxRQUFJLEtBQUtMLGFBQVQsRUFBd0I7QUFDcEI7QUFDSCxLQUhRLENBS1Q7OztBQUNBLFNBQUtDLGtCQUFMLEdBQTBCLEtBQUtLLGtCQUFMLEVBQTFCOztBQUNBLFFBQUksQ0FBQyxLQUFLTCxrQkFBVixFQUE4QjtBQUMxQjtBQUNILEtBVFEsQ0FXVDs7O0FBQ0EsU0FBS00sYUFBTCxHQVpTLENBY1Q7O0FBQ0EsU0FBS0MsaUJBQUwsR0FmUyxDQWlCVDs7QUFDQSxTQUFLQyxpQkFBTDtBQUVBLFNBQUtULGFBQUwsR0FBcUIsSUFBckI7QUFDSCxHQXBDZ0M7O0FBc0NqQztBQUNKO0FBQ0E7QUFDSU0sRUFBQUEsa0JBekNpQyxnQ0F5Q1o7QUFDakI7QUFDQSxRQUFNSSxZQUFZLEdBQUdDLENBQUMsQ0FBQyxzQkFBRCxDQUF0Qjs7QUFDQSxRQUFJRCxZQUFZLENBQUNFLE1BQWIsSUFBdUJGLFlBQVksQ0FBQ0csR0FBYixFQUEzQixFQUErQztBQUMzQztBQUNBLFVBQUlDLGVBQUosQ0FGMkMsQ0FJM0M7O0FBQ0EsVUFBSSxPQUFPSixZQUFZLENBQUNLLFNBQXBCLEtBQWtDLFVBQXRDLEVBQWtEO0FBQzlDLFlBQUk7QUFDQTtBQUNBRCxVQUFBQSxlQUFlLEdBQUdKLFlBQVksQ0FBQ0ssU0FBYixDQUF1QixlQUF2QixDQUFsQjtBQUNILFNBSEQsQ0FHRSxPQUFPQyxDQUFQLEVBQVU7QUFDUjtBQUNBRixVQUFBQSxlQUFlLEdBQUdKLFlBQVksQ0FBQ0csR0FBYixFQUFsQjtBQUNIO0FBQ0osT0FSRCxNQVFPO0FBQ0hDLFFBQUFBLGVBQWUsR0FBR0osWUFBWSxDQUFDRyxHQUFiLEVBQWxCO0FBQ0gsT0FmMEMsQ0FpQjNDOzs7QUFDQUMsTUFBQUEsZUFBZSxHQUFHQSxlQUFlLENBQUNHLE9BQWhCLENBQXdCLFNBQXhCLEVBQW1DLEVBQW5DLENBQWxCLENBbEIyQyxDQW9CM0M7O0FBQ0EsVUFBSUgsZUFBZSxJQUFJQSxlQUFlLENBQUNGLE1BQWhCLEdBQXlCLENBQWhELEVBQW1EO0FBQy9DLGVBQU9FLGVBQVA7QUFDSDtBQUNKLEtBM0JnQixDQTZCakI7OztBQUNBLFFBQU1JLFFBQVEsR0FBR0MsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsNkJBQS9CLENBQWpCOztBQUNBLFFBQUlKLFFBQVEsSUFBSUEsUUFBUSxDQUFDLENBQUQsQ0FBeEIsRUFBNkI7QUFDekI7QUFDQTtBQUNBLGFBQU8sSUFBUDtBQUNIOztBQUVELFdBQU8sSUFBUDtBQUNILEdBL0VnQzs7QUFpRmpDO0FBQ0o7QUFDQTtBQUNJWCxFQUFBQSxhQXBGaUMsMkJBb0ZqQjtBQUNaLFNBQUtMLFlBQUwsR0FBb0JTLENBQUMsQ0FBQyxTQUFELENBQXJCO0FBQ0EsU0FBS1Isa0JBQUwsR0FBMEJRLENBQUMsQ0FBQyxzQkFBRCxDQUEzQjtBQUNBLFNBQUtQLGtCQUFMLEdBQTBCTyxDQUFDLENBQUMsc0JBQUQsQ0FBM0I7QUFDSCxHQXhGZ0M7O0FBMEZqQztBQUNKO0FBQ0E7QUFDSUYsRUFBQUEsaUJBN0ZpQywrQkE2RmI7QUFBQTs7QUFDaEI7QUFDQSxRQUFJLENBQUMsS0FBS1Isa0JBQVYsRUFBOEI7QUFDMUIsV0FBS0Esa0JBQUwsR0FBMEIsS0FBS0ssa0JBQUwsRUFBMUI7O0FBQ0EsVUFBSSxDQUFDLEtBQUtMLGtCQUFWLEVBQThCO0FBQzFCO0FBQ0FzQixRQUFBQSxVQUFVLENBQUM7QUFBQSxpQkFBTSxLQUFJLENBQUNkLGlCQUFMLEVBQU47QUFBQSxTQUFELEVBQWlDLEdBQWpDLENBQVY7QUFDQTtBQUNIO0FBQ0osS0FUZSxDQVloQjs7O0FBQ0FlLElBQUFBLGFBQWEsQ0FBQ0MsU0FBZCxDQUF3QixLQUFLeEIsa0JBQTdCLEVBQWlELFVBQUN5QixRQUFELEVBQWM7QUFDM0QsVUFBSUEsUUFBUSxJQUFJQSxRQUFRLENBQUNDLE1BQXJCLElBQStCRCxRQUFRLENBQUNFLElBQTVDLEVBQWtEO0FBQzlDLFFBQUEsS0FBSSxDQUFDQyxZQUFMLENBQWtCSCxRQUFRLENBQUNFLElBQTNCO0FBQ0g7QUFDSixLQUpELEVBYmdCLENBbUJoQjs7QUFDQSxTQUFLRSxrQkFBTDtBQUNILEdBbEhnQzs7QUFvSGpDO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxrQkF2SGlDLGdDQXVIWjtBQUFBOztBQUNqQixRQUFJLENBQUMsS0FBSzdCLGtCQUFWLEVBQThCO0FBQzFCO0FBQ0gsS0FIZ0IsQ0FLakI7OztBQUNBdUIsSUFBQUEsYUFBYSxDQUFDTyxVQUFkLENBQXlCLEtBQUs5QixrQkFBOUIsRUFBa0Q7QUFBQytCLE1BQUFBLEtBQUssRUFBRTtBQUFSLEtBQWxELEVBQStELFVBQUNOLFFBQUQsRUFBYztBQUN6RSxVQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsTUFBckIsSUFBK0JELFFBQVEsQ0FBQ0UsSUFBeEMsSUFBZ0RGLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjSyxPQUFsRSxFQUEyRTtBQUN2RSxRQUFBLE1BQUksQ0FBQ0MscUJBQUwsQ0FBMkJSLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjSyxPQUF6QztBQUNIO0FBQ0osS0FKRDtBQUtILEdBbElnQzs7QUFvSWpDO0FBQ0o7QUFDQTtBQUNJekIsRUFBQUEsaUJBdklpQywrQkF1SWI7QUFBQTs7QUFDaEIsUUFBSSxPQUFPMkIsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNqQ0EsTUFBQUEsUUFBUSxDQUFDQyxTQUFULENBQW1CLGtCQUFuQixFQUF1QyxVQUFDQyxPQUFELEVBQWE7QUFDaEQsUUFBQSxNQUFJLENBQUNDLHFCQUFMLENBQTJCRCxPQUEzQjtBQUNILE9BRkQ7QUFHSDtBQUNKLEdBN0lnQzs7QUErSWpDO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxxQkFsSmlDLGlDQWtKWEQsT0FsSlcsRUFrSkY7QUFDM0IsUUFBSSxDQUFDQSxPQUFMLEVBQWM7QUFDVjtBQUNILEtBSDBCLENBSzNCOzs7QUFDQSxRQUFNVCxJQUFJLEdBQUdTLE9BQWI7O0FBQ0EsUUFBSVQsSUFBSSxDQUFDVyxRQUFMLElBQWlCWCxJQUFJLENBQUNXLFFBQUwsQ0FBYyxLQUFLdEMsa0JBQW5CLENBQXJCLEVBQTZEO0FBQ3pELFdBQUs0QixZQUFMLENBQWtCRCxJQUFJLENBQUNXLFFBQUwsQ0FBYyxLQUFLdEMsa0JBQW5CLENBQWxCO0FBQ0g7QUFDSixHQTVKZ0M7O0FBOEpqQztBQUNKO0FBQ0E7QUFDSTRCLEVBQUFBLFlBaktpQyx3QkFpS3BCVyxVQWpLb0IsRUFpS1I7QUFDckIsUUFBSSxDQUFDQSxVQUFMLEVBQWlCO0FBQ2I7QUFDSCxLQUhvQixDQUtyQjs7O0FBQ0EsU0FBS0MsaUJBQUwsQ0FBdUJELFVBQVUsQ0FBQ0UsTUFBbEMsRUFOcUIsQ0FRckI7O0FBQ0EsU0FBS0MsbUJBQUwsQ0FBeUJILFVBQVUsQ0FBQ0ksT0FBWCxJQUFzQixFQUEvQyxFQVRxQixDQVdyQjtBQUNBO0FBQ0gsR0E5S2dDOztBQWdMakM7QUFDSjtBQUNBO0FBQ0lILEVBQUFBLGlCQW5MaUMsNkJBbUxmQyxNQW5MZSxFQW1MUDtBQUN0QixRQUFJLENBQUMsS0FBS3hDLFlBQVYsRUFBd0I7QUFDcEI7QUFDSDs7QUFFRCxRQUFNMkMsS0FBSyxHQUFHLEtBQUtDLGlCQUFMLENBQXVCSixNQUF2QixDQUFkO0FBQ0EsUUFBTUssS0FBSyxHQUFHQyxlQUFlLG9CQUFhTixNQUFiLEVBQWYsSUFBeUNBLE1BQXZELENBTnNCLENBUXRCOztBQUNBLFNBQUt4QyxZQUFMLENBQ0srQyxXQURMLENBQ2lCLCtCQURqQixFQUVLQyxRQUZMLENBRWNMLEtBRmQsRUFHS00sSUFITCxXQUdhSixLQUhiO0FBSUgsR0FoTWdDOztBQWtNakM7QUFDSjtBQUNBO0FBQ0lELEVBQUFBLGlCQXJNaUMsNkJBcU1mSixNQXJNZSxFQXFNUDtBQUN0QixZQUFRQSxNQUFSO0FBQ0ksV0FBSyxXQUFMO0FBQ0ksZUFBTyxPQUFQOztBQUNKLFdBQUssYUFBTDtBQUNJLGVBQU8sTUFBUDs7QUFDSixXQUFLLFVBQUw7QUFDSSxlQUFPLE1BQVA7O0FBQ0o7QUFDSSxlQUFPLE1BQVA7QUFSUjtBQVVILEdBaE5nQzs7QUFrTmpDO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxtQkFyTmlDLCtCQXFOYkMsT0FyTmEsRUFxTko7QUFDekIsUUFBSSxDQUFDLEtBQUt6QyxrQkFBTixJQUE0QixDQUFDaUQsS0FBSyxDQUFDQyxPQUFOLENBQWNULE9BQWQsQ0FBakMsRUFBeUQ7QUFDckQ7QUFDSDs7QUFFRCxRQUFJQSxPQUFPLENBQUNoQyxNQUFSLEtBQW1CLENBQXZCLEVBQTBCO0FBQ3RCLFdBQUtULGtCQUFMLENBQXdCZ0QsSUFBeEIsOEhBR2NILGVBQWUsQ0FBQ00sa0JBQWhCLElBQXNDLG1CQUhwRDtBQU9BO0FBQ0gsS0Fkd0IsQ0FnQnpCOzs7QUFDQSxRQUFJQyxXQUFXLEdBQUcsa0NBQWxCO0FBRUFYLElBQUFBLE9BQU8sQ0FBQ1ksT0FBUixDQUFnQixVQUFDQyxNQUFELEVBQVk7QUFDeEIsVUFBTUMsU0FBUyxHQUFHRCxNQUFNLENBQUNFLFVBQVAsSUFBcUIsU0FBdkM7QUFDQSxVQUFNQyxFQUFFLEdBQUdILE1BQU0sQ0FBQ0csRUFBUCxJQUFhSCxNQUFNLENBQUNJLFVBQXBCLElBQWtDLEdBQTdDO0FBQ0EsVUFBTUMsSUFBSSxHQUFHTCxNQUFNLENBQUNLLElBQVAsSUFBZSxFQUE1QjtBQUNBLFVBQU1DLFNBQVMsR0FBR0QsSUFBSSxhQUFNRixFQUFOLGNBQVlFLElBQVosSUFBcUJGLEVBQTNDO0FBQ0EsVUFBTUksR0FBRyxHQUFHUCxNQUFNLENBQUNPLEdBQVAsS0FBZSxJQUFmLElBQXVCUCxNQUFNLENBQUNPLEdBQVAsS0FBZUMsU0FBdEMsZUFDRFIsTUFBTSxDQUFDTyxHQUFQLENBQVdFLE9BQVgsQ0FBbUIsQ0FBbkIsQ0FEQyxZQUVOLEVBRk47QUFHQSxVQUFNQyxFQUFFLGFBQU1ULFNBQU4sY0FBbUJFLEVBQW5CLENBQVI7QUFFQUwsTUFBQUEsV0FBVyw4REFDc0JZLEVBRHRCLDZGQUdHVCxTQUhILDZEQUl1QkssU0FKdkIsU0FJbUNDLEdBSm5DLDZFQUFYO0FBUUgsS0FsQkQ7QUFvQkFULElBQUFBLFdBQVcsSUFBSSxRQUFmO0FBQ0EsU0FBS3BELGtCQUFMLENBQXdCZ0QsSUFBeEIsQ0FBNkJJLFdBQTdCO0FBQ0gsR0E5UGdDOztBQWlRakM7QUFDSjtBQUNBO0FBQ0lyQixFQUFBQSxxQkFwUWlDLGlDQW9RWGtDLFdBcFFXLEVBb1FFO0FBQUE7O0FBQy9CLFFBQUksQ0FBQyxLQUFLaEUsa0JBQU4sSUFBNEIsQ0FBQ2dELEtBQUssQ0FBQ0MsT0FBTixDQUFjZSxXQUFkLENBQWpDLEVBQTZEO0FBQ3pEO0FBQ0g7O0FBRUQsUUFBSUEsV0FBVyxDQUFDeEQsTUFBWixLQUF1QixDQUEzQixFQUE4QjtBQUMxQixXQUFLUixrQkFBTCxDQUF3QitDLElBQXhCLDhIQUdjSCxlQUFlLENBQUNxQixxQkFBaEIsSUFBeUMsc0JBSHZEO0FBT0E7QUFDSCxLQWQ4QixDQWdCL0I7OztBQUNBLFFBQU1DLFlBQVksR0FBRyxLQUFLQyxvQkFBTCxDQUEwQkgsV0FBMUIsQ0FBckIsQ0FqQitCLENBbUIvQjs7QUFDQSxRQUFJSSxXQUFXLEdBQUcsK0JBQWxCO0FBRUFDLElBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxDQUFlSixZQUFmLEVBQTZCZCxPQUE3QixDQUFxQyxnQkFBMkI7QUFBQTtBQUFBLFVBQXpCbUIsU0FBeUI7QUFBQSxVQUFkQyxRQUFjOztBQUM1RCw2QkFBd0JELFNBQVMsQ0FBQ0UsS0FBVixDQUFnQixHQUFoQixDQUF4QjtBQUFBO0FBQUEsVUFBT25CLFNBQVA7QUFBQSxVQUFrQkUsRUFBbEI7O0FBQ0EsVUFBTWtCLFVBQVUsR0FBR3BCLFNBQVMsSUFBSSxnQkFBaEM7QUFDQSxVQUFNcUIsUUFBUSxHQUFJbkIsRUFBRSxJQUFJQSxFQUFFLEtBQUssU0FBZCxHQUEyQkEsRUFBM0IsR0FBZ0MsRUFBakQsQ0FINEQsQ0FLNUQ7O0FBQ0FZLE1BQUFBLFdBQVcsNFNBTVdNLFVBTlgsK0NBT1dDLFFBQVEsZ0RBQXVDQSxRQUF2QyxnQkFBNEQsRUFQL0UsNElBQVgsQ0FONEQsQ0FtQjVEOztBQUNBSCxNQUFBQSxRQUFRLENBQUNwQixPQUFULENBQWlCLFVBQUN3QixPQUFELEVBQVVDLEtBQVYsRUFBb0I7QUFBQTs7QUFDakMsWUFBTUMsUUFBUSxHQUFHRixPQUFPLENBQUN0QyxNQUFSLEtBQW1CLFdBQXBDOztBQUNBLFlBQU15QyxRQUFRLEdBQUcsTUFBSSxDQUFDQyxpQkFBTCxDQUF1QkosT0FBTyxDQUFDSyxTQUEvQixlQUEwQ1QsUUFBUSxDQUFDSyxLQUFLLEdBQUcsQ0FBVCxDQUFsRCw4Q0FBMEMsVUFBcUJJLFNBQS9ELENBQWpCOztBQUNBLFlBQU1DLFFBQVEsR0FBRyxNQUFJLENBQUNDLFdBQUwsQ0FBaUJQLE9BQU8sQ0FBQ2hCLEdBQXpCLENBQWpCOztBQUNBLFlBQU13QixJQUFJLEdBQUcsTUFBSSxDQUFDQyxVQUFMLENBQWdCVCxPQUFPLENBQUNVLElBQVIsSUFBZ0JWLE9BQU8sQ0FBQ0ssU0FBeEMsQ0FBYixDQUppQyxDQU1qQzs7O0FBQ0EsWUFBTU0sV0FBVyxHQUFHVCxRQUFRLEdBQUcsT0FBSCxHQUFhLE1BQXpDO0FBQ0EsWUFBTVUsV0FBVyxHQUFHVixRQUFRLEdBQUcsUUFBSCxHQUFjLFNBQTFDLENBUmlDLENBVWpDOztBQUNBLFlBQU1XLFlBQVksR0FBR1YsUUFBUSxJQUFJRCxRQUFaLGFBQ1psQyxlQUFlLENBQUM4QyxTQUFoQixJQUE2QixRQURqQixjQUM2QlgsUUFEN0IsSUFFZkEsUUFBUSxhQUNEbkMsZUFBZSxDQUFDK0MsVUFBaEIsSUFBOEIsU0FEN0IsY0FDMENaLFFBRDFDLElBRUosRUFKVjtBQU1BWCxRQUFBQSxXQUFXLDJLQUVjbUIsV0FGZCxrTEFJV0MsV0FKWCwwRUFNREosSUFOQyx1Q0FPREYsUUFQQyx1Q0FRRE8sWUFBWSxzRUFBMkRBLFlBQTNELGVBQW1GLEVBUjlGLG1EQUFYO0FBV0gsT0E1QkQ7QUE4QkFyQixNQUFBQSxXQUFXLHdHQUFYO0FBS0gsS0F2REQ7QUF5REFBLElBQUFBLFdBQVcsSUFBSSxRQUFmO0FBQ0EsU0FBS3BFLGtCQUFMLENBQXdCK0MsSUFBeEIsQ0FBNkJxQixXQUE3QjtBQUNILEdBclZnQzs7QUF1VmpDO0FBQ0o7QUFDQTtBQUNJRCxFQUFBQSxvQkExVmlDLGdDQTBWWkgsV0ExVlksRUEwVkM7QUFDOUIsUUFBTTRCLE1BQU0sR0FBRyxFQUFmO0FBRUE1QixJQUFBQSxXQUFXLENBQUNaLE9BQVosQ0FBb0IsVUFBQXlDLEtBQUssRUFBSTtBQUN6QjtBQUNBLFVBQUl0QixTQUFTLEdBQUcsaUJBQWhCOztBQUVBLFVBQUlzQixLQUFLLENBQUN0QyxVQUFOLElBQW9Cc0MsS0FBSyxDQUFDQyxVQUE5QixFQUEwQztBQUN0Q3ZCLFFBQUFBLFNBQVMsYUFBTXNCLEtBQUssQ0FBQ3RDLFVBQU4sSUFBb0IsU0FBMUIsY0FBdUNzQyxLQUFLLENBQUNDLFVBQU4sSUFBb0IsU0FBM0QsQ0FBVDtBQUNILE9BRkQsTUFFTyxJQUFJRCxLQUFLLENBQUNFLE9BQVYsRUFBbUI7QUFDdEI7QUFDQSxZQUFNN0UsS0FBSyxHQUFHMkUsS0FBSyxDQUFDRSxPQUFOLENBQWM3RSxLQUFkLENBQW9CLDJCQUFwQixDQUFkOztBQUNBLFlBQUlBLEtBQUosRUFBVztBQUNQcUQsVUFBQUEsU0FBUyxhQUFNckQsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTOEUsSUFBVCxFQUFOLGNBQXlCOUUsS0FBSyxDQUFDLENBQUQsQ0FBTCxDQUFTOEUsSUFBVCxFQUF6QixDQUFUO0FBQ0g7QUFDSjs7QUFFRCxVQUFJLENBQUNKLE1BQU0sQ0FBQ3JCLFNBQUQsQ0FBWCxFQUF3QjtBQUNwQnFCLFFBQUFBLE1BQU0sQ0FBQ3JCLFNBQUQsQ0FBTixHQUFvQixFQUFwQjtBQUNIOztBQUVEcUIsTUFBQUEsTUFBTSxDQUFDckIsU0FBRCxDQUFOLENBQWtCMEIsSUFBbEIsQ0FBdUJKLEtBQXZCO0FBQ0gsS0FuQkQsRUFIOEIsQ0F3QjlCOztBQUNBeEIsSUFBQUEsTUFBTSxDQUFDNkIsSUFBUCxDQUFZTixNQUFaLEVBQW9CeEMsT0FBcEIsQ0FBNEIsVUFBQStDLEdBQUcsRUFBSTtBQUMvQlAsTUFBQUEsTUFBTSxDQUFDTyxHQUFELENBQU4sQ0FBWUMsSUFBWixDQUFpQixVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSxlQUFVQSxDQUFDLENBQUNyQixTQUFGLEdBQWNvQixDQUFDLENBQUNwQixTQUExQjtBQUFBLE9BQWpCO0FBQ0gsS0FGRDtBQUlBLFdBQU9XLE1BQVA7QUFDSCxHQXhYZ0M7O0FBMFhqQztBQUNKO0FBQ0E7QUFDSVosRUFBQUEsaUJBN1hpQyw2QkE2WGZ1QixnQkE3WGUsRUE2WEdDLGlCQTdYSCxFQTZYc0I7QUFDbkQsUUFBSSxDQUFDQSxpQkFBTCxFQUF3QixPQUFPLElBQVA7QUFFeEIsUUFBTUMsSUFBSSxHQUFHQyxJQUFJLENBQUNDLEdBQUwsQ0FBU0gsaUJBQWlCLEdBQUdELGdCQUE3QixDQUFiO0FBQ0EsUUFBTUssT0FBTyxHQUFHRixJQUFJLENBQUNHLEtBQUwsQ0FBV0osSUFBSSxHQUFHLEVBQWxCLENBQWhCO0FBQ0EsUUFBTUssS0FBSyxHQUFHSixJQUFJLENBQUNHLEtBQUwsQ0FBV0QsT0FBTyxHQUFHLEVBQXJCLENBQWQ7QUFDQSxRQUFNRyxJQUFJLEdBQUdMLElBQUksQ0FBQ0csS0FBTCxDQUFXQyxLQUFLLEdBQUcsRUFBbkIsQ0FBYjs7QUFFQSxRQUFJQyxJQUFJLEdBQUcsQ0FBWCxFQUFjO0FBQ1YsdUJBQVVBLElBQVYsZUFBbUJELEtBQUssR0FBRyxFQUEzQjtBQUNILEtBRkQsTUFFTyxJQUFJQSxLQUFLLEdBQUcsQ0FBWixFQUFlO0FBQ2xCLHVCQUFVQSxLQUFWLGVBQW9CRixPQUFPLEdBQUcsRUFBOUI7QUFDSCxLQUZNLE1BRUEsSUFBSUEsT0FBTyxHQUFHLENBQWQsRUFBaUI7QUFDcEIsdUJBQVVBLE9BQVY7QUFDSCxLQUZNLE1BRUE7QUFDSCx1QkFBVUgsSUFBVjtBQUNIO0FBQ0osR0E5WWdDOztBQWdaakM7QUFDSjtBQUNBO0FBQ0lwQixFQUFBQSxVQW5aaUMsc0JBbVp0QjJCLE9BblpzQixFQW1aYjtBQUNoQixRQUFJLENBQUNBLE9BQUwsRUFBYyxPQUFPLEVBQVAsQ0FERSxDQUdoQjs7QUFDQSxRQUFJLE9BQU9BLE9BQVAsS0FBbUIsUUFBbkIsSUFBK0JBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQixHQUFqQixDQUFuQyxFQUEwRDtBQUN0RCxVQUFNQyxRQUFRLEdBQUdGLE9BQU8sQ0FBQ3ZDLEtBQVIsQ0FBYyxHQUFkLEVBQW1CLENBQW5CLENBQWpCO0FBQ0EsYUFBT3lDLFFBQVEsSUFBSUYsT0FBbkI7QUFDSCxLQVBlLENBU2hCOzs7QUFDQSxRQUFJLE9BQU9BLE9BQVAsS0FBbUIsUUFBdkIsRUFBaUM7QUFDN0IsVUFBTTFCLElBQUksR0FBRyxJQUFJNkIsSUFBSixDQUFTSCxPQUFPLEdBQUcsSUFBbkIsQ0FBYjtBQUNBLGFBQU8xQixJQUFJLENBQUM4QixrQkFBTCxFQUFQO0FBQ0g7O0FBRUQsV0FBT0osT0FBUDtBQUNILEdBbmFnQzs7QUFxYWpDO0FBQ0o7QUFDQTtBQUNJN0IsRUFBQUEsV0F4YWlDLHVCQXdhckJ2QixHQXhhcUIsRUF3YWhCO0FBQ2IsUUFBSUEsR0FBRyxLQUFLLElBQVIsSUFBZ0JBLEdBQUcsS0FBS0MsU0FBeEIsSUFBcUNELEdBQUcsSUFBSSxDQUFoRCxFQUFtRDtBQUMvQyxhQUFPLEVBQVA7QUFDSDs7QUFFRCxRQUFJbkIsS0FBSyxHQUFHLE9BQVo7O0FBQ0EsUUFBSW1CLEdBQUcsR0FBRyxHQUFWLEVBQWU7QUFDWG5CLE1BQUFBLEtBQUssR0FBRyxLQUFSO0FBQ0gsS0FGRCxNQUVPLElBQUltQixHQUFHLEdBQUcsRUFBVixFQUFjO0FBQ2pCbkIsTUFBQUEsS0FBSyxHQUFHLE9BQVIsQ0FEaUIsQ0FDQztBQUNyQjs7QUFFRCxzQ0FBMEJBLEtBQTFCLHVEQUF5RW1CLEdBQUcsQ0FBQ0UsT0FBSixDQUFZLENBQVosQ0FBekU7QUFDSCxHQXJiZ0M7O0FBd2JqQztBQUNKO0FBQ0E7QUFDSXVELEVBQUFBLE9BM2JpQyxxQkEyYnZCO0FBQ04sUUFBSSxPQUFPdEYsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNqQ0EsTUFBQUEsUUFBUSxDQUFDdUYsV0FBVCxDQUFxQixrQkFBckI7QUFDSDs7QUFDRCxTQUFLMUgsYUFBTCxHQUFxQixLQUFyQjtBQUNBLFNBQUtDLGtCQUFMLEdBQTBCLElBQTFCO0FBQ0g7QUFqY2dDLENBQXJDLEMsQ0FvY0E7O0FBQ0EsSUFBSSxPQUFPMEgsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCOUgsNEJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFdmVudEJ1cywgRXh0ZW5zaW9uc0FQSSAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBNb2RpZnkgU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsaWZpZWQgc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbiBtb2RpZnkgcGFnZTpcbiAqIC0gU2luZ2xlIEFQSSBjYWxsIG9uIGluaXRpYWxpemF0aW9uXG4gKiAtIFJlYWwtdGltZSB1cGRhdGVzIHZpYSBFdmVudEJ1cyBvbmx5XG4gKiAtIE5vIHBlcmlvZGljIHBvbGxpbmdcbiAqIC0gQ2xlYW4gZGV2aWNlIGxpc3QgYW5kIGhpc3RvcnkgZGlzcGxheVxuICovXG5jb25zdCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ2V4dGVuc2lvbi1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGN1cnJlbnRFeHRlbnNpb25JZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNMYWJlbDogbnVsbCxcbiAgICAkYWN0aXZlRGV2aWNlc0xpc3Q6IG51bGwsXG4gICAgJGRldmljZUhpc3RvcnlMaXN0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvclxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGV4dGVuc2lvbiBudW1iZXIgZnJvbSBmb3JtXG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIGluaXRpYWwgQVBJIGNhbGxcbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGZvcm1cbiAgICAgKi9cbiAgICBleHRyYWN0RXh0ZW5zaW9uSWQoKSB7XG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gZ2V0IHRoZSBwaG9uZSBudW1iZXIgZnJvbSBmb3JtIGZpZWxkIChwcmltYXJ5KVxuICAgICAgICBjb25zdCAkbnVtYmVyRmllbGQgPSAkKCdpbnB1dFtuYW1lPVwibnVtYmVyXCJdJyk7XG4gICAgICAgIGlmICgkbnVtYmVyRmllbGQubGVuZ3RoICYmICRudW1iZXJGaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBpZiBpbnB1dG1hc2sgaXMgYXBwbGllZFxuICAgICAgICAgICAgbGV0IGV4dGVuc2lvbk51bWJlcjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIGlzIGF2YWlsYWJsZSBhbmQgYXBwbGllZCB0byB0aGUgZmllbGRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJG51bWJlckZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSAob25seSB0aGUgYWN0dWFsIGlucHV0IHdpdGhvdXQgbWFzayBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBpZiBpbnB1dG1hc2sgbWV0aG9kIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdGhlIHZhbHVlIC0gcmVtb3ZlIGFueSByZW1haW5pbmcgbWFzayBjaGFyYWN0ZXJzIGxpa2UgdW5kZXJzY29yZVxuICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gZXh0ZW5zaW9uTnVtYmVyLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgcmV0dXJuIGlmIHdlIGhhdmUgYWN0dWFsIGRpZ2l0c1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk51bWJlciAmJiBleHRlbnNpb25OdW1iZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIFVSTCBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsTWF0Y2ggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL1xcL2V4dGVuc2lvbnNcXC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgaWYgKHVybE1hdGNoICYmIHVybE1hdGNoWzFdKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGRhdGFiYXNlIElELCB3ZSBuZWVkIHRvIHdhaXQgZm9yIGZvcm0gdG8gbG9hZFxuICAgICAgICAgICAgLy8gV2UnbGwgZ2V0IHRoZSBhY3R1YWwgZXh0ZW5zaW9uIG51bWJlciBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICBjYWNoZUVsZW1lbnRzKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbCA9ICQoJyNzdGF0dXMnKTtcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgPSAkKCcjYWN0aXZlLWRldmljZXMtbGlzdCcpO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdCA9ICQoJyNkZXZpY2UtaGlzdG9yeS1saXN0Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGluaXRpYWwgc3RhdHVzIHdpdGggc2luZ2xlIEFQSSBjYWxsXG4gICAgICovXG4gICAgbG9hZEluaXRpYWxTdGF0dXMoKSB7XG4gICAgICAgIC8vIFJlLWNoZWNrIGV4dGVuc2lvbiBJRCBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWdhaW4gYWZ0ZXIgZGVsYXkgKGZvcm0gbWlnaHQgc3RpbGwgYmUgbG9hZGluZylcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMubG9hZEluaXRpYWxTdGF0dXMoKSwgNTAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIHNpbmdsZSBBUEkgY2FsbCBmb3IgY3VycmVudCBzdGF0dXNcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXModGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyBsb2FkIGhpc3RvcmljYWwgZGF0YVxuICAgICAgICB0aGlzLmxvYWRIaXN0b3JpY2FsRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBoaXN0b3JpY2FsIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkSGlzdG9yaWNhbERhdGEoKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmV0Y2ggaGlzdG9yeSBmcm9tIEFQSVxuICAgICAgICBFeHRlbnNpb25zQVBJLmdldEhpc3RvcnkodGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQsIHtsaW1pdDogNTB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmhpc3RvcnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXlIaXN0b3JpY2FsRGF0YShyZXNwb25zZS5kYXRhLmhpc3RvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRCdXMgbm93IHNlbmRzIGRhdGEgZGlyZWN0bHkgd2l0aG91dCBkb3VibGUgbmVzdGluZ1xuICAgICAgICBjb25zdCBkYXRhID0gbWVzc2FnZTtcbiAgICAgICAgaWYgKGRhdGEuc3RhdHVzZXMgJiYgZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGRhdGEuc3RhdHVzZXNbdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWRdKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBkaXNwbGF5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNMYWJlbChzdGF0dXNEYXRhLnN0YXR1cyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIGRldmljZXNcbiAgICAgICAgdGhpcy51cGRhdGVBY3RpdmVEZXZpY2VzKHN0YXR1c0RhdGEuZGV2aWNlcyB8fCBbXSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEb24ndCBhZGQgdG8gaGlzdG9yeSAtIGhpc3RvcnkgaXMgbG9hZGVkIGZyb20gQVBJIG9ubHlcbiAgICAgICAgLy8gdGhpcy5hZGRUb0hpc3Rvcnkoc3RhdHVzRGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGxhYmVsXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGFiZWwoc3RhdHVzKSB7XG4gICAgICAgIGlmICghdGhpcy4kc3RhdHVzTGFiZWwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLmdldENvbG9yRm9yU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlW2BleF9TdGF0dXMke3N0YXR1c31gXSB8fCBzdGF0dXM7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBjbGFzcyBhbmQgdXBkYXRlIGNvbnRlbnRcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWxcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSBncmVlbiByZWQgeWVsbG93IGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKGNvbG9yKVxuICAgICAgICAgICAgLmh0bWwoYCR7bGFiZWx9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgZm9yIHN0YXR1cyB2YWx1ZVxuICAgICAqL1xuICAgIGdldENvbG9yRm9yU3RhdHVzKHN0YXR1cykge1xuICAgICAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnQXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuJztcbiAgICAgICAgICAgIGNhc2UgJ1VuYXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgY2FzZSAnRGlzYWJsZWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhY3RpdmUgZGV2aWNlcyBsaXN0XG4gICAgICovXG4gICAgdXBkYXRlQWN0aXZlRGV2aWNlcyhkZXZpY2VzKSB7XG4gICAgICAgIGlmICghdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgfHwgIUFycmF5LmlzQXJyYXkoZGV2aWNlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRldmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9BY3RpdmVEZXZpY2VzIHx8ICdObyBhY3RpdmUgZGV2aWNlcyd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBob3Jpem9udGFsIGxpc3Qgd2l0aCB0ZWFsIGxhYmVscyBsaWtlIHRoZSBvbGQgZW5kcG9pbnQtbGlzdFxuICAgICAgICBsZXQgZGV2aWNlc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzLmZvckVhY2goKGRldmljZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gZGV2aWNlLnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBkZXZpY2UuaXAgfHwgZGV2aWNlLmNvbnRhY3RfaXAgfHwgJy0nO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IGRldmljZS5wb3J0IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXBEaXNwbGF5ID0gcG9ydCA/IGAke2lwfToke3BvcnR9YCA6IGlwO1xuICAgICAgICAgICAgY29uc3QgcnR0ID0gZGV2aWNlLnJ0dCAhPT0gbnVsbCAmJiBkZXZpY2UucnR0ICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgICAgPyBgICgke2RldmljZS5ydHQudG9GaXhlZCgyKX0gbXMpYCBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt1c2VyQWdlbnR9fCR7aXB9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGV2aWNlc0h0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZWFsIGxhYmVsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3VzZXJBZ2VudH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXRhaWxcIj4ke2lwRGlzcGxheX0ke3J0dH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRldmljZXNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGRldmljZXNIdG1sKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJIHdpdGggZGV2aWNlIGdyb3VwaW5nXG4gICAgICovXG4gICAgZGlzcGxheUhpc3RvcmljYWxEYXRhKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGlmICghdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgfHwgIUFycmF5LmlzQXJyYXkoaGlzdG9yeURhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChoaXN0b3J5RGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0hpc3RvcnlBdmFpbGFibGUgfHwgJ05vIGhpc3RvcnkgYXZhaWxhYmxlJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR3JvdXAgaGlzdG9yeSBieSBkZXZpY2VcbiAgICAgICAgY29uc3QgZGV2aWNlR3JvdXBzID0gdGhpcy5ncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBIVE1MIGZvciBncm91cGVkIGRpc3BsYXkgLSBzaW1wbGlmaWVkIHN0cnVjdHVyZVxuICAgICAgICBsZXQgaGlzdG9yeUh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZWQgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBPYmplY3QuZW50cmllcyhkZXZpY2VHcm91cHMpLmZvckVhY2goKFtkZXZpY2VLZXksIHNlc3Npb25zXSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3VzZXJBZ2VudCwgaXBdID0gZGV2aWNlS2V5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VOYW1lID0gdXNlckFnZW50IHx8ICdVbmtub3duIERldmljZSc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJUCA9IChpcCAmJiBpcCAhPT0gJ1Vua25vd24nKSA/IGlwIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERldmljZSBoZWFkZXIgLSBleGFjdGx5IGFzIHJlcXVlc3RlZFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJtb2JpbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZU5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlSVAgPyBgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZXkgdGV4dFwiPigke2RldmljZUlQfSk8L3NwYW4+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlc3Npb25zIHRpbWVsaW5lIC0gc2ltcGxpZmllZFxuICAgICAgICAgICAgc2Vzc2lvbnMuZm9yRWFjaCgoc2Vzc2lvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc09ubGluZSA9IHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJztcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb24oc2Vzc2lvbi50aW1lc3RhbXAsIHNlc3Npb25zW2luZGV4IC0gMV0/LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSB0aGlzLmdldFJ0dExhYmVsKHNlc3Npb24ucnR0KTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lID0gdGhpcy5mb3JtYXRUaW1lKHNlc3Npb24uZGF0ZSB8fCBzZXNzaW9uLnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXNlIGNpcmN1bGFyIGxhYmVscyBsaWtlIGluIGV4dGVuc2lvbnMgbGlzdFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NsYXNzID0gaXNPbmxpbmUgPyAnZ3JlZW4nIDogJ2dyZXknO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c1RpdGxlID0gaXNPbmxpbmUgPyAnT25saW5lJyA6ICdPZmZsaW5lJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZHVyYXRpb24gd2l0aCB0cmFuc2xhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uVGV4dCA9IGR1cmF0aW9uICYmIGlzT25saW5lIFxuICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUgfHwgJ09ubGluZSd9ICR7ZHVyYXRpb259YCBcbiAgICAgICAgICAgICAgICAgICAgOiBkdXJhdGlvbiBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmUgfHwgJ09mZmxpbmUnfSAke2R1cmF0aW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgdGV4dFwiIHN0eWxlPVwibWFyZ2luOiA2cHggMjBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NsYXNzfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiA4cHg7IGhlaWdodDogOHB4OyBtaW4taGVpZ2h0OiA4cHg7IG1hcmdpbi1yaWdodDogOHB4O1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7c3RhdHVzVGl0bGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dGltZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAke2R1cmF0aW9uVGV4dCA/IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj4ke2R1cmF0aW9uVGV4dH08L3NwYW4+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaGlzdG9yeUh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoaGlzdG9yeUh0bWwpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgaGlzdG9yeSBldmVudHMgYnkgZGV2aWNlXG4gICAgICovXG4gICAgZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG4gICAgICAgIFxuICAgICAgICBoaXN0b3J5RGF0YS5mb3JFYWNoKGVudHJ5ID0+IHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBkZXZpY2Uga2V5IGZyb20gdXNlcl9hZ2VudCBhbmQgSVBcbiAgICAgICAgICAgIGxldCBkZXZpY2VLZXkgPSAnVW5rbm93bnxVbmtub3duJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGVudHJ5LnVzZXJfYWdlbnQgfHwgZW50cnkuaXBfYWRkcmVzcykge1xuICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke2VudHJ5LnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nfXwke2VudHJ5LmlwX2FkZHJlc3MgfHwgJ1Vua25vd24nfWA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmRldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBkZXZpY2UgaW5mbyBmcm9tIGRldGFpbHNcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IGVudHJ5LmRldGFpbHMubWF0Y2goLyhbXFx3XFxzLl0rKVxccyotXFxzKihbXFxkLl0rKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHttYXRjaFsxXS50cmltKCl9fCR7bWF0Y2hbMl0udHJpbSgpfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1tkZXZpY2VLZXldKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0ucHVzaChlbnRyeSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydCBzZXNzaW9ucyB3aXRoaW4gZWFjaCBncm91cCBieSB0aW1lc3RhbXAgKG5ld2VzdCBmaXJzdClcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBncm91cHNba2V5XS5zb3J0KChhLCBiKSA9PiBiLnRpbWVzdGFtcCAtIGEudGltZXN0YW1wKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGJldHdlZW4gdHdvIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbihjdXJyZW50VGltZXN0YW1wLCBwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgICAgICBpZiAoIXByZXZpb3VzVGltZXN0YW1wKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhwcmV2aW91c1RpbWVzdGFtcCAtIGN1cnJlbnRUaW1lc3RhbXApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lIGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgZm9ybWF0VGltZShkYXRlU3RyKSB7XG4gICAgICAgIGlmICghZGF0ZVN0cikgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhbHJlYWR5IGEgZm9ybWF0dGVkIGRhdGUgc3RyaW5nIGxpa2UgXCIyMDI1LTA5LTExIDExOjMwOjM2XCJcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnc3RyaW5nJyAmJiBkYXRlU3RyLmluY2x1ZGVzKCcgJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVQYXJ0ID0gZGF0ZVN0ci5zcGxpdCgnICcpWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVQYXJ0IHx8IGRhdGVTdHI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYSB0aW1lc3RhbXBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIgKiAxMDAwKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0ZVN0cjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBSVFQgbGFiZWwgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgKi9cbiAgICBnZXRSdHRMYWJlbChydHQpIHtcbiAgICAgICAgaWYgKHJ0dCA9PT0gbnVsbCB8fCBydHQgPT09IHVuZGVmaW5lZCB8fCBydHQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICBpZiAocnR0ID4gMTUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdyZWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHJ0dCA+IDUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdvbGl2ZSc7ICAvLyB5ZWxsb3cgY2FuIGJlIGhhcmQgdG8gc2VlLCBvbGl2ZSBpcyBiZXR0ZXJcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInVpICR7Y29sb3J9IHRleHRcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+W1JUVDogJHtydHQudG9GaXhlZCgwKX1tc108L3NwYW4+YDtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoJ2V4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSBudWxsO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvcjtcbn0iXX0=