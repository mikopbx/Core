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
      var _sessions$, _sessions$2;

      var _ref2 = _slicedToArray(_ref, 2),
          deviceKey = _ref2[0],
          sessions = _ref2[1];

      var _deviceKey$split = deviceKey.split('|'),
          _deviceKey$split2 = _slicedToArray(_deviceKey$split, 2),
          userAgent = _deviceKey$split2[0],
          ip = _deviceKey$split2[1];

      var deviceName = userAgent || 'Unknown Device';
      var deviceIP = ip && ip !== 'Unknown' ? ip : '';
      var deviceId = "device-".concat(deviceIndex); // Get country information from the most recent session

      var country = ((_sessions$ = sessions[0]) === null || _sessions$ === void 0 ? void 0 : _sessions$.country) || '';
      var countryName = ((_sessions$2 = sessions[0]) === null || _sessions$2 === void 0 ? void 0 : _sessions$2.countryName) || ''; // Build country flag HTML

      var countryFlagHtml = '';

      if (country && country !== 'LOCAL') {
        // International IP - show country flag
        countryFlagHtml = "<span class=\"country-flag\" data-content=\"".concat(countryName, "\" data-position=\"top center\" style=\"margin-left: 4px;\"><i class=\"flag ").concat(country.toLowerCase(), "\"></i></span>");
      } else if (country === 'LOCAL') {
        // Local network - show network icon instead of flag
        countryFlagHtml = "<span class=\"country-flag\" data-content=\"".concat(countryName, "\" data-position=\"top center\" style=\"margin-left: 4px; color: #999;\"><i class=\"ethernet icon\"></i></span>");
      } // Create timeline HTML for this device


      var timelineHtml = _this4.createDeviceTimeline(sessions, deviceId); // Device header - exactly as requested


      historyHtml += "\n                <div class=\"item\">\n                    <div class=\"content\">\n                        <div class=\"ui small header\">\n                            <i class=\"mobile alternate icon\"></i>\n                            <div class=\"content\">\n                                ".concat(deviceName, "\n                                ").concat(deviceIP ? "<span style=\"color: grey; font-size:0.7em;\">".concat(deviceIP, "</span>") : '', "\n                                ").concat(countryFlagHtml, "\n                            </div>\n                        </div>\n                        ").concat(timelineHtml, "\n                        <div class=\"description\">\n            "); // Sessions timeline - simplified

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
    var _this$$deviceHistoryL2, _this$$deviceHistoryL3;

    // Initialize Fomantic UI tooltips for timeline segments
    (_this$$deviceHistoryL2 = this.$deviceHistoryList) === null || _this$$deviceHistoryL2 === void 0 ? void 0 : _this$$deviceHistoryL2.find('.device-timeline [title]').popup({
      variation: 'mini',
      position: 'top center',
      delay: {
        show: 300,
        hide: 100
      }
    }); // Initialize popups for country flags in history

    (_this$$deviceHistoryL3 = this.$deviceHistoryList) === null || _this$$deviceHistoryL3 === void 0 ? void 0 : _this$$deviceHistoryL3.find('.country-flag').popup({
      hoverable: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvciIsImNoYW5uZWxJZCIsImlzSW5pdGlhbGl6ZWQiLCJjdXJyZW50RXh0ZW5zaW9uSWQiLCIkc3RhdHVzTGFiZWwiLCIkYWN0aXZlRGV2aWNlc0xpc3QiLCIkZGV2aWNlSGlzdG9yeUxpc3QiLCIkc2VjdXJpdHlUYWJsZSIsIiRub1NlY3VyaXR5RGF0YSIsInNlY3VyaXR5RGF0YSIsImJhbm5lZElwcyIsInVwZGF0ZVRpbWVyIiwiaW5pdGlhbGl6ZSIsIiRpc05ld0ZpZWxkIiwiJCIsImlzTmV3IiwibGVuZ3RoIiwidmFsIiwiZXh0cmFjdEV4dGVuc2lvbklkIiwiY2FjaGVFbGVtZW50cyIsInN1YnNjcmliZVRvRXZlbnRzIiwibG9hZEluaXRpYWxTdGF0dXMiLCJsb2FkU2VjdXJpdHlEYXRhIiwic3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyIiwiJG51bWJlckZpZWxkIiwiZXh0ZW5zaW9uTnVtYmVyIiwiaW5wdXRtYXNrIiwiZSIsInJlcGxhY2UiLCJ1cmxNYXRjaCIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJtYXRjaCIsInNldFRpbWVvdXQiLCJTaXBBUEkiLCJnZXRTdGF0dXMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJ1cGRhdGVTdGF0dXMiLCJsb2FkSGlzdG9yaWNhbERhdGEiLCJnZXRIaXN0b3J5IiwiaGlzdG9yeSIsImRpc3BsYXlIaXN0b3JpY2FsRGF0YSIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJzdGF0dXNlcyIsInN0YXR1c0RhdGEiLCJ1cGRhdGVTdGF0dXNMYWJlbCIsInN0YXR1cyIsInVwZGF0ZUFjdGl2ZURldmljZXMiLCJkZXZpY2VzIiwiY29sb3IiLCJnZXRDb2xvckZvclN0YXR1cyIsImxhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImh0bWwiLCJBcnJheSIsImlzQXJyYXkiLCJleF9Ob0FjdGl2ZURldmljZXMiLCJkZXZpY2VzSHRtbCIsImZvckVhY2giLCJkZXZpY2UiLCJ1c2VyQWdlbnQiLCJ1c2VyX2FnZW50IiwiaXAiLCJjb250YWN0X2lwIiwicG9ydCIsImlwRGlzcGxheSIsInJ0dCIsInVuZGVmaW5lZCIsInRvRml4ZWQiLCJpZCIsImF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMiLCJmaW5kIiwib24iLCJwcmV2ZW50RGVmYXVsdCIsIiRsYWJlbCIsIiRpdGVtIiwiY2xvc2VzdCIsImRhdGFJZCIsInBhcnRzIiwic3BsaXQiLCJuYXZpZ2F0b3IiLCJjbGlwYm9hcmQiLCJ3cml0ZVRleHQiLCJ0aGVuIiwidHJhbnNpdGlvbiIsInBvcHVwIiwiY29udGVudCIsImV4X0lwQ29waWVkIiwicG9zaXRpb24iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCIkdGVtcCIsImFwcGVuZCIsInNlbGVjdCIsImRvY3VtZW50IiwiZXhlY0NvbW1hbmQiLCJyZW1vdmUiLCJjc3MiLCJoaXN0b3J5RGF0YSIsImV4X05vSGlzdG9yeUF2YWlsYWJsZSIsImRldmljZUdyb3VwcyIsImdyb3VwSGlzdG9yeUJ5RGV2aWNlIiwiaGlzdG9yeUh0bWwiLCJPYmplY3QiLCJlbnRyaWVzIiwiZGV2aWNlSW5kZXgiLCJkZXZpY2VLZXkiLCJzZXNzaW9ucyIsImRldmljZU5hbWUiLCJkZXZpY2VJUCIsImRldmljZUlkIiwiY291bnRyeSIsImNvdW50cnlOYW1lIiwiY291bnRyeUZsYWdIdG1sIiwidG9Mb3dlckNhc2UiLCJ0aW1lbGluZUh0bWwiLCJjcmVhdGVEZXZpY2VUaW1lbGluZSIsInNlc3Npb24iLCJpbmRleCIsImlzT25saW5lIiwiZXZlbnRMYWJlbCIsImV2ZW50X3R5cGUiLCJleF9EZXZpY2VEaXNjb25uZWN0ZWQiLCJleF9EZXZpY2VDb25uZWN0ZWQiLCJydHRMYWJlbCIsImdldFJ0dExhYmVsIiwiZGF0ZXRpbWUiLCJmb3JtYXREYXRlVGltZSIsImRhdGUiLCJ0aW1lc3RhbXAiLCJzdGF0dXNDbGFzcyIsInN0YXR1c1RpdGxlIiwiZHVyYXRpb25IdG1sIiwiZXhfT25saW5lIiwiY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93IiwiZHVyYXRpb24iLCJjYWxjdWxhdGVEdXJhdGlvbiIsImR1cmF0aW9uVGV4dCIsImV4X09mZmxpbmUiLCJpbml0aWFsaXplVGltZWxpbmVUb29sdGlwcyIsImdyb3VwcyIsImVudHJ5IiwiaXBfYWRkcmVzcyIsImRldGFpbHMiLCJ0cmltIiwicHVzaCIsImtleXMiLCJrZXkiLCJzb3J0IiwiYSIsImIiLCJzb3J0ZWRHcm91cHMiLCJhTGF0ZXN0IiwiYkxhdGVzdCIsInNvcnRlZE9iamVjdCIsInZhbHVlIiwiY3VycmVudFRpbWVzdGFtcCIsInByZXZpb3VzVGltZXN0YW1wIiwiZGlmZiIsIk1hdGgiLCJhYnMiLCJtaW51dGVzIiwiZmxvb3IiLCJob3VycyIsImRheXMiLCJmb3JtYXRUaW1lIiwiZGF0ZVN0ciIsImluY2x1ZGVzIiwidGltZVBhcnQiLCJEYXRlIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwidGltZSIsIm5vdyIsImlzVG9kYXkiLCJ0b0RhdGVTdHJpbmciLCJ5ZXN0ZXJkYXkiLCJzZXREYXRlIiwiZ2V0RGF0ZSIsImlzWWVzdGVyZGF5IiwibG9jYWxlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJnZXRVc2VyTG9jYWxlIiwidGltZVN0ciIsImhvdXIiLCJtaW51dGUiLCJzZWNvbmQiLCJ5ZXN0ZXJkYXlUZXh0IiwiZXhfWWVzdGVyZGF5IiwidG9Mb2NhbGVEYXRlU3RyaW5nIiwiZGF5IiwibW9udGgiLCJjbGVhckludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJ1cGRhdGVPbmxpbmVEdXJhdGlvbnMiLCIkZHVyYXRpb25zIiwiZWFjaCIsImVsZW1lbnQiLCIkZWxlbWVudCIsIm9ubGluZVNpbmNlIiwicGFyc2VJbnQiLCJ0ZXh0IiwiZGF5QWdvIiwicmVjZW50U2Vzc2lvbnMiLCJmaWx0ZXIiLCJzIiwic2VnbWVudER1cmF0aW9uIiwic2VnbWVudHMiLCJzZWdtZW50RGF0YSIsImZpbGwiLCJjaHJvbm9sb2dpY2FsU2Vzc2lvbnMiLCJyZXZlcnNlIiwibmV4dFNlc3Npb24iLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwic2VnbWVudEluZGV4Iiwic2VnbWVudFdpZHRoIiwiYmdDb2xvciIsImJvcmRlckxlZnQiLCJzZWdtZW50VGltZSIsInNlZ21lbnREYXRlIiwiaG91cnNMYWJlbCIsImV4X0hvdXJzX1Nob3J0IiwiZXhfTm93IiwidmFyaWF0aW9uIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImhvdmVyYWJsZSIsImV4dGVuc2lvbiIsImdldEF1dGhGYWlsdXJlU3RhdHMiLCJGaXJld2FsbEFQSSIsImdldEJhbm5lZElwcyIsImJhbm5lZFJlc3BvbnNlIiwicmVuZGVyU2VjdXJpdHlUYWJsZSIsInRib2R5IiwiZW1wdHkiLCJmYWlsdXJlcyIsInN0YXRzIiwiaXNCYW5uZWQiLCJoYXNPd25Qcm9wZXJ0eSIsImlwRGF0YSIsInJvd0NsYXNzIiwibGFzdEF0dGVtcHQiLCJsYXN0X2F0dGVtcHQiLCJ0b0xvY2FsZVN0cmluZyIsImFjdGlvbkJ1dHRvbiIsImV4X1NlY3VyaXR5VW5iYW4iLCJyb3ciLCJjb3VudCIsImhhbmRsZVVuYmFuQ2xpY2siLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsInVuYmFuSXAiLCJlcnJvck1zZyIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJkZXN0cm95IiwidW5zdWJzY3JpYmUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QSxXQUFXLENBQUNDLGVBQVosQ0FBNEJILFFBQTVCO0FBQ0FILFFBQUFBLE9BQU8sQ0FBQ3hNLFdBQVIsQ0FBb0Isa0JBQXBCO0FBQ0g7QUFDSixLQWJEO0FBY0gsR0FyOUJnQzs7QUF1OUJqQztBQUNKO0FBQ0E7QUFDSStNLEVBQUFBLE9BMTlCaUMscUJBMDlCdkI7QUFDTjtBQUNBLFFBQUksS0FBS2hRLFdBQVQsRUFBc0I7QUFDbEI4TCxNQUFBQSxhQUFhLENBQUMsS0FBSzlMLFdBQU4sQ0FBYjtBQUNBLFdBQUtBLFdBQUwsR0FBbUIsSUFBbkI7QUFDSDs7QUFFRCxRQUFJLE9BQU9rQyxRQUFQLEtBQW9CLFdBQXhCLEVBQXFDO0FBQ2pDQSxNQUFBQSxRQUFRLENBQUMrTixXQUFULENBQXFCLGtCQUFyQjtBQUNIOztBQUNELFNBQUsxUSxhQUFMLEdBQXFCLEtBQXJCO0FBQ0EsU0FBS0Msa0JBQUwsR0FBMEIsSUFBMUI7QUFDSDtBQXQrQmdDLENBQXJDLEMsQ0F5K0JBOztBQUNBLElBQUksT0FBTzBRLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjlRLDRCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgRXZlbnRCdXMsIFNpcEFQSSwgRmlyZXdhbGxBUEksIFVzZXJNZXNzYWdlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBNb2RpZnkgU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsaWZpZWQgc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbiBtb2RpZnkgcGFnZTpcbiAqIC0gU2luZ2xlIEFQSSBjYWxsIG9uIGluaXRpYWxpemF0aW9uXG4gKiAtIFJlYWwtdGltZSB1cGRhdGVzIHZpYSBFdmVudEJ1cyBvbmx5XG4gKiAtIE5vIHBlcmlvZGljIHBvbGxpbmdcbiAqIC0gQ2xlYW4gZGV2aWNlIGxpc3QgYW5kIGhpc3RvcnkgZGlzcGxheVxuICovXG5jb25zdCBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ2V4dGVuc2lvbi1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGN1cnJlbnRFeHRlbnNpb25JZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNMYWJlbDogbnVsbCxcbiAgICAkYWN0aXZlRGV2aWNlc0xpc3Q6IG51bGwsXG4gICAgJGRldmljZUhpc3RvcnlMaXN0OiBudWxsLFxuICAgICRzZWN1cml0eVRhYmxlOiBudWxsLFxuICAgICRub1NlY3VyaXR5RGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFNlY3VyaXR5IGRhdGFcbiAgICAgKi9cbiAgICBzZWN1cml0eURhdGE6IHt9LFxuICAgIGJhbm5lZElwczoge30sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgaW50ZXJ2YWwgdGltZXJcbiAgICAgKi9cbiAgICB1cGRhdGVUaW1lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvclxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgZXh0ZW5zaW9uIChub3QgeWV0IHNhdmVkIGluIGRhdGFiYXNlKVxuICAgICAgICAvLyBDaGVjayBoaWRkZW4gZmllbGQgZGlyZWN0bHkgaW5zdGVhZCBvZiB1c2luZyBTZW1hbnRpYyBVSSBmb3JtIEFQSVxuICAgICAgICBjb25zdCAkaXNOZXdGaWVsZCA9ICQoJyNleHRlbnNpb25zLWZvcm0gaW5wdXRbbmFtZT1cIl9pc05ld1wiXScpO1xuICAgICAgICBjb25zdCBpc05ldyA9ICRpc05ld0ZpZWxkLmxlbmd0aCA+IDAgJiYgJGlzTmV3RmllbGQudmFsKCkgPT09ICd0cnVlJztcblxuICAgICAgICAvLyBTa2lwIHN0YXR1cyBtb25pdG9yaW5nIGZvciBuZXcgZXh0ZW5zaW9uc1xuICAgICAgICBpZiAoaXNOZXcpIHtcbiAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZXh0ZW5zaW9uIG51bWJlciBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQgPSB0aGlzLmV4dHJhY3RFeHRlbnNpb25JZCgpO1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG5cbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRzKCk7XG5cbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgaW5pdGlhbCBBUEkgY2FsbFxuICAgICAgICB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzZWN1cml0eSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFNlY3VyaXR5RGF0YSgpO1xuXG4gICAgICAgIC8vIFN0YXJ0IHRpbWVyIGZvciB1cGRhdGluZyBvbmxpbmUgZHVyYXRpb25zXG4gICAgICAgIHRoaXMuc3RhcnREdXJhdGlvblVwZGF0ZVRpbWVyKCk7XG5cbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgZXh0ZW5zaW9uIElEIGZyb20gdGhlIGZvcm1cbiAgICAgKi9cbiAgICBleHRyYWN0RXh0ZW5zaW9uSWQoKSB7XG4gICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gZ2V0IHRoZSBwaG9uZSBudW1iZXIgZnJvbSBmb3JtIGZpZWxkIChwcmltYXJ5KVxuICAgICAgICBjb25zdCAkbnVtYmVyRmllbGQgPSAkKCdpbnB1dFtuYW1lPVwibnVtYmVyXCJdJyk7XG4gICAgICAgIGlmICgkbnVtYmVyRmllbGQubGVuZ3RoICYmICRudW1iZXJGaWVsZC52YWwoKSkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB1bm1hc2tlZCB2YWx1ZSBpZiBpbnB1dG1hc2sgaXMgYXBwbGllZFxuICAgICAgICAgICAgbGV0IGV4dGVuc2lvbk51bWJlcjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaW5wdXRtYXNrIGlzIGF2YWlsYWJsZSBhbmQgYXBwbGllZCB0byB0aGUgZmllbGRcbiAgICAgICAgICAgIGlmICh0eXBlb2YgJG51bWJlckZpZWxkLmlucHV0bWFzayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSAob25seSB0aGUgYWN0dWFsIGlucHV0IHdpdGhvdXQgbWFzayBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25OdW1iZXIgPSAkbnVtYmVyRmllbGQuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBpZiBpbnB1dG1hc2sgbWV0aG9kIGZhaWxzXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk51bWJlciA9ICRudW1iZXJGaWVsZC52YWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdGhlIHZhbHVlIC0gcmVtb3ZlIGFueSByZW1haW5pbmcgbWFzayBjaGFyYWN0ZXJzIGxpa2UgdW5kZXJzY29yZVxuICAgICAgICAgICAgZXh0ZW5zaW9uTnVtYmVyID0gZXh0ZW5zaW9uTnVtYmVyLnJlcGxhY2UoL1teMC05XS9nLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgcmV0dXJuIGlmIHdlIGhhdmUgYWN0dWFsIGRpZ2l0c1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk51bWJlciAmJiBleHRlbnNpb25OdW1iZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBleHRlbnNpb25OdW1iZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIFVSTCBwYXJhbWV0ZXJcbiAgICAgICAgY29uc3QgdXJsTWF0Y2ggPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL1xcL2V4dGVuc2lvbnNcXC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgaWYgKHVybE1hdGNoICYmIHVybE1hdGNoWzFdKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGRhdGFiYXNlIElELCB3ZSBuZWVkIHRvIHdhaXQgZm9yIGZvcm0gdG8gbG9hZFxuICAgICAgICAgICAgLy8gV2UnbGwgZ2V0IHRoZSBhY3R1YWwgZXh0ZW5zaW9uIG51bWJlciBhZnRlciBmb3JtIGxvYWRzXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICBjYWNoZUVsZW1lbnRzKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNMYWJlbCA9ICQoJyNzdGF0dXMnKTtcbiAgICAgICAgdGhpcy4kYWN0aXZlRGV2aWNlc0xpc3QgPSAkKCcjYWN0aXZlLWRldmljZXMtbGlzdCcpO1xuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdCA9ICQoJyNkZXZpY2UtaGlzdG9yeS1saXN0Jyk7XG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUgPSAkKCcjc2VjdXJpdHktZmFpbGVkLWF1dGgtdGFibGUnKTtcbiAgICAgICAgdGhpcy4kbm9TZWN1cml0eURhdGEgPSAkKCcjbm8tc2VjdXJpdHktZGF0YScpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBpbml0aWFsIHN0YXR1cyB3aXRoIHNpbmdsZSBBUEkgY2FsbFxuICAgICAqL1xuICAgIGxvYWRJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBSZS1jaGVjayBleHRlbnNpb24gSUQgYWZ0ZXIgZm9ybSBsb2Fkc1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IHRoaXMuZXh0cmFjdEV4dGVuc2lvbklkKCk7XG4gICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudEV4dGVuc2lvbklkKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IGFnYWluIGFmdGVyIGRlbGF5IChmb3JtIG1pZ2h0IHN0aWxsIGJlIGxvYWRpbmcpXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB0aGlzLmxvYWRJbml0aWFsU3RhdHVzKCksIDUwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgLy8gTWFrZSBzaW5nbGUgQVBJIGNhbGwgZm9yIGN1cnJlbnQgc3RhdHVzXG4gICAgICAgIFNpcEFQSS5nZXRTdGF0dXModGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWxzbyBsb2FkIGhpc3RvcmljYWwgZGF0YVxuICAgICAgICB0aGlzLmxvYWRIaXN0b3JpY2FsRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBoaXN0b3JpY2FsIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkSGlzdG9yaWNhbERhdGEoKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGhpc3RvcnkgZnJvbSBBUElcbiAgICAgICAgU2lwQVBJLmdldEhpc3RvcnkodGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaGlzdG9yeSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGxheUhpc3RvcmljYWxEYXRhKHJlc3BvbnNlLmRhdGEuaGlzdG9yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVmcmVzaCBzZWN1cml0eSBkYXRhIG9uIGNvbmZpZyBjaGFuZ2VzXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMubG9hZFNlY3VyaXR5RGF0YSgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBFdmVudEJ1cyBtZXNzYWdlXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdyBzZW5kcyBkYXRhIGRpcmVjdGx5IHdpdGhvdXQgZG91YmxlIG5lc3RpbmdcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2U7XG4gICAgICAgIGlmIChkYXRhLnN0YXR1c2VzICYmIGRhdGEuc3RhdHVzZXNbdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWRdKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhkYXRhLnN0YXR1c2VzW3RoaXMuY3VycmVudEV4dGVuc2lvbklkXSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXNEYXRhKSB7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdHVzIGxhYmVsXG4gICAgICAgIHRoaXMudXBkYXRlU3RhdHVzTGFiZWwoc3RhdHVzRGF0YS5zdGF0dXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBkZXZpY2VzXG4gICAgICAgIHRoaXMudXBkYXRlQWN0aXZlRGV2aWNlcyhzdGF0dXNEYXRhLmRldmljZXMgfHwgW10pO1xuICAgICAgICBcbiAgICAgICAgLy8gRG9uJ3QgYWRkIHRvIGhpc3RvcnkgLSBoaXN0b3J5IGlzIGxvYWRlZCBmcm9tIEFQSSBvbmx5XG4gICAgICAgIC8vIHRoaXMuYWRkVG9IaXN0b3J5KHN0YXR1c0RhdGEpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBsYWJlbFxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0xhYmVsKHN0YXR1cykge1xuICAgICAgICBpZiAoIXRoaXMuJHN0YXR1c0xhYmVsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpO1xuICAgICAgICBjb25zdCBsYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZVtgZXhfU3RhdHVzJHtzdGF0dXN9YF0gfHwgc3RhdHVzO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBjb250ZW50XG4gICAgICAgIHRoaXMuJHN0YXR1c0xhYmVsXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZXkgZ3JlZW4gcmVkIHllbGxvdyBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhjb2xvcilcbiAgICAgICAgICAgIC5odG1sKGAke2xhYmVsfWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGNvbG9yIGZvciBzdGF0dXMgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpIHtcbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ0F2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVbmF2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGNhc2UgJ0Rpc2FibGVkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWN0aXZlIGRldmljZXMgbGlzdFxuICAgICAqL1xuICAgIHVwZGF0ZUFjdGl2ZURldmljZXMoZGV2aWNlcykge1xuICAgICAgICBpZiAoIXRoaXMuJGFjdGl2ZURldmljZXNMaXN0IHx8ICFBcnJheS5pc0FycmF5KGRldmljZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGV2aWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0Lmh0bWwoYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJkZXNrdG9wIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9Ob0FjdGl2ZURldmljZXN9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBsaXN0IHdpdGggdGVhbCBsYWJlbHMgbGlrZSB0aGUgb2xkIGVuZHBvaW50LWxpc3RcbiAgICAgICAgbGV0IGRldmljZXNIdG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgXG4gICAgICAgIGRldmljZXMuZm9yRWFjaCgoZGV2aWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1c2VyQWdlbnQgPSBkZXZpY2UudXNlcl9hZ2VudCB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICBjb25zdCBpcCA9IGRldmljZS5pcCB8fCBkZXZpY2UuY29udGFjdF9pcCB8fCAnLSc7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gZGV2aWNlLnBvcnQgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBpcERpc3BsYXkgPSBwb3J0ID8gYCR7aXB9OiR7cG9ydH1gIDogaXA7XG4gICAgICAgICAgICBjb25zdCBydHQgPSBkZXZpY2UucnR0ICE9PSBudWxsICYmIGRldmljZS5ydHQgIT09IHVuZGVmaW5lZCBcbiAgICAgICAgICAgICAgICA/IGAgKCR7ZGV2aWNlLnJ0dC50b0ZpeGVkKDIpfSBtcylgIFxuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBpZCA9IGAke3VzZXJBZ2VudH18JHtpcH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkZXZpY2VzSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLWlkPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRlYWwgbGFiZWxcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7dXNlckFnZW50fVxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRldGFpbFwiPiR7aXBEaXNwbGF5fSR7cnR0fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGV2aWNlc0h0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0Lmh0bWwoZGV2aWNlc0h0bWwpO1xuXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIGNvcHkgSVAgYWRkcmVzc1xuICAgICAgICB0aGlzLmF0dGFjaERldmljZUNsaWNrSGFuZGxlcnMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXR0YWNoIGNsaWNrIGhhbmRsZXJzIHRvIGRldmljZSBsYWJlbHMgZm9yIElQIGNvcHlpbmdcbiAgICAgKi9cbiAgICBhdHRhY2hEZXZpY2VDbGlja0hhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLiRhY3RpdmVEZXZpY2VzTGlzdC5maW5kKCcuaXRlbSAudWkubGFiZWwnKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaXRlbSA9ICRsYWJlbC5jbG9zZXN0KCcuaXRlbScpO1xuICAgICAgICAgICAgY29uc3QgZGF0YUlkID0gJGl0ZW0uZGF0YSgnaWQnKTtcblxuICAgICAgICAgICAgaWYgKCFkYXRhSWQpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBJUCBmcm9tIGRhdGEtaWQgKGZvcm1hdDogXCJVc2VyQWdlbnR8SVBcIilcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZGF0YUlkLnNwbGl0KCd8Jyk7XG4gICAgICAgICAgICBjb25zdCBpcCA9IHBhcnRzWzFdO1xuXG4gICAgICAgICAgICBpZiAoIWlwIHx8IGlwID09PSAnLScpIHJldHVybjtcblxuICAgICAgICAgICAgLy8gQ29weSB0byBjbGlwYm9hcmQgdXNpbmcgdGhlIHNhbWUgbWV0aG9kIGFzIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICAgICAgaWYgKG5hdmlnYXRvci5jbGlwYm9hcmQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpIHtcbiAgICAgICAgICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChpcCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBmZWVkYmFja1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwudHJhbnNpdGlvbigncHVsc2UnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBjaGFuZ2UgdGhlIGxhYmVsIGNvbG9yIHRvIGluZGljYXRlIHN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCd0ZWFsJykuYWRkQ2xhc3MoJ2dyZWVuJyk7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnJlbW92ZUNsYXNzKCdncmVlbicpLmFkZENsYXNzKCd0ZWFsJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgcG9wdXAgbWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X0lwQ29waWVkfTogJHtpcH1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgb246ICdtYW51YWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJ1xuICAgICAgICAgICAgICAgICAgICB9KS5wb3B1cCgnc2hvdycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGxhYmVsLnBvcHVwKCdoaWRlJykucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGNvcHkgSVA6JywgZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgY29uc3QgJHRlbXAgPSAkKCc8aW5wdXQ+Jyk7XG4gICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCgkdGVtcCk7XG4gICAgICAgICAgICAgICAgJHRlbXAudmFsKGlwKS5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnY29weScpO1xuICAgICAgICAgICAgICAgICR0ZW1wLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBmZWVkYmFja1xuICAgICAgICAgICAgICAgICRsYWJlbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgICRsYWJlbC5yZW1vdmVDbGFzcygndGVhbCcpLmFkZENsYXNzKCdncmVlbicpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkbGFiZWwucmVtb3ZlQ2xhc3MoJ2dyZWVuJykuYWRkQ2xhc3MoJ3RlYWwnKTtcbiAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGN1cnNvciBwb2ludGVyIHN0eWxlXG4gICAgICAgIHRoaXMuJGFjdGl2ZURldmljZXNMaXN0LmZpbmQoJy5pdGVtIC51aS5sYWJlbCcpLmNzcygnY3Vyc29yJywgJ3BvaW50ZXInKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IGhpc3RvcmljYWwgZGF0YSBmcm9tIEFQSSB3aXRoIGRldmljZSBncm91cGluZ1xuICAgICAqL1xuICAgIGRpc3BsYXlIaXN0b3JpY2FsRGF0YShoaXN0b3J5RGF0YSkge1xuICAgICAgICBpZiAoIXRoaXMuJGRldmljZUhpc3RvcnlMaXN0IHx8ICFBcnJheS5pc0FycmF5KGhpc3RvcnlEYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGhpc3RvcnlEYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy4kZGV2aWNlSGlzdG9yeUxpc3QuaHRtbChgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImhpc3RvcnkgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4X05vSGlzdG9yeUF2YWlsYWJsZX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdyb3VwIGhpc3RvcnkgYnkgZGV2aWNlXG4gICAgICAgIGNvbnN0IGRldmljZUdyb3VwcyA9IHRoaXMuZ3JvdXBIaXN0b3J5QnlEZXZpY2UoaGlzdG9yeURhdGEpO1xuXG4gICAgICAgIC8vIEJ1aWxkIEhUTUwgZm9yIGdyb3VwZWQgZGlzcGxheSAtIHNpbXBsaWZpZWQgc3RydWN0dXJlXG4gICAgICAgIGxldCBoaXN0b3J5SHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlZCBsaXN0XCI+JztcblxuICAgICAgICBPYmplY3QuZW50cmllcyhkZXZpY2VHcm91cHMpLmZvckVhY2goKFtkZXZpY2VLZXksIHNlc3Npb25zXSwgZGV2aWNlSW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IFt1c2VyQWdlbnQsIGlwXSA9IGRldmljZUtleS5zcGxpdCgnfCcpO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlTmFtZSA9IHVzZXJBZ2VudCB8fCAnVW5rbm93biBEZXZpY2UnO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlSVAgPSAoaXAgJiYgaXAgIT09ICdVbmtub3duJykgPyBpcCA6ICcnO1xuICAgICAgICAgICAgY29uc3QgZGV2aWNlSWQgPSBgZGV2aWNlLSR7ZGV2aWNlSW5kZXh9YDtcblxuICAgICAgICAgICAgLy8gR2V0IGNvdW50cnkgaW5mb3JtYXRpb24gZnJvbSB0aGUgbW9zdCByZWNlbnQgc2Vzc2lvblxuICAgICAgICAgICAgY29uc3QgY291bnRyeSA9IHNlc3Npb25zWzBdPy5jb3VudHJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgY291bnRyeU5hbWUgPSBzZXNzaW9uc1swXT8uY291bnRyeU5hbWUgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGNvdW50cnkgZmxhZyBIVE1MXG4gICAgICAgICAgICBsZXQgY291bnRyeUZsYWdIdG1sID0gJyc7XG4gICAgICAgICAgICBpZiAoY291bnRyeSAmJiBjb3VudHJ5ICE9PSAnTE9DQUwnKSB7XG4gICAgICAgICAgICAgICAgLy8gSW50ZXJuYXRpb25hbCBJUCAtIHNob3cgY291bnRyeSBmbGFnXG4gICAgICAgICAgICAgICAgY291bnRyeUZsYWdIdG1sID0gYDxzcGFuIGNsYXNzPVwiY291bnRyeS1mbGFnXCIgZGF0YS1jb250ZW50PVwiJHtjb3VudHJ5TmFtZX1cIiBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiIHN0eWxlPVwibWFyZ2luLWxlZnQ6IDRweDtcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjb3VudHJ5ID09PSAnTE9DQUwnKSB7XG4gICAgICAgICAgICAgICAgLy8gTG9jYWwgbmV0d29yayAtIHNob3cgbmV0d29yayBpY29uIGluc3RlYWQgb2YgZmxhZ1xuICAgICAgICAgICAgICAgIGNvdW50cnlGbGFnSHRtbCA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIiBzdHlsZT1cIm1hcmdpbi1sZWZ0OiA0cHg7IGNvbG9yOiAjOTk5O1wiPjxpIGNsYXNzPVwiZXRoZXJuZXQgaWNvblwiPjwvaT48L3NwYW4+YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRpbWVsaW5lIEhUTUwgZm9yIHRoaXMgZGV2aWNlXG4gICAgICAgICAgICBjb25zdCB0aW1lbGluZUh0bWwgPSB0aGlzLmNyZWF0ZURldmljZVRpbWVsaW5lKHNlc3Npb25zLCBkZXZpY2VJZCk7XG5cbiAgICAgICAgICAgIC8vIERldmljZSBoZWFkZXIgLSBleGFjdGx5IGFzIHJlcXVlc3RlZFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJtb2JpbGUgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkZXZpY2VOYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RldmljZUlQID8gYDxzcGFuIHN0eWxlPVwiY29sb3I6IGdyZXk7IGZvbnQtc2l6ZTowLjdlbTtcIj4ke2RldmljZUlQfTwvc3Bhbj5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Y291bnRyeUZsYWdIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RpbWVsaW5lSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2Vzc2lvbnMgdGltZWxpbmUgLSBzaW1wbGlmaWVkXG4gICAgICAgICAgICBzZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGV2ZW50IHR5cGUgdG8gZGV0ZXJtaW5lIGFjdHVhbCBkZXZpY2Ugc3RhdHVzXG4gICAgICAgICAgICAgICAgbGV0IGlzT25saW5lID0gc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnO1xuICAgICAgICAgICAgICAgIGxldCBldmVudExhYmVsID0gJyc7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgZGV2aWNlLXNwZWNpZmljIGV2ZW50c1xuICAgICAgICAgICAgICAgIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfcmVtb3ZlZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNPbmxpbmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlRGlzY29ubmVjdGVkfWA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzZXNzaW9uLmV2ZW50X3R5cGUgPT09ICdkZXZpY2VfYWRkZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzT25saW5lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRMYWJlbCA9IGAgJHtnbG9iYWxUcmFuc2xhdGUuZXhfRGV2aWNlQ29ubmVjdGVkfWA7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSB0aGlzLmdldFJ0dExhYmVsKHNlc3Npb24ucnR0KTtcbiAgICAgICAgICAgICAgICAvLyBGb3JtYXQgZGF0ZXRpbWUgd2l0aCBkYXRlIGFuZCB0aW1lXG4gICAgICAgICAgICAgICAgY29uc3QgZGF0ZXRpbWUgPSB0aGlzLmZvcm1hdERhdGVUaW1lKHNlc3Npb24uZGF0ZSB8fCBzZXNzaW9uLnRpbWVzdGFtcCk7XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgY2lyY3VsYXIgbGFiZWxzIGxpa2UgaW4gZXh0ZW5zaW9ucyBsaXN0XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBpc09ubGluZSA/ICdncmVlbicgOiAnZ3JleSc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzVGl0bGUgPSBpc09ubGluZSA/ICdPbmxpbmUnIDogJ09mZmxpbmUnO1xuXG4gICAgICAgICAgICAgICAgbGV0IGR1cmF0aW9uSHRtbCA9ICcnO1xuICAgICAgICAgICAgICAgIC8vIEZvciB0aGUgZmlyc3QgKG1vc3QgcmVjZW50KSBlbnRyeSB0aGF0IGlzIG9ubGluZSwgYWRkIGxpdmUgZHVyYXRpb25cbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IDAgJiYgaXNPbmxpbmUgJiYgc2Vzc2lvbi5ldmVudF90eXBlICE9PSAnZGV2aWNlX3JlbW92ZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkYXRhIGF0dHJpYnV0ZSB3aXRoIHRpbWVzdGFtcCBmb3IgbGl2ZSB1cGRhdGluZ1xuICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbkh0bWwgPSBgPHNwYW4gY2xhc3M9XCJ1aSBncmV5IHRleHQgb25saW5lLWR1cmF0aW9uXCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLW9ubGluZS1zaW5jZT1cIiR7c2Vzc2lvbi50aW1lc3RhbXB9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7dGhpcy5jYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3coc2Vzc2lvbi50aW1lc3RhbXApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBzdGF0aWMgZHVyYXRpb24gZm9yIGhpc3RvcmljYWwgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb24oc2Vzc2lvbi50aW1lc3RhbXAsIHNlc3Npb25zW2luZGV4IC0gMV0/LnRpbWVzdGFtcCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcm1hdCBkdXJhdGlvbiB3aXRoIHRyYW5zbGF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uVGV4dCA9IGR1cmF0aW9uICYmIGlzT25saW5lXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBkdXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gYCR7Z2xvYmFsVHJhbnNsYXRlLmV4X09mZmxpbmV9ICR7ZHVyYXRpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uVGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb25IdG1sID0gYDxzcGFuIGNsYXNzPVwidWkgZ3JleSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPiR7ZHVyYXRpb25UZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc21hbGwgdGV4dFwiIHN0eWxlPVwibWFyZ2luOiA2cHggMjBweDsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXR1c0NsYXNzfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDhweDsgaGVpZ2h0OiA4cHg7IG1pbi1oZWlnaHQ6IDhweDsgbWFyZ2luLXJpZ2h0OiA4cHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCIke3N0YXR1c1RpdGxlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2RhdGV0aW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtydHRMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZHVyYXRpb25IdG1sIHx8IGV2ZW50TGFiZWx9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaGlzdG9yeUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaGlzdG9yeUh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Lmh0bWwoaGlzdG9yeUh0bWwpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZWxpbmUgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGltZWxpbmVUb29sdGlwcygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR3JvdXAgaGlzdG9yeSBldmVudHMgYnkgZGV2aWNlIGFuZCBzb3J0IGJ5IGxhc3QgZXZlbnRcbiAgICAgKi9cbiAgICBncm91cEhpc3RvcnlCeURldmljZShoaXN0b3J5RGF0YSkge1xuICAgICAgICBjb25zdCBncm91cHMgPSB7fTtcblxuICAgICAgICBoaXN0b3J5RGF0YS5mb3JFYWNoKGVudHJ5ID0+IHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBkZXZpY2Uga2V5IGZyb20gdXNlcl9hZ2VudCBhbmQgSVBcbiAgICAgICAgICAgIGxldCBkZXZpY2VLZXkgPSAnVW5rbm93bnxVbmtub3duJztcblxuICAgICAgICAgICAgaWYgKGVudHJ5LnVzZXJfYWdlbnQgfHwgZW50cnkuaXBfYWRkcmVzcykge1xuICAgICAgICAgICAgICAgIGRldmljZUtleSA9IGAke2VudHJ5LnVzZXJfYWdlbnQgfHwgJ1Vua25vd24nfXwke2VudHJ5LmlwX2FkZHJlc3MgfHwgJ1Vua25vd24nfWA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmRldGFpbHMpIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZXh0cmFjdCBkZXZpY2UgaW5mbyBmcm9tIGRldGFpbHNcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaCA9IGVudHJ5LmRldGFpbHMubWF0Y2goLyhbXFx3XFxzLl0rKVxccyotXFxzKihbXFxkLl0rKS8pO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICBkZXZpY2VLZXkgPSBgJHttYXRjaFsxXS50cmltKCl9fCR7bWF0Y2hbMl0udHJpbSgpfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWdyb3Vwc1tkZXZpY2VLZXldKSB7XG4gICAgICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0gPSBbXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ3JvdXBzW2RldmljZUtleV0ucHVzaChlbnRyeSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNvcnQgc2Vzc2lvbnMgd2l0aGluIGVhY2ggZ3JvdXAgYnkgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpXG4gICAgICAgIE9iamVjdC5rZXlzKGdyb3VwcykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgZ3JvdXBzW2tleV0uc29ydCgoYSwgYikgPT4gYi50aW1lc3RhbXAgLSBhLnRpbWVzdGFtcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgdG8gYXJyYXkgYW5kIHNvcnQgYnkgbW9zdCByZWNlbnQgZXZlbnRcbiAgICAgICAgY29uc3Qgc29ydGVkR3JvdXBzID0gT2JqZWN0LmVudHJpZXMoZ3JvdXBzKVxuICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIG1vc3QgcmVjZW50IHRpbWVzdGFtcCBmcm9tIGVhY2ggZ3JvdXAgKGZpcnN0IGVsZW1lbnQgc2luY2UgYWxyZWFkeSBzb3J0ZWQpXG4gICAgICAgICAgICAgICAgY29uc3QgYUxhdGVzdCA9IGFbMV1bMF0/LnRpbWVzdGFtcCB8fCAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJMYXRlc3QgPSBiWzFdWzBdPy50aW1lc3RhbXAgfHwgMDtcbiAgICAgICAgICAgICAgICByZXR1cm4gYkxhdGVzdCAtIGFMYXRlc3Q7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGJhY2sgdG8gb2JqZWN0IHdpdGggc29ydGVkIGtleXNcbiAgICAgICAgY29uc3Qgc29ydGVkT2JqZWN0ID0ge307XG4gICAgICAgIHNvcnRlZEdyb3Vwcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIHNvcnRlZE9iamVjdFtrZXldID0gdmFsdWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBzb3J0ZWRPYmplY3Q7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGUgZHVyYXRpb24gYmV0d2VlbiB0d28gdGltZXN0YW1wc1xuICAgICAqL1xuICAgIGNhbGN1bGF0ZUR1cmF0aW9uKGN1cnJlbnRUaW1lc3RhbXAsIHByZXZpb3VzVGltZXN0YW1wKSB7XG4gICAgICAgIGlmICghcHJldmlvdXNUaW1lc3RhbXApIHJldHVybiBudWxsO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGlmZiA9IE1hdGguYWJzKHByZXZpb3VzVGltZXN0YW1wIC0gY3VycmVudFRpbWVzdGFtcCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKGRpZmYgLyA2MCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihtaW51dGVzIC8gNjApO1xuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihob3VycyAvIDI0KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9ZCAke2hvdXJzICUgMjR9aGA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9aCAke21pbnV0ZXMgJSA2MH1tYDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9bWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGlmZn1zYDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWUgZm9yIGRpc3BsYXlcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lKGRhdGVTdHIpIHtcbiAgICAgICAgaWYgKCFkYXRlU3RyKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBpdCdzIGFscmVhZHkgYSBmb3JtYXR0ZWQgZGF0ZSBzdHJpbmcgbGlrZSBcIjIwMjUtMDktMTEgMTE6MzA6MzZcIlxuICAgICAgICBpZiAodHlwZW9mIGRhdGVTdHIgPT09ICdzdHJpbmcnICYmIGRhdGVTdHIuaW5jbHVkZXMoJyAnKSkge1xuICAgICAgICAgICAgY29uc3QgdGltZVBhcnQgPSBkYXRlU3RyLnNwbGl0KCcgJylbMV07XG4gICAgICAgICAgICByZXR1cm4gdGltZVBhcnQgfHwgZGF0ZVN0cjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgaXQncyBhIHRpbWVzdGFtcFxuICAgICAgICBpZiAodHlwZW9mIGRhdGVTdHIgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0ciAqIDEwMDApO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYXRlU3RyO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IFJUVCBsYWJlbCB3aXRoIGNvbG9yIGNvZGluZ1xuICAgICAqL1xuICAgIGdldFJ0dExhYmVsKHJ0dCkge1xuICAgICAgICBpZiAocnR0ID09PSBudWxsIHx8IHJ0dCA9PT0gdW5kZWZpbmVkIHx8IHJ0dCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICBpZiAocnR0ID4gMTUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdyZWQnO1xuICAgICAgICB9IGVsc2UgaWYgKHJ0dCA+IDUwKSB7XG4gICAgICAgICAgICBjb2xvciA9ICdvbGl2ZSc7ICAvLyB5ZWxsb3cgY2FuIGJlIGhhcmQgdG8gc2VlLCBvbGl2ZSBpcyBiZXR0ZXJcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBgPHNwYW4gY2xhc3M9XCJ1aSAke2NvbG9yfSB0ZXh0XCIgc3R5bGU9XCJtYXJnaW4tbGVmdDogOHB4O1wiPltSVFQ6ICR7cnR0LnRvRml4ZWQoMCl9bXNdPC9zcGFuPmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkYXRldGltZSB3aXRoIGRhdGUgYW5kIHRpbWUgdXNpbmcgaW50ZXJmYWNlIGxhbmd1YWdlXG4gICAgICovXG4gICAgZm9ybWF0RGF0ZVRpbWUodGltZSkge1xuICAgICAgICBpZiAoIXRpbWUpIHJldHVybiAnLS06LS0nO1xuXG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0eXBlb2YgdGltZSA9PT0gJ3N0cmluZycgPyB0aW1lIDogdGltZSAqIDEwMDApO1xuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgdG9kYXlcbiAgICAgICAgY29uc3QgaXNUb2RheSA9IGRhdGUudG9EYXRlU3RyaW5nKCkgPT09IG5vdy50b0RhdGVTdHJpbmcoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIHllc3RlcmRheVxuICAgICAgICBjb25zdCB5ZXN0ZXJkYXkgPSBuZXcgRGF0ZShub3cpO1xuICAgICAgICB5ZXN0ZXJkYXkuc2V0RGF0ZSh5ZXN0ZXJkYXkuZ2V0RGF0ZSgpIC0gMSk7XG4gICAgICAgIGNvbnN0IGlzWWVzdGVyZGF5ID0gZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0geWVzdGVyZGF5LnRvRGF0ZVN0cmluZygpO1xuXG4gICAgICAgIGNvbnN0IGxvY2FsZSA9IFNlbWFudGljTG9jYWxpemF0aW9uLmdldFVzZXJMb2NhbGUoKTtcbiAgICAgICAgY29uc3QgdGltZVN0ciA9IGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKGxvY2FsZSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcsIHNlY29uZDogJzItZGlnaXQnfSk7XG5cbiAgICAgICAgaWYgKGlzVG9kYXkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aW1lU3RyO1xuICAgICAgICB9IGVsc2UgaWYgKGlzWWVzdGVyZGF5KSB7XG4gICAgICAgICAgICAvLyBVc2UgdHJhbnNsYXRpb24gZm9yIFwiWWVzdGVyZGF5XCIgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBjb25zdCB5ZXN0ZXJkYXlUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X1llc3RlcmRheTtcbiAgICAgICAgICAgIHJldHVybiBgJHt5ZXN0ZXJkYXlUZXh0fSAke3RpbWVTdHJ9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBkYXRlIGFjY29yZGluZyB0byBsb2NhbGVcbiAgICAgICAgICAgIGNvbnN0IGRhdGVTdHIgPSBkYXRlLnRvTG9jYWxlRGF0ZVN0cmluZyhsb2NhbGUsIHtkYXk6ICcyLWRpZ2l0JywgbW9udGg6ICcyLWRpZ2l0J30pO1xuICAgICAgICAgICAgcmV0dXJuIGAke2RhdGVTdHJ9ICR7dGltZVN0cn1gO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBkdXJhdGlvbiBmcm9tIHRpbWVzdGFtcCB0byBub3dcbiAgICAgKi9cbiAgICBjYWxjdWxhdGVEdXJhdGlvbkZyb21Ob3codGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkaWZmID0gbm93IC0gdGltZXN0YW1wO1xuXG4gICAgICAgIGlmIChkaWZmIDwgMCkgcmV0dXJuICcwcyc7XG5cbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoZGlmZiAvIDYwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKG1pbnV0ZXMgLyA2MCk7XG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKGhvdXJzIC8gMjQpO1xuXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9ZCAke2hvdXJzICUgMjR9aGA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9aCAke21pbnV0ZXMgJSA2MH1tYDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9bWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGlmZn1zYDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydCB0aW1lciB0byB1cGRhdGUgb25saW5lIGR1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXJ0RHVyYXRpb25VcGRhdGVUaW1lcigpIHtcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIHRpbWVyXG4gICAgICAgIGlmICh0aGlzLnVwZGF0ZVRpbWVyKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMudXBkYXRlVGltZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGV2ZXJ5IDEwIHNlY29uZHNcbiAgICAgICAgdGhpcy51cGRhdGVUaW1lciA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlT25saW5lRHVyYXRpb25zKCk7XG4gICAgICAgIH0sIDEwMDAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBvbmxpbmUgZHVyYXRpb24gZGlzcGxheXNcbiAgICAgKi9cbiAgICB1cGRhdGVPbmxpbmVEdXJhdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbnMgPSB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdD8uZmluZCgnLm9ubGluZS1kdXJhdGlvbltkYXRhLW9ubGluZS1zaW5jZV0nKTtcbiAgICAgICAgaWYgKCEkZHVyYXRpb25zIHx8ICRkdXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAkZHVyYXRpb25zLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBvbmxpbmVTaW5jZSA9IHBhcnNlSW50KCRlbGVtZW50LmRhdGEoJ29ubGluZS1zaW5jZScpLCAxMCk7XG4gICAgICAgICAgICBpZiAob25saW5lU2luY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkdXJhdGlvbiA9IHRoaXMuY2FsY3VsYXRlRHVyYXRpb25Gcm9tTm93KG9ubGluZVNpbmNlKTtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC50ZXh0KGAke2dsb2JhbFRyYW5zbGF0ZS5leF9PbmxpbmV9ICR7ZHVyYXRpb259YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgdGltZWxpbmUgdmlzdWFsaXphdGlvbiBmb3IgYSBkZXZpY2UncyBoaXN0b3J5XG4gICAgICogQHBhcmFtIHtBcnJheX0gc2Vzc2lvbnMgLSBBcnJheSBvZiBzZXNzaW9uIGV2ZW50cyBmb3IgdGhlIGRldmljZVxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBkZXZpY2VJZCAtIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgZGV2aWNlXG4gICAgICogQHJldHVybnMge1N0cmluZ30gSFRNTCBmb3IgdGhlIHRpbWVsaW5lXG4gICAgICovXG4gICAgY3JlYXRlRGV2aWNlVGltZWxpbmUoc2Vzc2lvbnMsIGRldmljZUlkKSB7XG4gICAgICAgIGlmICghc2Vzc2lvbnMgfHwgc2Vzc2lvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgdGltZSByYW5nZSAobGFzdCAyNCBob3VycylcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuXG4gICAgICAgIC8vIEZpbHRlciBzZXNzaW9ucyB3aXRoaW4gbGFzdCAyNCBob3VycyAoc2Vzc2lvbnMgYXJlIHNvcnRlZCBuZXdlc3QgZmlyc3QpXG4gICAgICAgIGNvbnN0IHJlY2VudFNlc3Npb25zID0gc2Vzc2lvbnMuZmlsdGVyKHMgPT4gcy50aW1lc3RhbXAgPj0gZGF5QWdvKTtcbiAgICAgICAgaWYgKHJlY2VudFNlc3Npb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuICcnOyAvLyBObyByZWNlbnQgYWN0aXZpdHlcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSB0aW1lbGluZSBzZWdtZW50cyAoOTYgc2VnbWVudHMgZm9yIDI0IGhvdXJzLCAxNSBtaW51dGVzIGVhY2gpXG4gICAgICAgIGNvbnN0IHNlZ21lbnREdXJhdGlvbiA9IDE1ICogNjA7IC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZWdtZW50cyA9IDk2O1xuICAgICAgICBjb25zdCBzZWdtZW50RGF0YSA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbCgnZ3JleScpO1xuXG4gICAgICAgIC8vIFJldmVyc2Ugc2Vzc2lvbnMgdG8gcHJvY2VzcyBmcm9tIG9sZGVzdCB0byBuZXdlc3RcbiAgICAgICAgY29uc3QgY2hyb25vbG9naWNhbFNlc3Npb25zID0gWy4uLnJlY2VudFNlc3Npb25zXS5yZXZlcnNlKCk7XG5cbiAgICAgICAgLy8gUHJvY2VzcyBzZXNzaW9ucyB0byBmaWxsIHNlZ21lbnRzXG4gICAgICAgIGNocm9ub2xvZ2ljYWxTZXNzaW9ucy5mb3JFYWNoKChzZXNzaW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dFNlc3Npb24gPSBjaHJvbm9sb2dpY2FsU2Vzc2lvbnNbaW5kZXggKyAxXTsgLy8gTmV4dCBldmVudCBpbiB0aW1lXG4gICAgICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBzZXNzaW9uLnRpbWVzdGFtcDtcbiAgICAgICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXh0U2Vzc2lvbiA/IG5leHRTZXNzaW9uLnRpbWVzdGFtcCA6IG5vdztcblxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIHN0YXR1cyBjb2xvciBiYXNlZCBvbiBldmVudCB0eXBlIGFuZCBzdGF0dXNcbiAgICAgICAgICAgIGxldCBjb2xvciA9ICdncmV5JztcblxuICAgICAgICAgICAgLy8gQ2hlY2sgZXZlbnQgdHlwZSBmaXJzdFxuICAgICAgICAgICAgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9hZGRlZCcgfHwgc2Vzc2lvbi5ldmVudF90eXBlID09PSAnc3RhdHVzX2NoYW5nZScpIHtcbiAgICAgICAgICAgICAgICAvLyBEZXZpY2UgY2FtZSBvbmxpbmVcbiAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5zdGF0dXMgPT09ICdBdmFpbGFibGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb2xvciA9ICdncmV5JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uZXZlbnRfdHlwZSA9PT0gJ2RldmljZV9yZW1vdmVkJykge1xuICAgICAgICAgICAgICAgIC8vIERldmljZSB3ZW50IG9mZmxpbmUgLSBzZWdtZW50cyBBRlRFUiB0aGlzIGV2ZW50IHNob3VsZCBiZSBncmV5XG4gICAgICAgICAgICAgICAgY29sb3IgPSAnZ3JleSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNlc3Npb24uc3RhdHVzID09PSAnQXZhaWxhYmxlJykge1xuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgdG8gYXZhaWxhYmxlIHN0YXR1c1xuICAgICAgICAgICAgICAgIGNvbG9yID0gJ2dyZWVuJztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmlsbCBzZWdtZW50cyBmb3IgdGhpcyBzZXNzaW9uIHBlcmlvZFxuICAgICAgICAgICAgZm9yIChsZXQgdGltZSA9IHN0YXJ0VGltZTsgdGltZSA8IGVuZFRpbWUgJiYgdGltZSA8PSBub3c7IHRpbWUgKz0gc2VnbWVudER1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEluZGV4ID0gTWF0aC5mbG9vcigodGltZSAtIGRheUFnbykgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgICAgIGlmIChzZWdtZW50SW5kZXggPj0gMCAmJiBzZWdtZW50SW5kZXggPCBzZWdtZW50cykge1xuICAgICAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdID0gY29sb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCdWlsZCB0aW1lbGluZSBIVE1MXG4gICAgICAgIGxldCB0aW1lbGluZUh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGV2aWNlLXRpbWVsaW5lXCIgc3R5bGU9XCJtYXJnaW46IDEwcHggMDtcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwiZGlzcGxheTogZmxleDsgd2lkdGg6IDEwMCU7IGhlaWdodDogMTJweDsgYmFja2dyb3VuZDogI2YzZjRmNTsgYm9yZGVyLXJhZGl1czogM3B4OyBvdmVyZmxvdzogaGlkZGVuO1wiPlxuICAgICAgICBgO1xuXG4gICAgICAgIHNlZ21lbnREYXRhLmZvckVhY2goKGNvbG9yLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VnbWVudFdpZHRoID0gMTAwIC8gc2VnbWVudHM7XG4gICAgICAgICAgICBjb25zdCBiZ0NvbG9yID0gY29sb3IgPT09ICdncmVlbicgPyAnIzIxYmE0NScgOiAnI2U4ZThlOCc7XG4gICAgICAgICAgICBjb25zdCBib3JkZXJMZWZ0ID0gaW5kZXggPiAwID8gJzFweCBzb2xpZCByZ2JhKDI1NSwyNTUsMjU1LDAuMiknIDogJ25vbmUnO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSBmb3IgdGhpcyBzZWdtZW50XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50VGltZSA9IGRheUFnbyArIChpbmRleCAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBzZWdtZW50RGF0ZSA9IG5ldyBEYXRlKHNlZ21lbnRUaW1lICogMTAwMCk7XG5cbiAgICAgICAgICAgIC8vIEdldCB1c2VyJ3MgbG9jYWxlXG4gICAgICAgICAgICBjb25zdCBsb2NhbGUgPSBTZW1hbnRpY0xvY2FsaXphdGlvbi5nZXRVc2VyTG9jYWxlKCk7XG4gICAgICAgICAgICBjb25zdCB0aW1lU3RyID0gc2VnbWVudERhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKGxvY2FsZSwge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KTtcblxuICAgICAgICAgICAgdGltZWxpbmVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IHN0eWxlPVwid2lkdGg6ICR7c2VnbWVudFdpZHRofSU7IGhlaWdodDogMTAwJTsgYmFja2dyb3VuZC1jb2xvcjogJHtiZ0NvbG9yfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7IGJvcmRlci1sZWZ0OiAke2JvcmRlckxlZnR9O1wiXG4gICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIiR7dGltZVN0cn0gLSAke2NvbG9yID09PSAnZ3JlZW4nID8gJ09ubGluZScgOiAnT2ZmbGluZSd9XCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUaW1lIGxhYmVscyB3aXRoIGxvY2FsaXphdGlvblxuICAgICAgICBjb25zdCBob3Vyc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmV4X0hvdXJzX1Nob3J0O1xuXG4gICAgICAgIHRpbWVsaW5lSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImRpc3BsYXk6IGZsZXg7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgbWFyZ2luLXRvcDogMnB4OyBmb250LXNpemU6IDEwcHg7IGNvbG9yOiAjOTk5O1wiPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj4yNCR7aG91cnNMYWJlbH08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDxzcGFuPjE4JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+MTIke2hvdXJzTGFiZWx9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8c3Bhbj42JHtob3Vyc0xhYmVsfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4+JHtnbG9iYWxUcmFuc2xhdGUuZXhfTm93fTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuXG4gICAgICAgIHJldHVybiB0aW1lbGluZUh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdG9vbHRpcHMgYWZ0ZXIgcmVuZGVyaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRpbWVsaW5lVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9tYW50aWMgVUkgdG9vbHRpcHMgZm9yIHRpbWVsaW5lIHNlZ21lbnRzXG4gICAgICAgIHRoaXMuJGRldmljZUhpc3RvcnlMaXN0Py5maW5kKCcuZGV2aWNlLXRpbWVsaW5lIFt0aXRsZV0nKS5wb3B1cCh7XG4gICAgICAgICAgICB2YXJpYXRpb246ICdtaW5pJyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cHMgZm9yIGNvdW50cnkgZmxhZ3MgaW4gaGlzdG9yeVxuICAgICAgICB0aGlzLiRkZXZpY2VIaXN0b3J5TGlzdD8uZmluZCgnLmNvdW50cnktZmxhZycpLnBvcHVwKHtcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXV0aGVudGljYXRpb24gZmFpbHVyZSBzdGF0aXN0aWNzIGFuZCBiYW5uZWQgSVBzXG4gICAgICovXG4gICAgbG9hZFNlY3VyaXR5RGF0YSgpIHtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gdGhpcy5jdXJyZW50RXh0ZW5zaW9uSWQ7XG5cbiAgICAgICAgaWYgKCFleHRlbnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGF1dGggZmFpbHVyZXMgdmlhIFNpcEFQSVxuICAgICAgICBTaXBBUEkuZ2V0QXV0aEZhaWx1cmVTdGF0cyhleHRlbnNpb24sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuc2VjdXJpdHlEYXRhID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWN1cml0eURhdGEgPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmV0Y2ggYmFubmVkIElQcyB2aWEgRmlyZXdhbGxBUElcbiAgICAgICAgICAgIEZpcmV3YWxsQVBJLmdldEJhbm5lZElwcygoYmFubmVkUmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmFubmVkUmVzcG9uc2UgJiYgYmFubmVkUmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmFubmVkSXBzID0gYmFubmVkUmVzcG9uc2UuZGF0YSB8fCB7fTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJhbm5lZElwcyA9IHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFJlbmRlciB0aGUgY29tYmluZWQgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyU2VjdXJpdHlUYWJsZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc2VjdXJpdHkgdGFibGUgd2l0aCBjb2xvci1jb2RlZCByb3dzXG4gICAgICogUmVkIHJvdyA9IGJhbm5lZCBJUCwgR3JlZW4gcm93ID0gbm90IGJhbm5lZFxuICAgICAqL1xuICAgIHJlbmRlclNlY3VyaXR5VGFibGUoKSB7XG4gICAgICAgIGNvbnN0IHRib2R5ID0gdGhpcy4kc2VjdXJpdHlUYWJsZS5maW5kKCd0Ym9keScpO1xuICAgICAgICB0Ym9keS5lbXB0eSgpO1xuXG4gICAgICAgIGNvbnN0IGZhaWx1cmVzID0gdGhpcy5zZWN1cml0eURhdGE7XG5cbiAgICAgICAgaWYgKCFmYWlsdXJlcyB8fCBPYmplY3Qua2V5cyhmYWlsdXJlcykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmhpZGUoKTtcbiAgICAgICAgICAgIHRoaXMuJG5vU2VjdXJpdHlEYXRhLnNob3coKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuc2hvdygpO1xuICAgICAgICB0aGlzLiRub1NlY3VyaXR5RGF0YS5oaWRlKCk7XG5cbiAgICAgICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGZhaWxlZCBhdXRoIElQc1xuICAgICAgICBPYmplY3QuZW50cmllcyhmYWlsdXJlcykuZm9yRWFjaCgoW2lwLCBzdGF0c10pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlzQmFubmVkID0gdGhpcy5iYW5uZWRJcHMuaGFzT3duUHJvcGVydHkoaXApO1xuXG4gICAgICAgICAgICAvLyBHZXQgY291bnRyeSBpbmZvcm1hdGlvbiBpZiBJUCBpcyBiYW5uZWRcbiAgICAgICAgICAgIGxldCBpcERpc3BsYXkgPSBpcDtcbiAgICAgICAgICAgIGlmIChpc0Jhbm5lZCAmJiB0aGlzLmJhbm5lZElwc1tpcF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpcERhdGEgPSB0aGlzLmJhbm5lZElwc1tpcF07XG4gICAgICAgICAgICAgICAgY29uc3QgY291bnRyeSA9IGlwRGF0YS5jb3VudHJ5IHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvdW50cnlOYW1lID0gaXBEYXRhLmNvdW50cnlOYW1lIHx8ICcnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChjb3VudHJ5KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBjb3VudHJ5IGZsYWcgd2l0aCBwb3B1cCB0b29sdGlwXG4gICAgICAgICAgICAgICAgICAgIGlwRGlzcGxheSA9IGA8c3BhbiBjbGFzcz1cImNvdW50cnktZmxhZ1wiIGRhdGEtY29udGVudD1cIiR7Y291bnRyeU5hbWV9XCIgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIj48aSBjbGFzcz1cImZsYWcgJHtjb3VudHJ5LnRvTG93ZXJDYXNlKCl9XCI+PC9pPjwvc3Bhbj4ke2lwfWA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVc2UgRm9tYW50aWMgVUkgdGFibGUgcm93IHN0YXRlc1xuICAgICAgICAgICAgLy8gJ25lZ2F0aXZlJyA9IHJlZCByb3cgKGJhbm5lZClcbiAgICAgICAgICAgIGNvbnN0IHJvd0NsYXNzID0gaXNCYW5uZWQgPyAnbmVnYXRpdmUnIDogJyc7XG5cbiAgICAgICAgICAgIGNvbnN0IGxhc3RBdHRlbXB0ID0gbmV3IERhdGUoc3RhdHMubGFzdF9hdHRlbXB0ICogMTAwMCkudG9Mb2NhbGVTdHJpbmcoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyB1bmJhbiBidXR0b24gb25seSBmb3IgYmFubmVkIElQc1xuICAgICAgICAgICAgY29uc3QgYWN0aW9uQnV0dG9uID0gaXNCYW5uZWRcbiAgICAgICAgICAgICAgICA/IGA8YnV0dG9uIGNsYXNzPVwidWkgbWluaSByZWQgaWNvbiBidXR0b24gdW5iYW4taXBcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1pcD1cIiR7aXB9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdG9vbHRpcD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4X1NlY3VyaXR5VW5iYW59XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJsZWZ0IGNlbnRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInVubG9jayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPmBcbiAgICAgICAgICAgICAgICA6ICcnO1xuXG4gICAgICAgICAgICBjb25zdCByb3cgPSBgXG4gICAgICAgICAgICAgICAgPHRyIGNsYXNzPVwiJHtyb3dDbGFzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkPjxzdHJvbmc+JHtpcERpc3BsYXl9PC9zdHJvbmc+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPiR7c3RhdHMuY291bnR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPiR7bGFzdEF0dGVtcHR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2FjdGlvbkJ1dHRvbn08L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICB0Ym9keS5hcHBlbmQocm93KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgdW5iYW4gYnV0dG9uc1xuICAgICAgICB0aGlzLiRzZWN1cml0eVRhYmxlLmZpbmQoJ1tkYXRhLXRvb2x0aXBdJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXBzIGZvciBjb3VudHJ5IGZsYWdzXG4gICAgICAgIHRoaXMuJHNlY3VyaXR5VGFibGUuZmluZCgnLmNvdW50cnktZmxhZycpLnBvcHVwKHtcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCB1bmJhbiBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgdGhpcy4kc2VjdXJpdHlUYWJsZS5maW5kKCcudW5iYW4taXAnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVVbmJhbkNsaWNrKGUpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHVuYmFuIGJ1dHRvbiBjbGlja1xuICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBDbGljayBldmVudFxuICAgICAqL1xuICAgIGhhbmRsZVVuYmFuQ2xpY2soZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgIGNvbnN0IGlwID0gJGJ1dHRvbi5kYXRhKCdpcCcpO1xuXG4gICAgICAgIGlmICghaXApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBDYWxsIEZpcmV3YWxsQVBJIHRvIHVuYmFuIElQXG4gICAgICAgIEZpcmV3YWxsQVBJLnVuYmFuSXAoaXAsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEp1c3QgcmVsb2FkIHNlY3VyaXR5IGRhdGEgLSB0YWJsZSB3aWxsIHVwZGF0ZSB2aXN1YWxseVxuICAgICAgICAgICAgICAgIC8vIFJlZCByb3cgd2lsbCBiZWNvbWUgZ3JlZW4gcm93XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uTW9kaWZ5U3RhdHVzTW9uaXRvci5sb2FkU2VjdXJpdHlEYXRhKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgc2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSByZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICA/IHJlc3BvbnNlLm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgIDoge2Vycm9yOiBbJ0ZhaWxlZCB0byB1bmJhbiBJUCddfTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNc2cpO1xuICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgb24gcGFnZSB1bmxvYWRcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBDbGVhciB1cGRhdGUgdGltZXJcbiAgICAgICAgaWYgKHRoaXMudXBkYXRlVGltZXIpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy51cGRhdGVUaW1lcik7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmN1cnJlbnRFeHRlbnNpb25JZCA9IG51bGw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gZXh0ZW5zaW9uLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25Nb2RpZnlTdGF0dXNNb25pdG9yO1xufSJdfQ==