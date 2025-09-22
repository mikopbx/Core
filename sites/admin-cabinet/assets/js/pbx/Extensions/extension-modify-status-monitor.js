"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

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

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage, EventBus, ExtensionsAPI, SemanticLocalization */

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


    ExtensionsAPI.getHistory(this.currentExtensionId, function (response) {
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
    Object.entries(deviceGroups).forEach(function (_ref, deviceIndex) {
      var _ref2 = _slicedToArray(_ref, 2),
          deviceKey = _ref2[0],
          sessions = _ref2[1];

      var _deviceKey$split = deviceKey.split('|'),
          _deviceKey$split2 = _slicedToArray(_deviceKey$split, 2),
          userAgent = _deviceKey$split2[0],
          ip = _deviceKey$split2[1];

      var deviceName = userAgent || 'Unknown Device';
      var deviceIP = ip && ip !== 'Unknown' ? ip : '';
      var deviceId = "device-".concat(deviceIndex); // Create timeline HTML for this device

      var timelineHtml = _this4.createDeviceTimeline(sessions, deviceId); // Device header - exactly as requested


      historyHtml += "\n                <div class=\"item\">\n                    <div class=\"content\">\n                        <div class=\"ui small header\">\n                            <i class=\"mobile alternate icon\"></i>\n                            <div class=\"content\">\n                                ".concat(deviceName, "\n                                ").concat(deviceIP ? "<span style=\"color: grey; font-size:0.7em;\">".concat(deviceIP, "</>") : '', "\n                            </div>\n                        </div>\n                        ").concat(timelineHtml, "\n                        <div class=\"description\">\n            "); // Sessions timeline - simplified

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

        var rttLabel = _this4.getRttLabel(session.rtt); // Format datetime with date and time


        var datetime = _this4.formatDateTime(session.date || session.timestamp); // Use circular labels like in extensions list


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

        historyHtml += "\n                    <div class=\"ui small text\" style=\"margin: 6px 20px; display: flex; align-items: center;\">\n                        <div class=\"ui ".concat(statusClass, " empty circular label\"\n                             style=\"width: 8px; height: 8px; min-height: 8px; margin-right: 8px;\"\n                             title=\"").concat(statusTitle, "\">\n                        </div>\n                        ").concat(datetime, "\n                        ").concat(rttLabel, "\n                        ").concat(durationHtml || eventLabel, "\n                    </div>\n                ");
      });
      historyHtml += "\n                        </div>\n                    </div>\n                </div>\n            ";
    });
    historyHtml += '</div>';
    this.$deviceHistoryList.html(historyHtml); // Initialize timeline tooltips

    this.initializeTimelineTooltips();
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
   * Format datetime with date and time using interface language
   */
  formatDateTime: function formatDateTime(time) {
    if (!time) return '--:--';
    var date = new Date(typeof time === 'string' ? time : time * 1000);
    var now = new Date(); // Check if it's today

    var isToday = date.toDateString() === now.toDateString(); // Check if it's yesterday

    var yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    var isYesterday = date.toDateString() === yesterday.toDateString();
    var locale = SemanticLocalization.getUserLocale();
    var timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    if (isToday) {
      return timeStr;
    } else if (isYesterday) {
      // Use translation for "Yesterday" if available
      var yesterdayText = globalTranslate.ex_Yesterday || 'Yesterday';
      return "".concat(yesterdayText, " ").concat(timeStr);
    } else {
      // Format date according to locale
      var dateStr = date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit'
      });
      return "".concat(dateStr, " ").concat(timeStr);
    }
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
   * Create timeline visualization for a device's history
   * @param {Array} sessions - Array of session events for the device
   * @param {String} deviceId - Unique identifier for the device
   * @returns {String} HTML for the timeline
   */
  createDeviceTimeline: function createDeviceTimeline(sessions, deviceId) {
    if (!sessions || sessions.length === 0) {
      return '';
    } // Get time range (last 24 hours)


    var now = Math.floor(Date.now() / 1000);
    var dayAgo = now - 24 * 60 * 60; // Filter sessions within last 24 hours (sessions are sorted newest first)

    var recentSessions = sessions.filter(function (s) {
      return s.timestamp >= dayAgo;
    });

    if (recentSessions.length === 0) {
      return ''; // No recent activity
    } // Create timeline segments (96 segments for 24 hours, 15 minutes each)


    var segmentDuration = 15 * 60; // 15 minutes in seconds

    var segments = 96;
    var segmentData = new Array(segments).fill('grey'); // Reverse sessions to process from oldest to newest

    var chronologicalSessions = _toConsumableArray(recentSessions).reverse(); // Process sessions to fill segments


    chronologicalSessions.forEach(function (session, index) {
      var nextSession = chronologicalSessions[index + 1]; // Next event in time

      var startTime = session.timestamp;
      var endTime = nextSession ? nextSession.timestamp : now; // Determine status color based on event type and status

      var color = 'grey'; // Check event type first

      if (session.event_type === 'device_added' || session.event_type === 'status_change') {
        // Device came online
        if (session.status === 'Available') {
          color = 'green';
        } else {
          color = 'grey';
        }
      } else if (session.event_type === 'device_removed') {
        // Device went offline - segments AFTER this event should be grey
        color = 'grey';
      } else if (session.status === 'Available') {
        // Default to available status
        color = 'green';
      } // Fill segments for this session period


      for (var time = startTime; time < endTime && time <= now; time += segmentDuration) {
        var segmentIndex = Math.floor((time - dayAgo) / segmentDuration);

        if (segmentIndex >= 0 && segmentIndex < segments) {
          segmentData[segmentIndex] = color;
        }
      }
    }); // Build timeline HTML

    var timelineHtml = "\n            <div class=\"device-timeline\" style=\"margin: 10px 0;\">\n                <div style=\"display: flex; width: 100%; height: 12px; background: #f3f4f5; border-radius: 3px; overflow: hidden;\">\n        ";
    segmentData.forEach(function (color, index) {
      var segmentWidth = 100 / segments;
      var bgColor = color === 'green' ? '#21ba45' : '#e8e8e8';
      var borderLeft = index > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none'; // Calculate time for this segment

      var segmentTime = dayAgo + index * segmentDuration;
      var segmentDate = new Date(segmentTime * 1000); // Get user's locale

      var locale = SemanticLocalization.getUserLocale();
      var timeStr = segmentDate.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      });
      timelineHtml += "\n                <div style=\"width: ".concat(segmentWidth, "%; height: 100%; background-color: ").concat(bgColor, ";\n                           box-sizing: border-box; border-left: ").concat(borderLeft, ";\"\n                     title=\"").concat(timeStr, " - ").concat(color === 'green' ? 'Online' : 'Offline', "\">\n                </div>\n            ");
    }); // Time labels with localization

    var hoursLabel = globalTranslate.ex_Hours_Short || 'h';
    timelineHtml += "\n                </div>\n                <div style=\"display: flex; justify-content: space-between; margin-top: 2px; font-size: 10px; color: #999;\">\n                    <span>24".concat(hoursLabel, "</span>\n                    <span>18").concat(hoursLabel, "</span>\n                    <span>12").concat(hoursLabel, "</span>\n                    <span>6").concat(hoursLabel, "</span>\n                    <span>").concat(globalTranslate.ex_Now || 'Now', "</span>\n                </div>\n            </div>\n        ");
    return timelineHtml;
  },

  /**
   * Initialize timeline tooltips after rendering
   */
  initializeTimelineTooltips: function initializeTimelineTooltips() {
    var _this$$deviceHistoryL2;

    // Initialize Fomantic UI tooltips for timeline segments
    (_this$$deviceHistoryL2 = this.$deviceHistoryList) === null || _this$$deviceHistoryL2 === void 0 ? void 0 : _this$$deviceHistoryL2.find('.device-timeline [title]').popup({
      variation: 'mini',
      position: 'top center',
      delay: {
        show: 300,
        hide: 100
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCJ1cGRhdGVUaW1lciIsImluaXRpYWxpemUiLCJleHRyYWN0RXh0ZW5zaW9uSWQiLCJjYWNoZUVsZW1lbnRzIiwic3Vic2NyaWJlVG9FdmVudHMiLCJsb2FkSW5pdGlhbFN0YXR1cyIsInN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lciIsIiRudW1iZXJGaWVsZCIsIiQiLCJsZW5ndGgiLCJ2YWwiLCJleHRlbnNpb25OdW1iZXIiLCJpbnB1dG1hc2siLCJlIiwicmVwbGFjZSIsInVybE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwic2V0VGltZW91dCIsIkV4dGVuc2lvbnNBUEkiLCJnZXRTdGF0dXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cGRhdGVTdGF0dXMiLCJsb2FkSGlzdG9yaWNhbERhdGEiLCJnZXRIaXN0b3J5IiwiaGlzdG9yeSIsImRpc3BsYXlIaXN0b3JpY2FsRGF0YSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInN0YXR1c2VzIiwic3RhdHVzRGF0YSIsInVwZGF0ZVN0YXR1c0xhYmVsIiwic3RhdHVzIiwidXBkYXRlQWN0aXZlRGV2aWNlcyIsImRldmljZXMiLCJjb2xvciIsImdldENvbG9yRm9yU3RhdHVzIiwibGFiZWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiaHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImV4X05vQWN0aXZlRGV2aWNlcyIsImRldmljZXNIdG1sIiwiZm9yRWFjaCIsImRldmljZSIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJpcCIsImNvbnRhY3RfaXAiLCJwb3J0IiwiaXBEaXNwbGF5IiwicnR0IiwidW5kZWZpbmVkIiwidG9GaXhlZCIsImlkIiwiYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycyIsImZpbmQiLCJvbiIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiJGl0ZW0iLCJjbG9zZXN0IiwiZGF0YUlkIiwicGFydHMiLCJzcGxpdCIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCJ0cmFuc2l0aW9uIiwicG9wdXAiLCJjb250ZW50IiwiZXhfSXBDb3BpZWQiLCJwb3NpdGlvbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIiR0ZW1wIiwiYXBwZW5kIiwic2VsZWN0IiwiZG9jdW1lbnQiLCJleGVjQ29tbWFuZCIsInJlbW92ZSIsImNzcyIsImhpc3RvcnlEYXRhIiwiZXhfTm9IaXN0b3J5QXZhaWxhYmxlIiwiZGV2aWNlR3JvdXBzIiwiZ3JvdXBIaXN0b3J5QnlEZXZpY2UiLCJoaXN0b3J5SHRtbCIsIk9iamVjdCIsImVudHJpZXMiLCJkZXZpY2VJbmRleCIsImRldmljZUtleSIsInNlc3Npb25zIiwiZGV2aWNlTmFtZSIsImRldmljZUlQIiwiZGV2aWNlSWQiLCJ0aW1lbGluZUh0bWwiLCJjcmVhdGVEZXZpY2VUaW1lbGluZSIsInNlc3Npb24iLCJpbmRleCIsImlzT25saW5lIiwiZXZlbnRMYWJlbCIsImV2ZW50X3R5cGUiLCJleF9EZXZpY2VEaXNjb25uZWN0ZWQiLCJleF9EZXZpY2VDb25uZWN0ZWQiLCJydHRMYWJlbCIsImdldFJ0dExhYmVsIiwiZGF0ZXRpbWUiLCJmb3JtYXREYXRlVGltZSIsImRhdGUiLCJ0aW1lc3RhbXAiLCJzdGF0dXNDbGFzcyIsInN0YXR1c1RpdGxlIiwiZHVyYXRpb25IdG1sIiwiZXhfT25saW5lIiwiY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93IiwiZHVyYXRpb24iLCJjYWxjdWxhdGVEdXJhdGlvbiIsImR1cmF0aW9uVGV4dCIsImV4X09mZmxpbmUiLCJpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcyIsImdyb3VwcyIsImVudHJ5IiwiaXBfYWRkcmVzcyIsImRldGFpbHMiLCJ0cmltIiwicHVzaCIsImtleXMiLCJrZXkiLCJzb3J0IiwiYSIsImIiLCJzb3J0ZWRHcm91cHMiLCJhTGF0ZXN0IiwiYkxhdGVzdCIsInNvcnRlZE9iamVjdCIsInZhbHVlIiwiY3VycmVudFRpbWVzdGFtcCIsInByZXZpb3VzVGltZXN0YW1wIiwiZGlmZiIsIk1hdGgiLCJhYnMiLCJtaW51dGVzIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmb3JtYXRUaW1lIiwiZGF0ZVN0ciIsImluY2x1ZGVzIiwidGltZVBhcnQiLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwidGltZSIsIm5vdyIsImlzVG9kYXkiLCJ0b0RhdGVTdHJpbmciLCJ5ZXN0ZXJkYXkiLCJzZXREYXRlIiwiZ2V0RGF0ZSIsImlzWWVzdGVyZGF5IiwibG9jYWxlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJnZXRVc2VyTG9jYWxlIiwidGltZVN0ciIsImhvdXIiLCJtaW51dGUiLCJzZWNvbmQiLCJ5ZXN0ZXJkYXlUZXh0IiwiZXhfWWVzdGVyZGF5IiwidG9Mb2NhbGVEYXRlU3RyaW5nIiwiZGF5IiwibW9udGgiLCJjbGVhckludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJ1cGRhdGVPbmxpbmVEdXJhdGlvbnMiLCIkZHVyYXRpb25zIiwiZWFjaCIsImVsZW1lbnQiLCIkZWxlbWVudCIsIm9ubGluZVNpbmNlIiwicGFyc2VJbnQiLCJ0ZXh0IiwiZGF5QWdvIiwicmVjZW50U2Vzc2lvbnMiLCJmaWx0ZXIiLCJzIiwic2VnbWVudER1cmF0aW9uIiwic2VnbWVudHMiLCJzZWdtZW50RGF0YSIsImZpbGwiLCJjaHJvbm9sb2dpY2FsU2Vzc2lvbnMiLCJyZXZlcnNlIiwibmV4dFNlc3Npb24iLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwic2VnbWVudEluZGV4Iiwic2VnbWVudFdpZHRoIiwiYmdDb2xvciIsImJvcmRlckxlZnQiLCJzZWdtZW50VGltZSIsInNlZ21lbnREYXRlIiwiaG91cnNMYWJlbCIsImV4X0hvdXJzX1Nob3J0IiwiZXhfTm93IiwidmFyaWF0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImRlc3Ryb3kiLCJ1bnN1YnNjcmliZSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSw0QkFBNEIsR0FBRztBQUNqQ0MsRUFBQUEsU0FBUyxFQUFFLGtCQURzQjtBQUVqQ0MsRUFBQUEsYUFBYSxFQUFFLEtBRmtCO0FBR2pDQyxFQUFBQSxrQkFBa0IsRUFBRSxJQUhhOztBQUtqQztBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBUm1CO0FBU2pDQyxFQUFBQSxrQkFBa0IsRUFBRSxJQVRhO0FBVWpDQyxFQUFBQSxrQkFBa0IsRUFBRSxJQVZhOztBQVlqQztBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBZm9COztBQWlCakM7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBcEJpQyx3QkFvQnBCO0FBQ1QsUUFBSSxLQUFLTixhQUFULEVBQXdCO0FBQ3BCO0FBQ0gsS0FIUSxDQUtUOzs7QUFDQSxTQUFLQyxrQkFBTCxHQUEwQixLQUFLTSxrQkFBTCxFQUExQjs7QUFDQSxRQUFJLENBQUMsS0FBS04sa0JBQVYsRUFBOEI7QUFDMUI7QUFDSCxLQVRRLENBV1Q7OztBQUNBLFNBQUtPLGFBQUwsR0FaUyxDQWNUOztBQUNBLFNBQUtDLGlCQUFMLEdBZlMsQ0FpQlQ7O0FBQ0EsU0FB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LFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJwTyw0QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIEV2ZW50QnVzLCBFeHRlbnNpb25zQVBJLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBNb2RpZnkgU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsaWZpZWQgc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbiBtb2RpZnkgcGFnZTpcbiAqIC0gU2luZ2xlIEFQSSBjYWxsIG9uIGluaXRpYWxpemF0aW9uXG4gKiAtIFJlYWwtdGltZSB1cGRhdGVzIHZpYSBFdmVudEJ1cyBvbmx5XG4gKiAtIE5vIHBlcmlvZGljIHBvbGxpbmdcbiAqIC0gQ2xlYW4gZGV2aWNlIGxpc3QgYW5kIGhpc3RvcnkgZGlzcGxheVxuICovXG5jb25zdCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ2V4dGVuc2lvbi1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGN1cnJlbnRFeHRlbnNpb25JZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNMYWJlbDogbnVsbCxcbiAgICAkYWN0aXZlRGV2aWNlc0xpc3Q6IG51bGwsXG4gICAgJGRldmljZUhpc3RvcnlMaXN0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnRlcnZhbCB0aW1lclxuICAgICAqL1xuICAgIHVwZGF0ZVRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGV4dGVuc2lvbiBudW1iZXIgZnJvbSBmb3JtXG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIGluaXRpYWwgQVBJIGNhbGxcbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRpbWVyIGZvciB1cGRhdGluZyBvbmxpbmUgZHVyYXRpb25zXG4gICAgICAgIHRoaXMuc3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyKCk7XG5cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGZvcm1cbiAgICAgKi9cbiAgICBleHRyYWN0RXh0ZW5zaW9uSWQoKSB7XG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gZ2V0IHRoZSBwaG9uZSBudW1iZXIgZnJvbSBmb3JtIGZpZWxkIChwcmltYXJ5KVxuICAgICAgICBjb25zdCAkbnVtYmVyRmllbGQgPSAkKCdpbnB1dFtuYW1lPVwibnVtYmVyXCJdJyk7XG4gICAgICAgIGlmICgkbnVtYmVyRmllbGQubGVuZ3RoICYmICRudW1iZXJGaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBpZiBpbnB1dG1hc2sgaXMgYXBwbGllZFxuICAgICAgICAgICAgbGV0IGV4dGVuc2lvbk51bWJlcjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIGlzIGF2YWlsYWJsZSBhbmQgYXBwbGllZCB0byB0aGUgZmllbGRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJG51bWJlckZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSAob25seSB0aGUgYWN0dWFsIGlucHV0IHdpdGhvdXQgbWFzayBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBpZiBpbnB1dG1hc2sgbWV0aG9kIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdGhlIHZhbHVlIC0gcmVtb3ZlIGFueSByZW1haW5pbmcgbWFzayBjaGFyYWN0ZXJzIGxpa2UgdW5kZXJzY29yZVxuICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gZXh0ZW5zaW9uTnVtYmVyLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgcmV0dXJuIGlmIHdlIGhhdmUgYWN0dWFsIGRpZ2l0c1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk51bWJlciAmJiBleHRlbnNpb25OdW1iZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIFVSTCBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsTWF0Y2ggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL1xcL2V4dGVuc2lvbnNcXC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgaWYgKHVybE1hdGNoICYmIHVybE1hdGNoWzFdKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGRhdGFiYXNlIElELCB3ZSBuZWVkIHRvIHdhaXQgZm9yIGZvcm0gdG8gbG9hZFxuICAgICAgICAgICAgLy8gV2UnbGwgZ2V0IHRoZSBhY3R1YWwgZXh0ZW5zaW9uIG51bWJlciBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICBjYWNoZUVsZW1lbnRzKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbCA9ICQoJyNzdGF0dXMnKTtcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgPSAkKCcjYWN0aXZlLWRldmljZXMtbGlzdCcpO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdCA9ICQoJyNkZXZpY2UtaGlzdG9yeS1saXN0Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGluaXRpYWwgc3RhdHVzIHdpdGggc2luZ2xlIEFQSSBjYWxsXG4gICAgICovXG4gICAgbG9hZEluaXRpYWxTdGF0dXMoKSB7XG4gICAgICAgIC8vIFJlLWNoZWNrIGV4dGVuc2lvbiBJRCBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWdhaW4gYWZ0ZXIgZGVsYXkgKGZvcm0gbWlnaHQgc3RpbGwgYmUgbG9hZGluZylcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMubG9hZEluaXRpYWxTdGF0dXMoKSwgNTAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIHNpbmdsZSBBUEkgY2FsbCBmb3IgY3VycmVudCBzdGF0dXNcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXModGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyBsb2FkIGhpc3RvcmljYWwgZGF0YVxuICAgICAgICB0aGlzLmxvYWRIaXN0b3JpY2FsRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBoaXN0b3JpY2FsIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkSGlzdG9yaWNhbERhdGEoKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGhpc3RvcnkgZnJvbSBBUElcbiAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRIaXN0b3J5KHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmhpc3RvcnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXlIaXN0b3JpY2FsRGF0YShyZXNwb25zZS5kYXRhLmhpc3RvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRCdXMgbm93IHNlbmRzIGRhdGEgZGlyZWN0bHkgd2l0aG91dCBkb3VibGUgbmVzdGluZ1xuICAgICAgICBjb25zdCBkYXRhID0gbWVzc2FnZTtcbiAgICAgICAgaWYgKGRhdGEuc3RhdHVzZXMgJiYgZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGRhdGEuc3RhdHVzZXNbdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWRdKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBkaXNwbGF5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNMYWJlbChzdGF0dXNEYXRhLnN0YXR1cyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIGRldmljZXNcbiAgICAgICAgdGhpcy51cGRhdGVBY3RpdmVEZXZpY2VzKHN0YXR1c0RhdGEuZGV2aWNlcyB8fCBbXSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEb24ndCBhZGQgdG8gaGlzdG9yeSAtIGhpc3RvcnkgaXMgbG9hZGVkIGZyb20gQVBJIG9ubHlcbiAgICAgICAgLy8gdGhpcy5hZGRUb0hpc3Rvcnkoc3RhdHVzRGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGxhYmVsXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGFiZWwoc3RhdHVzKSB7XG4gICAgICAgIGlmICghdGhpcy4kc3RhdHVzTGFiZWwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLmdldENvbG9yRm9yU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlW2BleF9TdGF0dXMke3N0YXR1c31gXSB8fCBzdGF0dXM7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBjbGFzcyBhbmQgdXBkYXRlIGNvbnRlbnRcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWxcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSBncmVlbiByZWQgeWVsbG93IGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKGNvbG9yKVxuICAgICAgICAgICAgLmh0bWwoYCR7bGFiZWx9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgZm9yIHN0YXR1cyB2YWx1ZVxuICAgICAqL1xuICAgIGdldENvbG9yRm9yU3RhdHVzKHN0YXR1cykge1xuICAgICAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnQXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuJztcbiAgICAgICAgICAgIGNhc2UgJ1VuYXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgY2FzZSAnRGlzYWJsZWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhY3RpdmUgZGV2aWNlcyBsaXN0XG4gICAgICovXG4gICAgdXBkYXRlQWN0aXZlRGV2aWNlcyhkZXZpY2VzKSB7XG4gICAgICAgIGlmICghdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgfHwgIUFycmF5LmlzQXJyYXkoZGV2aWNlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGRldmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9BY3RpdmVEZXZpY2VzIHx8ICdObyBhY3RpdmUgZGV2aWNlcyd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBsaXN0IHdpdGggdGVhbCBsYWJlbHMgbGlrZSB0aGUgb2xkIGVuZHBvaW50LWxpc3RcbiAgICAgICAgbGV0IGRldmljZXNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgXG4gICAgICAgIGRldmljZXMuZm9yRWFjaCgoZGV2aWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBkZXZpY2UudXNlcl9hZ2VudCB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICBjb25zdCBpcCA9IGRldmljZS5pcCB8fCBkZXZpY2UuY29udGFjdF9pcCB8fCAnLSc7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gZGV2aWNlLnBvcnQgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBpcERpc3BsYXkgPSBwb3J0ID8gYCR7aXB9OiR7cG9ydH1gIDogaXA7XG4gICAgICAgICAgICBjb25zdCBydHQgPSBkZXZpY2UucnR0ICE9PSBudWxsICYmIGRldmljZS5ydHQgIT09IHVuZGVmaW5lZCBcbiAgICAgICAgICAgICAgICA/IGAgKCR7ZGV2aWNlLnJ0dC50b0ZpeGVkKDIpfSBtcylgIFxuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBpZCA9IGAke3VzZXJBZ2VudH18JHtpcH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkZXZpY2VzSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWlkPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRlYWwgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dXNlckFnZW50fVxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRldGFpbFwiPiR7aXBEaXNwbGF5fSR7cnR0fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGV2aWNlc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0Lmh0bWwoZGV2aWNlc0h0bWwpO1xuXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIGNvcHkgSVAgYWRkcmVzc1xuICAgICAgICB0aGlzLmF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIGRldmljZSBsYWJlbHMgZm9yIElQIGNvcHlpbmdcbiAgICAgKi9cbiAgICBhdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5maW5kKCcuaXRlbSAudWkubGFiZWwnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaXRlbSA9ICRsYWJlbC5jbG9zZXN0KCcuaXRlbScpO1xuICAgICAgICAgICAgY29uc3QgZGF0YUlkID0gJGl0ZW0uZGF0YSgnaWQnKTtcblxuICAgICAgICAgICAgaWYgKCFkYXRhSWQpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBJUCBmcm9tIGRhdGEtaWQgKGZvcm1hdDogXCJVc2VyQWdlbnR8SVBcIilcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZGF0YUlkLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBpcCA9IHBhcnRzWzFdO1xuXG4gICAgICAgICAgICBpZiAoIWlwIHx8IGlwID09PSAnLScpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmQgdXNpbmcgdGhlIHNhbWUgbWV0aG9kIGFzIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICAgICAgaWYgKG5hdmlnYXRvci5jbGlwYm9hcmQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpIHtcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChpcCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBmZWVkYmFja1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwudHJhbnNpdGlvbigncHVsc2UnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBjaGFuZ2UgdGhlIGxhYmVsIGNvbG9yIHRvIGluZGljYXRlIHN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCd0ZWFsJykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCd0ZWFsJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgcG9wdXAgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0lwQ29waWVkIHx8ICdJUCBjb3BpZWQnfTogJHtpcH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJ1xuICAgICAgICAgICAgICAgICAgICB9KS5wb3B1cCgnc2hvdycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnBvcHVwKCdoaWRlJykucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHkgSVA6JywgZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXAgPSAkKCc8aW5wdXQ+Jyk7XG4gICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCgkdGVtcCk7XG4gICAgICAgICAgICAgICAgJHRlbXAudmFsKGlwKS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpO1xuICAgICAgICAgICAgICAgICR0ZW1wLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBmZWVkYmFja1xuICAgICAgICAgICAgICAgICRsYWJlbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygndGVhbCcpLmFkZENsYXNzKCdncmVlbicpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3RlYWwnKTtcbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGN1cnNvciBwb2ludGVyIHN0eWxlXG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0LmZpbmQoJy5pdGVtIC51aS5sYWJlbCcpLmNzcygnY3Vyc29yJywgJ3BvaW50ZXInKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGhpc3RvcmljYWwgZGF0YSBmcm9tIEFQSSB3aXRoIGRldmljZSBncm91cGluZ1xuICAgICAqL1xuICAgIGRpc3BsYXlIaXN0b3JpY2FsRGF0YShoaXN0b3J5RGF0YSkge1xuICAgICAgICBpZiAoIXRoaXMuJGRldmljZUhpc3RvcnlMaXN0IHx8ICFBcnJheS5pc0FycmF5KGhpc3RvcnlEYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhpc3RvcnlEYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QuaHRtbChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vSGlzdG9yeUF2YWlsYWJsZSB8fCAnTm8gaGlzdG9yeSBhdmFpbGFibGUnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR3JvdXAgaGlzdG9yeSBieSBkZXZpY2VcbiAgICAgICAgY29uc3QgZGV2aWNlR3JvdXBzID0gdGhpcy5ncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSk7XG5cbiAgICAgICAgLy8gQnVpbGQgSFRNTCBmb3IgZ3JvdXBlZCBkaXNwbGF5IC0gc2ltcGxpZmllZCBzdHJ1Y3R1cmVcbiAgICAgICAgbGV0IGhpc3RvcnlIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVkIGxpc3RcIj4nO1xuXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGRldmljZUdyb3VwcykuZm9yRWFjaCgoW2RldmljZUtleSwgc2Vzc2lvbnNdLCBkZXZpY2VJbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3VzZXJBZ2VudCwgaXBdID0gZGV2aWNlS2V5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VOYW1lID0gdXNlckFnZW50IHx8ICdVbmtub3duIERldmljZSc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJUCA9IChpcCAmJiBpcCAhPT0gJ1Vua25vd24nKSA/IGlwIDogJyc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJZCA9IGBkZXZpY2UtJHtkZXZpY2VJbmRleH1gO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGltZWxpbmUgSFRNTCBmb3IgdGhpcyBkZXZpY2VcbiAgICAgICAgICAgIGNvbnN0IHRpbWVsaW5lSHRtbCA9IHRoaXMuY3JlYXRlRGV2aWNlVGltZWxpbmUoc2Vzc2lvbnMsIGRldmljZUlkKTtcblxuICAgICAgICAgICAgLy8gRGV2aWNlIGhlYWRlciAtIGV4YWN0bHkgYXMgcmVxdWVzdGVkXG4gICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIm1vYmlsZSBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZU5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlSVAgPyBgPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JleTsgZm9udC1zaXplOjAuN2VtO1wiPiR7ZGV2aWNlSVB9PC8+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RpbWVsaW5lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2Vzc2lvbnMgdGltZWxpbmUgLSBzaW1wbGlmaWVkXG4gICAgICAgICAgICBzZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGV2ZW50IHR5cGUgdG8gZGV0ZXJtaW5lIGFjdHVhbCBkZXZpY2Ugc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IGlzT25saW5lID0gc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnO1xuICAgICAgICAgICAgICAgIGxldCBldmVudExhYmVsID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGV2aWNlLXNwZWNpZmljIGV2ZW50c1xuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlRGlzY29ubmVjdGVkIHx8ICdEaXNjb25uZWN0ZWQnfWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfYWRkZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzT25saW5lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlQ29ubmVjdGVkIHx8ICdDb25uZWN0ZWQnfWA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSB0aGlzLmdldFJ0dExhYmVsKHNlc3Npb24ucnR0KTtcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZGF0ZXRpbWUgd2l0aCBkYXRlIGFuZCB0aW1lXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZXRpbWUgPSB0aGlzLmZvcm1hdERhdGVUaW1lKHNlc3Npb24uZGF0ZSB8fCBzZXNzaW9uLnRpbWVzdGFtcCk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgY2lyY3VsYXIgbGFiZWxzIGxpa2UgaW4gZXh0ZW5zaW9ucyBsaXN0XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBpc09ubGluZSA/ICdncmVlbicgOiAnZ3JleSc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGl0bGUgPSBpc09ubGluZSA/ICdPbmxpbmUnIDogJ09mZmxpbmUnO1xuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uSHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgZmlyc3QgKG1vc3QgcmVjZW50KSBlbnRyeSB0aGF0IGlzIG9ubGluZSwgYWRkIGxpdmUgZHVyYXRpb25cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDAgJiYgaXNPbmxpbmUgJiYgc2Vzc2lvbi5ldmVudF90eXBlICE9PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkYXRhIGF0dHJpYnV0ZSB3aXRoIHRpbWVzdGFtcCBmb3IgbGl2ZSB1cGRhdGluZ1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkh0bWwgPSBgPHNwYW4gY2xhc3M9XCJ1aSBncmV5IHRleHQgb25saW5lLWR1cmF0aW9uXCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLW9ubGluZS1zaW5jZT1cIiR7c2Vzc2lvbi50aW1lc3RhbXB9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUgfHwgJ09ubGluZSd9ICR7dGhpcy5jYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3coc2Vzc2lvbi50aW1lc3RhbXApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBzdGF0aWMgZHVyYXRpb24gZm9yIGhpc3RvcmljYWwgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb24oc2Vzc2lvbi50aW1lc3RhbXAsIHNlc3Npb25zW2luZGV4IC0gMV0/LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcm1hdCBkdXJhdGlvbiB3aXRoIHRyYW5zbGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uVGV4dCA9IGR1cmF0aW9uICYmIGlzT25saW5lXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmUgfHwgJ09ubGluZSd9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmUgfHwgJ09mZmxpbmUnfSAke2R1cmF0aW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvblRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uSHRtbCA9IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj4ke2R1cmF0aW9uVGV4dH08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHRleHRcIiBzdHlsZT1cIm1hcmdpbjogNnB4IDIwcHg7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0dXNDbGFzc30gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiA4cHg7IGhlaWdodDogOHB4OyBtaW4taGVpZ2h0OiA4cHg7IG1hcmdpbi1yaWdodDogOHB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiJHtzdGF0dXNUaXRsZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRldGltZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAke2R1cmF0aW9uSHRtbCB8fCBldmVudExhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGhpc3RvcnlIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdC5odG1sKGhpc3RvcnlIdG1sKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVsaW5lIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGhpc3RvcnkgZXZlbnRzIGJ5IGRldmljZSBhbmQgc29ydCBieSBsYXN0IGV2ZW50XG4gICAgICovXG4gICAgZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG5cbiAgICAgICAgaGlzdG9yeURhdGEuZm9yRWFjaChlbnRyeSA9PiB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGV2aWNlIGtleSBmcm9tIHVzZXJfYWdlbnQgYW5kIElQXG4gICAgICAgICAgICBsZXQgZGV2aWNlS2V5ID0gJ1Vua25vd258VW5rbm93bic7XG5cbiAgICAgICAgICAgIGlmIChlbnRyeS51c2VyX2FnZW50IHx8IGVudHJ5LmlwX2FkZHJlc3MpIHtcbiAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHtlbnRyeS51c2VyX2FnZW50IHx8ICdVbmtub3duJ318JHtlbnRyeS5pcF9hZGRyZXNzIHx8ICdVbmtub3duJ31gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS5kZXRhaWxzKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgZGV2aWNlIGluZm8gZnJvbSBkZXRhaWxzXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBlbnRyeS5kZXRhaWxzLm1hdGNoKC8oW1xcd1xccy5dKylcXHMqLVxccyooW1xcZC5dKykvKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlS2V5ID0gYCR7bWF0Y2hbMV0udHJpbSgpfXwke21hdGNoWzJdLnRyaW0oKX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFncm91cHNbZGV2aWNlS2V5XSkge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1tkZXZpY2VLZXldID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdyb3Vwc1tkZXZpY2VLZXldLnB1c2goZW50cnkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0IHNlc3Npb25zIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHRpbWVzdGFtcCAobmV3ZXN0IGZpcnN0KVxuICAgICAgICBPYmplY3Qua2V5cyhncm91cHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1trZXldLnNvcnQoKGEsIGIpID0+IGIudGltZXN0YW1wIC0gYS50aW1lc3RhbXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IHRvIGFycmF5IGFuZCBzb3J0IGJ5IG1vc3QgcmVjZW50IGV2ZW50XG4gICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwcyA9IE9iamVjdC5lbnRyaWVzKGdyb3VwcylcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBtb3N0IHJlY2VudCB0aW1lc3RhbXAgZnJvbSBlYWNoIGdyb3VwIChmaXJzdCBlbGVtZW50IHNpbmNlIGFscmVhZHkgc29ydGVkKVxuICAgICAgICAgICAgICAgIGNvbnN0IGFMYXRlc3QgPSBhWzFdWzBdPy50aW1lc3RhbXAgfHwgMDtcbiAgICAgICAgICAgICAgICBjb25zdCBiTGF0ZXN0ID0gYlsxXVswXT8udGltZXN0YW1wIHx8IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJMYXRlc3QgLSBhTGF0ZXN0O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBiYWNrIHRvIG9iamVjdCB3aXRoIHNvcnRlZCBrZXlzXG4gICAgICAgIGNvbnN0IHNvcnRlZE9iamVjdCA9IHt9O1xuICAgICAgICBzb3J0ZWRHcm91cHMuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICBzb3J0ZWRPYmplY3Rba2V5XSA9IHZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc29ydGVkT2JqZWN0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGJldHdlZW4gdHdvIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbihjdXJyZW50VGltZXN0YW1wLCBwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgICAgICBpZiAoIXByZXZpb3VzVGltZXN0YW1wKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhwcmV2aW91c1RpbWVzdGFtcCAtIGN1cnJlbnRUaW1lc3RhbXApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lIGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgZm9ybWF0VGltZShkYXRlU3RyKSB7XG4gICAgICAgIGlmICghZGF0ZVN0cikgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhbHJlYWR5IGEgZm9ybWF0dGVkIGRhdGUgc3RyaW5nIGxpa2UgXCIyMDI1LTA5LTExIDExOjMwOjM2XCJcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnc3RyaW5nJyAmJiBkYXRlU3RyLmluY2x1ZGVzKCcgJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVQYXJ0ID0gZGF0ZVN0ci5zcGxpdCgnICcpWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVQYXJ0IHx8IGRhdGVTdHI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYSB0aW1lc3RhbXBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIgKiAxMDAwKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0ZVN0cjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBSVFQgbGFiZWwgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgKi9cbiAgICBnZXRSdHRMYWJlbChydHQpIHtcbiAgICAgICAgaWYgKHJ0dCA9PT0gbnVsbCB8fCBydHQgPT09IHVuZGVmaW5lZCB8fCBydHQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgaWYgKHJ0dCA+IDE1MCkge1xuICAgICAgICAgICAgY29sb3IgPSAncmVkJztcbiAgICAgICAgfSBlbHNlIGlmIChydHQgPiA1MCkge1xuICAgICAgICAgICAgY29sb3IgPSAnb2xpdmUnOyAgLy8geWVsbG93IGNhbiBiZSBoYXJkIHRvIHNlZSwgb2xpdmUgaXMgYmV0dGVyXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidWkgJHtjb2xvcn0gdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj5bUlRUOiAke3J0dC50b0ZpeGVkKDApfW1zXTwvc3Bhbj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZGF0ZXRpbWUgd2l0aCBkYXRlIGFuZCB0aW1lIHVzaW5nIGludGVyZmFjZSBsYW5ndWFnZVxuICAgICAqL1xuICAgIGZvcm1hdERhdGVUaW1lKHRpbWUpIHtcbiAgICAgICAgaWYgKCF0aW1lKSByZXR1cm4gJy0tOi0tJztcblxuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodHlwZW9mIHRpbWUgPT09ICdzdHJpbmcnID8gdGltZSA6IHRpbWUgKiAxMDAwKTtcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIHRvZGF5XG4gICAgICAgIGNvbnN0IGlzVG9kYXkgPSBkYXRlLnRvRGF0ZVN0cmluZygpID09PSBub3cudG9EYXRlU3RyaW5nKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyB5ZXN0ZXJkYXlcbiAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbmV3IERhdGUobm93KTtcbiAgICAgICAgeWVzdGVyZGF5LnNldERhdGUoeWVzdGVyZGF5LmdldERhdGUoKSAtIDEpO1xuICAgICAgICBjb25zdCBpc1llc3RlcmRheSA9IGRhdGUudG9EYXRlU3RyaW5nKCkgPT09IHllc3RlcmRheS50b0RhdGVTdHJpbmcoKTtcblxuICAgICAgICBjb25zdCBsb2NhbGUgPSBTZW1hbnRpY0xvY2FsaXphdGlvbi5nZXRVc2VyTG9jYWxlKCk7XG4gICAgICAgIGNvbnN0IHRpbWVTdHIgPSBkYXRlLnRvTG9jYWxlVGltZVN0cmluZyhsb2NhbGUsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBzZWNvbmQ6ICcyLWRpZ2l0J30pO1xuXG4gICAgICAgIGlmIChpc1RvZGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGltZVN0cjtcbiAgICAgICAgfSBlbHNlIGlmIChpc1llc3RlcmRheSkge1xuICAgICAgICAgICAgLy8gVXNlIHRyYW5zbGF0aW9uIGZvciBcIlllc3RlcmRheVwiIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgeWVzdGVyZGF5VGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9ZZXN0ZXJkYXkgfHwgJ1llc3RlcmRheSc7XG4gICAgICAgICAgICByZXR1cm4gYCR7eWVzdGVyZGF5VGV4dH0gJHt0aW1lU3RyfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3JtYXQgZGF0ZSBhY2NvcmRpbmcgdG8gbG9jYWxlXG4gICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcobG9jYWxlLCB7ZGF5OiAnMi1kaWdpdCcsIG1vbnRoOiAnMi1kaWdpdCd9KTtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXRlU3RyfSAke3RpbWVTdHJ9YDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZHVyYXRpb24gZnJvbSB0aW1lc3RhbXAgdG8gbm93XG4gICAgICovXG4gICAgY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGlmZiA9IG5vdyAtIHRpbWVzdGFtcDtcblxuICAgICAgICBpZiAoZGlmZiA8IDApIHJldHVybiAnMHMnO1xuXG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcblxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgdGltZXIgdG8gdXBkYXRlIG9ubGluZSBkdXJhdGlvbnNcbiAgICAgKi9cbiAgICBzdGFydER1cmF0aW9uVXBkYXRlVGltZXIoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBldmVyeSAxMCBzZWNvbmRzXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU9ubGluZUR1cmF0aW9ucygpO1xuICAgICAgICB9LCAxMDAwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhbGwgb25saW5lIGR1cmF0aW9uIGRpc3BsYXlzXG4gICAgICovXG4gICAgdXBkYXRlT25saW5lRHVyYXRpb25zKCkge1xuICAgICAgICBjb25zdCAkZHVyYXRpb25zID0gdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3Q/LmZpbmQoJy5vbmxpbmUtZHVyYXRpb25bZGF0YS1vbmxpbmUtc2luY2VdJyk7XG4gICAgICAgIGlmICghJGR1cmF0aW9ucyB8fCAkZHVyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGR1cmF0aW9ucy5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3Qgb25saW5lU2luY2UgPSBwYXJzZUludCgkZWxlbWVudC5kYXRhKCdvbmxpbmUtc2luY2UnKSwgMTApO1xuICAgICAgICAgICAgaWYgKG9ubGluZVNpbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyhvbmxpbmVTaW5jZSk7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQudGV4dChgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lIHx8ICdPbmxpbmUnfSAke2R1cmF0aW9ufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRpbWVsaW5lIHZpc3VhbGl6YXRpb24gZm9yIGEgZGV2aWNlJ3MgaGlzdG9yeVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHNlc3Npb25zIC0gQXJyYXkgb2Ygc2Vzc2lvbiBldmVudHMgZm9yIHRoZSBkZXZpY2VcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZGV2aWNlSWQgLSBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGRldmljZVxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhUTUwgZm9yIHRoZSB0aW1lbGluZVxuICAgICAqL1xuICAgIGNyZWF0ZURldmljZVRpbWVsaW5lKHNlc3Npb25zLCBkZXZpY2VJZCkge1xuICAgICAgICBpZiAoIXNlc3Npb25zIHx8IHNlc3Npb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRpbWUgcmFuZ2UgKGxhc3QgMjQgaG91cnMpXG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkYXlBZ28gPSBub3cgLSAoMjQgKiA2MCAqIDYwKTtcblxuICAgICAgICAvLyBGaWx0ZXIgc2Vzc2lvbnMgd2l0aGluIGxhc3QgMjQgaG91cnMgKHNlc3Npb25zIGFyZSBzb3J0ZWQgbmV3ZXN0IGZpcnN0KVxuICAgICAgICBjb25zdCByZWNlbnRTZXNzaW9ucyA9IHNlc3Npb25zLmZpbHRlcihzID0+IHMudGltZXN0YW1wID49IGRheUFnbyk7XG4gICAgICAgIGlmIChyZWNlbnRTZXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJzsgLy8gTm8gcmVjZW50IGFjdGl2aXR5XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgdGltZWxpbmUgc2VnbWVudHMgKDk2IHNlZ21lbnRzIGZvciAyNCBob3VycywgMTUgbWludXRlcyBlYWNoKVxuICAgICAgICBjb25zdCBzZWdtZW50RHVyYXRpb24gPSAxNSAqIDYwOyAvLyAxNSBtaW51dGVzIGluIHNlY29uZHNcbiAgICAgICAgY29uc3Qgc2VnbWVudHMgPSA5NjtcbiAgICAgICAgY29uc3Qgc2VnbWVudERhdGEgPSBuZXcgQXJyYXkoc2VnbWVudHMpLmZpbGwoJ2dyZXknKTtcblxuICAgICAgICAvLyBSZXZlcnNlIHNlc3Npb25zIHRvIHByb2Nlc3MgZnJvbSBvbGRlc3QgdG8gbmV3ZXN0XG4gICAgICAgIGNvbnN0IGNocm9ub2xvZ2ljYWxTZXNzaW9ucyA9IFsuLi5yZWNlbnRTZXNzaW9uc10ucmV2ZXJzZSgpO1xuXG4gICAgICAgIC8vIFByb2Nlc3Mgc2Vzc2lvbnMgdG8gZmlsbCBzZWdtZW50c1xuICAgICAgICBjaHJvbm9sb2dpY2FsU2Vzc2lvbnMuZm9yRWFjaCgoc2Vzc2lvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRTZXNzaW9uID0gY2hyb25vbG9naWNhbFNlc3Npb25zW2luZGV4ICsgMV07IC8vIE5leHQgZXZlbnQgaW4gdGltZVxuICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gc2Vzc2lvbi50aW1lc3RhbXA7XG4gICAgICAgICAgICBjb25zdCBlbmRUaW1lID0gbmV4dFNlc3Npb24gPyBuZXh0U2Vzc2lvbi50aW1lc3RhbXAgOiBub3c7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBzdGF0dXMgY29sb3IgYmFzZWQgb24gZXZlbnQgdHlwZSBhbmQgc3RhdHVzXG4gICAgICAgICAgICBsZXQgY29sb3IgPSAnZ3JleSc7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGV2ZW50IHR5cGUgZmlyc3RcbiAgICAgICAgICAgIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfYWRkZWQnIHx8IHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ3N0YXR1c19jaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgLy8gRGV2aWNlIGNhbWUgb25saW5lXG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgICAgICBjb2xvciA9ICdncmVlbic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JleSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXZpY2Ugd2VudCBvZmZsaW5lIC0gc2VnbWVudHMgQUZURVIgdGhpcyBldmVudCBzaG91bGQgYmUgZ3JleVxuICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZXknO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IHRvIGF2YWlsYWJsZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBjb2xvciA9ICdncmVlbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpbGwgc2VnbWVudHMgZm9yIHRoaXMgc2Vzc2lvbiBwZXJpb2RcbiAgICAgICAgICAgIGZvciAobGV0IHRpbWUgPSBzdGFydFRpbWU7IHRpbWUgPCBlbmRUaW1lICYmIHRpbWUgPD0gbm93OyB0aW1lICs9IHNlZ21lbnREdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRJbmRleCA9IE1hdGguZmxvb3IoKHRpbWUgLSBkYXlBZ28pIC8gc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEluZGV4ID49IDAgJiYgc2VnbWVudEluZGV4IDwgc2VnbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudERhdGFbc2VnbWVudEluZGV4XSA9IGNvbG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgdGltZWxpbmUgSFRNTFxuICAgICAgICBsZXQgdGltZWxpbmVIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRldmljZS10aW1lbGluZVwiIHN0eWxlPVwibWFyZ2luOiAxMHB4IDA7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEycHg7IGJhY2tncm91bmQ6ICNmM2Y0ZjU7IGJvcmRlci1yYWRpdXM6IDNweDsgb3ZlcmZsb3c6IGhpZGRlbjtcIj5cbiAgICAgICAgYDtcblxuICAgICAgICBzZWdtZW50RGF0YS5mb3JFYWNoKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRXaWR0aCA9IDEwMCAvIHNlZ21lbnRzO1xuICAgICAgICAgICAgY29uc3QgYmdDb2xvciA9IGNvbG9yID09PSAnZ3JlZW4nID8gJyMyMWJhNDUnIDogJyNlOGU4ZTgnO1xuICAgICAgICAgICAgY29uc3QgYm9yZGVyTGVmdCA9IGluZGV4ID4gMCA/ICcxcHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjIpJyA6ICdub25lJztcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgZm9yIHRoaXMgc2VnbWVudFxuICAgICAgICAgICAgY29uc3Qgc2VnbWVudFRpbWUgPSBkYXlBZ28gKyAoaW5kZXggKiBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3Qgc2VnbWVudERhdGUgPSBuZXcgRGF0ZShzZWdtZW50VGltZSAqIDEwMDApO1xuXG4gICAgICAgICAgICAvLyBHZXQgdXNlcidzIGxvY2FsZVxuICAgICAgICAgICAgY29uc3QgbG9jYWxlID0gU2VtYW50aWNMb2NhbGl6YXRpb24uZ2V0VXNlckxvY2FsZSgpO1xuICAgICAgICAgICAgY29uc3QgdGltZVN0ciA9IHNlZ21lbnREYXRlLnRvTG9jYWxlVGltZVN0cmluZyhsb2NhbGUsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSk7XG5cbiAgICAgICAgICAgIHRpbWVsaW5lSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cIndpZHRoOiAke3NlZ21lbnRXaWR0aH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQtY29sb3I6ICR7YmdDb2xvcn07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyBib3JkZXItbGVmdDogJHtib3JkZXJMZWZ0fTtcIlxuICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke3RpbWVTdHJ9IC0gJHtjb2xvciA9PT0gJ2dyZWVuJyA/ICdPbmxpbmUnIDogJ09mZmxpbmUnfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGltZSBsYWJlbHMgd2l0aCBsb2NhbGl6YXRpb25cbiAgICAgICAgY29uc3QgaG91cnNMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9Ib3Vyc19TaG9ydCB8fCAnaCc7XG5cbiAgICAgICAgdGltZWxpbmVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBtYXJnaW4tdG9wOiAycHg7IGZvbnQtc2l6ZTogMTBweDsgY29sb3I6ICM5OTk7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjI0JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MTgke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4xMiR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjYke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob3cgfHwgJ05vdyd9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG5cbiAgICAgICAgcmV0dXJuIHRpbWVsaW5lSHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lbGluZSB0b29sdGlwcyBhZnRlciByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSB0b29sdGlwcyBmb3IgdGltZWxpbmUgc2VnbWVudHNcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3Q/LmZpbmQoJy5kZXZpY2UtdGltZWxpbmUgW3RpdGxlXScpLnBvcHVwKHtcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ21pbmknLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIENsZWFyIHVwZGF0ZSB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBleHRlbnNpb24tbW9kaWZ5LmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3I7XG59Il19