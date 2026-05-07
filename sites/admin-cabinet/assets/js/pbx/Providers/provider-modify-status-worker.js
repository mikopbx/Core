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
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the status label.
   * @type {jQuery}
   */
  $status: null,

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
    providerModifyStatusWorker.$formObj = $('#save-provider-form');
    providerModifyStatusWorker.$status = $('#status'); // Determine provider type and uniqid

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
    } // Fill in gaps: segments after last real event inherit its state,
    // segments before any real event stay grey (no confirmed data)


    var hasRealEvent = false;

    for (var i = 0; i < segments; i++) {
      if (segmentData[i]) {
        hasRealEvent = true;
        lastKnownState = segmentData[i];

        if (segmentEvents[i].length > 0) {
          lastKnownEvent = segmentEvents[i][segmentEvents[i].length - 1];
        }
      } else if (hasRealEvent) {
        // After a real event — inherit last known state
        segmentData[i] = lastKnownState;

        if (lastKnownEvent && segmentEvents[i].length === 0) {
          segmentEvents[i] = [_objectSpread(_objectSpread({}, lastKnownEvent), {}, {
            inherited: true
          })];
        }
      } else {
        // Before any real event — no data, grey
        segmentData[i] = 'grey';
      }
    } // If no events in 24h window but provider has known state, show it


    if (!hasRealEvent && currentStatus && lastKnownState !== 'grey') {
      for (var _i = 0; _i < segments; _i++) {
        segmentData[_i] = lastKnownState;

        if (lastKnownEvent) {
          segmentEvents[_i] = [_objectSpread(_objectSpread({}, lastKnownEvent), {}, {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiRzdGF0dXMiLCJwcm92aWRlclR5cGUiLCJwcm92aWRlcklkIiwiaXNTdWJzY3JpYmVkIiwibGFzdFN0YXR1cyIsImRpYWdub3N0aWNzSW5pdGlhbGl6ZWQiLCJoaXN0b3J5VGFibGUiLCJzdGF0dXNEYXRhIiwiaW5pdGlhbGl6ZSIsIiQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaW5jbHVkZXMiLCJmb3JtIiwiRGVidWdnZXJJbmZvIiwic3Vic2NyaWJlVG9FdmVudEJ1cyIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwic2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uIiwiRXZlbnRCdXMiLCJzdGFydFBlcmlvZGljVXBkYXRlIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImRhdGEiLCJldmVudCIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxldmFudENoYW5nZSIsImZpbmQiLCJjaGFuZ2UiLCJwcm92aWRlcl9pZCIsImlkIiwidXBkYXRlU3RhdHVzRGlzcGxheSIsInN0YXR1c2VzIiwicHJvdmlkZXJTdGF0dXMiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZXJyb3JUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfU3RhdHVzRXJyb3IiLCJodG1sIiwiZGVidWdJbmZvIiwidHlwZSIsInN0YXRlIiwibmV3X3N0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlVGV4dCIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMiLCJ1cGRhdGVTdGF0dXNMZWdhY3kiLCJ1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkiLCJzdGF0ZUljb24iLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdHVzQ29udGVudCIsImRpc3BsYXlUZXh0Iiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsInByX0NoZWNraW5nU3RhdHVzIiwiUHJvdmlkZXJzQVBJIiwiZ2V0U3RhdHVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcl9Ob3RGb3VuZCIsImhhbmRsZVJlcXVlc3RFcnJvciIsImVycm9yIiwicHJfQ29ubmVjdGlvbkVycm9yIiwia2V5RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsIiRmaWVsZCIsImxlbmd0aCIsIm9uIiwiY2xlYXJUaW1lb3V0IiwiY2hhbmdlVGltZW91dCIsInNldFRpbWVvdXQiLCJwZXJpb2RpY0ludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJpbml0aWFsaXplVGltZWxpbmUiLCIkY2hlY2tCdG4iLCJvZmYiLCJhcGlDbGllbnQiLCJTaXBQcm92aWRlcnNBUEkiLCJJYXhQcm92aWRlcnNBUEkiLCJmb3JjZUNoZWNrIiwibG9hZFRpbWVsaW5lRGF0YSIsImV4cG9ydEhpc3RvcnlUb0NTViIsImdldEhpc3RvcnkiLCJldmVudHMiLCJjdXJyZW50U3RhdHVzIiwicHJvdmlkZXIiLCJyZW5kZXJUaW1lbGluZSIsIiR0aW1lbGluZSIsIiRjb250YWluZXIiLCJlbXB0eSIsIm5vdyIsIk1hdGgiLCJmbG9vciIsImRheUFnbyIsInRpbWVSYW5nZSIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwiY2VpbCIsInNlZ21lbnREYXRhIiwiZmlsbCIsInNlZ21lbnRFdmVudHMiLCJtYXAiLCJzZWdtZW50SW5kZXgiLCJwdXNoIiwiY3VycmVudFN0YXRlIiwibmV3U3RhdGUiLCJnZXRTdGF0ZUNvbG9yIiwiZ2V0U3RhdGVQcmlvcml0eSIsImxhc3RLbm93blN0YXRlIiwiZGlzYWJsZWQiLCJsYXN0S25vd25FdmVudCIsImluaGVyaXRlZCIsInN5bnRoZXRpYyIsImhhc1JlYWxFdmVudCIsImkiLCJzZWdtZW50V2lkdGgiLCJjb2xvciIsImluZGV4IiwidG9vbHRpcENvbnRlbnQiLCJnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMiLCIkc2VnbWVudCIsImNzcyIsImdldENvbG9ySGV4IiwiYXR0ciIsImFwcGVuZCIsInBvcHVwIiwidmFyaWF0aW9uIiwiaG92ZXJhYmxlIiwiZ2V0U2VnbWVudFRvb2x0aXAiLCJob3Vyc0FnbyIsIm1pbnV0ZXNBZ28iLCJzZWdtZW50U3RhcnRUaW1lIiwic2VnbWVudEVuZFRpbWUiLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsInNvcnRlZEV2ZW50cyIsInNvcnQiLCJhIiwiYiIsImRpc3BsYXlFdmVudHMiLCJzbGljZSIsImV2ZW50VGltZSIsImNhcGl0YWxpemVGaXJzdCIsInN0ciIsImNoYXJBdCIsInRvTG93ZXJDYXNlIiwic2Vjb25kIiwicnR0Iiwic3RhdHVzSW5mbyIsIiRydHQiLCIkcnR0Q29udGFpbmVyIiwicGFyZW50IiwidW5kZWZpbmVkIiwicnR0Q29sb3IiLCJ0ZXh0IiwicHJfTWlsbGlzZWNvbmRzIiwiJGR1cmF0aW9uIiwiJHN0YXRlTGFiZWwiLCIkZHVyYXRpb25Db250YWluZXIiLCJzdGF0ZUR1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJwcl9DdXJyZW50U3RhdGUiLCJjb2xvckhleCIsInN0YXRpc3RpY3MiLCJzdGF0cyIsIiRhdmFpbGFiaWxpdHkiLCJhdmFpbGFiaWxpdHkiLCIkY2hlY2tzIiwidG90YWxDaGVja3MiLCIkYnRuIiwicHJvdmlkZXJJbmZvIiwiaG9zdCIsInVzZXJuYW1lIiwiZGVzY3JpcHRpb24iLCJkb3dubG9hZENTViIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicHJfRXhwb3J0RmFpbGVkIiwic2hvd1dhcm5pbmciLCJwcl9Ob0hpc3RvcnlUb0V4cG9ydCIsImhlYWRlcnMiLCJyb3dzIiwiZGF0ZXRpbWUiLCJwcmV2aW91c1N0YXRlIiwicHJldmlvdXNfc3RhdGUiLCJwZWVyU3RhdHVzIiwicGVlcl9zdGF0dXMiLCJxdWFsaWZ5RnJlcSIsInF1YWxpZnlfZnJlcSIsInF1YWxpZnlUaW1lIiwicXVhbGlmeV90aW1lIiwicmVnaXN0ZXJTdGF0dXMiLCJyZWdpc3Rlcl9zdGF0dXMiLCJjb250YWN0IiwidXNlckFnZW50IiwidXNlcl9hZ2VudCIsImxhc3RSZWdpc3RyYXRpb24iLCJsYXN0X3JlZ2lzdHJhdGlvbiIsImRldGFpbHMiLCJlcnJvck1lc3NhZ2UiLCJKU09OIiwic3RyaW5naWZ5IiwiQk9NIiwiY3N2Q29udGVudCIsImpvaW4iLCJyb3ciLCJjZWxsIiwiY2VsbFN0ciIsIlN0cmluZyIsInJlcGxhY2UiLCJibG9iIiwiQmxvYiIsInVybCIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImxpbmsiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdWJzdHJpbmciLCJmaWxlbmFtZSIsInNldEF0dHJpYnV0ZSIsInN0eWxlIiwiZGlzcGxheSIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJyZXZva2VPYmplY3RVUkwiLCJzZWNvbmRzIiwiZGF5cyIsImhvdXJzIiwibWludXRlcyIsInNlY3MiLCJkYXlVbml0IiwicHJfRGF5cyIsImhvdXJVbml0IiwicHJfSG91cnMiLCJtaW51dGVVbml0IiwicHJfTWludXRlcyIsInNlY29uZFVuaXQiLCJwcl9TZWNvbmRzIiwiZGVzdHJveSIsImNsZWFySW50ZXJ2YWwiLCJ1bnN1YnNjcmliZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSwwQkFBMEIsR0FBRztBQUUvQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQVBxQjs7QUFTL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLElBYnNCOztBQWUvQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsRUFuQmlCOztBQXFCL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLEVBekJtQjs7QUEyQi9CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxLQS9CaUI7O0FBaUMvQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFyQ21COztBQXVDL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsc0JBQXNCLEVBQUUsS0EzQ087O0FBNkMvQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFqRGlCOztBQW1EL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBdkRtQjs7QUF5RC9CO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQTVEK0Isd0JBNERsQjtBQUNUVixJQUFBQSwwQkFBMEIsQ0FBQ0MsUUFBM0IsR0FBc0NVLENBQUMsQ0FBQyxxQkFBRCxDQUF2QztBQUNBWCxJQUFBQSwwQkFBMEIsQ0FBQ0UsT0FBM0IsR0FBcUNTLENBQUMsQ0FBQyxTQUFELENBQXRDLENBRlMsQ0FJVDs7QUFDQSxRQUFJQyxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLFFBQWhCLENBQXlCQyxRQUF6QixDQUFrQyxXQUFsQyxDQUFKLEVBQW9EO0FBQ2hELFdBQUtaLFlBQUwsR0FBb0IsS0FBcEI7QUFDSCxLQUZELE1BRU8sSUFBSVMsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxRQUFoQixDQUF5QkMsUUFBekIsQ0FBa0MsV0FBbEMsQ0FBSixFQUFvRDtBQUN2RCxXQUFLWixZQUFMLEdBQW9CLEtBQXBCO0FBQ0gsS0FGTSxNQUVBO0FBQ0g7QUFDSCxLQVhRLENBYVQ7OztBQUNBLFNBQUtDLFVBQUwsR0FBa0IsS0FBS0gsUUFBTCxDQUFjZSxJQUFkLENBQW1CLFdBQW5CLEVBQWdDLElBQWhDLENBQWxCOztBQUNBLFFBQUksQ0FBQyxLQUFLWixVQUFWLEVBQXNCO0FBQ2xCO0FBQ0gsS0FqQlEsQ0FtQlQ7OztBQUNBLFFBQUksT0FBT2EsWUFBUCxLQUF3QixXQUE1QixFQUF5QztBQUNyQ0EsTUFBQUEsWUFBWSxDQUFDUCxVQUFiO0FBQ0gsS0F0QlEsQ0F3QlQ7OztBQUNBLFNBQUtRLG1CQUFMLEdBekJTLENBMkJUOztBQUNBLFNBQUtDLG9CQUFMLEdBNUJTLENBOEJUOztBQUNBLFNBQUtDLHdCQUFMO0FBQ0gsR0E1RjhCOztBQThGL0I7QUFDSjtBQUNBO0FBQ0lGLEVBQUFBLG1CQWpHK0IsaUNBaUdUO0FBQUE7O0FBQ2xCLFFBQUksT0FBT0csUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNqQyxXQUFLQyxtQkFBTDtBQUNBO0FBQ0g7O0FBRURELElBQUFBLFFBQVEsQ0FBQ0UsU0FBVCxDQUFtQixpQkFBbkIsRUFBc0MsVUFBQ0MsT0FBRCxFQUFhO0FBQy9DLE1BQUEsS0FBSSxDQUFDQyxxQkFBTCxDQUEyQkQsT0FBM0I7QUFDSCxLQUZEO0FBSUEsU0FBS25CLFlBQUwsR0FBb0IsSUFBcEI7QUFDSCxHQTVHOEI7O0FBOEcvQjtBQUNKO0FBQ0E7QUFDSW9CLEVBQUFBLHFCQWpIK0IsaUNBaUhURCxPQWpIUyxFQWlIQTtBQUMzQixRQUFJLENBQUNBLE9BQUQsSUFBWSxDQUFDQSxPQUFPLENBQUNFLElBQXpCLEVBQStCO0FBQzNCO0FBQ0gsS0FIMEIsQ0FLM0I7OztBQUNBLFFBQUlDLEtBQUosRUFBV0QsSUFBWDs7QUFDQSxRQUFJRixPQUFPLENBQUNHLEtBQVosRUFBbUI7QUFDZkEsTUFBQUEsS0FBSyxHQUFHSCxPQUFPLENBQUNHLEtBQWhCO0FBQ0FELE1BQUFBLElBQUksR0FBR0YsT0FBTyxDQUFDRSxJQUFmO0FBQ0gsS0FIRCxNQUdPLElBQUlGLE9BQU8sQ0FBQ0UsSUFBUixDQUFhQyxLQUFqQixFQUF3QjtBQUMzQkEsTUFBQUEsS0FBSyxHQUFHSCxPQUFPLENBQUNFLElBQVIsQ0FBYUMsS0FBckI7QUFDQUQsTUFBQUEsSUFBSSxHQUFHRixPQUFPLENBQUNFLElBQVIsQ0FBYUEsSUFBYixJQUFxQkYsT0FBTyxDQUFDRSxJQUFwQztBQUNILEtBSE0sTUFHQTtBQUNIO0FBQ0g7O0FBRUQsWUFBUUMsS0FBUjtBQUNJLFdBQUssZUFBTDtBQUNJLGFBQUtDLG1CQUFMLENBQXlCRixJQUF6QjtBQUNBOztBQUVKLFdBQUssaUJBQUw7QUFDSSxhQUFLRyxxQkFBTCxDQUEyQkgsSUFBM0I7QUFDQTs7QUFFSixXQUFLLGNBQUw7QUFDSSxhQUFLSSxpQkFBTCxDQUF1QkosSUFBdkI7QUFDQTs7QUFFSixjQWJKLENBY1E7O0FBZFI7QUFnQkgsR0FsSjhCOztBQW9KL0I7QUFDSjtBQUNBO0FBQ0lFLEVBQUFBLG1CQXZKK0IsK0JBdUpYRixJQXZKVyxFQXVKTDtBQUFBOztBQUN0QixRQUFJLENBQUNBLElBQUksQ0FBQ0ssT0FBTixJQUFpQixDQUFDQyxLQUFLLENBQUNDLE9BQU4sQ0FBY1AsSUFBSSxDQUFDSyxPQUFuQixDQUF0QixFQUFtRDtBQUMvQztBQUNILEtBSHFCLENBS3RCOzs7QUFDQSxRQUFNRyxjQUFjLEdBQUdSLElBQUksQ0FBQ0ssT0FBTCxDQUFhSSxJQUFiLENBQWtCLFVBQUFDLE1BQU07QUFBQSxhQUMzQ0EsTUFBTSxDQUFDQyxXQUFQLEtBQXVCLE1BQUksQ0FBQ2pDLFVBQTVCLElBQTBDZ0MsTUFBTSxDQUFDRSxFQUFQLEtBQWMsTUFBSSxDQUFDbEMsVUFEbEI7QUFBQSxLQUF4QixDQUF2Qjs7QUFJQSxRQUFJOEIsY0FBSixFQUFvQjtBQUNoQixXQUFLSyxtQkFBTCxDQUF5QkwsY0FBekI7QUFDSDtBQUNKLEdBcEs4Qjs7QUFzSy9CO0FBQ0o7QUFDQTtBQUNJTCxFQUFBQSxxQkF6SytCLGlDQXlLVEgsSUF6S1MsRUF5S0g7QUFBQTs7QUFDeEIsUUFBSSxDQUFDQSxJQUFJLENBQUNjLFFBQVYsRUFBb0I7QUFDaEI7QUFDSCxLQUh1QixDQUt4Qjs7O0FBQ0EsUUFBTUMsY0FBYyxHQUFHLDBCQUFBZixJQUFJLENBQUNjLFFBQUwsQ0FBYyxLQUFLckMsWUFBbkIsaUZBQW1DLEtBQUtDLFVBQXhDLE1BQ0RzQixJQUFJLENBQUNjLFFBQUwsQ0FBYyxLQUFLcEMsVUFBbkIsQ0FEdEI7O0FBR0EsUUFBSXFDLGNBQUosRUFBb0I7QUFDaEIsV0FBS0YsbUJBQUwsQ0FBeUJFLGNBQXpCO0FBQ0g7QUFDSixHQXJMOEI7O0FBdUwvQjtBQUNKO0FBQ0E7QUFDSVgsRUFBQUEsaUJBMUwrQiw2QkEwTGJKLElBMUxhLEVBMExQO0FBQ3BCO0FBQ0EsU0FBS3hCLE9BQUwsQ0FDS3dDLFdBREwsQ0FDaUIsMkJBRGpCLEVBRUtDLFFBRkwsQ0FFYyxLQUZkO0FBSUEsUUFBTUMsU0FBUyxHQUFHQyxlQUFlLENBQUNDLGNBQWxDO0FBQ0EsU0FBSzVDLE9BQUwsQ0FBYTZDLElBQWIsdURBQStESCxTQUEvRDtBQUNILEdBbE04Qjs7QUFvTS9CO0FBQ0o7QUFDQTtBQUNJTCxFQUFBQSxtQkF2TStCLCtCQXVNWDlCLFVBdk1XLEVBdU1DO0FBQzVCLFFBQUksQ0FBQ0EsVUFBTCxFQUFpQjtBQUNiO0FBQ0gsS0FIMkIsQ0FLNUI7OztBQUNBLFNBQUtILFVBQUwsR0FBa0JHLFVBQWxCLENBTjRCLENBUTVCOztBQUNBLFNBQUtBLFVBQUwsR0FBa0JBLFVBQWxCLENBVDRCLENBVzVCOztBQUNBLFFBQUksT0FBT1EsWUFBUCxLQUF3QixXQUE1QixFQUF5QztBQUNyQyxVQUFNK0IsU0FBUyxHQUFHO0FBQ2RWLFFBQUFBLEVBQUUsRUFBRSxLQUFLbEMsVUFESztBQUVkNkMsUUFBQUEsSUFBSSxFQUFFLEtBQUs5QyxZQUZHO0FBR2QrQyxRQUFBQSxLQUFLLEVBQUV6QyxVQUFVLENBQUN5QyxLQUFYLElBQW9CekMsVUFBVSxDQUFDMEMsU0FIeEI7QUFJZEMsUUFBQUEsVUFBVSxFQUFFM0MsVUFBVSxDQUFDMkMsVUFKVDtBQUtkQyxRQUFBQSxTQUFTLEVBQUU1QyxVQUFVLENBQUM0QyxTQUxSO0FBTWRDLFFBQUFBLFNBQVMsRUFBRSxJQUFJQyxJQUFKLEdBQVdDLFdBQVg7QUFORyxPQUFsQjtBQVNBLFVBQU1DLFNBQVMscUhBRW9CVCxTQUFTLENBQUNWLEVBRjlCLGtFQUdnQlUsU0FBUyxDQUFDQyxJQUgxQixtRUFJaUJELFNBQVMsQ0FBQ0UsS0FKM0IsbUVBS2lCRixTQUFTLENBQUNJLFVBTDNCLHFFQU1tQkosU0FBUyxDQUFDTSxTQU43Qix1REFBZjtBQVNBckMsTUFBQUEsWUFBWSxDQUFDeUMsYUFBYixDQUEyQkQsU0FBM0I7QUFDSCxLQWhDMkIsQ0FrQzVCOzs7QUFDQSxRQUFJaEQsVUFBVSxDQUFDMkMsVUFBWCxJQUF5QjNDLFVBQVUsQ0FBQzRDLFNBQXhDLEVBQW1EO0FBQy9DLFdBQUtNLGlDQUFMLENBQXVDbEQsVUFBdkM7QUFDSCxLQUZELE1BRU87QUFDSDtBQUNBLFdBQUttRCxrQkFBTCxDQUF3Qm5ELFVBQXhCO0FBQ0gsS0F4QzJCLENBMEM1Qjs7O0FBQ0EsUUFBSSxLQUFLRixzQkFBVCxFQUFpQztBQUM3QixXQUFLc0Qsd0JBQUwsQ0FBOEJwRCxVQUE5QjtBQUNIO0FBQ0osR0FyUDhCOztBQXVQL0I7QUFDSjtBQUNBO0FBQ0lrRCxFQUFBQSxpQ0ExUCtCLDZDQTBQR2xELFVBMVBILEVBMFBlO0FBQzFDLFFBQVEyQyxVQUFSLEdBQXNFM0MsVUFBdEUsQ0FBUTJDLFVBQVI7QUFBQSxRQUFvQlUsU0FBcEIsR0FBc0VyRCxVQUF0RSxDQUFvQnFELFNBQXBCO0FBQUEsUUFBK0JULFNBQS9CLEdBQXNFNUMsVUFBdEUsQ0FBK0I0QyxTQUEvQjtBQUFBLFFBQTBDVSxnQkFBMUMsR0FBc0V0RCxVQUF0RSxDQUEwQ3NELGdCQUExQztBQUFBLFFBQTREYixLQUE1RCxHQUFzRXpDLFVBQXRFLENBQTREeUMsS0FBNUQsQ0FEMEMsQ0FHMUM7O0FBQ0EsU0FBS2hELE9BQUwsQ0FDS3dDLFdBREwsQ0FDaUIsK0JBRGpCLEVBRUtDLFFBRkwsQ0FFY1MsVUFGZCxFQUowQyxDQVExQzs7QUFDQSxRQUFJWSxhQUFhLEdBQUcsRUFBcEI7O0FBQ0EsUUFBSUYsU0FBSixFQUFlO0FBQ1hFLE1BQUFBLGFBQWEseUJBQWlCRixTQUFqQixrQkFBYjtBQUNILEtBWnlDLENBYzFDOzs7QUFDQSxRQUFNRyxXQUFXLEdBQUdaLFNBQVMsSUFBSUgsS0FBYixJQUFzQixTQUExQztBQUNBYyxJQUFBQSxhQUFhLElBQUlDLFdBQWpCO0FBRUEsU0FBSy9ELE9BQUwsQ0FBYTZDLElBQWIsQ0FBa0JpQixhQUFsQjtBQUNILEdBN1E4Qjs7QUErUS9CO0FBQ0o7QUFDQTtBQUNJSixFQUFBQSxrQkFsUitCLDhCQWtSWm5ELFVBbFJZLEVBa1JBO0FBQzNCLFFBQU15QyxLQUFLLEdBQUd6QyxVQUFVLENBQUN5QyxLQUFYLElBQW9CekMsVUFBVSxDQUFDMEMsU0FBL0IsSUFBNEMsRUFBMUQ7QUFDQSxRQUFNZSxlQUFlLEdBQUdoQixLQUFLLENBQUNpQixXQUFOLEVBQXhCLENBRjJCLENBSTNCOztBQUNBLFNBQUtqRSxPQUFMLENBQWF3QyxXQUFiLENBQXlCLFNBQXpCOztBQUVBLFlBQVF3QixlQUFSO0FBQ0ksV0FBSyxZQUFMO0FBQ0EsV0FBSyxJQUFMO0FBQ0EsV0FBSyxXQUFMO0FBQ0ksYUFBS2hFLE9BQUwsQ0FDS3dDLFdBREwsQ0FDaUIsaUJBRGpCLEVBRUtDLFFBRkwsQ0FFYyxPQUZkLEVBR0tJLElBSEwsNENBRzRDRixlQUFlLENBQUN1QixTQUg1RDtBQUlBOztBQUVKLFdBQUssYUFBTDtBQUNBLFdBQUssUUFBTDtBQUNJLGFBQUtsRSxPQUFMLENBQ0t3QyxXQURMLENBQ2lCLGdCQURqQixFQUVLQyxRQUZMLENBRWMsUUFGZCxFQUdLSSxJQUhMLHVEQUd1REYsZUFBZSxDQUFDd0Isc0JBSHZFO0FBSUE7O0FBRUosV0FBSyxLQUFMO0FBQ0EsV0FBSyxhQUFMO0FBQ0ksYUFBS25FLE9BQUwsQ0FDS3dDLFdBREwsQ0FDaUIsa0JBRGpCLEVBRUtDLFFBRkwsQ0FFYyxNQUZkLEVBR0tJLElBSEwsd0NBR3dDRixlQUFlLENBQUN5QixVQUh4RDtBQUlBOztBQUVKLFdBQUssVUFBTDtBQUNBLFdBQUssY0FBTDtBQUNBLFdBQUssUUFBTDtBQUNJLGFBQUtwRSxPQUFMLENBQ0t3QyxXQURMLENBQ2lCLGtCQURqQixFQUVLQyxRQUZMLENBRWMsTUFGZCxFQUdLSSxJQUhMLHdDQUd3Q0YsZUFBZSxDQUFDeUIsVUFIeEQ7QUFJQTs7QUFFSjtBQUNJLGFBQUtwRSxPQUFMLENBQ0t3QyxXQURMLENBQ2lCLGtCQURqQixFQUVLQyxRQUZMLENBRWMsTUFGZCxFQUdLSSxJQUhMLDJDQUcyQ0csS0FBSyxJQUFJLFNBSHBEO0FBSUE7QUF4Q1I7QUEwQ0gsR0FuVThCOztBQXFVL0I7QUFDSjtBQUNBO0FBQ0kvQixFQUFBQSxvQkF4VStCLGtDQXdVUjtBQUFBOztBQUNuQjtBQUNBLFNBQUtqQixPQUFMLENBQ0t3QyxXQURMLENBQ2lCLHVCQURqQixFQUVLQyxRQUZMLENBRWMsU0FGZCxFQUdLSSxJQUhMLGtEQUdrREYsZUFBZSxDQUFDMEIsaUJBSGxFLEdBRm1CLENBT25COztBQUNBQyxJQUFBQSxZQUFZLENBQUNDLFNBQWIsQ0FBdUIsS0FBS3JFLFVBQTVCLEVBQXdDLFVBQUNzRSxRQUFELEVBQWM7QUFDbEQsTUFBQSxNQUFJLENBQUN4RSxPQUFMLENBQWF3QyxXQUFiLENBQXlCLFNBQXpCOztBQUVBLFVBQUlnQyxRQUFRLElBQUlBLFFBQVEsQ0FBQ0MsTUFBckIsSUFBK0JELFFBQVEsQ0FBQ2hELElBQTVDLEVBQWtEO0FBQzlDO0FBQ0EsUUFBQSxNQUFJLENBQUNhLG1CQUFMLENBQXlCbUMsUUFBUSxDQUFDaEQsSUFBbEM7QUFDSCxPQUhELE1BR08sSUFBSWdELFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUNDLE1BQTFCLEVBQWtDO0FBQ3JDO0FBQ0EsUUFBQSxNQUFJLENBQUN6RSxPQUFMLENBQ0t3QyxXQURMLENBQ2lCLGtCQURqQixFQUVLQyxRQUZMLENBRWMsTUFGZCxFQUdLSSxJQUhMLDJDQUcyQ0YsZUFBZSxDQUFDK0IsV0FIM0Q7QUFJSCxPQU5NLE1BTUE7QUFDSCxRQUFBLE1BQUksQ0FBQ0Msa0JBQUwsQ0FBd0IseUJBQXhCO0FBQ0g7QUFDSixLQWZEO0FBZ0JILEdBaFc4Qjs7QUFrVy9CO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxrQkFyVytCLDhCQXFXWkMsS0FyV1ksRUFxV0w7QUFDdEIsU0FBSzVFLE9BQUwsQ0FDS3dDLFdBREwsQ0FDaUIsMkJBRGpCLEVBRUtDLFFBRkwsQ0FFYyxLQUZkLEVBR0tJLElBSEwsdURBR3VERixlQUFlLENBQUNrQyxrQkFIdkU7QUFJSCxHQTFXOEI7O0FBNFcvQjtBQUNKO0FBQ0E7QUFDSTNELEVBQUFBLHdCQS9XK0Isc0NBK1dKO0FBQUE7O0FBQ3ZCO0FBQ0EsUUFBTTRELFNBQVMsR0FBRyxDQUFDLE1BQUQsRUFBUyxVQUFULEVBQXFCLFFBQXJCLEVBQStCLFVBQS9CLENBQWxCO0FBRUFBLElBQUFBLFNBQVMsQ0FBQ0MsT0FBVixDQUFrQixVQUFBQyxTQUFTLEVBQUk7QUFDM0IsVUFBTUMsTUFBTSxHQUFHLE1BQUksQ0FBQ2xGLFFBQUwsQ0FBY2tDLElBQWQsbUJBQTZCK0MsU0FBN0IsU0FBZjs7QUFDQSxVQUFJQyxNQUFNLENBQUNDLE1BQVgsRUFBbUI7QUFDZkQsUUFBQUEsTUFBTSxDQUFDRSxFQUFQLENBQVUsYUFBVixFQUF5QixZQUFNO0FBQzNCO0FBQ0FDLFVBQUFBLFlBQVksQ0FBQyxNQUFJLENBQUNDLGFBQU4sQ0FBWjtBQUNBLFVBQUEsTUFBSSxDQUFDQSxhQUFMLEdBQXFCQyxVQUFVLENBQUMsWUFBTTtBQUNsQyxnQkFBSSxNQUFJLENBQUNwRixVQUFULEVBQXFCO0FBQUU7QUFDbkIsY0FBQSxNQUFJLENBQUNlLG9CQUFMO0FBQ0g7QUFDSixXQUo4QixFQUk1QixJQUo0QixDQUEvQjtBQUtILFNBUkQ7QUFTSDtBQUNKLEtBYkQ7QUFjSCxHQWpZOEI7O0FBbVkvQjtBQUNKO0FBQ0E7QUFDSUcsRUFBQUEsbUJBdFkrQixpQ0FzWVQ7QUFBQTs7QUFDbEIsU0FBS21FLGdCQUFMLEdBQXdCQyxXQUFXLENBQUMsWUFBTTtBQUN0QyxNQUFBLE1BQUksQ0FBQ3ZFLG9CQUFMO0FBQ0gsS0FGa0MsRUFFaEMsSUFGZ0MsQ0FBbkMsQ0FEa0IsQ0FHUjtBQUNiLEdBMVk4Qjs7QUE0WS9CO0FBQ0o7QUFDQTtBQUNJd0UsRUFBQUEsd0JBL1krQixzQ0ErWUo7QUFBQTs7QUFDdkIsUUFBSSxLQUFLcEYsc0JBQVQsRUFBaUM7QUFDN0I7QUFDSCxLQUhzQixDQUt2Qjs7O0FBQ0EsU0FBS3FGLGtCQUFMLEdBTnVCLENBUXZCOztBQUNBLFFBQU1DLFNBQVMsR0FBR2xGLENBQUMsQ0FBQyxnQkFBRCxDQUFuQjtBQUNBa0YsSUFBQUEsU0FBUyxDQUFDQyxHQUFWLENBQWMsT0FBZCxFQUF1QlQsRUFBdkIsQ0FBMEIsT0FBMUIsRUFBbUMsWUFBTTtBQUNyQ1EsTUFBQUEsU0FBUyxDQUFDbEQsUUFBVixDQUFtQixTQUFuQixFQURxQyxDQUdyQzs7QUFDQSxVQUFNb0QsU0FBUyxHQUFHLE1BQUksQ0FBQzVGLFlBQUwsS0FBc0IsS0FBdEIsR0FBOEI2RixlQUE5QixHQUFnREMsZUFBbEUsQ0FKcUMsQ0FNckM7O0FBQ0FGLE1BQUFBLFNBQVMsQ0FBQ0csVUFBVixDQUFxQixNQUFJLENBQUM5RixVQUExQixFQUFzQyxVQUFDc0UsUUFBRCxFQUFjO0FBQ2hEbUIsUUFBQUEsU0FBUyxDQUFDbkQsV0FBVixDQUFzQixTQUF0Qjs7QUFDQSxZQUFJZ0MsUUFBUSxDQUFDQyxNQUFULElBQW1CRCxRQUFRLENBQUNoRCxJQUFoQyxFQUFzQztBQUNsQyxVQUFBLE1BQUksQ0FBQ2EsbUJBQUwsQ0FBeUJtQyxRQUFRLENBQUNoRCxJQUFsQzs7QUFDQSxVQUFBLE1BQUksQ0FBQ3lFLGdCQUFMO0FBQ0g7QUFDSixPQU5EO0FBT0gsS0FkRCxFQVZ1QixDQTBCdkI7O0FBQ0F4RixJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5Qm1GLEdBQXpCLENBQTZCLE9BQTdCLEVBQXNDVCxFQUF0QyxDQUF5QyxPQUF6QyxFQUFrRCxZQUFNO0FBQ3BELE1BQUEsTUFBSSxDQUFDZSxrQkFBTDtBQUNILEtBRkQsRUEzQnVCLENBK0J2Qjs7QUFDQSxRQUFJLEtBQUszRixVQUFULEVBQXFCO0FBQ2pCLFdBQUtvRCx3QkFBTCxDQUE4QixLQUFLcEQsVUFBbkM7QUFDSDs7QUFFRCxTQUFLRixzQkFBTCxHQUE4QixJQUE5QjtBQUNILEdBcGI4Qjs7QUFzYi9CO0FBQ0o7QUFDQTtBQUNJcUYsRUFBQUEsa0JBemIrQixnQ0F5YlY7QUFDakI7QUFDQSxTQUFLTyxnQkFBTDtBQUNILEdBNWI4Qjs7QUE4Yi9CO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxnQkFqYytCLDhCQWljWjtBQUFBOztBQUNmO0FBQ0EsUUFBTUosU0FBUyxHQUFHLEtBQUs1RixZQUFMLEtBQXNCLEtBQXRCLEdBQThCNkYsZUFBOUIsR0FBZ0RDLGVBQWxFLENBRmUsQ0FJZjs7QUFDQUYsSUFBQUEsU0FBUyxDQUFDTSxVQUFWLENBQXFCLEtBQUtqRyxVQUExQixFQUFzQyxVQUFDc0UsUUFBRCxFQUFjO0FBQ2hELFVBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDaEQsSUFBaEMsRUFBc0M7QUFDbEM7QUFDQSxZQUFNNEUsTUFBTSxHQUFHNUIsUUFBUSxDQUFDaEQsSUFBVCxDQUFjNEUsTUFBZCxJQUF3QixFQUF2QztBQUNBLFlBQU1DLGFBQWEsR0FBRzdCLFFBQVEsQ0FBQ2hELElBQVQsQ0FBYzhFLFFBQWQsSUFBMEIsTUFBSSxDQUFDL0YsVUFBckQ7O0FBQ0EsUUFBQSxNQUFJLENBQUNnRyxjQUFMLENBQW9CSCxNQUFwQixFQUE0QkMsYUFBNUI7QUFDSDs7QUFDRDVGLE1BQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCK0IsV0FBdEIsQ0FBa0MsUUFBbEM7QUFDSCxLQVJEO0FBU0gsR0EvYzhCOztBQWlkL0I7QUFDSjtBQUNBO0FBQ0krRCxFQUFBQSxjQXBkK0IsMEJBb2RoQkgsTUFwZGdCLEVBb2RjO0FBQUE7O0FBQUEsUUFBdEJDLGFBQXNCLHVFQUFOLElBQU07QUFDekMsUUFBTUcsU0FBUyxHQUFHL0YsQ0FBQyxDQUFDLG9CQUFELENBQW5CO0FBQ0EsUUFBTWdHLFVBQVUsR0FBR2hHLENBQUMsQ0FBQyw4QkFBRCxDQUFwQjs7QUFFQSxRQUFJLENBQUMrRixTQUFTLENBQUN0QixNQUFmLEVBQXVCO0FBQ25CO0FBQ0gsS0FOd0MsQ0FRekM7OztBQUNBc0IsSUFBQUEsU0FBUyxDQUFDRSxLQUFWLEdBVHlDLENBV3pDOztBQUNBLFFBQU1DLEdBQUcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVd4RCxJQUFJLENBQUNzRCxHQUFMLEtBQWEsSUFBeEIsQ0FBWjtBQUNBLFFBQU1HLE1BQU0sR0FBR0gsR0FBRyxHQUFJLEtBQUssRUFBTCxHQUFVLEVBQWhDO0FBQ0EsUUFBTUksU0FBUyxHQUFHLEtBQUssRUFBTCxHQUFVLEVBQTVCLENBZHlDLENBY1Q7QUFFaEM7O0FBQ0EsUUFBTUMsZUFBZSxHQUFHLEtBQUssRUFBN0IsQ0FqQnlDLENBaUJSOztBQUNqQyxRQUFNQyxRQUFRLEdBQUdMLElBQUksQ0FBQ00sSUFBTCxDQUFVSCxTQUFTLEdBQUdDLGVBQXRCLENBQWpCO0FBQ0EsUUFBTUcsV0FBVyxHQUFHLElBQUlyRixLQUFKLENBQVVtRixRQUFWLEVBQW9CRyxJQUFwQixDQUF5QixJQUF6QixDQUFwQjtBQUNBLFFBQU1DLGFBQWEsR0FBRyxJQUFJdkYsS0FBSixDQUFVbUYsUUFBVixFQUFvQkcsSUFBcEIsQ0FBeUIsSUFBekIsRUFBK0JFLEdBQS9CLENBQW1DO0FBQUEsYUFBTSxFQUFOO0FBQUEsS0FBbkMsQ0FBdEIsQ0FwQnlDLENBc0J6Qzs7QUFDQSxRQUFJbEIsTUFBTSxJQUFJQSxNQUFNLENBQUNsQixNQUFQLEdBQWdCLENBQTlCLEVBQWlDO0FBQzdCa0IsTUFBQUEsTUFBTSxDQUFDckIsT0FBUCxDQUFlLFVBQUF0RCxLQUFLLEVBQUk7QUFDcEIsWUFBSUEsS0FBSyxDQUFDMkIsU0FBTixJQUFtQjNCLEtBQUssQ0FBQzJCLFNBQU4sSUFBbUIwRCxNQUExQyxFQUFrRDtBQUM5QyxjQUFNUyxZQUFZLEdBQUdYLElBQUksQ0FBQ0MsS0FBTCxDQUFXLENBQUNwRixLQUFLLENBQUMyQixTQUFOLEdBQWtCMEQsTUFBbkIsSUFBNkJFLGVBQXhDLENBQXJCOztBQUNBLGNBQUlPLFlBQVksSUFBSSxDQUFoQixJQUFxQkEsWUFBWSxHQUFHTixRQUF4QyxFQUFrRDtBQUM5QztBQUNBSSxZQUFBQSxhQUFhLENBQUNFLFlBQUQsQ0FBYixDQUE0QkMsSUFBNUIsQ0FBaUMvRixLQUFqQyxFQUY4QyxDQUk5Qzs7QUFDQSxnQkFBTWdHLFlBQVksR0FBR04sV0FBVyxDQUFDSSxZQUFELENBQWhDOztBQUNBLGdCQUFNRyxRQUFRLEdBQUcsTUFBSSxDQUFDQyxhQUFMLENBQW1CbEcsS0FBSyxDQUFDdUIsS0FBTixJQUFldkIsS0FBSyxDQUFDd0IsU0FBeEMsQ0FBakI7O0FBRUEsZ0JBQUksQ0FBQ3dFLFlBQUQsSUFBaUIsTUFBSSxDQUFDRyxnQkFBTCxDQUFzQkYsUUFBdEIsSUFBa0MsTUFBSSxDQUFDRSxnQkFBTCxDQUFzQkgsWUFBdEIsQ0FBdkQsRUFBNEY7QUFDeEZOLGNBQUFBLFdBQVcsQ0FBQ0ksWUFBRCxDQUFYLEdBQTRCRyxRQUE1QjtBQUNIO0FBQ0o7QUFDSjtBQUNKLE9BaEJEO0FBaUJILEtBekN3QyxDQTJDekM7OztBQUNBLFFBQUlHLGNBQWMsR0FBRyxNQUFyQjs7QUFDQSxRQUFJeEIsYUFBSixFQUFtQjtBQUNmO0FBQ0EsVUFBSUEsYUFBYSxDQUFDbkQsVUFBbEIsRUFBOEI7QUFDMUIyRSxRQUFBQSxjQUFjLEdBQUd4QixhQUFhLENBQUNuRCxVQUEvQjtBQUNILE9BRkQsTUFFTyxJQUFJbUQsYUFBYSxDQUFDckQsS0FBbEIsRUFBeUI7QUFDNUI2RSxRQUFBQSxjQUFjLEdBQUcsS0FBS0YsYUFBTCxDQUFtQnRCLGFBQWEsQ0FBQ3JELEtBQWpDLENBQWpCO0FBQ0gsT0FGTSxNQUVBLElBQUlxRCxhQUFhLENBQUN5QixRQUFkLEtBQTJCLEtBQS9CLEVBQXNDO0FBQ3pDO0FBQ0FELFFBQUFBLGNBQWMsR0FBRyxPQUFqQjtBQUNIO0FBQ0osS0F2RHdDLENBeUR6Qzs7O0FBQ0EsUUFBSUUsY0FBYyxHQUFHLElBQXJCOztBQUNBLFFBQUkxQixhQUFhLEtBQUssQ0FBQ0QsTUFBRCxJQUFXQSxNQUFNLENBQUNsQixNQUFQLEtBQWtCLENBQWxDLENBQWpCLEVBQXVEO0FBQ25ENkMsTUFBQUEsY0FBYyxHQUFHO0FBQ2IzRSxRQUFBQSxTQUFTLEVBQUV1RCxHQURFO0FBRWIzRCxRQUFBQSxLQUFLLEVBQUVxRCxhQUFhLENBQUNyRCxLQUFkLElBQXVCLFlBRmpCO0FBR2JnRixRQUFBQSxTQUFTLEVBQUUsSUFIRTtBQUliQyxRQUFBQSxTQUFTLEVBQUU7QUFKRSxPQUFqQjtBQU1ILEtBbEV3QyxDQW9FekM7QUFDQTs7O0FBQ0EsUUFBSUMsWUFBWSxHQUFHLEtBQW5COztBQUNBLFNBQUssSUFBSUMsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR2xCLFFBQXBCLEVBQThCa0IsQ0FBQyxFQUEvQixFQUFtQztBQUMvQixVQUFJaEIsV0FBVyxDQUFDZ0IsQ0FBRCxDQUFmLEVBQW9CO0FBQ2hCRCxRQUFBQSxZQUFZLEdBQUcsSUFBZjtBQUNBTCxRQUFBQSxjQUFjLEdBQUdWLFdBQVcsQ0FBQ2dCLENBQUQsQ0FBNUI7O0FBQ0EsWUFBSWQsYUFBYSxDQUFDYyxDQUFELENBQWIsQ0FBaUJqRCxNQUFqQixHQUEwQixDQUE5QixFQUFpQztBQUM3QjZDLFVBQUFBLGNBQWMsR0FBR1YsYUFBYSxDQUFDYyxDQUFELENBQWIsQ0FBaUJkLGFBQWEsQ0FBQ2MsQ0FBRCxDQUFiLENBQWlCakQsTUFBakIsR0FBMEIsQ0FBM0MsQ0FBakI7QUFDSDtBQUNKLE9BTkQsTUFNTyxJQUFJZ0QsWUFBSixFQUFrQjtBQUNyQjtBQUNBZixRQUFBQSxXQUFXLENBQUNnQixDQUFELENBQVgsR0FBaUJOLGNBQWpCOztBQUNBLFlBQUlFLGNBQWMsSUFBSVYsYUFBYSxDQUFDYyxDQUFELENBQWIsQ0FBaUJqRCxNQUFqQixLQUE0QixDQUFsRCxFQUFxRDtBQUNqRG1DLFVBQUFBLGFBQWEsQ0FBQ2MsQ0FBRCxDQUFiLEdBQW1CLGlDQUFLSixjQUFMO0FBQXFCQyxZQUFBQSxTQUFTLEVBQUU7QUFBaEMsYUFBbkI7QUFDSDtBQUNKLE9BTk0sTUFNQTtBQUNIO0FBQ0FiLFFBQUFBLFdBQVcsQ0FBQ2dCLENBQUQsQ0FBWCxHQUFpQixNQUFqQjtBQUVIO0FBQ0osS0F6RndDLENBNEZ6Qzs7O0FBQ0EsUUFBSSxDQUFDRCxZQUFELElBQWlCN0IsYUFBakIsSUFBa0N3QixjQUFjLEtBQUssTUFBekQsRUFBaUU7QUFDN0QsV0FBSyxJQUFJTSxFQUFDLEdBQUcsQ0FBYixFQUFnQkEsRUFBQyxHQUFHbEIsUUFBcEIsRUFBOEJrQixFQUFDLEVBQS9CLEVBQW1DO0FBQy9CaEIsUUFBQUEsV0FBVyxDQUFDZ0IsRUFBRCxDQUFYLEdBQWlCTixjQUFqQjs7QUFDQSxZQUFJRSxjQUFKLEVBQW9CO0FBQ2hCVixVQUFBQSxhQUFhLENBQUNjLEVBQUQsQ0FBYixHQUFtQixpQ0FBS0osY0FBTDtBQUFxQkMsWUFBQUEsU0FBUyxFQUFFO0FBQWhDLGFBQW5CO0FBQ0g7QUFDSjtBQUNKLEtBcEd3QyxDQXNHekM7OztBQUNBLFFBQU1JLFlBQVksR0FBRyxNQUFNbkIsUUFBM0I7QUFDQUUsSUFBQUEsV0FBVyxDQUFDcEMsT0FBWixDQUFvQixVQUFDc0QsS0FBRCxFQUFRQyxLQUFSLEVBQWtCO0FBQ2xDLFVBQU1DLGNBQWMsR0FBRyxNQUFJLENBQUNDLDJCQUFMLENBQWlDRixLQUFqQyxFQUF3Q3RCLGVBQXhDLEVBQXlESyxhQUFhLENBQUNpQixLQUFELENBQXRFLENBQXZCOztBQUVBLFVBQU1HLFFBQVEsR0FBR2hJLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FDWmlJLEdBRFksQ0FDUjtBQUNELDJCQUFZTixZQUFaLE1BREM7QUFFRCxrQkFBVSxNQUZUO0FBR0QsNEJBQW9CLE1BQUksQ0FBQ08sV0FBTCxDQUFpQk4sS0FBakIsQ0FIbkI7QUFJRCxzQkFBYyxZQUpiO0FBS0Qsa0JBQVU7QUFMVCxPQURRLEVBUVpPLElBUlksQ0FRUCxXQVJPLEVBUU1MLGNBUk4sRUFTWkssSUFUWSxDQVNQLGVBVE8sRUFTVSxZQVRWLEVBVVpBLElBVlksQ0FVUCxnQkFWTyxFQVVXLE1BVlgsQ0FBakI7QUFZQXBDLE1BQUFBLFNBQVMsQ0FBQ3FDLE1BQVYsQ0FBaUJKLFFBQWpCO0FBQ0gsS0FoQkQsRUF4R3lDLENBMEh6Qzs7QUFDQWpDLElBQUFBLFNBQVMsQ0FBQ3ZFLElBQVYsQ0FBZSxhQUFmLEVBQThCNkcsS0FBOUIsQ0FBb0M7QUFDaENDLE1BQUFBLFNBQVMsRUFBRSxNQURxQjtBQUVoQ0MsTUFBQUEsU0FBUyxFQUFFLElBRnFCO0FBR2hDbkcsTUFBQUEsSUFBSSxFQUFFO0FBSDBCLEtBQXBDO0FBS0gsR0FwbEI4Qjs7QUFzbEIvQjtBQUNKO0FBQ0E7QUFDSThFLEVBQUFBLGFBemxCK0IseUJBeWxCakIzRSxLQXpsQmlCLEVBeWxCVjtBQUNqQixRQUFNZ0IsZUFBZSxHQUFHLENBQUNoQixLQUFLLElBQUksRUFBVixFQUFjaUIsV0FBZCxFQUF4Qjs7QUFDQSxZQUFRRCxlQUFSO0FBQ0ksV0FBSyxZQUFMO0FBQ0EsV0FBSyxJQUFMO0FBQ0EsV0FBSyxXQUFMO0FBQ0ksZUFBTyxPQUFQOztBQUNKLFdBQUssYUFBTDtBQUNBLFdBQUssUUFBTDtBQUNJLGVBQU8sUUFBUDs7QUFDSixXQUFLLEtBQUw7QUFDQSxXQUFLLFVBQUw7QUFDQSxXQUFLLGNBQUw7QUFDQSxXQUFLLFFBQUw7QUFDSSxlQUFPLEtBQVA7O0FBQ0o7QUFDSSxlQUFPLE1BQVA7QUFkUjtBQWdCSCxHQTNtQjhCOztBQTZtQi9CO0FBQ0o7QUFDQTtBQUNJNEQsRUFBQUEsZ0JBaG5CK0IsNEJBZ25CZFMsS0FobkJjLEVBZ25CUDtBQUNwQixZQUFRQSxLQUFSO0FBQ0ksV0FBSyxLQUFMO0FBQVksZUFBTyxDQUFQOztBQUNaLFdBQUssUUFBTDtBQUFlLGVBQU8sQ0FBUDs7QUFDZixXQUFLLE9BQUw7QUFBYyxlQUFPLENBQVA7O0FBQ2Q7QUFBUyxlQUFPLENBQVA7QUFKYjtBQU1ILEdBdm5COEI7O0FBeW5CL0I7QUFDSjtBQUNBO0FBQ0lNLEVBQUFBLFdBNW5CK0IsdUJBNG5CbkJOLEtBNW5CbUIsRUE0bkJaO0FBQ2YsWUFBUUEsS0FBUjtBQUNJLFdBQUssT0FBTDtBQUFjLGVBQU8sU0FBUDs7QUFDZCxXQUFLLFFBQUw7QUFBZSxlQUFPLFNBQVA7O0FBQ2YsV0FBSyxLQUFMO0FBQVksZUFBTyxTQUFQOztBQUNaO0FBQVMsZUFBTyxTQUFQO0FBSmI7QUFNSCxHQW5vQjhCOztBQXFvQi9CO0FBQ0o7QUFDQTtBQUNJWSxFQUFBQSxpQkF4b0IrQiw2QkF3b0JiMUIsWUF4b0JhLEVBd29CQ1AsZUF4b0JELEVBd29Ca0I7QUFDN0MsUUFBTWtDLFFBQVEsR0FBR3RDLElBQUksQ0FBQ0MsS0FBTCxDQUFXLENBQUMsS0FBS1UsWUFBTCxHQUFvQixDQUFyQixJQUEwQlAsZUFBMUIsR0FBNEMsSUFBdkQsQ0FBakI7QUFDQSxRQUFNbUMsVUFBVSxHQUFHdkMsSUFBSSxDQUFDQyxLQUFMLENBQVksQ0FBQyxLQUFLVSxZQUFMLEdBQW9CLENBQXJCLElBQTBCUCxlQUExQixHQUE0QyxJQUE3QyxHQUFxRCxFQUFoRSxDQUFuQjs7QUFFQSxRQUFJa0MsUUFBUSxHQUFHLENBQWYsRUFBa0I7QUFDZCx1QkFBVUEsUUFBVixvQkFBdUJDLFVBQXZCO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsdUJBQVVBLFVBQVY7QUFDSDtBQUNKLEdBanBCOEI7O0FBbXBCL0I7QUFDSjtBQUNBO0FBQ0lYLEVBQUFBLDJCQXRwQitCLHVDQXNwQkhqQixZQXRwQkcsRUFzcEJXUCxlQXRwQlgsRUFzcEI0QlosTUF0cEI1QixFQXNwQm9DO0FBQUE7O0FBQy9ELFFBQU1nRCxnQkFBZ0IsR0FBSTdCLFlBQVksR0FBR1AsZUFBekM7QUFDQSxRQUFNcUMsY0FBYyxHQUFJLENBQUM5QixZQUFZLEdBQUcsQ0FBaEIsSUFBcUJQLGVBQTdDO0FBQ0EsUUFBTUwsR0FBRyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV3hELElBQUksQ0FBQ3NELEdBQUwsS0FBYSxJQUF4QixDQUFaO0FBQ0EsUUFBTUcsTUFBTSxHQUFHSCxHQUFHLEdBQUksS0FBSyxFQUFMLEdBQVUsRUFBaEMsQ0FKK0QsQ0FNL0Q7O0FBQ0EsUUFBTTJDLFNBQVMsR0FBRyxJQUFJakcsSUFBSixDQUFTLENBQUN5RCxNQUFNLEdBQUdzQyxnQkFBVixJQUE4QixJQUF2QyxDQUFsQjtBQUNBLFFBQU1HLE9BQU8sR0FBRyxJQUFJbEcsSUFBSixDQUFTLENBQUN5RCxNQUFNLEdBQUd1QyxjQUFWLElBQTRCLElBQXJDLENBQWhCO0FBRUEsUUFBSXhHLElBQUksR0FBRyxtREFBWCxDQVYrRCxDQVkvRDs7QUFDQUEsSUFBQUEsSUFBSSw0REFBSjtBQUNBQSxJQUFBQSxJQUFJLGNBQU95RyxTQUFTLENBQUNFLGtCQUFWLENBQTZCLE9BQTdCLEVBQXNDO0FBQUNDLE1BQUFBLElBQUksRUFBRSxTQUFQO0FBQWtCQyxNQUFBQSxNQUFNLEVBQUU7QUFBMUIsS0FBdEMsQ0FBUCxRQUFKO0FBQ0E3RyxJQUFBQSxJQUFJLGNBQU8wRyxPQUFPLENBQUNDLGtCQUFSLENBQTJCLE9BQTNCLEVBQW9DO0FBQUNDLE1BQUFBLElBQUksRUFBRSxTQUFQO0FBQWtCQyxNQUFBQSxNQUFNLEVBQUU7QUFBMUIsS0FBcEMsQ0FBUCxDQUFKO0FBQ0E3RyxJQUFBQSxJQUFJLFlBQUosQ0FoQitELENBa0IvRDs7QUFDQSxRQUFJdUQsTUFBTSxJQUFJQSxNQUFNLENBQUNsQixNQUFQLEdBQWdCLENBQTlCLEVBQWlDO0FBQzdCckMsTUFBQUEsSUFBSSxJQUFJLDhFQUFSLENBRDZCLENBRzdCOztBQUNBLFVBQU04RyxZQUFZLEdBQUcsbUJBQUl2RCxNQUFKLEVBQVl3RCxJQUFaLENBQWlCLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGVBQVUsQ0FBQ0EsQ0FBQyxDQUFDMUcsU0FBRixJQUFlLENBQWhCLEtBQXNCeUcsQ0FBQyxDQUFDekcsU0FBRixJQUFlLENBQXJDLENBQVY7QUFBQSxPQUFqQixDQUFyQixDQUo2QixDQU03Qjs7O0FBQ0EsVUFBTTJHLGFBQWEsR0FBR0osWUFBWSxDQUFDSyxLQUFiLENBQW1CLENBQW5CLEVBQXNCLENBQXRCLENBQXRCO0FBRUFELE1BQUFBLGFBQWEsQ0FBQ2hGLE9BQWQsQ0FBc0IsVUFBQXRELEtBQUssRUFBSTtBQUMzQixZQUFNd0ksU0FBUyxHQUFHLElBQUk1RyxJQUFKLENBQVM1QixLQUFLLENBQUMyQixTQUFOLEdBQWtCLElBQTNCLENBQWxCO0FBQ0EsWUFBTUosS0FBSyxHQUFHdkIsS0FBSyxDQUFDdUIsS0FBTixJQUFldkIsS0FBSyxDQUFDd0IsU0FBckIsSUFBa0MsU0FBaEQsQ0FGMkIsQ0FHM0I7O0FBQ0EsWUFBTWlILGVBQWUsR0FBRyxTQUFsQkEsZUFBa0IsQ0FBQ0MsR0FBRCxFQUFTO0FBQzdCLGNBQUksQ0FBQ0EsR0FBTCxFQUFVLE9BQU9BLEdBQVA7QUFDVixpQkFBT0EsR0FBRyxDQUFDQyxNQUFKLENBQVcsQ0FBWCxFQUFjbkcsV0FBZCxLQUE4QmtHLEdBQUcsQ0FBQ0gsS0FBSixDQUFVLENBQVYsRUFBYUssV0FBYixFQUFyQztBQUNILFNBSEQ7O0FBSUEsWUFBTWxILFNBQVMsR0FBR1IsZUFBZSwyQkFBb0J1SCxlQUFlLENBQUNsSCxLQUFELENBQW5DLEVBQWYsSUFBZ0VBLEtBQWxGOztBQUNBLFlBQU1xRixLQUFLLEdBQUcsTUFBSSxDQUFDTSxXQUFMLENBQWlCLE1BQUksQ0FBQ2hCLGFBQUwsQ0FBbUIzRSxLQUFuQixDQUFqQixDQUFkOztBQUVBSCxRQUFBQSxJQUFJLElBQUksK0NBQVI7QUFDQUEsUUFBQUEsSUFBSSwyQ0FBa0NvSCxTQUFTLENBQUNULGtCQUFWLENBQTZCLE9BQTdCLEVBQXNDO0FBQUNDLFVBQUFBLElBQUksRUFBRSxTQUFQO0FBQWtCQyxVQUFBQSxNQUFNLEVBQUUsU0FBMUI7QUFBcUNZLFVBQUFBLE1BQU0sRUFBRTtBQUE3QyxTQUF0QyxDQUFsQyxhQUFKO0FBQ0F6SCxRQUFBQSxJQUFJLG1DQUEyQndGLEtBQTNCLDJDQUEyRGxGLFNBQTNELFlBQUosQ0FiMkIsQ0FlM0I7O0FBQ0EsWUFBSTFCLEtBQUssQ0FBQzhJLEdBQVYsRUFBZTtBQUNYMUgsVUFBQUEsSUFBSSw2Q0FBb0NwQixLQUFLLENBQUM4SSxHQUExQyxlQUFKO0FBQ0gsU0FsQjBCLENBb0IzQjs7O0FBQ0EsWUFBSTlJLEtBQUssQ0FBQ3VHLFNBQVYsRUFBcUI7QUFDakJuRixVQUFBQSxJQUFJLElBQUksdUVBQVI7QUFDSDs7QUFFREEsUUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxPQTFCRDs7QUE0QkEsVUFBSThHLFlBQVksQ0FBQ3pFLE1BQWIsR0FBc0IsQ0FBMUIsRUFBNkI7QUFDekJyQyxRQUFBQSxJQUFJLHNHQUF5RThHLFlBQVksQ0FBQ3pFLE1BQWIsR0FBc0IsQ0FBL0YseURBQUo7QUFDSDs7QUFFRHJDLE1BQUFBLElBQUksSUFBSSxRQUFSO0FBQ0gsS0ExQ0QsTUEwQ087QUFDSEEsTUFBQUEsSUFBSSxJQUFJLDhGQUFSO0FBQ0g7O0FBRURBLElBQUFBLElBQUksSUFBSSxRQUFSO0FBRUEsV0FBT0EsSUFBUDtBQUNILEdBMXRCOEI7O0FBNHRCL0I7QUFDSjtBQUNBO0FBQ0ljLEVBQUFBLHdCQS90QitCLG9DQSt0Qk42RyxVQS90Qk0sRUErdEJNO0FBQ2pDO0FBQ0EsUUFBTUMsSUFBSSxHQUFHaEssQ0FBQyxDQUFDLHFCQUFELENBQWQ7QUFDQSxRQUFNaUssYUFBYSxHQUFHRCxJQUFJLENBQUNFLE1BQUwsRUFBdEI7O0FBQ0EsUUFBSUYsSUFBSSxDQUFDdkYsTUFBVCxFQUFpQjtBQUNiLFVBQUlzRixVQUFVLENBQUNELEdBQVgsS0FBbUIsSUFBbkIsSUFBMkJDLFVBQVUsQ0FBQ0QsR0FBWCxLQUFtQkssU0FBbEQsRUFBNkQ7QUFDekQsWUFBTUMsUUFBUSxHQUFHTCxVQUFVLENBQUNELEdBQVgsR0FBaUIsR0FBakIsR0FBdUIsU0FBdkIsR0FBbUNDLFVBQVUsQ0FBQ0QsR0FBWCxHQUFpQixHQUFqQixHQUF1QixTQUF2QixHQUFtQyxTQUF2RjtBQUNBRSxRQUFBQSxJQUFJLENBQUNLLElBQUwsV0FBYU4sVUFBVSxDQUFDRCxHQUF4QixjQUErQjVILGVBQWUsQ0FBQ29JLGVBQS9DO0FBQ0FMLFFBQUFBLGFBQWEsQ0FBQ2hDLEdBQWQsQ0FBa0IsT0FBbEIsRUFBMkJtQyxRQUEzQjtBQUNILE9BSkQsTUFJTztBQUNISixRQUFBQSxJQUFJLENBQUNLLElBQUwsQ0FBVSxJQUFWO0FBQ0FKLFFBQUFBLGFBQWEsQ0FBQ2hDLEdBQWQsQ0FBa0IsT0FBbEIsRUFBMkIsU0FBM0I7QUFDSDtBQUNKLEtBYmdDLENBZWpDOzs7QUFDQSxRQUFNc0MsU0FBUyxHQUFHdkssQ0FBQyxDQUFDLDBCQUFELENBQW5CO0FBQ0EsUUFBTXdLLFdBQVcsR0FBR3hLLENBQUMsQ0FBQyx1QkFBRCxDQUFyQjtBQUNBLFFBQU15SyxrQkFBa0IsR0FBR0YsU0FBUyxDQUFDTCxNQUFWLEVBQTNCOztBQUVBLFFBQUlLLFNBQVMsQ0FBQzlGLE1BQVYsSUFBb0JzRixVQUFVLENBQUNXLGFBQW5DLEVBQWtEO0FBQzlDSCxNQUFBQSxTQUFTLENBQUNGLElBQVYsQ0FBZSxLQUFLTSxjQUFMLENBQW9CWixVQUFVLENBQUNXLGFBQS9CLENBQWY7QUFDSCxLQXRCZ0MsQ0F3QmpDOzs7QUFDQSxRQUFJRixXQUFXLENBQUMvRixNQUFoQixFQUF3QjtBQUNwQixVQUFNL0IsU0FBUyxHQUFHcUgsVUFBVSxDQUFDckgsU0FBWCxJQUNGcUgsVUFBVSxDQUFDeEgsS0FEVCxJQUVGTCxlQUFlLENBQUMwSSxlQUZoQztBQUdBSixNQUFBQSxXQUFXLENBQUNILElBQVosQ0FBaUIzSCxTQUFqQjtBQUNILEtBOUJnQyxDQWdDakM7OztBQUNBLFFBQUkrSCxrQkFBa0IsQ0FBQ2hHLE1BQW5CLElBQTZCc0YsVUFBVSxDQUFDdEgsVUFBNUMsRUFBd0Q7QUFDcEQsVUFBTW9JLFFBQVEsR0FBRyxLQUFLM0MsV0FBTCxDQUFpQjZCLFVBQVUsQ0FBQ3RILFVBQTVCLENBQWpCO0FBQ0FnSSxNQUFBQSxrQkFBa0IsQ0FBQ3hDLEdBQW5CLENBQXVCLE9BQXZCLEVBQWdDNEMsUUFBaEM7QUFDSCxLQXBDZ0MsQ0FzQ2pDOzs7QUFDQSxRQUFJZCxVQUFVLENBQUNlLFVBQWYsRUFBMkI7QUFDdkIsVUFBTUMsS0FBSyxHQUFHaEIsVUFBVSxDQUFDZSxVQUF6QjtBQUNBLFVBQU1FLGFBQWEsR0FBR2hMLENBQUMsQ0FBQyw4QkFBRCxDQUF2Qjs7QUFDQSxVQUFJZ0wsYUFBYSxDQUFDdkcsTUFBbEIsRUFBMEI7QUFDdEJ1RyxRQUFBQSxhQUFhLENBQUNYLElBQWQsQ0FBbUJVLEtBQUssQ0FBQ0UsWUFBTixhQUF3QkYsS0FBSyxDQUFDRSxZQUE5QixTQUFnRCxJQUFuRTtBQUNIOztBQUVELFVBQU1DLE9BQU8sR0FBR2xMLENBQUMsQ0FBQyx3QkFBRCxDQUFqQjs7QUFDQSxVQUFJa0wsT0FBTyxDQUFDekcsTUFBWixFQUFvQjtBQUNoQnlHLFFBQUFBLE9BQU8sQ0FBQ2IsSUFBUixDQUFhVSxLQUFLLENBQUNJLFdBQU4sSUFBcUIsR0FBbEM7QUFDSDtBQUNKO0FBQ0osR0FseEI4Qjs7QUFveEIvQjtBQUNKO0FBQ0E7QUFDSTFGLEVBQUFBLGtCQXZ4QitCLGdDQXV4QlY7QUFBQTs7QUFDakIsUUFBTTJGLElBQUksR0FBR3BMLENBQUMsQ0FBQyxxQkFBRCxDQUFkO0FBQ0FvTCxJQUFBQSxJQUFJLENBQUNwSixRQUFMLENBQWMsU0FBZCxFQUZpQixDQUlqQjs7QUFDQSxRQUFNcUosWUFBWSxHQUFHO0FBQ2pCQyxNQUFBQSxJQUFJLEVBQUUsS0FBS2hNLFFBQUwsQ0FBY2UsSUFBZCxDQUFtQixXQUFuQixFQUFnQyxNQUFoQyxDQURXO0FBRWpCa0wsTUFBQUEsUUFBUSxFQUFFLEtBQUtqTSxRQUFMLENBQWNlLElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBaEMsQ0FGTztBQUdqQm1MLE1BQUFBLFdBQVcsRUFBRSxLQUFLbE0sUUFBTCxDQUFjZSxJQUFkLENBQW1CLFdBQW5CLEVBQWdDLGFBQWhDO0FBSEksS0FBckIsQ0FMaUIsQ0FXakI7O0FBQ0EsUUFBTStFLFNBQVMsR0FBRyxLQUFLNUYsWUFBTCxLQUFzQixLQUF0QixHQUE4QjZGLGVBQTlCLEdBQWdEQyxlQUFsRSxDQVppQixDQWNqQjs7QUFDQUYsSUFBQUEsU0FBUyxDQUFDTSxVQUFWLENBQXFCLEtBQUtqRyxVQUExQixFQUFzQyxVQUFDc0UsUUFBRCxFQUFjO0FBQ2hEcUgsTUFBQUEsSUFBSSxDQUFDckosV0FBTCxDQUFpQixTQUFqQjs7QUFDQSxVQUFJZ0MsUUFBUSxDQUFDQyxNQUFULElBQW1CRCxRQUFRLENBQUNoRCxJQUE1QixJQUFvQ2dELFFBQVEsQ0FBQ2hELElBQVQsQ0FBYzRFLE1BQXRELEVBQThEO0FBQzFELFFBQUEsT0FBSSxDQUFDOEYsV0FBTCxDQUFpQjFILFFBQVEsQ0FBQ2hELElBQVQsQ0FBYzRFLE1BQS9CO0FBQ0lsRyxVQUFBQSxVQUFVLEVBQUUsT0FBSSxDQUFDQSxVQURyQjtBQUVJRCxVQUFBQSxZQUFZLEVBQUUsT0FBSSxDQUFDQSxZQUFMLENBQWtCZ0UsV0FBbEI7QUFGbEIsV0FHTzZILFlBSFA7QUFLSCxPQU5ELE1BTU8sSUFBSSxDQUFDdEgsUUFBUSxDQUFDQyxNQUFkLEVBQXNCO0FBQ3pCMEgsUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCekosZUFBZSxDQUFDMEosZUFBdEM7QUFDSDtBQUNKLEtBWEQ7QUFZSCxHQWx6QjhCOztBQW96Qi9CO0FBQ0o7QUFDQTtBQUNJSCxFQUFBQSxXQXZ6QitCLHVCQXV6Qm5COUYsTUF2ekJtQixFQXV6QlgwRixZQXZ6QlcsRUF1ekJHO0FBQzlCLFFBQUksQ0FBQzFGLE1BQUQsSUFBV0EsTUFBTSxDQUFDbEIsTUFBUCxLQUFrQixDQUFqQyxFQUFvQztBQUNoQ2lILE1BQUFBLFdBQVcsQ0FBQ0csV0FBWixDQUF3QjNKLGVBQWUsQ0FBQzRKLG9CQUF4QztBQUNBO0FBQ0gsS0FKNkIsQ0FNOUI7OztBQUNBLFFBQU1DLE9BQU8sR0FBRyxDQUNaLFdBRFksRUFFWixVQUZZLEVBR1osYUFIWSxFQUlaLGVBSlksRUFLWixlQUxZLEVBTVosbUJBTlksRUFPWixzQkFQWSxFQVFaLE9BUlksRUFTWixZQVRZLEVBVVosZ0JBVlksRUFXWixXQVhZLEVBWVosUUFaWSxFQWFaLGFBYlksRUFjWixjQWRZLEVBZVosY0FmWSxFQWdCWixpQkFoQlksRUFpQlosU0FqQlksRUFrQlosWUFsQlksRUFtQlosbUJBbkJZLEVBb0JaLFNBcEJZLEVBcUJaLGVBckJZLEVBc0JaLFVBdEJZLENBQWhCLENBUDhCLENBZ0M5Qjs7QUFDQSxRQUFNQyxJQUFJLEdBQUdyRyxNQUFNLENBQUNrQixHQUFQLENBQVcsVUFBQTdGLEtBQUssRUFBSTtBQUM3QjtBQUNBLGFBQU8sQ0FDSEEsS0FBSyxDQUFDMkIsU0FBTixJQUFtQixFQURoQixFQUVIM0IsS0FBSyxDQUFDaUwsUUFBTixJQUFrQixFQUZmLEVBR0haLFlBQVksQ0FBQzVMLFVBQWIsSUFBMkIsRUFIeEIsRUFJSDRMLFlBQVksQ0FBQzdMLFlBQWIsSUFBNkIsRUFKMUIsRUFLSDZMLFlBQVksQ0FBQ0MsSUFBYixJQUFxQixFQUxsQixFQU1IRCxZQUFZLENBQUNFLFFBQWIsSUFBeUIsRUFOdEIsRUFPSEYsWUFBWSxDQUFDRyxXQUFiLElBQTRCLEVBUHpCLEVBUUh4SyxLQUFLLENBQUNBLEtBQU4sSUFBZSxFQVJaLEVBU0hBLEtBQUssQ0FBQ3NCLElBQU4sSUFBYyxFQVRYLEVBVUh0QixLQUFLLENBQUNrTCxhQUFOLElBQXVCbEwsS0FBSyxDQUFDbUwsY0FBN0IsSUFBK0MsRUFWNUMsRUFXSG5MLEtBQUssQ0FBQ3VCLEtBQU4sSUFBZXZCLEtBQUssQ0FBQ3dCLFNBQXJCLElBQWtDLEVBWC9CLEVBWUh4QixLQUFLLENBQUM4SSxHQUFOLElBQWEsRUFaVixFQWFIOUksS0FBSyxDQUFDb0wsVUFBTixJQUFvQnBMLEtBQUssQ0FBQ3FMLFdBQTFCLElBQXlDLEVBYnRDLEVBY0hyTCxLQUFLLENBQUNzTCxXQUFOLElBQXFCdEwsS0FBSyxDQUFDdUwsWUFBM0IsSUFBMkMsRUFkeEMsRUFlSHZMLEtBQUssQ0FBQ3dMLFdBQU4sSUFBcUJ4TCxLQUFLLENBQUN5TCxZQUEzQixJQUEyQyxFQWZ4QyxFQWdCSHpMLEtBQUssQ0FBQzBMLGNBQU4sSUFBd0IxTCxLQUFLLENBQUMyTCxlQUE5QixJQUFpRCxFQWhCOUMsRUFpQkgzTCxLQUFLLENBQUM0TCxPQUFOLElBQWlCLEVBakJkLEVBa0JINUwsS0FBSyxDQUFDNkwsU0FBTixJQUFtQjdMLEtBQUssQ0FBQzhMLFVBQXpCLElBQXVDLEVBbEJwQyxFQW1CSDlMLEtBQUssQ0FBQytMLGdCQUFOLElBQTBCL0wsS0FBSyxDQUFDZ00saUJBQWhDLElBQXFELEVBbkJsRCxFQW9CSGhNLEtBQUssQ0FBQ2lNLE9BQU4sSUFBaUIsRUFwQmQsRUFxQkhqTSxLQUFLLENBQUNtRCxLQUFOLElBQWVuRCxLQUFLLENBQUNrTSxZQUFyQixJQUFxQyxFQXJCbEMsRUFzQkhDLElBQUksQ0FBQ0MsU0FBTCxDQUFlcE0sS0FBZixDQXRCRyxDQXNCbUI7QUF0Qm5CLE9BQVA7QUF3QkgsS0ExQlksQ0FBYixDQWpDOEIsQ0E2RDlCOztBQUNBLFFBQU1xTSxHQUFHLEdBQUcsUUFBWjtBQUNBLFFBQUlDLFVBQVUsR0FBR0QsR0FBakIsQ0EvRDhCLENBaUU5Qjs7QUFDQUMsSUFBQUEsVUFBVSxpQ0FBMEJqQyxZQUFZLENBQUM1TCxVQUF2QyxlQUFzRDRMLFlBQVksQ0FBQzdMLFlBQW5FLFFBQVY7QUFDQThOLElBQUFBLFVBQVUsc0JBQWVqQyxZQUFZLENBQUNDLElBQTVCLE9BQVY7QUFDQWdDLElBQUFBLFVBQVUsMEJBQW1CakMsWUFBWSxDQUFDRSxRQUFoQyxPQUFWO0FBQ0ErQixJQUFBQSxVQUFVLDZCQUFzQmpDLFlBQVksQ0FBQ0csV0FBbkMsT0FBVjtBQUNBOEIsSUFBQUEsVUFBVSw2QkFBc0IsSUFBSTFLLElBQUosR0FBV0MsV0FBWCxFQUF0QixPQUFWO0FBQ0F5SyxJQUFBQSxVQUFVLDhCQUF1QjNILE1BQU0sQ0FBQ2xCLE1BQTlCLE9BQVY7QUFDQTZJLElBQUFBLFVBQVUsSUFBSSxJQUFkLENBeEU4QixDQTBFOUI7O0FBQ0FBLElBQUFBLFVBQVUsSUFBSXZCLE9BQU8sQ0FBQ3dCLElBQVIsQ0FBYSxHQUFiLElBQW9CLElBQWxDLENBM0U4QixDQTZFOUI7O0FBQ0F2QixJQUFBQSxJQUFJLENBQUMxSCxPQUFMLENBQWEsVUFBQWtKLEdBQUcsRUFBSTtBQUNoQkYsTUFBQUEsVUFBVSxJQUFJRSxHQUFHLENBQUMzRyxHQUFKLENBQVEsVUFBQTRHLElBQUksRUFBSTtBQUMxQjtBQUNBLFlBQU1DLE9BQU8sR0FBR0MsTUFBTSxDQUFDRixJQUFELENBQXRCOztBQUNBLFlBQUlDLE9BQU8sQ0FBQ3ROLFFBQVIsQ0FBaUIsR0FBakIsS0FBeUJzTixPQUFPLENBQUN0TixRQUFSLENBQWlCLElBQWpCLENBQXpCLElBQW1Ec04sT0FBTyxDQUFDdE4sUUFBUixDQUFpQixHQUFqQixDQUFuRCxJQUE0RXNOLE9BQU8sQ0FBQ3ROLFFBQVIsQ0FBaUIsR0FBakIsQ0FBaEYsRUFBdUc7QUFDbkcsNkJBQVdzTixPQUFPLENBQUNFLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0IsSUFBdEIsQ0FBWDtBQUNIOztBQUNELGVBQU9GLE9BQVA7QUFDSCxPQVBhLEVBT1hILElBUFcsQ0FPTixHQVBNLElBT0MsSUFQZjtBQVFILEtBVEQsRUE5RThCLENBeUY5Qjs7QUFDQSxRQUFNTSxJQUFJLEdBQUcsSUFBSUMsSUFBSixDQUFTLENBQUNSLFVBQUQsQ0FBVCxFQUF1QjtBQUFFaEwsTUFBQUEsSUFBSSxFQUFFO0FBQVIsS0FBdkIsQ0FBYjtBQUNBLFFBQU15TCxHQUFHLEdBQUdDLEdBQUcsQ0FBQ0MsZUFBSixDQUFvQkosSUFBcEIsQ0FBWjtBQUNBLFFBQU1LLElBQUksR0FBR0MsUUFBUSxDQUFDQyxhQUFULENBQXVCLEdBQXZCLENBQWIsQ0E1RjhCLENBOEY5Qjs7QUFDQSxRQUFNbEksR0FBRyxHQUFHLElBQUl0RCxJQUFKLEVBQVo7QUFDQSxRQUFNRCxTQUFTLEdBQUd1RCxHQUFHLENBQUNyRCxXQUFKLEdBQWtCK0ssT0FBbEIsQ0FBMEIsT0FBMUIsRUFBbUMsR0FBbkMsRUFBd0NTLFNBQXhDLENBQWtELENBQWxELEVBQXFELEVBQXJELENBQWxCO0FBQ0EsUUFBTUMsUUFBUSxzQkFBZWpELFlBQVksQ0FBQzVMLFVBQTVCLGNBQTBDNEwsWUFBWSxDQUFDN0wsWUFBdkQsY0FBdUVtRCxTQUF2RSxTQUFkO0FBRUF1TCxJQUFBQSxJQUFJLENBQUNLLFlBQUwsQ0FBa0IsTUFBbEIsRUFBMEJSLEdBQTFCO0FBQ0FHLElBQUFBLElBQUksQ0FBQ0ssWUFBTCxDQUFrQixVQUFsQixFQUE4QkQsUUFBOUI7QUFDQUosSUFBQUEsSUFBSSxDQUFDTSxLQUFMLENBQVdDLE9BQVgsR0FBcUIsTUFBckI7QUFFQU4sSUFBQUEsUUFBUSxDQUFDTyxJQUFULENBQWNDLFdBQWQsQ0FBMEJULElBQTFCO0FBQ0FBLElBQUFBLElBQUksQ0FBQ1UsS0FBTDtBQUNBVCxJQUFBQSxRQUFRLENBQUNPLElBQVQsQ0FBY0csV0FBZCxDQUEwQlgsSUFBMUIsRUF6RzhCLENBMkc5Qjs7QUFDQXJKLElBQUFBLFVBQVUsQ0FBQztBQUFBLGFBQU1tSixHQUFHLENBQUNjLGVBQUosQ0FBb0JmLEdBQXBCLENBQU47QUFBQSxLQUFELEVBQWlDLEdBQWpDLENBQVY7QUFDSCxHQXA2QjhCOztBQXM2Qi9CO0FBQ0o7QUFDQTtBQUNJcEQsRUFBQUEsY0F6NkIrQiwwQkF5NkJoQm9FLE9BejZCZ0IsRUF5NkJQO0FBQ3BCLFFBQUksQ0FBQ0EsT0FBTCxFQUFjLE9BQU8sSUFBUDtBQUVkLFFBQU1DLElBQUksR0FBRzdJLElBQUksQ0FBQ0MsS0FBTCxDQUFXMkksT0FBTyxHQUFHLEtBQXJCLENBQWI7QUFDQSxRQUFNRSxLQUFLLEdBQUc5SSxJQUFJLENBQUNDLEtBQUwsQ0FBWTJJLE9BQU8sR0FBRyxLQUFYLEdBQW9CLElBQS9CLENBQWQ7QUFDQSxRQUFNRyxPQUFPLEdBQUcvSSxJQUFJLENBQUNDLEtBQUwsQ0FBWTJJLE9BQU8sR0FBRyxJQUFYLEdBQW1CLEVBQTlCLENBQWhCO0FBQ0EsUUFBTUksSUFBSSxHQUFHSixPQUFPLEdBQUcsRUFBdkIsQ0FOb0IsQ0FRcEI7O0FBQ0EsUUFBTUssT0FBTyxHQUFHbE4sZUFBZSxDQUFDbU4sT0FBaEM7QUFDQSxRQUFNQyxRQUFRLEdBQUdwTixlQUFlLENBQUNxTixRQUFqQztBQUNBLFFBQU1DLFVBQVUsR0FBR3ROLGVBQWUsQ0FBQ3VOLFVBQW5DO0FBQ0EsUUFBTUMsVUFBVSxHQUFHeE4sZUFBZSxDQUFDeU4sVUFBbkM7O0FBRUEsUUFBSVgsSUFBSSxHQUFHLENBQVgsRUFBYztBQUNWLHVCQUFVQSxJQUFWLFNBQWlCSSxPQUFqQixjQUE0QkgsS0FBNUIsU0FBb0NLLFFBQXBDLGNBQWdESixPQUFoRCxTQUEwRE0sVUFBMUQ7QUFDSCxLQUZELE1BRU8sSUFBSVAsS0FBSyxHQUFHLENBQVosRUFBZTtBQUNsQix1QkFBVUEsS0FBVixTQUFrQkssUUFBbEIsY0FBOEJKLE9BQTlCLFNBQXdDTSxVQUF4QyxjQUFzREwsSUFBdEQsU0FBNkRPLFVBQTdEO0FBQ0gsS0FGTSxNQUVBLElBQUlSLE9BQU8sR0FBRyxDQUFkLEVBQWlCO0FBQ3BCLHVCQUFVQSxPQUFWLFNBQW9CTSxVQUFwQixjQUFrQ0wsSUFBbEMsU0FBeUNPLFVBQXpDO0FBQ0gsS0FGTSxNQUVBO0FBQ0gsdUJBQVVQLElBQVYsU0FBaUJPLFVBQWpCO0FBQ0g7QUFDSixHQWg4QjhCOztBQWs4Qi9CO0FBQ0o7QUFDQTtBQUNJRSxFQUFBQSxPQXI4QitCLHFCQXE4QnJCO0FBQ04sUUFBSSxLQUFLaEwsYUFBVCxFQUF3QjtBQUNwQkQsTUFBQUEsWUFBWSxDQUFDLEtBQUtDLGFBQU4sQ0FBWjtBQUNIOztBQUVELFFBQUksS0FBS0UsZ0JBQVQsRUFBMkI7QUFDdkIrSyxNQUFBQSxhQUFhLENBQUMsS0FBSy9LLGdCQUFOLENBQWI7QUFDSCxLQVBLLENBU047OztBQUNBLFFBQUksS0FBS3BGLFlBQUwsSUFBcUIsT0FBT2dCLFFBQVAsS0FBb0IsV0FBN0MsRUFBMEQ7QUFDdERBLE1BQUFBLFFBQVEsQ0FBQ29QLFdBQVQsQ0FBcUIsaUJBQXJCO0FBQ0EsV0FBS3BRLFlBQUwsR0FBb0IsS0FBcEI7QUFDSDtBQUNKO0FBbjlCOEIsQ0FBbkMsQyxDQXU5QkE7O0FBQ0FNLENBQUMsQ0FBQ21PLFFBQUQsQ0FBRCxDQUFZNEIsS0FBWixDQUFrQixZQUFNO0FBQ3BCMVEsRUFBQUEsMEJBQTBCLENBQUNVLFVBQTNCO0FBQ0gsQ0FGRCxFLENBSUE7O0FBQ0FDLENBQUMsQ0FBQ0MsTUFBRCxDQUFELENBQVV5RSxFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CckYsRUFBQUEsMEJBQTBCLENBQUN1USxPQUEzQjtBQUNILENBRkQsRSxDQUlBOztBQUNBM1AsTUFBTSxDQUFDWiwwQkFBUCxHQUFvQ0EsMEJBQXBDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBEZWJ1Z2dlckluZm8sIEV2ZW50QnVzLCBnbG9iYWxSb290VXJsLCBQcm92aWRlcnNBUEksIFNpcFByb3ZpZGVyc0FQSSwgSWF4UHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogUHJvdmlkZXIgU3RhdHVzIFdvcmtlciBmb3IgTW9kaWZ5IFBhZ2VcbiAqIEhhbmRsZXMgcmVhbC10aW1lIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzIHZpYSBFdmVudEJ1cyBmb3IgaW5kaXZpZHVhbCBwcm92aWRlciBlZGl0IHBhZ2VzXG4gKiBSZXBsYWNlcyB0aGUgb2xkIHBvbGxpbmctYmFzZWQgYXBwcm9hY2ggd2l0aCBlZmZpY2llbnQgRXZlbnRCdXMgc3Vic2NyaXB0aW9uXG4gKlxuICogQG1vZHVsZSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlclxuICovXG5jb25zdCBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN0YXR1cyBsYWJlbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdGF0dXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBQcm92aWRlciB0eXBlIGRldGVybWluZWQgZnJvbSB0aGUgcGFnZSBVUkxcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHByb3ZpZGVyVHlwZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudCBwcm92aWRlciBpZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcHJvdmlkZXJJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRXZlbnRCdXMgc3Vic2NyaXB0aW9uIHN0YXR1c1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzU3Vic2NyaWJlZDogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogTGFzdCBrbm93biBwcm92aWRlciBzdGF0dXNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGxhc3RTdGF0dXM6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlhZ25vc3RpY3MgdGFiIGluaXRpYWxpemVkIGZsYWdcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkaWFnbm9zdGljc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaXN0b3J5IERhdGFUYWJsZSBpbnN0YW5jZVxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgaGlzdG9yeVRhYmxlOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgc3RhdHVzIGRhdGEgZm9yIGRpYWdub3N0aWNzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBzdGF0dXNEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgc3RhdHVzIHdvcmtlciB3aXRoIEV2ZW50QnVzIHN1YnNjcmlwdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLiRmb3JtT2JqID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybScpO1xuICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci4kc3RhdHVzID0gJCgnI3N0YXR1cycpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBwcm92aWRlciB0eXBlIGFuZCB1bmlxaWRcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnbW9kaWZ5c2lwJykpIHtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gJ3NpcCc7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCdtb2RpZnlpYXgnKSkge1xuICAgICAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSAnaWF4JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIGlkIGZyb20gZm9ybVxuICAgICAgICB0aGlzLnByb3ZpZGVySWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICBpZiAoIXRoaXMucHJvdmlkZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnZ2VyIGluZm9cbiAgICAgICAgaWYgKHR5cGVvZiBEZWJ1Z2dlckluZm8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudEJ1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1c1xuICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHJlZnJlc2ggc3RhdHVzXG4gICAgICAgIHRoaXMuc2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudEJ1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1VwZGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZSBmb3IgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGV2ZW50IGFuZCBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c191cGRhdGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfZXJyb3InOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBvdGhlciBldmVudHNcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgc3RhdHVzIGNoYW5nZSBmb3Igb3VyIHNwZWNpZmljIHByb3ZpZGVyXG4gICAgICAgIGNvbnN0IHJlbGV2YW50Q2hhbmdlID0gZGF0YS5jaGFuZ2VzLmZpbmQoY2hhbmdlID0+IFxuICAgICAgICAgICAgY2hhbmdlLnByb3ZpZGVyX2lkID09PSB0aGlzLnByb3ZpZGVySWQgfHwgY2hhbmdlLmlkID09PSB0aGlzLnByb3ZpZGVySWRcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWxldmFudENoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlbGV2YW50Q2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBvdXIgcHJvdmlkZXIgaW4gdGhlIHN0YXR1cyBkYXRhXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU3RhdHVzID0gZGF0YS5zdGF0dXNlc1t0aGlzLnByb3ZpZGVyVHlwZV0/Llt0aGlzLnByb3ZpZGVySWRdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnN0YXR1c2VzW3RoaXMucHJvdmlkZXJJZF07XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJTdGF0dXMpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShwcm92aWRlclN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdGF0dXMgZXJyb3JcbiAgICAgKi9cbiAgICBoYW5kbGVTdGF0dXNFcnJvcihkYXRhKSB7XG4gICAgICAgIC8vIFNob3cgZXJyb3Igc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRXJyb3I7XG4gICAgICAgIHRoaXMuJHN0YXR1cy5odG1sKGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+ICR7ZXJyb3JUZXh0fWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBkaXNwbGF5IHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgcHJvcGVydGllcyBvciBmYWxsYmFja1xuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0Rpc3BsYXkoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgbGFzdCBzdGF0dXMgZm9yIGRlYnVnZ2luZ1xuICAgICAgICB0aGlzLmxhc3RTdGF0dXMgPSBzdGF0dXNEYXRhO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzdGF0dXMgZGF0YSBmb3IgZGlhZ25vc3RpY3NcbiAgICAgICAgdGhpcy5zdGF0dXNEYXRhID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBEZWJ1Z2dlckluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRGVidWdnZXJJbmZvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc3QgZGVidWdJbmZvID0ge1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLnByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgdHlwZTogdGhpcy5wcm92aWRlclR5cGUsXG4gICAgICAgICAgICAgICAgc3RhdGU6IHN0YXR1c0RhdGEuc3RhdGUgfHwgc3RhdHVzRGF0YS5uZXdfc3RhdGUsXG4gICAgICAgICAgICAgICAgc3RhdGVDb2xvcjogc3RhdHVzRGF0YS5zdGF0ZUNvbG9yLFxuICAgICAgICAgICAgICAgIHN0YXRlVGV4dDogc3RhdHVzRGF0YS5zdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGh0bWxUYWJsZSA9IGBcbiAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5Qcm92aWRlcjwvdGQ+PHRkPiR7ZGVidWdJbmZvLmlkfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5UeXBlPC90ZD48dGQ+JHtkZWJ1Z0luZm8udHlwZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+U3RhdGU8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+Q29sb3I8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZUNvbG9yfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5VcGRhdGVkPC90ZD48dGQ+JHtkZWJ1Z0luZm8udGltZXN0YW1wfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc3RhdGVDb2xvciAmJiBzdGF0dXNEYXRhLnN0YXRlVGV4dCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsZWdhY3kgc3RhdGUtYmFzZWQgdXBkYXRlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xlZ2FjeShzdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgaWYgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBjb25zdCB7IHN0YXRlQ29sb3IsIHN0YXRlSWNvbiwgc3RhdGVUZXh0LCBzdGF0ZURlc2NyaXB0aW9uLCBzdGF0ZSB9ID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGNvbG9yIGNsYXNzXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3Moc3RhdGVDb2xvcik7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzdGF0dXMgY29udGVudCB3aXRoIGljb24gYW5kIHRyYW5zbGF0ZWQgdGV4dFxuICAgICAgICBsZXQgc3RhdHVzQ29udGVudCA9ICcnO1xuICAgICAgICBpZiAoc3RhdGVJY29uKSB7XG4gICAgICAgICAgICBzdGF0dXNDb250ZW50ICs9IGA8aSBjbGFzcz1cIiR7c3RhdGVJY29ufSBpY29uXCI+PC9pPiBgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0ZSB0ZXh0IGlzIGFscmVhZHkgdHJhbnNsYXRlZCBieSBBUEksIHVzZSBpdCBkaXJlY3RseVxuICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IHN0YXRlVGV4dCB8fCBzdGF0ZSB8fCAnVW5rbm93bic7XG4gICAgICAgIHN0YXR1c0NvbnRlbnQgKz0gZGlzcGxheVRleHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChzdGF0dXNDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGVnYWN5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlIHx8ICcnO1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSBzdGF0ZS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBiYXNlZCBvbiBzdGF0ZVxuICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cImNoZWNrbWFyayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PbmxpbmV9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIGdyZXkgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCd5ZWxsb3cnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9XaXRob3V0UmVnaXN0cmF0aW9ufWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwibWludXMgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZX1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyByZWQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2dyZXknKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0aW1lcyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PZmZsaW5lfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtzdGF0ZSB8fCAnVW5rbm93bid9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgZm9yIHRoZSBwcm92aWRlclxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2xvYWRpbmcnKVxuICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNraW5nU3RhdHVzfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgZm9yIHRoaXMgc3BlY2lmaWMgcHJvdmlkZXIgdmlhIFJFU1QgQVBJIHYzXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXModGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1cy5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZGlzcGxheSB3aXRoIHRoZSBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBub3QgZm91bmQgb3IgZXJyb3JcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfTm90Rm91bmR9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUmVxdWVzdEVycm9yKCdJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXF1ZXN0IGVycm9yc1xuICAgICAqL1xuICAgIGhhbmRsZVJlcXVlc3RFcnJvcihlcnJvcikge1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZyBncmVlbiB5ZWxsb3cgZ3JleScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpXG4gICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9Db25uZWN0aW9uRXJyb3J9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gcmVmcmVzaCBzdGF0dXMgd2hlbiBwcm92aWRlciBzZXR0aW5ncyBjaGFuZ2VcbiAgICAgKi9cbiAgICBzZXR1cEZvcm1DaGFuZ2VEZXRlY3Rpb24oKSB7XG4gICAgICAgIC8vIE1vbml0b3Iga2V5IGZpZWxkcyB0aGF0IG1pZ2h0IGFmZmVjdCBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgY29uc3Qga2V5RmllbGRzID0gWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdkaXNhYmxlZCddO1xuICAgICAgICBcbiAgICAgICAga2V5RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IHRoaXMuJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLm9uKCdjaGFuZ2UgYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVib3VuY2Ugc3RhdHVzIHJlcXVlc3RzXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNoYW5nZVRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnByb3ZpZGVySWQpIHsgLy8gT25seSByZXF1ZXN0IGlmIHdlIGhhdmUgYSB2YWxpZCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgcGVyaW9kaWMgdXBkYXRlIGZvciB3aGVuIEV2ZW50QnVzIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBzdGFydFBlcmlvZGljVXBkYXRlKCkge1xuICAgICAgICB0aGlzLnBlcmlvZGljSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIH0sIDUwMDApOyAvLyBDaGVjayBldmVyeSA1IHNlY29uZHMgYXMgZmFsbGJhY2tcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKSB7XG4gICAgICAgIGlmICh0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lbGluZVxuICAgICAgICB0aGlzLmluaXRpYWxpemVUaW1lbGluZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yY2UgY2hlY2sgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgY29uc3QgJGNoZWNrQnRuID0gJCgnI2NoZWNrLW5vdy1idG4nKTtcbiAgICAgICAgJGNoZWNrQnRuLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAkY2hlY2tCdG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBhcHByb3ByaWF0ZSBBUEkgY2xpZW50IGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBmb3JjZUNoZWNrIHVzaW5nIHYzIEFQSVxuICAgICAgICAgICAgYXBpQ2xpZW50LmZvcmNlQ2hlY2sodGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkY2hlY2tCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHBvcnQgaGlzdG9yeSBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjZXhwb3J0LWhpc3RvcnktYnRuJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZXhwb3J0SGlzdG9yeVRvQ1NWKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzcGxheSBjdXJyZW50IHN0YXR1cyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkodGhpcy5zdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lbGluZSgpIHtcbiAgICAgICAgLy8gTG9hZCB0aW1lbGluZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFRpbWVsaW5lRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB0aW1lbGluZSBkYXRhIGZyb20gaGlzdG9yeVxuICAgICAqL1xuICAgIGxvYWRUaW1lbGluZURhdGEoKSB7XG4gICAgICAgIC8vIFVzZSB0aGUgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcblxuICAgICAgICAvLyBDYWxsIGdldEhpc3RvcnkgdXNpbmcgdjMgQVBJXG4gICAgICAgIGFwaUNsaWVudC5nZXRIaXN0b3J5KHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXNzIGJvdGggZXZlbnRzIGFuZCBjdXJyZW50IHByb3ZpZGVyIHN0YXR1cyB0byB0aW1lbGluZVxuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50cyA9IHJlc3BvbnNlLmRhdGEuZXZlbnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0dXMgPSByZXNwb25zZS5kYXRhLnByb3ZpZGVyIHx8IHRoaXMuc3RhdHVzRGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclRpbWVsaW5lKGV2ZW50cywgY3VycmVudFN0YXR1cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjdGltZWxpbmUtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aW1lbGluZSB2aXN1YWxpemF0aW9uXG4gICAgICovXG4gICAgcmVuZGVyVGltZWxpbmUoZXZlbnRzLCBjdXJyZW50U3RhdHVzID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkdGltZWxpbmUgPSAkKCcjcHJvdmlkZXItdGltZWxpbmUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNwcm92aWRlci10aW1lbGluZS1jb250YWluZXInKTtcblxuICAgICAgICBpZiAoISR0aW1lbGluZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIHRpbWVsaW5lXG4gICAgICAgICR0aW1lbGluZS5lbXB0eSgpO1xuXG4gICAgICAgIC8vIEdldCB0aW1lIHJhbmdlIChsYXN0IDI0IGhvdXJzKVxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG4gICAgICAgIGNvbnN0IHRpbWVSYW5nZSA9IDI0ICogNjAgKiA2MDsgLy8gMjQgaG91cnMgaW4gc2Vjb25kc1xuXG4gICAgICAgIC8vIEdyb3VwIGV2ZW50cyBieSB0aW1lIHNlZ21lbnRzICgxNSBtaW51dGUgc2VnbWVudHMpXG4gICAgICAgIGNvbnN0IHNlZ21lbnREdXJhdGlvbiA9IDE1ICogNjA7IC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZWdtZW50cyA9IE1hdGguY2VpbCh0aW1lUmFuZ2UgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICBjb25zdCBzZWdtZW50RGF0YSA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEV2ZW50cyA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKS5tYXAoKCkgPT4gW10pO1xuXG4gICAgICAgIC8vIFByb2Nlc3MgZXZlbnRzIGFuZCBzdG9yZSB0aGVtIGluIHNlZ21lbnRzIGlmIHdlIGhhdmUgYW55XG4gICAgICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGltZXN0YW1wICYmIGV2ZW50LnRpbWVzdGFtcCA+PSBkYXlBZ28pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEluZGV4ID0gTWF0aC5mbG9vcigoZXZlbnQudGltZXN0YW1wIC0gZGF5QWdvKSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWdtZW50SW5kZXggPj0gMCAmJiBzZWdtZW50SW5kZXggPCBzZWdtZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgZXZlbnQgaW4gc2VnbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tzZWdtZW50SW5kZXhdLnB1c2goZXZlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmlvcml0aXplIHdvcnNlIHN0YXRlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gc2VnbWVudERhdGFbc2VnbWVudEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gdGhpcy5nZXRTdGF0ZUNvbG9yKGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFN0YXRlIHx8IHRoaXMuZ2V0U3RhdGVQcmlvcml0eShuZXdTdGF0ZSkgPiB0aGlzLmdldFN0YXRlUHJpb3JpdHkoY3VycmVudFN0YXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW3NlZ21lbnRJbmRleF0gPSBuZXdTdGF0ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGluaXRpYWwgc3RhdGUgYmFzZWQgb24gY3VycmVudCBwcm92aWRlciBzdGF0dXMgb3IgZGVmYXVsdCB0byBncmV5XG4gICAgICAgIGxldCBsYXN0S25vd25TdGF0ZSA9ICdncmV5JztcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0dXMpIHtcbiAgICAgICAgICAgIC8vIFVzZSBjdXJyZW50IHByb3ZpZGVyIHN0YXRlIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgaWYgKGN1cnJlbnRTdGF0dXMuc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gY3VycmVudFN0YXR1cy5zdGF0ZUNvbG9yO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RhdHVzLnN0YXRlKSB7XG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSB0aGlzLmdldFN0YXRlQ29sb3IoY3VycmVudFN0YXR1cy5zdGF0ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdGF0dXMuZGlzYWJsZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgaXMgZW5hYmxlZCBidXQgc3RhdGUgdW5rbm93biAtIGFzc3VtZSByZWdpc3RlcmVkXG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSAnZ3JlZW4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHN5bnRoZXRpYyBjdXJyZW50IHN0YXRlIGV2ZW50IGZvciB0b29sdGlwcyB3aGVuIG5vIGV2ZW50cyBleGlzdFxuICAgICAgICBsZXQgbGFzdEtub3duRXZlbnQgPSBudWxsO1xuICAgICAgICBpZiAoY3VycmVudFN0YXR1cyAmJiAoIWV2ZW50cyB8fCBldmVudHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgbGFzdEtub3duRXZlbnQgPSB7XG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBub3csXG4gICAgICAgICAgICAgICAgc3RhdGU6IGN1cnJlbnRTdGF0dXMuc3RhdGUgfHwgJ3JlZ2lzdGVyZWQnLFxuICAgICAgICAgICAgICAgIGluaGVyaXRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzeW50aGV0aWM6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaWxsIGluIGdhcHM6IHNlZ21lbnRzIGFmdGVyIGxhc3QgcmVhbCBldmVudCBpbmhlcml0IGl0cyBzdGF0ZSxcbiAgICAgICAgLy8gc2VnbWVudHMgYmVmb3JlIGFueSByZWFsIGV2ZW50IHN0YXkgZ3JleSAobm8gY29uZmlybWVkIGRhdGEpXG4gICAgICAgIGxldCBoYXNSZWFsRXZlbnQgPSBmYWxzZTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50czsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoc2VnbWVudERhdGFbaV0pIHtcbiAgICAgICAgICAgICAgICBoYXNSZWFsRXZlbnQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gc2VnbWVudERhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnRFdmVudHNbaV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsYXN0S25vd25FdmVudCA9IHNlZ21lbnRFdmVudHNbaV1bc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1JlYWxFdmVudCkge1xuICAgICAgICAgICAgICAgIC8vIEFmdGVyIGEgcmVhbCBldmVudCDigJQgaW5oZXJpdCBsYXN0IGtub3duIHN0YXRlXG4gICAgICAgICAgICAgICAgc2VnbWVudERhdGFbaV0gPSBsYXN0S25vd25TdGF0ZTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdEtub3duRXZlbnQgJiYgc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tpXSA9IFt7Li4ubGFzdEtub3duRXZlbnQsIGluaGVyaXRlZDogdHJ1ZX1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQmVmb3JlIGFueSByZWFsIGV2ZW50IOKAlCBubyBkYXRhLCBncmV5XG4gICAgICAgICAgICAgICAgc2VnbWVudERhdGFbaV0gPSAnZ3JleSc7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcblxuICAgICAgICAvLyBJZiBubyBldmVudHMgaW4gMjRoIHdpbmRvdyBidXQgcHJvdmlkZXIgaGFzIGtub3duIHN0YXRlLCBzaG93IGl0XG4gICAgICAgIGlmICghaGFzUmVhbEV2ZW50ICYmIGN1cnJlbnRTdGF0dXMgJiYgbGFzdEtub3duU3RhdGUgIT09ICdncmV5Jykge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudERhdGFbaV0gPSBsYXN0S25vd25TdGF0ZTtcbiAgICAgICAgICAgICAgICBpZiAobGFzdEtub3duRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tpXSA9IFt7Li4ubGFzdEtub3duRXZlbnQsIGluaGVyaXRlZDogdHJ1ZX1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbmRlciBzZWdtZW50c1xuICAgICAgICBjb25zdCBzZWdtZW50V2lkdGggPSAxMDAgLyBzZWdtZW50cztcbiAgICAgICAgc2VnbWVudERhdGEuZm9yRWFjaCgoY29sb3IsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IHRoaXMuZ2V0U2VnbWVudFRvb2x0aXBXaXRoRXZlbnRzKGluZGV4LCBzZWdtZW50RHVyYXRpb24sIHNlZ21lbnRFdmVudHNbaW5kZXhdKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgJHNlZ21lbnQgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgICd3aWR0aCc6IGAke3NlZ21lbnRXaWR0aH0lYCxcbiAgICAgICAgICAgICAgICAgICAgJ2hlaWdodCc6ICcxMDAlJyxcbiAgICAgICAgICAgICAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiB0aGlzLmdldENvbG9ySGV4KGNvbG9yKSxcbiAgICAgICAgICAgICAgICAgICAgJ2JveC1zaXppbmcnOiAnYm9yZGVyLWJveCcsXG4gICAgICAgICAgICAgICAgICAgICdjdXJzb3InOiAncG9pbnRlcidcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWh0bWwnLCB0b29sdGlwQ29udGVudClcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgY2VudGVyJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS12YXJpYXRpb24nLCAnbWluaScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGltZWxpbmUuYXBwZW5kKCRzZWdtZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHdpdGggSFRNTCBjb250ZW50XG4gICAgICAgICR0aW1lbGluZS5maW5kKCdbZGF0YS1odG1sXScpLnBvcHVwKHtcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ21pbmknLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgaHRtbDogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0ZSBjb2xvciBjbGFzc1xuICAgICAqL1xuICAgIGdldFN0YXRlQ29sb3Ioc3RhdGUpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFN0YXRlID0gKHN0YXRlIHx8ICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBzd2l0Y2ggKG5vcm1hbGl6ZWRTdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAnUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdPSyc6XG4gICAgICAgICAgICBjYXNlICdSRUFDSEFCTEUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnTEFHR0VEJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgICAgICBjYXNlICdPRkYnOlxuICAgICAgICAgICAgY2FzZSAnUkVKRUNURUQnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ0ZBSUxFRCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQnO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RhdGUgcHJpb3JpdHkgZm9yIGNvbmZsaWN0IHJlc29sdXRpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0ZVByaW9yaXR5KGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlZCc6IHJldHVybiAzO1xuICAgICAgICAgICAgY2FzZSAneWVsbG93JzogcmV0dXJuIDI7XG4gICAgICAgICAgICBjYXNlICdncmVlbic6IHJldHVybiAxO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBoZXggY29sb3IgY29kZVxuICAgICAqL1xuICAgIGdldENvbG9ySGV4KGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ2dyZWVuJzogcmV0dXJuICcjMjFiYTQ1JztcbiAgICAgICAgICAgIGNhc2UgJ3llbGxvdyc6IHJldHVybiAnI2ZiYmQwOCc7XG4gICAgICAgICAgICBjYXNlICdyZWQnOiByZXR1cm4gJyNkYjI4MjgnO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuICcjNzY3Njc2JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHNlZ21lbnQgdG9vbHRpcCB0ZXh0XG4gICAgICovXG4gICAgZ2V0U2VnbWVudFRvb2x0aXAoc2VnbWVudEluZGV4LCBzZWdtZW50RHVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgaG91cnNBZ28gPSBNYXRoLmZsb29yKCg5NiAtIHNlZ21lbnRJbmRleCAtIDEpICogc2VnbWVudER1cmF0aW9uIC8gMzYwMCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXNBZ28gPSBNYXRoLmZsb29yKCgoOTYgLSBzZWdtZW50SW5kZXggLSAxKSAqIHNlZ21lbnREdXJhdGlvbiAlIDM2MDApIC8gNjApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhvdXJzQWdvID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzQWdvfdGHICR7bWludXRlc0Fnb33QvCDQvdCw0LfQsNC0YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzQWdvfdC8INC90LDQt9Cw0LRgO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc2VnbWVudCB0b29sdGlwIHdpdGggZXZlbnRzIGRldGFpbHNcbiAgICAgKi9cbiAgICBnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoc2VnbWVudEluZGV4LCBzZWdtZW50RHVyYXRpb24sIGV2ZW50cykge1xuICAgICAgICBjb25zdCBzZWdtZW50U3RhcnRUaW1lID0gKHNlZ21lbnRJbmRleCAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRFbmRUaW1lID0gKChzZWdtZW50SW5kZXggKyAxKSAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkYXlBZ28gPSBub3cgLSAoMjQgKiA2MCAqIDYwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIHJhbmdlIGZvciB0aGlzIHNlZ21lbnRcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKGRheUFnbyArIHNlZ21lbnRTdGFydFRpbWUpICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXcgRGF0ZSgoZGF5QWdvICsgc2VnbWVudEVuZFRpbWUpICogMTAwMCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogbGVmdDsgbWluLXdpZHRoOiAyMDBweDtcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gVGltZSByYW5nZSBoZWFkZXJcbiAgICAgICAgaHRtbCArPSBgPGRpdiBzdHlsZT1cImZvbnQtd2VpZ2h0OiBib2xkOyBtYXJnaW4tYm90dG9tOiA1cHg7XCI+YDtcbiAgICAgICAgaHRtbCArPSBgJHtzdGFydFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSl9IC0gYDtcbiAgICAgICAgaHRtbCArPSBgJHtlbmRUaW1lLnRvTG9jYWxlVGltZVN0cmluZygncnUtUlUnLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pfWA7XG4gICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudHMgaW4gdGhpcyBzZWdtZW50XG4gICAgICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJib3JkZXItdG9wOiAxcHggc29saWQgI2RkZDsgbWFyZ2luLXRvcDogNXB4OyBwYWRkaW5nLXRvcDogNXB4O1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvcnQgZXZlbnRzIGJ5IHRpbWVzdGFtcCAobmV3ZXN0IGZpcnN0KVxuICAgICAgICAgICAgY29uc3Qgc29ydGVkRXZlbnRzID0gWy4uLmV2ZW50c10uc29ydCgoYSwgYikgPT4gKGIudGltZXN0YW1wIHx8IDApIC0gKGEudGltZXN0YW1wIHx8IDApKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyB1cCB0byAzIGV2ZW50c1xuICAgICAgICAgICAgY29uc3QgZGlzcGxheUV2ZW50cyA9IHNvcnRlZEV2ZW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGlzcGxheUV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudFRpbWUgPSBuZXcgRGF0ZShldmVudC50aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZSA9IGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSB8fCAndW5rbm93bic7XG4gICAgICAgICAgICAgICAgLy8gQ2FwaXRhbGl6ZSBmaXJzdCBsZXR0ZXIgb2Ygc3RhdGUgZm9yIHRyYW5zbGF0aW9uIGtleVxuICAgICAgICAgICAgICAgIGNvbnN0IGNhcGl0YWxpemVGaXJzdCA9IChzdHIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdHIpIHJldHVybiBzdHI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtgcHJfUHJvdmlkZXJTdGF0ZSR7Y2FwaXRhbGl6ZUZpcnN0KHN0YXRlKX1gXSB8fCBzdGF0ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JIZXgodGhpcy5nZXRTdGF0ZUNvbG9yKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cIm1hcmdpbjogM3B4IDA7IGZvbnQtc2l6ZTogMTJweDtcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICM2NjY7XCI+JHtldmVudFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBzZWNvbmQ6ICcyLWRpZ2l0J30pfTwvc3Bhbj4gYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAke2NvbG9yfTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+4pePICR7c3RhdGVUZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBSVFQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnJ0dCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGAgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzk5OTtcIj4oJHtldmVudC5ydHR9bXMpPC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1hcmsgaW5oZXJpdGVkIHN0YXRlc1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5pbmhlcml0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIHN0eWxlPVwiY29sb3I6ICM5OTk7IGZvbnQtc3R5bGU6IGl0YWxpYztcIj4o0L/RgNC+0LTQvtC70LbQsNC10YLRgdGPKTwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzb3J0ZWRFdmVudHMubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMXB4OyBtYXJnaW4tdG9wOiAzcHg7XCI+0Lgg0LXRidC1ICR7c29ydGVkRXZlbnRzLmxlbmd0aCAtIDN9INGB0L7QsdGL0YLQuNC5Li4uPC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMnB4OyBtYXJnaW4tdG9wOiA1cHg7XCI+0J3QtdGCINGB0L7QsdGL0YLQuNC5INCyINGN0YLQvtC8INC/0LXRgNC40L7QtNC1PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgd2l0aCBzdGF0dXMgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICB1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzSW5mbykge1xuICAgICAgICAvLyBVcGRhdGUgUlRUXG4gICAgICAgIGNvbnN0ICRydHQgPSAkKCcjcHJvdmlkZXItcnR0LXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRydHRDb250YWluZXIgPSAkcnR0LnBhcmVudCgpO1xuICAgICAgICBpZiAoJHJ0dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzdGF0dXNJbmZvLnJ0dCAhPT0gbnVsbCAmJiBzdGF0dXNJbmZvLnJ0dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnR0Q29sb3IgPSBzdGF0dXNJbmZvLnJ0dCA+IDIwMCA/ICcjZGIyODI4JyA6IHN0YXR1c0luZm8ucnR0ID4gMTAwID8gJyNmYmJkMDgnIDogJyMyMWJhNDUnO1xuICAgICAgICAgICAgICAgICRydHQudGV4dChgJHtzdGF0dXNJbmZvLnJ0dH0gJHtnbG9iYWxUcmFuc2xhdGUucHJfTWlsbGlzZWNvbmRzfWApO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsIHJ0dENvbG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KCctLScpO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsICcjNzY3Njc2Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSBkdXJhdGlvbiBhbmQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1cmF0aW9uID0gJCgnI3Byb3ZpZGVyLWR1cmF0aW9uLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRzdGF0ZUxhYmVsID0gJCgnI3Byb3ZpZGVyLXN0YXRlLWxhYmVsJyk7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbkNvbnRhaW5lciA9ICRkdXJhdGlvbi5wYXJlbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHVyYXRpb24ubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgJGR1cmF0aW9uLnRleHQodGhpcy5mb3JtYXREdXJhdGlvbihzdGF0dXNJbmZvLnN0YXRlRHVyYXRpb24pKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlIGxhYmVsIHdpdGggYWN0dWFsIHN0YXRlIHRleHQgKGFscmVhZHkgdHJhbnNsYXRlZCBieSBBUEkpXG4gICAgICAgIGlmICgkc3RhdGVMYWJlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRlVGV4dCA9IHN0YXR1c0luZm8uc3RhdGVUZXh0IHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzSW5mby5zdGF0ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGU7XG4gICAgICAgICAgICAkc3RhdGVMYWJlbC50ZXh0KHN0YXRlVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHN0YXRlIGNvbG9yIHRvIHRoZSBkdXJhdGlvbiB2YWx1ZSBhbmQgbGFiZWxcbiAgICAgICAgaWYgKCRkdXJhdGlvbkNvbnRhaW5lci5sZW5ndGggJiYgc3RhdHVzSW5mby5zdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICBjb25zdCBjb2xvckhleCA9IHRoaXMuZ2V0Q29sb3JIZXgoc3RhdHVzSW5mby5zdGF0ZUNvbG9yKTtcbiAgICAgICAgICAgICRkdXJhdGlvbkNvbnRhaW5lci5jc3MoJ2NvbG9yJywgY29sb3JIZXgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGlzdGljcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0luZm8uc3RhdGlzdGljcykge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBzdGF0dXNJbmZvLnN0YXRpc3RpY3M7XG4gICAgICAgICAgICBjb25zdCAkYXZhaWxhYmlsaXR5ID0gJCgnI3Byb3ZpZGVyLWF2YWlsYWJpbGl0eS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRhdmFpbGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGF2YWlsYWJpbGl0eS50ZXh0KHN0YXRzLmF2YWlsYWJpbGl0eSA/IGAke3N0YXRzLmF2YWlsYWJpbGl0eX0lYCA6ICctLScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tzID0gJCgnI3Byb3ZpZGVyLWNoZWNrcy12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRjaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNoZWNrcy50ZXh0KHN0YXRzLnRvdGFsQ2hlY2tzIHx8ICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4cG9ydCBoaXN0b3J5IHRvIENTViBmaWxlXG4gICAgICovXG4gICAgZXhwb3J0SGlzdG9yeVRvQ1NWKCkge1xuICAgICAgICBjb25zdCAkYnRuID0gJCgnI2V4cG9ydC1oaXN0b3J5LWJ0bicpO1xuICAgICAgICAkYnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgcHJvdmlkZXIgZGV0YWlsc1xuICAgICAgICBjb25zdCBwcm92aWRlckluZm8gPSB7XG4gICAgICAgICAgICBob3N0OiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdob3N0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcm5hbWUnKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdkZXNjcmlwdGlvbicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdGhlIGFwcHJvcHJpYXRlIEFQSSBjbGllbnQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBjb25zdCBhcGlDbGllbnQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG5cbiAgICAgICAgLy8gRmV0Y2ggaGlzdG9yeSBkYXRhIHVzaW5nIHYzIEFQSVxuICAgICAgICBhcGlDbGllbnQuZ2V0SGlzdG9yeSh0aGlzLnByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZENTVihyZXNwb25zZS5kYXRhLmV2ZW50cywge1xuICAgICAgICAgICAgICAgICAgICBwcm92aWRlcklkOiB0aGlzLnByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogdGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4ucHJvdmlkZXJJbmZvXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnByX0V4cG9ydEZhaWxlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydCBldmVudHMgdG8gQ1NWIGFuZCB0cmlnZ2VyIGRvd25sb2FkXG4gICAgICovXG4gICAgZG93bmxvYWRDU1YoZXZlbnRzLCBwcm92aWRlckluZm8pIHtcbiAgICAgICAgaWYgKCFldmVudHMgfHwgZXZlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoZ2xvYmFsVHJhbnNsYXRlLnByX05vSGlzdG9yeVRvRXhwb3J0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGVjaG5pY2FsIGhlYWRlcnMgd2l0aG91dCB0cmFuc2xhdGlvbnNcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IFtcbiAgICAgICAgICAgICd0aW1lc3RhbXAnLFxuICAgICAgICAgICAgJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9pZCcsXG4gICAgICAgICAgICAncHJvdmlkZXJfdHlwZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCcsXG4gICAgICAgICAgICAncHJvdmlkZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICdldmVudCcsXG4gICAgICAgICAgICAnZXZlbnRfdHlwZScsXG4gICAgICAgICAgICAncHJldmlvdXNfc3RhdGUnLFxuICAgICAgICAgICAgJ25ld19zdGF0ZScsXG4gICAgICAgICAgICAncnR0X21zJyxcbiAgICAgICAgICAgICdwZWVyX3N0YXR1cycsXG4gICAgICAgICAgICAncXVhbGlmeV9mcmVxJyxcbiAgICAgICAgICAgICdxdWFsaWZ5X3RpbWUnLFxuICAgICAgICAgICAgJ3JlZ2lzdGVyX3N0YXR1cycsXG4gICAgICAgICAgICAnY29udGFjdCcsXG4gICAgICAgICAgICAndXNlcl9hZ2VudCcsXG4gICAgICAgICAgICAnbGFzdF9yZWdpc3RyYXRpb24nLFxuICAgICAgICAgICAgJ2RldGFpbHMnLFxuICAgICAgICAgICAgJ2Vycm9yX21lc3NhZ2UnLFxuICAgICAgICAgICAgJ3Jhd19kYXRhJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBldmVudHMgdG8gQ1NWIHJvd3Mgd2l0aCBhbGwgdGVjaG5pY2FsIGRhdGFcbiAgICAgICAgY29uc3Qgcm93cyA9IGV2ZW50cy5tYXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBhbGwgYXZhaWxhYmxlIGZpZWxkcyBmcm9tIHRoZSBldmVudFxuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBldmVudC50aW1lc3RhbXAgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0ZXRpbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnByb3ZpZGVySWQgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8uaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8udXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmV2ZW50IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmlvdXNTdGF0ZSB8fCBldmVudC5wcmV2aW91c19zdGF0ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucnR0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnBlZXJTdGF0dXMgfHwgZXZlbnQucGVlcl9zdGF0dXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucXVhbGlmeUZyZXEgfHwgZXZlbnQucXVhbGlmeV9mcmVxIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnF1YWxpZnlUaW1lIHx8IGV2ZW50LnF1YWxpZnlfdGltZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5yZWdpc3RlclN0YXR1cyB8fCBldmVudC5yZWdpc3Rlcl9zdGF0dXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuY29udGFjdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC51c2VyQWdlbnQgfHwgZXZlbnQudXNlcl9hZ2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5sYXN0UmVnaXN0cmF0aW9uIHx8IGV2ZW50Lmxhc3RfcmVnaXN0cmF0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmRldGFpbHMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZXJyb3IgfHwgZXZlbnQuZXJyb3JNZXNzYWdlIHx8ICcnLFxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGV2ZW50KSAvLyBJbmNsdWRlIGNvbXBsZXRlIHJhdyBkYXRhXG4gICAgICAgICAgICBdO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBDU1YgY29udGVudCB3aXRoIEJPTSBmb3IgcHJvcGVyIFVURi04IGVuY29kaW5nIGluIEV4Y2VsXG4gICAgICAgIGNvbnN0IEJPTSA9ICdcXHVGRUZGJztcbiAgICAgICAgbGV0IGNzdkNvbnRlbnQgPSBCT007XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbWV0YWRhdGEgaGVhZGVyXG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgUHJvdmlkZXIgRXhwb3J0OiAke3Byb3ZpZGVySW5mby5wcm92aWRlcklkfSAoJHtwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlfSlcXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIEhvc3Q6ICR7cHJvdmlkZXJJbmZvLmhvc3R9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBVc2VybmFtZTogJHtwcm92aWRlckluZm8udXNlcm5hbWV9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBEZXNjcmlwdGlvbjogJHtwcm92aWRlckluZm8uZGVzY3JpcHRpb259XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBFeHBvcnQgRGF0ZTogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBUb3RhbCBFdmVudHM6ICR7ZXZlbnRzLmxlbmd0aH1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9ICdcXG4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvbHVtbiBoZWFkZXJzXG4gICAgICAgIGNzdkNvbnRlbnQgKz0gaGVhZGVycy5qb2luKCcsJykgKyAnXFxuJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkYXRhIHJvd3NcbiAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBjc3ZDb250ZW50ICs9IHJvdy5tYXAoY2VsbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIHF1b3RlcyBhbmQgd3JhcCBpbiBxdW90ZXMgaWYgY29udGFpbnMgY29tbWEsIG5ld2xpbmUsIG9yIHF1b3Rlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGxTdHIgPSBTdHJpbmcoY2VsbCk7XG4gICAgICAgICAgICAgICAgaWYgKGNlbGxTdHIuaW5jbHVkZXMoJywnKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCdcXG4nKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCdcIicpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJyMnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFwiJHtjZWxsU3RyLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2VsbFN0cjtcbiAgICAgICAgICAgIH0pLmpvaW4oJywnKSArICdcXG4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBibG9iIGFuZCBkb3dubG9hZFxuICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2NzdkNvbnRlbnRdLCB7IHR5cGU6ICd0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04OycgfSk7XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBmaWxlbmFtZSB3aXRoIHByb3ZpZGVyIElEIGFuZCB0aW1lc3RhbXBcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbm93LnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCAnLScpLnN1YnN0cmluZygwLCAxOSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYHByb3ZpZGVyXyR7cHJvdmlkZXJJbmZvLnByb3ZpZGVySWR9XyR7cHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZX1fJHt0aW1lc3RhbXB9LmNzdmA7XG4gICAgICAgIFxuICAgICAgICBsaW5rLnNldEF0dHJpYnV0ZSgnaHJlZicsIHVybCk7XG4gICAgICAgIGxpbmsuc2V0QXR0cmlidXRlKCdkb3dubG9hZCcsIGZpbGVuYW1lKTtcbiAgICAgICAgbGluay5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGxpbmspO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXBcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCksIDEwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZHVyYXRpb24gaW4gc2Vjb25kcyB0byBodW1hbi1yZWFkYWJsZSBmb3JtYXQgd2l0aCBsb2NhbGl6YXRpb25cbiAgICAgKi9cbiAgICBmb3JtYXREdXJhdGlvbihzZWNvbmRzKSB7XG4gICAgICAgIGlmICghc2Vjb25kcykgcmV0dXJuICctLSc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gODY0MDApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSA4NjQwMCkgLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICAgICAgY29uc3Qgc2VjcyA9IHNlY29uZHMgJSA2MDtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBsb2NhbGl6ZWQgdW5pdHNcbiAgICAgICAgY29uc3QgZGF5VW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9EYXlzO1xuICAgICAgICBjb25zdCBob3VyVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9Ib3VycztcbiAgICAgICAgY29uc3QgbWludXRlVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9NaW51dGVzO1xuICAgICAgICBjb25zdCBzZWNvbmRVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1NlY29uZHM7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfSR7ZGF5VW5pdH0gJHtob3Vyc30ke2hvdXJVbml0fSAke21pbnV0ZXN9JHttaW51dGVVbml0fWA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9JHtob3VyVW5pdH0gJHttaW51dGVzfSR7bWludXRlVW5pdH0gJHtzZWNzfSR7c2Vjb25kVW5pdH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc30ke21pbnV0ZVVuaXR9ICR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtzZWNzfSR7c2Vjb25kVW5pdH1gO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5jaGFuZ2VUaW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5jaGFuZ2VUaW1lb3V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMucGVyaW9kaWNJbnRlcnZhbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnBlcmlvZGljSW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIEV2ZW50QnVzIGlmIHN1YnNjcmliZWRcbiAgICAgICAgaWYgKHRoaXMuaXNTdWJzY3JpYmVkICYmIHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgICAgIHRoaXMuaXNTdWJzY3JpYmVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyB3b3JrZXIgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuXG4vLyBDbGVhbiB1cCBvbiBwYWdlIHVubG9hZFxuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuZGVzdHJveSgpO1xufSk7XG5cbi8vIEV4cG9ydCBmb3IgZXh0ZXJuYWwgYWNjZXNzXG53aW5kb3cucHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgPSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlcjsiXX0=