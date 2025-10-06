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
      this.$activeDevicesList.html("\n                <div class=\"ui placeholder segment\">\n                    <div class=\"ui icon header\">\n                        <i class=\"desktop icon\"></i>\n                        ".concat(globalTranslate.ex_NoActiveDevices, "\n                    </div>\n                </div>\n            "));
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
      this.$deviceHistoryList.html("\n                <div class=\"ui placeholder segment\">\n                    <div class=\"ui icon header\">\n                        <i class=\"history icon\"></i>\n                        ".concat(globalTranslate.ex_NoHistoryAvailable, "\n                    </div>\n                </div>\n            "));
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


      var rowClass = isBanned ? 'negative' : '';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCIkc2VjdXJpdHlUYWJsZSIsIiRub1NlY3VyaXR5RGF0YSIsInNlY3VyaXR5RGF0YSIsImJhbm5lZElwcyIsInVwZGF0ZVRpbWVyIiwiaW5pdGlhbGl6ZSIsImV4dHJhY3RFeHRlbnNpb25JZCIsImNhY2hlRWxlbWVudHMiLCJzdWJzY3JpYmVUb0V2ZW50cyIsImxvYWRJbml0aWFsU3RhdHVzIiwibG9hZFNlY3VyaXR5RGF0YSIsInN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lciIsIiRudW1iZXJGaWVsZCIsIiQiLCJsZW5ndGgiLCJ2YWwiLCJleHRlbnNpb25OdW1iZXIiLCJpbnB1dG1hc2siLCJlIiwicmVwbGFjZSIsInVybE1hdGNoIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsIm1hdGNoIiwic2V0VGltZW91dCIsIlNpcEFQSSIsImdldFN0YXR1cyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInVwZGF0ZVN0YXR1cyIsImxvYWRIaXN0b3JpY2FsRGF0YSIsImdldEhpc3RvcnkiLCJoaXN0b3J5IiwiZGlzcGxheUhpc3RvcmljYWxEYXRhIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJtZXNzYWdlIiwiaGFuZGxlRXZlbnRCdXNNZXNzYWdlIiwiYWRkRXZlbnRMaXN0ZW5lciIsInN0YXR1c2VzIiwic3RhdHVzRGF0YSIsInVwZGF0ZVN0YXR1c0xhYmVsIiwic3RhdHVzIiwidXBkYXRlQWN0aXZlRGV2aWNlcyIsImRldmljZXMiLCJjb2xvciIsImdldENvbG9yRm9yU3RhdHVzIiwibGFiZWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiaHRtbCIsIkFycmF5IiwiaXNBcnJheSIsImV4X05vQWN0aXZlRGV2aWNlcyIsImRldmljZXNIdG1sIiwiZm9yRWFjaCIsImRldmljZSIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJpcCIsImNvbnRhY3RfaXAiLCJwb3J0IiwiaXBEaXNwbGF5IiwicnR0IiwidW5kZWZpbmVkIiwidG9GaXhlZCIsImlkIiwiYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycyIsImZpbmQiLCJvbiIsInByZXZlbnREZWZhdWx0IiwiJGxhYmVsIiwiJGl0ZW0iLCJjbG9zZXN0IiwiZGF0YUlkIiwicGFydHMiLCJzcGxpdCIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRoZW4iLCJ0cmFuc2l0aW9uIiwicG9wdXAiLCJjb250ZW50IiwiZXhfSXBDb3BpZWQiLCJwb3NpdGlvbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIiR0ZW1wIiwiYXBwZW5kIiwic2VsZWN0IiwiZG9jdW1lbnQiLCJleGVjQ29tbWFuZCIsInJlbW92ZSIsImNzcyIsImhpc3RvcnlEYXRhIiwiZXhfTm9IaXN0b3J5QXZhaWxhYmxlIiwiZGV2aWNlR3JvdXBzIiwiZ3JvdXBIaXN0b3J5QnlEZXZpY2UiLCJoaXN0b3J5SHRtbCIsIk9iamVjdCIsImVudHJpZXMiLCJkZXZpY2VJbmRleCIsImRldmljZUtleSIsInNlc3Npb25zIiwiZGV2aWNlTmFtZSIsImRldmljZUlQIiwiZGV2aWNlSWQiLCJ0aW1lbGluZUh0bWwiLCJjcmVhdGVEZXZpY2VUaW1lbGluZSIsInNlc3Npb24iLCJpbmRleCIsImlzT25saW5lIiwiZXZlbnRMYWJlbCIsImV2ZW50X3R5cGUiLCJleF9EZXZpY2VEaXNjb25uZWN0ZWQiLCJleF9EZXZpY2VDb25uZWN0ZWQiLCJydHRMYWJlbCIsImdldFJ0dExhYmVsIiwiZGF0ZXRpbWUiLCJmb3JtYXREYXRlVGltZSIsImRhdGUiLCJ0aW1lc3RhbXAiLCJzdGF0dXNDbGFzcyIsInN0YXR1c1RpdGxlIiwiZHVyYXRpb25IdG1sIiwiZXhfT25saW5lIiwiY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93IiwiZHVyYXRpb24iLCJjYWxjdWxhdGVEdXJhdGlvbiIsImR1cmF0aW9uVGV4dCIsImV4X09mZmxpbmUiLCJpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcyIsImdyb3VwcyIsImVudHJ5IiwiaXBfYWRkcmVzcyIsImRldGFpbHMiLCJ0cmltIiwicHVzaCIsImtleXMiLCJrZXkiLCJzb3J0IiwiYSIsImIiLCJzb3J0ZWRHcm91cHMiLCJhTGF0ZXN0IiwiYkxhdGVzdCIsInNvcnRlZE9iamVjdCIsInZhbHVlIiwiY3VycmVudFRpbWVzdGFtcCIsInByZXZpb3VzVGltZXN0YW1wIiwiZGlmZiIsIk1hdGgiLCJhYnMiLCJtaW51dGVzIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmb3JtYXRUaW1lIiwiZGF0ZVN0ciIsImluY2x1ZGVzIiwidGltZVBhcnQiLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwidGltZSIsIm5vdyIsImlzVG9kYXkiLCJ0b0RhdGVTdHJpbmciLCJ5ZXN0ZXJkYXkiLCJzZXREYXRlIiwiZ2V0RGF0ZSIsImlzWWVzdGVyZGF5IiwibG9jYWxlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJnZXRVc2VyTG9jYWxlIiwidGltZVN0ciIsImhvdXIiLCJtaW51dGUiLCJzZWNvbmQiLCJ5ZXN0ZXJkYXlUZXh0IiwiZXhfWWVzdGVyZGF5IiwidG9Mb2NhbGVEYXRlU3RyaW5nIiwiZGF5IiwibW9udGgiLCJjbGVhckludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJ1cGRhdGVPbmxpbmVEdXJhdGlvbnMiLCIkZHVyYXRpb25zIiwiZWFjaCIsImVsZW1lbnQiLCIkZWxlbWVudCIsIm9ubGluZVNpbmNlIiwicGFyc2VJbnQiLCJ0ZXh0IiwiZGF5QWdvIiwicmVjZW50U2Vzc2lvbnMiLCJmaWx0ZXIiLCJzIiwic2VnbWVudER1cmF0aW9uIiwic2VnbWVudHMiLCJzZWdtZW50RGF0YSIsImZpbGwiLCJjaHJvbm9sb2dpY2FsU2Vzc2lvbnMiLCJyZXZlcnNlIiwibmV4dFNlc3Npb24iLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwic2VnbWVudEluZGV4Iiwic2VnbWVudFdpZHRoIiwiYmdDb2xvciIsImJvcmRlckxlZnQiLCJzZWdtZW50VGltZSIsInNlZ21lbnREYXRlIiwiaG91cnNMYWJlbCIsImV4X0hvdXJzX1Nob3J0IiwiZXhfTm93IiwidmFyaWF0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImV4dGVuc2lvbiIsImdldEF1dGhGYWlsdXJlU3RhdHMiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImJhbm5lZFJlc3BvbnNlIiwicmVuZGVyU2VjdXJpdHlUYWJsZSIsInRib2R5IiwiZW1wdHkiLCJmYWlsdXJlcyIsInN0YXRzIiwiaXNCYW5uZWQiLCJoYXNPd25Qcm9wZXJ0eSIsInJvd0NsYXNzIiwibGFzdEF0dGVtcHQiLCJsYXN0X2F0dGVtcHQiLCJ0b0xvY2FsZVN0cmluZyIsImFjdGlvbkJ1dHRvbiIsImV4X1NlY3VyaXR5VW5iYW4iLCJyb3ciLCJjb3VudCIsImhhbmRsZVVuYmFuQ2xpY2siLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsInVuYmFuSXAiLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJkZXN0cm95IiwidW5zdWJzY3JpYmUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsNEJBQTRCLEdBQUc7QUFDakNDLEVBQUFBLFNBQVMsRUFBRSxr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LEVBQWlDO0FBQzdCO0FBQ0E7QUFDQXBDLFFBQUFBLDRCQUE0QixDQUFDaUIsZ0JBQTdCO0FBQ0gsT0FKRCxNQUlPO0FBQ0g7QUFDQSxZQUFNOE8sUUFBUSxHQUFHNU4sUUFBUSxJQUFJQSxRQUFRLENBQUM2TixRQUFyQixHQUNYN04sUUFBUSxDQUFDNk4sUUFERSxHQUVYO0FBQUM5SixVQUFBQSxLQUFLLEVBQUUsQ0FBQyxvQkFBRDtBQUFSLFNBRk47QUFHQStKLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0QkgsUUFBNUI7QUFDQUgsUUFBQUEsT0FBTyxDQUFDbE0sV0FBUixDQUFvQixrQkFBcEI7QUFDSDtBQUNKLEtBYkQ7QUFjSCxHQTM1QmdDOztBQTY1QmpDO0FBQ0o7QUFDQTtBQUNJeU0sRUFBQUEsT0FoNkJpQyxxQkFnNkJ2QjtBQUNOO0FBQ0EsUUFBSSxLQUFLeFAsV0FBVCxFQUFzQjtBQUNsQndMLE1BQUFBLGFBQWEsQ0FBQyxLQUFLeEwsV0FBTixDQUFiO0FBQ0EsV0FBS0EsV0FBTCxHQUFtQixJQUFuQjtBQUNIOztBQUVELFFBQUksT0FBT2dDLFFBQVAsS0FBb0IsV0FBeEIsRUFBcUM7QUFDakNBLE1BQUFBLFFBQVEsQ0FBQ3lOLFdBQVQsQ0FBcUIsa0JBQXJCO0FBQ0g7O0FBQ0QsU0FBS2xRLGFBQUwsR0FBcUIsS0FBckI7QUFDQSxTQUFLQyxrQkFBTCxHQUEwQixJQUExQjtBQUNIO0FBNTZCZ0MsQ0FBckMsQyxDQSs2QkE7O0FBQ0EsSUFBSSxPQUFPa1EsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCdFEsNEJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBFdmVudEJ1cywgU2lwQVBJLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogRXh0ZW5zaW9uIE1vZGlmeSBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxpZmllZCBzdGF0dXMgbW9uaXRvcmluZyBmb3IgZXh0ZW5zaW9uIG1vZGlmeSBwYWdlOlxuICogLSBTaW5nbGUgQVBJIGNhbGwgb24gaW5pdGlhbGl6YXRpb25cbiAqIC0gUmVhbC10aW1lIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIG9ubHlcbiAqIC0gTm8gcGVyaW9kaWMgcG9sbGluZ1xuICogLSBDbGVhbiBkZXZpY2UgbGlzdCBhbmQgaGlzdG9yeSBkaXNwbGF5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgPSB7XG4gICAgY2hhbm5lbElkOiAnZXh0ZW5zaW9uLXN0YXR1cycsXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG4gICAgY3VycmVudEV4dGVuc2lvbklkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0xhYmVsOiBudWxsLFxuICAgICRhY3RpdmVEZXZpY2VzTGlzdDogbnVsbCxcbiAgICAkZGV2aWNlSGlzdG9yeUxpc3Q6IG51bGwsXG4gICAgJHNlY3VyaXR5VGFibGU6IG51bGwsXG4gICAgJG5vU2VjdXJpdHlEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgZGF0YVxuICAgICAqL1xuICAgIHNlY3VyaXR5RGF0YToge30sXG4gICAgYmFubmVkSXBzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnRlcnZhbCB0aW1lclxuICAgICAqL1xuICAgIHVwZGF0ZVRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGV4dGVuc2lvbiBudW1iZXIgZnJvbSBmb3JtXG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIGluaXRpYWwgQVBJIGNhbGxcbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpO1xuXG4gICAgICAgIC8vIExvYWQgc2VjdXJpdHkgZGF0YVxuICAgICAgICB0aGlzLmxvYWRTZWN1cml0eURhdGEoKTtcblxuICAgICAgICAvLyBTdGFydCB0aW1lciBmb3IgdXBkYXRpbmcgb25saW5lIGR1cmF0aW9uc1xuICAgICAgICB0aGlzLnN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lcigpO1xuXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IGV4dGVuc2lvbiBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICovXG4gICAgZXh0cmFjdEV4dGVuc2lvbklkKCkge1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIGdldCB0aGUgcGhvbmUgbnVtYmVyIGZyb20gZm9ybSBmaWVsZCAocHJpbWFyeSlcbiAgICAgICAgY29uc3QgJG51bWJlckZpZWxkID0gJCgnaW5wdXRbbmFtZT1cIm51bWJlclwiXScpO1xuICAgICAgICBpZiAoJG51bWJlckZpZWxkLmxlbmd0aCAmJiAkbnVtYmVyRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdW5tYXNrZWQgdmFsdWUgaWYgaW5wdXRtYXNrIGlzIGFwcGxpZWRcbiAgICAgICAgICAgIGxldCBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGlucHV0bWFzayBpcyBhdmFpbGFibGUgYW5kIGFwcGxpZWQgdG8gdGhlIGZpZWxkXG4gICAgICAgICAgICBpZiAodHlwZW9mICRudW1iZXJGaWVsZC5pbnB1dG1hc2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWUgKG9ubHkgdGhlIGFjdHVhbCBpbnB1dCB3aXRob3V0IG1hc2sgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgaWYgaW5wdXRtYXNrIG1ldGhvZCBmYWlsc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQudmFsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIHRoZSB2YWx1ZSAtIHJlbW92ZSBhbnkgcmVtYWluaW5nIG1hc2sgY2hhcmFjdGVycyBsaWtlIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9IGV4dGVuc2lvbk51bWJlci5yZXBsYWNlKC9bXjAtOV0vZywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IHJldHVybiBpZiB3ZSBoYXZlIGFjdHVhbCBkaWdpdHNcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9uTnVtYmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjayB0byBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybE1hdGNoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9cXC9leHRlbnNpb25zXFwvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGlmICh1cmxNYXRjaCAmJiB1cmxNYXRjaFsxXSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBkYXRhYmFzZSBJRCwgd2UgbmVlZCB0byB3YWl0IGZvciBmb3JtIHRvIGxvYWRcbiAgICAgICAgICAgIC8vIFdlJ2xsIGdldCB0aGUgYWN0dWFsIGV4dGVuc2lvbiBudW1iZXIgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICovXG4gICAgY2FjaGVFbGVtZW50cygpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWwgPSAkKCcjc3RhdHVzJyk7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0ID0gJCgnI2FjdGl2ZS1kZXZpY2VzLWxpc3QnKTtcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgPSAkKCcjZGV2aWNlLWhpc3RvcnktbGlzdCcpO1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlID0gJCgnI3NlY3VyaXR5LWZhaWxlZC1hdXRoLXRhYmxlJyk7XG4gICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhID0gJCgnI25vLXNlY3VyaXR5LWRhdGEnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaW5pdGlhbCBzdGF0dXMgd2l0aCBzaW5nbGUgQVBJIGNhbGxcbiAgICAgKi9cbiAgICBsb2FkSW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gUmUtY2hlY2sgZXh0ZW5zaW9uIElEIGFmdGVyIGZvcm0gbG9hZHNcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhZ2FpbiBhZnRlciBkZWxheSAoZm9ybSBtaWdodCBzdGlsbCBiZSBsb2FkaW5nKVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpLCA1MDApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIEFQSSBjYWxsIGZvciBjdXJyZW50IHN0YXR1c1xuICAgICAgICBTaXBBUEkuZ2V0U3RhdHVzKHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gbG9hZCBoaXN0b3JpY2FsIGRhdGFcbiAgICAgICAgdGhpcy5sb2FkSGlzdG9yaWNhbERhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZEhpc3RvcmljYWxEYXRhKCkge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBoaXN0b3J5IGZyb20gQVBJXG4gICAgICAgIFNpcEFQSS5nZXRIaXN0b3J5KHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmhpc3RvcnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXlIaXN0b3JpY2FsRGF0YShyZXNwb25zZS5kYXRhLmhpc3RvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlZnJlc2ggc2VjdXJpdHkgZGF0YSBvbiBjb25maWcgY2hhbmdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmxvYWRTZWN1cml0eURhdGEoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlO1xuICAgICAgICBpZiAoZGF0YS5zdGF0dXNlcyAmJiBkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1c0RhdGEuc3RhdHVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgZGV2aWNlc1xuICAgICAgICB0aGlzLnVwZGF0ZUFjdGl2ZURldmljZXMoc3RhdHVzRGF0YS5kZXZpY2VzIHx8IFtdKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERvbid0IGFkZCB0byBoaXN0b3J5IC0gaGlzdG9yeSBpcyBsb2FkZWQgZnJvbSBBUEkgb25seVxuICAgICAgICAvLyB0aGlzLmFkZFRvSGlzdG9yeShzdGF0dXNEYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNMYWJlbChzdGF0dXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRzdGF0dXNMYWJlbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBnbG9iYWxUcmFuc2xhdGVbYGV4X1N0YXR1cyR7c3RhdHVzfWBdIHx8IHN0YXR1cztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGNsYXNzIGFuZCB1cGRhdGUgY29udGVudFxuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbFxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmV5IGdyZWVuIHJlZCB5ZWxsb3cgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoY29sb3IpXG4gICAgICAgICAgICAuaHRtbChgJHtsYWJlbH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBmb3Igc3RhdHVzIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKSB7XG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVW5hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBjYXNlICdEaXNhYmxlZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFjdGl2ZSBkZXZpY2VzIGxpc3RcbiAgICAgKi9cbiAgICB1cGRhdGVBY3RpdmVEZXZpY2VzKGRldmljZXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdCB8fCAhQXJyYXkuaXNBcnJheShkZXZpY2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRldmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZGVza3RvcCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9BY3RpdmVEZXZpY2VzfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgbGlzdCB3aXRoIHRlYWwgbGFiZWxzIGxpa2UgdGhlIG9sZCBlbmRwb2ludC1saXN0XG4gICAgICAgIGxldCBkZXZpY2VzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzLmZvckVhY2goKGRldmljZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gZGV2aWNlLnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBkZXZpY2UuaXAgfHwgZGV2aWNlLmNvbnRhY3RfaXAgfHwgJy0nO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IGRldmljZS5wb3J0IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXBEaXNwbGF5ID0gcG9ydCA/IGAke2lwfToke3BvcnR9YCA6IGlwO1xuICAgICAgICAgICAgY29uc3QgcnR0ID0gZGV2aWNlLnJ0dCAhPT0gbnVsbCAmJiBkZXZpY2UucnR0ICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgICAgPyBgICgke2RldmljZS5ydHQudG9GaXhlZCgyKX0gbXMpYCBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt1c2VyQWdlbnR9fCR7aXB9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGV2aWNlc0h0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZWFsIGxhYmVsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3VzZXJBZ2VudH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXRhaWxcIj4ke2lwRGlzcGxheX0ke3J0dH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRldmljZXNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGRldmljZXNIdG1sKTtcblxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBjb3B5IElQIGFkZHJlc3NcbiAgICAgICAgdGhpcy5hdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBjbGljayBoYW5kbGVycyB0byBkZXZpY2UgbGFiZWxzIGZvciBJUCBjb3B5aW5nXG4gICAgICovXG4gICAgYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycygpIHtcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuZmluZCgnLml0ZW0gLnVpLmxhYmVsJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkbGFiZWwuY2xvc2VzdCgnLml0ZW0nKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGFJZCA9ICRpdGVtLmRhdGEoJ2lkJyk7XG5cbiAgICAgICAgICAgIGlmICghZGF0YUlkKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgSVAgZnJvbSBkYXRhLWlkIChmb3JtYXQ6IFwiVXNlckFnZW50fElQXCIpXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGRhdGFJZC5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBwYXJ0c1sxXTtcblxuICAgICAgICAgICAgaWYgKCFpcCB8fCBpcCA9PT0gJy0nKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIENvcHkgdG8gY2xpcGJvYXJkIHVzaW5nIHRoZSBzYW1lIG1ldGhvZCBhcyBwYXNzd29yZCB3aWRnZXRcbiAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IuY2xpcGJvYXJkICYmIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KSB7XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoaXApLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgZmVlZGJhY2tcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgY2hhbmdlIHRoZSBsYWJlbCBjb2xvciB0byBpbmRpY2F0ZSBzdWNjZXNzXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygndGVhbCcpLmFkZENsYXNzKCdncmVlbicpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygndGVhbCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHBvcHVwIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JcENvcGllZH06ICR7aXB9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcidcbiAgICAgICAgICAgICAgICAgICAgfSkucG9wdXAoJ3Nob3cnKTtcblxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsYWJlbC5wb3B1cCgnaGlkZScpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjb3B5IElQOicsIGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZW1wID0gJCgnPGlucHV0PicpO1xuICAgICAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQoJHRlbXApO1xuICAgICAgICAgICAgICAgICR0ZW1wLnZhbChpcCkuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKTtcbiAgICAgICAgICAgICAgICAkdGVtcC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZmVlZGJhY2tcbiAgICAgICAgICAgICAgICAkbGFiZWwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ3RlYWwnKS5hZGRDbGFzcygnZ3JlZW4nKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCd0ZWFsJyk7XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBjdXJzb3IgcG9pbnRlciBzdHlsZVxuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5maW5kKCcuaXRlbSAudWkubGFiZWwnKS5jc3MoJ2N1cnNvcicsICdwb2ludGVyJyk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBoaXN0b3JpY2FsIGRhdGEgZnJvbSBBUEkgd2l0aCBkZXZpY2UgZ3JvdXBpbmdcbiAgICAgKi9cbiAgICBkaXNwbGF5SGlzdG9yaWNhbERhdGEoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdCB8fCAhQXJyYXkuaXNBcnJheShoaXN0b3J5RGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoaXN0b3J5RGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJoaXN0b3J5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0hpc3RvcnlBdmFpbGFibGV9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHcm91cCBoaXN0b3J5IGJ5IGRldmljZVxuICAgICAgICBjb25zdCBkZXZpY2VHcm91cHMgPSB0aGlzLmdyb3VwSGlzdG9yeUJ5RGV2aWNlKGhpc3RvcnlEYXRhKTtcblxuICAgICAgICAvLyBCdWlsZCBIVE1MIGZvciBncm91cGVkIGRpc3BsYXkgLSBzaW1wbGlmaWVkIHN0cnVjdHVyZVxuICAgICAgICBsZXQgaGlzdG9yeUh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZWQgbGlzdFwiPic7XG5cbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZGV2aWNlR3JvdXBzKS5mb3JFYWNoKChbZGV2aWNlS2V5LCBzZXNzaW9uc10sIGRldmljZUluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBbdXNlckFnZW50LCBpcF0gPSBkZXZpY2VLZXkuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IGRldmljZU5hbWUgPSB1c2VyQWdlbnQgfHwgJ1Vua25vd24gRGV2aWNlJztcbiAgICAgICAgICAgIGNvbnN0IGRldmljZUlQID0gKGlwICYmIGlwICE9PSAnVW5rbm93bicpID8gaXAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGRldmljZUlkID0gYGRldmljZS0ke2RldmljZUluZGV4fWA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aW1lbGluZSBIVE1MIGZvciB0aGlzIGRldmljZVxuICAgICAgICAgICAgY29uc3QgdGltZWxpbmVIdG1sID0gdGhpcy5jcmVhdGVEZXZpY2VUaW1lbGluZShzZXNzaW9ucywgZGV2aWNlSWQpO1xuXG4gICAgICAgICAgICAvLyBEZXZpY2UgaGVhZGVyIC0gZXhhY3RseSBhcyByZXF1ZXN0ZWRcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibW9iaWxlIGFsdGVybmF0ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlTmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkZXZpY2VJUCA/IGA8c3BhbiBzdHlsZT1cImNvbG9yOiBncmV5OyBmb250LXNpemU6MC43ZW07XCI+JHtkZXZpY2VJUH08Lz5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dGltZWxpbmVIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uXCI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXNzaW9ucyB0aW1lbGluZSAtIHNpbXBsaWZpZWRcbiAgICAgICAgICAgIHNlc3Npb25zLmZvckVhY2goKHNlc3Npb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZXZlbnQgdHlwZSB0byBkZXRlcm1pbmUgYWN0dWFsIGRldmljZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgaXNPbmxpbmUgPSBzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZSc7XG4gICAgICAgICAgICAgICAgbGV0IGV2ZW50TGFiZWwgPSAnJztcblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZXZpY2Utc3BlY2lmaWMgZXZlbnRzXG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgICAgICBpc09ubGluZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBldmVudExhYmVsID0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leF9EZXZpY2VEaXNjb25uZWN0ZWR9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9hZGRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBldmVudExhYmVsID0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leF9EZXZpY2VDb25uZWN0ZWR9YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBydHRMYWJlbCA9IHRoaXMuZ2V0UnR0TGFiZWwoc2Vzc2lvbi5ydHQpO1xuICAgICAgICAgICAgICAgIC8vIEZvcm1hdCBkYXRldGltZSB3aXRoIGRhdGUgYW5kIHRpbWVcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRldGltZSA9IHRoaXMuZm9ybWF0RGF0ZVRpbWUoc2Vzc2lvbi5kYXRlIHx8IHNlc3Npb24udGltZXN0YW1wKTtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSBjaXJjdWxhciBsYWJlbHMgbGlrZSBpbiBleHRlbnNpb25zIGxpc3RcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGlzT25saW5lID8gJ2dyZWVuJyA6ICdncmV5JztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNUaXRsZSA9IGlzT25saW5lID8gJ09ubGluZScgOiAnT2ZmbGluZSc7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb25IdG1sID0gJyc7XG4gICAgICAgICAgICAgICAgLy8gRm9yIHRoZSBmaXJzdCAobW9zdCByZWNlbnQpIGVudHJ5IHRoYXQgaXMgb25saW5lLCBhZGQgbGl2ZSBkdXJhdGlvblxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCAmJiBpc09ubGluZSAmJiBzZXNzaW9uLmV2ZW50X3R5cGUgIT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGRhdGEgYXR0cmlidXRlIHdpdGggdGltZXN0YW1wIGZvciBsaXZlIHVwZGF0aW5nXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uSHRtbCA9IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dCBvbmxpbmUtZHVyYXRpb25cIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtb25saW5lLXNpbmNlPVwiJHtzZXNzaW9uLnRpbWVzdGFtcH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZX0gJHt0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyhzZXNzaW9uLnRpbWVzdGFtcCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHN0YXRpYyBkdXJhdGlvbiBmb3IgaGlzdG9yaWNhbCBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5jYWxjdWxhdGVEdXJhdGlvbihzZXNzaW9uLnRpbWVzdGFtcCwgc2Vzc2lvbnNbaW5kZXggLSAxXT8udGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9ybWF0IGR1cmF0aW9uIHdpdGggdHJhbnNsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25UZXh0ID0gZHVyYXRpb24gJiYgaXNPbmxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZX0gJHtkdXJhdGlvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT2ZmbGluZX0gJHtkdXJhdGlvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25UZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkh0bWwgPSBgPHNwYW4gY2xhc3M9XCJ1aSBncmV5IHRleHRcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+JHtkdXJhdGlvblRleHR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCB0ZXh0XCIgc3R5bGU9XCJtYXJnaW46IDZweCAyMHB4OyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdHVzQ2xhc3N9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogOHB4OyBoZWlnaHQ6IDhweDsgbWluLWhlaWdodDogOHB4OyBtYXJnaW4tcmlnaHQ6IDhweDtcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7c3RhdHVzVGl0bGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZGF0ZXRpbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAke3J0dExhYmVsfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtkdXJhdGlvbkh0bWwgfHwgZXZlbnRMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcblxuICAgICAgICBoaXN0b3J5SHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QuaHRtbChoaXN0b3J5SHRtbCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lbGluZSB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUaW1lbGluZVRvb2x0aXBzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHcm91cCBoaXN0b3J5IGV2ZW50cyBieSBkZXZpY2UgYW5kIHNvcnQgYnkgbGFzdCBldmVudFxuICAgICAqL1xuICAgIGdyb3VwSGlzdG9yeUJ5RGV2aWNlKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xuXG4gICAgICAgIGhpc3RvcnlEYXRhLmZvckVhY2goZW50cnkgPT4ge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGRldmljZSBrZXkgZnJvbSB1c2VyX2FnZW50IGFuZCBJUFxuICAgICAgICAgICAgbGV0IGRldmljZUtleSA9ICdVbmtub3dufFVua25vd24nO1xuXG4gICAgICAgICAgICBpZiAoZW50cnkudXNlcl9hZ2VudCB8fCBlbnRyeS5pcF9hZGRyZXNzKSB7XG4gICAgICAgICAgICAgICAgZGV2aWNlS2V5ID0gYCR7ZW50cnkudXNlcl9hZ2VudCB8fCAnVW5rbm93bid9fCR7ZW50cnkuaXBfYWRkcmVzcyB8fCAnVW5rbm93bid9YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkuZGV0YWlscykge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBleHRyYWN0IGRldmljZSBpbmZvIGZyb20gZGV0YWlsc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZW50cnkuZGV0YWlscy5tYXRjaCgvKFtcXHdcXHMuXSspXFxzKi1cXHMqKFtcXGQuXSspLyk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke21hdGNoWzFdLnRyaW0oKX18JHttYXRjaFsyXS50cmltKCl9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZ3JvdXBzW2RldmljZUtleV0pIHtcbiAgICAgICAgICAgICAgICBncm91cHNbZGV2aWNlS2V5XSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBncm91cHNbZGV2aWNlS2V5XS5wdXNoKGVudHJ5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydCBzZXNzaW9ucyB3aXRoaW4gZWFjaCBncm91cCBieSB0aW1lc3RhbXAgKG5ld2VzdCBmaXJzdClcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBncm91cHNba2V5XS5zb3J0KChhLCBiKSA9PiBiLnRpbWVzdGFtcCAtIGEudGltZXN0YW1wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCB0byBhcnJheSBhbmQgc29ydCBieSBtb3N0IHJlY2VudCBldmVudFxuICAgICAgICBjb25zdCBzb3J0ZWRHcm91cHMgPSBPYmplY3QuZW50cmllcyhncm91cHMpXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgbW9zdCByZWNlbnQgdGltZXN0YW1wIGZyb20gZWFjaCBncm91cCAoZmlyc3QgZWxlbWVudCBzaW5jZSBhbHJlYWR5IHNvcnRlZClcbiAgICAgICAgICAgICAgICBjb25zdCBhTGF0ZXN0ID0gYVsxXVswXT8udGltZXN0YW1wIHx8IDA7XG4gICAgICAgICAgICAgICAgY29uc3QgYkxhdGVzdCA9IGJbMV1bMF0/LnRpbWVzdGFtcCB8fCAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBiTGF0ZXN0IC0gYUxhdGVzdDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgYmFjayB0byBvYmplY3Qgd2l0aCBzb3J0ZWQga2V5c1xuICAgICAgICBjb25zdCBzb3J0ZWRPYmplY3QgPSB7fTtcbiAgICAgICAgc29ydGVkR3JvdXBzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgc29ydGVkT2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRlZE9iamVjdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkdXJhdGlvbiBiZXR3ZWVuIHR3byB0aW1lc3RhbXBzXG4gICAgICovXG4gICAgY2FsY3VsYXRlRHVyYXRpb24oY3VycmVudFRpbWVzdGFtcCwgcHJldmlvdXNUaW1lc3RhbXApIHtcbiAgICAgICAgaWYgKCFwcmV2aW91c1RpbWVzdGFtcCkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkaWZmID0gTWF0aC5hYnMocHJldmlvdXNUaW1lc3RhbXAgLSBjdXJyZW50VGltZXN0YW1wKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGhvdXJzIC8gMjQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c31kICR7aG91cnMgJSAyNH1oYDtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc31oICR7bWludXRlcyAlIDYwfW1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc31tYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkaWZmfXNgO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZSBmb3IgZGlzcGxheVxuICAgICAqL1xuICAgIGZvcm1hdFRpbWUoZGF0ZVN0cikge1xuICAgICAgICBpZiAoIWRhdGVTdHIpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYWxyZWFkeSBhIGZvcm1hdHRlZCBkYXRlIHN0cmluZyBsaWtlIFwiMjAyNS0wOS0xMSAxMTozMDozNlwiXG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZVN0ciA9PT0gJ3N0cmluZycgJiYgZGF0ZVN0ci5pbmNsdWRlcygnICcpKSB7XG4gICAgICAgICAgICBjb25zdCB0aW1lUGFydCA9IGRhdGVTdHIuc3BsaXQoJyAnKVsxXTtcbiAgICAgICAgICAgIHJldHVybiB0aW1lUGFydCB8fCBkYXRlU3RyO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBpdCdzIGEgdGltZXN0YW1wXG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZVN0ciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlU3RyICogMTAwMCk7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRhdGVTdHI7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgUlRUIGxhYmVsIHdpdGggY29sb3IgY29kaW5nXG4gICAgICovXG4gICAgZ2V0UnR0TGFiZWwocnR0KSB7XG4gICAgICAgIGlmIChydHQgPT09IG51bGwgfHwgcnR0ID09PSB1bmRlZmluZWQgfHwgcnR0IDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjb2xvciA9ICdncmVlbic7XG4gICAgICAgIGlmIChydHQgPiAxNTApIHtcbiAgICAgICAgICAgIGNvbG9yID0gJ3JlZCc7XG4gICAgICAgIH0gZWxzZSBpZiAocnR0ID4gNTApIHtcbiAgICAgICAgICAgIGNvbG9yID0gJ29saXZlJzsgIC8vIHllbGxvdyBjYW4gYmUgaGFyZCB0byBzZWUsIG9saXZlIGlzIGJldHRlclxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInVpICR7Y29sb3J9IHRleHRcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+W1JUVDogJHtydHQudG9GaXhlZCgwKX1tc108L3NwYW4+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGRhdGV0aW1lIHdpdGggZGF0ZSBhbmQgdGltZSB1c2luZyBpbnRlcmZhY2UgbGFuZ3VhZ2VcbiAgICAgKi9cbiAgICBmb3JtYXREYXRlVGltZSh0aW1lKSB7XG4gICAgICAgIGlmICghdGltZSkgcmV0dXJuICctLTotLSc7XG5cbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHR5cGVvZiB0aW1lID09PSAnc3RyaW5nJyA/IHRpbWUgOiB0aW1lICogMTAwMCk7XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyB0b2RheVxuICAgICAgICBjb25zdCBpc1RvZGF5ID0gZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0gbm93LnRvRGF0ZVN0cmluZygpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgeWVzdGVyZGF5XG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG5ldyBEYXRlKG5vdyk7XG4gICAgICAgIHllc3RlcmRheS5zZXREYXRlKHllc3RlcmRheS5nZXREYXRlKCkgLSAxKTtcbiAgICAgICAgY29uc3QgaXNZZXN0ZXJkYXkgPSBkYXRlLnRvRGF0ZVN0cmluZygpID09PSB5ZXN0ZXJkYXkudG9EYXRlU3RyaW5nKCk7XG5cbiAgICAgICAgY29uc3QgbG9jYWxlID0gU2VtYW50aWNMb2NhbGl6YXRpb24uZ2V0VXNlckxvY2FsZSgpO1xuICAgICAgICBjb25zdCB0aW1lU3RyID0gZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcobG9jYWxlLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0Jywgc2Vjb25kOiAnMi1kaWdpdCd9KTtcblxuICAgICAgICBpZiAoaXNUb2RheSkge1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVTdHI7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNZZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0cmFuc2xhdGlvbiBmb3IgXCJZZXN0ZXJkYXlcIiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IHllc3RlcmRheVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfWWVzdGVyZGF5O1xuICAgICAgICAgICAgcmV0dXJuIGAke3llc3RlcmRheVRleHR9ICR7dGltZVN0cn1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9ybWF0IGRhdGUgYWNjb3JkaW5nIHRvIGxvY2FsZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKGxvY2FsZSwge2RheTogJzItZGlnaXQnLCBtb250aDogJzItZGlnaXQnfSk7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF0ZVN0cn0gJHt0aW1lU3RyfWA7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGZyb20gdGltZXN0YW1wIHRvIG5vd1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRpZmYgPSBub3cgLSB0aW1lc3RhbXA7XG5cbiAgICAgICAgaWYgKGRpZmYgPCAwKSByZXR1cm4gJzBzJztcblxuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c31kICR7aG91cnMgJSAyNH1oYDtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc31oICR7bWludXRlcyAlIDYwfW1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc31tYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkaWZmfXNgO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IHRpbWVyIHRvIHVwZGF0ZSBvbmxpbmUgZHVyYXRpb25zXG4gICAgICovXG4gICAgc3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyKCkge1xuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy51cGRhdGVUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXZlcnkgMTAgc2Vjb25kc1xuICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVPbmxpbmVEdXJhdGlvbnMoKTtcbiAgICAgICAgfSwgMTAwMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWxsIG9ubGluZSBkdXJhdGlvbiBkaXNwbGF5c1xuICAgICAqL1xuICAgIHVwZGF0ZU9ubGluZUR1cmF0aW9ucygpIHtcbiAgICAgICAgY29uc3QgJGR1cmF0aW9ucyA9IHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Py5maW5kKCcub25saW5lLWR1cmF0aW9uW2RhdGEtb25saW5lLXNpbmNlXScpO1xuICAgICAgICBpZiAoISRkdXJhdGlvbnMgfHwgJGR1cmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICRkdXJhdGlvbnMuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IG9ubGluZVNpbmNlID0gcGFyc2VJbnQoJGVsZW1lbnQuZGF0YSgnb25saW5lLXNpbmNlJyksIDEwKTtcbiAgICAgICAgICAgIGlmIChvbmxpbmVTaW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5jYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3cob25saW5lU2luY2UpO1xuICAgICAgICAgICAgICAgICRlbGVtZW50LnRleHQoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZX0gJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aW1lbGluZSB2aXN1YWxpemF0aW9uIGZvciBhIGRldmljZSdzIGhpc3RvcnlcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzZXNzaW9ucyAtIEFycmF5IG9mIHNlc3Npb24gZXZlbnRzIGZvciB0aGUgZGV2aWNlXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGRldmljZUlkIC0gVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBkZXZpY2VcbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBIVE1MIGZvciB0aGUgdGltZWxpbmVcbiAgICAgKi9cbiAgICBjcmVhdGVEZXZpY2VUaW1lbGluZShzZXNzaW9ucywgZGV2aWNlSWQpIHtcbiAgICAgICAgaWYgKCFzZXNzaW9ucyB8fCBzZXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aW1lIHJhbmdlIChsYXN0IDI0IGhvdXJzKVxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG5cbiAgICAgICAgLy8gRmlsdGVyIHNlc3Npb25zIHdpdGhpbiBsYXN0IDI0IGhvdXJzIChzZXNzaW9ucyBhcmUgc29ydGVkIG5ld2VzdCBmaXJzdClcbiAgICAgICAgY29uc3QgcmVjZW50U2Vzc2lvbnMgPSBzZXNzaW9ucy5maWx0ZXIocyA9PiBzLnRpbWVzdGFtcCA+PSBkYXlBZ28pO1xuICAgICAgICBpZiAocmVjZW50U2Vzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7IC8vIE5vIHJlY2VudCBhY3Rpdml0eVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRpbWVsaW5lIHNlZ21lbnRzICg5NiBzZWdtZW50cyBmb3IgMjQgaG91cnMsIDE1IG1pbnV0ZXMgZWFjaClcbiAgICAgICAgY29uc3Qgc2VnbWVudER1cmF0aW9uID0gMTUgKiA2MDsgLy8gMTUgbWludXRlcyBpbiBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gOTY7XG4gICAgICAgIGNvbnN0IHNlZ21lbnREYXRhID0gbmV3IEFycmF5KHNlZ21lbnRzKS5maWxsKCdncmV5Jyk7XG5cbiAgICAgICAgLy8gUmV2ZXJzZSBzZXNzaW9ucyB0byBwcm9jZXNzIGZyb20gb2xkZXN0IHRvIG5ld2VzdFxuICAgICAgICBjb25zdCBjaHJvbm9sb2dpY2FsU2Vzc2lvbnMgPSBbLi4ucmVjZW50U2Vzc2lvbnNdLnJldmVyc2UoKTtcblxuICAgICAgICAvLyBQcm9jZXNzIHNlc3Npb25zIHRvIGZpbGwgc2VnbWVudHNcbiAgICAgICAgY2hyb25vbG9naWNhbFNlc3Npb25zLmZvckVhY2goKHNlc3Npb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0U2Vzc2lvbiA9IGNocm9ub2xvZ2ljYWxTZXNzaW9uc1tpbmRleCArIDFdOyAvLyBOZXh0IGV2ZW50IGluIHRpbWVcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IHNlc3Npb24udGltZXN0YW1wO1xuICAgICAgICAgICAgY29uc3QgZW5kVGltZSA9IG5leHRTZXNzaW9uID8gbmV4dFNlc3Npb24udGltZXN0YW1wIDogbm93O1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgc3RhdHVzIGNvbG9yIGJhc2VkIG9uIGV2ZW50IHR5cGUgYW5kIHN0YXR1c1xuICAgICAgICAgICAgbGV0IGNvbG9yID0gJ2dyZXknO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBldmVudCB0eXBlIGZpcnN0XG4gICAgICAgICAgICBpZiAoc2Vzc2lvbi5ldmVudF90eXBlID09PSAnZGV2aWNlX2FkZGVkJyB8fCBzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdzdGF0dXNfY2hhbmdlJykge1xuICAgICAgICAgICAgICAgIC8vIERldmljZSBjYW1lIG9ubGluZVxuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZXknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2Vzc2lvbi5ldmVudF90eXBlID09PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gRGV2aWNlIHdlbnQgb2ZmbGluZSAtIHNlZ21lbnRzIEFGVEVSIHRoaXMgZXZlbnQgc2hvdWxkIGJlIGdyZXlcbiAgICAgICAgICAgICAgICBjb2xvciA9ICdncmV5JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnKSB7XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBhdmFpbGFibGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaWxsIHNlZ21lbnRzIGZvciB0aGlzIHNlc3Npb24gcGVyaW9kXG4gICAgICAgICAgICBmb3IgKGxldCB0aW1lID0gc3RhcnRUaW1lOyB0aW1lIDwgZW5kVGltZSAmJiB0aW1lIDw9IG5vdzsgdGltZSArPSBzZWdtZW50RHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWdtZW50SW5kZXggPSBNYXRoLmZsb29yKCh0aW1lIC0gZGF5QWdvKSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnRJbmRleCA+PSAwICYmIHNlZ21lbnRJbmRleCA8IHNlZ21lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW3NlZ21lbnRJbmRleF0gPSBjb2xvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIHRpbWVsaW5lIEhUTUxcbiAgICAgICAgbGV0IHRpbWVsaW5lSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXZpY2UtdGltZWxpbmVcIiBzdHlsZT1cIm1hcmdpbjogMTBweCAwO1wiPlxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMnB4OyBiYWNrZ3JvdW5kOiAjZjNmNGY1OyBib3JkZXItcmFkaXVzOiAzcHg7IG92ZXJmbG93OiBoaWRkZW47XCI+XG4gICAgICAgIGA7XG5cbiAgICAgICAgc2VnbWVudERhdGEuZm9yRWFjaCgoY29sb3IsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50V2lkdGggPSAxMDAgLyBzZWdtZW50cztcbiAgICAgICAgICAgIGNvbnN0IGJnQ29sb3IgPSBjb2xvciA9PT0gJ2dyZWVuJyA/ICcjMjFiYTQ1JyA6ICcjZThlOGU4JztcbiAgICAgICAgICAgIGNvbnN0IGJvcmRlckxlZnQgPSBpbmRleCA+IDAgPyAnMXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4yKScgOiAnbm9uZSc7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIGZvciB0aGlzIHNlZ21lbnRcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRUaW1lID0gZGF5QWdvICsgKGluZGV4ICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnREYXRlID0gbmV3IERhdGUoc2VnbWVudFRpbWUgKiAxMDAwKTtcblxuICAgICAgICAgICAgLy8gR2V0IHVzZXIncyBsb2NhbGVcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsZSA9IFNlbWFudGljTG9jYWxpemF0aW9uLmdldFVzZXJMb2NhbGUoKTtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTdHIgPSBzZWdtZW50RGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcobG9jYWxlLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pO1xuXG4gICAgICAgICAgICB0aW1lbGluZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJ3aWR0aDogJHtzZWdtZW50V2lkdGh9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kLWNvbG9yOiAke2JnQ29sb3J9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgYm9yZGVyLWxlZnQ6ICR7Ym9yZGVyTGVmdH07XCJcbiAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiJHt0aW1lU3RyfSAtICR7Y29sb3IgPT09ICdncmVlbicgPyAnT25saW5lJyA6ICdPZmZsaW5lJ31cIj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRpbWUgbGFiZWxzIHdpdGggbG9jYWxpemF0aW9uXG4gICAgICAgIGNvbnN0IGhvdXJzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSG91cnNfU2hvcnQ7XG5cbiAgICAgICAgdGltZWxpbmVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBtYXJnaW4tdG9wOiAycHg7IGZvbnQtc2l6ZTogMTBweDsgY29sb3I6ICM5OTk7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjI0JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MTgke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4xMiR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjYke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob3d9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG5cbiAgICAgICAgcmV0dXJuIHRpbWVsaW5lSHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lbGluZSB0b29sdGlwcyBhZnRlciByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSB0b29sdGlwcyBmb3IgdGltZWxpbmUgc2VnbWVudHNcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3Q/LmZpbmQoJy5kZXZpY2UtdGltZWxpbmUgW3RpdGxlXScpLnBvcHVwKHtcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ21pbmknLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdXRoZW50aWNhdGlvbiBmYWlsdXJlIHN0YXRpc3RpY3MgYW5kIGJhbm5lZCBJUHNcbiAgICAgKi9cbiAgICBsb2FkU2VjdXJpdHlEYXRhKCkge1xuICAgICAgICBjb25zdCBleHRlbnNpb24gPSB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZDtcblxuICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXV0aCBmYWlsdXJlcyB2aWEgU2lwQVBJXG4gICAgICAgIFNpcEFQSS5nZXRBdXRoRmFpbHVyZVN0YXRzKGV4dGVuc2lvbiwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN1cml0eURhdGEgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY3VyaXR5RGF0YSA9IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGZXRjaCBiYW5uZWQgSVBzIHZpYSBGaXJld2FsbEFQSVxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKChiYW5uZWRSZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChiYW5uZWRSZXNwb25zZSAmJiBiYW5uZWRSZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYW5uZWRJcHMgPSBiYW5uZWRSZXNwb25zZS5kYXRhIHx8IHt9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmFubmVkSXBzID0ge307XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBjb21iaW5lZCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTZWN1cml0eVRhYmxlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzZWN1cml0eSB0YWJsZSB3aXRoIGNvbG9yLWNvZGVkIHJvd3NcbiAgICAgKiBSZWQgcm93ID0gYmFubmVkIElQLCBHcmVlbiByb3cgPSBub3QgYmFubmVkXG4gICAgICovXG4gICAgcmVuZGVyU2VjdXJpdHlUYWJsZSgpIHtcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIHRib2R5LmVtcHR5KCk7XG5cbiAgICAgICAgY29uc3QgZmFpbHVyZXMgPSB0aGlzLnNlY3VyaXR5RGF0YTtcblxuICAgICAgICBpZiAoIWZhaWx1cmVzIHx8IE9iamVjdC5rZXlzKGZhaWx1cmVzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuaGlkZSgpO1xuICAgICAgICAgICAgdGhpcy4kbm9TZWN1cml0eURhdGEuc2hvdygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy4kc2VjdXJpdHlUYWJsZS5zaG93KCk7XG4gICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhLmhpZGUoKTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZmFpbGVkIGF1dGggSVBzXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGZhaWx1cmVzKS5mb3JFYWNoKChbaXAsIHN0YXRzXSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNCYW5uZWQgPSB0aGlzLmJhbm5lZElwcy5oYXNPd25Qcm9wZXJ0eShpcCk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBGb21hbnRpYyBVSSB0YWJsZSByb3cgc3RhdGVzXG4gICAgICAgICAgICAvLyAnbmVnYXRpdmUnID0gcmVkIHJvdyAoYmFubmVkKVxuICAgICAgICAgICAgLy8gJ3Bvc2l0aXZlJyA9IGdyZWVuIHJvdyAobm90IGJhbm5lZClcbiAgICAgICAgICAgIGNvbnN0IHJvd0NsYXNzID0gaXNCYW5uZWQgPyAnbmVnYXRpdmUnIDogJyc7XG5cbiAgICAgICAgICAgIGNvbnN0IGxhc3RBdHRlbXB0ID0gbmV3IERhdGUoc3RhdHMubGFzdF9hdHRlbXB0ICogMTAwMCkudG9Mb2NhbGVTdHJpbmcoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyB1bmJhbiBidXR0b24gb25seSBmb3IgYmFubmVkIElQc1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uQnV0dG9uID0gaXNCYW5uZWRcbiAgICAgICAgICAgICAgICA/IGA8YnV0dG9uIGNsYXNzPVwidWkgbWluaSByZWQgaWNvbiBidXR0b24gdW5iYW4taXBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pcD1cIiR7aXB9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdG9vbHRpcD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4X1NlY3VyaXR5VW5iYW59XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJsZWZ0IGNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInVubG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPmBcbiAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICBjb25zdCByb3cgPSBgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiJHtyb3dDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkPjxzdHJvbmc+JHtpcH08L3N0cm9uZz48L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+JHtzdGF0cy5jb3VudH08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+JHtsYXN0QXR0ZW1wdH08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7YWN0aW9uQnV0dG9ufTwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG5cbiAgICAgICAgICAgIHRib2R5LmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciB1bmJhbiBidXR0b25zXG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuZmluZCgnW2RhdGEtdG9vbHRpcF0nKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIEJpbmQgdW5iYW4gYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuZmluZCgnLnVuYmFuLWlwJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlVW5iYW5DbGljayhlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSB1bmJhbiBidXR0b24gY2xpY2tcbiAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gQ2xpY2sgZXZlbnRcbiAgICAgKi9cbiAgICBoYW5kbGVVbmJhbkNsaWNrKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICBjb25zdCBpcCA9ICRidXR0b24uZGF0YSgnaXAnKTtcblxuICAgICAgICBpZiAoIWlwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gQ2FsbCBGaXJld2FsbEFQSSB0byB1bmJhbiBJUFxuICAgICAgICBGaXJld2FsbEFQSS51bmJhbklwKGlwLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBKdXN0IHJlbG9hZCBzZWN1cml0eSBkYXRhIC0gdGFibGUgd2lsbCB1cGRhdGUgdmlzdWFsbHlcbiAgICAgICAgICAgICAgICAvLyBSZWQgcm93IHdpbGwgYmVjb21lIGdyZWVuIHJvd1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IubG9hZFNlY3VyaXR5RGF0YSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IHNob3cgZXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gcmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICA6IHtlcnJvcjogWydGYWlsZWQgdG8gdW5iYW4gSVAnXX07XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTXNnKTtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIG9uIHBhZ2UgdW5sb2FkXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgdXBkYXRlIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudXBkYXRlVGltZXIpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVUaW1lciA9IG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoJ2V4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSBudWxsO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvcjtcbn0iXX0=