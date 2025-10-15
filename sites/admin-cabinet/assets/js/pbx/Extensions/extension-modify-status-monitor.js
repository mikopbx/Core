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

      var isBanned = _this8.bannedIps.hasOwnProperty(ip); // Get country information if IP is banned


      var ipDisplay = ip;

      if (isBanned && _this8.bannedIps[ip]) {
        var ipData = _this8.bannedIps[ip];
        var country = ipData.country || '';
        var countryName = ipData.countryName || '';

        if (country) {
          // Add country flag with popup tooltip
          ipDisplay = "<span class=\"country-flag\" data-content=\"".concat(countryName, "\" data-position=\"top center\"><i class=\"flag ").concat(country.toLowerCase(), "\"></i></span>").concat(ip);
        }
      } // Use Fomantic UI table row states
      // 'negative' = red row (banned)


      var rowClass = isBanned ? 'negative' : '';
      var lastAttempt = new Date(stats.last_attempt * 1000).toLocaleString(); // Show unban button only for banned IPs

      var actionButton = isBanned ? "<button class=\"ui mini red icon button unban-ip\"\n                           data-ip=\"".concat(ip, "\"\n                           data-tooltip=\"").concat(globalTranslate.ex_SecurityUnban, "\"\n                           data-position=\"left center\">\n                       <i class=\"unlock icon\"></i>\n                   </button>") : '';
      var row = "\n                <tr class=\"".concat(rowClass, "\">\n                    <td><strong>").concat(ipDisplay, "</strong></td>\n                    <td>").concat(stats.count, "</td>\n                    <td>").concat(lastAttempt, "</td>\n                    <td class=\"center aligned\">").concat(actionButton, "</td>\n                </tr>\n            ");
      tbody.append(row);
    }); // Initialize tooltips for unban buttons

    this.$securityTable.find('[data-tooltip]').popup(); // Initialize popups for country flags

    this.$securityTable.find('.country-flag').popup({
      hoverable: true,
      position: 'top center',
      delay: {
        show: 300,
        hide: 100
      }
    }); // Bind unban button handlers

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCIkc2VjdXJpdHlUYWJsZSIsIiRub1NlY3VyaXR5RGF0YSIsInNlY3VyaXR5RGF0YSIsImJhbm5lZElwcyIsInVwZGF0ZVRpbWVyIiwiaW5pdGlhbGl6ZSIsIiRpc05ld0ZpZWxkIiwiJCIsImlzTmV3IiwibGVuZ3RoIiwidmFsIiwiZXh0cmFjdEV4dGVuc2lvbklkIiwiY2FjaGVFbGVtZW50cyIsInN1YnNjcmliZVRvRXZlbnRzIiwibG9hZEluaXRpYWxTdGF0dXMiLCJsb2FkU2VjdXJpdHlEYXRhIiwic3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyIiwiJG51bWJlckZpZWxkIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaW5wdXRtYXNrIiwiZSIsInJlcGxhY2UiLCJ1cmxNYXRjaCIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJtYXRjaCIsInNldFRpbWVvdXQiLCJTaXBBUEkiLCJnZXRTdGF0dXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cGRhdGVTdGF0dXMiLCJsb2FkSGlzdG9yaWNhbERhdGEiLCJnZXRIaXN0b3J5IiwiaGlzdG9yeSIsImRpc3BsYXlIaXN0b3JpY2FsRGF0YSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJzdGF0dXNlcyIsInN0YXR1c0RhdGEiLCJ1cGRhdGVTdGF0dXNMYWJlbCIsInN0YXR1cyIsInVwZGF0ZUFjdGl2ZURldmljZXMiLCJkZXZpY2VzIiwiY29sb3IiLCJnZXRDb2xvckZvclN0YXR1cyIsImxhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJleF9Ob0FjdGl2ZURldmljZXMiLCJkZXZpY2VzSHRtbCIsImZvckVhY2giLCJkZXZpY2UiLCJ1c2VyQWdlbnQiLCJ1c2VyX2FnZW50IiwiaXAiLCJjb250YWN0X2lwIiwicG9ydCIsImlwRGlzcGxheSIsInJ0dCIsInVuZGVmaW5lZCIsInRvRml4ZWQiLCJpZCIsImF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMiLCJmaW5kIiwib24iLCJwcmV2ZW50RGVmYXVsdCIsIiRsYWJlbCIsIiRpdGVtIiwiY2xvc2VzdCIsImRhdGFJZCIsInBhcnRzIiwic3BsaXQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ0aGVuIiwidHJhbnNpdGlvbiIsInBvcHVwIiwiY29udGVudCIsImV4X0lwQ29waWVkIiwicG9zaXRpb24iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCIkdGVtcCIsImFwcGVuZCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJyZW1vdmUiLCJjc3MiLCJoaXN0b3J5RGF0YSIsImV4X05vSGlzdG9yeUF2YWlsYWJsZSIsImRldmljZUdyb3VwcyIsImdyb3VwSGlzdG9yeUJ5RGV2aWNlIiwiaGlzdG9yeUh0bWwiLCJPYmplY3QiLCJlbnRyaWVzIiwiZGV2aWNlSW5kZXgiLCJkZXZpY2VLZXkiLCJzZXNzaW9ucyIsImRldmljZU5hbWUiLCJkZXZpY2VJUCIsImRldmljZUlkIiwidGltZWxpbmVIdG1sIiwiY3JlYXRlRGV2aWNlVGltZWxpbmUiLCJzZXNzaW9uIiwiaW5kZXgiLCJpc09ubGluZSIsImV2ZW50TGFiZWwiLCJldmVudF90eXBlIiwiZXhfRGV2aWNlRGlzY29ubmVjdGVkIiwiZXhfRGV2aWNlQ29ubmVjdGVkIiwicnR0TGFiZWwiLCJnZXRSdHRMYWJlbCIsImRhdGV0aW1lIiwiZm9ybWF0RGF0ZVRpbWUiLCJkYXRlIiwidGltZXN0YW1wIiwic3RhdHVzQ2xhc3MiLCJzdGF0dXNUaXRsZSIsImR1cmF0aW9uSHRtbCIsImV4X09ubGluZSIsImNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyIsImR1cmF0aW9uIiwiY2FsY3VsYXRlRHVyYXRpb24iLCJkdXJhdGlvblRleHQiLCJleF9PZmZsaW5lIiwiaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMiLCJncm91cHMiLCJlbnRyeSIsImlwX2FkZHJlc3MiLCJkZXRhaWxzIiwidHJpbSIsInB1c2giLCJrZXlzIiwia2V5Iiwic29ydCIsImEiLCJiIiwic29ydGVkR3JvdXBzIiwiYUxhdGVzdCIsImJMYXRlc3QiLCJzb3J0ZWRPYmplY3QiLCJ2YWx1ZSIsImN1cnJlbnRUaW1lc3RhbXAiLCJwcmV2aW91c1RpbWVzdGFtcCIsImRpZmYiLCJNYXRoIiwiYWJzIiwibWludXRlcyIsImZsb29yIiwiaG91cnMiLCJkYXlzIiwiZm9ybWF0VGltZSIsImRhdGVTdHIiLCJpbmNsdWRlcyIsInRpbWVQYXJ0IiwiRGF0ZSIsInRvTG9jYWxlVGltZVN0cmluZyIsInRpbWUiLCJub3ciLCJpc1RvZGF5IiwidG9EYXRlU3RyaW5nIiwieWVzdGVyZGF5Iiwic2V0RGF0ZSIsImdldERhdGUiLCJpc1llc3RlcmRheSIsImxvY2FsZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZ2V0VXNlckxvY2FsZSIsInRpbWVTdHIiLCJob3VyIiwibWludXRlIiwic2Vjb25kIiwieWVzdGVyZGF5VGV4dCIsImV4X1llc3RlcmRheSIsInRvTG9jYWxlRGF0ZVN0cmluZyIsImRheSIsIm1vbnRoIiwiY2xlYXJJbnRlcnZhbCIsInNldEludGVydmFsIiwidXBkYXRlT25saW5lRHVyYXRpb25zIiwiJGR1cmF0aW9ucyIsImVhY2giLCJlbGVtZW50IiwiJGVsZW1lbnQiLCJvbmxpbmVTaW5jZSIsInBhcnNlSW50IiwidGV4dCIsImRheUFnbyIsInJlY2VudFNlc3Npb25zIiwiZmlsdGVyIiwicyIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwic2VnbWVudERhdGEiLCJmaWxsIiwiY2hyb25vbG9naWNhbFNlc3Npb25zIiwicmV2ZXJzZSIsIm5leHRTZXNzaW9uIiwic3RhcnRUaW1lIiwiZW5kVGltZSIsInNlZ21lbnRJbmRleCIsInNlZ21lbnRXaWR0aCIsImJnQ29sb3IiLCJib3JkZXJMZWZ0Iiwic2VnbWVudFRpbWUiLCJzZWdtZW50RGF0ZSIsImhvdXJzTGFiZWwiLCJleF9Ib3Vyc19TaG9ydCIsImV4X05vdyIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJleHRlbnNpb24iLCJnZXRBdXRoRmFpbHVyZVN0YXRzIiwiRmlyZXdhbGxBUEkiLCJnZXRCYW5uZWRJcHMiLCJiYW5uZWRSZXNwb25zZSIsInJlbmRlclNlY3VyaXR5VGFibGUiLCJ0Ym9keSIsImVtcHR5IiwiZmFpbHVyZXMiLCJzdGF0cyIsImlzQmFubmVkIiwiaGFzT3duUHJvcGVydHkiLCJpcERhdGEiLCJjb3VudHJ5IiwiY291bnRyeU5hbWUiLCJ0b0xvd2VyQ2FzZSIsInJvd0NsYXNzIiwibGFzdEF0dGVtcHQiLCJsYXN0X2F0dGVtcHQiLCJ0b0xvY2FsZVN0cmluZyIsImFjdGlvbkJ1dHRvbiIsImV4X1NlY3VyaXR5VW5iYW4iLCJyb3ciLCJjb3VudCIsImhvdmVyYWJsZSIsImhhbmRsZVVuYmFuQ2xpY2siLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsInVuYmFuSXAiLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJkZXN0cm95IiwidW5zdWJzY3JpYmUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtB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Q0FBQ0MsTUFBekIsRUFBaUM7QUFDN0I7QUFDQTtBQUNBdEMsUUFBQUEsNEJBQTRCLENBQUNzQixnQkFBN0I7QUFDSCxPQUpELE1BSU87QUFDSDtBQUNBLFlBQU1nUCxRQUFRLEdBQUdqTyxRQUFRLElBQUlBLFFBQVEsQ0FBQ2tPLFFBQXJCLEdBQ1hsTyxRQUFRLENBQUNrTyxRQURFLEdBRVg7QUFBQ25LLFVBQUFBLEtBQUssRUFBRSxDQUFDLG9CQUFEO0FBQVIsU0FGTjtBQUdBb0ssUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCSCxRQUE1QjtBQUNBSCxRQUFBQSxPQUFPLENBQUN2TSxXQUFSLENBQW9CLGtCQUFwQjtBQUNIO0FBQ0osS0FiRDtBQWNILEdBNTdCZ0M7O0FBODdCakM7QUFDSjtBQUNBO0FBQ0k4TSxFQUFBQSxPQWo4QmlDLHFCQWk4QnZCO0FBQ047QUFDQSxRQUFJLEtBQUsvUCxXQUFULEVBQXNCO0FBQ2xCMEwsTUFBQUEsYUFBYSxDQUFDLEtBQUsxTCxXQUFOLENBQWI7QUFDQSxXQUFLQSxXQUFMLEdBQW1CLElBQW5CO0FBQ0g7O0FBRUQsUUFBSSxPQUFPa0MsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNqQ0EsTUFBQUEsUUFBUSxDQUFDOE4sV0FBVCxDQUFxQixrQkFBckI7QUFDSDs7QUFDRCxTQUFLelEsYUFBTCxHQUFxQixLQUFyQjtBQUNBLFNBQUtDLGtCQUFMLEdBQTBCLElBQTFCO0FBQ0g7QUE3OEJnQyxDQUFyQyxDLENBZzlCQTs7QUFDQSxJQUFJLE9BQU95USxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUI3USw0QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIEV2ZW50QnVzLCBTaXBBUEksIEZpcmV3YWxsQVBJLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuLyoqXG4gKiBFeHRlbnNpb24gTW9kaWZ5IFN0YXR1cyBNb25pdG9yXG4gKiBTaW1wbGlmaWVkIHN0YXR1cyBtb25pdG9yaW5nIGZvciBleHRlbnNpb24gbW9kaWZ5IHBhZ2U6XG4gKiAtIFNpbmdsZSBBUEkgY2FsbCBvbiBpbml0aWFsaXphdGlvblxuICogLSBSZWFsLXRpbWUgdXBkYXRlcyB2aWEgRXZlbnRCdXMgb25seVxuICogLSBObyBwZXJpb2RpYyBwb2xsaW5nXG4gKiAtIENsZWFuIGRldmljZSBsaXN0IGFuZCBoaXN0b3J5IGRpc3BsYXlcbiAqL1xuY29uc3QgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdleHRlbnNpb24tc3RhdHVzJyxcbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBjdXJyZW50RXh0ZW5zaW9uSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHNcbiAgICAgKi9cbiAgICAkc3RhdHVzTGFiZWw6IG51bGwsXG4gICAgJGFjdGl2ZURldmljZXNMaXN0OiBudWxsLFxuICAgICRkZXZpY2VIaXN0b3J5TGlzdDogbnVsbCxcbiAgICAkc2VjdXJpdHlUYWJsZTogbnVsbCxcbiAgICAkbm9TZWN1cml0eURhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBTZWN1cml0eSBkYXRhXG4gICAgICovXG4gICAgc2VjdXJpdHlEYXRhOiB7fSxcbiAgICBiYW5uZWRJcHM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGludGVydmFsIHRpbWVyXG4gICAgICovXG4gICAgdXBkYXRlVGltZXI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IGV4dGVuc2lvbiAobm90IHlldCBzYXZlZCBpbiBkYXRhYmFzZSlcbiAgICAgICAgLy8gQ2hlY2sgaGlkZGVuIGZpZWxkIGRpcmVjdGx5IGluc3RlYWQgb2YgdXNpbmcgU2VtYW50aWMgVUkgZm9ybSBBUElcbiAgICAgICAgY29uc3QgJGlzTmV3RmllbGQgPSAkKCcjZXh0ZW5zaW9ucy1mb3JtIGlucHV0W25hbWU9XCJfaXNOZXdcIl0nKTtcbiAgICAgICAgY29uc3QgaXNOZXcgPSAkaXNOZXdGaWVsZC5sZW5ndGggPiAwICYmICRpc05ld0ZpZWxkLnZhbCgpID09PSAndHJ1ZSc7XG5cbiAgICAgICAgLy8gU2tpcCBzdGF0dXMgbW9uaXRvcmluZyBmb3IgbmV3IGV4dGVuc2lvbnNcbiAgICAgICAgaWYgKGlzTmV3KSB7XG4gICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGV4dGVuc2lvbiBudW1iZXIgZnJvbSBmb3JtXG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gdGhpcy5leHRyYWN0RXh0ZW5zaW9uSWQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIGluaXRpYWwgQVBJIGNhbGxcbiAgICAgICAgdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpO1xuXG4gICAgICAgIC8vIExvYWQgc2VjdXJpdHkgZGF0YVxuICAgICAgICB0aGlzLmxvYWRTZWN1cml0eURhdGEoKTtcblxuICAgICAgICAvLyBTdGFydCB0aW1lciBmb3IgdXBkYXRpbmcgb25saW5lIGR1cmF0aW9uc1xuICAgICAgICB0aGlzLnN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lcigpO1xuXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IGV4dGVuc2lvbiBJRCBmcm9tIHRoZSBmb3JtXG4gICAgICovXG4gICAgZXh0cmFjdEV4dGVuc2lvbklkKCkge1xuICAgICAgICAvLyBGaXJzdCwgdHJ5IHRvIGdldCB0aGUgcGhvbmUgbnVtYmVyIGZyb20gZm9ybSBmaWVsZCAocHJpbWFyeSlcbiAgICAgICAgY29uc3QgJG51bWJlckZpZWxkID0gJCgnaW5wdXRbbmFtZT1cIm51bWJlclwiXScpO1xuICAgICAgICBpZiAoJG51bWJlckZpZWxkLmxlbmd0aCAmJiAkbnVtYmVyRmllbGQudmFsKCkpIHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdW5tYXNrZWQgdmFsdWUgaWYgaW5wdXRtYXNrIGlzIGFwcGxpZWRcbiAgICAgICAgICAgIGxldCBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGlucHV0bWFzayBpcyBhdmFpbGFibGUgYW5kIGFwcGxpZWQgdG8gdGhlIGZpZWxkXG4gICAgICAgICAgICBpZiAodHlwZW9mICRudW1iZXJGaWVsZC5pbnB1dG1hc2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWUgKG9ubHkgdGhlIGFjdHVhbCBpbnB1dCB3aXRob3V0IG1hc2sgY2hhcmFjdGVycylcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gJG51bWJlckZpZWxkLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgaWYgaW5wdXRtYXNrIG1ldGhvZCBmYWlsc1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQudmFsKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFuIHVwIHRoZSB2YWx1ZSAtIHJlbW92ZSBhbnkgcmVtYWluaW5nIG1hc2sgY2hhcmFjdGVycyBsaWtlIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9IGV4dGVuc2lvbk51bWJlci5yZXBsYWNlKC9bXjAtOV0vZywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IHJldHVybiBpZiB3ZSBoYXZlIGFjdHVhbCBkaWdpdHNcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25OdW1iZXIgJiYgZXh0ZW5zaW9uTnVtYmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXh0ZW5zaW9uTnVtYmVyO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjayB0byBVUkwgcGFyYW1ldGVyXG4gICAgICAgIGNvbnN0IHVybE1hdGNoID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9cXC9leHRlbnNpb25zXFwvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGlmICh1cmxNYXRjaCAmJiB1cmxNYXRjaFsxXSkge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBkYXRhYmFzZSBJRCwgd2UgbmVlZCB0byB3YWl0IGZvciBmb3JtIHRvIGxvYWRcbiAgICAgICAgICAgIC8vIFdlJ2xsIGdldCB0aGUgYWN0dWFsIGV4dGVuc2lvbiBudW1iZXIgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzXG4gICAgICovXG4gICAgY2FjaGVFbGVtZW50cygpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzTGFiZWwgPSAkKCcjc3RhdHVzJyk7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0ID0gJCgnI2FjdGl2ZS1kZXZpY2VzLWxpc3QnKTtcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QgPSAkKCcjZGV2aWNlLWhpc3RvcnktbGlzdCcpO1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlID0gJCgnI3NlY3VyaXR5LWZhaWxlZC1hdXRoLXRhYmxlJyk7XG4gICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhID0gJCgnI25vLXNlY3VyaXR5LWRhdGEnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaW5pdGlhbCBzdGF0dXMgd2l0aCBzaW5nbGUgQVBJIGNhbGxcbiAgICAgKi9cbiAgICBsb2FkSW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gUmUtY2hlY2sgZXh0ZW5zaW9uIElEIGFmdGVyIGZvcm0gbG9hZHNcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSBhZ2FpbiBhZnRlciBkZWxheSAoZm9ybSBtaWdodCBzdGlsbCBiZSBsb2FkaW5nKVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5sb2FkSW5pdGlhbFN0YXR1cygpLCA1MDApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIC8vIE1ha2Ugc2luZ2xlIEFQSSBjYWxsIGZvciBjdXJyZW50IHN0YXR1c1xuICAgICAgICBTaXBBUEkuZ2V0U3RhdHVzKHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsc28gbG9hZCBoaXN0b3JpY2FsIGRhdGFcbiAgICAgICAgdGhpcy5sb2FkSGlzdG9yaWNhbERhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgaGlzdG9yaWNhbCBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZEhpc3RvcmljYWxEYXRhKCkge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGZXRjaCBoaXN0b3J5IGZyb20gQVBJXG4gICAgICAgIFNpcEFQSS5nZXRIaXN0b3J5KHRoaXMuY3VycmVudEV4dGVuc2lvbklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmhpc3RvcnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRpc3BsYXlIaXN0b3JpY2FsRGF0YShyZXNwb25zZS5kYXRhLmhpc3RvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlZnJlc2ggc2VjdXJpdHkgZGF0YSBvbiBjb25maWcgY2hhbmdlc1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmxvYWRTZWN1cml0eURhdGEoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlO1xuICAgICAgICBpZiAoZGF0YS5zdGF0dXNlcyAmJiBkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoZGF0YS5zdGF0dXNlc1t0aGlzLmN1cnJlbnRFeHRlbnNpb25JZF0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1c0RhdGEuc3RhdHVzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgZGV2aWNlc1xuICAgICAgICB0aGlzLnVwZGF0ZUFjdGl2ZURldmljZXMoc3RhdHVzRGF0YS5kZXZpY2VzIHx8IFtdKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERvbid0IGFkZCB0byBoaXN0b3J5IC0gaGlzdG9yeSBpcyBsb2FkZWQgZnJvbSBBUEkgb25seVxuICAgICAgICAvLyB0aGlzLmFkZFRvSGlzdG9yeShzdGF0dXNEYXRhKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgbGFiZWxcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNMYWJlbChzdGF0dXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRzdGF0dXNMYWJlbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgY29uc3QgbGFiZWwgPSBnbG9iYWxUcmFuc2xhdGVbYGV4X1N0YXR1cyR7c3RhdHVzfWBdIHx8IHN0YXR1cztcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGNsYXNzIGFuZCB1cGRhdGUgY29udGVudFxuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbFxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmV5IGdyZWVuIHJlZCB5ZWxsb3cgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoY29sb3IpXG4gICAgICAgICAgICAuaHRtbChgJHtsYWJlbH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBmb3Igc3RhdHVzIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKSB7XG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVW5hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBjYXNlICdEaXNhYmxlZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFjdGl2ZSBkZXZpY2VzIGxpc3RcbiAgICAgKi9cbiAgICB1cGRhdGVBY3RpdmVEZXZpY2VzKGRldmljZXMpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdCB8fCAhQXJyYXkuaXNBcnJheShkZXZpY2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRldmljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcGxhY2Vob2xkZXIgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZGVza3RvcCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfTm9BY3RpdmVEZXZpY2VzfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgbGlzdCB3aXRoIHRlYWwgbGFiZWxzIGxpa2UgdGhlIG9sZCBlbmRwb2ludC1saXN0XG4gICAgICAgIGxldCBkZXZpY2VzSHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgIFxuICAgICAgICBkZXZpY2VzLmZvckVhY2goKGRldmljZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXNlckFnZW50ID0gZGV2aWNlLnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBkZXZpY2UuaXAgfHwgZGV2aWNlLmNvbnRhY3RfaXAgfHwgJy0nO1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IGRldmljZS5wb3J0IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXBEaXNwbGF5ID0gcG9ydCA/IGAke2lwfToke3BvcnR9YCA6IGlwO1xuICAgICAgICAgICAgY29uc3QgcnR0ID0gZGV2aWNlLnJ0dCAhPT0gbnVsbCAmJiBkZXZpY2UucnR0ICE9PSB1bmRlZmluZWQgXG4gICAgICAgICAgICAgICAgPyBgICgke2RldmljZS5ydHQudG9GaXhlZCgyKX0gbXMpYCBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWQgPSBgJHt1c2VyQWdlbnR9fCR7aXB9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGV2aWNlc0h0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS1pZD1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZWFsIGxhYmVsXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3VzZXJBZ2VudH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXRhaWxcIj4ke2lwRGlzcGxheX0ke3J0dH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRldmljZXNIdG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5odG1sKGRldmljZXNIdG1sKTtcblxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBjb3B5IElQIGFkZHJlc3NcbiAgICAgICAgdGhpcy5hdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEF0dGFjaCBjbGljayBoYW5kbGVycyB0byBkZXZpY2UgbGFiZWxzIGZvciBJUCBjb3B5aW5nXG4gICAgICovXG4gICAgYXR0YWNoRGV2aWNlQ2xpY2tIYW5kbGVycygpIHtcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QuZmluZCgnLml0ZW0gLnVpLmxhYmVsJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkbGFiZWwuY2xvc2VzdCgnLml0ZW0nKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGFJZCA9ICRpdGVtLmRhdGEoJ2lkJyk7XG5cbiAgICAgICAgICAgIGlmICghZGF0YUlkKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgSVAgZnJvbSBkYXRhLWlkIChmb3JtYXQ6IFwiVXNlckFnZW50fElQXCIpXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGRhdGFJZC5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgY29uc3QgaXAgPSBwYXJ0c1sxXTtcblxuICAgICAgICAgICAgaWYgKCFpcCB8fCBpcCA9PT0gJy0nKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIENvcHkgdG8gY2xpcGJvYXJkIHVzaW5nIHRoZSBzYW1lIG1ldGhvZCBhcyBwYXNzd29yZCB3aWRnZXRcbiAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IuY2xpcGJvYXJkICYmIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KSB7XG4gICAgICAgICAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoaXApLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3MgZmVlZGJhY2tcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVGVtcG9yYXJpbHkgY2hhbmdlIHRoZSBsYWJlbCBjb2xvciB0byBpbmRpY2F0ZSBzdWNjZXNzXG4gICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygndGVhbCcpLmFkZENsYXNzKCdncmVlbicpO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygnZ3JlZW4nKS5hZGRDbGFzcygndGVhbCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHBvcHVwIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9JcENvcGllZH06ICR7aXB9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcidcbiAgICAgICAgICAgICAgICAgICAgfSkucG9wdXAoJ3Nob3cnKTtcblxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRsYWJlbC5wb3B1cCgnaGlkZScpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBjb3B5IElQOicsIGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZW1wID0gJCgnPGlucHV0PicpO1xuICAgICAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQoJHRlbXApO1xuICAgICAgICAgICAgICAgICR0ZW1wLnZhbChpcCkuc2VsZWN0KCk7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2NvcHknKTtcbiAgICAgICAgICAgICAgICAkdGVtcC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZmVlZGJhY2tcbiAgICAgICAgICAgICAgICAkbGFiZWwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ3RlYWwnKS5hZGRDbGFzcygnZ3JlZW4nKTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCd0ZWFsJyk7XG4gICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBjdXJzb3IgcG9pbnRlciBzdHlsZVxuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5maW5kKCcuaXRlbSAudWkubGFiZWwnKS5jc3MoJ2N1cnNvcicsICdwb2ludGVyJyk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheSBoaXN0b3JpY2FsIGRhdGEgZnJvbSBBUEkgd2l0aCBkZXZpY2UgZ3JvdXBpbmdcbiAgICAgKi9cbiAgICBkaXNwbGF5SGlzdG9yaWNhbERhdGEoaGlzdG9yeURhdGEpIHtcbiAgICAgICAgaWYgKCF0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdCB8fCAhQXJyYXkuaXNBcnJheShoaXN0b3J5RGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChoaXN0b3J5RGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJoaXN0b3J5IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0hpc3RvcnlBdmFpbGFibGV9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHcm91cCBoaXN0b3J5IGJ5IGRldmljZVxuICAgICAgICBjb25zdCBkZXZpY2VHcm91cHMgPSB0aGlzLmdyb3VwSGlzdG9yeUJ5RGV2aWNlKGhpc3RvcnlEYXRhKTtcblxuICAgICAgICAvLyBCdWlsZCBIVE1MIGZvciBncm91cGVkIGRpc3BsYXkgLSBzaW1wbGlmaWVkIHN0cnVjdHVyZVxuICAgICAgICBsZXQgaGlzdG9yeUh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZWQgbGlzdFwiPic7XG5cbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZGV2aWNlR3JvdXBzKS5mb3JFYWNoKChbZGV2aWNlS2V5LCBzZXNzaW9uc10sIGRldmljZUluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBbdXNlckFnZW50LCBpcF0gPSBkZXZpY2VLZXkuc3BsaXQoJ3wnKTtcbiAgICAgICAgICAgIGNvbnN0IGRldmljZU5hbWUgPSB1c2VyQWdlbnQgfHwgJ1Vua25vd24gRGV2aWNlJztcbiAgICAgICAgICAgIGNvbnN0IGRldmljZUlQID0gKGlwICYmIGlwICE9PSAnVW5rbm93bicpID8gaXAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGRldmljZUlkID0gYGRldmljZS0ke2RldmljZUluZGV4fWA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aW1lbGluZSBIVE1MIGZvciB0aGlzIGRldmljZVxuICAgICAgICAgICAgY29uc3QgdGltZWxpbmVIdG1sID0gdGhpcy5jcmVhdGVEZXZpY2VUaW1lbGluZShzZXNzaW9ucywgZGV2aWNlSWQpO1xuXG4gICAgICAgICAgICAvLyBEZXZpY2UgaGVhZGVyIC0gZXhhY3RseSBhcyByZXF1ZXN0ZWRcbiAgICAgICAgICAgIGhpc3RvcnlIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNtYWxsIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibW9iaWxlIGFsdGVybmF0ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGV2aWNlTmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkZXZpY2VJUCA/IGA8c3BhbiBzdHlsZT1cImNvbG9yOiBncmV5OyBmb250LXNpemU6MC43ZW07XCI+JHtkZXZpY2VJUH08Lz5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dGltZWxpbmVIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uXCI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXNzaW9ucyB0aW1lbGluZSAtIHNpbXBsaWZpZWRcbiAgICAgICAgICAgIHNlc3Npb25zLmZvckVhY2goKHNlc3Npb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZXZlbnQgdHlwZSB0byBkZXRlcm1pbmUgYWN0dWFsIGRldmljZSBzdGF0dXNcbiAgICAgICAgICAgICAgICBsZXQgaXNPbmxpbmUgPSBzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZSc7XG4gICAgICAgICAgICAgICAgbGV0IGV2ZW50TGFiZWwgPSAnJztcblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBkZXZpY2Utc3BlY2lmaWMgZXZlbnRzXG4gICAgICAgICAgICAgICAgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgICAgICBpc09ubGluZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBldmVudExhYmVsID0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leF9EZXZpY2VEaXNjb25uZWN0ZWR9YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9hZGRlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBldmVudExhYmVsID0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leF9EZXZpY2VDb25uZWN0ZWR9YDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBydHRMYWJlbCA9IHRoaXMuZ2V0UnR0TGFiZWwoc2Vzc2lvbi5ydHQpO1xuICAgICAgICAgICAgICAgIC8vIEZvcm1hdCBkYXRldGltZSB3aXRoIGRhdGUgYW5kIHRpbWVcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRldGltZSA9IHRoaXMuZm9ybWF0RGF0ZVRpbWUoc2Vzc2lvbi5kYXRlIHx8IHNlc3Npb24udGltZXN0YW1wKTtcblxuICAgICAgICAgICAgICAgIC8vIFVzZSBjaXJjdWxhciBsYWJlbHMgbGlrZSBpbiBleHRlbnNpb25zIGxpc3RcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGlzT25saW5lID8gJ2dyZWVuJyA6ICdncmV5JztcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNUaXRsZSA9IGlzT25saW5lID8gJ09ubGluZScgOiAnT2ZmbGluZSc7XG5cbiAgICAgICAgICAgICAgICBsZXQgZHVyYXRpb25IdG1sID0gJyc7XG4gICAgICAgICAgICAgICAgLy8gRm9yIHRoZSBmaXJzdCAobW9zdCByZWNlbnQpIGVudHJ5IHRoYXQgaXMgb25saW5lLCBhZGQgbGl2ZSBkdXJhdGlvblxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gMCAmJiBpc09ubGluZSAmJiBzZXNzaW9uLmV2ZW50X3R5cGUgIT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGRhdGEgYXR0cmlidXRlIHdpdGggdGltZXN0YW1wIGZvciBsaXZlIHVwZGF0aW5nXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uSHRtbCA9IGA8c3BhbiBjbGFzcz1cInVpIGdyZXkgdGV4dCBvbmxpbmUtZHVyYXRpb25cIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtb25saW5lLXNpbmNlPVwiJHtzZXNzaW9uLnRpbWVzdGFtcH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZX0gJHt0aGlzLmNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyhzZXNzaW9uLnRpbWVzdGFtcCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIHN0YXRpYyBkdXJhdGlvbiBmb3IgaGlzdG9yaWNhbCBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5jYWxjdWxhdGVEdXJhdGlvbihzZXNzaW9uLnRpbWVzdGFtcCwgc2Vzc2lvbnNbaW5kZXggLSAxXT8udGltZXN0YW1wKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9ybWF0IGR1cmF0aW9uIHdpdGggdHJhbnNsYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25UZXh0ID0gZHVyYXRpb24gJiYgaXNPbmxpbmVcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZX0gJHtkdXJhdGlvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGR1cmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyBgJHtnbG9iYWxUcmFuc2xhdGUuZXhfT2ZmbGluZX0gJHtkdXJhdGlvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25UZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkh0bWwgPSBgPHNwYW4gY2xhc3M9XCJ1aSBncmV5IHRleHRcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+JHtkdXJhdGlvblRleHR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCB0ZXh0XCIgc3R5bGU9XCJtYXJnaW46IDZweCAyMHB4OyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdHVzQ2xhc3N9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogOHB4OyBoZWlnaHQ6IDhweDsgbWluLWhlaWdodDogOHB4OyBtYXJnaW4tcmlnaHQ6IDhweDtcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7c3RhdHVzVGl0bGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZGF0ZXRpbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAke3J0dExhYmVsfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtkdXJhdGlvbkh0bWwgfHwgZXZlbnRMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBoaXN0b3J5SHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcblxuICAgICAgICBoaXN0b3J5SHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QuaHRtbChoaXN0b3J5SHRtbCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lbGluZSB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUaW1lbGluZVRvb2x0aXBzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHcm91cCBoaXN0b3J5IGV2ZW50cyBieSBkZXZpY2UgYW5kIHNvcnQgYnkgbGFzdCBldmVudFxuICAgICAqL1xuICAgIGdyb3VwSGlzdG9yeUJ5RGV2aWNlKGhpc3RvcnlEYXRhKSB7XG4gICAgICAgIGNvbnN0IGdyb3VwcyA9IHt9O1xuXG4gICAgICAgIGhpc3RvcnlEYXRhLmZvckVhY2goZW50cnkgPT4ge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGRldmljZSBrZXkgZnJvbSB1c2VyX2FnZW50IGFuZCBJUFxuICAgICAgICAgICAgbGV0IGRldmljZUtleSA9ICdVbmtub3dufFVua25vd24nO1xuXG4gICAgICAgICAgICBpZiAoZW50cnkudXNlcl9hZ2VudCB8fCBlbnRyeS5pcF9hZGRyZXNzKSB7XG4gICAgICAgICAgICAgICAgZGV2aWNlS2V5ID0gYCR7ZW50cnkudXNlcl9hZ2VudCB8fCAnVW5rbm93bid9fCR7ZW50cnkuaXBfYWRkcmVzcyB8fCAnVW5rbm93bid9YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkuZGV0YWlscykge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBleHRyYWN0IGRldmljZSBpbmZvIGZyb20gZGV0YWlsc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gZW50cnkuZGV0YWlscy5tYXRjaCgvKFtcXHdcXHMuXSspXFxzKi1cXHMqKFtcXGQuXSspLyk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke21hdGNoWzFdLnRyaW0oKX18JHttYXRjaFsyXS50cmltKCl9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZ3JvdXBzW2RldmljZUtleV0pIHtcbiAgICAgICAgICAgICAgICBncm91cHNbZGV2aWNlS2V5XSA9IFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBncm91cHNbZGV2aWNlS2V5XS5wdXNoKGVudHJ5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU29ydCBzZXNzaW9ucyB3aXRoaW4gZWFjaCBncm91cCBieSB0aW1lc3RhbXAgKG5ld2VzdCBmaXJzdClcbiAgICAgICAgT2JqZWN0LmtleXMoZ3JvdXBzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBncm91cHNba2V5XS5zb3J0KChhLCBiKSA9PiBiLnRpbWVzdGFtcCAtIGEudGltZXN0YW1wKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCB0byBhcnJheSBhbmQgc29ydCBieSBtb3N0IHJlY2VudCBldmVudFxuICAgICAgICBjb25zdCBzb3J0ZWRHcm91cHMgPSBPYmplY3QuZW50cmllcyhncm91cHMpXG4gICAgICAgICAgICAuc29ydCgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgbW9zdCByZWNlbnQgdGltZXN0YW1wIGZyb20gZWFjaCBncm91cCAoZmlyc3QgZWxlbWVudCBzaW5jZSBhbHJlYWR5IHNvcnRlZClcbiAgICAgICAgICAgICAgICBjb25zdCBhTGF0ZXN0ID0gYVsxXVswXT8udGltZXN0YW1wIHx8IDA7XG4gICAgICAgICAgICAgICAgY29uc3QgYkxhdGVzdCA9IGJbMV1bMF0/LnRpbWVzdGFtcCB8fCAwO1xuICAgICAgICAgICAgICAgIHJldHVybiBiTGF0ZXN0IC0gYUxhdGVzdDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgYmFjayB0byBvYmplY3Qgd2l0aCBzb3J0ZWQga2V5c1xuICAgICAgICBjb25zdCBzb3J0ZWRPYmplY3QgPSB7fTtcbiAgICAgICAgc29ydGVkR3JvdXBzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgc29ydGVkT2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHNvcnRlZE9iamVjdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkdXJhdGlvbiBiZXR3ZWVuIHR3byB0aW1lc3RhbXBzXG4gICAgICovXG4gICAgY2FsY3VsYXRlRHVyYXRpb24oY3VycmVudFRpbWVzdGFtcCwgcHJldmlvdXNUaW1lc3RhbXApIHtcbiAgICAgICAgaWYgKCFwcmV2aW91c1RpbWVzdGFtcCkgcmV0dXJuIG51bGw7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkaWZmID0gTWF0aC5hYnMocHJldmlvdXNUaW1lc3RhbXAgLSBjdXJyZW50VGltZXN0YW1wKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGhvdXJzIC8gMjQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c31kICR7aG91cnMgJSAyNH1oYDtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc31oICR7bWludXRlcyAlIDYwfW1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc31tYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkaWZmfXNgO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZSBmb3IgZGlzcGxheVxuICAgICAqL1xuICAgIGZvcm1hdFRpbWUoZGF0ZVN0cikge1xuICAgICAgICBpZiAoIWRhdGVTdHIpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGl0J3MgYWxyZWFkeSBhIGZvcm1hdHRlZCBkYXRlIHN0cmluZyBsaWtlIFwiMjAyNS0wOS0xMSAxMTozMDozNlwiXG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZVN0ciA9PT0gJ3N0cmluZycgJiYgZGF0ZVN0ci5pbmNsdWRlcygnICcpKSB7XG4gICAgICAgICAgICBjb25zdCB0aW1lUGFydCA9IGRhdGVTdHIuc3BsaXQoJyAnKVsxXTtcbiAgICAgICAgICAgIHJldHVybiB0aW1lUGFydCB8fCBkYXRlU3RyO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBpdCdzIGEgdGltZXN0YW1wXG4gICAgICAgIGlmICh0eXBlb2YgZGF0ZVN0ciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlU3RyICogMTAwMCk7XG4gICAgICAgICAgICByZXR1cm4gZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGRhdGVTdHI7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgUlRUIGxhYmVsIHdpdGggY29sb3IgY29kaW5nXG4gICAgICovXG4gICAgZ2V0UnR0TGFiZWwocnR0KSB7XG4gICAgICAgIGlmIChydHQgPT09IG51bGwgfHwgcnR0ID09PSB1bmRlZmluZWQgfHwgcnR0IDw9IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjb2xvciA9ICdncmVlbic7XG4gICAgICAgIGlmIChydHQgPiAxNTApIHtcbiAgICAgICAgICAgIGNvbG9yID0gJ3JlZCc7XG4gICAgICAgIH0gZWxzZSBpZiAocnR0ID4gNTApIHtcbiAgICAgICAgICAgIGNvbG9yID0gJ29saXZlJzsgIC8vIHllbGxvdyBjYW4gYmUgaGFyZCB0byBzZWUsIG9saXZlIGlzIGJldHRlclxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cInVpICR7Y29sb3J9IHRleHRcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA4cHg7XCI+W1JUVDogJHtydHQudG9GaXhlZCgwKX1tc108L3NwYW4+YDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGRhdGV0aW1lIHdpdGggZGF0ZSBhbmQgdGltZSB1c2luZyBpbnRlcmZhY2UgbGFuZ3VhZ2VcbiAgICAgKi9cbiAgICBmb3JtYXREYXRlVGltZSh0aW1lKSB7XG4gICAgICAgIGlmICghdGltZSkgcmV0dXJuICctLTotLSc7XG5cbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHR5cGVvZiB0aW1lID09PSAnc3RyaW5nJyA/IHRpbWUgOiB0aW1lICogMTAwMCk7XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyB0b2RheVxuICAgICAgICBjb25zdCBpc1RvZGF5ID0gZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0gbm93LnRvRGF0ZVN0cmluZygpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgeWVzdGVyZGF5XG4gICAgICAgIGNvbnN0IHllc3RlcmRheSA9IG5ldyBEYXRlKG5vdyk7XG4gICAgICAgIHllc3RlcmRheS5zZXREYXRlKHllc3RlcmRheS5nZXREYXRlKCkgLSAxKTtcbiAgICAgICAgY29uc3QgaXNZZXN0ZXJkYXkgPSBkYXRlLnRvRGF0ZVN0cmluZygpID09PSB5ZXN0ZXJkYXkudG9EYXRlU3RyaW5nKCk7XG5cbiAgICAgICAgY29uc3QgbG9jYWxlID0gU2VtYW50aWNMb2NhbGl6YXRpb24uZ2V0VXNlckxvY2FsZSgpO1xuICAgICAgICBjb25zdCB0aW1lU3RyID0gZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcobG9jYWxlLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0Jywgc2Vjb25kOiAnMi1kaWdpdCd9KTtcblxuICAgICAgICBpZiAoaXNUb2RheSkge1xuICAgICAgICAgICAgcmV0dXJuIHRpbWVTdHI7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNZZXN0ZXJkYXkpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0cmFuc2xhdGlvbiBmb3IgXCJZZXN0ZXJkYXlcIiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IHllc3RlcmRheVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfWWVzdGVyZGF5O1xuICAgICAgICAgICAgcmV0dXJuIGAke3llc3RlcmRheVRleHR9ICR7dGltZVN0cn1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9ybWF0IGRhdGUgYWNjb3JkaW5nIHRvIGxvY2FsZVxuICAgICAgICAgICAgY29uc3QgZGF0ZVN0ciA9IGRhdGUudG9Mb2NhbGVEYXRlU3RyaW5nKGxvY2FsZSwge2RheTogJzItZGlnaXQnLCBtb250aDogJzItZGlnaXQnfSk7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF0ZVN0cn0gJHt0aW1lU3RyfWA7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlIGR1cmF0aW9uIGZyb20gdGltZXN0YW1wIHRvIG5vd1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZUR1cmF0aW9uRnJvbU5vdyh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRpZmYgPSBub3cgLSB0aW1lc3RhbXA7XG5cbiAgICAgICAgaWYgKGRpZmYgPCAwKSByZXR1cm4gJzBzJztcblxuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcihkaWZmIC8gNjApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IobWludXRlcyAvIDYwKTtcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3IoaG91cnMgLyAyNCk7XG5cbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c31kICR7aG91cnMgJSAyNH1oYDtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc31oICR7bWludXRlcyAlIDYwfW1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc31tYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkaWZmfXNgO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0IHRpbWVyIHRvIHVwZGF0ZSBvbmxpbmUgZHVyYXRpb25zXG4gICAgICovXG4gICAgc3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyKCkge1xuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy51cGRhdGVUaW1lcik7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXZlcnkgMTAgc2Vjb25kc1xuICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVPbmxpbmVEdXJhdGlvbnMoKTtcbiAgICAgICAgfSwgMTAwMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWxsIG9ubGluZSBkdXJhdGlvbiBkaXNwbGF5c1xuICAgICAqL1xuICAgIHVwZGF0ZU9ubGluZUR1cmF0aW9ucygpIHtcbiAgICAgICAgY29uc3QgJGR1cmF0aW9ucyA9IHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Py5maW5kKCcub25saW5lLWR1cmF0aW9uW2RhdGEtb25saW5lLXNpbmNlXScpO1xuICAgICAgICBpZiAoISRkdXJhdGlvbnMgfHwgJGR1cmF0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICRkdXJhdGlvbnMuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRlbGVtZW50ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IG9ubGluZVNpbmNlID0gcGFyc2VJbnQoJGVsZW1lbnQuZGF0YSgnb25saW5lLXNpbmNlJyksIDEwKTtcbiAgICAgICAgICAgIGlmIChvbmxpbmVTaW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gdGhpcy5jYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3cob25saW5lU2luY2UpO1xuICAgICAgICAgICAgICAgICRlbGVtZW50LnRleHQoYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09ubGluZX0gJHtkdXJhdGlvbn1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSB0aW1lbGluZSB2aXN1YWxpemF0aW9uIGZvciBhIGRldmljZSdzIGhpc3RvcnlcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzZXNzaW9ucyAtIEFycmF5IG9mIHNlc3Npb24gZXZlbnRzIGZvciB0aGUgZGV2aWNlXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGRldmljZUlkIC0gVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBkZXZpY2VcbiAgICAgKiBAcmV0dXJucyB7U3RyaW5nfSBIVE1MIGZvciB0aGUgdGltZWxpbmVcbiAgICAgKi9cbiAgICBjcmVhdGVEZXZpY2VUaW1lbGluZShzZXNzaW9ucywgZGV2aWNlSWQpIHtcbiAgICAgICAgaWYgKCFzZXNzaW9ucyB8fCBzZXNzaW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCB0aW1lIHJhbmdlIChsYXN0IDI0IGhvdXJzKVxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG5cbiAgICAgICAgLy8gRmlsdGVyIHNlc3Npb25zIHdpdGhpbiBsYXN0IDI0IGhvdXJzIChzZXNzaW9ucyBhcmUgc29ydGVkIG5ld2VzdCBmaXJzdClcbiAgICAgICAgY29uc3QgcmVjZW50U2Vzc2lvbnMgPSBzZXNzaW9ucy5maWx0ZXIocyA9PiBzLnRpbWVzdGFtcCA+PSBkYXlBZ28pO1xuICAgICAgICBpZiAocmVjZW50U2Vzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7IC8vIE5vIHJlY2VudCBhY3Rpdml0eVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRpbWVsaW5lIHNlZ21lbnRzICg5NiBzZWdtZW50cyBmb3IgMjQgaG91cnMsIDE1IG1pbnV0ZXMgZWFjaClcbiAgICAgICAgY29uc3Qgc2VnbWVudER1cmF0aW9uID0gMTUgKiA2MDsgLy8gMTUgbWludXRlcyBpbiBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gOTY7XG4gICAgICAgIGNvbnN0IHNlZ21lbnREYXRhID0gbmV3IEFycmF5KHNlZ21lbnRzKS5maWxsKCdncmV5Jyk7XG5cbiAgICAgICAgLy8gUmV2ZXJzZSBzZXNzaW9ucyB0byBwcm9jZXNzIGZyb20gb2xkZXN0IHRvIG5ld2VzdFxuICAgICAgICBjb25zdCBjaHJvbm9sb2dpY2FsU2Vzc2lvbnMgPSBbLi4ucmVjZW50U2Vzc2lvbnNdLnJldmVyc2UoKTtcblxuICAgICAgICAvLyBQcm9jZXNzIHNlc3Npb25zIHRvIGZpbGwgc2VnbWVudHNcbiAgICAgICAgY2hyb25vbG9naWNhbFNlc3Npb25zLmZvckVhY2goKHNlc3Npb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0U2Vzc2lvbiA9IGNocm9ub2xvZ2ljYWxTZXNzaW9uc1tpbmRleCArIDFdOyAvLyBOZXh0IGV2ZW50IGluIHRpbWVcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IHNlc3Npb24udGltZXN0YW1wO1xuICAgICAgICAgICAgY29uc3QgZW5kVGltZSA9IG5leHRTZXNzaW9uID8gbmV4dFNlc3Npb24udGltZXN0YW1wIDogbm93O1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgc3RhdHVzIGNvbG9yIGJhc2VkIG9uIGV2ZW50IHR5cGUgYW5kIHN0YXR1c1xuICAgICAgICAgICAgbGV0IGNvbG9yID0gJ2dyZXknO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBldmVudCB0eXBlIGZpcnN0XG4gICAgICAgICAgICBpZiAoc2Vzc2lvbi5ldmVudF90eXBlID09PSAnZGV2aWNlX2FkZGVkJyB8fCBzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdzdGF0dXNfY2hhbmdlJykge1xuICAgICAgICAgICAgICAgIC8vIERldmljZSBjYW1lIG9ubGluZVxuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLnN0YXR1cyA9PT0gJ0F2YWlsYWJsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZXknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2Vzc2lvbi5ldmVudF90eXBlID09PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gRGV2aWNlIHdlbnQgb2ZmbGluZSAtIHNlZ21lbnRzIEFGVEVSIHRoaXMgZXZlbnQgc2hvdWxkIGJlIGdyZXlcbiAgICAgICAgICAgICAgICBjb2xvciA9ICdncmV5JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnKSB7XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBhdmFpbGFibGUgc3RhdHVzXG4gICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaWxsIHNlZ21lbnRzIGZvciB0aGlzIHNlc3Npb24gcGVyaW9kXG4gICAgICAgICAgICBmb3IgKGxldCB0aW1lID0gc3RhcnRUaW1lOyB0aW1lIDwgZW5kVGltZSAmJiB0aW1lIDw9IG5vdzsgdGltZSArPSBzZWdtZW50RHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWdtZW50SW5kZXggPSBNYXRoLmZsb29yKCh0aW1lIC0gZGF5QWdvKSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnRJbmRleCA+PSAwICYmIHNlZ21lbnRJbmRleCA8IHNlZ21lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW3NlZ21lbnRJbmRleF0gPSBjb2xvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIHRpbWVsaW5lIEhUTUxcbiAgICAgICAgbGV0IHRpbWVsaW5lSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXZpY2UtdGltZWxpbmVcIiBzdHlsZT1cIm1hcmdpbjogMTBweCAwO1wiPlxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJkaXNwbGF5OiBmbGV4OyB3aWR0aDogMTAwJTsgaGVpZ2h0OiAxMnB4OyBiYWNrZ3JvdW5kOiAjZjNmNGY1OyBib3JkZXItcmFkaXVzOiAzcHg7IG92ZXJmbG93OiBoaWRkZW47XCI+XG4gICAgICAgIGA7XG5cbiAgICAgICAgc2VnbWVudERhdGEuZm9yRWFjaCgoY29sb3IsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50V2lkdGggPSAxMDAgLyBzZWdtZW50cztcbiAgICAgICAgICAgIGNvbnN0IGJnQ29sb3IgPSBjb2xvciA9PT0gJ2dyZWVuJyA/ICcjMjFiYTQ1JyA6ICcjZThlOGU4JztcbiAgICAgICAgICAgIGNvbnN0IGJvcmRlckxlZnQgPSBpbmRleCA+IDAgPyAnMXB4IHNvbGlkIHJnYmEoMjU1LDI1NSwyNTUsMC4yKScgOiAnbm9uZSc7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIGZvciB0aGlzIHNlZ21lbnRcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRUaW1lID0gZGF5QWdvICsgKGluZGV4ICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHNlZ21lbnREYXRlID0gbmV3IERhdGUoc2VnbWVudFRpbWUgKiAxMDAwKTtcblxuICAgICAgICAgICAgLy8gR2V0IHVzZXIncyBsb2NhbGVcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsZSA9IFNlbWFudGljTG9jYWxpemF0aW9uLmdldFVzZXJMb2NhbGUoKTtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVTdHIgPSBzZWdtZW50RGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcobG9jYWxlLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pO1xuXG4gICAgICAgICAgICB0aW1lbGluZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJ3aWR0aDogJHtzZWdtZW50V2lkdGh9JTsgaGVpZ2h0OiAxMDAlOyBiYWNrZ3JvdW5kLWNvbG9yOiAke2JnQ29sb3J9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgYm94LXNpemluZzogYm9yZGVyLWJveDsgYm9yZGVyLWxlZnQ6ICR7Ym9yZGVyTGVmdH07XCJcbiAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiJHt0aW1lU3RyfSAtICR7Y29sb3IgPT09ICdncmVlbicgPyAnT25saW5lJyA6ICdPZmZsaW5lJ31cIj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRpbWUgbGFiZWxzIHdpdGggbG9jYWxpemF0aW9uXG4gICAgICAgIGNvbnN0IGhvdXJzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuZXhfSG91cnNfU2hvcnQ7XG5cbiAgICAgICAgdGltZWxpbmVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuOyBtYXJnaW4tdG9wOiAycHg7IGZvbnQtc2l6ZTogMTBweDsgY29sb3I6ICM5OTk7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjI0JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MTgke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4xMiR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjYke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob3d9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG5cbiAgICAgICAgcmV0dXJuIHRpbWVsaW5lSHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lbGluZSB0b29sdGlwcyBhZnRlciByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb21hbnRpYyBVSSB0b29sdGlwcyBmb3IgdGltZWxpbmUgc2VnbWVudHNcbiAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3Q/LmZpbmQoJy5kZXZpY2UtdGltZWxpbmUgW3RpdGxlXScpLnBvcHVwKHtcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ21pbmknLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBhdXRoZW50aWNhdGlvbiBmYWlsdXJlIHN0YXRpc3RpY3MgYW5kIGJhbm5lZCBJUHNcbiAgICAgKi9cbiAgICBsb2FkU2VjdXJpdHlEYXRhKCkge1xuICAgICAgICBjb25zdCBleHRlbnNpb24gPSB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZDtcblxuICAgICAgICBpZiAoIWV4dGVuc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmV0Y2ggYXV0aCBmYWlsdXJlcyB2aWEgU2lwQVBJXG4gICAgICAgIFNpcEFQSS5nZXRBdXRoRmFpbHVyZVN0YXRzKGV4dGVuc2lvbiwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN1cml0eURhdGEgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlY3VyaXR5RGF0YSA9IHt9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGZXRjaCBiYW5uZWQgSVBzIHZpYSBGaXJld2FsbEFQSVxuICAgICAgICAgICAgRmlyZXdhbGxBUEkuZ2V0QmFubmVkSXBzKChiYW5uZWRSZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChiYW5uZWRSZXNwb25zZSAmJiBiYW5uZWRSZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iYW5uZWRJcHMgPSBiYW5uZWRSZXNwb25zZS5kYXRhIHx8IHt9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmFubmVkSXBzID0ge307XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gUmVuZGVyIHRoZSBjb21iaW5lZCBkYXRhXG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJTZWN1cml0eVRhYmxlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzZWN1cml0eSB0YWJsZSB3aXRoIGNvbG9yLWNvZGVkIHJvd3NcbiAgICAgKiBSZWQgcm93ID0gYmFubmVkIElQLCBHcmVlbiByb3cgPSBub3QgYmFubmVkXG4gICAgICovXG4gICAgcmVuZGVyU2VjdXJpdHlUYWJsZSgpIHtcbiAgICAgICAgY29uc3QgdGJvZHkgPSB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJ3Rib2R5Jyk7XG4gICAgICAgIHRib2R5LmVtcHR5KCk7XG5cbiAgICAgICAgY29uc3QgZmFpbHVyZXMgPSB0aGlzLnNlY3VyaXR5RGF0YTtcblxuICAgICAgICBpZiAoIWZhaWx1cmVzIHx8IE9iamVjdC5rZXlzKGZhaWx1cmVzKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuaGlkZSgpO1xuICAgICAgICAgICAgdGhpcy4kbm9TZWN1cml0eURhdGEuc2hvdygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy4kc2VjdXJpdHlUYWJsZS5zaG93KCk7XG4gICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhLmhpZGUoKTtcblxuICAgICAgICAvLyBJdGVyYXRlIHRocm91Z2ggZmFpbGVkIGF1dGggSVBzXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGZhaWx1cmVzKS5mb3JFYWNoKChbaXAsIHN0YXRzXSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXNCYW5uZWQgPSB0aGlzLmJhbm5lZElwcy5oYXNPd25Qcm9wZXJ0eShpcCk7XG5cbiAgICAgICAgICAgIC8vIEdldCBjb3VudHJ5IGluZm9ybWF0aW9uIGlmIElQIGlzIGJhbm5lZFxuICAgICAgICAgICAgbGV0IGlwRGlzcGxheSA9IGlwO1xuICAgICAgICAgICAgaWYgKGlzQmFubmVkICYmIHRoaXMuYmFubmVkSXBzW2lwXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlwRGF0YSA9IHRoaXMuYmFubmVkSXBzW2lwXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb3VudHJ5ID0gaXBEYXRhLmNvdW50cnkgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgY291bnRyeU5hbWUgPSBpcERhdGEuY291bnRyeU5hbWUgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGNvdW50cnkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGNvdW50cnkgZmxhZyB3aXRoIHBvcHVwIHRvb2x0aXBcbiAgICAgICAgICAgICAgICAgICAgaXBEaXNwbGF5ID0gYDxzcGFuIGNsYXNzPVwiY291bnRyeS1mbGFnXCIgZGF0YS1jb250ZW50PVwiJHtjb3VudHJ5TmFtZX1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiPjxpIGNsYXNzPVwiZmxhZyAke2NvdW50cnkudG9Mb3dlckNhc2UoKX1cIj48L2k+PC9zcGFuPiR7aXB9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVzZSBGb21hbnRpYyBVSSB0YWJsZSByb3cgc3RhdGVzXG4gICAgICAgICAgICAvLyAnbmVnYXRpdmUnID0gcmVkIHJvdyAoYmFubmVkKVxuICAgICAgICAgICAgY29uc3Qgcm93Q2xhc3MgPSBpc0Jhbm5lZCA/ICduZWdhdGl2ZScgOiAnJztcblxuICAgICAgICAgICAgY29uc3QgbGFzdEF0dGVtcHQgPSBuZXcgRGF0ZShzdGF0cy5sYXN0X2F0dGVtcHQgKiAxMDAwKS50b0xvY2FsZVN0cmluZygpO1xuXG4gICAgICAgICAgICAvLyBTaG93IHVuYmFuIGJ1dHRvbiBvbmx5IGZvciBiYW5uZWQgSVBzXG4gICAgICAgICAgICBjb25zdCBhY3Rpb25CdXR0b24gPSBpc0Jhbm5lZFxuICAgICAgICAgICAgICAgID8gYDxidXR0b24gY2xhc3M9XCJ1aSBtaW5pIHJlZCBpY29uIGJ1dHRvbiB1bmJhbi1pcFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWlwPVwiJHtpcH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS10b29sdGlwPVwiJHtnbG9iYWxUcmFuc2xhdGUuZXhfU2VjdXJpdHlVbmJhbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wb3NpdGlvbj1cImxlZnQgY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidW5sb2NrIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgPC9idXR0b24+YFxuICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgIGNvbnN0IHJvdyA9IGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCIke3Jvd0NsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+PHN0cm9uZz4ke2lwRGlzcGxheX08L3N0cm9uZz48L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+JHtzdGF0cy5jb3VudH08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+JHtsYXN0QXR0ZW1wdH08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7YWN0aW9uQnV0dG9ufTwvdGQ+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIGA7XG5cbiAgICAgICAgICAgIHRib2R5LmFwcGVuZChyb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciB1bmJhbiBidXR0b25zXG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuZmluZCgnW2RhdGEtdG9vbHRpcF0nKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIGNvdW50cnkgZmxhZ3NcbiAgICAgICAgdGhpcy4kc2VjdXJpdHlUYWJsZS5maW5kKCcuY291bnRyeS1mbGFnJykucG9wdXAoe1xuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIHVuYmFuIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJy51bmJhbi1pcCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZVVuYmFuQ2xpY2soZSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgdW5iYW4gYnV0dG9uIGNsaWNrXG4gICAgICogQHBhcmFtIHtFdmVudH0gZSAtIENsaWNrIGV2ZW50XG4gICAgICovXG4gICAgaGFuZGxlVW5iYW5DbGljayhlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgY29uc3QgaXAgPSAkYnV0dG9uLmRhdGEoJ2lwJyk7XG5cbiAgICAgICAgaWYgKCFpcCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIENhbGwgRmlyZXdhbGxBUEkgdG8gdW5iYW4gSVBcbiAgICAgICAgRmlyZXdhbGxBUEkudW5iYW5JcChpcCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCByZWxvYWQgc2VjdXJpdHkgZGF0YSAtIHRhYmxlIHdpbGwgdXBkYXRlIHZpc3VhbGx5XG4gICAgICAgICAgICAgICAgLy8gUmVkIHJvdyB3aWxsIGJlY29tZSBncmVlbiByb3dcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yLmxvYWRTZWN1cml0eURhdGEoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBzaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgOiB7ZXJyb3I6IFsnRmFpbGVkIHRvIHVuYmFuIElQJ119O1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1zZyk7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBvbiBwYWdlIHVubG9hZFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIENsZWFyIHVwZGF0ZSB0aW1lclxuICAgICAgICBpZiAodGhpcy51cGRhdGVUaW1lcikge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnVwZGF0ZVRpbWVyKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVGltZXIgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuY3VycmVudEV4dGVuc2lvbklkID0gbnVsbDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBleHRlbnNpb24tbW9kaWZ5LmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV4dGVuc2lvbk1vZGlmeVN0YXR1c01vbml0b3I7XG59Il19