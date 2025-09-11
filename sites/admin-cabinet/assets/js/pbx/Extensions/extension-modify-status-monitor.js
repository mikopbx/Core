"use strict";

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
  statusHistory: [],
  maxHistoryItems: 20,

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
    } // Make single API call


    ExtensionsAPI.getStatus(this.currentExtensionId, function (response) {
      if (response && response.result && response.data) {
        _this.updateStatus(response.data);
      }
    });
  },

  /**
   * Subscribe to EventBus for real-time updates
   */
  subscribeToEvents: function subscribeToEvents() {
    var _this2 = this;

    if (typeof EventBus !== 'undefined') {
      EventBus.subscribe('extension-status', function (message) {
        _this2.handleEventBusMessage(message);
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

    this.updateActiveDevices(statusData.devices || []); // Add to history if status changed

    this.addToHistory(statusData);
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
   * Add status change to history
   */
  addToHistory: function addToHistory(statusData) {
    var now = new Date();
    var timestamp = now.toLocaleString(); // Determine activity type

    var activityType = 'unknown';
    var activityIcon = 'question circle';
    var activityColor = 'grey';

    if (statusData.status === 'Available' && statusData.devices && statusData.devices.length > 0) {
      activityType = 'online';
      activityIcon = 'arrow circle up';
      activityColor = 'green';
    } else if (statusData.status === 'Unavailable') {
      activityType = 'offline';
      activityIcon = 'arrow circle down';
      activityColor = 'red';
    } // Add to history array


    this.statusHistory.unshift({
      timestamp: timestamp,
      status: statusData.status,
      devices: statusData.devices || [],
      activityType: activityType,
      activityIcon: activityIcon,
      activityColor: activityColor
    }); // Keep only last N items

    if (this.statusHistory.length > this.maxHistoryItems) {
      this.statusHistory = this.statusHistory.slice(0, this.maxHistoryItems);
    } // Update history display


    this.updateHistoryDisplay();
  },

  /**
   * Update history display
   */
  updateHistoryDisplay: function updateHistoryDisplay() {
    if (!this.$deviceHistoryList) {
      return;
    }

    if (this.statusHistory.length === 0) {
      this.$deviceHistoryList.html("\n                <div class=\"ui relaxed divided list\">\n                    <div class=\"item\">\n                        <div class=\"content\">\n                            <div class=\"description\">".concat(globalTranslate.ex_NoHistoryAvailable, "</div>\n                        </div>\n                    </div>\n                </div>\n            "));
      return;
    }

    var historyHtml = '<div class="ui relaxed divided list">';
    this.statusHistory.forEach(function (entry) {
      var devices = entry.devices || [];
      var deviceInfo = devices.length > 0 ? devices.map(function (d) {
        return "".concat(d.user_agent || 'Unknown', " - ").concat(d.ip || 'Unknown IP');
      }).join(', ') : 'No devices';
      historyHtml += "\n                <div class=\"item\">\n                    <i class=\"".concat(entry.activityColor, " ").concat(entry.activityIcon, " icon\"></i>\n                    <div class=\"content\">\n                        <div class=\"description\">\n                            <span class=\"ui small text\">").concat(entry.timestamp, "</span>\n                            <span class=\"ui small text\"> - ").concat(deviceInfo, "</span>\n                            <span class=\"ui ").concat(entry.activityColor, " small text\"> - ").concat(entry.activityType, "</span>\n                        </div>\n                    </div>\n                </div>\n            ");
    });
    historyHtml += '</div>';
    this.$deviceHistoryList.html(historyHtml);
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
    this.statusHistory = [];
  }
}; // Export for use in extension-modify.js

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionModifyStatusMonitor;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCJzdGF0dXNIaXN0b3J5IiwibWF4SGlzdG9yeUl0ZW1zIiwiJHN0YXR1c0xhYmVsIiwiJGFjdGl2ZURldmljZXNMaXN0IiwiJGRldmljZUhpc3RvcnlMaXN0IiwiaW5pdGlhbGl6ZSIsImV4dHJhY3RFeHRlbnNpb25JZCIsImNhY2hlRWxlbWVudHMiLCJzdWJzY3JpYmVUb0V2ZW50cyIsImxvYWRJbml0aWFsU3RhdHVzIiwiJG51bWJlckZpZWxkIiwiJCIsImxlbmd0aCIsInZhbCIsInVybE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwic2V0VGltZW91dCIsIkV4dGVuc2lvbnNBUEkiLCJnZXRTdGF0dXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cGRhdGVTdGF0dXMiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudEJ1c01lc3NhZ2UiLCJzdGF0dXNlcyIsInN0YXR1c0RhdGEiLCJ1cGRhdGVTdGF0dXNMYWJlbCIsInN0YXR1cyIsInVwZGF0ZUFjdGl2ZURldmljZXMiLCJkZXZpY2VzIiwiYWRkVG9IaXN0b3J5IiwiY29sb3IiLCJnZXRDb2xvckZvclN0YXR1cyIsImxhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJleF9Ob0FjdGl2ZURldmljZXMiLCJkZXZpY2VzSHRtbCIsImZvckVhY2giLCJkZXZpY2UiLCJ1c2VyQWdlbnQiLCJ1c2VyX2FnZW50IiwiaXAiLCJjb250YWN0X2lwIiwicG9ydCIsImlwRGlzcGxheSIsInJ0dCIsInVuZGVmaW5lZCIsInRvRml4ZWQiLCJpZCIsIm5vdyIsIkRhdGUiLCJ0aW1lc3RhbXAiLCJ0b0xvY2FsZVN0cmluZyIsImFjdGl2aXR5VHlwZSIsImFjdGl2aXR5SWNvbiIsImFjdGl2aXR5Q29sb3IiLCJ1bnNoaWZ0Iiwic2xpY2UiLCJ1cGRhdGVIaXN0b3J5RGlzcGxheSIsImV4X05vSGlzdG9yeUF2YWlsYWJsZSIsImhpc3RvcnlIdG1sIiwiZW50cnkiLCJkZXZpY2VJbmZvIiwibWFwIiwiZCIsImpvaW4iLCJkZXN0cm95IiwidW5zdWJzY3JpYmUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLDRCQUE0QixHQUFHO0FBQ2pDQyxFQUFBQSxTQUFTLEVBQUUsa0JBRHNCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUUsS0FGa0I7QUFHakNDLEVBQUFBLGtCQUFrQixFQUFFLElBSGE7QUFJakNDLEVBQUFBLGFBQWEsRUFBRSxFQUprQjtBQUtqQ0MsRUFBQUEsZUFBZSxFQUFFLEVBTGdCOztBQU9qQztBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBVm1CO0FBV2pDQyxFQUFBQSxrQkFBa0IsRUFBRSxJQVhhO0FBWWpDQyxFQUFBQSxrQkFBa0IsRUFBRSxJQVphOztBQWNqQztBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFqQmlDLHdCQWlCcEI7QUFDVCxRQUFJLEtBQUtQLGFBQVQsRUFBd0I7QUFDcEI7QUFDSCxLQUhRLENBS1Q7OztBQUNBLFNBQUtDLGtCQUFMLEdBQTBCLEtBQUtPLGtCQUFMLEVBQTFCOztBQUNBLFFBQUksQ0FBQyxLQUFLUCxrQkFBVixFQUE4QjtBQUMxQjtBQUNILEtBVFEsQ0FXVDs7O0FBQ0EsU0FB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O0FBQ0E7QUFDSU0sRUFBQUEsT0FwVGlDLHFCQW9UdkI7QUFDTixRQUFJLE9BQU9uRCxRQUFQLEtBQW9CLFdBQXhCLEVBQXFDO0FBQ2pDQSxNQUFBQSxRQUFRLENBQUNvRCxXQUFULENBQXFCLGtCQUFyQjtBQUNIOztBQUNELFNBQUtoRixhQUFMLEdBQXFCLEtBQXJCO0FBQ0EsU0FBS0Msa0JBQUwsR0FBMEIsSUFBMUI7QUFDQSxTQUFLQyxhQUFMLEdBQXFCLEVBQXJCO0FBQ0g7QUEzVGdDLENBQXJDLEMsQ0E4VEE7O0FBQ0EsSUFBSSxPQUFPK0UsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCcEYsNEJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFdmVudEJ1cywgRXh0ZW5zaW9uc0FQSSAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBNb2RpZnkgU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsaWZpZWQgc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbiBtb2RpZnkgcGFnZTpcbiAqIC0gU2luZ2xlIEFQSSBjYWxsIG9uIGluaXRpYWxpemF0aW9uXG4gKiAtIFJlYWwtdGltZSB1cGRhdGVzIHZpYSBFdmVudEJ1cyBvbmx5XG4gKiAtIE5vIHBlcmlvZGljIHBvbGxpbmdcbiAqIC0gQ2xlYW4gZGV2aWNlIGxpc3QgYW5kIGhpc3RvcnkgZGlzcGxheVxuICovXG5jb25zdCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ2V4dGVuc2lvbi1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGN1cnJlbnRFeHRlbnNpb25JZDogbnVsbCxcbiAgICBzdGF0dXNIaXN0b3J5OiBbXSxcbiAgICBtYXhIaXN0b3J5SXRlbXM6IDIwLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0xhYmVsOiBudWxsLFxuICAgICRhY3RpdmVEZXZpY2VzTGlzdDogbnVsbCxcbiAgICAkZGV2aWNlSGlzdG9yeUxpc3Q6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZXh0ZW5zaW9uIG51bWJlciBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgaW5pdGlhbCBBUEkgY2FsbFxuICAgICAgICB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBleHRlbnNpb24gSUQgZnJvbSB0aGUgZm9ybVxuICAgICAqL1xuICAgIGV4dHJhY3RFeHRlbnNpb25JZCgpIHtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byBnZXQgdGhlIHBob25lIG51bWJlciBmcm9tIGZvcm0gZmllbGQgKHByaW1hcnkpXG4gICAgICAgIGNvbnN0ICRudW1iZXJGaWVsZCA9ICQoJ2lucHV0W25hbWU9XCJudW1iZXJcIl0nKTtcbiAgICAgICAgaWYgKCRudW1iZXJGaWVsZC5sZW5ndGggJiYgJG51bWJlckZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gJG51bWJlckZpZWxkLnZhbCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjayB0byBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybE1hdGNoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9cXC9leHRlbnNpb25zXFwvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGlmICh1cmxNYXRjaCAmJiB1cmxNYXRjaFsxXSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBkYXRhYmFzZSBJRCwgd2UgbmVlZCB0byB3YWl0IGZvciBmb3JtIHRvIGxvYWRcbiAgICAgICAgICAgIC8vIFdlJ2xsIGdldCB0aGUgYWN0dWFsIGV4dGVuc2lvbiBudW1iZXIgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICovXG4gICAgY2FjaGVFbGVtZW50cygpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWwgPSAkKCcjc3RhdHVzJyk7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0ID0gJCgnI2FjdGl2ZS1kZXZpY2VzLWxpc3QnKTtcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgPSAkKCcjZGV2aWNlLWhpc3RvcnktbGlzdCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBpbml0aWFsIHN0YXR1cyB3aXRoIHNpbmdsZSBBUEkgY2FsbFxuICAgICAqL1xuICAgIGxvYWRJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBSZS1jaGVjayBleHRlbnNpb24gSUQgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IHRoaXMuZXh0cmFjdEV4dGVuc2lvbklkKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFnYWluIGFmdGVyIGRlbGF5IChmb3JtIG1pZ2h0IHN0aWxsIGJlIGxvYWRpbmcpXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCksIDUwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgQVBJIGNhbGxcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXModGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlO1xuICAgICAgICBpZiAoZGF0YS5zdGF0dXNlcyAmJiBkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1c0RhdGEuc3RhdHVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgZGV2aWNlc1xuICAgICAgICB0aGlzLnVwZGF0ZUFjdGl2ZURldmljZXMoc3RhdHVzRGF0YS5kZXZpY2VzIHx8IFtdKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0byBoaXN0b3J5IGlmIHN0YXR1cyBjaGFuZ2VkXG4gICAgICAgIHRoaXMuYWRkVG9IaXN0b3J5KHN0YXR1c0RhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1cykge1xuICAgICAgICBpZiAoIXRoaXMuJHN0YXR1c0xhYmVsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpO1xuICAgICAgICBjb25zdCBsYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZVtgZXhfU3RhdHVzJHtzdGF0dXN9YF0gfHwgc3RhdHVzO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBjb250ZW50XG4gICAgICAgIHRoaXMuJHN0YXR1c0xhYmVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZXkgZ3JlZW4gcmVkIHllbGxvdyBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhjb2xvcilcbiAgICAgICAgICAgIC5odG1sKGAke2xhYmVsfWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGNvbG9yIGZvciBzdGF0dXMgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpIHtcbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ0F2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVbmF2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQnO1xuICAgICAgICAgICAgY2FzZSAnRGlzYWJsZWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhY3RpdmUgZGV2aWNlcyBsaXN0XG4gICAgICovXG4gICAgdXBkYXRlQWN0aXZlRGV2aWNlcyhkZXZpY2VzKSB7XG4gICAgICAgIGlmICghdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgfHwgIUFycmF5LmlzQXJyYXkoZGV2aWNlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRldmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9BY3RpdmVEZXZpY2VzIHx8ICdObyBhY3RpdmUgZGV2aWNlcyd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBob3Jpem9udGFsIGxpc3Qgd2l0aCB0ZWFsIGxhYmVscyBsaWtlIHRoZSBvbGQgZW5kcG9pbnQtbGlzdFxuICAgICAgICBsZXQgZGV2aWNlc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzLmZvckVhY2goKGRldmljZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gZGV2aWNlLnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBkZXZpY2UuaXAgfHwgZGV2aWNlLmNvbnRhY3RfaXAgfHwgJy0nO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IGRldmljZS5wb3J0IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXBEaXNwbGF5ID0gcG9ydCA/IGAke2lwfToke3BvcnR9YCA6IGlwO1xuICAgICAgICAgICAgY29uc3QgcnR0ID0gZGV2aWNlLnJ0dCAhPT0gbnVsbCAmJiBkZXZpY2UucnR0ICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgICAgPyBgICgke2RldmljZS5ydHQudG9GaXhlZCgyKX0gbXMpYCBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt1c2VyQWdlbnR9fCR7aXB9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGV2aWNlc0h0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZWFsIGxhYmVsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3VzZXJBZ2VudH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXRhaWxcIj4ke2lwRGlzcGxheX0ke3J0dH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRldmljZXNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGRldmljZXNIdG1sKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBzdGF0dXMgY2hhbmdlIHRvIGhpc3RvcnlcbiAgICAgKi9cbiAgICBhZGRUb0hpc3Rvcnkoc3RhdHVzRGF0YSkge1xuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBub3cudG9Mb2NhbGVTdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERldGVybWluZSBhY3Rpdml0eSB0eXBlXG4gICAgICAgIGxldCBhY3Rpdml0eVR5cGUgPSAndW5rbm93bic7XG4gICAgICAgIGxldCBhY3Rpdml0eUljb24gPSAncXVlc3Rpb24gY2lyY2xlJztcbiAgICAgICAgbGV0IGFjdGl2aXR5Q29sb3IgPSAnZ3JleSc7XG4gICAgICAgIFxuICAgICAgICBpZiAoc3RhdHVzRGF0YS5zdGF0dXMgPT09ICdBdmFpbGFibGUnICYmIHN0YXR1c0RhdGEuZGV2aWNlcyAmJiBzdGF0dXNEYXRhLmRldmljZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYWN0aXZpdHlUeXBlID0gJ29ubGluZSc7XG4gICAgICAgICAgICBhY3Rpdml0eUljb24gPSAnYXJyb3cgY2lyY2xlIHVwJztcbiAgICAgICAgICAgIGFjdGl2aXR5Q29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXR1c0RhdGEuc3RhdHVzID09PSAnVW5hdmFpbGFibGUnKSB7XG4gICAgICAgICAgICBhY3Rpdml0eVR5cGUgPSAnb2ZmbGluZSc7XG4gICAgICAgICAgICBhY3Rpdml0eUljb24gPSAnYXJyb3cgY2lyY2xlIGRvd24nO1xuICAgICAgICAgICAgYWN0aXZpdHlDb2xvciA9ICdyZWQnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgdG8gaGlzdG9yeSBhcnJheVxuICAgICAgICB0aGlzLnN0YXR1c0hpc3RvcnkudW5zaGlmdCh7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWVzdGFtcCxcbiAgICAgICAgICAgIHN0YXR1czogc3RhdHVzRGF0YS5zdGF0dXMsXG4gICAgICAgICAgICBkZXZpY2VzOiBzdGF0dXNEYXRhLmRldmljZXMgfHwgW10sXG4gICAgICAgICAgICBhY3Rpdml0eVR5cGU6IGFjdGl2aXR5VHlwZSxcbiAgICAgICAgICAgIGFjdGl2aXR5SWNvbjogYWN0aXZpdHlJY29uLFxuICAgICAgICAgICAgYWN0aXZpdHlDb2xvcjogYWN0aXZpdHlDb2xvclxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEtlZXAgb25seSBsYXN0IE4gaXRlbXNcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzSGlzdG9yeS5sZW5ndGggPiB0aGlzLm1heEhpc3RvcnlJdGVtcykge1xuICAgICAgICAgICAgdGhpcy5zdGF0dXNIaXN0b3J5ID0gdGhpcy5zdGF0dXNIaXN0b3J5LnNsaWNlKDAsIHRoaXMubWF4SGlzdG9yeUl0ZW1zKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhpc3RvcnkgZGlzcGxheVxuICAgICAgICB0aGlzLnVwZGF0ZUhpc3RvcnlEaXNwbGF5KCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaGlzdG9yeSBkaXNwbGF5XG4gICAgICovXG4gICAgdXBkYXRlSGlzdG9yeURpc3BsYXkoKSB7XG4gICAgICAgIGlmICghdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzSGlzdG9yeS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGRpdmlkZWQgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0hpc3RvcnlBdmFpbGFibGV9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0IGhpc3RvcnlIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGRpdmlkZWQgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnN0YXR1c0hpc3RvcnkuZm9yRWFjaCgoZW50cnkpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRldmljZXMgPSBlbnRyeS5kZXZpY2VzIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlSW5mbyA9IGRldmljZXMubGVuZ3RoID4gMCBcbiAgICAgICAgICAgICAgICA/IGRldmljZXMubWFwKGQgPT4gYCR7ZC51c2VyX2FnZW50IHx8ICdVbmtub3duJ30gLSAke2QuaXAgfHwgJ1Vua25vd24gSVAnfWApLmpvaW4oJywgJylcbiAgICAgICAgICAgICAgICA6ICdObyBkZXZpY2VzJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7ZW50cnkuYWN0aXZpdHlDb2xvcn0gJHtlbnRyeS5hY3Rpdml0eUljb259IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInVpIHNtYWxsIHRleHRcIj4ke2VudHJ5LnRpbWVzdGFtcH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ1aSBzbWFsbCB0ZXh0XCI+IC0gJHtkZXZpY2VJbmZvfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInVpICR7ZW50cnkuYWN0aXZpdHlDb2xvcn0gc21hbGwgdGV4dFwiPiAtICR7ZW50cnkuYWN0aXZpdHlUeXBlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaGlzdG9yeUh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoaGlzdG9yeUh0bWwpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IG51bGw7XG4gICAgICAgIHRoaXMuc3RhdHVzSGlzdG9yeSA9IFtdO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvcjtcbn0iXX0=