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
    } // Check if this is a new extension (not yet saved in database)
    // Check hidden field directly instead of using Semantic UI form API


    var $isNewField = $('#extensions-form input[name="_isNew"]');
    var isNew = $isNewField.length > 0 && $isNewField.val() === 'true'; // Skip status monitoring for new extensions

    if (isNew) {
      this.isInitialized = true;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCIkc2VjdXJpdHlUYWJsZSIsIiRub1NlY3VyaXR5RGF0YSIsInNlY3VyaXR5RGF0YSIsImJhbm5lZElwcyIsInVwZGF0ZVRpbWVyIiwiaW5pdGlhbGl6ZSIsIiRpc05ld0ZpZWxkIiwiJCIsImlzTmV3IiwibGVuZ3RoIiwidmFsIiwiZXh0cmFjdEV4dGVuc2lvbklkIiwiY2FjaGVFbGVtZW50cyIsInN1YnNjcmliZVRvRXZlbnRzIiwibG9hZEluaXRpYWxTdGF0dXMiLCJsb2FkU2VjdXJpdHlEYXRhIiwic3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyIiwiJG51bWJlckZpZWxkIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaW5wdXRtYXNrIiwiZSIsInJlcGxhY2UiLCJ1cmxNYXRjaCIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJtYXRjaCIsInNldFRpbWVvdXQiLCJTaXBBUEkiLCJnZXRTdGF0dXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cGRhdGVTdGF0dXMiLCJsb2FkSGlzdG9yaWNhbERhdGEiLCJnZXRIaXN0b3J5IiwiaGlzdG9yeSIsImRpc3BsYXlIaXN0b3JpY2FsRGF0YSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJzdGF0dXNlcyIsInN0YXR1c0RhdGEiLCJ1cGRhdGVTdGF0dXNMYWJlbCIsInN0YXR1cyIsInVwZGF0ZUFjdGl2ZURldmljZXMiLCJkZXZpY2VzIiwiY29sb3IiLCJnZXRDb2xvckZvclN0YXR1cyIsImxhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJleF9Ob0FjdGl2ZURldmljZXMiLCJkZXZpY2VzSHRtbCIsImZvckVhY2giLCJkZXZpY2UiLCJ1c2VyQWdlbnQiLCJ1c2VyX2FnZW50IiwiaXAiLCJjb250YWN0X2lwIiwicG9ydCIsImlwRGlzcGxheSIsInJ0dCIsInVuZGVmaW5lZCIsInRvRml4ZWQiLCJpZCIsImF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMiLCJmaW5kIiwib24iLCJwcmV2ZW50RGVmYXVsdCIsIiRsYWJlbCIsIiRpdGVtIiwiY2xvc2VzdCIsImRhdGFJZCIsInBhcnRzIiwic3BsaXQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ0aGVuIiwidHJhbnNpdGlvbiIsInBvcHVwIiwiY29udGVudCIsImV4X0lwQ29waWVkIiwicG9zaXRpb24iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCIkdGVtcCIsImFwcGVuZCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJyZW1vdmUiLCJjc3MiLCJoaXN0b3J5RGF0YSIsImV4X05vSGlzdG9yeUF2YWlsYWJsZSIsImRldmljZUdyb3VwcyIsImdyb3VwSGlzdG9yeUJ5RGV2aWNlIiwiaGlzdG9yeUh0bWwiLCJPYmplY3QiLCJlbnRyaWVzIiwiZGV2aWNlSW5kZXgiLCJkZXZpY2VLZXkiLCJzZXNzaW9ucyIsImRldmljZU5hbWUiLCJkZXZpY2VJUCIsImRldmljZUlkIiwidGltZWxpbmVIdG1sIiwiY3JlYXRlRGV2aWNlVGltZWxpbmUiLCJzZXNzaW9uIiwiaW5kZXgiLCJpc09ubGluZSIsImV2ZW50TGFiZWwiLCJldmVudF90eXBlIiwiZXhfRGV2aWNlRGlzY29ubmVjdGVkIiwiZXhfRGV2aWNlQ29ubmVjdGVkIiwicnR0TGFiZWwiLCJnZXRSdHRMYWJlbCIsImRhdGV0aW1lIiwiZm9ybWF0RGF0ZVRpbWUiLCJkYXRlIiwidGltZXN0YW1wIiwic3RhdHVzQ2xhc3MiLCJzdGF0dXNUaXRsZSIsImR1cmF0aW9uSHRtbCIsImV4X09ubGluZSIsImNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyIsImR1cmF0aW9uIiwiY2FsY3VsYXRlRHVyYXRpb24iLCJkdXJhdGlvblRleHQiLCJleF9PZmZsaW5lIiwiaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMiLCJncm91cHMiLCJlbnRyeSIsImlwX2FkZHJlc3MiLCJkZXRhaWxzIiwidHJpbSIsInB1c2giLCJrZXlzIiwia2V5Iiwic29ydCIsImEiLCJiIiwic29ydGVkR3JvdXBzIiwiYUxhdGVzdCIsImJMYXRlc3QiLCJzb3J0ZWRPYmplY3QiLCJ2YWx1ZSIsImN1cnJlbnRUaW1lc3RhbXAiLCJwcmV2aW91c1RpbWVzdGFtcCIsImRpZmYiLCJNYXRoIiwiYWJzIiwibWludXRlcyIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZm9ybWF0VGltZSIsImRhdGVTdHIiLCJpbmNsdWRlcyIsInRpbWVQYXJ0IiwiRGF0ZSIsInRvTG9jYWxlVGltZVN0cmluZyIsInRpbWUiLCJub3ciLCJpc1RvZGF5IiwidG9EYXRlU3RyaW5nIiwieWVzdGVyZGF5Iiwic2V0RGF0ZSIsImdldERhdGUiLCJpc1llc3RlcmRheSIsImxvY2FsZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZ2V0VXNlckxvY2FsZSIsInRpbWVTdHIiLCJob3VyIiwibWludXRlIiwic2Vjb25kIiwieWVzdGVyZGF5VGV4dCIsImV4X1llc3RlcmRheSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsImRheSIsIm1vbnRoIiwiY2xlYXJJbnRlcnZhbCIsInNldEludGVydmFsIiwidXBkYXRlT25saW5lRHVyYXRpb25zIiwiJGR1cmF0aW9ucyIsImVhY2giLCJlbGVtZW50IiwiJGVsZW1lbnQiLCJvbmxpbmVTaW5jZSIsInBhcnNlSW50IiwidGV4dCIsImRheUFnbyIsInJlY2VudFNlc3Npb25zIiwiZmlsdGVyIiwicyIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwic2VnbWVudERhdGEiLCJmaWxsIiwiY2hyb25vbG9naWNhbFNlc3Npb25zIiwicmV2ZXJzZSIsIm5leHRTZXNzaW9uIiwic3RhcnRUaW1lIiwiZW5kVGltZSIsInNlZ21lbnRJbmRleCIsInNlZ21lbnRXaWR0aCIsImJnQ29sb3IiLCJib3JkZXJMZWZ0Iiwic2VnbWVudFRpbWUiLCJzZWdtZW50RGF0ZSIsImhvdXJzTGFiZWwiLCJleF9Ib3Vyc19TaG9ydCIsImV4X05vdyIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJleHRlbnNpb24iLCJnZXRBdXRoRmFpbHVyZVN0YXRzIiwiRmlyZXdhbGxBUEkiLCJnZXRCYW5uZWRJcHMiLCJiYW5uZWRSZXNwb25zZSIsInJlbmRlclNlY3VyaXR5VGFibGUiLCJ0Ym9keSIsImVtcHR5IiwiZmFpbHVyZXMiLCJzdGF0cyIsImlzQmFubmVkIiwiaGFzT3duUHJvcGVydHkiLCJyb3dDbGFzcyIsImxhc3RBdHRlbXB0IiwibGFzdF9hdHRlbXB0IiwidG9Mb2NhbGVTdHJpbmciLCJhY3Rpb25CdXR0b24iLCJleF9TZWN1cml0eVVuYmFuIiwicm93IiwiY291bnQiLCJoYW5kbGVVbmJhbkNsaWNrIiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJ1bmJhbklwIiwiZXJyb3JNc2ciLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZGVzdHJveSIsInVuc3Vic2NyaWJlIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLDRCQUE0QixHQUFHO0FB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b1EsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCeFEsNEJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBFdmVudEJ1cywgU2lwQVBJLCBGaXJld2FsbEFQSSwgVXNlck1lc3NhZ2UsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogRXh0ZW5zaW9uIE1vZGlmeSBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxpZmllZCBzdGF0dXMgbW9uaXRvcmluZyBmb3IgZXh0ZW5zaW9uIG1vZGlmeSBwYWdlOlxuICogLSBTaW5nbGUgQVBJIGNhbGwgb24gaW5pdGlhbGl6YXRpb25cbiAqIC0gUmVhbC10aW1lIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIG9ubHlcbiAqIC0gTm8gcGVyaW9kaWMgcG9sbGluZ1xuICogLSBDbGVhbiBkZXZpY2UgbGlzdCBhbmQgaGlzdG9yeSBkaXNwbGF5XG4gKi9cbmNvbnN0IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3IgPSB7XG4gICAgY2hhbm5lbElkOiAnZXh0ZW5zaW9uLXN0YXR1cycsXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG4gICAgY3VycmVudEV4dGVuc2lvbklkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0xhYmVsOiBudWxsLFxuICAgICRhY3RpdmVEZXZpY2VzTGlzdDogbnVsbCxcbiAgICAkZGV2aWNlSGlzdG9yeUxpc3Q6IG51bGwsXG4gICAgJHNlY3VyaXR5VGFibGU6IG51bGwsXG4gICAgJG5vU2VjdXJpdHlEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogU2VjdXJpdHkgZGF0YVxuICAgICAqL1xuICAgIHNlY3VyaXR5RGF0YToge30sXG4gICAgYmFubmVkSXBzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBpbnRlcnZhbCB0aW1lclxuICAgICAqL1xuICAgIHVwZGF0ZVRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyBleHRlbnNpb24gKG5vdCB5ZXQgc2F2ZWQgaW4gZGF0YWJhc2UpXG4gICAgICAgIC8vIENoZWNrIGhpZGRlbiBmaWVsZCBkaXJlY3RseSBpbnN0ZWFkIG9mIHVzaW5nIFNlbWFudGljIFVJIGZvcm0gQVBJXG4gICAgICAgIGNvbnN0ICRpc05ld0ZpZWxkID0gJCgnI2V4dGVuc2lvbnMtZm9ybSBpbnB1dFtuYW1lPVwiX2lzTmV3XCJdJyk7XG4gICAgICAgIGNvbnN0IGlzTmV3ID0gJGlzTmV3RmllbGQubGVuZ3RoID4gMCAmJiAkaXNOZXdGaWVsZC52YWwoKSA9PT0gJ3RydWUnO1xuXG4gICAgICAgIC8vIFNraXAgc3RhdHVzIG1vbml0b3JpbmcgZm9yIG5ldyBleHRlbnNpb25zXG4gICAgICAgIGlmIChpc05ldykge1xuICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBleHRlbnNpb24gbnVtYmVyIGZyb20gZm9ybVxuICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IHRoaXMuZXh0cmFjdEV4dGVuc2lvbklkKCk7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcblxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcblxuICAgICAgICAvLyBNYWtlIHNpbmdsZSBpbml0aWFsIEFQSSBjYWxsXG4gICAgICAgIHRoaXMubG9hZEluaXRpYWxTdGF0dXMoKTtcblxuICAgICAgICAvLyBMb2FkIHNlY3VyaXR5IGRhdGFcbiAgICAgICAgdGhpcy5sb2FkU2VjdXJpdHlEYXRhKCk7XG5cbiAgICAgICAgLy8gU3RhcnQgdGltZXIgZm9yIHVwZGF0aW5nIG9ubGluZSBkdXJhdGlvbnNcbiAgICAgICAgdGhpcy5zdGFydER1cmF0aW9uVXBkYXRlVGltZXIoKTtcblxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXh0cmFjdCBleHRlbnNpb24gSUQgZnJvbSB0aGUgZm9ybVxuICAgICAqL1xuICAgIGV4dHJhY3RFeHRlbnNpb25JZCgpIHtcbiAgICAgICAgLy8gRmlyc3QsIHRyeSB0byBnZXQgdGhlIHBob25lIG51bWJlciBmcm9tIGZvcm0gZmllbGQgKHByaW1hcnkpXG4gICAgICAgIGNvbnN0ICRudW1iZXJGaWVsZCA9ICQoJ2lucHV0W25hbWU9XCJudW1iZXJcIl0nKTtcbiAgICAgICAgaWYgKCRudW1iZXJGaWVsZC5sZW5ndGggJiYgJG51bWJlckZpZWxkLnZhbCgpKSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHVubWFza2VkIHZhbHVlIGlmIGlucHV0bWFzayBpcyBhcHBsaWVkXG4gICAgICAgICAgICBsZXQgZXh0ZW5zaW9uTnVtYmVyO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpbnB1dG1hc2sgaXMgYXZhaWxhYmxlIGFuZCBhcHBsaWVkIHRvIHRoZSBmaWVsZFxuICAgICAgICAgICAgaWYgKHR5cGVvZiAkbnVtYmVyRmllbGQuaW5wdXRtYXNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IHVubWFza2VkIHZhbHVlIChvbmx5IHRoZSBhY3R1YWwgaW5wdXQgd2l0aG91dCBtYXNrIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC5pbnB1dG1hc2soJ3VubWFza2VkdmFsdWUnKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGlmIGlucHV0bWFzayBtZXRob2QgZmFpbHNcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhbiB1cCB0aGUgdmFsdWUgLSByZW1vdmUgYW55IHJlbWFpbmluZyBtYXNrIGNoYXJhY3RlcnMgbGlrZSB1bmRlcnNjb3JlXG4gICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSBleHRlbnNpb25OdW1iZXIucmVwbGFjZSgvW14wLTldL2csICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSByZXR1cm4gaWYgd2UgaGF2ZSBhY3R1YWwgZGlnaXRzXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTnVtYmVyICYmIGV4dGVuc2lvbk51bWJlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV4dGVuc2lvbk51bWJlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gVVJMIHBhcmFtZXRlclxuICAgICAgICBjb25zdCB1cmxNYXRjaCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5tYXRjaCgvXFwvZXh0ZW5zaW9uc1xcL21vZGlmeVxcLyhcXGQrKS8pO1xuICAgICAgICBpZiAodXJsTWF0Y2ggJiYgdXJsTWF0Y2hbMV0pIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgZGF0YWJhc2UgSUQsIHdlIG5lZWQgdG8gd2FpdCBmb3IgZm9ybSB0byBsb2FkXG4gICAgICAgICAgICAvLyBXZSdsbCBnZXQgdGhlIGFjdHVhbCBleHRlbnNpb24gbnVtYmVyIGFmdGVyIGZvcm0gbG9hZHNcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0xhYmVsID0gJCgnI3N0YXR1cycpO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdCA9ICQoJyNhY3RpdmUtZGV2aWNlcy1saXN0Jyk7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0ID0gJCgnI2RldmljZS1oaXN0b3J5LWxpc3QnKTtcbiAgICAgICAgdGhpcy4kc2VjdXJpdHlUYWJsZSA9ICQoJyNzZWN1cml0eS1mYWlsZWQtYXV0aC10YWJsZScpO1xuICAgICAgICB0aGlzLiRub1NlY3VyaXR5RGF0YSA9ICQoJyNuby1zZWN1cml0eS1kYXRhJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGluaXRpYWwgc3RhdHVzIHdpdGggc2luZ2xlIEFQSSBjYWxsXG4gICAgICovXG4gICAgbG9hZEluaXRpYWxTdGF0dXMoKSB7XG4gICAgICAgIC8vIFJlLWNoZWNrIGV4dGVuc2lvbiBJRCBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgYWdhaW4gYWZ0ZXIgZGVsYXkgKGZvcm0gbWlnaHQgc3RpbGwgYmUgbG9hZGluZylcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMubG9hZEluaXRpYWxTdGF0dXMoKSwgNTAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIHNpbmdsZSBBUEkgY2FsbCBmb3IgY3VycmVudCBzdGF0dXNcbiAgICAgICAgU2lwQVBJLmdldFN0YXR1cyh0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHNvIGxvYWQgaGlzdG9yaWNhbCBkYXRhXG4gICAgICAgIHRoaXMubG9hZEhpc3RvcmljYWxEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGhpc3RvcmljYWwgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRIaXN0b3JpY2FsRGF0YSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggaGlzdG9yeSBmcm9tIEFQSVxuICAgICAgICBTaXBBUEkuZ2V0SGlzdG9yeSh0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5oaXN0b3J5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kaXNwbGF5SGlzdG9yaWNhbERhdGEocmVzcG9uc2UuZGF0YS5oaXN0b3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ2V4dGVuc2lvbi1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWZyZXNoIHNlY3VyaXR5IGRhdGEgb24gY29uZmlnIGNoYW5nZXNcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5sb2FkU2VjdXJpdHlEYXRhKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRCdXMgbm93IHNlbmRzIGRhdGEgZGlyZWN0bHkgd2l0aG91dCBkb3VibGUgbmVzdGluZ1xuICAgICAgICBjb25zdCBkYXRhID0gbWVzc2FnZTtcbiAgICAgICAgaWYgKGRhdGEuc3RhdHVzZXMgJiYgZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKGRhdGEuc3RhdHVzZXNbdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWRdKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBkaXNwbGF5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNMYWJlbChzdGF0dXNEYXRhLnN0YXR1cyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIGRldmljZXNcbiAgICAgICAgdGhpcy51cGRhdGVBY3RpdmVEZXZpY2VzKHN0YXR1c0RhdGEuZGV2aWNlcyB8fCBbXSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEb24ndCBhZGQgdG8gaGlzdG9yeSAtIGhpc3RvcnkgaXMgbG9hZGVkIGZyb20gQVBJIG9ubHlcbiAgICAgICAgLy8gdGhpcy5hZGRUb0hpc3Rvcnkoc3RhdHVzRGF0YSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGxhYmVsXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGFiZWwoc3RhdHVzKSB7XG4gICAgICAgIGlmICghdGhpcy4kc3RhdHVzTGFiZWwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLmdldENvbG9yRm9yU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgIGNvbnN0IGxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlW2BleF9TdGF0dXMke3N0YXR1c31gXSB8fCBzdGF0dXM7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBjbGFzcyBhbmQgdXBkYXRlIGNvbnRlbnRcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWxcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSBncmVlbiByZWQgeWVsbG93IGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKGNvbG9yKVxuICAgICAgICAgICAgLmh0bWwoYCR7bGFiZWx9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgZm9yIHN0YXR1cyB2YWx1ZVxuICAgICAqL1xuICAgIGdldENvbG9yRm9yU3RhdHVzKHN0YXR1cykge1xuICAgICAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnQXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuJztcbiAgICAgICAgICAgIGNhc2UgJ1VuYXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgY2FzZSAnRGlzYWJsZWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhY3RpdmUgZGV2aWNlcyBsaXN0XG4gICAgICovXG4gICAgdXBkYXRlQWN0aXZlRGV2aWNlcyhkZXZpY2VzKSB7XG4gICAgICAgIGlmICghdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgfHwgIUFycmF5LmlzQXJyYXkoZGV2aWNlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChkZXZpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuaHRtbChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRlc2t0b3AgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vQWN0aXZlRGV2aWNlc31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGxpc3Qgd2l0aCB0ZWFsIGxhYmVscyBsaWtlIHRoZSBvbGQgZW5kcG9pbnQtbGlzdFxuICAgICAgICBsZXQgZGV2aWNlc0h0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICBcbiAgICAgICAgZGV2aWNlcy5mb3JFYWNoKChkZXZpY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJBZ2VudCA9IGRldmljZS51c2VyX2FnZW50IHx8ICdVbmtub3duJztcbiAgICAgICAgICAgIGNvbnN0IGlwID0gZGV2aWNlLmlwIHx8IGRldmljZS5jb250YWN0X2lwIHx8ICctJztcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBkZXZpY2UucG9ydCB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlwRGlzcGxheSA9IHBvcnQgPyBgJHtpcH06JHtwb3J0fWAgOiBpcDtcbiAgICAgICAgICAgIGNvbnN0IHJ0dCA9IGRldmljZS5ydHQgIT09IG51bGwgJiYgZGV2aWNlLnJ0dCAhPT0gdW5kZWZpbmVkIFxuICAgICAgICAgICAgICAgID8gYCAoJHtkZXZpY2UucnR0LnRvRml4ZWQoMil9IG1zKWAgXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGlkID0gYCR7dXNlckFnZW50fXwke2lwfWA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRldmljZXNIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtaWQ9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGVhbCBsYWJlbFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt1c2VyQWdlbnR9XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGV0YWlsXCI+JHtpcERpc3BsYXl9JHtydHR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzSHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuaHRtbChkZXZpY2VzSHRtbCk7XG5cbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gY29weSBJUCBhZGRyZXNzXG4gICAgICAgIHRoaXMuYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBdHRhY2ggY2xpY2sgaGFuZGxlcnMgdG8gZGV2aWNlIGxhYmVscyBmb3IgSVAgY29weWluZ1xuICAgICAqL1xuICAgIGF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMoKSB7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0LmZpbmQoJy5pdGVtIC51aS5sYWJlbCcpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpdGVtID0gJGxhYmVsLmNsb3Nlc3QoJy5pdGVtJyk7XG4gICAgICAgICAgICBjb25zdCBkYXRhSWQgPSAkaXRlbS5kYXRhKCdpZCcpO1xuXG4gICAgICAgICAgICBpZiAoIWRhdGFJZCkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IElQIGZyb20gZGF0YS1pZCAoZm9ybWF0OiBcIlVzZXJBZ2VudHxJUFwiKVxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBkYXRhSWQuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IGlwID0gcGFydHNbMV07XG5cbiAgICAgICAgICAgIGlmICghaXAgfHwgaXAgPT09ICctJykgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBDb3B5IHRvIGNsaXBib2FyZCB1c2luZyB0aGUgc2FtZSBtZXRob2QgYXMgcGFzc3dvcmQgd2lkZ2V0XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yLmNsaXBib2FyZCAmJiBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCkge1xuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGlwKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IGNoYW5nZSB0aGUgbGFiZWwgY29sb3IgdG8gaW5kaWNhdGUgc3VjY2Vzc1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ3RlYWwnKS5hZGRDbGFzcygnZ3JlZW4nKTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3RlYWwnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBwb3B1cCBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfSXBDb3BpZWR9OiAke2lwfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInXG4gICAgICAgICAgICAgICAgICAgIH0pLnBvcHVwKCdzaG93Jyk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbGFiZWwucG9wdXAoJ2hpZGUnKS5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY29weSBJUDonLCBlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICBjb25zdCAkdGVtcCA9ICQoJzxpbnB1dD4nKTtcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKCR0ZW1wKTtcbiAgICAgICAgICAgICAgICAkdGVtcC52YWwoaXApLnNlbGVjdCgpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKCdjb3B5Jyk7XG4gICAgICAgICAgICAgICAgJHRlbXAucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IGZlZWRiYWNrXG4gICAgICAgICAgICAgICAgJGxhYmVsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCd0ZWFsJykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygndGVhbCcpO1xuICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY3Vyc29yIHBvaW50ZXIgc3R5bGVcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuZmluZCgnLml0ZW0gLnVpLmxhYmVsJykuY3NzKCdjdXJzb3InLCAncG9pbnRlcicpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJIHdpdGggZGV2aWNlIGdyb3VwaW5nXG4gICAgICovXG4gICAgZGlzcGxheUhpc3RvcmljYWxEYXRhKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGlmICghdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgfHwgIUFycmF5LmlzQXJyYXkoaGlzdG9yeURhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaGlzdG9yeURhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaGlzdG9yeSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9IaXN0b3J5QXZhaWxhYmxlfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR3JvdXAgaGlzdG9yeSBieSBkZXZpY2VcbiAgICAgICAgY29uc3QgZGV2aWNlR3JvdXBzID0gdGhpcy5ncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSk7XG5cbiAgICAgICAgLy8gQnVpbGQgSFRNTCBmb3IgZ3JvdXBlZCBkaXNwbGF5IC0gc2ltcGxpZmllZCBzdHJ1Y3R1cmVcbiAgICAgICAgbGV0IGhpc3RvcnlIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVkIGxpc3RcIj4nO1xuXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGRldmljZUdyb3VwcykuZm9yRWFjaCgoW2RldmljZUtleSwgc2Vzc2lvbnNdLCBkZXZpY2VJbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgW3VzZXJBZ2VudCwgaXBdID0gZGV2aWNlS2V5LnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VOYW1lID0gdXNlckFnZW50IHx8ICdVbmtub3duIERldmljZSc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJUCA9IChpcCAmJiBpcCAhPT0gJ1Vua25vd24nKSA/IGlwIDogJyc7XG4gICAgICAgICAgICBjb25zdCBkZXZpY2VJZCA9IGBkZXZpY2UtJHtkZXZpY2VJbmRleH1gO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGltZWxpbmUgSFRNTCBmb3IgdGhpcyBkZXZpY2VcbiAgICAgICAgICAgIGNvbnN0IHRpbWVsaW5lSHRtbCA9IHRoaXMuY3JlYXRlRGV2aWNlVGltZWxpbmUoc2Vzc2lvbnMsIGRldmljZUlkKTtcblxuICAgICAgICAgICAgLy8gRGV2aWNlIGhlYWRlciAtIGV4YWN0bHkgYXMgcmVxdWVzdGVkXG4gICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIm1vYmlsZSBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZU5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlSVAgPyBgPHNwYW4gc3R5bGU9XCJjb2xvcjogZ3JleTsgZm9udC1zaXplOjAuN2VtO1wiPiR7ZGV2aWNlSVB9PC8+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RpbWVsaW5lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2Vzc2lvbnMgdGltZWxpbmUgLSBzaW1wbGlmaWVkXG4gICAgICAgICAgICBzZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGV2ZW50IHR5cGUgdG8gZGV0ZXJtaW5lIGFjdHVhbCBkZXZpY2Ugc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IGlzT25saW5lID0gc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnO1xuICAgICAgICAgICAgICAgIGxldCBldmVudExhYmVsID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGV2aWNlLXNwZWNpZmljIGV2ZW50c1xuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlRGlzY29ubmVjdGVkfWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfYWRkZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzT25saW5lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlQ29ubmVjdGVkfWA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSB0aGlzLmdldFJ0dExhYmVsKHNlc3Npb24ucnR0KTtcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZGF0ZXRpbWUgd2l0aCBkYXRlIGFuZCB0aW1lXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZXRpbWUgPSB0aGlzLmZvcm1hdERhdGVUaW1lKHNlc3Npb24uZGF0ZSB8fCBzZXNzaW9uLnRpbWVzdGFtcCk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgY2lyY3VsYXIgbGFiZWxzIGxpa2UgaW4gZXh0ZW5zaW9ucyBsaXN0XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBpc09ubGluZSA/ICdncmVlbicgOiAnZ3JleSc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGl0bGUgPSBpc09ubGluZSA/ICdPbmxpbmUnIDogJ09mZmxpbmUnO1xuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uSHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgZmlyc3QgKG1vc3QgcmVjZW50KSBlbnRyeSB0aGF0IGlzIG9ubGluZSwgYWRkIGxpdmUgZHVyYXRpb25cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDAgJiYgaXNPbmxpbmUgJiYgc2Vzc2lvbi5ldmVudF90eXBlICE9PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkYXRhIGF0dHJpYnV0ZSB3aXRoIHRpbWVzdGFtcCBmb3IgbGl2ZSB1cGRhdGluZ1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkh0bWwgPSBgPHNwYW4gY2xhc3M9XCJ1aSBncmV5IHRleHQgb25saW5lLWR1cmF0aW9uXCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLW9ubGluZS1zaW5jZT1cIiR7c2Vzc2lvbi50aW1lc3RhbXB9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7dGhpcy5jYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3coc2Vzc2lvbi50aW1lc3RhbXApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBzdGF0aWMgZHVyYXRpb24gZm9yIGhpc3RvcmljYWwgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb24oc2Vzc2lvbi50aW1lc3RhbXAsIHNlc3Npb25zW2luZGV4IC0gMV0/LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcm1hdCBkdXJhdGlvbiB3aXRoIHRyYW5zbGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uVGV4dCA9IGR1cmF0aW9uICYmIGlzT25saW5lXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmV9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25IdG1sID0gYDxzcGFuIGNsYXNzPVwidWkgZ3JleSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPiR7ZHVyYXRpb25UZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgdGV4dFwiIHN0eWxlPVwibWFyZ2luOiA2cHggMjBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NsYXNzfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDhweDsgaGVpZ2h0OiA4cHg7IG1pbi1oZWlnaHQ6IDhweDsgbWFyZ2luLXJpZ2h0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke3N0YXR1c1RpdGxlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2RhdGV0aW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtydHRMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZHVyYXRpb25IdG1sIHx8IGV2ZW50TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaGlzdG9yeUh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoaGlzdG9yeUh0bWwpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZWxpbmUgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGltZWxpbmVUb29sdGlwcygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgaGlzdG9yeSBldmVudHMgYnkgZGV2aWNlIGFuZCBzb3J0IGJ5IGxhc3QgZXZlbnRcbiAgICAgKi9cbiAgICBncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSkge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcblxuICAgICAgICBoaXN0b3J5RGF0YS5mb3JFYWNoKGVudHJ5ID0+IHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBkZXZpY2Uga2V5IGZyb20gdXNlcl9hZ2VudCBhbmQgSVBcbiAgICAgICAgICAgIGxldCBkZXZpY2VLZXkgPSAnVW5rbm93bnxVbmtub3duJztcblxuICAgICAgICAgICAgaWYgKGVudHJ5LnVzZXJfYWdlbnQgfHwgZW50cnkuaXBfYWRkcmVzcykge1xuICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke2VudHJ5LnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nfXwke2VudHJ5LmlwX2FkZHJlc3MgfHwgJ1Vua25vd24nfWA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmRldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBkZXZpY2UgaW5mbyBmcm9tIGRldGFpbHNcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IGVudHJ5LmRldGFpbHMubWF0Y2goLyhbXFx3XFxzLl0rKVxccyotXFxzKihbXFxkLl0rKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHttYXRjaFsxXS50cmltKCl9fCR7bWF0Y2hbMl0udHJpbSgpfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1tkZXZpY2VLZXldKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0gPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0ucHVzaChlbnRyeSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNvcnQgc2Vzc2lvbnMgd2l0aGluIGVhY2ggZ3JvdXAgYnkgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpXG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgZ3JvdXBzW2tleV0uc29ydCgoYSwgYikgPT4gYi50aW1lc3RhbXAgLSBhLnRpbWVzdGFtcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgdG8gYXJyYXkgYW5kIHNvcnQgYnkgbW9zdCByZWNlbnQgZXZlbnRcbiAgICAgICAgY29uc3Qgc29ydGVkR3JvdXBzID0gT2JqZWN0LmVudHJpZXMoZ3JvdXBzKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIG1vc3QgcmVjZW50IHRpbWVzdGFtcCBmcm9tIGVhY2ggZ3JvdXAgKGZpcnN0IGVsZW1lbnQgc2luY2UgYWxyZWFkeSBzb3J0ZWQpXG4gICAgICAgICAgICAgICAgY29uc3QgYUxhdGVzdCA9IGFbMV1bMF0/LnRpbWVzdGFtcCB8fCAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJMYXRlc3QgPSBiWzFdWzBdPy50aW1lc3RhbXAgfHwgMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYkxhdGVzdCAtIGFMYXRlc3Q7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGJhY2sgdG8gb2JqZWN0IHdpdGggc29ydGVkIGtleXNcbiAgICAgICAgY29uc3Qgc29ydGVkT2JqZWN0ID0ge307XG4gICAgICAgIHNvcnRlZEdyb3Vwcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIHNvcnRlZE9iamVjdFtrZXldID0gdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWRPYmplY3Q7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZHVyYXRpb24gYmV0d2VlbiB0d28gdGltZXN0YW1wc1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZUR1cmF0aW9uKGN1cnJlbnRUaW1lc3RhbXAsIHByZXZpb3VzVGltZXN0YW1wKSB7XG4gICAgICAgIGlmICghcHJldmlvdXNUaW1lc3RhbXApIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGlmZiA9IE1hdGguYWJzKHByZXZpb3VzVGltZXN0YW1wIC0gY3VycmVudFRpbWVzdGFtcCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9ZCAke2hvdXJzICUgMjR9aGA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9aCAke21pbnV0ZXMgJSA2MH1tYDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9bWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGlmZn1zYDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWUgZm9yIGRpc3BsYXlcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKGRhdGVTdHIpIHtcbiAgICAgICAgaWYgKCFkYXRlU3RyKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBpdCdzIGFscmVhZHkgYSBmb3JtYXR0ZWQgZGF0ZSBzdHJpbmcgbGlrZSBcIjIwMjUtMDktMTEgMTE6MzA6MzZcIlxuICAgICAgICBpZiAodHlwZW9mIGRhdGVTdHIgPT09ICdzdHJpbmcnICYmIGRhdGVTdHIuaW5jbHVkZXMoJyAnKSkge1xuICAgICAgICAgICAgY29uc3QgdGltZVBhcnQgPSBkYXRlU3RyLnNwbGl0KCcgJylbMV07XG4gICAgICAgICAgICByZXR1cm4gdGltZVBhcnQgfHwgZGF0ZVN0cjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhIHRpbWVzdGFtcFxuICAgICAgICBpZiAodHlwZW9mIGRhdGVTdHIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0ciAqIDEwMDApO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYXRlU3RyO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IFJUVCBsYWJlbCB3aXRoIGNvbG9yIGNvZGluZ1xuICAgICAqL1xuICAgIGdldFJ0dExhYmVsKHJ0dCkge1xuICAgICAgICBpZiAocnR0ID09PSBudWxsIHx8IHJ0dCA9PT0gdW5kZWZpbmVkIHx8IHJ0dCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICBpZiAocnR0ID4gMTUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdyZWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHJ0dCA+IDUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdvbGl2ZSc7ICAvLyB5ZWxsb3cgY2FuIGJlIGhhcmQgdG8gc2VlLCBvbGl2ZSBpcyBiZXR0ZXJcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ1aSAke2NvbG9yfSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPltSVFQ6ICR7cnR0LnRvRml4ZWQoMCl9bXNdPC9zcGFuPmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkYXRldGltZSB3aXRoIGRhdGUgYW5kIHRpbWUgdXNpbmcgaW50ZXJmYWNlIGxhbmd1YWdlXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZSkge1xuICAgICAgICBpZiAoIXRpbWUpIHJldHVybiAnLS06LS0nO1xuXG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0eXBlb2YgdGltZSA9PT0gJ3N0cmluZycgPyB0aW1lIDogdGltZSAqIDEwMDApO1xuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgdG9kYXlcbiAgICAgICAgY29uc3QgaXNUb2RheSA9IGRhdGUudG9EYXRlU3RyaW5nKCkgPT09IG5vdy50b0RhdGVTdHJpbmcoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIHllc3RlcmRheVxuICAgICAgICBjb25zdCB5ZXN0ZXJkYXkgPSBuZXcgRGF0ZShub3cpO1xuICAgICAgICB5ZXN0ZXJkYXkuc2V0RGF0ZSh5ZXN0ZXJkYXkuZ2V0RGF0ZSgpIC0gMSk7XG4gICAgICAgIGNvbnN0IGlzWWVzdGVyZGF5ID0gZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0geWVzdGVyZGF5LnRvRGF0ZVN0cmluZygpO1xuXG4gICAgICAgIGNvbnN0IGxvY2FsZSA9IFNlbWFudGljTG9jYWxpemF0aW9uLmdldFVzZXJMb2NhbGUoKTtcbiAgICAgICAgY29uc3QgdGltZVN0ciA9IGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKGxvY2FsZSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcsIHNlY29uZDogJzItZGlnaXQnfSk7XG5cbiAgICAgICAgaWYgKGlzVG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aW1lU3RyO1xuICAgICAgICB9IGVsc2UgaWYgKGlzWWVzdGVyZGF5KSB7XG4gICAgICAgICAgICAvLyBVc2UgdHJhbnNsYXRpb24gZm9yIFwiWWVzdGVyZGF5XCIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBjb25zdCB5ZXN0ZXJkYXlUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X1llc3RlcmRheTtcbiAgICAgICAgICAgIHJldHVybiBgJHt5ZXN0ZXJkYXlUZXh0fSAke3RpbWVTdHJ9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBkYXRlIGFjY29yZGluZyB0byBsb2NhbGVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyhsb2NhbGUsIHtkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICcyLWRpZ2l0J30pO1xuICAgICAgICAgICAgcmV0dXJuIGAke2RhdGVTdHJ9ICR7dGltZVN0cn1gO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkdXJhdGlvbiBmcm9tIHRpbWVzdGFtcCB0byBub3dcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3codGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkaWZmID0gbm93IC0gdGltZXN0YW1wO1xuXG4gICAgICAgIGlmIChkaWZmIDwgMCkgcmV0dXJuICcwcyc7XG5cbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGhvdXJzIC8gMjQpO1xuXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9ZCAke2hvdXJzICUgMjR9aGA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9aCAke21pbnV0ZXMgJSA2MH1tYDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9bWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGlmZn1zYDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCB0aW1lciB0byB1cGRhdGUgb25saW5lIGR1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lcigpIHtcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudXBkYXRlVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGV2ZXJ5IDEwIHNlY29uZHNcbiAgICAgICAgdGhpcy51cGRhdGVUaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT25saW5lRHVyYXRpb25zKCk7XG4gICAgICAgIH0sIDEwMDAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBvbmxpbmUgZHVyYXRpb24gZGlzcGxheXNcbiAgICAgKi9cbiAgICB1cGRhdGVPbmxpbmVEdXJhdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbnMgPSB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdD8uZmluZCgnLm9ubGluZS1kdXJhdGlvbltkYXRhLW9ubGluZS1zaW5jZV0nKTtcbiAgICAgICAgaWYgKCEkZHVyYXRpb25zIHx8ICRkdXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkZHVyYXRpb25zLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBvbmxpbmVTaW5jZSA9IHBhcnNlSW50KCRlbGVtZW50LmRhdGEoJ29ubGluZS1zaW5jZScpLCAxMCk7XG4gICAgICAgICAgICBpZiAob25saW5lU2luY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KG9ubGluZVNpbmNlKTtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC50ZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7ZHVyYXRpb259YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGltZWxpbmUgdmlzdWFsaXphdGlvbiBmb3IgYSBkZXZpY2UncyBoaXN0b3J5XG4gICAgICogQHBhcmFtIHtBcnJheX0gc2Vzc2lvbnMgLSBBcnJheSBvZiBzZXNzaW9uIGV2ZW50cyBmb3IgdGhlIGRldmljZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkZXZpY2VJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgZGV2aWNlXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCBmb3IgdGhlIHRpbWVsaW5lXG4gICAgICovXG4gICAgY3JlYXRlRGV2aWNlVGltZWxpbmUoc2Vzc2lvbnMsIGRldmljZUlkKSB7XG4gICAgICAgIGlmICghc2Vzc2lvbnMgfHwgc2Vzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGltZSByYW5nZSAobGFzdCAyNCBob3VycylcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuXG4gICAgICAgIC8vIEZpbHRlciBzZXNzaW9ucyB3aXRoaW4gbGFzdCAyNCBob3VycyAoc2Vzc2lvbnMgYXJlIHNvcnRlZCBuZXdlc3QgZmlyc3QpXG4gICAgICAgIGNvbnN0IHJlY2VudFNlc3Npb25zID0gc2Vzc2lvbnMuZmlsdGVyKHMgPT4gcy50aW1lc3RhbXAgPj0gZGF5QWdvKTtcbiAgICAgICAgaWYgKHJlY2VudFNlc3Npb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBObyByZWNlbnQgYWN0aXZpdHlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aW1lbGluZSBzZWdtZW50cyAoOTYgc2VnbWVudHMgZm9yIDI0IGhvdXJzLCAxNSBtaW51dGVzIGVhY2gpXG4gICAgICAgIGNvbnN0IHNlZ21lbnREdXJhdGlvbiA9IDE1ICogNjA7IC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZWdtZW50cyA9IDk2O1xuICAgICAgICBjb25zdCBzZWdtZW50RGF0YSA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbCgnZ3JleScpO1xuXG4gICAgICAgIC8vIFJldmVyc2Ugc2Vzc2lvbnMgdG8gcHJvY2VzcyBmcm9tIG9sZGVzdCB0byBuZXdlc3RcbiAgICAgICAgY29uc3QgY2hyb25vbG9naWNhbFNlc3Npb25zID0gWy4uLnJlY2VudFNlc3Npb25zXS5yZXZlcnNlKCk7XG5cbiAgICAgICAgLy8gUHJvY2VzcyBzZXNzaW9ucyB0byBmaWxsIHNlZ21lbnRzXG4gICAgICAgIGNocm9ub2xvZ2ljYWxTZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dFNlc3Npb24gPSBjaHJvbm9sb2dpY2FsU2Vzc2lvbnNbaW5kZXggKyAxXTsgLy8gTmV4dCBldmVudCBpbiB0aW1lXG4gICAgICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBzZXNzaW9uLnRpbWVzdGFtcDtcbiAgICAgICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXh0U2Vzc2lvbiA/IG5leHRTZXNzaW9uLnRpbWVzdGFtcCA6IG5vdztcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHN0YXR1cyBjb2xvciBiYXNlZCBvbiBldmVudCB0eXBlIGFuZCBzdGF0dXNcbiAgICAgICAgICAgIGxldCBjb2xvciA9ICdncmV5JztcblxuICAgICAgICAgICAgLy8gQ2hlY2sgZXZlbnQgdHlwZSBmaXJzdFxuICAgICAgICAgICAgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9hZGRlZCcgfHwgc2Vzc2lvbi5ldmVudF90eXBlID09PSAnc3RhdHVzX2NoYW5nZScpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXZpY2UgY2FtZSBvbmxpbmVcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xvciA9ICdncmV5JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgIC8vIERldmljZSB3ZW50IG9mZmxpbmUgLSBzZWdtZW50cyBBRlRFUiB0aGlzIGV2ZW50IHNob3VsZCBiZSBncmV5XG4gICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JleSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgdG8gYXZhaWxhYmxlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmlsbCBzZWdtZW50cyBmb3IgdGhpcyBzZXNzaW9uIHBlcmlvZFxuICAgICAgICAgICAgZm9yIChsZXQgdGltZSA9IHN0YXJ0VGltZTsgdGltZSA8IGVuZFRpbWUgJiYgdGltZSA8PSBub3c7IHRpbWUgKz0gc2VnbWVudER1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEluZGV4ID0gTWF0aC5mbG9vcigodGltZSAtIGRheUFnbykgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgICAgIGlmIChzZWdtZW50SW5kZXggPj0gMCAmJiBzZWdtZW50SW5kZXggPCBzZWdtZW50cykge1xuICAgICAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdID0gY29sb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCB0aW1lbGluZSBIVE1MXG4gICAgICAgIGxldCB0aW1lbGluZUh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGV2aWNlLXRpbWVsaW5lXCIgc3R5bGU9XCJtYXJnaW46IDEwcHggMDtcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTJweDsgYmFja2dyb3VuZDogI2YzZjRmNTsgYm9yZGVyLXJhZGl1czogM3B4OyBvdmVyZmxvdzogaGlkZGVuO1wiPlxuICAgICAgICBgO1xuXG4gICAgICAgIHNlZ21lbnREYXRhLmZvckVhY2goKGNvbG9yLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VnbWVudFdpZHRoID0gMTAwIC8gc2VnbWVudHM7XG4gICAgICAgICAgICBjb25zdCBiZ0NvbG9yID0gY29sb3IgPT09ICdncmVlbicgPyAnIzIxYmE0NScgOiAnI2U4ZThlOCc7XG4gICAgICAgICAgICBjb25zdCBib3JkZXJMZWZ0ID0gaW5kZXggPiAwID8gJzFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LDAuMiknIDogJ25vbmUnO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBmb3IgdGhpcyBzZWdtZW50XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50VGltZSA9IGRheUFnbyArIChpbmRleCAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50RGF0ZSA9IG5ldyBEYXRlKHNlZ21lbnRUaW1lICogMTAwMCk7XG5cbiAgICAgICAgICAgIC8vIEdldCB1c2VyJ3MgbG9jYWxlXG4gICAgICAgICAgICBjb25zdCBsb2NhbGUgPSBTZW1hbnRpY0xvY2FsaXphdGlvbi5nZXRVc2VyTG9jYWxlKCk7XG4gICAgICAgICAgICBjb25zdCB0aW1lU3RyID0gc2VnbWVudERhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKGxvY2FsZSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KTtcblxuICAgICAgICAgICAgdGltZWxpbmVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwid2lkdGg6ICR7c2VnbWVudFdpZHRofSU7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZC1jb2xvcjogJHtiZ0NvbG9yfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IGJvcmRlci1sZWZ0OiAke2JvcmRlckxlZnR9O1wiXG4gICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7dGltZVN0cn0gLSAke2NvbG9yID09PSAnZ3JlZW4nID8gJ09ubGluZScgOiAnT2ZmbGluZSd9XCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaW1lIGxhYmVscyB3aXRoIGxvY2FsaXphdGlvblxuICAgICAgICBjb25zdCBob3Vyc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0hvdXJzX1Nob3J0O1xuXG4gICAgICAgIHRpbWVsaW5lSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgbWFyZ2luLXRvcDogMnB4OyBmb250LXNpemU6IDEwcHg7IGNvbG9yOiAjOTk5O1wiPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4yNCR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjE4JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MTIke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj42JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTm93fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuXG4gICAgICAgIHJldHVybiB0aW1lbGluZUh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdG9vbHRpcHMgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9tYW50aWMgVUkgdG9vbHRpcHMgZm9yIHRpbWVsaW5lIHNlZ21lbnRzXG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Py5maW5kKCcuZGV2aWNlLXRpbWVsaW5lIFt0aXRsZV0nKS5wb3B1cCh7XG4gICAgICAgICAgICB2YXJpYXRpb246ICdtaW5pJyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXV0aGVudGljYXRpb24gZmFpbHVyZSBzdGF0aXN0aWNzIGFuZCBiYW5uZWQgSVBzXG4gICAgICovXG4gICAgbG9hZFNlY3VyaXR5RGF0YSgpIHtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQ7XG5cbiAgICAgICAgaWYgKCFleHRlbnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGF1dGggZmFpbHVyZXMgdmlhIFNpcEFQSVxuICAgICAgICBTaXBBUEkuZ2V0QXV0aEZhaWx1cmVTdGF0cyhleHRlbnNpb24sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VjdXJpdHlEYXRhID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN1cml0eURhdGEgPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggYmFubmVkIElQcyB2aWEgRmlyZXdhbGxBUElcbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcygoYmFubmVkUmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmFubmVkUmVzcG9uc2UgJiYgYmFubmVkUmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmFubmVkSXBzID0gYmFubmVkUmVzcG9uc2UuZGF0YSB8fCB7fTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhbm5lZElwcyA9IHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgY29tYmluZWQgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyU2VjdXJpdHlUYWJsZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc2VjdXJpdHkgdGFibGUgd2l0aCBjb2xvci1jb2RlZCByb3dzXG4gICAgICogUmVkIHJvdyA9IGJhbm5lZCBJUCwgR3JlZW4gcm93ID0gbm90IGJhbm5lZFxuICAgICAqL1xuICAgIHJlbmRlclNlY3VyaXR5VGFibGUoKSB7XG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy4kc2VjdXJpdHlUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICB0Ym9keS5lbXB0eSgpO1xuXG4gICAgICAgIGNvbnN0IGZhaWx1cmVzID0gdGhpcy5zZWN1cml0eURhdGE7XG5cbiAgICAgICAgaWYgKCFmYWlsdXJlcyB8fCBPYmplY3Qua2V5cyhmYWlsdXJlcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmhpZGUoKTtcbiAgICAgICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhLnNob3coKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuc2hvdygpO1xuICAgICAgICB0aGlzLiRub1NlY3VyaXR5RGF0YS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGZhaWxlZCBhdXRoIElQc1xuICAgICAgICBPYmplY3QuZW50cmllcyhmYWlsdXJlcykuZm9yRWFjaCgoW2lwLCBzdGF0c10pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzQmFubmVkID0gdGhpcy5iYW5uZWRJcHMuaGFzT3duUHJvcGVydHkoaXApO1xuXG4gICAgICAgICAgICAvLyBVc2UgRm9tYW50aWMgVUkgdGFibGUgcm93IHN0YXRlc1xuICAgICAgICAgICAgLy8gJ25lZ2F0aXZlJyA9IHJlZCByb3cgKGJhbm5lZClcbiAgICAgICAgICAgIC8vICdwb3NpdGl2ZScgPSBncmVlbiByb3cgKG5vdCBiYW5uZWQpXG4gICAgICAgICAgICBjb25zdCByb3dDbGFzcyA9IGlzQmFubmVkID8gJ25lZ2F0aXZlJyA6ICcnO1xuXG4gICAgICAgICAgICBjb25zdCBsYXN0QXR0ZW1wdCA9IG5ldyBEYXRlKHN0YXRzLmxhc3RfYXR0ZW1wdCAqIDEwMDApLnRvTG9jYWxlU3RyaW5nKCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgdW5iYW4gYnV0dG9uIG9ubHkgZm9yIGJhbm5lZCBJUHNcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbkJ1dHRvbiA9IGlzQmFubmVkXG4gICAgICAgICAgICAgICAgPyBgPGJ1dHRvbiBjbGFzcz1cInVpIG1pbmkgcmVkIGljb24gYnV0dG9uIHVuYmFuLWlwXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtaXA9XCIke2lwfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXRvb2x0aXA9XCIke2dsb2JhbFRyYW5zbGF0ZS5leF9TZWN1cml0eVVuYmFufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwibGVmdCBjZW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1bmxvY2sgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5gXG4gICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgY29uc3Qgcm93ID0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cIiR7cm93Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD48c3Ryb25nPiR7aXB9PC9zdHJvbmc+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPiR7c3RhdHMuY291bnR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPiR7bGFzdEF0dGVtcHR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2FjdGlvbkJ1dHRvbn08L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgdW5iYW4gYnV0dG9uc1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJ1tkYXRhLXRvb2x0aXBdJykucG9wdXAoKTtcblxuICAgICAgICAvLyBCaW5kIHVuYmFuIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJy51bmJhbi1pcCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVVuYmFuQ2xpY2soZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdW5iYW4gYnV0dG9uIGNsaWNrXG4gICAgICogQHBhcmFtIHtFdmVudH0gZSAtIENsaWNrIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlVW5iYW5DbGljayhlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgY29uc3QgaXAgPSAkYnV0dG9uLmRhdGEoJ2lwJyk7XG5cbiAgICAgICAgaWYgKCFpcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIENhbGwgRmlyZXdhbGxBUEkgdG8gdW5iYW4gSVBcbiAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcChpcCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCByZWxvYWQgc2VjdXJpdHkgZGF0YSAtIHRhYmxlIHdpbGwgdXBkYXRlIHZpc3VhbGx5XG4gICAgICAgICAgICAgICAgLy8gUmVkIHJvdyB3aWxsIGJlY29tZSBncmVlbiByb3dcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLmxvYWRTZWN1cml0eURhdGEoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBzaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgOiB7ZXJyb3I6IFsnRmFpbGVkIHRvIHVuYmFuIElQJ119O1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1zZyk7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIENsZWFyIHVwZGF0ZSB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBleHRlbnNpb24tbW9kaWZ5LmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3I7XG59Il19