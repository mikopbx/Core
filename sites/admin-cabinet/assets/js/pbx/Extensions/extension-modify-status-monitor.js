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

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage, EventBus, SipAPI, SemanticLocalization */

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


    SipAPI.getStatus(this.currentExtensionId, function (response) {
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


    SipAPI.getHistory(this.currentExtensionId, function (response) {
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
      this.$activeDevicesList.html("\n                <div class=\"ui message\">\n                    <div class=\"content\">\n                        ".concat(globalTranslate.ex_NoActiveDevices, "\n                    </div>\n                </div>\n            "));
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
            content: "".concat(globalTranslate.ex_IpCopied, ": ").concat(ip),
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
      this.$deviceHistoryList.html("\n                <div class=\"ui message\">\n                    <div class=\"content\">\n                        ".concat(globalTranslate.ex_NoHistoryAvailable, "\n                    </div>\n                </div>\n            "));
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
          eventLabel = " ".concat(globalTranslate.ex_DeviceDisconnected);
        } else if (session.event_type === 'device_added') {
          isOnline = true;
          eventLabel = " ".concat(globalTranslate.ex_DeviceConnected);
        }

        var rttLabel = _this4.getRttLabel(session.rtt); // Format datetime with date and time


        var datetime = _this4.formatDateTime(session.date || session.timestamp); // Use circular labels like in extensions list


        var statusClass = isOnline ? 'green' : 'grey';
        var statusTitle = isOnline ? 'Online' : 'Offline';
        var durationHtml = ''; // For the first (most recent) entry that is online, add live duration

        if (index === 0 && isOnline && session.event_type !== 'device_removed') {
          // Add data attribute with timestamp for live updating
          durationHtml = "<span class=\"ui grey text online-duration\" style=\"margin-left: 8px;\"\n                                          data-online-since=\"".concat(session.timestamp, "\">\n                                          ").concat(globalTranslate.ex_Online, " ").concat(_this4.calculateDurationFromNow(session.timestamp), "\n                                     </span>");
        } else {
          var _sessions;

          // Calculate static duration for historical entries
          var duration = _this4.calculateDuration(session.timestamp, (_sessions = sessions[index - 1]) === null || _sessions === void 0 ? void 0 : _sessions.timestamp); // Format duration with translation


          var durationText = duration && isOnline ? "".concat(globalTranslate.ex_Online, " ").concat(duration) : duration ? "".concat(globalTranslate.ex_Offline, " ").concat(duration) : '';

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
      var yesterdayText = globalTranslate.ex_Yesterday;
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

        $element.text("".concat(globalTranslate.ex_Online, " ").concat(duration));
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

    var hoursLabel = globalTranslate.ex_Hours_Short;
    timelineHtml += "\n                </div>\n                <div style=\"display: flex; justify-content: space-between; margin-top: 2px; font-size: 10px; color: #999;\">\n                    <span>24".concat(hoursLabel, "</span>\n                    <span>18").concat(hoursLabel, "</span>\n                    <span>12").concat(hoursLabel, "</span>\n                    <span>6").concat(hoursLabel, "</span>\n                    <span>").concat(globalTranslate.ex_Now, "</span>\n                </div>\n            </div>\n        ");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCJ1cGRhdGVUaW1lciIsImluaXRpYWxpemUiLCJleHRyYWN0RXh0ZW5zaW9uSWQiLCJjYWNoZUVsZW1lbnRzIiwic3Vic2NyaWJlVG9FdmVudHMiLCJsb2FkSW5pdGlhbFN0YXR1cyIsInN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lciIsIiRudW1iZXJGaWVsZCIsIiQiLCJsZW5ndGgiLCJ2YWwiLCJleHRlbnNpb25OdW1iZXIiLCJpbnB1dG1hc2siLCJlIiwicmVwbGFjZSIsInVybE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwic2V0VGltZW91dCIsIlNpcEFQSSIsImdldFN0YXR1cyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInVwZGF0ZVN0YXR1cyIsImxvYWRIaXN0b3JpY2FsRGF0YSIsImdldEhpc3RvcnkiLCJoaXN0b3J5IiwiZGlzcGxheUhpc3RvcmljYWxEYXRhIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJtZXNzYWdlIiwiaGFuZGxlRXZlbnRCdXNNZXNzYWdlIiwic3RhdHVzZXMiLCJzdGF0dXNEYXRhIiwidXBkYXRlU3RhdHVzTGFiZWwiLCJzdGF0dXMiLCJ1cGRhdGVBY3RpdmVEZXZpY2VzIiwiZGV2aWNlcyIsImNvbG9yIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJsYWJlbCIsImdsb2JhbFRyYW5zbGF0ZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJodG1sIiwiQXJyYXkiLCJpc0FycmF5IiwiZXhfTm9BY3RpdmVEZXZpY2VzIiwiZGV2aWNlc0h0bWwiLCJmb3JFYWNoIiwiZGV2aWNlIiwidXNlckFnZW50IiwidXNlcl9hZ2VudCIsImlwIiwiY29udGFjdF9pcCIsInBvcnQiLCJpcERpc3BsYXkiLCJydHQiLCJ1bmRlZmluZWQiLCJ0b0ZpeGVkIiwiaWQiLCJhdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzIiwiZmluZCIsIm9uIiwicHJldmVudERlZmF1bHQiLCIkbGFiZWwiLCIkaXRlbSIsImNsb3Nlc3QiLCJkYXRhSWQiLCJwYXJ0cyIsInNwbGl0IiwibmF2aWdhdG9yIiwiY2xpcGJvYXJkIiwid3JpdGVUZXh0IiwidGhlbiIsInRyYW5zaXRpb24iLCJwb3B1cCIsImNvbnRlbnQiLCJleF9JcENvcGllZCIsInBvc2l0aW9uIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwiJHRlbXAiLCJhcHBlbmQiLCJzZWxlY3QiLCJkb2N1bWVudCIsImV4ZWNDb21tYW5kIiwicmVtb3ZlIiwiY3NzIiwiaGlzdG9yeURhdGEiLCJleF9Ob0hpc3RvcnlBdmFpbGFibGUiLCJkZXZpY2VHcm91cHMiLCJncm91cEhpc3RvcnlCeURldmljZSIsImhpc3RvcnlIdG1sIiwiT2JqZWN0IiwiZW50cmllcyIsImRldmljZUluZGV4IiwiZGV2aWNlS2V5Iiwic2Vzc2lvbnMiLCJkZXZpY2VOYW1lIiwiZGV2aWNlSVAiLCJkZXZpY2VJZCIsInRpbWVsaW5lSHRtbCIsImNyZWF0ZURldmljZVRpbWVsaW5lIiwic2Vzc2lvbiIsImluZGV4IiwiaXNPbmxpbmUiLCJldmVudExhYmVsIiwiZXZlbnRfdHlwZSIsImV4X0RldmljZURpc2Nvbm5lY3RlZCIsImV4X0RldmljZUNvbm5lY3RlZCIsInJ0dExhYmVsIiwiZ2V0UnR0TGFiZWwiLCJkYXRldGltZSIsImZvcm1hdERhdGVUaW1lIiwiZGF0ZSIsInRpbWVzdGFtcCIsInN0YXR1c0NsYXNzIiwic3RhdHVzVGl0bGUiLCJkdXJhdGlvbkh0bWwiLCJleF9PbmxpbmUiLCJjYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3ciLCJkdXJhdGlvbiIsImNhbGN1bGF0ZUR1cmF0aW9uIiwiZHVyYXRpb25UZXh0IiwiZXhfT2ZmbGluZSIsImluaXRpYWxpemVUaW1lbGluZVRvb2x0aXBzIiwiZ3JvdXBzIiwiZW50cnkiLCJpcF9hZGRyZXNzIiwiZGV0YWlscyIsInRyaW0iLCJwdXNoIiwia2V5cyIsImtleSIsInNvcnQiLCJhIiwiYiIsInNvcnRlZEdyb3VwcyIsImFMYXRlc3QiLCJiTGF0ZXN0Iiwic29ydGVkT2JqZWN0IiwidmFsdWUiLCJjdXJyZW50VGltZXN0YW1wIiwicHJldmlvdXNUaW1lc3RhbXAiLCJkaWZmIiwiTWF0aCIsImFicyIsIm1pbnV0ZXMiLCJmbG9vciIsImhvdXJzIiwiZGF5cyIsImZvcm1hdFRpbWUiLCJkYXRlU3RyIiwiaW5jbHVkZXMiLCJ0aW1lUGFydCIsIkRhdGUiLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJ0aW1lIiwibm93IiwiaXNUb2RheSIsInRvRGF0ZVN0cmluZyIsInllc3RlcmRheSIsInNldERhdGUiLCJnZXREYXRlIiwiaXNZZXN0ZXJkYXkiLCJsb2NhbGUiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImdldFVzZXJMb2NhbGUiLCJ0aW1lU3RyIiwiaG91ciIsIm1pbnV0ZSIsInNlY29uZCIsInllc3RlcmRheVRleHQiLCJleF9ZZXN0ZXJkYXkiLCJ0b0xvY2FsZURhdGVTdHJpbmciLCJkYXkiLCJtb250aCIsImNsZWFySW50ZXJ2YWwiLCJzZXRJbnRlcnZhbCIsInVwZGF0ZU9ubGluZUR1cmF0aW9ucyIsIiRkdXJhdGlvbnMiLCJlYWNoIiwiZWxlbWVudCIsIiRlbGVtZW50Iiwib25saW5lU2luY2UiLCJwYXJzZUludCIsInRleHQiLCJkYXlBZ28iLCJyZWNlbnRTZXNzaW9ucyIsImZpbHRlciIsInMiLCJzZWdtZW50RHVyYXRpb24iLCJzZWdtZW50cyIsInNlZ21lbnREYXRhIiwiZmlsbCIsImNocm9ub2xvZ2ljYWxTZXNzaW9ucyIsInJldmVyc2UiLCJuZXh0U2Vzc2lvbiIsInN0YXJ0VGltZSIsImVuZFRpbWUiLCJzZWdtZW50SW5kZXgiLCJzZWdtZW50V2lkdGgiLCJiZ0NvbG9yIiwiYm9yZGVyTGVmdCIsInNlZ21lbnRUaW1lIiwic2VnbWVudERhdGUiLCJob3Vyc0xhYmVsIiwiZXhfSG91cnNfU2hvcnQiLCJleF9Ob3ciLCJ2YXJpYXRpb24iLCJkZWxheSIsInNob3ciLCJoaWRlIiwiZGVzdHJveSIsInVuc3Vic2NyaWJlIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLDRCQUE0QixHQUFHO0FBQ2pDQyxFQUFBQSxTQUFTLEVBQUUsa0JBRHNCO0FBRWpDQyxFQUFBQSxhQUFhLEVBQUUsS0FGa0I7QUFHakNDLEVBQUFBLGtCQUFrQixFQUFFLElBSGE7O0FBS2pDO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFSbUI7QUFTakNDLEVBQUFBLGtCQUFrQixFQUFFLElBVGE7QUFVakNDLEVBQUFBLGtCQUFrQixFQUFFLElBVmE7O0FBWWpDO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxXQUFXLEVBQUUsSUFmb0I7O0FBaUJqQztBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFwQmlDLHdCQW9CcEI7QUFDVCxRQUFJLEtBQUtOLGFBQVQsRUFBd0I7QUFDcEI7QUFDSCxLQUhRLENBS1Q7OztBQUNBLFNBQUtDLGtCQUFMLEdBQTBCLEtBQUtNLGtCQUFMLEVBQTFCOztBQUNBLFFBQUksQ0FBQyxLQUFLTixrQkFBVixFQUE4QjtBQUMxQjtBQUNILEtBVFEsQ0FXVDs7O0FBQ0EsU0FBS08sYUFBTCxHQVpTLENBY1Q7O0FBQ0EsU0FBS0MsaUJBQUwsR0FmUyxDQWlCVDs7QUFDQSxTQUFLQyxpQkFB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bmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBFdmVudEJ1cywgU2lwQVBJLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBNb2RpZnkgU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsaWZpZWQgc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbiBtb2RpZnkgcGFnZTpcbiAqIC0gU2luZ2xlIEFQSSBjYWxsIG9uIGluaXRpYWxpemF0aW9uXG4gKiAtIFJlYWwtdGltZSB1cGRhdGVzIHZpYSBFdmVudEJ1cyBvbmx5XG4gKiAtIE5vIHBlcmlvZGljIHBvbGxpbmdcbiAqIC0gQ2xlYW4gZGV2aWNlIGxpc3QgYW5kIGhpc3RvcnkgZGlzcGxheVxuICovXG5jb25zdCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ2V4dGVuc2lvbi1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGN1cnJlbnRFeHRlbnNpb25JZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNMYWJlbDogbnVsbCxcbiAgICAkYWN0aXZlRGV2aWNlc0xpc3Q6IG51bGwsXG4gICAgJGRldmljZUhpc3RvcnlMaXN0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnRlcnZhbCB0aW1lclxuICAgICAqL1xuICAgIHVwZGF0ZVRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGV4dGVuc2lvbiBudW1iZXIgZnJvbSBmb3JtXG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIGluaXRpYWwgQVBJIGNhbGxcbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRpbWVyIGZvciB1cGRhdGluZyBvbmxpbmUgZHVyYXRpb25zXG4gICAgICAgIHRoaXMuc3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyKCk7XG5cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGZvcm1cbiAgICAgKi9cbiAgICBleHRyYWN0RXh0ZW5zaW9uSWQoKSB7XG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gZ2V0IHRoZSBwaG9uZSBudW1iZXIgZnJvbSBmb3JtIGZpZWxkIChwcmltYXJ5KVxuICAgICAgICBjb25zdCAkbnVtYmVyRmllbGQgPSAkKCdpbnB1dFtuYW1lPVwibnVtYmVyXCJdJyk7XG4gICAgICAgIGlmICgkbnVtYmVyRmllbGQubGVuZ3RoICYmICRudW1iZXJGaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBpZiBpbnB1dG1hc2sgaXMgYXBwbGllZFxuICAgICAgICAgICAgbGV0IGV4dGVuc2lvbk51bWJlcjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIGlzIGF2YWlsYWJsZSBhbmQgYXBwbGllZCB0byB0aGUgZmllbGRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJG51bWJlckZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSAob25seSB0aGUgYWN0dWFsIGlucHV0IHdpdGhvdXQgbWFzayBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBpZiBpbnB1dG1hc2sgbWV0aG9kIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdGhlIHZhbHVlIC0gcmVtb3ZlIGFueSByZW1haW5pbmcgbWFzayBjaGFyYWN0ZXJzIGxpa2UgdW5kZXJzY29yZVxuICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gZXh0ZW5zaW9uTnVtYmVyLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgcmV0dXJuIGlmIHdlIGhhdmUgYWN0dWFsIGRpZ2l0c1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk51bWJlciAmJiBleHRlbnNpb25OdW1iZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIFVSTCBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsTWF0Y2ggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL1xcL2V4dGVuc2lvbnNcXC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgaWYgKHVybE1hdGNoICYmIHVybE1hdGNoWzFdKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGRhdGFiYXNlIElELCB3ZSBuZWVkIHRvIHdhaXQgZm9yIGZvcm0gdG8gbG9hZFxuICAgICAgICAgICAgLy8gV2UnbGwgZ2V0IHRoZSBhY3R1YWwgZXh0ZW5zaW9uIG51bWJlciBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICBjYWNoZUVsZW1lbnRzKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbCA9ICQoJyNzdGF0dXMnKTtcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgPSAkKCcjYWN0aXZlLWRldmljZXMtbGlzdCcpO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdCA9ICQoJyNkZXZpY2UtaGlzdG9yeS1saXN0Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGluaXRpYWwgc3RhdHVzIHdpdGggc2luZ2xlIEFQSSBjYWxsXG4gICAgICovXG4gICAgbG9hZEluaXRpYWxTdGF0dXMoKSB7XG4gICAgICAgIC8vIFJlLWNoZWNrIGV4dGVuc2lvbiBJRCBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWdhaW4gYWZ0ZXIgZGVsYXkgKGZvcm0gbWlnaHQgc3RpbGwgYmUgbG9hZGluZylcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMubG9hZEluaXRpYWxTdGF0dXMoKSwgNTAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIHNpbmdsZSBBUEkgY2FsbCBmb3IgY3VycmVudCBzdGF0dXNcbiAgICAgICAgU2lwQVBJLmdldFN0YXR1cyh0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHNvIGxvYWQgaGlzdG9yaWNhbCBkYXRhXG4gICAgICAgIHRoaXMubG9hZEhpc3RvcmljYWxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGhpc3RvcmljYWwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRIaXN0b3JpY2FsRGF0YSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggaGlzdG9yeSBmcm9tIEFQSVxuICAgICAgICBTaXBBUEkuZ2V0SGlzdG9yeSh0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5oaXN0b3J5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5SGlzdG9yaWNhbERhdGEocmVzcG9uc2UuZGF0YS5oaXN0b3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2V4dGVuc2lvbi1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBFdmVudEJ1cyBtZXNzYWdlXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdyBzZW5kcyBkYXRhIGRpcmVjdGx5IHdpdGhvdXQgZG91YmxlIG5lc3RpbmdcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2U7XG4gICAgICAgIGlmIChkYXRhLnN0YXR1c2VzICYmIGRhdGEuc3RhdHVzZXNbdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWRdKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNEYXRhKSB7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdHVzIGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzTGFiZWwoc3RhdHVzRGF0YS5zdGF0dXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBkZXZpY2VzXG4gICAgICAgIHRoaXMudXBkYXRlQWN0aXZlRGV2aWNlcyhzdGF0dXNEYXRhLmRldmljZXMgfHwgW10pO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9uJ3QgYWRkIHRvIGhpc3RvcnkgLSBoaXN0b3J5IGlzIGxvYWRlZCBmcm9tIEFQSSBvbmx5XG4gICAgICAgIC8vIHRoaXMuYWRkVG9IaXN0b3J5KHN0YXR1c0RhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1cykge1xuICAgICAgICBpZiAoIXRoaXMuJHN0YXR1c0xhYmVsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpO1xuICAgICAgICBjb25zdCBsYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZVtgZXhfU3RhdHVzJHtzdGF0dXN9YF0gfHwgc3RhdHVzO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBjb250ZW50XG4gICAgICAgIHRoaXMuJHN0YXR1c0xhYmVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZXkgZ3JlZW4gcmVkIHllbGxvdyBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhjb2xvcilcbiAgICAgICAgICAgIC5odG1sKGAke2xhYmVsfWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGNvbG9yIGZvciBzdGF0dXMgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpIHtcbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ0F2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVbmF2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGNhc2UgJ0Rpc2FibGVkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWN0aXZlIGRldmljZXMgbGlzdFxuICAgICAqL1xuICAgIHVwZGF0ZUFjdGl2ZURldmljZXMoZGV2aWNlcykge1xuICAgICAgICBpZiAoIXRoaXMuJGFjdGl2ZURldmljZXNMaXN0IHx8ICFBcnJheS5pc0FycmF5KGRldmljZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChkZXZpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuaHRtbChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vQWN0aXZlRGV2aWNlc31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGxpc3Qgd2l0aCB0ZWFsIGxhYmVscyBsaWtlIHRoZSBvbGQgZW5kcG9pbnQtbGlzdFxuICAgICAgICBsZXQgZGV2aWNlc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgZGV2aWNlcy5mb3JFYWNoKChkZXZpY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IGRldmljZS51c2VyX2FnZW50IHx8ICdVbmtub3duJztcbiAgICAgICAgICAgIGNvbnN0IGlwID0gZGV2aWNlLmlwIHx8IGRldmljZS5jb250YWN0X2lwIHx8ICctJztcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBkZXZpY2UucG9ydCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlwRGlzcGxheSA9IHBvcnQgPyBgJHtpcH06JHtwb3J0fWAgOiBpcDtcbiAgICAgICAgICAgIGNvbnN0IHJ0dCA9IGRldmljZS5ydHQgIT09IG51bGwgJiYgZGV2aWNlLnJ0dCAhPT0gdW5kZWZpbmVkIFxuICAgICAgICAgICAgICAgID8gYCAoJHtkZXZpY2UucnR0LnRvRml4ZWQoMil9IG1zKWAgXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGlkID0gYCR7dXNlckFnZW50fXwke2lwfWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRldmljZXNIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtaWQ9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGVhbCBsYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt1c2VyQWdlbnR9XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGV0YWlsXCI+JHtpcERpc3BsYXl9JHtydHR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzSHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuaHRtbChkZXZpY2VzSHRtbCk7XG5cbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gY29weSBJUCBhZGRyZXNzXG4gICAgICAgIHRoaXMuYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gZGV2aWNlIGxhYmVscyBmb3IgSVAgY29weWluZ1xuICAgICAqL1xuICAgIGF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMoKSB7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0LmZpbmQoJy5pdGVtIC51aS5sYWJlbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpdGVtID0gJGxhYmVsLmNsb3Nlc3QoJy5pdGVtJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRhSWQgPSAkaXRlbS5kYXRhKCdpZCcpO1xuXG4gICAgICAgICAgICBpZiAoIWRhdGFJZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IElQIGZyb20gZGF0YS1pZCAoZm9ybWF0OiBcIlVzZXJBZ2VudHxJUFwiKVxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBkYXRhSWQuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IGlwID0gcGFydHNbMV07XG5cbiAgICAgICAgICAgIGlmICghaXAgfHwgaXAgPT09ICctJykgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBDb3B5IHRvIGNsaXBib2FyZCB1c2luZyB0aGUgc2FtZSBtZXRob2QgYXMgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yLmNsaXBib2FyZCAmJiBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCkge1xuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGlwKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IGNoYW5nZSB0aGUgbGFiZWwgY29sb3IgdG8gaW5kaWNhdGUgc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ3RlYWwnKS5hZGRDbGFzcygnZ3JlZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3RlYWwnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBwb3B1cCBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfSXBDb3BpZWR9OiAke2lwfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInXG4gICAgICAgICAgICAgICAgICAgIH0pLnBvcHVwKCdzaG93Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbGFiZWwucG9wdXAoJ2hpZGUnKS5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY29weSBJUDonLCBlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcCA9ICQoJzxpbnB1dD4nKTtcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKCR0ZW1wKTtcbiAgICAgICAgICAgICAgICAkdGVtcC52YWwoaXApLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAgICAgJHRlbXAucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgJGxhYmVsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCd0ZWFsJykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygndGVhbCcpO1xuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY3Vyc29yIHBvaW50ZXIgc3R5bGVcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuZmluZCgnLml0ZW0gLnVpLmxhYmVsJykuY3NzKCdjdXJzb3InLCAncG9pbnRlcicpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJIHdpdGggZGV2aWNlIGdyb3VwaW5nXG4gICAgICovXG4gICAgZGlzcGxheUhpc3RvcmljYWxEYXRhKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGlmICghdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgfHwgIUFycmF5LmlzQXJyYXkoaGlzdG9yeURhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGlzdG9yeURhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9IaXN0b3J5QXZhaWxhYmxlfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR3JvdXAgaGlzdG9yeSBieSBkZXZpY2VcbiAgICAgICAgY29uc3QgZGV2aWNlR3JvdXBzID0gdGhpcy5ncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSk7XG5cbiAgICAgICAgLy8gQnVpbGQgSFRNTCBmb3IgZ3JvdXBlZCBkaXNwbGF5IC0gc2ltcGxpZmllZCBzdHJ1Y3R1cmVcbiAgICAgICAgbGV0IGhpc3RvcnlIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVkIGxpc3RcIj4nO1xuXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGRldmljZUdyb3VwcykuZm9yRWFjaCgoW2RldmljZUtleSwgc2Vzc2lvbnNdLCBkZXZpY2VJbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3VzZXJBZ2VudCwgaXBdID0gZGV2aWNlS2V5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VOYW1lID0gdXNlckFnZW50IHx8ICdVbmtub3duIERldmljZSc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJUCA9IChpcCAmJiBpcCAhPT0gJ1Vua25vd24nKSA/IGlwIDogJyc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJZCA9IGBkZXZpY2UtJHtkZXZpY2VJbmRleH1gO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGltZWxpbmUgSFRNTCBmb3IgdGhpcyBkZXZpY2VcbiAgICAgICAgICAgIGNvbnN0IHRpbWVsaW5lSHRtbCA9IHRoaXMuY3JlYXRlRGV2aWNlVGltZWxpbmUoc2Vzc2lvbnMsIGRldmljZUlkKTtcblxuICAgICAgICAgICAgLy8gRGV2aWNlIGhlYWRlciAtIGV4YWN0bHkgYXMgcmVxdWVzdGVkXG4gICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIm1vYmlsZSBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZU5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlSVAgPyBgPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JleTsgZm9udC1zaXplOjAuN2VtO1wiPiR7ZGV2aWNlSVB9PC8+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RpbWVsaW5lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2Vzc2lvbnMgdGltZWxpbmUgLSBzaW1wbGlmaWVkXG4gICAgICAgICAgICBzZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGV2ZW50IHR5cGUgdG8gZGV0ZXJtaW5lIGFjdHVhbCBkZXZpY2Ugc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IGlzT25saW5lID0gc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnO1xuICAgICAgICAgICAgICAgIGxldCBldmVudExhYmVsID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGV2aWNlLXNwZWNpZmljIGV2ZW50c1xuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlRGlzY29ubmVjdGVkfWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfYWRkZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzT25saW5lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlQ29ubmVjdGVkfWA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSB0aGlzLmdldFJ0dExhYmVsKHNlc3Npb24ucnR0KTtcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZGF0ZXRpbWUgd2l0aCBkYXRlIGFuZCB0aW1lXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZXRpbWUgPSB0aGlzLmZvcm1hdERhdGVUaW1lKHNlc3Npb24uZGF0ZSB8fCBzZXNzaW9uLnRpbWVzdGFtcCk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgY2lyY3VsYXIgbGFiZWxzIGxpa2UgaW4gZXh0ZW5zaW9ucyBsaXN0XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBpc09ubGluZSA/ICdncmVlbicgOiAnZ3JleSc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGl0bGUgPSBpc09ubGluZSA/ICdPbmxpbmUnIDogJ09mZmxpbmUnO1xuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uSHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgZmlyc3QgKG1vc3QgcmVjZW50KSBlbnRyeSB0aGF0IGlzIG9ubGluZSwgYWRkIGxpdmUgZHVyYXRpb25cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDAgJiYgaXNPbmxpbmUgJiYgc2Vzc2lvbi5ldmVudF90eXBlICE9PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkYXRhIGF0dHJpYnV0ZSB3aXRoIHRpbWVzdGFtcCBmb3IgbGl2ZSB1cGRhdGluZ1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkh0bWwgPSBgPHNwYW4gY2xhc3M9XCJ1aSBncmV5IHRleHQgb25saW5lLWR1cmF0aW9uXCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLW9ubGluZS1zaW5jZT1cIiR7c2Vzc2lvbi50aW1lc3RhbXB9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7dGhpcy5jYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3coc2Vzc2lvbi50aW1lc3RhbXApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBzdGF0aWMgZHVyYXRpb24gZm9yIGhpc3RvcmljYWwgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb24oc2Vzc2lvbi50aW1lc3RhbXAsIHNlc3Npb25zW2luZGV4IC0gMV0/LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcm1hdCBkdXJhdGlvbiB3aXRoIHRyYW5zbGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uVGV4dCA9IGR1cmF0aW9uICYmIGlzT25saW5lXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmV9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25IdG1sID0gYDxzcGFuIGNsYXNzPVwidWkgZ3JleSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPiR7ZHVyYXRpb25UZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgdGV4dFwiIHN0eWxlPVwibWFyZ2luOiA2cHggMjBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NsYXNzfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDhweDsgaGVpZ2h0OiA4cHg7IG1pbi1oZWlnaHQ6IDhweDsgbWFyZ2luLXJpZ2h0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke3N0YXR1c1RpdGxlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2RhdGV0aW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtydHRMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZHVyYXRpb25IdG1sIHx8IGV2ZW50TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaGlzdG9yeUh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoaGlzdG9yeUh0bWwpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZWxpbmUgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGltZWxpbmVUb29sdGlwcygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgaGlzdG9yeSBldmVudHMgYnkgZGV2aWNlIGFuZCBzb3J0IGJ5IGxhc3QgZXZlbnRcbiAgICAgKi9cbiAgICBncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSkge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcblxuICAgICAgICBoaXN0b3J5RGF0YS5mb3JFYWNoKGVudHJ5ID0+IHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBkZXZpY2Uga2V5IGZyb20gdXNlcl9hZ2VudCBhbmQgSVBcbiAgICAgICAgICAgIGxldCBkZXZpY2VLZXkgPSAnVW5rbm93bnxVbmtub3duJztcblxuICAgICAgICAgICAgaWYgKGVudHJ5LnVzZXJfYWdlbnQgfHwgZW50cnkuaXBfYWRkcmVzcykge1xuICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke2VudHJ5LnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nfXwke2VudHJ5LmlwX2FkZHJlc3MgfHwgJ1Vua25vd24nfWA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmRldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBkZXZpY2UgaW5mbyBmcm9tIGRldGFpbHNcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IGVudHJ5LmRldGFpbHMubWF0Y2goLyhbXFx3XFxzLl0rKVxccyotXFxzKihbXFxkLl0rKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHttYXRjaFsxXS50cmltKCl9fCR7bWF0Y2hbMl0udHJpbSgpfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1tkZXZpY2VLZXldKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0gPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0ucHVzaChlbnRyeSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNvcnQgc2Vzc2lvbnMgd2l0aGluIGVhY2ggZ3JvdXAgYnkgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpXG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgZ3JvdXBzW2tleV0uc29ydCgoYSwgYikgPT4gYi50aW1lc3RhbXAgLSBhLnRpbWVzdGFtcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgdG8gYXJyYXkgYW5kIHNvcnQgYnkgbW9zdCByZWNlbnQgZXZlbnRcbiAgICAgICAgY29uc3Qgc29ydGVkR3JvdXBzID0gT2JqZWN0LmVudHJpZXMoZ3JvdXBzKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIG1vc3QgcmVjZW50IHRpbWVzdGFtcCBmcm9tIGVhY2ggZ3JvdXAgKGZpcnN0IGVsZW1lbnQgc2luY2UgYWxyZWFkeSBzb3J0ZWQpXG4gICAgICAgICAgICAgICAgY29uc3QgYUxhdGVzdCA9IGFbMV1bMF0/LnRpbWVzdGFtcCB8fCAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJMYXRlc3QgPSBiWzFdWzBdPy50aW1lc3RhbXAgfHwgMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYkxhdGVzdCAtIGFMYXRlc3Q7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGJhY2sgdG8gb2JqZWN0IHdpdGggc29ydGVkIGtleXNcbiAgICAgICAgY29uc3Qgc29ydGVkT2JqZWN0ID0ge307XG4gICAgICAgIHNvcnRlZEdyb3Vwcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIHNvcnRlZE9iamVjdFtrZXldID0gdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWRPYmplY3Q7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZHVyYXRpb24gYmV0d2VlbiB0d28gdGltZXN0YW1wc1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZUR1cmF0aW9uKGN1cnJlbnRUaW1lc3RhbXAsIHByZXZpb3VzVGltZXN0YW1wKSB7XG4gICAgICAgIGlmICghcHJldmlvdXNUaW1lc3RhbXApIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGlmZiA9IE1hdGguYWJzKHByZXZpb3VzVGltZXN0YW1wIC0gY3VycmVudFRpbWVzdGFtcCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9ZCAke2hvdXJzICUgMjR9aGA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9aCAke21pbnV0ZXMgJSA2MH1tYDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9bWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGlmZn1zYDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWUgZm9yIGRpc3BsYXlcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKGRhdGVTdHIpIHtcbiAgICAgICAgaWYgKCFkYXRlU3RyKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBpdCdzIGFscmVhZHkgYSBmb3JtYXR0ZWQgZGF0ZSBzdHJpbmcgbGlrZSBcIjIwMjUtMDktMTEgMTE6MzA6MzZcIlxuICAgICAgICBpZiAodHlwZW9mIGRhdGVTdHIgPT09ICdzdHJpbmcnICYmIGRhdGVTdHIuaW5jbHVkZXMoJyAnKSkge1xuICAgICAgICAgICAgY29uc3QgdGltZVBhcnQgPSBkYXRlU3RyLnNwbGl0KCcgJylbMV07XG4gICAgICAgICAgICByZXR1cm4gdGltZVBhcnQgfHwgZGF0ZVN0cjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhIHRpbWVzdGFtcFxuICAgICAgICBpZiAodHlwZW9mIGRhdGVTdHIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0ciAqIDEwMDApO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYXRlU3RyO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IFJUVCBsYWJlbCB3aXRoIGNvbG9yIGNvZGluZ1xuICAgICAqL1xuICAgIGdldFJ0dExhYmVsKHJ0dCkge1xuICAgICAgICBpZiAocnR0ID09PSBudWxsIHx8IHJ0dCA9PT0gdW5kZWZpbmVkIHx8IHJ0dCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICBpZiAocnR0ID4gMTUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdyZWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHJ0dCA+IDUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdvbGl2ZSc7ICAvLyB5ZWxsb3cgY2FuIGJlIGhhcmQgdG8gc2VlLCBvbGl2ZSBpcyBiZXR0ZXJcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ1aSAke2NvbG9yfSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPltSVFQ6ICR7cnR0LnRvRml4ZWQoMCl9bXNdPC9zcGFuPmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkYXRldGltZSB3aXRoIGRhdGUgYW5kIHRpbWUgdXNpbmcgaW50ZXJmYWNlIGxhbmd1YWdlXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZSkge1xuICAgICAgICBpZiAoIXRpbWUpIHJldHVybiAnLS06LS0nO1xuXG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0eXBlb2YgdGltZSA9PT0gJ3N0cmluZycgPyB0aW1lIDogdGltZSAqIDEwMDApO1xuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgdG9kYXlcbiAgICAgICAgY29uc3QgaXNUb2RheSA9IGRhdGUudG9EYXRlU3RyaW5nKCkgPT09IG5vdy50b0RhdGVTdHJpbmcoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIHllc3RlcmRheVxuICAgICAgICBjb25zdCB5ZXN0ZXJkYXkgPSBuZXcgRGF0ZShub3cpO1xuICAgICAgICB5ZXN0ZXJkYXkuc2V0RGF0ZSh5ZXN0ZXJkYXkuZ2V0RGF0ZSgpIC0gMSk7XG4gICAgICAgIGNvbnN0IGlzWWVzdGVyZGF5ID0gZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0geWVzdGVyZGF5LnRvRGF0ZVN0cmluZygpO1xuXG4gICAgICAgIGNvbnN0IGxvY2FsZSA9IFNlbWFudGljTG9jYWxpemF0aW9uLmdldFVzZXJMb2NhbGUoKTtcbiAgICAgICAgY29uc3QgdGltZVN0ciA9IGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKGxvY2FsZSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcsIHNlY29uZDogJzItZGlnaXQnfSk7XG5cbiAgICAgICAgaWYgKGlzVG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aW1lU3RyO1xuICAgICAgICB9IGVsc2UgaWYgKGlzWWVzdGVyZGF5KSB7XG4gICAgICAgICAgICAvLyBVc2UgdHJhbnNsYXRpb24gZm9yIFwiWWVzdGVyZGF5XCIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBjb25zdCB5ZXN0ZXJkYXlUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X1llc3RlcmRheTtcbiAgICAgICAgICAgIHJldHVybiBgJHt5ZXN0ZXJkYXlUZXh0fSAke3RpbWVTdHJ9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBkYXRlIGFjY29yZGluZyB0byBsb2NhbGVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyhsb2NhbGUsIHtkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICcyLWRpZ2l0J30pO1xuICAgICAgICAgICAgcmV0dXJuIGAke2RhdGVTdHJ9ICR7dGltZVN0cn1gO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkdXJhdGlvbiBmcm9tIHRpbWVzdGFtcCB0byBub3dcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3codGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkaWZmID0gbm93IC0gdGltZXN0YW1wO1xuXG4gICAgICAgIGlmIChkaWZmIDwgMCkgcmV0dXJuICcwcyc7XG5cbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGhvdXJzIC8gMjQpO1xuXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9ZCAke2hvdXJzICUgMjR9aGA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9aCAke21pbnV0ZXMgJSA2MH1tYDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9bWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGlmZn1zYDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCB0aW1lciB0byB1cGRhdGUgb25saW5lIGR1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lcigpIHtcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudXBkYXRlVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGV2ZXJ5IDEwIHNlY29uZHNcbiAgICAgICAgdGhpcy51cGRhdGVUaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT25saW5lRHVyYXRpb25zKCk7XG4gICAgICAgIH0sIDEwMDAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBvbmxpbmUgZHVyYXRpb24gZGlzcGxheXNcbiAgICAgKi9cbiAgICB1cGRhdGVPbmxpbmVEdXJhdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbnMgPSB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdD8uZmluZCgnLm9ubGluZS1kdXJhdGlvbltkYXRhLW9ubGluZS1zaW5jZV0nKTtcbiAgICAgICAgaWYgKCEkZHVyYXRpb25zIHx8ICRkdXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkZHVyYXRpb25zLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBvbmxpbmVTaW5jZSA9IHBhcnNlSW50KCRlbGVtZW50LmRhdGEoJ29ubGluZS1zaW5jZScpLCAxMCk7XG4gICAgICAgICAgICBpZiAob25saW5lU2luY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KG9ubGluZVNpbmNlKTtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC50ZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7ZHVyYXRpb259YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGltZWxpbmUgdmlzdWFsaXphdGlvbiBmb3IgYSBkZXZpY2UncyBoaXN0b3J5XG4gICAgICogQHBhcmFtIHtBcnJheX0gc2Vzc2lvbnMgLSBBcnJheSBvZiBzZXNzaW9uIGV2ZW50cyBmb3IgdGhlIGRldmljZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkZXZpY2VJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgZGV2aWNlXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCBmb3IgdGhlIHRpbWVsaW5lXG4gICAgICovXG4gICAgY3JlYXRlRGV2aWNlVGltZWxpbmUoc2Vzc2lvbnMsIGRldmljZUlkKSB7XG4gICAgICAgIGlmICghc2Vzc2lvbnMgfHwgc2Vzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGltZSByYW5nZSAobGFzdCAyNCBob3VycylcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuXG4gICAgICAgIC8vIEZpbHRlciBzZXNzaW9ucyB3aXRoaW4gbGFzdCAyNCBob3VycyAoc2Vzc2lvbnMgYXJlIHNvcnRlZCBuZXdlc3QgZmlyc3QpXG4gICAgICAgIGNvbnN0IHJlY2VudFNlc3Npb25zID0gc2Vzc2lvbnMuZmlsdGVyKHMgPT4gcy50aW1lc3RhbXAgPj0gZGF5QWdvKTtcbiAgICAgICAgaWYgKHJlY2VudFNlc3Npb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBObyByZWNlbnQgYWN0aXZpdHlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aW1lbGluZSBzZWdtZW50cyAoOTYgc2VnbWVudHMgZm9yIDI0IGhvdXJzLCAxNSBtaW51dGVzIGVhY2gpXG4gICAgICAgIGNvbnN0IHNlZ21lbnREdXJhdGlvbiA9IDE1ICogNjA7IC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZWdtZW50cyA9IDk2O1xuICAgICAgICBjb25zdCBzZWdtZW50RGF0YSA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbCgnZ3JleScpO1xuXG4gICAgICAgIC8vIFJldmVyc2Ugc2Vzc2lvbnMgdG8gcHJvY2VzcyBmcm9tIG9sZGVzdCB0byBuZXdlc3RcbiAgICAgICAgY29uc3QgY2hyb25vbG9naWNhbFNlc3Npb25zID0gWy4uLnJlY2VudFNlc3Npb25zXS5yZXZlcnNlKCk7XG5cbiAgICAgICAgLy8gUHJvY2VzcyBzZXNzaW9ucyB0byBmaWxsIHNlZ21lbnRzXG4gICAgICAgIGNocm9ub2xvZ2ljYWxTZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dFNlc3Npb24gPSBjaHJvbm9sb2dpY2FsU2Vzc2lvbnNbaW5kZXggKyAxXTsgLy8gTmV4dCBldmVudCBpbiB0aW1lXG4gICAgICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBzZXNzaW9uLnRpbWVzdGFtcDtcbiAgICAgICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXh0U2Vzc2lvbiA/IG5leHRTZXNzaW9uLnRpbWVzdGFtcCA6IG5vdztcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHN0YXR1cyBjb2xvciBiYXNlZCBvbiBldmVudCB0eXBlIGFuZCBzdGF0dXNcbiAgICAgICAgICAgIGxldCBjb2xvciA9ICdncmV5JztcblxuICAgICAgICAgICAgLy8gQ2hlY2sgZXZlbnQgdHlwZSBmaXJzdFxuICAgICAgICAgICAgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9hZGRlZCcgfHwgc2Vzc2lvbi5ldmVudF90eXBlID09PSAnc3RhdHVzX2NoYW5nZScpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXZpY2UgY2FtZSBvbmxpbmVcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xvciA9ICdncmV5JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgIC8vIERldmljZSB3ZW50IG9mZmxpbmUgLSBzZWdtZW50cyBBRlRFUiB0aGlzIGV2ZW50IHNob3VsZCBiZSBncmV5XG4gICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JleSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgdG8gYXZhaWxhYmxlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmlsbCBzZWdtZW50cyBmb3IgdGhpcyBzZXNzaW9uIHBlcmlvZFxuICAgICAgICAgICAgZm9yIChsZXQgdGltZSA9IHN0YXJ0VGltZTsgdGltZSA8IGVuZFRpbWUgJiYgdGltZSA8PSBub3c7IHRpbWUgKz0gc2VnbWVudER1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEluZGV4ID0gTWF0aC5mbG9vcigodGltZSAtIGRheUFnbykgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgICAgIGlmIChzZWdtZW50SW5kZXggPj0gMCAmJiBzZWdtZW50SW5kZXggPCBzZWdtZW50cykge1xuICAgICAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdID0gY29sb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCB0aW1lbGluZSBIVE1MXG4gICAgICAgIGxldCB0aW1lbGluZUh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGV2aWNlLXRpbWVsaW5lXCIgc3R5bGU9XCJtYXJnaW46IDEwcHggMDtcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTJweDsgYmFja2dyb3VuZDogI2YzZjRmNTsgYm9yZGVyLXJhZGl1czogM3B4OyBvdmVyZmxvdzogaGlkZGVuO1wiPlxuICAgICAgICBgO1xuXG4gICAgICAgIHNlZ21lbnREYXRhLmZvckVhY2goKGNvbG9yLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VnbWVudFdpZHRoID0gMTAwIC8gc2VnbWVudHM7XG4gICAgICAgICAgICBjb25zdCBiZ0NvbG9yID0gY29sb3IgPT09ICdncmVlbicgPyAnIzIxYmE0NScgOiAnI2U4ZThlOCc7XG4gICAgICAgICAgICBjb25zdCBib3JkZXJMZWZ0ID0gaW5kZXggPiAwID8gJzFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LDAuMiknIDogJ25vbmUnO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBmb3IgdGhpcyBzZWdtZW50XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50VGltZSA9IGRheUFnbyArIChpbmRleCAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50RGF0ZSA9IG5ldyBEYXRlKHNlZ21lbnRUaW1lICogMTAwMCk7XG5cbiAgICAgICAgICAgIC8vIEdldCB1c2VyJ3MgbG9jYWxlXG4gICAgICAgICAgICBjb25zdCBsb2NhbGUgPSBTZW1hbnRpY0xvY2FsaXphdGlvbi5nZXRVc2VyTG9jYWxlKCk7XG4gICAgICAgICAgICBjb25zdCB0aW1lU3RyID0gc2VnbWVudERhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKGxvY2FsZSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KTtcblxuICAgICAgICAgICAgdGltZWxpbmVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwid2lkdGg6ICR7c2VnbWVudFdpZHRofSU7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZC1jb2xvcjogJHtiZ0NvbG9yfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IGJvcmRlci1sZWZ0OiAke2JvcmRlckxlZnR9O1wiXG4gICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7dGltZVN0cn0gLSAke2NvbG9yID09PSAnZ3JlZW4nID8gJ09ubGluZScgOiAnT2ZmbGluZSd9XCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaW1lIGxhYmVscyB3aXRoIGxvY2FsaXphdGlvblxuICAgICAgICBjb25zdCBob3Vyc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0hvdXJzX1Nob3J0O1xuXG4gICAgICAgIHRpbWVsaW5lSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgbWFyZ2luLXRvcDogMnB4OyBmb250LXNpemU6IDEwcHg7IGNvbG9yOiAjOTk5O1wiPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4yNCR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjE4JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MTIke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj42JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTm93fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuXG4gICAgICAgIHJldHVybiB0aW1lbGluZUh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdG9vbHRpcHMgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9tYW50aWMgVUkgdG9vbHRpcHMgZm9yIHRpbWVsaW5lIHNlZ21lbnRzXG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Py5maW5kKCcuZGV2aWNlLXRpbWVsaW5lIFt0aXRsZV0nKS5wb3B1cCh7XG4gICAgICAgICAgICB2YXJpYXRpb246ICdtaW5pJyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBDbGVhciB1cGRhdGUgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy51cGRhdGVUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IG51bGw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gZXh0ZW5zaW9uLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yO1xufSJdfQ==