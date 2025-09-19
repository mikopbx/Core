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
   * Update interval timer
   */
  updateTimer: null,

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

    this.loadInitialStatus(); // Start timer for updating online durations

    this.startDurationUpdateTimer();
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
    } // Use list with teal labels like the old endpoint-list


    var devicesHtml = '<div class="ui list">';
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
    this.$activeDevicesList.html(devicesHtml); // Add click handler to copy IP address

    this.attachDeviceClickHandlers();
  },

  /**
   * Attach click handlers to device labels for IP copying
   */
  attachDeviceClickHandlers: function attachDeviceClickHandlers() {
    this.$activeDevicesList.find('.item .ui.label').on('click', function (e) {
      e.preventDefault();
      var $label = $(this);
      var $item = $label.closest('.item');
      var dataId = $item.data('id');
      if (!dataId) return; // Extract IP from data-id (format: "UserAgent|IP")

      var parts = dataId.split('|');
      var ip = parts[1];
      if (!ip || ip === '-') return; // Copy to clipboard using the same method as password widget

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ip).then(function () {
          // Show success feedback
          $label.transition('pulse'); // Temporarily change the label color to indicate success

          $label.removeClass('teal').addClass('green');
          setTimeout(function () {
            $label.removeClass('green').addClass('teal');
          }, 1000); // Show popup message

          $label.popup({
            content: "".concat(globalTranslate.ex_IpCopied || 'IP copied', ": ").concat(ip),
            on: 'manual',
            position: 'top center'
          }).popup('show');
          setTimeout(function () {
            $label.popup('hide').popup('destroy');
          }, 2000);
        })["catch"](function (err) {
          console.error('Failed to copy IP:', err);
        });
      } else {
        // Fallback for older browsers
        var $temp = $('<input>');
        $('body').append($temp);
        $temp.val(ip).select();
        document.execCommand('copy');
        $temp.remove(); // Show feedback

        $label.transition('pulse');
        $label.removeClass('teal').addClass('green');
        setTimeout(function () {
          $label.removeClass('green').addClass('teal');
        }, 1000);
      }
    }); // Add cursor pointer style

    this.$activeDevicesList.find('.item .ui.label').css('cursor', 'pointer');
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

      historyHtml += "\n                <div class=\"item\">\n                    <div class=\"content\">\n                        <div class=\"ui small header\">\n                            <i class=\"mobile alternate icon\"></i>\n                            <div class=\"content\">\n                                ".concat(deviceName, "\n                                ").concat(deviceIP ? "<span style=\"color: grey; font-size:0.7em;\">".concat(deviceIP, "</>") : '', "\n                            </div>\n                        </div>\n                        <div class=\"description\">\n            "); // Sessions timeline - simplified

      sessions.forEach(function (session, index) {
        // Check event type to determine actual device status
        var isOnline = session.status === 'Available';
        var eventLabel = ''; // Handle device-specific events

        if (session.event_type === 'device_removed') {
          isOnline = false;
          eventLabel = " ".concat(globalTranslate.ex_DeviceDisconnected || 'Disconnected');
        } else if (session.event_type === 'device_added') {
          isOnline = true;
          eventLabel = " ".concat(globalTranslate.ex_DeviceConnected || 'Connected');
        }

        var rttLabel = _this4.getRttLabel(session.rtt);

        var time = _this4.formatTime(session.date || session.timestamp); // Use circular labels like in extensions list


        var statusClass = isOnline ? 'green' : 'grey';
        var statusTitle = isOnline ? 'Online' : 'Offline';
        var durationHtml = ''; // For the first (most recent) entry that is online, add live duration

        if (index === 0 && isOnline && session.event_type !== 'device_removed') {
          // Add data attribute with timestamp for live updating
          durationHtml = "<span class=\"ui grey text online-duration\" style=\"margin-left: 8px;\"\n                                          data-online-since=\"".concat(session.timestamp, "\">\n                                          ").concat(globalTranslate.ex_Online || 'Online', " ").concat(_this4.calculateDurationFromNow(session.timestamp), "\n                                     </span>");
        } else {
          var _sessions;

          // Calculate static duration for historical entries
          var duration = _this4.calculateDuration(session.timestamp, (_sessions = sessions[index - 1]) === null || _sessions === void 0 ? void 0 : _sessions.timestamp); // Format duration with translation


          var durationText = duration && isOnline ? "".concat(globalTranslate.ex_Online || 'Online', " ").concat(duration) : duration ? "".concat(globalTranslate.ex_Offline || 'Offline', " ").concat(duration) : '';

          if (durationText) {
            durationHtml = "<span class=\"ui grey text\" style=\"margin-left: 8px;\">".concat(durationText, "</span>");
          }
        }

        historyHtml += "\n                    <div class=\"ui small text\" style=\"margin: 6px 20px; display: flex; align-items: center;\">\n                        <div class=\"ui ".concat(statusClass, " empty circular label\"\n                             style=\"width: 8px; height: 8px; min-height: 8px; margin-right: 8px;\"\n                             title=\"").concat(statusTitle, "\">\n                        </div>\n                        ").concat(time, "\n                        ").concat(rttLabel, "\n                        ").concat(durationHtml || eventLabel, "\n                    </div>\n                ");
      });
      historyHtml += "\n                        </div>\n                    </div>\n                </div>\n            ";
    });
    historyHtml += '</div>';
    this.$deviceHistoryList.html(historyHtml);
  },

  /**
   * Group history events by device and sort by last event
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
    }); // Convert to array and sort by most recent event

    var sortedGroups = Object.entries(groups).sort(function (a, b) {
      var _a$1$, _b$1$;

      // Get the most recent timestamp from each group (first element since already sorted)
      var aLatest = ((_a$1$ = a[1][0]) === null || _a$1$ === void 0 ? void 0 : _a$1$.timestamp) || 0;
      var bLatest = ((_b$1$ = b[1][0]) === null || _b$1$ === void 0 ? void 0 : _b$1$.timestamp) || 0;
      return bLatest - aLatest;
    }); // Convert back to object with sorted keys

    var sortedObject = {};
    sortedGroups.forEach(function (_ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          key = _ref4[0],
          value = _ref4[1];

      sortedObject[key] = value;
    });
    return sortedObject;
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
   * Calculate duration from timestamp to now
   */
  calculateDurationFromNow: function calculateDurationFromNow(timestamp) {
    var now = Math.floor(Date.now() / 1000);
    var diff = now - timestamp;
    if (diff < 0) return '0s';
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
   * Start timer to update online durations
   */
  startDurationUpdateTimer: function startDurationUpdateTimer() {
    var _this5 = this;

    // Clear any existing timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    } // Update every 10 seconds


    this.updateTimer = setInterval(function () {
      _this5.updateOnlineDurations();
    }, 10000);
  },

  /**
   * Update all online duration displays
   */
  updateOnlineDurations: function updateOnlineDurations() {
    var _this$$deviceHistoryL,
        _this6 = this;

    var $durations = (_this$$deviceHistoryL = this.$deviceHistoryList) === null || _this$$deviceHistoryL === void 0 ? void 0 : _this$$deviceHistoryL.find('.online-duration[data-online-since]');

    if (!$durations || $durations.length === 0) {
      return;
    }

    $durations.each(function (index, element) {
      var $element = $(element);
      var onlineSince = parseInt($element.data('online-since'), 10);

      if (onlineSince) {
        var duration = _this6.calculateDurationFromNow(onlineSince);

        $element.text("".concat(globalTranslate.ex_Online || 'Online', " ").concat(duration));
      }
    });
  },

  /**
   * Cleanup on page unload
   */
  destroy: function destroy() {
    // Clear update timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCJ1cGRhdGVUaW1lciIsImluaXRpYWxpemUiLCJleHRyYWN0RXh0ZW5zaW9uSWQiLCJjYWNoZUVsZW1lbnRzIiwic3Vic2NyaWJlVG9FdmVudHMiLCJsb2FkSW5pdGlhbFN0YXR1cyIsInN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lciIsIiRudW1iZXJGaWVsZCIsIiQiLCJsZW5ndGgiLCJ2YWwiLCJleHRlbnNpb25OdW1iZXIiLCJpbnB1dG1hc2siLCJlIiwicmVwbGFjZSIsInVybE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwic2V0VGltZW91dCIsIkV4dGVuc2lvbnNBUEkiLCJnZXRTdGF0dXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cGRhdGVTdGF0dXMiLCJsb2FkSGlzdG9yaWNhbERhdGEiLCJnZXRIaXN0b3J5IiwibGltaXQiLCJoaXN0b3J5IiwiZGlzcGxheUhpc3RvcmljYWxEYXRhIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJtZXNzYWdlIiwiaGFuZGxlRXZlbnRCdXNNZXNzYWdlIiwic3RhdHVzZXMiLCJzdGF0dXNEYXRhIiwidXBkYXRlU3RhdHVzTGFiZWwiLCJzdGF0dXMiLCJ1cGRhdGVBY3RpdmVEZXZpY2VzIiwiZGV2aWNlcyIsImNvbG9yIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJsYWJlbCIsImdsb2JhbFRyYW5zbGF0ZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJodG1sIiwiQXJyYXkiLCJpc0FycmF5IiwiZXhfTm9BY3RpdmVEZXZpY2VzIiwiZGV2aWNlc0h0bWwiLCJmb3JFYWNoIiwiZGV2aWNlIiwidXNlckFnZW50IiwidXNlcl9hZ2VudCIsImlwIiwiY29udGFjdF9pcCIsInBvcnQiLCJpcERpc3BsYXkiLCJydHQiLCJ1bmRlZmluZWQiLCJ0b0ZpeGVkIiwiaWQiLCJhdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzIiwiZmluZCIsIm9uIiwicHJldmVudERlZmF1bHQiLCIkbGFiZWwiLCIkaXRlbSIsImNsb3Nlc3QiLCJkYXRhSWQiLCJwYXJ0cyIsInNwbGl0IiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsInRyYW5zaXRpb24iLCJwb3B1cCIsImNvbnRlbnQiLCJleF9JcENvcGllZCIsInBvc2l0aW9uIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwiJHRlbXAiLCJhcHBlbmQiLCJzZWxlY3QiLCJkb2N1bWVudCIsImV4ZWNDb21tYW5kIiwicmVtb3ZlIiwiY3NzIiwiaGlzdG9yeURhdGEiLCJleF9Ob0hpc3RvcnlBdmFpbGFibGUiLCJkZXZpY2VHcm91cHMiLCJncm91cEhpc3RvcnlCeURldmljZSIsImhpc3RvcnlIdG1sIiwiT2JqZWN0IiwiZW50cmllcyIsImRldmljZUtleSIsInNlc3Npb25zIiwiZGV2aWNlTmFtZSIsImRldmljZUlQIiwic2Vzc2lvbiIsImluZGV4IiwiaXNPbmxpbmUiLCJldmVudExhYmVsIiwiZXZlbnRfdHlwZSIsImV4X0RldmljZURpc2Nvbm5lY3RlZCIsImV4X0RldmljZUNvbm5lY3RlZCIsInJ0dExhYmVsIiwiZ2V0UnR0TGFiZWwiLCJ0aW1lIiwiZm9ybWF0VGltZSIsImRhdGUiLCJ0aW1lc3RhbXAiLCJzdGF0dXNDbGFzcyIsInN0YXR1c1RpdGxlIiwiZHVyYXRpb25IdG1sIiwiZXhfT25saW5lIiwiY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93IiwiZHVyYXRpb24iLCJjYWxjdWxhdGVEdXJhdGlvbiIsImR1cmF0aW9uVGV4dCIsImV4X09mZmxpbmUiLCJncm91cHMiLCJlbnRyeSIsImlwX2FkZHJlc3MiLCJkZXRhaWxzIiwidHJpbSIsInB1c2giLCJrZXlzIiwia2V5Iiwic29ydCIsImEiLCJiIiwic29ydGVkR3JvdXBzIiwiYUxhdGVzdCIsImJMYXRlc3QiLCJzb3J0ZWRPYmplY3QiLCJ2YWx1ZSIsImN1cnJlbnRUaW1lc3RhbXAiLCJwcmV2aW91c1RpbWVzdGFtcCIsImRpZmYiLCJNYXRoIiwiYWJzIiwibWludXRlcyIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZGF0ZVN0ciIsImluY2x1ZGVzIiwidGltZVBhcnQiLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwibm93IiwiY2xlYXJJbnRlcnZhbCIsInNldEludGVydmFsIiwidXBkYXRlT25saW5lRHVyYXRpb25zIiwiJGR1cmF0aW9ucyIsImVhY2giLCJlbGVtZW50IiwiJGVsZW1lbnQiLCJvbmxpbmVTaW5jZSIsInBhcnNlSW50IiwidGV4dCIsImRlc3Ryb3kiLCJ1bnN1YnNjcmliZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsNEJBQTRCLEdBQUc7QUFDakNDLEVBQUFBLFNBQVMsRUFBRSxrQkFEc0I7QUFFakNDLEVBQUFBLGFBQWEsRUFBRSxLQUZrQjtBQUdqQ0MsRUFBQUEsa0JBQWtCLEVBQUUsSUFIYTs7QUFLakM7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVJtQjtBQVNqQ0MsRUFBQUEsa0JBQWtCLEVBQUUsSUFUYTtBQVVqQ0MsRUFBQUEsa0JBQWtCLEVBQUUsSUFWYTs7QUFZakM7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRSxJQWZvQjs7QUFpQmpDO0FB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OUIsQ0FBakI7O0FBQ0FELFFBQUFBLFFBQVEsQ0FBQ0csSUFBVCxXQUFpQjFILGVBQWUsQ0FBQzRFLFNBQWhCLElBQTZCLFFBQTlDLGNBQTBERSxRQUExRDtBQUNIO0FBQ0osS0FQRDtBQVFILEdBcm1CZ0M7O0FBd21CakM7QUFDSjtBQUNBO0FBQ0k2QyxFQUFBQSxPQTNtQmlDLHFCQTJtQnZCO0FBQ047QUFDQSxRQUFJLEtBQUt4SyxXQUFULEVBQXNCO0FBQ2xCOEosTUFBQUEsYUFBYSxDQUFDLEtBQUs5SixXQUFOLENBQWI7QUFDQSxXQUFLQSxXQUFMLEdBQW1CLElBQW5CO0FBQ0g7O0FBRUQsUUFBSSxPQUFPZ0MsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNqQ0EsTUFBQUEsUUFBUSxDQUFDeUksV0FBVCxDQUFxQixrQkFBckI7QUFDSDs7QUFDRCxTQUFLOUssYUFBTCxHQUFxQixLQUFyQjtBQUNBLFNBQUtDLGtCQUFMLEdBQTBCLElBQTFCO0FBQ0g7QUF2bkJnQyxDQUFyQyxDLENBMG5CQTs7QUFDQSxJQUFJLE9BQU84SyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJsTCw0QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV2ZW50QnVzLCBFeHRlbnNpb25zQVBJICovXG5cbi8qKlxuICogRXh0ZW5zaW9uIE1vZGlmeSBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxpZmllZCBzdGF0dXMgbW9uaXRvcmluZyBmb3IgZXh0ZW5zaW9uIG1vZGlmeSBwYWdlOlxuICogLSBTaW5nbGUgQVBJIGNhbGwgb24gaW5pdGlhbGl6YXRpb25cbiAqIC0gUmVhbC10aW1lIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIG9ubHlcbiAqIC0gTm8gcGVyaW9kaWMgcG9sbGluZ1xuICogLSBDbGVhbiBkZXZpY2UgbGlzdCBhbmQgaGlzdG9yeSBkaXNwbGF5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgPSB7XG4gICAgY2hhbm5lbElkOiAnZXh0ZW5zaW9uLXN0YXR1cycsXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG4gICAgY3VycmVudEV4dGVuc2lvbklkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0xhYmVsOiBudWxsLFxuICAgICRhY3RpdmVEZXZpY2VzTGlzdDogbnVsbCxcbiAgICAkZGV2aWNlSGlzdG9yeUxpc3Q6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGludGVydmFsIHRpbWVyXG4gICAgICovXG4gICAgdXBkYXRlVGltZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZXh0ZW5zaW9uIG51bWJlciBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRzKCk7XG5cbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgaW5pdGlhbCBBUEkgY2FsbFxuICAgICAgICB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGltZXIgZm9yIHVwZGF0aW5nIG9ubGluZSBkdXJhdGlvbnNcbiAgICAgICAgdGhpcy5zdGFydER1cmF0aW9uVXBkYXRlVGltZXIoKTtcblxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBleHRlbnNpb24gSUQgZnJvbSB0aGUgZm9ybVxuICAgICAqL1xuICAgIGV4dHJhY3RFeHRlbnNpb25JZCgpIHtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byBnZXQgdGhlIHBob25lIG51bWJlciBmcm9tIGZvcm0gZmllbGQgKHByaW1hcnkpXG4gICAgICAgIGNvbnN0ICRudW1iZXJGaWVsZCA9ICQoJ2lucHV0W25hbWU9XCJudW1iZXJcIl0nKTtcbiAgICAgICAgaWYgKCRudW1iZXJGaWVsZC5sZW5ndGggJiYgJG51bWJlckZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGlmIGlucHV0bWFzayBpcyBhcHBsaWVkXG4gICAgICAgICAgICBsZXQgZXh0ZW5zaW9uTnVtYmVyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpbnB1dG1hc2sgaXMgYXZhaWxhYmxlIGFuZCBhcHBsaWVkIHRvIHRoZSBmaWVsZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiAkbnVtYmVyRmllbGQuaW5wdXRtYXNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IHVubWFza2VkIHZhbHVlIChvbmx5IHRoZSBhY3R1YWwgaW5wdXQgd2l0aG91dCBtYXNrIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGlmIGlucHV0bWFzayBtZXRob2QgZmFpbHNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB0aGUgdmFsdWUgLSByZW1vdmUgYW55IHJlbWFpbmluZyBtYXNrIGNoYXJhY3RlcnMgbGlrZSB1bmRlcnNjb3JlXG4gICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSBleHRlbnNpb25OdW1iZXIucmVwbGFjZSgvW14wLTldL2csICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSByZXR1cm4gaWYgd2UgaGF2ZSBhY3R1YWwgZGlnaXRzXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTnVtYmVyICYmIGV4dGVuc2lvbk51bWJlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbk51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gVVJMIHBhcmFtZXRlclxuICAgICAgICBjb25zdCB1cmxNYXRjaCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5tYXRjaCgvXFwvZXh0ZW5zaW9uc1xcL21vZGlmeVxcLyhcXGQrKS8pO1xuICAgICAgICBpZiAodXJsTWF0Y2ggJiYgdXJsTWF0Y2hbMV0pIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgZGF0YWJhc2UgSUQsIHdlIG5lZWQgdG8gd2FpdCBmb3IgZm9ybSB0byBsb2FkXG4gICAgICAgICAgICAvLyBXZSdsbCBnZXQgdGhlIGFjdHVhbCBleHRlbnNpb24gbnVtYmVyIGFmdGVyIGZvcm0gbG9hZHNcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0xhYmVsID0gJCgnI3N0YXR1cycpO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdCA9ICQoJyNhY3RpdmUtZGV2aWNlcy1saXN0Jyk7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0ID0gJCgnI2RldmljZS1oaXN0b3J5LWxpc3QnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaW5pdGlhbCBzdGF0dXMgd2l0aCBzaW5nbGUgQVBJIGNhbGxcbiAgICAgKi9cbiAgICBsb2FkSW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gUmUtY2hlY2sgZXh0ZW5zaW9uIElEIGFmdGVyIGZvcm0gbG9hZHNcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhZ2FpbiBhZnRlciBkZWxheSAoZm9ybSBtaWdodCBzdGlsbCBiZSBsb2FkaW5nKVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpLCA1MDApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIEFQSSBjYWxsIGZvciBjdXJyZW50IHN0YXR1c1xuICAgICAgICBFeHRlbnNpb25zQVBJLmdldFN0YXR1cyh0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHNvIGxvYWQgaGlzdG9yaWNhbCBkYXRhXG4gICAgICAgIHRoaXMubG9hZEhpc3RvcmljYWxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGhpc3RvcmljYWwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRIaXN0b3JpY2FsRGF0YSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGZXRjaCBoaXN0b3J5IGZyb20gQVBJXG4gICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0SGlzdG9yeSh0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCwge2xpbWl0OiA1MH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaGlzdG9yeSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheUhpc3RvcmljYWxEYXRhKHJlc3BvbnNlLmRhdGEuaGlzdG9yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlO1xuICAgICAgICBpZiAoZGF0YS5zdGF0dXNlcyAmJiBkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1c0RhdGEuc3RhdHVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgZGV2aWNlc1xuICAgICAgICB0aGlzLnVwZGF0ZUFjdGl2ZURldmljZXMoc3RhdHVzRGF0YS5kZXZpY2VzIHx8IFtdKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERvbid0IGFkZCB0byBoaXN0b3J5IC0gaGlzdG9yeSBpcyBsb2FkZWQgZnJvbSBBUEkgb25seVxuICAgICAgICAvLyB0aGlzLmFkZFRvSGlzdG9yeShzdGF0dXNEYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNMYWJlbChzdGF0dXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRzdGF0dXNMYWJlbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBnbG9iYWxUcmFuc2xhdGVbYGV4X1N0YXR1cyR7c3RhdHVzfWBdIHx8IHN0YXR1cztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGNsYXNzIGFuZCB1cGRhdGUgY29udGVudFxuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbFxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmV5IGdyZWVuIHJlZCB5ZWxsb3cgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoY29sb3IpXG4gICAgICAgICAgICAuaHRtbChgJHtsYWJlbH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBmb3Igc3RhdHVzIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKSB7XG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVW5hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBjYXNlICdEaXNhYmxlZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFjdGl2ZSBkZXZpY2VzIGxpc3RcbiAgICAgKi9cbiAgICB1cGRhdGVBY3RpdmVEZXZpY2VzKGRldmljZXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdCB8fCAhQXJyYXkuaXNBcnJheShkZXZpY2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZGV2aWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0FjdGl2ZURldmljZXMgfHwgJ05vIGFjdGl2ZSBkZXZpY2VzJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGxpc3Qgd2l0aCB0ZWFsIGxhYmVscyBsaWtlIHRoZSBvbGQgZW5kcG9pbnQtbGlzdFxuICAgICAgICBsZXQgZGV2aWNlc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgZGV2aWNlcy5mb3JFYWNoKChkZXZpY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IGRldmljZS51c2VyX2FnZW50IHx8ICdVbmtub3duJztcbiAgICAgICAgICAgIGNvbnN0IGlwID0gZGV2aWNlLmlwIHx8IGRldmljZS5jb250YWN0X2lwIHx8ICctJztcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBkZXZpY2UucG9ydCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlwRGlzcGxheSA9IHBvcnQgPyBgJHtpcH06JHtwb3J0fWAgOiBpcDtcbiAgICAgICAgICAgIGNvbnN0IHJ0dCA9IGRldmljZS5ydHQgIT09IG51bGwgJiYgZGV2aWNlLnJ0dCAhPT0gdW5kZWZpbmVkIFxuICAgICAgICAgICAgICAgID8gYCAoJHtkZXZpY2UucnR0LnRvRml4ZWQoMil9IG1zKWAgXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGlkID0gYCR7dXNlckFnZW50fXwke2lwfWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRldmljZXNIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtaWQ9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGVhbCBsYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt1c2VyQWdlbnR9XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGV0YWlsXCI+JHtpcERpc3BsYXl9JHtydHR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzSHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuaHRtbChkZXZpY2VzSHRtbCk7XG5cbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gY29weSBJUCBhZGRyZXNzXG4gICAgICAgIHRoaXMuYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gZGV2aWNlIGxhYmVscyBmb3IgSVAgY29weWluZ1xuICAgICAqL1xuICAgIGF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMoKSB7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0LmZpbmQoJy5pdGVtIC51aS5sYWJlbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpdGVtID0gJGxhYmVsLmNsb3Nlc3QoJy5pdGVtJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRhSWQgPSAkaXRlbS5kYXRhKCdpZCcpO1xuXG4gICAgICAgICAgICBpZiAoIWRhdGFJZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IElQIGZyb20gZGF0YS1pZCAoZm9ybWF0OiBcIlVzZXJBZ2VudHxJUFwiKVxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBkYXRhSWQuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IGlwID0gcGFydHNbMV07XG5cbiAgICAgICAgICAgIGlmICghaXAgfHwgaXAgPT09ICctJykgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBDb3B5IHRvIGNsaXBib2FyZCB1c2luZyB0aGUgc2FtZSBtZXRob2QgYXMgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yLmNsaXBib2FyZCAmJiBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCkge1xuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGlwKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IGNoYW5nZSB0aGUgbGFiZWwgY29sb3IgdG8gaW5kaWNhdGUgc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ3RlYWwnKS5hZGRDbGFzcygnZ3JlZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3RlYWwnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBwb3B1cCBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfSXBDb3BpZWQgfHwgJ0lQIGNvcGllZCd9OiAke2lwfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInXG4gICAgICAgICAgICAgICAgICAgIH0pLnBvcHVwKCdzaG93Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbGFiZWwucG9wdXAoJ2hpZGUnKS5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY29weSBJUDonLCBlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcCA9ICQoJzxpbnB1dD4nKTtcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKCR0ZW1wKTtcbiAgICAgICAgICAgICAgICAkdGVtcC52YWwoaXApLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAgICAgJHRlbXAucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgJGxhYmVsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCd0ZWFsJykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygndGVhbCcpO1xuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY3Vyc29yIHBvaW50ZXIgc3R5bGVcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuZmluZCgnLml0ZW0gLnVpLmxhYmVsJykuY3NzKCdjdXJzb3InLCAncG9pbnRlcicpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJIHdpdGggZGV2aWNlIGdyb3VwaW5nXG4gICAgICovXG4gICAgZGlzcGxheUhpc3RvcmljYWxEYXRhKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGlmICghdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgfHwgIUFycmF5LmlzQXJyYXkoaGlzdG9yeURhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChoaXN0b3J5RGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0hpc3RvcnlBdmFpbGFibGUgfHwgJ05vIGhpc3RvcnkgYXZhaWxhYmxlJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR3JvdXAgaGlzdG9yeSBieSBkZXZpY2VcbiAgICAgICAgY29uc3QgZGV2aWNlR3JvdXBzID0gdGhpcy5ncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBIVE1MIGZvciBncm91cGVkIGRpc3BsYXkgLSBzaW1wbGlmaWVkIHN0cnVjdHVyZVxuICAgICAgICBsZXQgaGlzdG9yeUh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZWQgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBPYmplY3QuZW50cmllcyhkZXZpY2VHcm91cHMpLmZvckVhY2goKFtkZXZpY2VLZXksIHNlc3Npb25zXSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3VzZXJBZ2VudCwgaXBdID0gZGV2aWNlS2V5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VOYW1lID0gdXNlckFnZW50IHx8ICdVbmtub3duIERldmljZSc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJUCA9IChpcCAmJiBpcCAhPT0gJ1Vua25vd24nKSA/IGlwIDogJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERldmljZSBoZWFkZXIgLSBleGFjdGx5IGFzIHJlcXVlc3RlZFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJtb2JpbGUgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkZXZpY2VOYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZUlQID8gYDxzcGFuIHN0eWxlPVwiY29sb3I6IGdyZXk7IGZvbnQtc2l6ZTowLjdlbTtcIj4ke2RldmljZUlQfTwvPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uXCI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXNzaW9ucyB0aW1lbGluZSAtIHNpbXBsaWZpZWRcbiAgICAgICAgICAgIHNlc3Npb25zLmZvckVhY2goKHNlc3Npb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZXZlbnQgdHlwZSB0byBkZXRlcm1pbmUgYWN0dWFsIGRldmljZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgaXNPbmxpbmUgPSBzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZSc7XG4gICAgICAgICAgICAgICAgbGV0IGV2ZW50TGFiZWwgPSAnJztcblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZXZpY2Utc3BlY2lmaWMgZXZlbnRzXG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgICAgICBpc09ubGluZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBldmVudExhYmVsID0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leF9EZXZpY2VEaXNjb25uZWN0ZWQgfHwgJ0Rpc2Nvbm5lY3RlZCd9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9hZGRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBldmVudExhYmVsID0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leF9EZXZpY2VDb25uZWN0ZWQgfHwgJ0Nvbm5lY3RlZCd9YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBydHRMYWJlbCA9IHRoaXMuZ2V0UnR0TGFiZWwoc2Vzc2lvbi5ydHQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWUgPSB0aGlzLmZvcm1hdFRpbWUoc2Vzc2lvbi5kYXRlIHx8IHNlc3Npb24udGltZXN0YW1wKTtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSBjaXJjdWxhciBsYWJlbHMgbGlrZSBpbiBleHRlbnNpb25zIGxpc3RcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGlzT25saW5lID8gJ2dyZWVuJyA6ICdncmV5JztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNUaXRsZSA9IGlzT25saW5lID8gJ09ubGluZScgOiAnT2ZmbGluZSc7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb25IdG1sID0gJyc7XG4gICAgICAgICAgICAgICAgLy8gRm9yIHRoZSBmaXJzdCAobW9zdCByZWNlbnQpIGVudHJ5IHRoYXQgaXMgb25saW5lLCBhZGQgbGl2ZSBkdXJhdGlvblxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCAmJiBpc09ubGluZSAmJiBzZXNzaW9uLmV2ZW50X3R5cGUgIT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGRhdGEgYXR0cmlidXRlIHdpdGggdGltZXN0YW1wIGZvciBsaXZlIHVwZGF0aW5nXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uSHRtbCA9IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dCBvbmxpbmUtZHVyYXRpb25cIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtb25saW5lLXNpbmNlPVwiJHtzZXNzaW9uLnRpbWVzdGFtcH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZSB8fCAnT25saW5lJ30gJHt0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyhzZXNzaW9uLnRpbWVzdGFtcCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHN0YXRpYyBkdXJhdGlvbiBmb3IgaGlzdG9yaWNhbCBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5jYWxjdWxhdGVEdXJhdGlvbihzZXNzaW9uLnRpbWVzdGFtcCwgc2Vzc2lvbnNbaW5kZXggLSAxXT8udGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9ybWF0IGR1cmF0aW9uIHdpdGggdHJhbnNsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25UZXh0ID0gZHVyYXRpb24gJiYgaXNPbmxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZSB8fCAnT25saW5lJ30gJHtkdXJhdGlvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT2ZmbGluZSB8fCAnT2ZmbGluZSd9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25IdG1sID0gYDxzcGFuIGNsYXNzPVwidWkgZ3JleSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPiR7ZHVyYXRpb25UZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgdGV4dFwiIHN0eWxlPVwibWFyZ2luOiA2cHggMjBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NsYXNzfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDhweDsgaGVpZ2h0OiA4cHg7IG1pbi1oZWlnaHQ6IDhweDsgbWFyZ2luLXJpZ2h0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke3N0YXR1c1RpdGxlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RpbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAke3J0dExhYmVsfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtkdXJhdGlvbkh0bWwgfHwgZXZlbnRMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGhpc3RvcnlIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdC5odG1sKGhpc3RvcnlIdG1sKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGhpc3RvcnkgZXZlbnRzIGJ5IGRldmljZSBhbmQgc29ydCBieSBsYXN0IGV2ZW50XG4gICAgICovXG4gICAgZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG5cbiAgICAgICAgaGlzdG9yeURhdGEuZm9yRWFjaChlbnRyeSA9PiB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGV2aWNlIGtleSBmcm9tIHVzZXJfYWdlbnQgYW5kIElQXG4gICAgICAgICAgICBsZXQgZGV2aWNlS2V5ID0gJ1Vua25vd258VW5rbm93bic7XG5cbiAgICAgICAgICAgIGlmIChlbnRyeS51c2VyX2FnZW50IHx8IGVudHJ5LmlwX2FkZHJlc3MpIHtcbiAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHtlbnRyeS51c2VyX2FnZW50IHx8ICdVbmtub3duJ318JHtlbnRyeS5pcF9hZGRyZXNzIHx8ICdVbmtub3duJ31gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS5kZXRhaWxzKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgZGV2aWNlIGluZm8gZnJvbSBkZXRhaWxzXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBlbnRyeS5kZXRhaWxzLm1hdGNoKC8oW1xcd1xccy5dKylcXHMqLVxccyooW1xcZC5dKykvKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlS2V5ID0gYCR7bWF0Y2hbMV0udHJpbSgpfXwke21hdGNoWzJdLnRyaW0oKX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFncm91cHNbZGV2aWNlS2V5XSkge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1tkZXZpY2VLZXldID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdyb3Vwc1tkZXZpY2VLZXldLnB1c2goZW50cnkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0IHNlc3Npb25zIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHRpbWVzdGFtcCAobmV3ZXN0IGZpcnN0KVxuICAgICAgICBPYmplY3Qua2V5cyhncm91cHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1trZXldLnNvcnQoKGEsIGIpID0+IGIudGltZXN0YW1wIC0gYS50aW1lc3RhbXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IHRvIGFycmF5IGFuZCBzb3J0IGJ5IG1vc3QgcmVjZW50IGV2ZW50XG4gICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwcyA9IE9iamVjdC5lbnRyaWVzKGdyb3VwcylcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBtb3N0IHJlY2VudCB0aW1lc3RhbXAgZnJvbSBlYWNoIGdyb3VwIChmaXJzdCBlbGVtZW50IHNpbmNlIGFscmVhZHkgc29ydGVkKVxuICAgICAgICAgICAgICAgIGNvbnN0IGFMYXRlc3QgPSBhWzFdWzBdPy50aW1lc3RhbXAgfHwgMDtcbiAgICAgICAgICAgICAgICBjb25zdCBiTGF0ZXN0ID0gYlsxXVswXT8udGltZXN0YW1wIHx8IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJMYXRlc3QgLSBhTGF0ZXN0O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBiYWNrIHRvIG9iamVjdCB3aXRoIHNvcnRlZCBrZXlzXG4gICAgICAgIGNvbnN0IHNvcnRlZE9iamVjdCA9IHt9O1xuICAgICAgICBzb3J0ZWRHcm91cHMuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICBzb3J0ZWRPYmplY3Rba2V5XSA9IHZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc29ydGVkT2JqZWN0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGJldHdlZW4gdHdvIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbihjdXJyZW50VGltZXN0YW1wLCBwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgICAgICBpZiAoIXByZXZpb3VzVGltZXN0YW1wKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhwcmV2aW91c1RpbWVzdGFtcCAtIGN1cnJlbnRUaW1lc3RhbXApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lIGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgZm9ybWF0VGltZShkYXRlU3RyKSB7XG4gICAgICAgIGlmICghZGF0ZVN0cikgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhbHJlYWR5IGEgZm9ybWF0dGVkIGRhdGUgc3RyaW5nIGxpa2UgXCIyMDI1LTA5LTExIDExOjMwOjM2XCJcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnc3RyaW5nJyAmJiBkYXRlU3RyLmluY2x1ZGVzKCcgJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVQYXJ0ID0gZGF0ZVN0ci5zcGxpdCgnICcpWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVQYXJ0IHx8IGRhdGVTdHI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYSB0aW1lc3RhbXBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIgKiAxMDAwKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0ZVN0cjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBSVFQgbGFiZWwgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgKi9cbiAgICBnZXRSdHRMYWJlbChydHQpIHtcbiAgICAgICAgaWYgKHJ0dCA9PT0gbnVsbCB8fCBydHQgPT09IHVuZGVmaW5lZCB8fCBydHQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgaWYgKHJ0dCA+IDE1MCkge1xuICAgICAgICAgICAgY29sb3IgPSAncmVkJztcbiAgICAgICAgfSBlbHNlIGlmIChydHQgPiA1MCkge1xuICAgICAgICAgICAgY29sb3IgPSAnb2xpdmUnOyAgLy8geWVsbG93IGNhbiBiZSBoYXJkIHRvIHNlZSwgb2xpdmUgaXMgYmV0dGVyXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidWkgJHtjb2xvcn0gdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj5bUlRUOiAke3J0dC50b0ZpeGVkKDApfW1zXTwvc3Bhbj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZHVyYXRpb24gZnJvbSB0aW1lc3RhbXAgdG8gbm93XG4gICAgICovXG4gICAgY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGlmZiA9IG5vdyAtIHRpbWVzdGFtcDtcblxuICAgICAgICBpZiAoZGlmZiA8IDApIHJldHVybiAnMHMnO1xuXG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcblxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgdGltZXIgdG8gdXBkYXRlIG9ubGluZSBkdXJhdGlvbnNcbiAgICAgKi9cbiAgICBzdGFydER1cmF0aW9uVXBkYXRlVGltZXIoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBldmVyeSAxMCBzZWNvbmRzXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU9ubGluZUR1cmF0aW9ucygpO1xuICAgICAgICB9LCAxMDAwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhbGwgb25saW5lIGR1cmF0aW9uIGRpc3BsYXlzXG4gICAgICovXG4gICAgdXBkYXRlT25saW5lRHVyYXRpb25zKCkge1xuICAgICAgICBjb25zdCAkZHVyYXRpb25zID0gdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3Q/LmZpbmQoJy5vbmxpbmUtZHVyYXRpb25bZGF0YS1vbmxpbmUtc2luY2VdJyk7XG4gICAgICAgIGlmICghJGR1cmF0aW9ucyB8fCAkZHVyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGR1cmF0aW9ucy5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3Qgb25saW5lU2luY2UgPSBwYXJzZUludCgkZWxlbWVudC5kYXRhKCdvbmxpbmUtc2luY2UnKSwgMTApO1xuICAgICAgICAgICAgaWYgKG9ubGluZVNpbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyhvbmxpbmVTaW5jZSk7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQudGV4dChgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lIHx8ICdPbmxpbmUnfSAke2R1cmF0aW9ufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBDbGVhciB1cGRhdGUgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy51cGRhdGVUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IG51bGw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gZXh0ZW5zaW9uLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yO1xufSJdfQ==