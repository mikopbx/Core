"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate, PbxApi, DebuggerInfo, EventBus, globalRootUrl, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI */

/**
 * Provider Status Worker for Modify Page
 * Handles real-time provider status updates via EventBus for individual provider edit pages
 * Replaces the old polling-based approach with efficient EventBus subscription
 *
 * @module providerModifyStatusWorker
 */
var providerModifyStatusWorker = {
  /**
   * jQuery object for the form
   * @type {jQuery}
   */
  $formObj: $('#save-provider-form'),

  /**
   * jQuery object for the status label
   * @type {jQuery}
   */
  $status: $('#status'),

  /**
   * Provider type determined from the page URL
   * @type {string}
   */
  providerType: '',

  /**
   * Current provider id
   * @type {string}
   */
  providerId: '',

  /**
   * EventBus subscription status
   * @type {boolean}
   */
  isSubscribed: false,

  /**
   * Last known provider status
   * @type {Object}
   */
  lastStatus: null,

  /**
   * Diagnostics tab initialized flag
   * @type {boolean}
   */
  diagnosticsInitialized: false,

  /**
   * History DataTable instance
   * @type {Object}
   */
  historyTable: null,

  /**
   * Current status data for diagnostics
   * @type {Object}
   */
  statusData: null,

  /**
   * Initialize the provider status worker with EventBus subscription
   */
  initialize: function initialize() {
    // Determine provider type and uniqid
    if (window.location.pathname.includes('modifysip')) {
      this.providerType = 'sip';
    } else if (window.location.pathname.includes('modifyiax')) {
      this.providerType = 'iax';
    } else {
      return;
    } // Get provider id from form


    this.providerId = this.$formObj.form('get value', 'id');

    if (!this.providerId) {
      return;
    } // Initialize debugger info


    if (typeof DebuggerInfo !== 'undefined') {
      DebuggerInfo.initialize();
    } // Subscribe to EventBus for real-time updates


    this.subscribeToEventBus(); // Request initial status

    this.requestInitialStatus(); // Set up form change detection to refresh status

    this.setupFormChangeDetection();
  },

  /**
   * Subscribe to EventBus for provider status updates
   */
  subscribeToEventBus: function subscribeToEventBus() {
    var _this = this;

    if (typeof EventBus === 'undefined') {
      this.startPeriodicUpdate();
      return;
    }

    EventBus.subscribe('provider-status', function (message) {
      _this.handleEventBusMessage(message);
    });
    this.isSubscribed = true;
  },

  /**
   * Handle EventBus message for provider status updates
   */
  handleEventBusMessage: function handleEventBusMessage(message) {
    if (!message || !message.data) {
      return;
    } // Extract event and data


    var event, data;

    if (message.event) {
      event = message.event;
      data = message.data;
    } else if (message.data.event) {
      event = message.data.event;
      data = message.data.data || message.data;
    } else {
      return;
    }

    switch (event) {
      case 'status_update':
        this.processStatusUpdate(data);
        break;

      case 'status_complete':
        this.processCompleteStatus(data);
        break;

      case 'status_error':
        this.handleStatusError(data);
        break;

      default: // Ignore other events

    }
  },

  /**
   * Process status update with changes
   */
  processStatusUpdate: function processStatusUpdate(data) {
    var _this2 = this;

    if (!data.changes || !Array.isArray(data.changes)) {
      return;
    } // Find status change for our specific provider


    var relevantChange = data.changes.find(function (change) {
      return change.provider_id === _this2.providerId || change.id === _this2.providerId;
    });

    if (relevantChange) {
      this.updateStatusDisplay(relevantChange);
    }
  },

  /**
   * Process complete status data
   */
  processCompleteStatus: function processCompleteStatus(data) {
    var _data$statuses$this$p;

    if (!data.statuses) {
      return;
    } // Look for our provider in the status data


    var providerStatus = ((_data$statuses$this$p = data.statuses[this.providerType]) === null || _data$statuses$this$p === void 0 ? void 0 : _data$statuses$this$p[this.providerId]) || data.statuses[this.providerId];

    if (providerStatus) {
      this.updateStatusDisplay(providerStatus);
    }
  },

  /**
   * Handle status error
   */
  handleStatusError: function handleStatusError(data) {
    // Show error state
    this.$status.removeClass('green yellow grey loading').addClass('red');
    var errorText = globalTranslate.pr_StatusError;
    this.$status.html("<i class=\"exclamation triangle icon\"></i> ".concat(errorText));
  },

  /**
   * Update status display using backend-provided properties or fallback
   */
  updateStatusDisplay: function updateStatusDisplay(statusData) {
    if (!statusData) {
      return;
    } // Store last status for debugging


    this.lastStatus = statusData; // Save status data for diagnostics

    this.statusData = statusData; // Update DebuggerInfo if available

    if (typeof DebuggerInfo !== 'undefined') {
      var debugInfo = {
        id: this.providerId,
        type: this.providerType,
        state: statusData.state || statusData.new_state,
        stateColor: statusData.stateColor,
        stateText: statusData.stateText,
        timestamp: new Date().toISOString()
      };
      var htmlTable = "\n                <table class=\"ui very compact table\">\n                    <tr><td>Provider</td><td>".concat(debugInfo.id, "</td></tr>\n                    <tr><td>Type</td><td>").concat(debugInfo.type, "</td></tr>\n                    <tr><td>State</td><td>").concat(debugInfo.state, "</td></tr>\n                    <tr><td>Color</td><td>").concat(debugInfo.stateColor, "</td></tr>\n                    <tr><td>Updated</td><td>").concat(debugInfo.timestamp, "</td></tr>\n                </table>\n            ");
      DebuggerInfo.UpdateContent(htmlTable);
    } // Use backend-provided display properties if available


    if (statusData.stateColor && statusData.stateText) {
      this.updateStatusWithBackendProperties(statusData);
    } else {
      // Fallback to legacy state-based update
      this.updateStatusLegacy(statusData);
    } // Update diagnostics display if initialized


    if (this.diagnosticsInitialized) {
      this.updateDiagnosticsDisplay(statusData);
    }
  },

  /**
   * Update status using backend-provided display properties
   */
  updateStatusWithBackendProperties: function updateStatusWithBackendProperties(statusData) {
    var stateColor = statusData.stateColor,
        stateIcon = statusData.stateIcon,
        stateText = statusData.stateText,
        stateDescription = statusData.stateDescription,
        state = statusData.state; // Apply color class

    this.$status.removeClass('green yellow grey red loading').addClass(stateColor); // Build status content with icon and translated text

    var statusContent = '';

    if (stateIcon) {
      statusContent += "<i class=\"".concat(stateIcon, " icon\"></i> ");
    } // State text is already translated by API, use it directly


    var displayText = stateText || state || 'Unknown';
    statusContent += displayText;
    this.$status.html(statusContent);
  },

  /**
   * Legacy status update for backward compatibility
   */
  updateStatusLegacy: function updateStatusLegacy(statusData) {
    var state = statusData.state || statusData.new_state || '';
    var normalizedState = state.toUpperCase(); // Remove loading class and update based on state

    this.$status.removeClass('loading');

    switch (normalizedState) {
      case 'REGISTERED':
      case 'OK':
      case 'REACHABLE':
        this.$status.removeClass('grey yellow red').addClass('green').html("<i class=\"checkmark icon\"></i> ".concat(globalTranslate.pr_Online));
        break;

      case 'UNREACHABLE':
      case 'LAGGED':
        this.$status.removeClass('green grey red').addClass('yellow').html("<i class=\"exclamation triangle icon\"></i> ".concat(globalTranslate.pr_WithoutRegistration));
        break;

      case 'OFF':
      case 'UNMONITORED':
        this.$status.removeClass('green yellow red').addClass('grey').html("<i class=\"minus icon\"></i> ".concat(globalTranslate.pr_Offline));
        break;

      case 'REJECTED':
      case 'UNREGISTERED':
      case 'FAILED':
        this.$status.removeClass('green yellow red').addClass('grey').html("<i class=\"times icon\"></i> ".concat(globalTranslate.pr_Offline));
        break;

      default:
        this.$status.removeClass('green yellow red').addClass('grey').html("<i class=\"question icon\"></i> ".concat(state || 'Unknown'));
        break;
    }
  },

  /**
   * Request initial status for the provider
   */
  requestInitialStatus: function requestInitialStatus() {
    var _this3 = this;

    // Show loading state
    this.$status.removeClass('green yellow grey red').addClass('loading').html("<i class=\"spinner loading icon\"></i> ".concat(globalTranslate.pr_CheckingStatus)); // Request status for this specific provider via REST API v3

    ProvidersAPI.getStatus(this.providerId, function (response) {
      _this3.$status.removeClass('loading');

      if (response && response.result && response.data) {
        // Update display with the provider status
        _this3.updateStatusDisplay(response.data);
      } else if (response && !response.result) {
        // Provider not found or error
        _this3.$status.removeClass('green yellow red').addClass('grey').html("<i class=\"question icon\"></i> ".concat(globalTranslate.pr_NotFound));
      } else {
        _this3.handleRequestError('Invalid response format');
      }
    });
  },

  /**
   * Handle request errors
   */
  handleRequestError: function handleRequestError(error) {
    this.$status.removeClass('loading green yellow grey').addClass('red').html("<i class=\"exclamation triangle icon\"></i> ".concat(globalTranslate.pr_ConnectionError));
  },

  /**
   * Setup form change detection to refresh status when provider settings change
   */
  setupFormChangeDetection: function setupFormChangeDetection() {
    var _this4 = this;

    // Monitor key fields that might affect provider status
    var keyFields = ['host', 'username', 'secret', 'disabled'];
    keyFields.forEach(function (fieldName) {
      var $field = _this4.$formObj.find("[name=\"".concat(fieldName, "\"]"));

      if ($field.length) {
        $field.on('change blur', function () {
          // Debounce status requests
          clearTimeout(_this4.changeTimeout);
          _this4.changeTimeout = setTimeout(function () {
            if (_this4.providerId) {
              // Only request if we have a valid provider ID
              _this4.requestInitialStatus();
            }
          }, 1000);
        });
      }
    });
  },

  /**
   * Fallback periodic update for when EventBus is not available
   */
  startPeriodicUpdate: function startPeriodicUpdate() {
    var _this5 = this;

    this.periodicInterval = setInterval(function () {
      _this5.requestInitialStatus();
    }, 5000); // Check every 5 seconds as fallback
  },

  /**
   * Initialize diagnostics tab functionality
   */
  initializeDiagnosticsTab: function initializeDiagnosticsTab() {
    var _this6 = this;

    if (this.diagnosticsInitialized) {
      return;
    } // Initialize timeline


    this.initializeTimeline(); // Force check button handler

    var $checkBtn = $('#check-now-btn');
    $checkBtn.off('click').on('click', function () {
      $checkBtn.addClass('loading'); // Use the appropriate API client based on provider type

      var apiClient = _this6.providerType === 'sip' ? SipProvidersAPI : IaxProvidersAPI; // Call forceCheck using v3 API

      apiClient.forceCheck(_this6.providerId, function (response) {
        $checkBtn.removeClass('loading');

        if (response.result && response.data) {
          _this6.updateStatusDisplay(response.data);

          _this6.loadTimelineData();
        }
      });
    }); // Export history button handler

    $('#export-history-btn').off('click').on('click', function () {
      _this6.exportHistoryToCSV();
    }); // Display current status if available

    if (this.statusData) {
      this.updateDiagnosticsDisplay(this.statusData);
    }

    this.diagnosticsInitialized = true;
  },

  /**
   * Initialize timeline visualization
   */
  initializeTimeline: function initializeTimeline() {
    // Load timeline data
    this.loadTimelineData();
  },

  /**
   * Load timeline data from history
   */
  loadTimelineData: function loadTimelineData() {
    var _this7 = this;

    // Use the appropriate API client based on provider type
    var apiClient = this.providerType === 'sip' ? SipProvidersAPI : IaxProvidersAPI; // Call getHistory using v3 API

    apiClient.getHistory(this.providerId, function (response) {
      if (response.result && response.data) {
        // Pass both events and current provider status to timeline
        var events = response.data.events || [];
        var currentStatus = response.data.provider || _this7.statusData;

        _this7.renderTimeline(events, currentStatus);
      }

      $('#timeline-loader').removeClass('active');
    });
  },

  /**
   * Render timeline visualization
   */
  renderTimeline: function renderTimeline(events) {
    var _this8 = this;

    var currentStatus = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    var $timeline = $('#provider-timeline');
    var $container = $('#provider-timeline-container');

    if (!$timeline.length) {
      return;
    } // Clear existing timeline


    $timeline.empty(); // Get time range (last 24 hours)

    var now = Math.floor(Date.now() / 1000);
    var dayAgo = now - 24 * 60 * 60;
    var timeRange = 24 * 60 * 60; // 24 hours in seconds
    // Group events by time segments (15 minute segments)

    var segmentDuration = 15 * 60; // 15 minutes in seconds

    var segments = Math.ceil(timeRange / segmentDuration);
    var segmentData = new Array(segments).fill(null);
    var segmentEvents = new Array(segments).fill(null).map(function () {
      return [];
    }); // Process events and store them in segments if we have any

    if (events && events.length > 0) {
      events.forEach(function (event) {
        if (event.timestamp && event.timestamp >= dayAgo) {
          var segmentIndex = Math.floor((event.timestamp - dayAgo) / segmentDuration);

          if (segmentIndex >= 0 && segmentIndex < segments) {
            // Store event in segment
            segmentEvents[segmentIndex].push(event); // Prioritize worse states

            var currentState = segmentData[segmentIndex];

            var newState = _this8.getStateColor(event.state || event.new_state);

            if (!currentState || _this8.getStatePriority(newState) > _this8.getStatePriority(currentState)) {
              segmentData[segmentIndex] = newState;
            }
          }
        }
      });
    } // Determine initial state based on current provider status or default to grey


    var lastKnownState = 'grey';

    if (currentStatus) {
      // Use current provider state if available
      if (currentStatus.stateColor) {
        lastKnownState = currentStatus.stateColor;
      } else if (currentStatus.state) {
        lastKnownState = this.getStateColor(currentStatus.state);
      } else if (currentStatus.disabled === false) {
        // Provider is enabled but state unknown - assume registered
        lastKnownState = 'green';
      }
    } // Create synthetic current state event for tooltips when no events exist


    var lastKnownEvent = null;

    if (currentStatus && (!events || events.length === 0)) {
      lastKnownEvent = {
        timestamp: now,
        state: currentStatus.state || 'registered',
        inherited: true,
        synthetic: true
      };
    } // Fill in gaps with last known state


    for (var i = 0; i < segments; i++) {
      if (segmentData[i]) {
        lastKnownState = segmentData[i];

        if (segmentEvents[i].length > 0) {
          lastKnownEvent = segmentEvents[i][segmentEvents[i].length - 1];
        }
      } else {
        segmentData[i] = lastKnownState; // Copy last known event for tooltip

        if (lastKnownEvent && segmentEvents[i].length === 0) {
          segmentEvents[i] = [_objectSpread(_objectSpread({}, lastKnownEvent), {}, {
            inherited: true
          })];
        }
      }
    } // Render segments


    var segmentWidth = 100 / segments;
    segmentData.forEach(function (color, index) {
      var tooltipContent = _this8.getSegmentTooltipWithEvents(index, segmentDuration, segmentEvents[index]);

      var $segment = $('<div>').css({
        'width': "".concat(segmentWidth, "%"),
        'height': '100%',
        'background-color': _this8.getColorHex(color),
        'box-sizing': 'border-box',
        'cursor': 'pointer'
      }).attr('data-html', tooltipContent).attr('data-position', 'top center').attr('data-variation', 'mini');
      $timeline.append($segment);
    }); // Initialize tooltips with HTML content

    $timeline.find('[data-html]').popup({
      variation: 'mini',
      hoverable: true,
      html: true
    });
  },

  /**
   * Get state color class
   */
  getStateColor: function getStateColor(state) {
    var normalizedState = (state || '').toUpperCase();

    switch (normalizedState) {
      case 'REGISTERED':
      case 'OK':
      case 'REACHABLE':
        return 'green';

      case 'UNREACHABLE':
      case 'LAGGED':
        return 'yellow';

      case 'OFF':
      case 'REJECTED':
      case 'UNREGISTERED':
      case 'FAILED':
        return 'red';

      default:
        return 'grey';
    }
  },

  /**
   * Get state priority for conflict resolution
   */
  getStatePriority: function getStatePriority(color) {
    switch (color) {
      case 'red':
        return 3;

      case 'yellow':
        return 2;

      case 'green':
        return 1;

      default:
        return 0;
    }
  },

  /**
   * Get hex color code
   */
  getColorHex: function getColorHex(color) {
    switch (color) {
      case 'green':
        return '#21ba45';

      case 'yellow':
        return '#fbbd08';

      case 'red':
        return '#db2828';

      default:
        return '#767676';
    }
  },

  /**
   * Get segment tooltip text
   */
  getSegmentTooltip: function getSegmentTooltip(segmentIndex, segmentDuration) {
    var hoursAgo = Math.floor((96 - segmentIndex - 1) * segmentDuration / 3600);
    var minutesAgo = Math.floor((96 - segmentIndex - 1) * segmentDuration % 3600 / 60);

    if (hoursAgo > 0) {
      return "".concat(hoursAgo, "\u0447 ").concat(minutesAgo, "\u043C \u043D\u0430\u0437\u0430\u0434");
    } else {
      return "".concat(minutesAgo, "\u043C \u043D\u0430\u0437\u0430\u0434");
    }
  },

  /**
   * Get segment tooltip with events details
   */
  getSegmentTooltipWithEvents: function getSegmentTooltipWithEvents(segmentIndex, segmentDuration, events) {
    var _this9 = this;

    var segmentStartTime = segmentIndex * segmentDuration;
    var segmentEndTime = (segmentIndex + 1) * segmentDuration;
    var now = Math.floor(Date.now() / 1000);
    var dayAgo = now - 24 * 60 * 60; // Calculate time range for this segment

    var startTime = new Date((dayAgo + segmentStartTime) * 1000);
    var endTime = new Date((dayAgo + segmentEndTime) * 1000);
    var html = '<div style="text-align: left; min-width: 200px;">'; // Time range header

    html += "<div style=\"font-weight: bold; margin-bottom: 5px;\">";
    html += "".concat(startTime.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }), " - ");
    html += "".concat(endTime.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    }));
    html += "</div>"; // Events in this segment

    if (events && events.length > 0) {
      html += '<div style="border-top: 1px solid #ddd; margin-top: 5px; padding-top: 5px;">'; // Sort events by timestamp (newest first)

      var sortedEvents = _toConsumableArray(events).sort(function (a, b) {
        return (b.timestamp || 0) - (a.timestamp || 0);
      }); // Show up to 3 events


      var displayEvents = sortedEvents.slice(0, 3);
      displayEvents.forEach(function (event) {
        var eventTime = new Date(event.timestamp * 1000);
        var state = event.state || event.new_state || 'unknown'; // Capitalize first letter of state for translation key

        var capitalizeFirst = function capitalizeFirst(str) {
          if (!str) return str;
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        };

        var stateText = globalTranslate["pr_ProviderState".concat(capitalizeFirst(state))] || state;

        var color = _this9.getColorHex(_this9.getStateColor(state));

        html += '<div style="margin: 3px 0; font-size: 12px;">';
        html += "<span style=\"color: #666;\">".concat(eventTime.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }), "</span> ");
        html += "<span style=\"color: ".concat(color, "; font-weight: bold;\">\u25CF ").concat(stateText, "</span>"); // Add RTT if available

        if (event.rtt) {
          html += " <span style=\"color: #999;\">(".concat(event.rtt, "ms)</span>");
        } // Mark inherited states


        if (event.inherited) {
          html += ' <span style="color: #999; font-style: italic;">(продолжается)</span>';
        }

        html += '</div>';
      });

      if (sortedEvents.length > 3) {
        html += "<div style=\"color: #999; font-size: 11px; margin-top: 3px;\">\u0438 \u0435\u0449\u0435 ".concat(sortedEvents.length - 3, " \u0441\u043E\u0431\u044B\u0442\u0438\u0439...</div>");
      }

      html += '</div>';
    } else {
      html += '<div style="color: #999; font-size: 12px; margin-top: 5px;">Нет событий в этом периоде</div>';
    }

    html += '</div>';
    return html;
  },

  /**
   * Update diagnostics display with status information
   */
  updateDiagnosticsDisplay: function updateDiagnosticsDisplay(statusInfo) {
    // Update RTT
    var $rtt = $('#provider-rtt-value');
    var $rttContainer = $rtt.parent();

    if ($rtt.length) {
      if (statusInfo.rtt !== null && statusInfo.rtt !== undefined) {
        var rttColor = statusInfo.rtt > 200 ? '#db2828' : statusInfo.rtt > 100 ? '#fbbd08' : '#21ba45';
        $rtt.text("".concat(statusInfo.rtt, " ").concat(globalTranslate.pr_Milliseconds));
        $rttContainer.css('color', rttColor);
      } else {
        $rtt.text('--');
        $rttContainer.css('color', '#767676');
      }
    } // Update state duration and label


    var $duration = $('#provider-duration-value');
    var $stateLabel = $('#provider-state-label');
    var $durationContainer = $duration.parent();

    if ($duration.length && statusInfo.stateDuration) {
      $duration.text(this.formatDuration(statusInfo.stateDuration));
    } // Update state label with actual state text (already translated by API)


    if ($stateLabel.length) {
      var stateText = statusInfo.stateText || statusInfo.state || globalTranslate.pr_CurrentState;
      $stateLabel.text(stateText);
    } // Apply state color to the duration value and label


    if ($durationContainer.length && statusInfo.stateColor) {
      var colorHex = this.getColorHex(statusInfo.stateColor);
      $durationContainer.css('color', colorHex);
    } // Update statistics if available


    if (statusInfo.statistics) {
      var stats = statusInfo.statistics;
      var $availability = $('#provider-availability-value');

      if ($availability.length) {
        $availability.text(stats.availability ? "".concat(stats.availability, "%") : '--');
      }

      var $checks = $('#provider-checks-value');

      if ($checks.length) {
        $checks.text(stats.totalChecks || '0');
      }
    }
  },

  /**
   * Export history to CSV file
   */
  exportHistoryToCSV: function exportHistoryToCSV() {
    var _this10 = this;

    var $btn = $('#export-history-btn');
    $btn.addClass('loading'); // Get provider details

    var providerInfo = {
      host: this.$formObj.form('get value', 'host'),
      username: this.$formObj.form('get value', 'username'),
      description: this.$formObj.form('get value', 'description')
    }; // Use the appropriate API client based on provider type

    var apiClient = this.providerType === 'sip' ? SipProvidersAPI : IaxProvidersAPI; // Fetch history data using v3 API

    apiClient.getHistory(this.providerId, function (response) {
      $btn.removeClass('loading');

      if (response.result && response.data && response.data.events) {
        _this10.downloadCSV(response.data.events, _objectSpread({
          providerId: _this10.providerId,
          providerType: _this10.providerType.toUpperCase()
        }, providerInfo));
      } else if (!response.result) {
        UserMessage.showError(globalTranslate.pr_ExportFailed);
      }
    });
  },

  /**
   * Convert events to CSV and trigger download
   */
  downloadCSV: function downloadCSV(events, providerInfo) {
    if (!events || events.length === 0) {
      UserMessage.showWarning(globalTranslate.pr_NoHistoryToExport);
      return;
    } // Technical headers without translations


    var headers = ['timestamp', 'datetime', 'provider_id', 'provider_type', 'provider_host', 'provider_username', 'provider_description', 'event', 'event_type', 'previous_state', 'new_state', 'rtt_ms', 'peer_status', 'qualify_freq', 'qualify_time', 'register_status', 'contact', 'user_agent', 'last_registration', 'details', 'error_message', 'raw_data']; // Convert events to CSV rows with all technical data

    var rows = events.map(function (event) {
      // Extract all available fields from the event
      return [event.timestamp || '', event.datetime || '', providerInfo.providerId || '', providerInfo.providerType || '', providerInfo.host || '', providerInfo.username || '', providerInfo.description || '', event.event || '', event.type || '', event.previousState || event.previous_state || '', event.state || event.new_state || '', event.rtt || '', event.peerStatus || event.peer_status || '', event.qualifyFreq || event.qualify_freq || '', event.qualifyTime || event.qualify_time || '', event.registerStatus || event.register_status || '', event.contact || '', event.userAgent || event.user_agent || '', event.lastRegistration || event.last_registration || '', event.details || '', event.error || event.errorMessage || '', JSON.stringify(event) // Include complete raw data
      ];
    }); // Create CSV content with BOM for proper UTF-8 encoding in Excel

    var BOM = "\uFEFF";
    var csvContent = BOM; // Add metadata header

    csvContent += "# Provider Export: ".concat(providerInfo.providerId, " (").concat(providerInfo.providerType, ")\n");
    csvContent += "# Host: ".concat(providerInfo.host, "\n");
    csvContent += "# Username: ".concat(providerInfo.username, "\n");
    csvContent += "# Description: ".concat(providerInfo.description, "\n");
    csvContent += "# Export Date: ".concat(new Date().toISOString(), "\n");
    csvContent += "# Total Events: ".concat(events.length, "\n");
    csvContent += '\n'; // Add column headers

    csvContent += headers.join(',') + '\n'; // Add data rows

    rows.forEach(function (row) {
      csvContent += row.map(function (cell) {
        // Escape quotes and wrap in quotes if contains comma, newline, or quotes
        var cellStr = String(cell);

        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"') || cellStr.includes('#')) {
          return "\"".concat(cellStr.replace(/"/g, '""'), "\"");
        }

        return cellStr;
      }).join(',') + '\n';
    }); // Create blob and download

    var blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a'); // Generate filename with provider ID and timestamp

    var now = new Date();
    var timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
    var filename = "provider_".concat(providerInfo.providerId, "_").concat(providerInfo.providerType, "_").concat(timestamp, ".csv");
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // Clean up

    setTimeout(function () {
      return URL.revokeObjectURL(url);
    }, 100);
  },

  /**
   * Format duration in seconds to human-readable format with localization
   */
  formatDuration: function formatDuration(seconds) {
    if (!seconds) return '--';
    var days = Math.floor(seconds / 86400);
    var hours = Math.floor(seconds % 86400 / 3600);
    var minutes = Math.floor(seconds % 3600 / 60);
    var secs = seconds % 60; // Use localized units

    var dayUnit = globalTranslate.pr_Days;
    var hourUnit = globalTranslate.pr_Hours;
    var minuteUnit = globalTranslate.pr_Minutes;
    var secondUnit = globalTranslate.pr_Seconds;

    if (days > 0) {
      return "".concat(days).concat(dayUnit, " ").concat(hours).concat(hourUnit, " ").concat(minutes).concat(minuteUnit);
    } else if (hours > 0) {
      return "".concat(hours).concat(hourUnit, " ").concat(minutes).concat(minuteUnit, " ").concat(secs).concat(secondUnit);
    } else if (minutes > 0) {
      return "".concat(minutes).concat(minuteUnit, " ").concat(secs).concat(secondUnit);
    } else {
      return "".concat(secs).concat(secondUnit);
    }
  },

  /**
   * Clean up resources
   */
  destroy: function destroy() {
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }

    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    } // Unsubscribe from EventBus if subscribed


    if (this.isSubscribed && typeof EventBus !== 'undefined') {
      EventBus.unsubscribe('provider-status');
      this.isSubscribed = false;
    }
  }
}; // Initialize the provider status worker when document is ready

$(document).ready(function () {
  providerModifyStatusWorker.initialize();
}); // Clean up on page unload

$(window).on('beforeunload', function () {
  providerModifyStatusWorker.destroy();
}); // Export for external access

window.providerModifyStatusWorker = providerModifyStatusWorker;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiQiLCIkc3RhdHVzIiwicHJvdmlkZXJUeXBlIiwicHJvdmlkZXJJZCIsImlzU3Vic2NyaWJlZCIsImxhc3RTdGF0dXMiLCJkaWFnbm9zdGljc0luaXRpYWxpemVkIiwiaGlzdG9yeVRhYmxlIiwic3RhdHVzRGF0YSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaW5jbHVkZXMiLCJmb3JtIiwiRGVidWdnZXJJbmZvIiwic3Vic2NyaWJlVG9FdmVudEJ1cyIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwic2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uIiwiRXZlbnRCdXMiLCJzdGFydFBlcmlvZGljVXBkYXRlIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImRhdGEiLCJldmVudCIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxldmFudENoYW5nZSIsImZpbmQiLCJjaGFuZ2UiLCJwcm92aWRlcl9pZCIsImlkIiwidXBkYXRlU3RhdHVzRGlzcGxheSIsInN0YXR1c2VzIiwicHJvdmlkZXJTdGF0dXMiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZXJyb3JUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfU3RhdHVzRXJyb3IiLCJodG1sIiwiZGVidWdJbmZvIiwidHlwZSIsInN0YXRlIiwibmV3X3N0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlVGV4dCIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMiLCJ1cGRhdGVTdGF0dXNMZWdhY3kiLCJ1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkiLCJzdGF0ZUljb24iLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdHVzQ29udGVudCIsImRpc3BsYXlUZXh0Iiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsInByX0NoZWNraW5nU3RhdHVzIiwiUHJvdmlkZXJzQVBJIiwiZ2V0U3RhdHVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcl9Ob3RGb3VuZCIsImhhbmRsZVJlcXVlc3RFcnJvciIsImVycm9yIiwicHJfQ29ubmVjdGlvbkVycm9yIiwia2V5RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsIiRmaWVsZCIsImxlbmd0aCIsIm9uIiwiY2xlYXJUaW1lb3V0IiwiY2hhbmdlVGltZW91dCIsInNldFRpbWVvdXQiLCJwZXJpb2RpY0ludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJpbml0aWFsaXplVGltZWxpbmUiLCIkY2hlY2tCdG4iLCJvZmYiLCJhcGlDbGllbnQiLCJTaXBQcm92aWRlcnNBUEkiLCJJYXhQcm92aWRlcnNBUEkiLCJmb3JjZUNoZWNrIiwibG9hZFRpbWVsaW5lRGF0YSIsImV4cG9ydEhpc3RvcnlUb0NTViIsImdldEhpc3RvcnkiLCJldmVudHMiLCJjdXJyZW50U3RhdHVzIiwicHJvdmlkZXIiLCJyZW5kZXJUaW1lbGluZSIsIiR0aW1lbGluZSIsIiRjb250YWluZXIiLCJlbXB0eSIsIm5vdyIsIk1hdGgiLCJmbG9vciIsImRheUFnbyIsInRpbWVSYW5nZSIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwiY2VpbCIsInNlZ21lbnREYXRhIiwiZmlsbCIsInNlZ21lbnRFdmVudHMiLCJtYXAiLCJzZWdtZW50SW5kZXgiLCJwdXNoIiwiY3VycmVudFN0YXRlIiwibmV3U3RhdGUiLCJnZXRTdGF0ZUNvbG9yIiwiZ2V0U3RhdGVQcmlvcml0eSIsImxhc3RLbm93blN0YXRlIiwiZGlzYWJsZWQiLCJsYXN0S25vd25FdmVudCIsImluaGVyaXRlZCIsInN5bnRoZXRpYyIsImkiLCJzZWdtZW50V2lkdGgiLCJjb2xvciIsImluZGV4IiwidG9vbHRpcENvbnRlbnQiLCJnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMiLCIkc2VnbWVudCIsImNzcyIsImdldENvbG9ySGV4IiwiYXR0ciIsImFwcGVuZCIsInBvcHVwIiwidmFyaWF0aW9uIiwiaG92ZXJhYmxlIiwiZ2V0U2VnbWVudFRvb2x0aXAiLCJob3Vyc0FnbyIsIm1pbnV0ZXNBZ28iLCJzZWdtZW50U3RhcnRUaW1lIiwic2VnbWVudEVuZFRpbWUiLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsInNvcnRlZEV2ZW50cyIsInNvcnQiLCJhIiwiYiIsImRpc3BsYXlFdmVudHMiLCJzbGljZSIsImV2ZW50VGltZSIsImNhcGl0YWxpemVGaXJzdCIsInN0ciIsImNoYXJBdCIsInRvTG93ZXJDYXNlIiwic2Vjb25kIiwicnR0Iiwic3RhdHVzSW5mbyIsIiRydHQiLCIkcnR0Q29udGFpbmVyIiwicGFyZW50IiwidW5kZWZpbmVkIiwicnR0Q29sb3IiLCJ0ZXh0IiwicHJfTWlsbGlzZWNvbmRzIiwiJGR1cmF0aW9uIiwiJHN0YXRlTGFiZWwiLCIkZHVyYXRpb25Db250YWluZXIiLCJzdGF0ZUR1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJwcl9DdXJyZW50U3RhdGUiLCJjb2xvckhleCIsInN0YXRpc3RpY3MiLCJzdGF0cyIsIiRhdmFpbGFiaWxpdHkiLCJhdmFpbGFiaWxpdHkiLCIkY2hlY2tzIiwidG90YWxDaGVja3MiLCIkYnRuIiwicHJvdmlkZXJJbmZvIiwiaG9zdCIsInVzZXJuYW1lIiwiZGVzY3JpcHRpb24iLCJkb3dubG9hZENTViIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicHJfRXhwb3J0RmFpbGVkIiwic2hvd1dhcm5pbmciLCJwcl9Ob0hpc3RvcnlUb0V4cG9ydCIsImhlYWRlcnMiLCJyb3dzIiwiZGF0ZXRpbWUiLCJwcmV2aW91c1N0YXRlIiwicHJldmlvdXNfc3RhdGUiLCJwZWVyU3RhdHVzIiwicGVlcl9zdGF0dXMiLCJxdWFsaWZ5RnJlcSIsInF1YWxpZnlfZnJlcSIsInF1YWxpZnlUaW1lIiwicXVhbGlmeV90aW1lIiwicmVnaXN0ZXJTdGF0dXMiLCJyZWdpc3Rlcl9zdGF0dXMiLCJjb250YWN0IiwidXNlckFnZW50IiwidXNlcl9hZ2VudCIsImxhc3RSZWdpc3RyYXRpb24iLCJsYXN0X3JlZ2lzdHJhdGlvbiIsImRldGFpbHMiLCJlcnJvck1lc3NhZ2UiLCJKU09OIiwic3RyaW5naWZ5IiwiQk9NIiwiY3N2Q29udGVudCIsImpvaW4iLCJyb3ciLCJjZWxsIiwiY2VsbFN0ciIsIlN0cmluZyIsInJlcGxhY2UiLCJibG9iIiwiQmxvYiIsInVybCIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImxpbmsiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdWJzdHJpbmciLCJmaWxlbmFtZSIsInNldEF0dHJpYnV0ZSIsInN0eWxlIiwiZGlzcGxheSIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJyZXZva2VPYmplY3RVUkwiLCJzZWNvbmRzIiwiZGF5cyIsImhvdXJzIiwibWludXRlcyIsInNlY3MiLCJkYXlVbml0IiwicHJfRGF5cyIsImhvdXJVbml0IiwicHJfSG91cnMiLCJtaW51dGVVbml0IiwicHJfTWludXRlcyIsInNlY29uZFVuaXQiLCJwcl9TZWNvbmRzIiwiZGVzdHJveSIsImNsZWFySW50ZXJ2YWwiLCJ1bnN1YnNjcmliZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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O0FBQ0gsS0FGTSxNQUVBLElBQUlSLE9BQU8sR0FBRyxDQUFkLEVBQWlCO0FBQ3BCLHVCQUFVQSxPQUFWLFNBQW9CTSxVQUFwQixjQUFrQ0wsSUFBbEMsU0FBeUNPLFVBQXpDO0FBQ0gsS0FGTSxNQUVBO0FBQ0gsdUJBQVVQLElBQVYsU0FBaUJPLFVBQWpCO0FBQ0g7QUFDSixHQTE2QjhCOztBQTQ2Qi9CO0FBQ0o7QUFDQTtBQUNJRSxFQUFBQSxPQS82QitCLHFCQSs2QnJCO0FBQ04sUUFBSSxLQUFLL0ssYUFBVCxFQUF3QjtBQUNwQkQsTUFBQUEsWUFBWSxDQUFDLEtBQUtDLGFBQU4sQ0FBWjtBQUNIOztBQUVELFFBQUksS0FBS0UsZ0JBQVQsRUFBMkI7QUFDdkI4SyxNQUFBQSxhQUFhLENBQUMsS0FBSzlLLGdCQUFOLENBQWI7QUFDSCxLQVBLLENBU047OztBQUNBLFFBQUksS0FBS25GLFlBQUwsSUFBcUIsT0FBT2UsUUFBUCxLQUFvQixXQUE3QyxFQUEwRDtBQUN0REEsTUFBQUEsUUFBUSxDQUFDbVAsV0FBVCxDQUFxQixpQkFBckI7QUFDQSxXQUFLbFEsWUFBTCxHQUFvQixLQUFwQjtBQUNIO0FBQ0o7QUE3N0I4QixDQUFuQyxDLENBaThCQTs7QUFDQUosQ0FBQyxDQUFDMk8sUUFBRCxDQUFELENBQVk0QixLQUFaLENBQWtCLFlBQU07QUFDcEJ6USxFQUFBQSwwQkFBMEIsQ0FBQ1csVUFBM0I7QUFDSCxDQUZELEUsQ0FJQTs7QUFDQVQsQ0FBQyxDQUFDVSxNQUFELENBQUQsQ0FBVXlFLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0JyRixFQUFBQSwwQkFBMEIsQ0FBQ3NRLE9BQTNCO0FBQ0gsQ0FGRCxFLENBSUE7O0FBQ0ExUCxNQUFNLENBQUNaLDBCQUFQLEdBQW9DQSwwQkFBcEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIERlYnVnZ2VySW5mbywgRXZlbnRCdXMsIGdsb2JhbFJvb3RVcmwsIFByb3ZpZGVyc0FQSSwgU2lwUHJvdmlkZXJzQVBJLCBJYXhQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBQcm92aWRlciBTdGF0dXMgV29ya2VyIGZvciBNb2RpZnkgUGFnZVxuICogSGFuZGxlcyByZWFsLXRpbWUgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIGZvciBpbmRpdmlkdWFsIHByb3ZpZGVyIGVkaXQgcGFnZXNcbiAqIFJlcGxhY2VzIHRoZSBvbGQgcG9sbGluZy1iYXNlZCBhcHByb2FjaCB3aXRoIGVmZmljaWVudCBFdmVudEJ1cyBzdWJzY3JpcHRpb25cbiAqXG4gKiBAbW9kdWxlIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyXG4gKi9cbmNvbnN0IHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm1cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc2F2ZS1wcm92aWRlci1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3RhdHVzIGxhYmVsXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3RhdHVzOiAkKCcjc3RhdHVzJyksXG5cbiAgICAvKipcbiAgICAgKiBQcm92aWRlciB0eXBlIGRldGVybWluZWQgZnJvbSB0aGUgcGFnZSBVUkxcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHByb3ZpZGVyVHlwZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudCBwcm92aWRlciBpZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcHJvdmlkZXJJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRXZlbnRCdXMgc3Vic2NyaXB0aW9uIHN0YXR1c1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzU3Vic2NyaWJlZDogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogTGFzdCBrbm93biBwcm92aWRlciBzdGF0dXNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGxhc3RTdGF0dXM6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlhZ25vc3RpY3MgdGFiIGluaXRpYWxpemVkIGZsYWdcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkaWFnbm9zdGljc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaXN0b3J5IERhdGFUYWJsZSBpbnN0YW5jZVxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgaGlzdG9yeVRhYmxlOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgc3RhdHVzIGRhdGEgZm9yIGRpYWdub3N0aWNzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBzdGF0dXNEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgc3RhdHVzIHdvcmtlciB3aXRoIEV2ZW50QnVzIHN1YnNjcmlwdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIERldGVybWluZSBwcm92aWRlciB0eXBlIGFuZCB1bmlxaWRcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnbW9kaWZ5c2lwJykpIHtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gJ3NpcCc7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCdtb2RpZnlpYXgnKSkge1xuICAgICAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSAnaWF4JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIGlkIGZyb20gZm9ybVxuICAgICAgICB0aGlzLnByb3ZpZGVySWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICBpZiAoIXRoaXMucHJvdmlkZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnZ2VyIGluZm9cbiAgICAgICAgaWYgKHR5cGVvZiBEZWJ1Z2dlckluZm8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudEJ1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1c1xuICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHJlZnJlc2ggc3RhdHVzXG4gICAgICAgIHRoaXMuc2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudEJ1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1VwZGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZSBmb3IgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGV2ZW50IGFuZCBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c191cGRhdGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfZXJyb3InOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBvdGhlciBldmVudHNcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgc3RhdHVzIGNoYW5nZSBmb3Igb3VyIHNwZWNpZmljIHByb3ZpZGVyXG4gICAgICAgIGNvbnN0IHJlbGV2YW50Q2hhbmdlID0gZGF0YS5jaGFuZ2VzLmZpbmQoY2hhbmdlID0+IFxuICAgICAgICAgICAgY2hhbmdlLnByb3ZpZGVyX2lkID09PSB0aGlzLnByb3ZpZGVySWQgfHwgY2hhbmdlLmlkID09PSB0aGlzLnByb3ZpZGVySWRcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWxldmFudENoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlbGV2YW50Q2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBvdXIgcHJvdmlkZXIgaW4gdGhlIHN0YXR1cyBkYXRhXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU3RhdHVzID0gZGF0YS5zdGF0dXNlc1t0aGlzLnByb3ZpZGVyVHlwZV0/Llt0aGlzLnByb3ZpZGVySWRdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnN0YXR1c2VzW3RoaXMucHJvdmlkZXJJZF07XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJTdGF0dXMpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShwcm92aWRlclN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdGF0dXMgZXJyb3JcbiAgICAgKi9cbiAgICBoYW5kbGVTdGF0dXNFcnJvcihkYXRhKSB7XG4gICAgICAgIC8vIFNob3cgZXJyb3Igc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRXJyb3I7XG4gICAgICAgIHRoaXMuJHN0YXR1cy5odG1sKGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+ICR7ZXJyb3JUZXh0fWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBkaXNwbGF5IHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgcHJvcGVydGllcyBvciBmYWxsYmFja1xuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0Rpc3BsYXkoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgbGFzdCBzdGF0dXMgZm9yIGRlYnVnZ2luZ1xuICAgICAgICB0aGlzLmxhc3RTdGF0dXMgPSBzdGF0dXNEYXRhO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzdGF0dXMgZGF0YSBmb3IgZGlhZ25vc3RpY3NcbiAgICAgICAgdGhpcy5zdGF0dXNEYXRhID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBEZWJ1Z2dlckluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRGVidWdnZXJJbmZvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc3QgZGVidWdJbmZvID0ge1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLnByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgdHlwZTogdGhpcy5wcm92aWRlclR5cGUsXG4gICAgICAgICAgICAgICAgc3RhdGU6IHN0YXR1c0RhdGEuc3RhdGUgfHwgc3RhdHVzRGF0YS5uZXdfc3RhdGUsXG4gICAgICAgICAgICAgICAgc3RhdGVDb2xvcjogc3RhdHVzRGF0YS5zdGF0ZUNvbG9yLFxuICAgICAgICAgICAgICAgIHN0YXRlVGV4dDogc3RhdHVzRGF0YS5zdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGh0bWxUYWJsZSA9IGBcbiAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5Qcm92aWRlcjwvdGQ+PHRkPiR7ZGVidWdJbmZvLmlkfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5UeXBlPC90ZD48dGQ+JHtkZWJ1Z0luZm8udHlwZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+U3RhdGU8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+Q29sb3I8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZUNvbG9yfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5VcGRhdGVkPC90ZD48dGQ+JHtkZWJ1Z0luZm8udGltZXN0YW1wfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc3RhdGVDb2xvciAmJiBzdGF0dXNEYXRhLnN0YXRlVGV4dCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsZWdhY3kgc3RhdGUtYmFzZWQgdXBkYXRlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xlZ2FjeShzdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgaWYgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBjb25zdCB7IHN0YXRlQ29sb3IsIHN0YXRlSWNvbiwgc3RhdGVUZXh0LCBzdGF0ZURlc2NyaXB0aW9uLCBzdGF0ZSB9ID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGNvbG9yIGNsYXNzXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3Moc3RhdGVDb2xvcik7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzdGF0dXMgY29udGVudCB3aXRoIGljb24gYW5kIHRyYW5zbGF0ZWQgdGV4dFxuICAgICAgICBsZXQgc3RhdHVzQ29udGVudCA9ICcnO1xuICAgICAgICBpZiAoc3RhdGVJY29uKSB7XG4gICAgICAgICAgICBzdGF0dXNDb250ZW50ICs9IGA8aSBjbGFzcz1cIiR7c3RhdGVJY29ufSBpY29uXCI+PC9pPiBgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0ZSB0ZXh0IGlzIGFscmVhZHkgdHJhbnNsYXRlZCBieSBBUEksIHVzZSBpdCBkaXJlY3RseVxuICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IHN0YXRlVGV4dCB8fCBzdGF0ZSB8fCAnVW5rbm93bic7XG4gICAgICAgIHN0YXR1c0NvbnRlbnQgKz0gZGlzcGxheVRleHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChzdGF0dXNDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGVnYWN5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlIHx8ICcnO1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSBzdGF0ZS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBiYXNlZCBvbiBzdGF0ZVxuICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cImNoZWNrbWFyayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PbmxpbmV9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIGdyZXkgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCd5ZWxsb3cnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9XaXRob3V0UmVnaXN0cmF0aW9ufWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwibWludXMgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZX1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyByZWQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2dyZXknKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0aW1lcyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PZmZsaW5lfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtzdGF0ZSB8fCAnVW5rbm93bid9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgZm9yIHRoZSBwcm92aWRlclxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2xvYWRpbmcnKVxuICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNraW5nU3RhdHVzfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgZm9yIHRoaXMgc3BlY2lmaWMgcHJvdmlkZXIgdmlhIFJFU1QgQVBJIHYzXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXModGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1cy5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZGlzcGxheSB3aXRoIHRoZSBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBub3QgZm91bmQgb3IgZXJyb3JcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfTm90Rm91bmR9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUmVxdWVzdEVycm9yKCdJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXF1ZXN0IGVycm9yc1xuICAgICAqL1xuICAgIGhhbmRsZVJlcXVlc3RFcnJvcihlcnJvcikge1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZyBncmVlbiB5ZWxsb3cgZ3JleScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpXG4gICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9Db25uZWN0aW9uRXJyb3J9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gcmVmcmVzaCBzdGF0dXMgd2hlbiBwcm92aWRlciBzZXR0aW5ncyBjaGFuZ2VcbiAgICAgKi9cbiAgICBzZXR1cEZvcm1DaGFuZ2VEZXRlY3Rpb24oKSB7XG4gICAgICAgIC8vIE1vbml0b3Iga2V5IGZpZWxkcyB0aGF0IG1pZ2h0IGFmZmVjdCBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgY29uc3Qga2V5RmllbGRzID0gWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdkaXNhYmxlZCddO1xuICAgICAgICBcbiAgICAgICAga2V5RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IHRoaXMuJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLm9uKCdjaGFuZ2UgYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVib3VuY2Ugc3RhdHVzIHJlcXVlc3RzXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNoYW5nZVRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnByb3ZpZGVySWQpIHsgLy8gT25seSByZXF1ZXN0IGlmIHdlIGhhdmUgYSB2YWxpZCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgcGVyaW9kaWMgdXBkYXRlIGZvciB3aGVuIEV2ZW50QnVzIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBzdGFydFBlcmlvZGljVXBkYXRlKCkge1xuICAgICAgICB0aGlzLnBlcmlvZGljSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIH0sIDUwMDApOyAvLyBDaGVjayBldmVyeSA1IHNlY29uZHMgYXMgZmFsbGJhY2tcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKSB7XG4gICAgICAgIGlmICh0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lbGluZVxuICAgICAgICB0aGlzLmluaXRpYWxpemVUaW1lbGluZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yY2UgY2hlY2sgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgY29uc3QgJGNoZWNrQnRuID0gJCgnI2NoZWNrLW5vdy1idG4nKTtcbiAgICAgICAgJGNoZWNrQnRuLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAkY2hlY2tCdG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBhcHByb3ByaWF0ZSBBUEkgY2xpZW50IGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBmb3JjZUNoZWNrIHVzaW5nIHYzIEFQSVxuICAgICAgICAgICAgYXBpQ2xpZW50LmZvcmNlQ2hlY2sodGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkY2hlY2tCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHBvcnQgaGlzdG9yeSBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjZXhwb3J0LWhpc3RvcnktYnRuJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZXhwb3J0SGlzdG9yeVRvQ1NWKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzcGxheSBjdXJyZW50IHN0YXR1cyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkodGhpcy5zdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lbGluZSgpIHtcbiAgICAgICAgLy8gTG9hZCB0aW1lbGluZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFRpbWVsaW5lRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB0aW1lbGluZSBkYXRhIGZyb20gaGlzdG9yeVxuICAgICAqL1xuICAgIGxvYWRUaW1lbGluZURhdGEoKSB7XG4gICAgICAgIC8vIFVzZSB0aGUgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcblxuICAgICAgICAvLyBDYWxsIGdldEhpc3RvcnkgdXNpbmcgdjMgQVBJXG4gICAgICAgIGFwaUNsaWVudC5nZXRIaXN0b3J5KHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXNzIGJvdGggZXZlbnRzIGFuZCBjdXJyZW50IHByb3ZpZGVyIHN0YXR1cyB0byB0aW1lbGluZVxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50cyA9IHJlc3BvbnNlLmRhdGEuZXZlbnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0dXMgPSByZXNwb25zZS5kYXRhLnByb3ZpZGVyIHx8IHRoaXMuc3RhdHVzRGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclRpbWVsaW5lKGV2ZW50cywgY3VycmVudFN0YXR1cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjdGltZWxpbmUtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aW1lbGluZSB2aXN1YWxpemF0aW9uXG4gICAgICovXG4gICAgcmVuZGVyVGltZWxpbmUoZXZlbnRzLCBjdXJyZW50U3RhdHVzID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkdGltZWxpbmUgPSAkKCcjcHJvdmlkZXItdGltZWxpbmUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNwcm92aWRlci10aW1lbGluZS1jb250YWluZXInKTtcblxuICAgICAgICBpZiAoISR0aW1lbGluZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVsaW5lXG4gICAgICAgICR0aW1lbGluZS5lbXB0eSgpO1xuXG4gICAgICAgIC8vIEdldCB0aW1lIHJhbmdlIChsYXN0IDI0IGhvdXJzKVxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG4gICAgICAgIGNvbnN0IHRpbWVSYW5nZSA9IDI0ICogNjAgKiA2MDsgLy8gMjQgaG91cnMgaW4gc2Vjb25kc1xuXG4gICAgICAgIC8vIEdyb3VwIGV2ZW50cyBieSB0aW1lIHNlZ21lbnRzICgxNSBtaW51dGUgc2VnbWVudHMpXG4gICAgICAgIGNvbnN0IHNlZ21lbnREdXJhdGlvbiA9IDE1ICogNjA7IC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZWdtZW50cyA9IE1hdGguY2VpbCh0aW1lUmFuZ2UgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICBjb25zdCBzZWdtZW50RGF0YSA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEV2ZW50cyA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKS5tYXAoKCkgPT4gW10pO1xuXG4gICAgICAgIC8vIFByb2Nlc3MgZXZlbnRzIGFuZCBzdG9yZSB0aGVtIGluIHNlZ21lbnRzIGlmIHdlIGhhdmUgYW55XG4gICAgICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGltZXN0YW1wICYmIGV2ZW50LnRpbWVzdGFtcCA+PSBkYXlBZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEluZGV4ID0gTWF0aC5mbG9vcigoZXZlbnQudGltZXN0YW1wIC0gZGF5QWdvKSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWdtZW50SW5kZXggPj0gMCAmJiBzZWdtZW50SW5kZXggPCBzZWdtZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgZXZlbnQgaW4gc2VnbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tzZWdtZW50SW5kZXhdLnB1c2goZXZlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmlvcml0aXplIHdvcnNlIHN0YXRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gc2VnbWVudERhdGFbc2VnbWVudEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5nZXRTdGF0ZUNvbG9yKGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFN0YXRlIHx8IHRoaXMuZ2V0U3RhdGVQcmlvcml0eShuZXdTdGF0ZSkgPiB0aGlzLmdldFN0YXRlUHJpb3JpdHkoY3VycmVudFN0YXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW3NlZ21lbnRJbmRleF0gPSBuZXdTdGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGluaXRpYWwgc3RhdGUgYmFzZWQgb24gY3VycmVudCBwcm92aWRlciBzdGF0dXMgb3IgZGVmYXVsdCB0byBncmV5XG4gICAgICAgIGxldCBsYXN0S25vd25TdGF0ZSA9ICdncmV5JztcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0dXMpIHtcbiAgICAgICAgICAgIC8vIFVzZSBjdXJyZW50IHByb3ZpZGVyIHN0YXRlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRTdGF0dXMuc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gY3VycmVudFN0YXR1cy5zdGF0ZUNvbG9yO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RhdHVzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSB0aGlzLmdldFN0YXRlQ29sb3IoY3VycmVudFN0YXR1cy5zdGF0ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdGF0dXMuZGlzYWJsZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgaXMgZW5hYmxlZCBidXQgc3RhdGUgdW5rbm93biAtIGFzc3VtZSByZWdpc3RlcmVkXG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHN5bnRoZXRpYyBjdXJyZW50IHN0YXRlIGV2ZW50IGZvciB0b29sdGlwcyB3aGVuIG5vIGV2ZW50cyBleGlzdFxuICAgICAgICBsZXQgbGFzdEtub3duRXZlbnQgPSBudWxsO1xuICAgICAgICBpZiAoY3VycmVudFN0YXR1cyAmJiAoIWV2ZW50cyB8fCBldmVudHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgbGFzdEtub3duRXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBub3csXG4gICAgICAgICAgICAgICAgc3RhdGU6IGN1cnJlbnRTdGF0dXMuc3RhdGUgfHwgJ3JlZ2lzdGVyZWQnLFxuICAgICAgICAgICAgICAgIGluaGVyaXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzeW50aGV0aWM6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaWxsIGluIGdhcHMgd2l0aCBsYXN0IGtub3duIHN0YXRlXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHM7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNlZ21lbnREYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSBzZWdtZW50RGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RLbm93bkV2ZW50ID0gc2VnbWVudEV2ZW50c1tpXVtzZWdtZW50RXZlbnRzW2ldLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudERhdGFbaV0gPSBsYXN0S25vd25TdGF0ZTtcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGxhc3Qga25vd24gZXZlbnQgZm9yIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBpZiAobGFzdEtub3duRXZlbnQgJiYgc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tpXSA9IFt7Li4ubGFzdEtub3duRXZlbnQsIGluaGVyaXRlZDogdHJ1ZX1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVuZGVyIHNlZ21lbnRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRXaWR0aCA9IDEwMCAvIHNlZ21lbnRzO1xuICAgICAgICBzZWdtZW50RGF0YS5mb3JFYWNoKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gdGhpcy5nZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoaW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgc2VnbWVudEV2ZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoJzogYCR7c2VnbWVudFdpZHRofSVgLFxuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0JzogJzEwMCUnLFxuICAgICAgICAgICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IHRoaXMuZ2V0Q29sb3JIZXgoY29sb3IpLFxuICAgICAgICAgICAgICAgICAgICAnYm94LXNpemluZyc6ICdib3JkZXItYm94JyxcbiAgICAgICAgICAgICAgICAgICAgJ2N1cnNvcic6ICdwb2ludGVyJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaHRtbCcsIHRvb2x0aXBDb250ZW50KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXZhcmlhdGlvbicsICdtaW5pJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0aW1lbGluZS5hcHBlbmQoJHNlZ21lbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgd2l0aCBIVE1MIGNvbnRlbnRcbiAgICAgICAgJHRpbWVsaW5lLmZpbmQoJ1tkYXRhLWh0bWxdJykucG9wdXAoe1xuICAgICAgICAgICAgdmFyaWF0aW9uOiAnbWluaScsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBodG1sOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRlIGNvbG9yIGNsYXNzXG4gICAgICovXG4gICAgZ2V0U3RhdGVDb2xvcihzdGF0ZSkge1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSAoc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAneWVsbG93JztcbiAgICAgICAgICAgIGNhc2UgJ09GRic6XG4gICAgICAgICAgICBjYXNlICdSRUpFQ1RFRCc6XG4gICAgICAgICAgICBjYXNlICdVTlJFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnRkFJTEVEJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlZCc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0ZSBwcmlvcml0eSBmb3IgY29uZmxpY3QgcmVzb2x1dGlvblxuICAgICAqL1xuICAgIGdldFN0YXRlUHJpb3JpdHkoY29sb3IpIHtcbiAgICAgICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICAgICAgY2FzZSAncmVkJzogcmV0dXJuIDM7XG4gICAgICAgICAgICBjYXNlICd5ZWxsb3cnOiByZXR1cm4gMjtcbiAgICAgICAgICAgIGNhc2UgJ2dyZWVuJzogcmV0dXJuIDE7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGhleCBjb2xvciBjb2RlXG4gICAgICovXG4gICAgZ2V0Q29sb3JIZXgoY29sb3IpIHtcbiAgICAgICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICAgICAgY2FzZSAnZ3JlZW4nOiByZXR1cm4gJyMyMWJhNDUnO1xuICAgICAgICAgICAgY2FzZSAneWVsbG93JzogcmV0dXJuICcjZmJiZDA4JztcbiAgICAgICAgICAgIGNhc2UgJ3JlZCc6IHJldHVybiAnI2RiMjgyOCc7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gJyM3Njc2NzYnO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc2VnbWVudCB0b29sdGlwIHRleHRcbiAgICAgKi9cbiAgICBnZXRTZWdtZW50VG9vbHRpcChzZWdtZW50SW5kZXgsIHNlZ21lbnREdXJhdGlvbikge1xuICAgICAgICBjb25zdCBob3Vyc0FnbyA9IE1hdGguZmxvb3IoKDk2IC0gc2VnbWVudEluZGV4IC0gMSkgKiBzZWdtZW50RHVyYXRpb24gLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlc0FnbyA9IE1hdGguZmxvb3IoKCg5NiAtIHNlZ21lbnRJbmRleCAtIDEpICogc2VnbWVudER1cmF0aW9uICUgMzYwMCkgLyA2MCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaG91cnNBZ28gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnNBZ2990YcgJHttaW51dGVzQWdvfdC8INC90LDQt9Cw0LRgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXNBZ2990Lwg0L3QsNC30LDQtGA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzZWdtZW50IHRvb2x0aXAgd2l0aCBldmVudHMgZGV0YWlsc1xuICAgICAqL1xuICAgIGdldFNlZ21lbnRUb29sdGlwV2l0aEV2ZW50cyhzZWdtZW50SW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRTdGFydFRpbWUgPSAoc2VnbWVudEluZGV4ICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEVuZFRpbWUgPSAoKHNlZ21lbnRJbmRleCArIDEpICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgcmFuZ2UgZm9yIHRoaXMgc2VnbWVudFxuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgoZGF5QWdvICsgc2VnbWVudFN0YXJ0VGltZSkgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKChkYXlBZ28gKyBzZWdtZW50RW5kVGltZSkgKiAxMDAwKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOiBsZWZ0OyBtaW4td2lkdGg6IDIwMHB4O1wiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBUaW1lIHJhbmdlIGhlYWRlclxuICAgICAgICBodG1sICs9IGA8ZGl2IHN0eWxlPVwiZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbi1ib3R0b206IDVweDtcIj5gO1xuICAgICAgICBodG1sICs9IGAke3N0YXJ0VGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KX0gLSBgO1xuICAgICAgICBodG1sICs9IGAke2VuZFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSl9YDtcbiAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50cyBpbiB0aGlzIHNlZ21lbnRcbiAgICAgICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cImJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkOyBtYXJnaW4tdG9wOiA1cHg7IHBhZGRpbmctdG9wOiA1cHg7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU29ydCBldmVudHMgYnkgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpXG4gICAgICAgICAgICBjb25zdCBzb3J0ZWRFdmVudHMgPSBbLi4uZXZlbnRzXS5zb3J0KChhLCBiKSA9PiAoYi50aW1lc3RhbXAgfHwgMCkgLSAoYS50aW1lc3RhbXAgfHwgMCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHVwIHRvIDMgZXZlbnRzXG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5RXZlbnRzID0gc29ydGVkRXZlbnRzLnNsaWNlKDAsIDMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkaXNwbGF5RXZlbnRzLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IG5ldyBEYXRlKGV2ZW50LnRpbWVzdGFtcCAqIDEwMDApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlIHx8ICd1bmtub3duJztcbiAgICAgICAgICAgICAgICAvLyBDYXBpdGFsaXplIGZpcnN0IGxldHRlciBvZiBzdGF0ZSBmb3IgdHJhbnNsYXRpb24ga2V5XG4gICAgICAgICAgICAgICAgY29uc3QgY2FwaXRhbGl6ZUZpcnN0ID0gKHN0cikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0cikgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW2Bwcl9Qcm92aWRlclN0YXRlJHtjYXBpdGFsaXplRmlyc3Qoc3RhdGUpfWBdIHx8IHN0YXRlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckhleCh0aGlzLmdldFN0YXRlQ29sb3Ioc3RhdGUpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IHN0eWxlPVwibWFyZ2luOiAzcHggMDsgZm9udC1zaXplOiAxMnB4O1wiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzY2NjtcIj4ke2V2ZW50VGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcsIHNlY29uZDogJzItZGlnaXQnfSl9PC9zcGFuPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICR7Y29sb3J9OyBmb250LXdlaWdodDogYm9sZDtcIj7il48gJHtzdGF0ZVRleHR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIFJUVCBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQucnR0KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYCA8c3BhbiBzdHlsZT1cImNvbG9yOiAjOTk5O1wiPigke2V2ZW50LnJ0dH1tcyk8L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTWFyayBpbmhlcml0ZWQgc3RhdGVzXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmluaGVyaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zdHlsZTogaXRhbGljO1wiPijQv9GA0L7QtNC+0LvQttCw0LXRgtGB0Y8pPC9zcGFuPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNvcnRlZEV2ZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDExcHg7IG1hcmdpbi10b3A6IDNweDtcIj7QuCDQtdGJ0LUgJHtzb3J0ZWRFdmVudHMubGVuZ3RoIC0gM30g0YHQvtCx0YvRgtC40LkuLi48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDEycHg7IG1hcmdpbi10b3A6IDVweDtcIj7QndC10YIg0YHQvtCx0YvRgtC40Lkg0LIg0Y3RgtC+0Lwg0L/QtdGA0LjQvtC00LU8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZGlhZ25vc3RpY3MgZGlzcGxheSB3aXRoIHN0YXR1cyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHVwZGF0ZURpYWdub3N0aWNzRGlzcGxheShzdGF0dXNJbmZvKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBSVFRcbiAgICAgICAgY29uc3QgJHJ0dCA9ICQoJyNwcm92aWRlci1ydHQtdmFsdWUnKTtcbiAgICAgICAgY29uc3QgJHJ0dENvbnRhaW5lciA9ICRydHQucGFyZW50KCk7XG4gICAgICAgIGlmICgkcnR0Lmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHN0YXR1c0luZm8ucnR0ICE9PSBudWxsICYmIHN0YXR1c0luZm8ucnR0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBydHRDb2xvciA9IHN0YXR1c0luZm8ucnR0ID4gMjAwID8gJyNkYjI4MjgnIDogc3RhdHVzSW5mby5ydHQgPiAxMDAgPyAnI2ZiYmQwOCcgOiAnIzIxYmE0NSc7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KGAke3N0YXR1c0luZm8ucnR0fSAke2dsb2JhbFRyYW5zbGF0ZS5wcl9NaWxsaXNlY29uZHN9YCk7XG4gICAgICAgICAgICAgICAgJHJ0dENvbnRhaW5lci5jc3MoJ2NvbG9yJywgcnR0Q29sb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkcnR0LnRleHQoJy0tJyk7XG4gICAgICAgICAgICAgICAgJHJ0dENvbnRhaW5lci5jc3MoJ2NvbG9yJywgJyM3Njc2NzYnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlIGR1cmF0aW9uIGFuZCBsYWJlbFxuICAgICAgICBjb25zdCAkZHVyYXRpb24gPSAkKCcjcHJvdmlkZXItZHVyYXRpb24tdmFsdWUnKTtcbiAgICAgICAgY29uc3QgJHN0YXRlTGFiZWwgPSAkKCcjcHJvdmlkZXItc3RhdGUtbGFiZWwnKTtcbiAgICAgICAgY29uc3QgJGR1cmF0aW9uQ29udGFpbmVyID0gJGR1cmF0aW9uLnBhcmVudCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRkdXJhdGlvbi5sZW5ndGggJiYgc3RhdHVzSW5mby5zdGF0ZUR1cmF0aW9uKSB7XG4gICAgICAgICAgICAkZHVyYXRpb24udGV4dCh0aGlzLmZvcm1hdER1cmF0aW9uKHN0YXR1c0luZm8uc3RhdGVEdXJhdGlvbikpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGUgbGFiZWwgd2l0aCBhY3R1YWwgc3RhdGUgdGV4dCAoYWxyZWFkeSB0cmFuc2xhdGVkIGJ5IEFQSSlcbiAgICAgICAgaWYgKCRzdGF0ZUxhYmVsLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gc3RhdHVzSW5mby5zdGF0ZVRleHQgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNJbmZvLnN0YXRlIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0N1cnJlbnRTdGF0ZTtcbiAgICAgICAgICAgICRzdGF0ZUxhYmVsLnRleHQoc3RhdGVUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgc3RhdGUgY29sb3IgdG8gdGhlIGR1cmF0aW9uIHZhbHVlIGFuZCBsYWJlbFxuICAgICAgICBpZiAoJGR1cmF0aW9uQ29udGFpbmVyLmxlbmd0aCAmJiBzdGF0dXNJbmZvLnN0YXRlQ29sb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbG9ySGV4ID0gdGhpcy5nZXRDb2xvckhleChzdGF0dXNJbmZvLnN0YXRlQ29sb3IpO1xuICAgICAgICAgICAgJGR1cmF0aW9uQ29udGFpbmVyLmNzcygnY29sb3InLCBjb2xvckhleCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aXN0aWNzIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAoc3RhdHVzSW5mby5zdGF0aXN0aWNzKSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0cyA9IHN0YXR1c0luZm8uc3RhdGlzdGljcztcbiAgICAgICAgICAgIGNvbnN0ICRhdmFpbGFiaWxpdHkgPSAkKCcjcHJvdmlkZXItYXZhaWxhYmlsaXR5LXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoJGF2YWlsYWJpbGl0eS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkYXZhaWxhYmlsaXR5LnRleHQoc3RhdHMuYXZhaWxhYmlsaXR5ID8gYCR7c3RhdHMuYXZhaWxhYmlsaXR5fSVgIDogJy0tJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja3MgPSAkKCcjcHJvdmlkZXItY2hlY2tzLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoJGNoZWNrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkY2hlY2tzLnRleHQoc3RhdHMudG90YWxDaGVja3MgfHwgJzAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRXhwb3J0IGhpc3RvcnkgdG8gQ1NWIGZpbGVcbiAgICAgKi9cbiAgICBleHBvcnRIaXN0b3J5VG9DU1YoKSB7XG4gICAgICAgIGNvbnN0ICRidG4gPSAkKCcjZXhwb3J0LWhpc3RvcnktYnRuJyk7XG4gICAgICAgICRidG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBwcm92aWRlciBkZXRhaWxzXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySW5mbyA9IHtcbiAgICAgICAgICAgIGhvc3Q6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2hvc3QnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VybmFtZScpLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2Rlc2NyaXB0aW9uJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB0aGUgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcblxuICAgICAgICAvLyBGZXRjaCBoaXN0b3J5IGRhdGEgdXNpbmcgdjMgQVBJXG4gICAgICAgIGFwaUNsaWVudC5nZXRIaXN0b3J5KHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAkYnRuLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5ldmVudHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkQ1NWKHJlc3BvbnNlLmRhdGEuZXZlbnRzLCB7XG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVySWQ6IHRoaXMucHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJUeXBlOiB0aGlzLnByb3ZpZGVyVHlwZS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgICAgICAgICAuLi5wcm92aWRlckluZm9cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUucHJfRXhwb3J0RmFpbGVkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IGV2ZW50cyB0byBDU1YgYW5kIHRyaWdnZXIgZG93bmxvYWRcbiAgICAgKi9cbiAgICBkb3dubG9hZENTVihldmVudHMsIHByb3ZpZGVySW5mbykge1xuICAgICAgICBpZiAoIWV2ZW50cyB8fCBldmVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93V2FybmluZyhnbG9iYWxUcmFuc2xhdGUucHJfTm9IaXN0b3J5VG9FeHBvcnQpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUZWNobmljYWwgaGVhZGVycyB3aXRob3V0IHRyYW5zbGF0aW9uc1xuICAgICAgICBjb25zdCBoZWFkZXJzID0gW1xuICAgICAgICAgICAgJ3RpbWVzdGFtcCcsXG4gICAgICAgICAgICAnZGF0ZXRpbWUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2lkJyxcbiAgICAgICAgICAgICdwcm92aWRlcl90eXBlJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9ob3N0JyxcbiAgICAgICAgICAgICdwcm92aWRlcl91c2VybmFtZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgJ2V2ZW50JyxcbiAgICAgICAgICAgICdldmVudF90eXBlJyxcbiAgICAgICAgICAgICdwcmV2aW91c19zdGF0ZScsXG4gICAgICAgICAgICAnbmV3X3N0YXRlJyxcbiAgICAgICAgICAgICdydHRfbXMnLFxuICAgICAgICAgICAgJ3BlZXJfc3RhdHVzJyxcbiAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXEnLFxuICAgICAgICAgICAgJ3F1YWxpZnlfdGltZScsXG4gICAgICAgICAgICAncmVnaXN0ZXJfc3RhdHVzJyxcbiAgICAgICAgICAgICdjb250YWN0JyxcbiAgICAgICAgICAgICd1c2VyX2FnZW50JyxcbiAgICAgICAgICAgICdsYXN0X3JlZ2lzdHJhdGlvbicsXG4gICAgICAgICAgICAnZGV0YWlscycsXG4gICAgICAgICAgICAnZXJyb3JfbWVzc2FnZScsXG4gICAgICAgICAgICAncmF3X2RhdGEnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGV2ZW50cyB0byBDU1Ygcm93cyB3aXRoIGFsbCB0ZWNobmljYWwgZGF0YVxuICAgICAgICBjb25zdCByb3dzID0gZXZlbnRzLm1hcChldmVudCA9PiB7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGFsbCBhdmFpbGFibGUgZmllbGRzIGZyb20gdGhlIGV2ZW50XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIGV2ZW50LnRpbWVzdGFtcCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5kYXRldGltZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8ucHJvdmlkZXJJZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5ob3N0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8uZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZXZlbnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQudHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2aW91c1N0YXRlIHx8IGV2ZW50LnByZXZpb3VzX3N0YXRlIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5ydHQgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucGVlclN0YXR1cyB8fCBldmVudC5wZWVyX3N0YXR1cyB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5xdWFsaWZ5RnJlcSB8fCBldmVudC5xdWFsaWZ5X2ZyZXEgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucXVhbGlmeVRpbWUgfHwgZXZlbnQucXVhbGlmeV90aW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnJlZ2lzdGVyU3RhdHVzIHx8IGV2ZW50LnJlZ2lzdGVyX3N0YXR1cyB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5jb250YWN0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnVzZXJBZ2VudCB8fCBldmVudC51c2VyX2FnZW50IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50Lmxhc3RSZWdpc3RyYXRpb24gfHwgZXZlbnQubGFzdF9yZWdpc3RyYXRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZGV0YWlscyB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5lcnJvciB8fCBldmVudC5lcnJvck1lc3NhZ2UgfHwgJycsXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZXZlbnQpIC8vIEluY2x1ZGUgY29tcGxldGUgcmF3IGRhdGFcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIENTViBjb250ZW50IHdpdGggQk9NIGZvciBwcm9wZXIgVVRGLTggZW5jb2RpbmcgaW4gRXhjZWxcbiAgICAgICAgY29uc3QgQk9NID0gJ1xcdUZFRkYnO1xuICAgICAgICBsZXQgY3N2Q29udGVudCA9IEJPTTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtZXRhZGF0YSBoZWFkZXJcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBQcm92aWRlciBFeHBvcnQ6ICR7cHJvdmlkZXJJbmZvLnByb3ZpZGVySWR9ICgke3Byb3ZpZGVySW5mby5wcm92aWRlclR5cGV9KVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgSG9zdDogJHtwcm92aWRlckluZm8uaG9zdH1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIFVzZXJuYW1lOiAke3Byb3ZpZGVySW5mby51c2VybmFtZX1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIERlc2NyaXB0aW9uOiAke3Byb3ZpZGVySW5mby5kZXNjcmlwdGlvbn1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIEV4cG9ydCBEYXRlOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIFRvdGFsIEV2ZW50czogJHtldmVudHMubGVuZ3RofVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gJ1xcbic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29sdW1uIGhlYWRlcnNcbiAgICAgICAgY3N2Q29udGVudCArPSBoZWFkZXJzLmpvaW4oJywnKSArICdcXG4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRhdGEgcm93c1xuICAgICAgICByb3dzLmZvckVhY2gocm93ID0+IHtcbiAgICAgICAgICAgIGNzdkNvbnRlbnQgKz0gcm93Lm1hcChjZWxsID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgcXVvdGVzIGFuZCB3cmFwIGluIHF1b3RlcyBpZiBjb250YWlucyBjb21tYSwgbmV3bGluZSwgb3IgcXVvdGVzXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbFN0ciA9IFN0cmluZyhjZWxsKTtcbiAgICAgICAgICAgICAgICBpZiAoY2VsbFN0ci5pbmNsdWRlcygnLCcpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJ1xcbicpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJ1wiJykgfHwgY2VsbFN0ci5pbmNsdWRlcygnIycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgXCIke2NlbGxTdHIucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjZWxsU3RyO1xuICAgICAgICAgICAgfSkuam9pbignLCcpICsgJ1xcbic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJsb2IgYW5kIGRvd25sb2FkXG4gICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbY3N2Q29udGVudF0sIHsgdHlwZTogJ3RleHQvY3N2O2NoYXJzZXQ9dXRmLTg7JyB9KTtcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIGZpbGVuYW1lIHdpdGggcHJvdmlkZXIgSUQgYW5kIHRpbWVzdGFtcFxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBub3cudG9JU09TdHJpbmcoKS5yZXBsYWNlKC9bOi5dL2csICctJykuc3Vic3RyaW5nKDAsIDE5KTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgcHJvdmlkZXJfJHtwcm92aWRlckluZm8ucHJvdmlkZXJJZH1fJHtwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlfV8ke3RpbWVzdGFtcH0uY3N2YDtcbiAgICAgICAgXG4gICAgICAgIGxpbmsuc2V0QXR0cmlidXRlKCdocmVmJywgdXJsKTtcbiAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoJ2Rvd25sb2FkJywgZmlsZW5hbWUpO1xuICAgICAgICBsaW5rLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIFxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICBsaW5rLmNsaWNrKCk7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQobGluayk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IFVSTC5yZXZva2VPYmplY3RVUkwodXJsKSwgMTAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkdXJhdGlvbiBpbiBzZWNvbmRzIHRvIGh1bWFuLXJlYWRhYmxlIGZvcm1hdCB3aXRoIGxvY2FsaXphdGlvblxuICAgICAqL1xuICAgIGZvcm1hdER1cmF0aW9uKHNlY29uZHMpIHtcbiAgICAgICAgaWYgKCFzZWNvbmRzKSByZXR1cm4gJy0tJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKHNlY29uZHMgLyA4NjQwMCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDg2NDAwKSAvIDM2MDApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApIC8gNjApO1xuICAgICAgICBjb25zdCBzZWNzID0gc2Vjb25kcyAlIDYwO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGxvY2FsaXplZCB1bml0c1xuICAgICAgICBjb25zdCBkYXlVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX0RheXM7XG4gICAgICAgIGNvbnN0IGhvdXJVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX0hvdXJzO1xuICAgICAgICBjb25zdCBtaW51dGVVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX01pbnV0ZXM7XG4gICAgICAgIGNvbnN0IHNlY29uZFVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfU2Vjb25kcztcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9JHtkYXlVbml0fSAke2hvdXJzfSR7aG91clVuaXR9ICR7bWludXRlc30ke21pbnV0ZVVuaXR9YDtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc30ke2hvdXJVbml0fSAke21pbnV0ZXN9JHttaW51dGVVbml0fSAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfSR7bWludXRlVW5pdH0gJHtzZWNzfSR7c2Vjb25kVW5pdH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHJlc291cmNlc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIGlmICh0aGlzLmNoYW5nZVRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNoYW5nZVRpbWVvdXQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5wZXJpb2RpY0ludGVydmFsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMucGVyaW9kaWNJbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVuc3Vic2NyaWJlIGZyb20gRXZlbnRCdXMgaWYgc3Vic2NyaWJlZFxuICAgICAgICBpZiAodGhpcy5pc1N1YnNjcmliZWQgJiYgdHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycpO1xuICAgICAgICAgICAgdGhpcy5pc1N1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgc3RhdHVzIHdvcmtlciB3aGVuIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8vIENsZWFuIHVwIG9uIHBhZ2UgdW5sb2FkXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5kZXN0cm95KCk7XG59KTtcblxuLy8gRXhwb3J0IGZvciBleHRlcm5hbCBhY2Nlc3NcbndpbmRvdy5wcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyOyJdfQ==