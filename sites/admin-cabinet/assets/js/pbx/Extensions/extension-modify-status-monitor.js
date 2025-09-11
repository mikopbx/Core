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
      return $numberField.val();
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
        return 'red';

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCJpbml0aWFsaXplIiwiZXh0cmFjdEV4dGVuc2lvbklkIiwiY2FjaGVFbGVtZW50cyIsInN1YnNjcmliZVRvRXZlbnRzIiwibG9hZEluaXRpYWxTdGF0dXMiLCIkbnVtYmVyRmllbGQiLCIkIiwibGVuZ3RoIiwidmFsIiwidXJsTWF0Y2giLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwibWF0Y2giLCJzZXRUaW1lb3V0IiwiRXh0ZW5zaW9uc0FQSSIsImdldFN0YXR1cyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInVwZGF0ZVN0YXR1cyIsImxvYWRIaXN0b3JpY2FsRGF0YSIsImdldEhpc3RvcnkiLCJsaW1pdCIsImhpc3RvcnkiLCJkaXNwbGF5SGlzdG9yaWNhbERhdGEiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudEJ1c01lc3NhZ2UiLCJzdGF0dXNlcyIsInN0YXR1c0RhdGEiLCJ1cGRhdGVTdGF0dXNMYWJlbCIsInN0YXR1cyIsInVwZGF0ZUFjdGl2ZURldmljZXMiLCJkZXZpY2VzIiwiY29sb3IiLCJnZXRDb2xvckZvclN0YXR1cyIsImxhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJleF9Ob0FjdGl2ZURldmljZXMiLCJkZXZpY2VzSHRtbCIsImZvckVhY2giLCJkZXZpY2UiLCJ1c2VyQWdlbnQiLCJ1c2VyX2FnZW50IiwiaXAiLCJjb250YWN0X2lwIiwicG9ydCIsImlwRGlzcGxheSIsInJ0dCIsInVuZGVmaW5lZCIsInRvRml4ZWQiLCJpZCIsImhpc3RvcnlEYXRhIiwiZXhfTm9IaXN0b3J5QXZhaWxhYmxlIiwiZGV2aWNlR3JvdXBzIiwiZ3JvdXBIaXN0b3J5QnlEZXZpY2UiLCJoaXN0b3J5SHRtbCIsIk9iamVjdCIsImVudHJpZXMiLCJkZXZpY2VLZXkiLCJzZXNzaW9ucyIsInNwbGl0IiwiZGV2aWNlTmFtZSIsImRldmljZUlQIiwic2Vzc2lvbiIsImluZGV4IiwiaXNPbmxpbmUiLCJkdXJhdGlvbiIsImNhbGN1bGF0ZUR1cmF0aW9uIiwidGltZXN0YW1wIiwicnR0TGFiZWwiLCJnZXRSdHRMYWJlbCIsInRpbWUiLCJmb3JtYXRUaW1lIiwiZGF0ZSIsInN0YXR1c0NsYXNzIiwic3RhdHVzVGl0bGUiLCJkdXJhdGlvblRleHQiLCJleF9PbmxpbmUiLCJleF9PZmZsaW5lIiwiZ3JvdXBzIiwiZW50cnkiLCJpcF9hZGRyZXNzIiwiZGV0YWlscyIsInRyaW0iLCJwdXNoIiwia2V5cyIsImtleSIsInNvcnQiLCJhIiwiYiIsImN1cnJlbnRUaW1lc3RhbXAiLCJwcmV2aW91c1RpbWVzdGFtcCIsImRpZmYiLCJNYXRoIiwiYWJzIiwibWludXRlcyIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZGF0ZVN0ciIsImluY2x1ZGVzIiwidGltZVBhcnQiLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiZGVzdHJveSIsInVuc3Vic2NyaWJlIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSw0QkFBNEIsR0FBRztBQUNqQ0MsRUFBQUEsU0FBUyxFQUFFLGtCQURz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QixDQUFiO0FBQ0EsYUFBTzFCLElBQUksQ0FBQzhCLGtCQUFMLEVBQVA7QUFDSDs7QUFFRCxXQUFPSixPQUFQO0FBQ0gsR0E3WWdDOztBQStZakM7QUFDSjtBQUNBO0FBQ0k3QixFQUFBQSxXQWxaaUMsdUJBa1pyQnZCLEdBbFpxQixFQWtaaEI7QUFDYixRQUFJQSxHQUFHLEtBQUssSUFBUixJQUFnQkEsR0FBRyxLQUFLQyxTQUF4QixJQUFxQ0QsR0FBRyxJQUFJLENBQWhELEVBQW1EO0FBQy9DLGFBQU8sRUFBUDtBQUNIOztBQUVELFFBQUluQixLQUFLLEdBQUcsT0FBWjs7QUFDQSxRQUFJbUIsR0FBRyxHQUFHLEdBQVYsRUFBZTtBQUNYbkIsTUFBQUEsS0FBSyxHQUFHLEtBQVI7QUFDSCxLQUZELE1BRU8sSUFBSW1CLEdBQUcsR0FBRyxFQUFWLEVBQWM7QUFDakJuQixNQUFBQSxLQUFLLEdBQUcsT0FBUixDQURpQixDQUNDO0FBQ3JCOztBQUVELHNDQUEwQkEsS0FBMUIsdURBQXlFbUIsR0FBRyxDQUFDRSxPQUFKLENBQVksQ0FBWixDQUF6RTtBQUNILEdBL1pnQzs7QUFrYWpDO0FBQ0o7QUFDQTtBQUNJdUQsRUFBQUEsT0FyYWlDLHFCQXFhdkI7QUFDTixRQUFJLE9BQU90RixRQUFQLEtBQW9CLFdBQXhCLEVBQXFDO0FBQ2pDQSxNQUFBQSxRQUFRLENBQUN1RixXQUFULENBQXFCLGtCQUFyQjtBQUNIOztBQUNELFNBQUt0SCxhQUFMLEdBQXFCLEtBQXJCO0FBQ0EsU0FBS0Msa0JBQUwsR0FBMEIsSUFBMUI7QUFDSDtBQTNhZ0MsQ0FBckMsQyxDQThhQTs7QUFDQSxJQUFJLE9BQU9zSCxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUIxSCw0QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV2ZW50QnVzLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogRXh0ZW5zaW9uIE1vZGlmeSBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxpZmllZCBzdGF0dXMgbW9uaXRvcmluZyBmb3IgZXh0ZW5zaW9uIG1vZGlmeSBwYWdlOlxuICogLSBTaW5nbGUgQVBJIGNhbGwgb24gaW5pdGlhbGl6YXRpb25cbiAqIC0gUmVhbC10aW1lIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIG9ubHlcbiAqIC0gTm8gcGVyaW9kaWMgcG9sbGluZ1xuICogLSBDbGVhbiBkZXZpY2UgbGlzdCBhbmQgaGlzdG9yeSBkaXNwbGF5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgPSB7XG4gICAgY2hhbm5lbElkOiAnZXh0ZW5zaW9uLXN0YXR1cycsXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG4gICAgY3VycmVudEV4dGVuc2lvbklkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0xhYmVsOiBudWxsLFxuICAgICRhY3RpdmVEZXZpY2VzTGlzdDogbnVsbCxcbiAgICAkZGV2aWNlSGlzdG9yeUxpc3Q6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZXh0ZW5zaW9uIG51bWJlciBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgaW5pdGlhbCBBUEkgY2FsbFxuICAgICAgICB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBleHRlbnNpb24gSUQgZnJvbSB0aGUgZm9ybVxuICAgICAqL1xuICAgIGV4dHJhY3RFeHRlbnNpb25JZCgpIHtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byBnZXQgdGhlIHBob25lIG51bWJlciBmcm9tIGZvcm0gZmllbGQgKHByaW1hcnkpXG4gICAgICAgIGNvbnN0ICRudW1iZXJGaWVsZCA9ICQoJ2lucHV0W25hbWU9XCJudW1iZXJcIl0nKTtcbiAgICAgICAgaWYgKCRudW1iZXJGaWVsZC5sZW5ndGggJiYgJG51bWJlckZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gJG51bWJlckZpZWxkLnZhbCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjayB0byBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybE1hdGNoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9cXC9leHRlbnNpb25zXFwvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGlmICh1cmxNYXRjaCAmJiB1cmxNYXRjaFsxXSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBkYXRhYmFzZSBJRCwgd2UgbmVlZCB0byB3YWl0IGZvciBmb3JtIHRvIGxvYWRcbiAgICAgICAgICAgIC8vIFdlJ2xsIGdldCB0aGUgYWN0dWFsIGV4dGVuc2lvbiBudW1iZXIgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICovXG4gICAgY2FjaGVFbGVtZW50cygpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWwgPSAkKCcjc3RhdHVzJyk7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0ID0gJCgnI2FjdGl2ZS1kZXZpY2VzLWxpc3QnKTtcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgPSAkKCcjZGV2aWNlLWhpc3RvcnktbGlzdCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBpbml0aWFsIHN0YXR1cyB3aXRoIHNpbmdsZSBBUEkgY2FsbFxuICAgICAqL1xuICAgIGxvYWRJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBSZS1jaGVjayBleHRlbnNpb24gSUQgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IHRoaXMuZXh0cmFjdEV4dGVuc2lvbklkKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFnYWluIGFmdGVyIGRlbGF5IChmb3JtIG1pZ2h0IHN0aWxsIGJlIGxvYWRpbmcpXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCksIDUwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgQVBJIGNhbGwgZm9yIGN1cnJlbnQgc3RhdHVzXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0U3RhdHVzKHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gbG9hZCBoaXN0b3JpY2FsIGRhdGFcbiAgICAgICAgdGhpcy5sb2FkSGlzdG9yaWNhbERhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZEhpc3RvcmljYWxEYXRhKCkge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZldGNoIGhpc3RvcnkgZnJvbSBBUElcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRIaXN0b3J5KHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCB7bGltaXQ6IDUwfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5oaXN0b3J5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5SGlzdG9yaWNhbERhdGEocmVzcG9uc2UuZGF0YS5oaXN0b3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2V4dGVuc2lvbi1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBFdmVudEJ1cyBtZXNzYWdlXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdyBzZW5kcyBkYXRhIGRpcmVjdGx5IHdpdGhvdXQgZG91YmxlIG5lc3RpbmdcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2U7XG4gICAgICAgIGlmIChkYXRhLnN0YXR1c2VzICYmIGRhdGEuc3RhdHVzZXNbdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWRdKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNEYXRhKSB7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdHVzIGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzTGFiZWwoc3RhdHVzRGF0YS5zdGF0dXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBkZXZpY2VzXG4gICAgICAgIHRoaXMudXBkYXRlQWN0aXZlRGV2aWNlcyhzdGF0dXNEYXRhLmRldmljZXMgfHwgW10pO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9uJ3QgYWRkIHRvIGhpc3RvcnkgLSBoaXN0b3J5IGlzIGxvYWRlZCBmcm9tIEFQSSBvbmx5XG4gICAgICAgIC8vIHRoaXMuYWRkVG9IaXN0b3J5KHN0YXR1c0RhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1cykge1xuICAgICAgICBpZiAoIXRoaXMuJHN0YXR1c0xhYmVsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpO1xuICAgICAgICBjb25zdCBsYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZVtgZXhfU3RhdHVzJHtzdGF0dXN9YF0gfHwgc3RhdHVzO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBjb250ZW50XG4gICAgICAgIHRoaXMuJHN0YXR1c0xhYmVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZXkgZ3JlZW4gcmVkIHllbGxvdyBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhjb2xvcilcbiAgICAgICAgICAgIC5odG1sKGAke2xhYmVsfWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGNvbG9yIGZvciBzdGF0dXMgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpIHtcbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ0F2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVbmF2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQnO1xuICAgICAgICAgICAgY2FzZSAnRGlzYWJsZWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhY3RpdmUgZGV2aWNlcyBsaXN0XG4gICAgICovXG4gICAgdXBkYXRlQWN0aXZlRGV2aWNlcyhkZXZpY2VzKSB7XG4gICAgICAgIGlmICghdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgfHwgIUFycmF5LmlzQXJyYXkoZGV2aWNlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRldmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9BY3RpdmVEZXZpY2VzIHx8ICdObyBhY3RpdmUgZGV2aWNlcyd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBob3Jpem9udGFsIGxpc3Qgd2l0aCB0ZWFsIGxhYmVscyBsaWtlIHRoZSBvbGQgZW5kcG9pbnQtbGlzdFxuICAgICAgICBsZXQgZGV2aWNlc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzLmZvckVhY2goKGRldmljZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gZGV2aWNlLnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBkZXZpY2UuaXAgfHwgZGV2aWNlLmNvbnRhY3RfaXAgfHwgJy0nO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IGRldmljZS5wb3J0IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXBEaXNwbGF5ID0gcG9ydCA/IGAke2lwfToke3BvcnR9YCA6IGlwO1xuICAgICAgICAgICAgY29uc3QgcnR0ID0gZGV2aWNlLnJ0dCAhPT0gbnVsbCAmJiBkZXZpY2UucnR0ICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgICAgPyBgICgke2RldmljZS5ydHQudG9GaXhlZCgyKX0gbXMpYCBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt1c2VyQWdlbnR9fCR7aXB9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGV2aWNlc0h0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZWFsIGxhYmVsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3VzZXJBZ2VudH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXRhaWxcIj4ke2lwRGlzcGxheX0ke3J0dH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRldmljZXNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGRldmljZXNIdG1sKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJIHdpdGggZGV2aWNlIGdyb3VwaW5nXG4gICAgICovXG4gICAgZGlzcGxheUhpc3RvcmljYWxEYXRhKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGlmICghdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgfHwgIUFycmF5LmlzQXJyYXkoaGlzdG9yeURhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChoaXN0b3J5RGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0hpc3RvcnlBdmFpbGFibGUgfHwgJ05vIGhpc3RvcnkgYXZhaWxhYmxlJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR3JvdXAgaGlzdG9yeSBieSBkZXZpY2VcbiAgICAgICAgY29uc3QgZGV2aWNlR3JvdXBzID0gdGhpcy5ncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBIVE1MIGZvciBncm91cGVkIGRpc3BsYXkgLSBzaW1wbGlmaWVkIHN0cnVjdHVyZVxuICAgICAgICBsZXQgaGlzdG9yeUh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZWQgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBPYmplY3QuZW50cmllcyhkZXZpY2VHcm91cHMpLmZvckVhY2goKFtkZXZpY2VLZXksIHNlc3Npb25zXSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3VzZXJBZ2VudCwgaXBdID0gZGV2aWNlS2V5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VOYW1lID0gdXNlckFnZW50IHx8ICdVbmtub3duIERldmljZSc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJUCA9IChpcCAmJiBpcCAhPT0gJ1Vua25vd24nKSA/IGlwIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERldmljZSBoZWFkZXIgLSBleGFjdGx5IGFzIHJlcXVlc3RlZFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJtb2JpbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZU5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlSVAgPyBgPHNwYW4gY2xhc3M9XCJ1aSB0aW55IGdyZXkgdGV4dFwiPigke2RldmljZUlQfSk8L3NwYW4+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlc3Npb25zIHRpbWVsaW5lIC0gc2ltcGxpZmllZFxuICAgICAgICAgICAgc2Vzc2lvbnMuZm9yRWFjaCgoc2Vzc2lvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc09ubGluZSA9IHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJztcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb24oc2Vzc2lvbi50aW1lc3RhbXAsIHNlc3Npb25zW2luZGV4IC0gMV0/LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSB0aGlzLmdldFJ0dExhYmVsKHNlc3Npb24ucnR0KTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lID0gdGhpcy5mb3JtYXRUaW1lKHNlc3Npb24uZGF0ZSB8fCBzZXNzaW9uLnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXNlIGNpcmN1bGFyIGxhYmVscyBsaWtlIGluIGV4dGVuc2lvbnMgbGlzdFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NsYXNzID0gaXNPbmxpbmUgPyAnZ3JlZW4nIDogJ2dyZXknO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c1RpdGxlID0gaXNPbmxpbmUgPyAnT25saW5lJyA6ICdPZmZsaW5lJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZHVyYXRpb24gd2l0aCB0cmFuc2xhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uVGV4dCA9IGR1cmF0aW9uICYmIGlzT25saW5lIFxuICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUgfHwgJ09ubGluZSd9ICR7ZHVyYXRpb259YCBcbiAgICAgICAgICAgICAgICAgICAgOiBkdXJhdGlvbiBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmUgfHwgJ09mZmxpbmUnfSAke2R1cmF0aW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgdGV4dFwiIHN0eWxlPVwibWFyZ2luOiA2cHggMjBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NsYXNzfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiA4cHg7IGhlaWdodDogOHB4OyBtaW4taGVpZ2h0OiA4cHg7IG1hcmdpbi1yaWdodDogOHB4O1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7c3RhdHVzVGl0bGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dGltZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAke2R1cmF0aW9uVGV4dCA/IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj4ke2R1cmF0aW9uVGV4dH08L3NwYW4+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaGlzdG9yeUh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoaGlzdG9yeUh0bWwpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgaGlzdG9yeSBldmVudHMgYnkgZGV2aWNlXG4gICAgICovXG4gICAgZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG4gICAgICAgIFxuICAgICAgICBoaXN0b3J5RGF0YS5mb3JFYWNoKGVudHJ5ID0+IHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBkZXZpY2Uga2V5IGZyb20gdXNlcl9hZ2VudCBhbmQgSVBcbiAgICAgICAgICAgIGxldCBkZXZpY2VLZXkgPSAnVW5rbm93bnxVbmtub3duJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGVudHJ5LnVzZXJfYWdlbnQgfHwgZW50cnkuaXBfYWRkcmVzcykge1xuICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke2VudHJ5LnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nfXwke2VudHJ5LmlwX2FkZHJlc3MgfHwgJ1Vua25vd24nfWA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmRldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBkZXZpY2UgaW5mbyBmcm9tIGRldGFpbHNcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IGVudHJ5LmRldGFpbHMubWF0Y2goLyhbXFx3XFxzLl0rKVxccyotXFxzKihbXFxkLl0rKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHttYXRjaFsxXS50cmltKCl9fCR7bWF0Y2hbMl0udHJpbSgpfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1tkZXZpY2VLZXldKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0ucHVzaChlbnRyeSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydCBzZXNzaW9ucyB3aXRoaW4gZWFjaCBncm91cCBieSB0aW1lc3RhbXAgKG5ld2VzdCBmaXJzdClcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBncm91cHNba2V5XS5zb3J0KChhLCBiKSA9PiBiLnRpbWVzdGFtcCAtIGEudGltZXN0YW1wKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZ3JvdXBzO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGJldHdlZW4gdHdvIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbihjdXJyZW50VGltZXN0YW1wLCBwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgICAgICBpZiAoIXByZXZpb3VzVGltZXN0YW1wKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhwcmV2aW91c1RpbWVzdGFtcCAtIGN1cnJlbnRUaW1lc3RhbXApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lIGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgZm9ybWF0VGltZShkYXRlU3RyKSB7XG4gICAgICAgIGlmICghZGF0ZVN0cikgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhbHJlYWR5IGEgZm9ybWF0dGVkIGRhdGUgc3RyaW5nIGxpa2UgXCIyMDI1LTA5LTExIDExOjMwOjM2XCJcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnc3RyaW5nJyAmJiBkYXRlU3RyLmluY2x1ZGVzKCcgJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVQYXJ0ID0gZGF0ZVN0ci5zcGxpdCgnICcpWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVQYXJ0IHx8IGRhdGVTdHI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYSB0aW1lc3RhbXBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIgKiAxMDAwKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0ZVN0cjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBSVFQgbGFiZWwgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgKi9cbiAgICBnZXRSdHRMYWJlbChydHQpIHtcbiAgICAgICAgaWYgKHJ0dCA9PT0gbnVsbCB8fCBydHQgPT09IHVuZGVmaW5lZCB8fCBydHQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICBpZiAocnR0ID4gMTUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdyZWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHJ0dCA+IDUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdvbGl2ZSc7ICAvLyB5ZWxsb3cgY2FuIGJlIGhhcmQgdG8gc2VlLCBvbGl2ZSBpcyBiZXR0ZXJcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInVpICR7Y29sb3J9IHRleHRcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+W1JUVDogJHtydHQudG9GaXhlZCgwKX1tc108L3NwYW4+YDtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoJ2V4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSBudWxsO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvcjtcbn0iXX0=