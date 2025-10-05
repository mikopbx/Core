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

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage, EventBus, SipAPI, FirewallAPI, UserMessage, SemanticLocalization */

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
  $securityTable: null,
  $noSecurityData: null,

  /**
   * Security data
   */
  securityData: {},
  bannedIps: {},

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

    this.loadInitialStatus(); // Load security data

    this.loadSecurityData(); // Start timer for updating online durations

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
    this.$securityTable = $('#security-failed-auth-table');
    this.$noSecurityData = $('#no-security-data');
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
    } // Refresh security data on config changes


    window.addEventListener('ConfigDataChanged', function () {
      _this3.loadSecurityData();
    });
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
   * Load authentication failure statistics and banned IPs
   */
  loadSecurityData: function loadSecurityData() {
    var _this7 = this;

    var extension = this.currentExtensionId;

    if (!extension) {
      return;
    } // Fetch auth failures via SipAPI


    SipAPI.getAuthFailureStats(extension, function (response) {
      if (response && response.result) {
        _this7.securityData = response.data || {};
      } else {
        _this7.securityData = {};
      } // Fetch banned IPs via FirewallAPI


      FirewallAPI.getBannedIps(function (bannedResponse) {
        if (bannedResponse && bannedResponse.result) {
          _this7.bannedIps = bannedResponse.data || {};
        } else {
          _this7.bannedIps = {};
        } // Render the combined data


        _this7.renderSecurityTable();
      });
    });
  },

  /**
   * Render security table with color-coded rows
   * Red row = banned IP, Green row = not banned
   */
  renderSecurityTable: function renderSecurityTable() {
    var _this8 = this;

    var tbody = this.$securityTable.find('tbody');
    tbody.empty();
    var failures = this.securityData;

    if (!failures || Object.keys(failures).length === 0) {
      this.$securityTable.hide();
      this.$noSecurityData.show();
      return;
    }

    this.$securityTable.show();
    this.$noSecurityData.hide(); // Iterate through failed auth IPs

    Object.entries(failures).forEach(function (_ref5) {
      var _ref6 = _slicedToArray(_ref5, 2),
          ip = _ref6[0],
          stats = _ref6[1];

      var isBanned = _this8.bannedIps.hasOwnProperty(ip); // Use Fomantic UI table row states
      // 'negative' = red row (banned)
      // 'positive' = green row (not banned)


      var rowClass = isBanned ? 'negative' : 'positive';
      var lastAttempt = new Date(stats.last_attempt * 1000).toLocaleString(); // Show unban button only for banned IPs

      var actionButton = isBanned ? "<button class=\"ui mini red icon button unban-ip\"\n                           data-ip=\"".concat(ip, "\"\n                           data-tooltip=\"").concat(globalTranslate.ex_SecurityUnban, "\"\n                           data-position=\"left center\">\n                       <i class=\"unlock icon\"></i>\n                   </button>") : '';
      var row = "\n                <tr class=\"".concat(rowClass, "\">\n                    <td><strong>").concat(ip, "</strong></td>\n                    <td>").concat(stats.count, "</td>\n                    <td>").concat(lastAttempt, "</td>\n                    <td class=\"center aligned\">").concat(actionButton, "</td>\n                </tr>\n            ");
      tbody.append(row);
    }); // Initialize tooltips for unban buttons

    this.$securityTable.find('[data-tooltip]').popup(); // Bind unban button handlers

    this.$securityTable.find('.unban-ip').on('click', function (e) {
      _this8.handleUnbanClick(e);
    });
  },

  /**
   * Handle unban button click
   * @param {Event} e - Click event
   */
  handleUnbanClick: function handleUnbanClick(e) {
    e.preventDefault();
    var $button = $(e.currentTarget);
    var ip = $button.data('ip');

    if (!ip) {
      return;
    }

    $button.addClass('loading disabled'); // Call FirewallAPI to unban IP

    FirewallAPI.unbanIp(ip, function (response) {
      if (response && response.result) {
        // Just reload security data - table will update visually
        // Red row will become green row
        ExtensionModifyStatusMonitor.loadSecurityData();
      } else {
        // Only show error message
        var errorMsg = response && response.messages ? response.messages : {
          error: ['Failed to unban IP']
        };
        UserMessage.showMultiString(errorMsg);
        $button.removeClass('loading disabled');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCIkc2VjdXJpdHlUYWJsZSIsIiRub1NlY3VyaXR5RGF0YSIsInNlY3VyaXR5RGF0YSIsImJhbm5lZElwcyIsInVwZGF0ZVRpbWVyIiwiaW5pdGlhbGl6ZSIsImV4dHJhY3RFeHRlbnNpb25JZCIsImNhY2hlRWxlbWVudHMiLCJzdWJzY3JpYmVUb0V2ZW50cyIsImxvYWRJbml0aWFsU3RhdHVzIiwibG9hZFNlY3VyaXR5RGF0YSIsInN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lciIsIiRudW1iZXJGaWVsZCIsIiQiLCJsZW5ndGgiLCJ2YWwiLCJleHRlbnNpb25OdW1iZXIiLCJpbnB1dG1hc2siLCJlIiwicmVwbGFjZSIsInVybE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwic2V0VGltZW91dCIsIlNpcEFQSSIsImdldFN0YXR1cyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInVwZGF0ZVN0YXR1cyIsImxvYWRIaXN0b3JpY2FsRGF0YSIsImdldEhpc3RvcnkiLCJoaXN0b3J5IiwiZGlzcGxheUhpc3RvcmljYWxEYXRhIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJtZXNzYWdlIiwiaGFuZGxlRXZlbnRCdXNNZXNzYWdlIiwiYWRkRXZlbnRMaXN0ZW5lciIsInN0YXR1c2VzIiwic3RhdHVzRGF0YSIsInVwZGF0ZVN0YXR1c0xhYmVsIiwic3RhdHVzIiwidXBkYXRlQWN0aXZlRGV2aWNlcyIsImRldmljZXMiLCJjb2xvciIsImdldENvbG9yRm9yU3RhdHVzIiwibGFiZWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiaHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImV4X05vQWN0aXZlRGV2aWNlcyIsImRldmljZXNIdG1sIiwiZm9yRWFjaCIsImRldmljZSIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJpcCIsImNvbnRhY3RfaXAiLCJwb3J0IiwiaXBEaXNwbGF5IiwicnR0IiwidW5kZWZpbmVkIiwidG9GaXhlZCIsImlkIiwiYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycyIsImZpbmQiLCJvbiIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiJGl0ZW0iLCJjbG9zZXN0IiwiZGF0YUlkIiwicGFydHMiLCJzcGxpdCIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCJ0cmFuc2l0aW9uIiwicG9wdXAiLCJjb250ZW50IiwiZXhfSXBDb3BpZWQiLCJwb3NpdGlvbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIiR0ZW1wIiwiYXBwZW5kIiwic2VsZWN0IiwiZG9jdW1lbnQiLCJleGVjQ29tbWFuZCIsInJlbW92ZSIsImNzcyIsImhpc3RvcnlEYXRhIiwiZXhfTm9IaXN0b3J5QXZhaWxhYmxlIiwiZGV2aWNlR3JvdXBzIiwiZ3JvdXBIaXN0b3J5QnlEZXZpY2UiLCJoaXN0b3J5SHRtbCIsIk9iamVjdCIsImVudHJpZXMiLCJkZXZpY2VJbmRleCIsImRldmljZUtleSIsInNlc3Npb25zIiwiZGV2aWNlTmFtZSIsImRldmljZUlQIiwiZGV2aWNlSWQiLCJ0aW1lbGluZUh0bWwiLCJjcmVhdGVEZXZpY2VUaW1lbGluZSIsInNlc3Npb24iLCJpbmRleCIsImlzT25saW5lIiwiZXZlbnRMYWJlbCIsImV2ZW50X3R5cGUiLCJleF9EZXZpY2VEaXNjb25uZWN0ZWQiLCJleF9EZXZpY2VDb25uZWN0ZWQiLCJydHRMYWJlbCIsImdldFJ0dExhYmVsIiwiZGF0ZXRpbWUiLCJmb3JtYXREYXRlVGltZSIsImRhdGUiLCJ0aW1lc3RhbXAiLCJzdGF0dXNDbGFzcyIsInN0YXR1c1RpdGxlIiwiZHVyYXRpb25IdG1sIiwiZXhfT25saW5lIiwiY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93IiwiZHVyYXRpb24iLCJjYWxjdWxhdGVEdXJhdGlvbiIsImR1cmF0aW9uVGV4dCIsImV4X09mZmxpbmUiLCJpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcyIsImdyb3VwcyIsImVudHJ5IiwiaXBfYWRkcmVzcyIsImRldGFpbHMiLCJ0cmltIiwicHVzaCIsImtleXMiLCJrZXkiLCJzb3J0IiwiYSIsImIiLCJzb3J0ZWRHcm91cHMiLCJhTGF0ZXN0IiwiYkxhdGVzdCIsInNvcnRlZE9iamVjdCIsInZhbHVlIiwiY3VycmVudFRpbWVzdGFtcCIsInByZXZpb3VzVGltZXN0YW1wIiwiZGlmZiIsIk1hdGgiLCJhYnMiLCJtaW51dGVzIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmb3JtYXRUaW1lIiwiZGF0ZVN0ciIsImluY2x1ZGVzIiwidGltZVBhcnQiLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwidGltZSIsIm5vdyIsImlzVG9kYXkiLCJ0b0RhdGVTdHJpbmciLCJ5ZXN0ZXJkYXkiLCJzZXREYXRlIiwiZ2V0RGF0ZSIsImlzWWVzdGVyZGF5IiwibG9jYWxlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJnZXRVc2VyTG9jYWxlIiwidGltZVN0ciIsImhvdXIiLCJtaW51dGUiLCJzZWNvbmQiLCJ5ZXN0ZXJkYXlUZXh0IiwiZXhfWWVzdGVyZGF5IiwidG9Mb2NhbGVEYXRlU3RyaW5nIiwiZGF5IiwibW9udGgiLCJjbGVhckludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJ1cGRhdGVPbmxpbmVEdXJhdGlvbnMiLCIkZHVyYXRpb25zIiwiZWFjaCIsImVsZW1lbnQiLCIkZWxlbWVudCIsIm9ubGluZVNpbmNlIiwicGFyc2VJbnQiLCJ0ZXh0IiwiZGF5QWdvIiwicmVjZW50U2Vzc2lvbnMiLCJmaWx0ZXIiLCJzIiwic2VnbWVudER1cmF0aW9uIiwic2VnbWVudHMiLCJzZWdtZW50RGF0YSIsImZpbGwiLCJjaHJvbm9sb2dpY2FsU2Vzc2lvbnMiLCJyZXZlcnNlIiwibmV4dFNlc3Npb24iLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwic2VnbWVudEluZGV4Iiwic2VnbWVudFdpZHRoIiwiYmdDb2xvciIsImJvcmRlckxlZnQiLCJzZWdtZW50VGltZSIsInNlZ21lbnREYXRlIiwiaG91cnNMYWJlbCIsImV4X0hvdXJzX1Nob3J0IiwiZXhfTm93IiwidmFyaWF0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImV4dGVuc2lvbiIsImdldEF1dGhGYWlsdXJlU3RhdHMiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImJhbm5lZFJlc3BvbnNlIiwicmVuZGVyU2VjdXJpdHlUYWJsZSIsInRib2R5IiwiZW1wdHkiLCJmYWlsdXJlcyIsInN0YXRzIiwiaXNCYW5uZWQiLCJoYXNPd25Qcm9wZXJ0eSIsInJvd0NsYXNzIiwibGFzdEF0dGVtcHQiLCJsYXN0X2F0dGVtcHQiLCJ0b0xvY2FsZVN0cmluZyIsImFjdGlvbkJ1dHRvbiIsImV4X1NlY3VyaXR5VW5iYW4iLCJyb3ciLCJjb3VudCIsImhhbmRsZVVuYmFuQ2xpY2siLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsInVuYmFuSXAiLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJkZXN0cm95IiwidW5zdWJzY3JpYmUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsNEJBQTRCLEdBQUc7QUFDakNDLEVBQUFBLFNBQVMsRUFBRSxr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LEVBQWlDO0FBQzdCO0FBQ0E7QUFDQXBDLFFBQUFBLDRCQUE0QixDQUFDaUIsZ0JBQTdCO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQSxZQUFNOE8sUUFBUSxHQUFHNU4sUUFBUSxJQUFJQSxRQUFRLENBQUM2TixRQUFyQixHQUNYN04sUUFBUSxDQUFDNk4sUUFERSxHQUVYO0FBQUM5SixVQUFBQSxLQUFLLEVBQUUsQ0FBQyxvQkFBRDtBQUFSLFNBRk47QUFHQStKLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QkgsUUFBNUI7QUFDQUgsUUFBQUEsT0FBTyxDQUFDbE0sV0FBUixDQUFvQixrQkFBcEI7QUFDSDtBQUNKLEtBYkQ7QUFjSCxHQXo1QmdDOztBQTI1QmpDO0FBQ0o7QUFDQTtBQUNJeU0sRUFBQUEsT0E5NUJpQyxxQkE4NUJ2QjtBQUNOO0FBQ0EsUUFBSSxLQUFLeFAsV0FBVCxFQUFzQjtBQUNsQndMLE1BQUFBLGFBQWEsQ0FBQyxLQUFLeEwsV0FBTixDQUFiO0FBQ0EsV0FBS0EsV0FBTCxHQUFtQixJQUFuQjtBQUNIOztBQUVELFFBQUksT0FBT2dDLFFBQVAsS0FBb0IsV0FBeEIsRUFBcUM7QUFDakNBLE1BQUFBLFFBQVEsQ0FBQ3lOLFdBQVQsQ0FBcUIsa0JBQXJCO0FBQ0g7O0FBQ0QsU0FBS2xRLGFBQUwsR0FBcUIsS0FBckI7QUFDQSxTQUFLQyxrQkFBTCxHQUEwQixJQUExQjtBQUNIO0FBMTZCZ0MsQ0FBckMsQyxDQTY2QkE7O0FBQ0EsSUFBSSxPQUFPa1EsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCdFEsNEJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBFdmVudEJ1cywgU2lwQVBJLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogRXh0ZW5zaW9uIE1vZGlmeSBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxpZmllZCBzdGF0dXMgbW9uaXRvcmluZyBmb3IgZXh0ZW5zaW9uIG1vZGlmeSBwYWdlOlxuICogLSBTaW5nbGUgQVBJIGNhbGwgb24gaW5pdGlhbGl6YXRpb25cbiAqIC0gUmVhbC10aW1lIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIG9ubHlcbiAqIC0gTm8gcGVyaW9kaWMgcG9sbGluZ1xuICogLSBDbGVhbiBkZXZpY2UgbGlzdCBhbmQgaGlzdG9yeSBkaXNwbGF5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgPSB7XG4gICAgY2hhbm5lbElkOiAnZXh0ZW5zaW9uLXN0YXR1cycsXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG4gICAgY3VycmVudEV4dGVuc2lvbklkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0xhYmVsOiBudWxsLFxuICAgICRhY3RpdmVEZXZpY2VzTGlzdDogbnVsbCxcbiAgICAkZGV2aWNlSGlzdG9yeUxpc3Q6IG51bGwsXG4gICAgJHNlY3VyaXR5VGFibGU6IG51bGwsXG4gICAgJG5vU2VjdXJpdHlEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgZGF0YVxuICAgICAqL1xuICAgIHNlY3VyaXR5RGF0YToge30sXG4gICAgYmFubmVkSXBzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnRlcnZhbCB0aW1lclxuICAgICAqL1xuICAgIHVwZGF0ZVRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGV4dGVuc2lvbiBudW1iZXIgZnJvbSBmb3JtXG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIGluaXRpYWwgQVBJIGNhbGxcbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpO1xuXG4gICAgICAgIC8vIExvYWQgc2VjdXJpdHkgZGF0YVxuICAgICAgICB0aGlzLmxvYWRTZWN1cml0eURhdGEoKTtcblxuICAgICAgICAvLyBTdGFydCB0aW1lciBmb3IgdXBkYXRpbmcgb25saW5lIGR1cmF0aW9uc1xuICAgICAgICB0aGlzLnN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lcigpO1xuXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IGV4dGVuc2lvbiBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICovXG4gICAgZXh0cmFjdEV4dGVuc2lvbklkKCkge1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIGdldCB0aGUgcGhvbmUgbnVtYmVyIGZyb20gZm9ybSBmaWVsZCAocHJpbWFyeSlcbiAgICAgICAgY29uc3QgJG51bWJlckZpZWxkID0gJCgnaW5wdXRbbmFtZT1cIm51bWJlclwiXScpO1xuICAgICAgICBpZiAoJG51bWJlckZpZWxkLmxlbmd0aCAmJiAkbnVtYmVyRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdW5tYXNrZWQgdmFsdWUgaWYgaW5wdXRtYXNrIGlzIGFwcGxpZWRcbiAgICAgICAgICAgIGxldCBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGlucHV0bWFzayBpcyBhdmFpbGFibGUgYW5kIGFwcGxpZWQgdG8gdGhlIGZpZWxkXG4gICAgICAgICAgICBpZiAodHlwZW9mICRudW1iZXJGaWVsZC5pbnB1dG1hc2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWUgKG9ubHkgdGhlIGFjdHVhbCBpbnB1dCB3aXRob3V0IG1hc2sgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgaWYgaW5wdXRtYXNrIG1ldGhvZCBmYWlsc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQudmFsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIHRoZSB2YWx1ZSAtIHJlbW92ZSBhbnkgcmVtYWluaW5nIG1hc2sgY2hhcmFjdGVycyBsaWtlIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9IGV4dGVuc2lvbk51bWJlci5yZXBsYWNlKC9bXjAtOV0vZywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IHJldHVybiBpZiB3ZSBoYXZlIGFjdHVhbCBkaWdpdHNcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9uTnVtYmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjayB0byBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybE1hdGNoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9cXC9leHRlbnNpb25zXFwvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGlmICh1cmxNYXRjaCAmJiB1cmxNYXRjaFsxXSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBkYXRhYmFzZSBJRCwgd2UgbmVlZCB0byB3YWl0IGZvciBmb3JtIHRvIGxvYWRcbiAgICAgICAgICAgIC8vIFdlJ2xsIGdldCB0aGUgYWN0dWFsIGV4dGVuc2lvbiBudW1iZXIgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICovXG4gICAgY2FjaGVFbGVtZW50cygpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWwgPSAkKCcjc3RhdHVzJyk7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0ID0gJCgnI2FjdGl2ZS1kZXZpY2VzLWxpc3QnKTtcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgPSAkKCcjZGV2aWNlLWhpc3RvcnktbGlzdCcpO1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlID0gJCgnI3NlY3VyaXR5LWZhaWxlZC1hdXRoLXRhYmxlJyk7XG4gICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhID0gJCgnI25vLXNlY3VyaXR5LWRhdGEnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaW5pdGlhbCBzdGF0dXMgd2l0aCBzaW5nbGUgQVBJIGNhbGxcbiAgICAgKi9cbiAgICBsb2FkSW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gUmUtY2hlY2sgZXh0ZW5zaW9uIElEIGFmdGVyIGZvcm0gbG9hZHNcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhZ2FpbiBhZnRlciBkZWxheSAoZm9ybSBtaWdodCBzdGlsbCBiZSBsb2FkaW5nKVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpLCA1MDApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIEFQSSBjYWxsIGZvciBjdXJyZW50IHN0YXR1c1xuICAgICAgICBTaXBBUEkuZ2V0U3RhdHVzKHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gbG9hZCBoaXN0b3JpY2FsIGRhdGFcbiAgICAgICAgdGhpcy5sb2FkSGlzdG9yaWNhbERhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZEhpc3RvcmljYWxEYXRhKCkge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBoaXN0b3J5IGZyb20gQVBJXG4gICAgICAgIFNpcEFQSS5nZXRIaXN0b3J5KHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmhpc3RvcnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXlIaXN0b3JpY2FsRGF0YShyZXNwb25zZS5kYXRhLmhpc3RvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlZnJlc2ggc2VjdXJpdHkgZGF0YSBvbiBjb25maWcgY2hhbmdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmxvYWRTZWN1cml0eURhdGEoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlO1xuICAgICAgICBpZiAoZGF0YS5zdGF0dXNlcyAmJiBkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1c0RhdGEuc3RhdHVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgZGV2aWNlc1xuICAgICAgICB0aGlzLnVwZGF0ZUFjdGl2ZURldmljZXMoc3RhdHVzRGF0YS5kZXZpY2VzIHx8IFtdKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERvbid0IGFkZCB0byBoaXN0b3J5IC0gaGlzdG9yeSBpcyBsb2FkZWQgZnJvbSBBUEkgb25seVxuICAgICAgICAvLyB0aGlzLmFkZFRvSGlzdG9yeShzdGF0dXNEYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNMYWJlbChzdGF0dXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRzdGF0dXNMYWJlbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBnbG9iYWxUcmFuc2xhdGVbYGV4X1N0YXR1cyR7c3RhdHVzfWBdIHx8IHN0YXR1cztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGNsYXNzIGFuZCB1cGRhdGUgY29udGVudFxuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbFxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmV5IGdyZWVuIHJlZCB5ZWxsb3cgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoY29sb3IpXG4gICAgICAgICAgICAuaHRtbChgJHtsYWJlbH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBmb3Igc3RhdHVzIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKSB7XG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVW5hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBjYXNlICdEaXNhYmxlZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFjdGl2ZSBkZXZpY2VzIGxpc3RcbiAgICAgKi9cbiAgICB1cGRhdGVBY3RpdmVEZXZpY2VzKGRldmljZXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdCB8fCAhQXJyYXkuaXNBcnJheShkZXZpY2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZGV2aWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0FjdGl2ZURldmljZXN9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBsaXN0IHdpdGggdGVhbCBsYWJlbHMgbGlrZSB0aGUgb2xkIGVuZHBvaW50LWxpc3RcbiAgICAgICAgbGV0IGRldmljZXNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgXG4gICAgICAgIGRldmljZXMuZm9yRWFjaCgoZGV2aWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBkZXZpY2UudXNlcl9hZ2VudCB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICBjb25zdCBpcCA9IGRldmljZS5pcCB8fCBkZXZpY2UuY29udGFjdF9pcCB8fCAnLSc7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gZGV2aWNlLnBvcnQgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBpcERpc3BsYXkgPSBwb3J0ID8gYCR7aXB9OiR7cG9ydH1gIDogaXA7XG4gICAgICAgICAgICBjb25zdCBydHQgPSBkZXZpY2UucnR0ICE9PSBudWxsICYmIGRldmljZS5ydHQgIT09IHVuZGVmaW5lZCBcbiAgICAgICAgICAgICAgICA/IGAgKCR7ZGV2aWNlLnJ0dC50b0ZpeGVkKDIpfSBtcylgIFxuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBpZCA9IGAke3VzZXJBZ2VudH18JHtpcH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkZXZpY2VzSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWlkPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRlYWwgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dXNlckFnZW50fVxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRldGFpbFwiPiR7aXBEaXNwbGF5fSR7cnR0fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGV2aWNlc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0Lmh0bWwoZGV2aWNlc0h0bWwpO1xuXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIGNvcHkgSVAgYWRkcmVzc1xuICAgICAgICB0aGlzLmF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIGRldmljZSBsYWJlbHMgZm9yIElQIGNvcHlpbmdcbiAgICAgKi9cbiAgICBhdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5maW5kKCcuaXRlbSAudWkubGFiZWwnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaXRlbSA9ICRsYWJlbC5jbG9zZXN0KCcuaXRlbScpO1xuICAgICAgICAgICAgY29uc3QgZGF0YUlkID0gJGl0ZW0uZGF0YSgnaWQnKTtcblxuICAgICAgICAgICAgaWYgKCFkYXRhSWQpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBJUCBmcm9tIGRhdGEtaWQgKGZvcm1hdDogXCJVc2VyQWdlbnR8SVBcIilcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZGF0YUlkLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBpcCA9IHBhcnRzWzFdO1xuXG4gICAgICAgICAgICBpZiAoIWlwIHx8IGlwID09PSAnLScpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmQgdXNpbmcgdGhlIHNhbWUgbWV0aG9kIGFzIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICAgICAgaWYgKG5hdmlnYXRvci5jbGlwYm9hcmQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpIHtcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChpcCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBmZWVkYmFja1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwudHJhbnNpdGlvbigncHVsc2UnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBjaGFuZ2UgdGhlIGxhYmVsIGNvbG9yIHRvIGluZGljYXRlIHN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCd0ZWFsJykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCd0ZWFsJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgcG9wdXAgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0lwQ29waWVkfTogJHtpcH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJ1xuICAgICAgICAgICAgICAgICAgICB9KS5wb3B1cCgnc2hvdycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnBvcHVwKCdoaWRlJykucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHkgSVA6JywgZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXAgPSAkKCc8aW5wdXQ+Jyk7XG4gICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCgkdGVtcCk7XG4gICAgICAgICAgICAgICAgJHRlbXAudmFsKGlwKS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpO1xuICAgICAgICAgICAgICAgICR0ZW1wLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBmZWVkYmFja1xuICAgICAgICAgICAgICAgICRsYWJlbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygndGVhbCcpLmFkZENsYXNzKCdncmVlbicpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3RlYWwnKTtcbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGN1cnNvciBwb2ludGVyIHN0eWxlXG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0LmZpbmQoJy5pdGVtIC51aS5sYWJlbCcpLmNzcygnY3Vyc29yJywgJ3BvaW50ZXInKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGhpc3RvcmljYWwgZGF0YSBmcm9tIEFQSSB3aXRoIGRldmljZSBncm91cGluZ1xuICAgICAqL1xuICAgIGRpc3BsYXlIaXN0b3JpY2FsRGF0YShoaXN0b3J5RGF0YSkge1xuICAgICAgICBpZiAoIXRoaXMuJGRldmljZUhpc3RvcnlMaXN0IHx8ICFBcnJheS5pc0FycmF5KGhpc3RvcnlEYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhpc3RvcnlEYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QuaHRtbChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vSGlzdG9yeUF2YWlsYWJsZX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdyb3VwIGhpc3RvcnkgYnkgZGV2aWNlXG4gICAgICAgIGNvbnN0IGRldmljZUdyb3VwcyA9IHRoaXMuZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpO1xuXG4gICAgICAgIC8vIEJ1aWxkIEhUTUwgZm9yIGdyb3VwZWQgZGlzcGxheSAtIHNpbXBsaWZpZWQgc3RydWN0dXJlXG4gICAgICAgIGxldCBoaXN0b3J5SHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlZCBsaXN0XCI+JztcblxuICAgICAgICBPYmplY3QuZW50cmllcyhkZXZpY2VHcm91cHMpLmZvckVhY2goKFtkZXZpY2VLZXksIHNlc3Npb25zXSwgZGV2aWNlSW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFt1c2VyQWdlbnQsIGlwXSA9IGRldmljZUtleS5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlTmFtZSA9IHVzZXJBZ2VudCB8fCAnVW5rbm93biBEZXZpY2UnO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlSVAgPSAoaXAgJiYgaXAgIT09ICdVbmtub3duJykgPyBpcCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlSWQgPSBgZGV2aWNlLSR7ZGV2aWNlSW5kZXh9YDtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRpbWVsaW5lIEhUTUwgZm9yIHRoaXMgZGV2aWNlXG4gICAgICAgICAgICBjb25zdCB0aW1lbGluZUh0bWwgPSB0aGlzLmNyZWF0ZURldmljZVRpbWVsaW5lKHNlc3Npb25zLCBkZXZpY2VJZCk7XG5cbiAgICAgICAgICAgIC8vIERldmljZSBoZWFkZXIgLSBleGFjdGx5IGFzIHJlcXVlc3RlZFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJtb2JpbGUgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkZXZpY2VOYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZUlQID8gYDxzcGFuIHN0eWxlPVwiY29sb3I6IGdyZXk7IGZvbnQtc2l6ZTowLjdlbTtcIj4ke2RldmljZUlQfTwvPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt0aW1lbGluZUh0bWx9XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNlc3Npb25zIHRpbWVsaW5lIC0gc2ltcGxpZmllZFxuICAgICAgICAgICAgc2Vzc2lvbnMuZm9yRWFjaCgoc2Vzc2lvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBldmVudCB0eXBlIHRvIGRldGVybWluZSBhY3R1YWwgZGV2aWNlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGxldCBpc09ubGluZSA9IHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJztcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnRMYWJlbCA9ICcnO1xuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGRldmljZS1zcGVjaWZpYyBldmVudHNcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5ldmVudF90eXBlID09PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzT25saW5lID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50TGFiZWwgPSBgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0RldmljZURpc2Nvbm5lY3RlZH1gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2Vzc2lvbi5ldmVudF90eXBlID09PSAnZGV2aWNlX2FkZGVkJykge1xuICAgICAgICAgICAgICAgICAgICBpc09ubGluZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50TGFiZWwgPSBgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X0RldmljZUNvbm5lY3RlZH1gO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHJ0dExhYmVsID0gdGhpcy5nZXRSdHRMYWJlbChzZXNzaW9uLnJ0dCk7XG4gICAgICAgICAgICAgICAgLy8gRm9ybWF0IGRhdGV0aW1lIHdpdGggZGF0ZSBhbmQgdGltZVxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGV0aW1lID0gdGhpcy5mb3JtYXREYXRlVGltZShzZXNzaW9uLmRhdGUgfHwgc2Vzc2lvbi50aW1lc3RhbXApO1xuXG4gICAgICAgICAgICAgICAgLy8gVXNlIGNpcmN1bGFyIGxhYmVscyBsaWtlIGluIGV4dGVuc2lvbnMgbGlzdFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NsYXNzID0gaXNPbmxpbmUgPyAnZ3JlZW4nIDogJ2dyZXknO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c1RpdGxlID0gaXNPbmxpbmUgPyAnT25saW5lJyA6ICdPZmZsaW5lJztcblxuICAgICAgICAgICAgICAgIGxldCBkdXJhdGlvbkh0bWwgPSAnJztcbiAgICAgICAgICAgICAgICAvLyBGb3IgdGhlIGZpcnN0IChtb3N0IHJlY2VudCkgZW50cnkgdGhhdCBpcyBvbmxpbmUsIGFkZCBsaXZlIGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAwICYmIGlzT25saW5lICYmIHNlc3Npb24uZXZlbnRfdHlwZSAhPT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGF0YSBhdHRyaWJ1dGUgd2l0aCB0aW1lc3RhbXAgZm9yIGxpdmUgdXBkYXRpbmdcbiAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25IdG1sID0gYDxzcGFuIGNsYXNzPVwidWkgZ3JleSB0ZXh0IG9ubGluZS1kdXJhdGlvblwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1vbmxpbmUtc2luY2U9XCIke3Nlc3Npb24udGltZXN0YW1wfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lfSAke3RoaXMuY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KHNlc3Npb24udGltZXN0YW1wKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBDYWxjdWxhdGUgc3RhdGljIGR1cmF0aW9uIGZvciBoaXN0b3JpY2FsIGVudHJpZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uKHNlc3Npb24udGltZXN0YW1wLCBzZXNzaW9uc1tpbmRleCAtIDFdPy50aW1lc3RhbXApO1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZHVyYXRpb24gd2l0aCB0cmFuc2xhdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvblRleHQgPSBkdXJhdGlvbiAmJiBpc09ubGluZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lfSAke2R1cmF0aW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogZHVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PZmZsaW5lfSAke2R1cmF0aW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvblRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uSHRtbCA9IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj4ke2R1cmF0aW9uVGV4dH08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIHRleHRcIiBzdHlsZT1cIm1hcmdpbjogNnB4IDIwcHg7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0dXNDbGFzc30gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiA4cHg7IGhlaWdodDogOHB4OyBtaW4taGVpZ2h0OiA4cHg7IG1hcmdpbi1yaWdodDogOHB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiJHtzdGF0dXNUaXRsZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRldGltZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAke2R1cmF0aW9uSHRtbCB8fCBldmVudExhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGhpc3RvcnlIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdC5odG1sKGhpc3RvcnlIdG1sKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVsaW5lIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdyb3VwIGhpc3RvcnkgZXZlbnRzIGJ5IGRldmljZSBhbmQgc29ydCBieSBsYXN0IGV2ZW50XG4gICAgICovXG4gICAgZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgY29uc3QgZ3JvdXBzID0ge307XG5cbiAgICAgICAgaGlzdG9yeURhdGEuZm9yRWFjaChlbnRyeSA9PiB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgZGV2aWNlIGtleSBmcm9tIHVzZXJfYWdlbnQgYW5kIElQXG4gICAgICAgICAgICBsZXQgZGV2aWNlS2V5ID0gJ1Vua25vd258VW5rbm93bic7XG5cbiAgICAgICAgICAgIGlmIChlbnRyeS51c2VyX2FnZW50IHx8IGVudHJ5LmlwX2FkZHJlc3MpIHtcbiAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHtlbnRyeS51c2VyX2FnZW50IHx8ICdVbmtub3duJ318JHtlbnRyeS5pcF9hZGRyZXNzIHx8ICdVbmtub3duJ31gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS5kZXRhaWxzKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGV4dHJhY3QgZGV2aWNlIGluZm8gZnJvbSBkZXRhaWxzXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBlbnRyeS5kZXRhaWxzLm1hdGNoKC8oW1xcd1xccy5dKylcXHMqLVxccyooW1xcZC5dKykvKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGV2aWNlS2V5ID0gYCR7bWF0Y2hbMV0udHJpbSgpfXwke21hdGNoWzJdLnRyaW0oKX1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFncm91cHNbZGV2aWNlS2V5XSkge1xuICAgICAgICAgICAgICAgIGdyb3Vwc1tkZXZpY2VLZXldID0gW107XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdyb3Vwc1tkZXZpY2VLZXldLnB1c2goZW50cnkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTb3J0IHNlc3Npb25zIHdpdGhpbiBlYWNoIGdyb3VwIGJ5IHRpbWVzdGFtcCAobmV3ZXN0IGZpcnN0KVxuICAgICAgICBPYmplY3Qua2V5cyhncm91cHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGdyb3Vwc1trZXldLnNvcnQoKGEsIGIpID0+IGIudGltZXN0YW1wIC0gYS50aW1lc3RhbXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IHRvIGFycmF5IGFuZCBzb3J0IGJ5IG1vc3QgcmVjZW50IGV2ZW50XG4gICAgICAgIGNvbnN0IHNvcnRlZEdyb3VwcyA9IE9iamVjdC5lbnRyaWVzKGdyb3VwcylcbiAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSBtb3N0IHJlY2VudCB0aW1lc3RhbXAgZnJvbSBlYWNoIGdyb3VwIChmaXJzdCBlbGVtZW50IHNpbmNlIGFscmVhZHkgc29ydGVkKVxuICAgICAgICAgICAgICAgIGNvbnN0IGFMYXRlc3QgPSBhWzFdWzBdPy50aW1lc3RhbXAgfHwgMDtcbiAgICAgICAgICAgICAgICBjb25zdCBiTGF0ZXN0ID0gYlsxXVswXT8udGltZXN0YW1wIHx8IDA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJMYXRlc3QgLSBhTGF0ZXN0O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBiYWNrIHRvIG9iamVjdCB3aXRoIHNvcnRlZCBrZXlzXG4gICAgICAgIGNvbnN0IHNvcnRlZE9iamVjdCA9IHt9O1xuICAgICAgICBzb3J0ZWRHcm91cHMuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICBzb3J0ZWRPYmplY3Rba2V5XSA9IHZhbHVlO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gc29ydGVkT2JqZWN0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGJldHdlZW4gdHdvIHRpbWVzdGFtcHNcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbihjdXJyZW50VGltZXN0YW1wLCBwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgICAgICBpZiAoIXByZXZpb3VzVGltZXN0YW1wKSByZXR1cm4gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRpZmYgPSBNYXRoLmFicyhwcmV2aW91c1RpbWVzdGFtcCAtIGN1cnJlbnRUaW1lc3RhbXApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCB0aW1lIGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgZm9ybWF0VGltZShkYXRlU3RyKSB7XG4gICAgICAgIGlmICghZGF0ZVN0cikgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhbHJlYWR5IGEgZm9ybWF0dGVkIGRhdGUgc3RyaW5nIGxpa2UgXCIyMDI1LTA5LTExIDExOjMwOjM2XCJcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnc3RyaW5nJyAmJiBkYXRlU3RyLmluY2x1ZGVzKCcgJykpIHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVQYXJ0ID0gZGF0ZVN0ci5zcGxpdCgnICcpWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVQYXJ0IHx8IGRhdGVTdHI7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYSB0aW1lc3RhbXBcbiAgICAgICAgaWYgKHR5cGVvZiBkYXRlU3RyID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKGRhdGVTdHIgKiAxMDAwKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZGF0ZVN0cjtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBSVFQgbGFiZWwgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgKi9cbiAgICBnZXRSdHRMYWJlbChydHQpIHtcbiAgICAgICAgaWYgKHJ0dCA9PT0gbnVsbCB8fCBydHQgPT09IHVuZGVmaW5lZCB8fCBydHQgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgaWYgKHJ0dCA+IDE1MCkge1xuICAgICAgICAgICAgY29sb3IgPSAncmVkJztcbiAgICAgICAgfSBlbHNlIGlmIChydHQgPiA1MCkge1xuICAgICAgICAgICAgY29sb3IgPSAnb2xpdmUnOyAgLy8geWVsbG93IGNhbiBiZSBoYXJkIHRvIHNlZSwgb2xpdmUgaXMgYmV0dGVyXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYDxzcGFuIGNsYXNzPVwidWkgJHtjb2xvcn0gdGV4dFwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDhweDtcIj5bUlRUOiAke3J0dC50b0ZpeGVkKDApfW1zXTwvc3Bhbj5gO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZGF0ZXRpbWUgd2l0aCBkYXRlIGFuZCB0aW1lIHVzaW5nIGludGVyZmFjZSBsYW5ndWFnZVxuICAgICAqL1xuICAgIGZvcm1hdERhdGVUaW1lKHRpbWUpIHtcbiAgICAgICAgaWYgKCF0aW1lKSByZXR1cm4gJy0tOi0tJztcblxuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodHlwZW9mIHRpbWUgPT09ICdzdHJpbmcnID8gdGltZSA6IHRpbWUgKiAxMDAwKTtcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIHRvZGF5XG4gICAgICAgIGNvbnN0IGlzVG9kYXkgPSBkYXRlLnRvRGF0ZVN0cmluZygpID09PSBub3cudG9EYXRlU3RyaW5nKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyB5ZXN0ZXJkYXlcbiAgICAgICAgY29uc3QgeWVzdGVyZGF5ID0gbmV3IERhdGUobm93KTtcbiAgICAgICAgeWVzdGVyZGF5LnNldERhdGUoeWVzdGVyZGF5LmdldERhdGUoKSAtIDEpO1xuICAgICAgICBjb25zdCBpc1llc3RlcmRheSA9IGRhdGUudG9EYXRlU3RyaW5nKCkgPT09IHllc3RlcmRheS50b0RhdGVTdHJpbmcoKTtcblxuICAgICAgICBjb25zdCBsb2NhbGUgPSBTZW1hbnRpY0xvY2FsaXphdGlvbi5nZXRVc2VyTG9jYWxlKCk7XG4gICAgICAgIGNvbnN0IHRpbWVTdHIgPSBkYXRlLnRvTG9jYWxlVGltZVN0cmluZyhsb2NhbGUsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBzZWNvbmQ6ICcyLWRpZ2l0J30pO1xuXG4gICAgICAgIGlmIChpc1RvZGF5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGltZVN0cjtcbiAgICAgICAgfSBlbHNlIGlmIChpc1llc3RlcmRheSkge1xuICAgICAgICAgICAgLy8gVXNlIHRyYW5zbGF0aW9uIGZvciBcIlllc3RlcmRheVwiIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgeWVzdGVyZGF5VGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9ZZXN0ZXJkYXk7XG4gICAgICAgICAgICByZXR1cm4gYCR7eWVzdGVyZGF5VGV4dH0gJHt0aW1lU3RyfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3JtYXQgZGF0ZSBhY2NvcmRpbmcgdG8gbG9jYWxlXG4gICAgICAgICAgICBjb25zdCBkYXRlU3RyID0gZGF0ZS50b0xvY2FsZURhdGVTdHJpbmcobG9jYWxlLCB7ZGF5OiAnMi1kaWdpdCcsIG1vbnRoOiAnMi1kaWdpdCd9KTtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXRlU3RyfSAke3RpbWVTdHJ9YDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZHVyYXRpb24gZnJvbSB0aW1lc3RhbXAgdG8gbm93XG4gICAgICovXG4gICAgY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGlmZiA9IG5vdyAtIHRpbWVzdGFtcDtcblxuICAgICAgICBpZiAoZGlmZiA8IDApIHJldHVybiAnMHMnO1xuXG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcblxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfWQgJHtob3VycyAlIDI0fWhgO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfWggJHttaW51dGVzICUgNjB9bWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfW1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RpZmZ9c2A7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnQgdGltZXIgdG8gdXBkYXRlIG9ubGluZSBkdXJhdGlvbnNcbiAgICAgKi9cbiAgICBzdGFydER1cmF0aW9uVXBkYXRlVGltZXIoKSB7XG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBldmVyeSAxMCBzZWNvbmRzXG4gICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZU9ubGluZUR1cmF0aW9ucygpO1xuICAgICAgICB9LCAxMDAwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhbGwgb25saW5lIGR1cmF0aW9uIGRpc3BsYXlzXG4gICAgICovXG4gICAgdXBkYXRlT25saW5lRHVyYXRpb25zKCkge1xuICAgICAgICBjb25zdCAkZHVyYXRpb25zID0gdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3Q/LmZpbmQoJy5vbmxpbmUtZHVyYXRpb25bZGF0YS1vbmxpbmUtc2luY2VdJyk7XG4gICAgICAgIGlmICghJGR1cmF0aW9ucyB8fCAkZHVyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGR1cmF0aW9ucy5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3Qgb25saW5lU2luY2UgPSBwYXJzZUludCgkZWxlbWVudC5kYXRhKCdvbmxpbmUtc2luY2UnKSwgMTApO1xuICAgICAgICAgICAgaWYgKG9ubGluZVNpbmNlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSB0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyhvbmxpbmVTaW5jZSk7XG4gICAgICAgICAgICAgICAgJGVsZW1lbnQudGV4dChgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT25saW5lfSAke2R1cmF0aW9ufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHRpbWVsaW5lIHZpc3VhbGl6YXRpb24gZm9yIGEgZGV2aWNlJ3MgaGlzdG9yeVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHNlc3Npb25zIC0gQXJyYXkgb2Ygc2Vzc2lvbiBldmVudHMgZm9yIHRoZSBkZXZpY2VcbiAgICAgKiBAcGFyYW0ge1N0cmluZ30gZGV2aWNlSWQgLSBVbmlxdWUgaWRlbnRpZmllciBmb3IgdGhlIGRldmljZVxuICAgICAqIEByZXR1cm5zIHtTdHJpbmd9IEhUTUwgZm9yIHRoZSB0aW1lbGluZVxuICAgICAqL1xuICAgIGNyZWF0ZURldmljZVRpbWVsaW5lKHNlc3Npb25zLCBkZXZpY2VJZCkge1xuICAgICAgICBpZiAoIXNlc3Npb25zIHx8IHNlc3Npb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IHRpbWUgcmFuZ2UgKGxhc3QgMjQgaG91cnMpXG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkYXlBZ28gPSBub3cgLSAoMjQgKiA2MCAqIDYwKTtcblxuICAgICAgICAvLyBGaWx0ZXIgc2Vzc2lvbnMgd2l0aGluIGxhc3QgMjQgaG91cnMgKHNlc3Npb25zIGFyZSBzb3J0ZWQgbmV3ZXN0IGZpcnN0KVxuICAgICAgICBjb25zdCByZWNlbnRTZXNzaW9ucyA9IHNlc3Npb25zLmZpbHRlcihzID0+IHMudGltZXN0YW1wID49IGRheUFnbyk7XG4gICAgICAgIGlmIChyZWNlbnRTZXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJzsgLy8gTm8gcmVjZW50IGFjdGl2aXR5XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgdGltZWxpbmUgc2VnbWVudHMgKDk2IHNlZ21lbnRzIGZvciAyNCBob3VycywgMTUgbWludXRlcyBlYWNoKVxuICAgICAgICBjb25zdCBzZWdtZW50RHVyYXRpb24gPSAxNSAqIDYwOyAvLyAxNSBtaW51dGVzIGluIHNlY29uZHNcbiAgICAgICAgY29uc3Qgc2VnbWVudHMgPSA5NjtcbiAgICAgICAgY29uc3Qgc2VnbWVudERhdGEgPSBuZXcgQXJyYXkoc2VnbWVudHMpLmZpbGwoJ2dyZXknKTtcblxuICAgICAgICAvLyBSZXZlcnNlIHNlc3Npb25zIHRvIHByb2Nlc3MgZnJvbSBvbGRlc3QgdG8gbmV3ZXN0XG4gICAgICAgIGNvbnN0IGNocm9ub2xvZ2ljYWxTZXNzaW9ucyA9IFsuLi5yZWNlbnRTZXNzaW9uc10ucmV2ZXJzZSgpO1xuXG4gICAgICAgIC8vIFByb2Nlc3Mgc2Vzc2lvbnMgdG8gZmlsbCBzZWdtZW50c1xuICAgICAgICBjaHJvbm9sb2dpY2FsU2Vzc2lvbnMuZm9yRWFjaCgoc2Vzc2lvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHRTZXNzaW9uID0gY2hyb25vbG9naWNhbFNlc3Npb25zW2luZGV4ICsgMV07IC8vIE5leHQgZXZlbnQgaW4gdGltZVxuICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gc2Vzc2lvbi50aW1lc3RhbXA7XG4gICAgICAgICAgICBjb25zdCBlbmRUaW1lID0gbmV4dFNlc3Npb24gPyBuZXh0U2Vzc2lvbi50aW1lc3RhbXAgOiBub3c7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSBzdGF0dXMgY29sb3IgYmFzZWQgb24gZXZlbnQgdHlwZSBhbmQgc3RhdHVzXG4gICAgICAgICAgICBsZXQgY29sb3IgPSAnZ3JleSc7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGV2ZW50IHR5cGUgZmlyc3RcbiAgICAgICAgICAgIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfYWRkZWQnIHx8IHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ3N0YXR1c19jaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgLy8gRGV2aWNlIGNhbWUgb25saW5lXG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgICAgICBjb2xvciA9ICdncmVlbic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JleSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXZpY2Ugd2VudCBvZmZsaW5lIC0gc2VnbWVudHMgQUZURVIgdGhpcyBldmVudCBzaG91bGQgYmUgZ3JleVxuICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZXknO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IHRvIGF2YWlsYWJsZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBjb2xvciA9ICdncmVlbic7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpbGwgc2VnbWVudHMgZm9yIHRoaXMgc2Vzc2lvbiBwZXJpb2RcbiAgICAgICAgICAgIGZvciAobGV0IHRpbWUgPSBzdGFydFRpbWU7IHRpbWUgPCBlbmRUaW1lICYmIHRpbWUgPD0gbm93OyB0aW1lICs9IHNlZ21lbnREdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRJbmRleCA9IE1hdGguZmxvb3IoKHRpbWUgLSBkYXlBZ28pIC8gc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEluZGV4ID49IDAgJiYgc2VnbWVudEluZGV4IDwgc2VnbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudERhdGFbc2VnbWVudEluZGV4XSA9IGNvbG9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgdGltZWxpbmUgSFRNTFxuICAgICAgICBsZXQgdGltZWxpbmVIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRldmljZS10aW1lbGluZVwiIHN0eWxlPVwibWFyZ2luOiAxMHB4IDA7XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IHdpZHRoOiAxMDAlOyBoZWlnaHQ6IDEycHg7IGJhY2tncm91bmQ6ICNmM2Y0ZjU7IGJvcmRlci1yYWRpdXM6IDNweDsgb3ZlcmZsb3c6IGhpZGRlbjtcIj5cbiAgICAgICAgYDtcblxuICAgICAgICBzZWdtZW50RGF0YS5mb3JFYWNoKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRXaWR0aCA9IDEwMCAvIHNlZ21lbnRzO1xuICAgICAgICAgICAgY29uc3QgYmdDb2xvciA9IGNvbG9yID09PSAnZ3JlZW4nID8gJyMyMWJhNDUnIDogJyNlOGU4ZTgnO1xuICAgICAgICAgICAgY29uc3QgYm9yZGVyTGVmdCA9IGluZGV4ID4gMCA/ICcxcHggc29saWQgcmdiYSgyNTUsMjU1LDI1NSwwLjIpJyA6ICdub25lJztcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgZm9yIHRoaXMgc2VnbWVudFxuICAgICAgICAgICAgY29uc3Qgc2VnbWVudFRpbWUgPSBkYXlBZ28gKyAoaW5kZXggKiBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3Qgc2VnbWVudERhdGUgPSBuZXcgRGF0ZShzZWdtZW50VGltZSAqIDEwMDApO1xuXG4gICAgICAgICAgICAvLyBHZXQgdXNlcidzIGxvY2FsZVxuICAgICAgICAgICAgY29uc3QgbG9jYWxlID0gU2VtYW50aWNMb2NhbGl6YXRpb24uZ2V0VXNlckxvY2FsZSgpO1xuICAgICAgICAgICAgY29uc3QgdGltZVN0ciA9IHNlZ21lbnREYXRlLnRvTG9jYWxlVGltZVN0cmluZyhsb2NhbGUsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSk7XG5cbiAgICAgICAgICAgIHRpbWVsaW5lSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cIndpZHRoOiAke3NlZ21lbnRXaWR0aH0lOyBoZWlnaHQ6IDEwMCU7IGJhY2tncm91bmQtY29sb3I6ICR7YmdDb2xvcn07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBib3gtc2l6aW5nOiBib3JkZXItYm94OyBib3JkZXItbGVmdDogJHtib3JkZXJMZWZ0fTtcIlxuICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke3RpbWVTdHJ9IC0gJHtjb2xvciA9PT0gJ2dyZWVuJyA/ICdPbmxpbmUnIDogJ09mZmxpbmUnfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGltZSBsYWJlbHMgd2l0aCBsb2NhbGl6YXRpb25cbiAgICAgICAgY29uc3QgaG91cnNMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9Ib3Vyc19TaG9ydDtcblxuICAgICAgICB0aW1lbGluZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IG1hcmdpbi10b3A6IDJweDsgZm9udC1zaXplOiAxMHB4OyBjb2xvcjogIzk5OTtcIj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MjQke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4xOCR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjEyJHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+NiR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vd308L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcblxuICAgICAgICByZXR1cm4gdGltZWxpbmVIdG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVsaW5lIHRvb2x0aXBzIGFmdGVyIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lbGluZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIEZvbWFudGljIFVJIHRvb2x0aXBzIGZvciB0aW1lbGluZSBzZWdtZW50c1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdD8uZmluZCgnLmRldmljZS10aW1lbGluZSBbdGl0bGVdJykucG9wdXAoe1xuICAgICAgICAgICAgdmFyaWF0aW9uOiAnbWluaScsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGF1dGhlbnRpY2F0aW9uIGZhaWx1cmUgc3RhdGlzdGljcyBhbmQgYmFubmVkIElQc1xuICAgICAqL1xuICAgIGxvYWRTZWN1cml0eURhdGEoKSB7XG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IHRoaXMuY3VycmVudEV4dGVuc2lvbklkO1xuXG4gICAgICAgIGlmICghZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBhdXRoIGZhaWx1cmVzIHZpYSBTaXBBUElcbiAgICAgICAgU2lwQVBJLmdldEF1dGhGYWlsdXJlU3RhdHMoZXh0ZW5zaW9uLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY3VyaXR5RGF0YSA9IHJlc3BvbnNlLmRhdGEgfHwge307XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VjdXJpdHlEYXRhID0ge307XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZldGNoIGJhbm5lZCBJUHMgdmlhIEZpcmV3YWxsQVBJXG4gICAgICAgICAgICBGaXJld2FsbEFQSS5nZXRCYW5uZWRJcHMoKGJhbm5lZFJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJhbm5lZFJlc3BvbnNlICYmIGJhbm5lZFJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhbm5lZElwcyA9IGJhbm5lZFJlc3BvbnNlLmRhdGEgfHwge307XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYW5uZWRJcHMgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBSZW5kZXIgdGhlIGNvbWJpbmVkIGRhdGFcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclNlY3VyaXR5VGFibGUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHNlY3VyaXR5IHRhYmxlIHdpdGggY29sb3ItY29kZWQgcm93c1xuICAgICAqIFJlZCByb3cgPSBiYW5uZWQgSVAsIEdyZWVuIHJvdyA9IG5vdCBiYW5uZWRcbiAgICAgKi9cbiAgICByZW5kZXJTZWN1cml0eVRhYmxlKCkge1xuICAgICAgICBjb25zdCB0Ym9keSA9IHRoaXMuJHNlY3VyaXR5VGFibGUuZmluZCgndGJvZHknKTtcbiAgICAgICAgdGJvZHkuZW1wdHkoKTtcblxuICAgICAgICBjb25zdCBmYWlsdXJlcyA9IHRoaXMuc2VjdXJpdHlEYXRhO1xuXG4gICAgICAgIGlmICghZmFpbHVyZXMgfHwgT2JqZWN0LmtleXMoZmFpbHVyZXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kc2VjdXJpdHlUYWJsZS5oaWRlKCk7XG4gICAgICAgICAgICB0aGlzLiRub1NlY3VyaXR5RGF0YS5zaG93KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLnNob3coKTtcbiAgICAgICAgdGhpcy4kbm9TZWN1cml0eURhdGEuaGlkZSgpO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBmYWlsZWQgYXV0aCBJUHNcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmFpbHVyZXMpLmZvckVhY2goKFtpcCwgc3RhdHNdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpc0Jhbm5lZCA9IHRoaXMuYmFubmVkSXBzLmhhc093blByb3BlcnR5KGlwKTtcblxuICAgICAgICAgICAgLy8gVXNlIEZvbWFudGljIFVJIHRhYmxlIHJvdyBzdGF0ZXNcbiAgICAgICAgICAgIC8vICduZWdhdGl2ZScgPSByZWQgcm93IChiYW5uZWQpXG4gICAgICAgICAgICAvLyAncG9zaXRpdmUnID0gZ3JlZW4gcm93IChub3QgYmFubmVkKVxuICAgICAgICAgICAgY29uc3Qgcm93Q2xhc3MgPSBpc0Jhbm5lZCA/ICduZWdhdGl2ZScgOiAncG9zaXRpdmUnO1xuXG4gICAgICAgICAgICBjb25zdCBsYXN0QXR0ZW1wdCA9IG5ldyBEYXRlKHN0YXRzLmxhc3RfYXR0ZW1wdCAqIDEwMDApLnRvTG9jYWxlU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgdW5iYW4gYnV0dG9uIG9ubHkgZm9yIGJhbm5lZCBJUHNcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbkJ1dHRvbiA9IGlzQmFubmVkXG4gICAgICAgICAgICAgICAgPyBgPGJ1dHRvbiBjbGFzcz1cInVpIG1pbmkgcmVkIGljb24gYnV0dG9uIHVuYmFuLWlwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtaXA9XCIke2lwfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXRvb2x0aXA9XCIke2dsb2JhbFRyYW5zbGF0ZS5leF9TZWN1cml0eVVuYmFufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwibGVmdCBjZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1bmxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cIiR7cm93Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD48c3Ryb25nPiR7aXB9PC9zdHJvbmc+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPiR7c3RhdHMuY291bnR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPiR7bGFzdEF0dGVtcHR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2FjdGlvbkJ1dHRvbn08L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgdW5iYW4gYnV0dG9uc1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJ1tkYXRhLXRvb2x0aXBdJykucG9wdXAoKTtcblxuICAgICAgICAvLyBCaW5kIHVuYmFuIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJy51bmJhbi1pcCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVVuYmFuQ2xpY2soZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdW5iYW4gYnV0dG9uIGNsaWNrXG4gICAgICogQHBhcmFtIHtFdmVudH0gZSAtIENsaWNrIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlVW5iYW5DbGljayhlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgY29uc3QgaXAgPSAkYnV0dG9uLmRhdGEoJ2lwJyk7XG5cbiAgICAgICAgaWYgKCFpcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIENhbGwgRmlyZXdhbGxBUEkgdG8gdW5iYW4gSVBcbiAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcChpcCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCByZWxvYWQgc2VjdXJpdHkgZGF0YSAtIHRhYmxlIHdpbGwgdXBkYXRlIHZpc3VhbGx5XG4gICAgICAgICAgICAgICAgLy8gUmVkIHJvdyB3aWxsIGJlY29tZSBncmVlbiByb3dcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLmxvYWRTZWN1cml0eURhdGEoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBzaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgOiB7ZXJyb3I6IFsnRmFpbGVkIHRvIHVuYmFuIElQJ119O1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1zZyk7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIENsZWFyIHVwZGF0ZSB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBleHRlbnNpb24tbW9kaWZ5LmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3I7XG59Il19