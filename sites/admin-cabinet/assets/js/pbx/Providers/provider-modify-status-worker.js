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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiQiLCIkc3RhdHVzIiwicHJvdmlkZXJUeXBlIiwicHJvdmlkZXJJZCIsImlzU3Vic2NyaWJlZCIsImxhc3RTdGF0dXMiLCJkaWFnbm9zdGljc0luaXRpYWxpemVkIiwiaGlzdG9yeVRhYmxlIiwic3RhdHVzRGF0YSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaW5jbHVkZXMiLCJmb3JtIiwiRGVidWdnZXJJbmZvIiwic3Vic2NyaWJlVG9FdmVudEJ1cyIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwic2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uIiwiRXZlbnRCdXMiLCJzdGFydFBlcmlvZGljVXBkYXRlIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImRhdGEiLCJldmVudCIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxldmFudENoYW5nZSIsImZpbmQiLCJjaGFuZ2UiLCJwcm92aWRlcl9pZCIsImlkIiwidXBkYXRlU3RhdHVzRGlzcGxheSIsInN0YXR1c2VzIiwicHJvdmlkZXJTdGF0dXMiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZXJyb3JUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfU3RhdHVzRXJyb3IiLCJodG1sIiwiZGVidWdJbmZvIiwidHlwZSIsInN0YXRlIiwibmV3X3N0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlVGV4dCIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMiLCJ1cGRhdGVTdGF0dXNMZWdhY3kiLCJ1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkiLCJzdGF0ZUljb24iLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdHVzQ29udGVudCIsImRpc3BsYXlUZXh0Iiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsInByX0NoZWNraW5nU3RhdHVzIiwiUHJvdmlkZXJzQVBJIiwiZ2V0U3RhdHVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcl9Ob3RGb3VuZCIsImhhbmRsZVJlcXVlc3RFcnJvciIsImVycm9yIiwicHJfQ29ubmVjdGlvbkVycm9yIiwia2V5RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsIiRmaWVsZCIsImxlbmd0aCIsIm9uIiwiY2xlYXJUaW1lb3V0IiwiY2hhbmdlVGltZW91dCIsInNldFRpbWVvdXQiLCJwZXJpb2RpY0ludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJpbml0aWFsaXplVGltZWxpbmUiLCIkY2hlY2tCdG4iLCJvZmYiLCJhcGlDbGllbnQiLCJTaXBQcm92aWRlcnNBUEkiLCJJYXhQcm92aWRlcnNBUEkiLCJmb3JjZUNoZWNrIiwibG9hZFRpbWVsaW5lRGF0YSIsImV4cG9ydEhpc3RvcnlUb0NTViIsImdldEhpc3RvcnkiLCJldmVudHMiLCJjdXJyZW50U3RhdHVzIiwicHJvdmlkZXIiLCJyZW5kZXJUaW1lbGluZSIsIiR0aW1lbGluZSIsIiRjb250YWluZXIiLCJlbXB0eSIsIm5vdyIsIk1hdGgiLCJmbG9vciIsImRheUFnbyIsInRpbWVSYW5nZSIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwiY2VpbCIsInNlZ21lbnREYXRhIiwiZmlsbCIsInNlZ21lbnRFdmVudHMiLCJtYXAiLCJzZWdtZW50SW5kZXgiLCJwdXNoIiwiY3VycmVudFN0YXRlIiwibmV3U3RhdGUiLCJnZXRTdGF0ZUNvbG9yIiwiZ2V0U3RhdGVQcmlvcml0eSIsImxhc3RLbm93blN0YXRlIiwiZGlzYWJsZWQiLCJsYXN0S25vd25FdmVudCIsImluaGVyaXRlZCIsInN5bnRoZXRpYyIsImhhc1JlYWxFdmVudCIsImkiLCJzZWdtZW50V2lkdGgiLCJjb2xvciIsImluZGV4IiwidG9vbHRpcENvbnRlbnQiLCJnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMiLCIkc2VnbWVudCIsImNzcyIsImdldENvbG9ySGV4IiwiYXR0ciIsImFwcGVuZCIsInBvcHVwIiwidmFyaWF0aW9uIiwiaG92ZXJhYmxlIiwiZ2V0U2VnbWVudFRvb2x0aXAiLCJob3Vyc0FnbyIsIm1pbnV0ZXNBZ28iLCJzZWdtZW50U3RhcnRUaW1lIiwic2VnbWVudEVuZFRpbWUiLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsInNvcnRlZEV2ZW50cyIsInNvcnQiLCJhIiwiYiIsImRpc3BsYXlFdmVudHMiLCJzbGljZSIsImV2ZW50VGltZSIsImNhcGl0YWxpemVGaXJzdCIsInN0ciIsImNoYXJBdCIsInRvTG93ZXJDYXNlIiwic2Vjb25kIiwicnR0Iiwic3RhdHVzSW5mbyIsIiRydHQiLCIkcnR0Q29udGFpbmVyIiwicGFyZW50IiwidW5kZWZpbmVkIiwicnR0Q29sb3IiLCJ0ZXh0IiwicHJfTWlsbGlzZWNvbmRzIiwiJGR1cmF0aW9uIiwiJHN0YXRlTGFiZWwiLCIkZHVyYXRpb25Db250YWluZXIiLCJzdGF0ZUR1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJwcl9DdXJyZW50U3RhdGUiLCJjb2xvckhleCIsInN0YXRpc3RpY3MiLCJzdGF0cyIsIiRhdmFpbGFiaWxpdHkiLCJhdmFpbGFiaWxpdHkiLCIkY2hlY2tzIiwidG90YWxDaGVja3MiLCIkYnRuIiwicHJvdmlkZXJJbmZvIiwiaG9zdCIsInVzZXJuYW1lIiwiZGVzY3JpcHRpb24iLCJkb3dubG9hZENTViIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwicHJfRXhwb3J0RmFpbGVkIiwic2hvd1dhcm5pbmciLCJwcl9Ob0hpc3RvcnlUb0V4cG9ydCIsImhlYWRlcnMiLCJyb3dzIiwiZGF0ZXRpbWUiLCJwcmV2aW91c1N0YXRlIiwicHJldmlvdXNfc3RhdGUiLCJwZWVyU3RhdHVzIiwicGVlcl9zdGF0dXMiLCJxdWFsaWZ5RnJlcSIsInF1YWxpZnlfZnJlcSIsInF1YWxpZnlUaW1lIiwicXVhbGlmeV90aW1lIiwicmVnaXN0ZXJTdGF0dXMiLCJyZWdpc3Rlcl9zdGF0dXMiLCJjb250YWN0IiwidXNlckFnZW50IiwidXNlcl9hZ2VudCIsImxhc3RSZWdpc3RyYXRpb24iLCJsYXN0X3JlZ2lzdHJhdGlvbiIsImRldGFpbHMiLCJlcnJvck1lc3NhZ2UiLCJKU09OIiwic3RyaW5naWZ5IiwiQk9NIiwiY3N2Q29udGVudCIsImpvaW4iLCJyb3ciLCJjZWxsIiwiY2VsbFN0ciIsIlN0cmluZyIsInJlcGxhY2UiLCJibG9iIiwiQmxvYiIsInVybCIsIlVSTCIsImNyZWF0ZU9iamVjdFVSTCIsImxpbmsiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJzdWJzdHJpbmciLCJmaWxlbmFtZSIsInNldEF0dHJpYnV0ZSIsInN0eWxlIiwiZGlzcGxheSIsImJvZHkiLCJhcHBlbmRDaGlsZCIsImNsaWNrIiwicmVtb3ZlQ2hpbGQiLCJyZXZva2VPYmplY3RVUkwiLCJzZWNvbmRzIiwiZGF5cyIsImhvdXJzIiwibWludXRlcyIsInNlY3MiLCJkYXlVbml0IiwicHJfRGF5cyIsImhvdXJVbml0IiwicHJfSG91cnMiLCJtaW51dGVVbml0IiwicHJfTWludXRlcyIsInNlY29uZFVuaXQiLCJwcl9TZWNvbmRzIiwiZGVzdHJveSIsImNsZWFySW50ZXJ2YWwiLCJ1bnN1YnNjcmliZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSwwQkFBMEIsR0FBRztBQUUvQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQU5vQjs7QUFRL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsU0FBRCxDQVpxQjs7QUFjL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFLEVBbEJpQjs7QUFvQi9CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxFQXhCbUI7O0FBMEIvQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsS0E5QmlCOztBQWdDL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBcENtQjs7QUFzQy9CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHNCQUFzQixFQUFFLEtBMUNPOztBQTRDL0I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBaERpQjs7QUFrRC9CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQXREbUI7O0FBd0QvQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUEzRCtCLHdCQTJEbEI7QUFDVDtBQUNBLFFBQUlDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsUUFBaEIsQ0FBeUJDLFFBQXpCLENBQWtDLFdBQWxDLENBQUosRUFBb0Q7QUFDaEQsV0FBS1gsWUFBTCxHQUFvQixLQUFwQjtBQUNILEtBRkQsTUFFTyxJQUFJUSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLFFBQWhCLENBQXlCQyxRQUF6QixDQUFrQyxXQUFsQyxDQUFKLEVBQW9EO0FBQ3ZELFdBQUtYLFlBQUwsR0FBb0IsS0FBcEI7QUFDSCxLQUZNLE1BRUE7QUFDSDtBQUNILEtBUlEsQ0FVVDs7O0FBQ0EsU0FBS0MsVUFBTCxHQUFrQixLQUFLSixRQUFMLENBQWNlLElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsSUFBaEMsQ0FBbEI7O0FBQ0EsUUFBSSxDQUFDLEtBQUtYLFVBQVYsRUFBc0I7QUFDbEI7QUFDSCxLQWRRLENBZ0JUOzs7QUFDQSxRQUFJLE9BQU9ZLFlBQVAsS0FBd0IsV0FBNUIsRUFBeUM7QUFDckNBLE1BQUFBLFlBQVksQ0FBQ04sVUFBYjtBQUNILEtBbkJRLENBcUJUOzs7QUFDQSxTQUFLTyxtQkFBTCxHQXRCUyxDQXdCVDs7QUFDQSxTQUFLQyxvQkFBTCxHQXpCUyxDQTJCVDs7QUFDQSxTQUFLQyx3QkFBTDtBQUNILEdBeEY4Qjs7QUEwRi9CO0FBQ0o7QUFDQTtBQUNJRixFQUFBQSxtQkE3RitCLGlDQTZGVDtBQUFBOztBQUNsQixRQUFJLE9BQU9HLFFBQVAsS0FBb0IsV0FBeEIsRUFBcUM7QUFDakMsV0FBS0MsbUJBQUw7QUFDQTtBQUNIOztBQUVERCxJQUFBQSxRQUFRLENBQUNFLFNBQVQsQ0FBbUIsaUJBQW5CLEVBQXNDLFVBQUNDLE9BQUQsRUFBYTtBQUMvQyxNQUFBLEtBQUksQ0FBQ0MscUJBQUwsQ0FBMkJELE9BQTNCO0FBQ0gsS0FGRDtBQUlBLFNBQUtsQixZQUFMLEdBQW9CLElBQXBCO0FBQ0gsR0F4RzhCOztBQTBHL0I7QUFDSjtBQUNBO0FBQ0ltQixFQUFBQSxxQkE3RytCLGlDQTZHVEQsT0E3R1MsRUE2R0E7QUFDM0IsUUFBSSxDQUFDQSxPQUFELElBQVksQ0FBQ0EsT0FBTyxDQUFDRSxJQUF6QixFQUErQjtBQUMzQjtBQUNILEtBSDBCLENBSzNCOzs7QUFDQSxRQUFJQyxLQUFKLEVBQVdELElBQVg7O0FBQ0EsUUFBSUYsT0FBTyxDQUFDRyxLQUFaLEVBQW1CO0FBQ2ZBLE1BQUFBLEtBQUssR0FBR0gsT0FBTyxDQUFDRyxLQUFoQjtBQUNBRCxNQUFBQSxJQUFJLEdBQUdGLE9BQU8sQ0FBQ0UsSUFBZjtBQUNILEtBSEQsTUFHTyxJQUFJRixPQUFPLENBQUNFLElBQVIsQ0FBYUMsS0FBakIsRUFBd0I7QUFDM0JBLE1BQUFBLEtBQUssR0FBR0gsT0FBTyxDQUFDRSxJQUFSLENBQWFDLEtBQXJCO0FBQ0FELE1BQUFBLElBQUksR0FBR0YsT0FBTyxDQUFDRSxJQUFSLENBQWFBLElBQWIsSUFBcUJGLE9BQU8sQ0FBQ0UsSUFBcEM7QUFDSCxLQUhNLE1BR0E7QUFDSDtBQUNIOztBQUVELFlBQVFDLEtBQVI7QUFDSSxXQUFLLGVBQUw7QUFDSSxhQUFLQyxtQkFBTCxDQUF5QkYsSUFBekI7QUFDQTs7QUFFSixXQUFLLGlCQUFMO0FBQ0ksYUFBS0cscUJBQUwsQ0FBMkJILElBQTNCO0FBQ0E7O0FBRUosV0FBSyxjQUFMO0FBQ0ksYUFBS0ksaUJBQUwsQ0FBdUJKLElBQXZCO0FBQ0E7O0FBRUosY0FiSixDQWNROztBQWRSO0FBZ0JILEdBOUk4Qjs7QUFnSi9CO0FBQ0o7QUFDQTtBQUNJRSxFQUFBQSxtQkFuSitCLCtCQW1KWEYsSUFuSlcsRUFtSkw7QUFBQTs7QUFDdEIsUUFBSSxDQUFDQSxJQUFJLENBQUNLLE9BQU4sSUFBaUIsQ0FBQ0MsS0FBSyxDQUFDQyxPQUFOLENBQWNQLElBQUksQ0FBQ0ssT0FBbkIsQ0FBdEIsRUFBbUQ7QUFDL0M7QUFDSCxLQUhxQixDQUt0Qjs7O0FBQ0EsUUFBTUcsY0FBYyxHQUFHUixJQUFJLENBQUNLLE9BQUwsQ0FBYUksSUFBYixDQUFrQixVQUFBQyxNQUFNO0FBQUEsYUFDM0NBLE1BQU0sQ0FBQ0MsV0FBUCxLQUF1QixNQUFJLENBQUNoQyxVQUE1QixJQUEwQytCLE1BQU0sQ0FBQ0UsRUFBUCxLQUFjLE1BQUksQ0FBQ2pDLFVBRGxCO0FBQUEsS0FBeEIsQ0FBdkI7O0FBSUEsUUFBSTZCLGNBQUosRUFBb0I7QUFDaEIsV0FBS0ssbUJBQUwsQ0FBeUJMLGNBQXpCO0FBQ0g7QUFDSixHQWhLOEI7O0FBa0svQjtBQUNKO0FBQ0E7QUFDSUwsRUFBQUEscUJBcksrQixpQ0FxS1RILElBcktTLEVBcUtIO0FBQUE7O0FBQ3hCLFFBQUksQ0FBQ0EsSUFBSSxDQUFDYyxRQUFWLEVBQW9CO0FBQ2hCO0FBQ0gsS0FIdUIsQ0FLeEI7OztBQUNBLFFBQU1DLGNBQWMsR0FBRywwQkFBQWYsSUFBSSxDQUFDYyxRQUFMLENBQWMsS0FBS3BDLFlBQW5CLGlGQUFtQyxLQUFLQyxVQUF4QyxNQUNEcUIsSUFBSSxDQUFDYyxRQUFMLENBQWMsS0FBS25DLFVBQW5CLENBRHRCOztBQUdBLFFBQUlvQyxjQUFKLEVBQW9CO0FBQ2hCLFdBQUtGLG1CQUFMLENBQXlCRSxjQUF6QjtBQUNIO0FBQ0osR0FqTDhCOztBQW1ML0I7QUFDSjtBQUNBO0FBQ0lYLEVBQUFBLGlCQXRMK0IsNkJBc0xiSixJQXRMYSxFQXNMUDtBQUNwQjtBQUNBLFNBQUt2QixPQUFMLENBQ0t1QyxXQURMLENBQ2lCLDJCQURqQixFQUVLQyxRQUZMLENBRWMsS0FGZDtBQUlBLFFBQU1DLFNBQVMsR0FBR0MsZUFBZSxDQUFDQyxjQUFsQztBQUNBLFNBQUszQyxPQUFMLENBQWE0QyxJQUFiLHVEQUErREgsU0FBL0Q7QUFDSCxHQTlMOEI7O0FBZ00vQjtBQUNKO0FBQ0E7QUFDSUwsRUFBQUEsbUJBbk0rQiwrQkFtTVg3QixVQW5NVyxFQW1NQztBQUM1QixRQUFJLENBQUNBLFVBQUwsRUFBaUI7QUFDYjtBQUNILEtBSDJCLENBSzVCOzs7QUFDQSxTQUFLSCxVQUFMLEdBQWtCRyxVQUFsQixDQU40QixDQVE1Qjs7QUFDQSxTQUFLQSxVQUFMLEdBQWtCQSxVQUFsQixDQVQ0QixDQVc1Qjs7QUFDQSxRQUFJLE9BQU9PLFlBQVAsS0FBd0IsV0FBNUIsRUFBeUM7QUFDckMsVUFBTStCLFNBQVMsR0FBRztBQUNkVixRQUFBQSxFQUFFLEVBQUUsS0FBS2pDLFVBREs7QUFFZDRDLFFBQUFBLElBQUksRUFBRSxLQUFLN0MsWUFGRztBQUdkOEMsUUFBQUEsS0FBSyxFQUFFeEMsVUFBVSxDQUFDd0MsS0FBWCxJQUFvQnhDLFVBQVUsQ0FBQ3lDLFNBSHhCO0FBSWRDLFFBQUFBLFVBQVUsRUFBRTFDLFVBQVUsQ0FBQzBDLFVBSlQ7QUFLZEMsUUFBQUEsU0FBUyxFQUFFM0MsVUFBVSxDQUFDMkMsU0FMUjtBQU1kQyxRQUFBQSxTQUFTLEVBQUUsSUFBSUMsSUFBSixHQUFXQyxXQUFYO0FBTkcsT0FBbEI7QUFTQSxVQUFNQyxTQUFTLHFIQUVvQlQsU0FBUyxDQUFDVixFQUY5QixrRUFHZ0JVLFNBQVMsQ0FBQ0MsSUFIMUIsbUVBSWlCRCxTQUFTLENBQUNFLEtBSjNCLG1FQUtpQkYsU0FBUyxDQUFDSSxVQUwzQixxRUFNbUJKLFNBQVMsQ0FBQ00sU0FON0IsdURBQWY7QUFTQXJDLE1BQUFBLFlBQVksQ0FBQ3lDLGFBQWIsQ0FBMkJELFNBQTNCO0FBQ0gsS0FoQzJCLENBa0M1Qjs7O0FBQ0EsUUFBSS9DLFVBQVUsQ0FBQzBDLFVBQVgsSUFBeUIxQyxVQUFVLENBQUMyQyxTQUF4QyxFQUFtRDtBQUMvQyxXQUFLTSxpQ0FBTCxDQUF1Q2pELFVBQXZDO0FBQ0gsS0FGRCxNQUVPO0FBQ0g7QUFDQSxXQUFLa0Qsa0JBQUwsQ0FBd0JsRCxVQUF4QjtBQUNILEtBeEMyQixDQTBDNUI7OztBQUNBLFFBQUksS0FBS0Ysc0JBQVQsRUFBaUM7QUFDN0IsV0FBS3FELHdCQUFMLENBQThCbkQsVUFBOUI7QUFDSDtBQUNKLEdBalA4Qjs7QUFtUC9CO0FBQ0o7QUFDQTtBQUNJaUQsRUFBQUEsaUNBdFArQiw2Q0FzUEdqRCxVQXRQSCxFQXNQZTtBQUMxQyxRQUFRMEMsVUFBUixHQUFzRTFDLFVBQXRFLENBQVEwQyxVQUFSO0FBQUEsUUFBb0JVLFNBQXBCLEdBQXNFcEQsVUFBdEUsQ0FBb0JvRCxTQUFwQjtBQUFBLFFBQStCVCxTQUEvQixHQUFzRTNDLFVBQXRFLENBQStCMkMsU0FBL0I7QUFBQSxRQUEwQ1UsZ0JBQTFDLEdBQXNFckQsVUFBdEUsQ0FBMENxRCxnQkFBMUM7QUFBQSxRQUE0RGIsS0FBNUQsR0FBc0V4QyxVQUF0RSxDQUE0RHdDLEtBQTVELENBRDBDLENBRzFDOztBQUNBLFNBQUsvQyxPQUFMLENBQ0t1QyxXQURMLENBQ2lCLCtCQURqQixFQUVLQyxRQUZMLENBRWNTLFVBRmQsRUFKMEMsQ0FRMUM7O0FBQ0EsUUFBSVksYUFBYSxHQUFHLEVBQXBCOztBQUNBLFFBQUlGLFNBQUosRUFBZTtBQUNYRSxNQUFBQSxhQUFhLHlCQUFpQkYsU0FBakIsa0JBQWI7QUFDSCxLQVp5QyxDQWMxQzs7O0FBQ0EsUUFBTUcsV0FBVyxHQUFHWixTQUFTLElBQUlILEtBQWIsSUFBc0IsU0FBMUM7QUFDQWMsSUFBQUEsYUFBYSxJQUFJQyxXQUFqQjtBQUVBLFNBQUs5RCxPQUFMLENBQWE0QyxJQUFiLENBQWtCaUIsYUFBbEI7QUFDSCxHQXpROEI7O0FBMlEvQjtBQUNKO0FBQ0E7QUFDSUosRUFBQUEsa0JBOVErQiw4QkE4UVpsRCxVQTlRWSxFQThRQTtBQUMzQixRQUFNd0MsS0FBSyxHQUFHeEMsVUFBVSxDQUFDd0MsS0FBWCxJQUFvQnhDLFVBQVUsQ0FBQ3lDLFNBQS9CLElBQTRDLEVBQTFEO0FBQ0EsUUFBTWUsZUFBZSxHQUFHaEIsS0FBSyxDQUFDaUIsV0FBTixFQUF4QixDQUYyQixDQUkzQjs7QUFDQSxTQUFLaEUsT0FBTCxDQUFhdUMsV0FBYixDQUF5QixTQUF6Qjs7QUFFQSxZQUFRd0IsZUFBUjtBQUNJLFdBQUssWUFBTDtBQUNBLFdBQUssSUFBTDtBQUNBLFdBQUssV0FBTDtBQUNJLGFBQUsvRCxPQUFMLENBQ0t1QyxXQURMLENBQ2lCLGlCQURqQixFQUVLQyxRQUZMLENBRWMsT0FGZCxFQUdLSSxJQUhMLDRDQUc0Q0YsZUFBZSxDQUFDdUIsU0FINUQ7QUFJQTs7QUFFSixXQUFLLGFBQUw7QUFDQSxXQUFLLFFBQUw7QUFDSSxhQUFLakUsT0FBTCxDQUNLdUMsV0FETCxDQUNpQixnQkFEakIsRUFFS0MsUUFGTCxDQUVjLFFBRmQsRUFHS0ksSUFITCx1REFHdURGLGVBQWUsQ0FBQ3dCLHNCQUh2RTtBQUlBOztBQUVKLFdBQUssS0FBTDtBQUNBLFdBQUssYUFBTDtBQUNJLGFBQUtsRSxPQUFMLENBQ0t1QyxXQURMLENBQ2lCLGtCQURqQixFQUVLQyxRQUZMLENBRWMsTUFGZCxFQUdLSSxJQUhMLHdDQUd3Q0YsZUFBZSxDQUFDeUIsVUFIeEQ7QUFJQTs7QUFFSixXQUFLLFVBQUw7QUFDQSxXQUFLLGNBQUw7QUFDQSxXQUFLLFFBQUw7QUFDSSxhQUFLbkUsT0FBTCxDQUNLdUMsV0FETCxDQUNpQixrQkFEakIsRUFFS0MsUUFGTCxDQUVjLE1BRmQsRUFHS0ksSUFITCx3Q0FHd0NGLGVBQWUsQ0FBQ3lCLFVBSHhEO0FBSUE7O0FBRUo7QUFDSSxhQUFLbkUsT0FBTCxDQUNLdUMsV0FETCxDQUNpQixrQkFEakIsRUFFS0MsUUFGTCxDQUVjLE1BRmQsRUFHS0ksSUFITCwyQ0FHMkNHLEtBQUssSUFBSSxTQUhwRDtBQUlBO0FBeENSO0FBMENILEdBL1Q4Qjs7QUFpVS9CO0FBQ0o7QUFDQTtBQUNJL0IsRUFBQUEsb0JBcFUrQixrQ0FvVVI7QUFBQTs7QUFDbkI7QUFDQSxTQUFLaEIsT0FBTCxDQUNLdUMsV0FETCxDQUNpQix1QkFEakIsRUFFS0MsUUFGTCxDQUVjLFNBRmQsRUFHS0ksSUFITCxrREFHa0RGLGVBQWUsQ0FBQzBCLGlCQUhsRSxHQUZtQixDQU9uQjs7QUFDQUMsSUFBQUEsWUFBWSxDQUFDQyxTQUFiLENBQXVCLEtBQUtwRSxVQUE1QixFQUF3QyxVQUFDcUUsUUFBRCxFQUFjO0FBQ2xELE1BQUEsTUFBSSxDQUFDdkUsT0FBTCxDQUFhdUMsV0FBYixDQUF5QixTQUF6Qjs7QUFFQSxVQUFJZ0MsUUFBUSxJQUFJQSxRQUFRLENBQUNDLE1BQXJCLElBQStCRCxRQUFRLENBQUNoRCxJQUE1QyxFQUFrRDtBQUM5QztBQUNBLFFBQUEsTUFBSSxDQUFDYSxtQkFBTCxDQUF5Qm1DLFFBQVEsQ0FBQ2hELElBQWxDO0FBQ0gsT0FIRCxNQUdPLElBQUlnRCxRQUFRLElBQUksQ0FBQ0EsUUFBUSxDQUFDQyxNQUExQixFQUFrQztBQUNyQztBQUNBLFFBQUEsTUFBSSxDQUFDeEUsT0FBTCxDQUNLdUMsV0FETCxDQUNpQixrQkFEakIsRUFFS0MsUUFGTCxDQUVjLE1BRmQsRUFHS0ksSUFITCwyQ0FHMkNGLGVBQWUsQ0FBQytCLFdBSDNEO0FBSUgsT0FOTSxNQU1BO0FBQ0gsUUFBQSxNQUFJLENBQUNDLGtCQUFMLENBQXdCLHlCQUF4QjtBQUNIO0FBQ0osS0FmRDtBQWdCSCxHQTVWOEI7O0FBOFYvQjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsa0JBalcrQiw4QkFpV1pDLEtBaldZLEVBaVdMO0FBQ3RCLFNBQUszRSxPQUFMLENBQ0t1QyxXQURMLENBQ2lCLDJCQURqQixFQUVLQyxRQUZMLENBRWMsS0FGZCxFQUdLSSxJQUhMLHVEQUd1REYsZUFBZSxDQUFDa0Msa0JBSHZFO0FBSUgsR0F0VzhCOztBQXdXL0I7QUFDSjtBQUNBO0FBQ0kzRCxFQUFBQSx3QkEzVytCLHNDQTJXSjtBQUFBOztBQUN2QjtBQUNBLFFBQU00RCxTQUFTLEdBQUcsQ0FBQyxNQUFELEVBQVMsVUFBVCxFQUFxQixRQUFyQixFQUErQixVQUEvQixDQUFsQjtBQUVBQSxJQUFBQSxTQUFTLENBQUNDLE9BQVYsQ0FBa0IsVUFBQUMsU0FBUyxFQUFJO0FBQzNCLFVBQU1DLE1BQU0sR0FBRyxNQUFJLENBQUNsRixRQUFMLENBQWNrQyxJQUFkLG1CQUE2QitDLFNBQTdCLFNBQWY7O0FBQ0EsVUFBSUMsTUFBTSxDQUFDQyxNQUFYLEVBQW1CO0FBQ2ZELFFBQUFBLE1BQU0sQ0FBQ0UsRUFBUCxDQUFVLGFBQVYsRUFBeUIsWUFBTTtBQUMzQjtBQUNBQyxVQUFBQSxZQUFZLENBQUMsTUFBSSxDQUFDQyxhQUFOLENBQVo7QUFDQSxVQUFBLE1BQUksQ0FBQ0EsYUFBTCxHQUFxQkMsVUFBVSxDQUFDLFlBQU07QUFDbEMsZ0JBQUksTUFBSSxDQUFDbkYsVUFBVCxFQUFxQjtBQUFFO0FBQ25CLGNBQUEsTUFBSSxDQUFDYyxvQkFBTDtBQUNIO0FBQ0osV0FKOEIsRUFJNUIsSUFKNEIsQ0FBL0I7QUFLSCxTQVJEO0FBU0g7QUFDSixLQWJEO0FBY0gsR0E3WDhCOztBQStYL0I7QUFDSjtBQUNBO0FBQ0lHLEVBQUFBLG1CQWxZK0IsaUNBa1lUO0FBQUE7O0FBQ2xCLFNBQUttRSxnQkFBTCxHQUF3QkMsV0FBVyxDQUFDLFlBQU07QUFDdEMsTUFBQSxNQUFJLENBQUN2RSxvQkFBTDtBQUNILEtBRmtDLEVBRWhDLElBRmdDLENBQW5DLENBRGtCLENBR1I7QUFDYixHQXRZOEI7O0FBd1kvQjtBQUNKO0FBQ0E7QUFDSXdFLEVBQUFBLHdCQTNZK0Isc0NBMllKO0FBQUE7O0FBQ3ZCLFFBQUksS0FBS25GLHNCQUFULEVBQWlDO0FBQzdCO0FBQ0gsS0FIc0IsQ0FLdkI7OztBQUNBLFNBQUtvRixrQkFBTCxHQU51QixDQVF2Qjs7QUFDQSxRQUFNQyxTQUFTLEdBQUczRixDQUFDLENBQUMsZ0JBQUQsQ0FBbkI7QUFDQTJGLElBQUFBLFNBQVMsQ0FBQ0MsR0FBVixDQUFjLE9BQWQsRUFBdUJULEVBQXZCLENBQTBCLE9BQTFCLEVBQW1DLFlBQU07QUFDckNRLE1BQUFBLFNBQVMsQ0FBQ2xELFFBQVYsQ0FBbUIsU0FBbkIsRUFEcUMsQ0FHckM7O0FBQ0EsVUFBTW9ELFNBQVMsR0FBRyxNQUFJLENBQUMzRixZQUFMLEtBQXNCLEtBQXRCLEdBQThCNEYsZUFBOUIsR0FBZ0RDLGVBQWxFLENBSnFDLENBTXJDOztBQUNBRixNQUFBQSxTQUFTLENBQUNHLFVBQVYsQ0FBcUIsTUFBSSxDQUFDN0YsVUFBMUIsRUFBc0MsVUFBQ3FFLFFBQUQsRUFBYztBQUNoRG1CLFFBQUFBLFNBQVMsQ0FBQ25ELFdBQVYsQ0FBc0IsU0FBdEI7O0FBQ0EsWUFBSWdDLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDaEQsSUFBaEMsRUFBc0M7QUFDbEMsVUFBQSxNQUFJLENBQUNhLG1CQUFMLENBQXlCbUMsUUFBUSxDQUFDaEQsSUFBbEM7O0FBQ0EsVUFBQSxNQUFJLENBQUN5RSxnQkFBTDtBQUNIO0FBQ0osT0FORDtBQU9ILEtBZEQsRUFWdUIsQ0EwQnZCOztBQUNBakcsSUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQsQ0FBeUI0RixHQUF6QixDQUE2QixPQUE3QixFQUFzQ1QsRUFBdEMsQ0FBeUMsT0FBekMsRUFBa0QsWUFBTTtBQUNwRCxNQUFBLE1BQUksQ0FBQ2Usa0JBQUw7QUFDSCxLQUZELEVBM0J1QixDQStCdkI7O0FBQ0EsUUFBSSxLQUFLMUYsVUFBVCxFQUFxQjtBQUNqQixXQUFLbUQsd0JBQUwsQ0FBOEIsS0FBS25ELFVBQW5DO0FBQ0g7O0FBRUQsU0FBS0Ysc0JBQUwsR0FBOEIsSUFBOUI7QUFDSCxHQWhiOEI7O0FBa2IvQjtBQUNKO0FBQ0E7QUFDSW9GLEVBQUFBLGtCQXJiK0IsZ0NBcWJWO0FBQ2pCO0FBQ0EsU0FBS08sZ0JBQUw7QUFDSCxHQXhiOEI7O0FBMGIvQjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsZ0JBN2IrQiw4QkE2Ylo7QUFBQTs7QUFDZjtBQUNBLFFBQU1KLFNBQVMsR0FBRyxLQUFLM0YsWUFBTCxLQUFzQixLQUF0QixHQUE4QjRGLGVBQTlCLEdBQWdEQyxlQUFsRSxDQUZlLENBSWY7O0FBQ0FGLElBQUFBLFNBQVMsQ0FBQ00sVUFBVixDQUFxQixLQUFLaEcsVUFBMUIsRUFBc0MsVUFBQ3FFLFFBQUQsRUFBYztBQUNoRCxVQUFJQSxRQUFRLENBQUNDLE1BQVQsSUFBbUJELFFBQVEsQ0FBQ2hELElBQWhDLEVBQXNDO0FBQ2xDO0FBQ0EsWUFBTTRFLE1BQU0sR0FBRzVCLFFBQVEsQ0FBQ2hELElBQVQsQ0FBYzRFLE1BQWQsSUFBd0IsRUFBdkM7QUFDQSxZQUFNQyxhQUFhLEdBQUc3QixRQUFRLENBQUNoRCxJQUFULENBQWM4RSxRQUFkLElBQTBCLE1BQUksQ0FBQzlGLFVBQXJEOztBQUNBLFFBQUEsTUFBSSxDQUFDK0YsY0FBTCxDQUFvQkgsTUFBcEIsRUFBNEJDLGFBQTVCO0FBQ0g7O0FBQ0RyRyxNQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQndDLFdBQXRCLENBQWtDLFFBQWxDO0FBQ0gsS0FSRDtBQVNILEdBM2M4Qjs7QUE2Yy9CO0FBQ0o7QUFDQTtBQUNJK0QsRUFBQUEsY0FoZCtCLDBCQWdkaEJILE1BaGRnQixFQWdkYztBQUFBOztBQUFBLFFBQXRCQyxhQUFzQix1RUFBTixJQUFNO0FBQ3pDLFFBQU1HLFNBQVMsR0FBR3hHLENBQUMsQ0FBQyxvQkFBRCxDQUFuQjtBQUNBLFFBQU15RyxVQUFVLEdBQUd6RyxDQUFDLENBQUMsOEJBQUQsQ0FBcEI7O0FBRUEsUUFBSSxDQUFDd0csU0FBUyxDQUFDdEIsTUFBZixFQUF1QjtBQUNuQjtBQUNILEtBTndDLENBUXpDOzs7QUFDQXNCLElBQUFBLFNBQVMsQ0FBQ0UsS0FBVixHQVR5QyxDQVd6Qzs7QUFDQSxRQUFNQyxHQUFHLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXeEQsSUFBSSxDQUFDc0QsR0FBTCxLQUFhLElBQXhCLENBQVo7QUFDQSxRQUFNRyxNQUFNLEdBQUdILEdBQUcsR0FBSSxLQUFLLEVBQUwsR0FBVSxFQUFoQztBQUNBLFFBQU1JLFNBQVMsR0FBRyxLQUFLLEVBQUwsR0FBVSxFQUE1QixDQWR5QyxDQWNUO0FBRWhDOztBQUNBLFFBQU1DLGVBQWUsR0FBRyxLQUFLLEVBQTdCLENBakJ5QyxDQWlCUjs7QUFDakMsUUFBTUMsUUFBUSxHQUFHTCxJQUFJLENBQUNNLElBQUwsQ0FBVUgsU0FBUyxHQUFHQyxlQUF0QixDQUFqQjtBQUNBLFFBQU1HLFdBQVcsR0FBRyxJQUFJckYsS0FBSixDQUFVbUYsUUFBVixFQUFvQkcsSUFBcEIsQ0FBeUIsSUFBekIsQ0FBcEI7QUFDQSxRQUFNQyxhQUFhLEdBQUcsSUFBSXZGLEtBQUosQ0FBVW1GLFFBQVYsRUFBb0JHLElBQXBCLENBQXlCLElBQXpCLEVBQStCRSxHQUEvQixDQUFtQztBQUFBLGFBQU0sRUFBTjtBQUFBLEtBQW5DLENBQXRCLENBcEJ5QyxDQXNCekM7O0FBQ0EsUUFBSWxCLE1BQU0sSUFBSUEsTUFBTSxDQUFDbEIsTUFBUCxHQUFnQixDQUE5QixFQUFpQztBQUM3QmtCLE1BQUFBLE1BQU0sQ0FBQ3JCLE9BQVAsQ0FBZSxVQUFBdEQsS0FBSyxFQUFJO0FBQ3BCLFlBQUlBLEtBQUssQ0FBQzJCLFNBQU4sSUFBbUIzQixLQUFLLENBQUMyQixTQUFOLElBQW1CMEQsTUFBMUMsRUFBa0Q7QUFDOUMsY0FBTVMsWUFBWSxHQUFHWCxJQUFJLENBQUNDLEtBQUwsQ0FBVyxDQUFDcEYsS0FBSyxDQUFDMkIsU0FBTixHQUFrQjBELE1BQW5CLElBQTZCRSxlQUF4QyxDQUFyQjs7QUFDQSxjQUFJTyxZQUFZLElBQUksQ0FBaEIsSUFBcUJBLFlBQVksR0FBR04sUUFBeEMsRUFBa0Q7QUFDOUM7QUFDQUksWUFBQUEsYUFBYSxDQUFDRSxZQUFELENBQWIsQ0FBNEJDLElBQTVCLENBQWlDL0YsS0FBakMsRUFGOEMsQ0FJOUM7O0FBQ0EsZ0JBQU1nRyxZQUFZLEdBQUdOLFdBQVcsQ0FBQ0ksWUFBRCxDQUFoQzs7QUFDQSxnQkFBTUcsUUFBUSxHQUFHLE1BQUksQ0FBQ0MsYUFBTCxDQUFtQmxHLEtBQUssQ0FBQ3VCLEtBQU4sSUFBZXZCLEtBQUssQ0FBQ3dCLFNBQXhDLENBQWpCOztBQUVBLGdCQUFJLENBQUN3RSxZQUFELElBQWlCLE1BQUksQ0FBQ0csZ0JBQUwsQ0FBc0JGLFFBQXRCLElBQWtDLE1BQUksQ0FBQ0UsZ0JBQUwsQ0FBc0JILFlBQXRCLENBQXZELEVBQTRGO0FBQ3hGTixjQUFBQSxXQUFXLENBQUNJLFlBQUQsQ0FBWCxHQUE0QkcsUUFBNUI7QUFDSDtBQUNKO0FBQ0o7QUFDSixPQWhCRDtBQWlCSCxLQXpDd0MsQ0EyQ3pDOzs7QUFDQSxRQUFJRyxjQUFjLEdBQUcsTUFBckI7O0FBQ0EsUUFBSXhCLGFBQUosRUFBbUI7QUFDZjtBQUNBLFVBQUlBLGFBQWEsQ0FBQ25ELFVBQWxCLEVBQThCO0FBQzFCMkUsUUFBQUEsY0FBYyxHQUFHeEIsYUFBYSxDQUFDbkQsVUFBL0I7QUFDSCxPQUZELE1BRU8sSUFBSW1ELGFBQWEsQ0FBQ3JELEtBQWxCLEVBQXlCO0FBQzVCNkUsUUFBQUEsY0FBYyxHQUFHLEtBQUtGLGFBQUwsQ0FBbUJ0QixhQUFhLENBQUNyRCxLQUFqQyxDQUFqQjtBQUNILE9BRk0sTUFFQSxJQUFJcUQsYUFBYSxDQUFDeUIsUUFBZCxLQUEyQixLQUEvQixFQUFzQztBQUN6QztBQUNBRCxRQUFBQSxjQUFjLEdBQUcsT0FBakI7QUFDSDtBQUNKLEtBdkR3QyxDQXlEekM7OztBQUNBLFFBQUlFLGNBQWMsR0FBRyxJQUFyQjs7QUFDQSxRQUFJMUIsYUFBYSxLQUFLLENBQUNELE1BQUQsSUFBV0EsTUFBTSxDQUFDbEIsTUFBUCxLQUFrQixDQUFsQyxDQUFqQixFQUF1RDtBQUNuRDZDLE1BQUFBLGNBQWMsR0FBRztBQUNiM0UsUUFBQUEsU0FBUyxFQUFFdUQsR0FERTtBQUViM0QsUUFBQUEsS0FBSyxFQUFFcUQsYUFBYSxDQUFDckQsS0FBZCxJQUF1QixZQUZqQjtBQUdiZ0YsUUFBQUEsU0FBUyxFQUFFLElBSEU7QUFJYkMsUUFBQUEsU0FBUyxFQUFFO0FBSkUsT0FBakI7QUFNSCxLQWxFd0MsQ0FvRXpDO0FBQ0E7OztBQUNBLFFBQUlDLFlBQVksR0FBRyxLQUFuQjs7QUFDQSxTQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdsQixRQUFwQixFQUE4QmtCLENBQUMsRUFBL0IsRUFBbUM7QUFDL0IsVUFBSWhCLFdBQVcsQ0FBQ2dCLENBQUQsQ0FBZixFQUFvQjtBQUNoQkQsUUFBQUEsWUFBWSxHQUFHLElBQWY7QUFDQUwsUUFBQUEsY0FBYyxHQUFHVixXQUFXLENBQUNnQixDQUFELENBQTVCOztBQUNBLFlBQUlkLGFBQWEsQ0FBQ2MsQ0FBRCxDQUFiLENBQWlCakQsTUFBakIsR0FBMEIsQ0FBOUIsRUFBaUM7QUFDN0I2QyxVQUFBQSxjQUFjLEdBQUdWLGFBQWEsQ0FBQ2MsQ0FBRCxDQUFiLENBQWlCZCxhQUFhLENBQUNjLENBQUQsQ0FBYixDQUFpQmpELE1BQWpCLEdBQTBCLENBQTNDLENBQWpCO0FBQ0g7QUFDSixPQU5ELE1BTU8sSUFBSWdELFlBQUosRUFBa0I7QUFDckI7QUFDQWYsUUFBQUEsV0FBVyxDQUFDZ0IsQ0FBRCxDQUFYLEdBQWlCTixjQUFqQjs7QUFDQSxZQUFJRSxjQUFjLElBQUlWLGFBQWEsQ0FBQ2MsQ0FBRCxDQUFiLENBQWlCakQsTUFBakIsS0FBNEIsQ0FBbEQsRUFBcUQ7QUFDakRtQyxVQUFBQSxhQUFhLENBQUNjLENBQUQsQ0FBYixHQUFtQixpQ0FBS0osY0FBTDtBQUFxQkMsWUFBQUEsU0FBUyxFQUFFO0FBQWhDLGFBQW5CO0FBQ0g7QUFDSixPQU5NLE1BTUE7QUFDSDtBQUNBYixRQUFBQSxXQUFXLENBQUNnQixDQUFELENBQVgsR0FBaUIsTUFBakI7QUFFSDtBQUNKLEtBekZ3QyxDQTRGekM7OztBQUNBLFFBQUksQ0FBQ0QsWUFBRCxJQUFpQjdCLGFBQWpCLElBQWtDd0IsY0FBYyxLQUFLLE1BQXpELEVBQWlFO0FBQzdELFdBQUssSUFBSU0sRUFBQyxHQUFHLENBQWIsRUFBZ0JBLEVBQUMsR0FBR2xCLFFBQXBCLEVBQThCa0IsRUFBQyxFQUEvQixFQUFtQztBQUMvQmhCLFFBQUFBLFdBQVcsQ0FBQ2dCLEVBQUQsQ0FBWCxHQUFpQk4sY0FBakI7O0FBQ0EsWUFBSUUsY0FBSixFQUFvQjtBQUNoQlYsVUFBQUEsYUFBYSxDQUFDYyxFQUFELENBQWIsR0FBbUIsaUNBQUtKLGNBQUw7QUFBcUJDLFlBQUFBLFNBQVMsRUFBRTtBQUFoQyxhQUFuQjtBQUNIO0FBQ0o7QUFDSixLQXBHd0MsQ0FzR3pDOzs7QUFDQSxRQUFNSSxZQUFZLEdBQUcsTUFBTW5CLFFBQTNCO0FBQ0FFLElBQUFBLFdBQVcsQ0FBQ3BDLE9BQVosQ0FBb0IsVUFBQ3NELEtBQUQsRUFBUUMsS0FBUixFQUFrQjtBQUNsQyxVQUFNQyxjQUFjLEdBQUcsTUFBSSxDQUFDQywyQkFBTCxDQUFpQ0YsS0FBakMsRUFBd0N0QixlQUF4QyxFQUF5REssYUFBYSxDQUFDaUIsS0FBRCxDQUF0RSxDQUF2Qjs7QUFFQSxVQUFNRyxRQUFRLEdBQUd6SSxDQUFDLENBQUMsT0FBRCxDQUFELENBQ1owSSxHQURZLENBQ1I7QUFDRCwyQkFBWU4sWUFBWixNQURDO0FBRUQsa0JBQVUsTUFGVDtBQUdELDRCQUFvQixNQUFJLENBQUNPLFdBQUwsQ0FBaUJOLEtBQWpCLENBSG5CO0FBSUQsc0JBQWMsWUFKYjtBQUtELGtCQUFVO0FBTFQsT0FEUSxFQVFaTyxJQVJZLENBUVAsV0FSTyxFQVFNTCxjQVJOLEVBU1pLLElBVFksQ0FTUCxlQVRPLEVBU1UsWUFUVixFQVVaQSxJQVZZLENBVVAsZ0JBVk8sRUFVVyxNQVZYLENBQWpCO0FBWUFwQyxNQUFBQSxTQUFTLENBQUNxQyxNQUFWLENBQWlCSixRQUFqQjtBQUNILEtBaEJELEVBeEd5QyxDQTBIekM7O0FBQ0FqQyxJQUFBQSxTQUFTLENBQUN2RSxJQUFWLENBQWUsYUFBZixFQUE4QjZHLEtBQTlCLENBQW9DO0FBQ2hDQyxNQUFBQSxTQUFTLEVBQUUsTUFEcUI7QUFFaENDLE1BQUFBLFNBQVMsRUFBRSxJQUZxQjtBQUdoQ25HLE1BQUFBLElBQUksRUFBRTtBQUgwQixLQUFwQztBQUtILEdBaGxCOEI7O0FBa2xCL0I7QUFDSjtBQUNBO0FBQ0k4RSxFQUFBQSxhQXJsQitCLHlCQXFsQmpCM0UsS0FybEJpQixFQXFsQlY7QUFDakIsUUFBTWdCLGVBQWUsR0FBRyxDQUFDaEIsS0FBSyxJQUFJLEVBQVYsRUFBY2lCLFdBQWQsRUFBeEI7O0FBQ0EsWUFBUUQsZUFBUjtBQUNJLFdBQUssWUFBTDtBQUNBLFdBQUssSUFBTDtBQUNBLFdBQUssV0FBTDtBQUNJLGVBQU8sT0FBUDs7QUFDSixXQUFLLGFBQUw7QUFDQSxXQUFLLFFBQUw7QUFDSSxlQUFPLFFBQVA7O0FBQ0osV0FBSyxLQUFMO0FBQ0EsV0FBSyxVQUFMO0FBQ0EsV0FBSyxjQUFMO0FBQ0EsV0FBSyxRQUFMO0FBQ0ksZUFBTyxLQUFQOztBQUNKO0FBQ0ksZUFBTyxNQUFQO0FBZFI7QUFnQkgsR0F2bUI4Qjs7QUF5bUIvQjtBQUNKO0FBQ0E7QUFDSTRELEVBQUFBLGdCQTVtQitCLDRCQTRtQmRTLEtBNW1CYyxFQTRtQlA7QUFDcEIsWUFBUUEsS0FBUjtBQUNJLFdBQUssS0FBTDtBQUFZLGVBQU8sQ0FBUDs7QUFDWixXQUFLLFFBQUw7QUFBZSxlQUFPLENBQVA7O0FBQ2YsV0FBSyxPQUFMO0FBQWMsZUFBTyxDQUFQOztBQUNkO0FBQVMsZUFBTyxDQUFQO0FBSmI7QUFNSCxHQW5uQjhCOztBQXFuQi9CO0FBQ0o7QUFDQTtBQUNJTSxFQUFBQSxXQXhuQitCLHVCQXduQm5CTixLQXhuQm1CLEVBd25CWjtBQUNmLFlBQVFBLEtBQVI7QUFDSSxXQUFLLE9BQUw7QUFBYyxlQUFPLFNBQVA7O0FBQ2QsV0FBSyxRQUFMO0FBQWUsZUFBTyxTQUFQOztBQUNmLFdBQUssS0FBTDtBQUFZLGVBQU8sU0FBUDs7QUFDWjtBQUFTLGVBQU8sU0FBUDtBQUpiO0FBTUgsR0EvbkI4Qjs7QUFpb0IvQjtBQUNKO0FBQ0E7QUFDSVksRUFBQUEsaUJBcG9CK0IsNkJBb29CYjFCLFlBcG9CYSxFQW9vQkNQLGVBcG9CRCxFQW9vQmtCO0FBQzdDLFFBQU1rQyxRQUFRLEdBQUd0QyxJQUFJLENBQUNDLEtBQUwsQ0FBVyxDQUFDLEtBQUtVLFlBQUwsR0FBb0IsQ0FBckIsSUFBMEJQLGVBQTFCLEdBQTRDLElBQXZELENBQWpCO0FBQ0EsUUFBTW1DLFVBQVUsR0FBR3ZDLElBQUksQ0FBQ0MsS0FBTCxDQUFZLENBQUMsS0FBS1UsWUFBTCxHQUFvQixDQUFyQixJQUEwQlAsZUFBMUIsR0FBNEMsSUFBN0MsR0FBcUQsRUFBaEUsQ0FBbkI7O0FBRUEsUUFBSWtDLFFBQVEsR0FBRyxDQUFmLEVBQWtCO0FBQ2QsdUJBQVVBLFFBQVYsb0JBQXVCQyxVQUF2QjtBQUNILEtBRkQsTUFFTztBQUNILHVCQUFVQSxVQUFWO0FBQ0g7QUFDSixHQTdvQjhCOztBQStvQi9CO0FBQ0o7QUFDQTtBQUNJWCxFQUFBQSwyQkFscEIrQix1Q0FrcEJIakIsWUFscEJHLEVBa3BCV1AsZUFscEJYLEVBa3BCNEJaLE1BbHBCNUIsRUFrcEJvQztBQUFBOztBQUMvRCxRQUFNZ0QsZ0JBQWdCLEdBQUk3QixZQUFZLEdBQUdQLGVBQXpDO0FBQ0EsUUFBTXFDLGNBQWMsR0FBSSxDQUFDOUIsWUFBWSxHQUFHLENBQWhCLElBQXFCUCxlQUE3QztBQUNBLFFBQU1MLEdBQUcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVd4RCxJQUFJLENBQUNzRCxHQUFMLEtBQWEsSUFBeEIsQ0FBWjtBQUNBLFFBQU1HLE1BQU0sR0FBR0gsR0FBRyxHQUFJLEtBQUssRUFBTCxHQUFVLEVBQWhDLENBSitELENBTS9EOztBQUNBLFFBQU0yQyxTQUFTLEdBQUcsSUFBSWpHLElBQUosQ0FBUyxDQUFDeUQsTUFBTSxHQUFHc0MsZ0JBQVYsSUFBOEIsSUFBdkMsQ0FBbEI7QUFDQSxRQUFNRyxPQUFPLEdBQUcsSUFBSWxHLElBQUosQ0FBUyxDQUFDeUQsTUFBTSxHQUFHdUMsY0FBVixJQUE0QixJQUFyQyxDQUFoQjtBQUVBLFFBQUl4RyxJQUFJLEdBQUcsbURBQVgsQ0FWK0QsQ0FZL0Q7O0FBQ0FBLElBQUFBLElBQUksNERBQUo7QUFDQUEsSUFBQUEsSUFBSSxjQUFPeUcsU0FBUyxDQUFDRSxrQkFBVixDQUE2QixPQUE3QixFQUFzQztBQUFDQyxNQUFBQSxJQUFJLEVBQUUsU0FBUDtBQUFrQkMsTUFBQUEsTUFBTSxFQUFFO0FBQTFCLEtBQXRDLENBQVAsUUFBSjtBQUNBN0csSUFBQUEsSUFBSSxjQUFPMEcsT0FBTyxDQUFDQyxrQkFBUixDQUEyQixPQUEzQixFQUFvQztBQUFDQyxNQUFBQSxJQUFJLEVBQUUsU0FBUDtBQUFrQkMsTUFBQUEsTUFBTSxFQUFFO0FBQTFCLEtBQXBDLENBQVAsQ0FBSjtBQUNBN0csSUFBQUEsSUFBSSxZQUFKLENBaEIrRCxDQWtCL0Q7O0FBQ0EsUUFBSXVELE1BQU0sSUFBSUEsTUFBTSxDQUFDbEIsTUFBUCxHQUFnQixDQUE5QixFQUFpQztBQUM3QnJDLE1BQUFBLElBQUksSUFBSSw4RUFBUixDQUQ2QixDQUc3Qjs7QUFDQSxVQUFNOEcsWUFBWSxHQUFHLG1CQUFJdkQsTUFBSixFQUFZd0QsSUFBWixDQUFpQixVQUFDQyxDQUFELEVBQUlDLENBQUo7QUFBQSxlQUFVLENBQUNBLENBQUMsQ0FBQzFHLFNBQUYsSUFBZSxDQUFoQixLQUFzQnlHLENBQUMsQ0FBQ3pHLFNBQUYsSUFBZSxDQUFyQyxDQUFWO0FBQUEsT0FBakIsQ0FBckIsQ0FKNkIsQ0FNN0I7OztBQUNBLFVBQU0yRyxhQUFhLEdBQUdKLFlBQVksQ0FBQ0ssS0FBYixDQUFtQixDQUFuQixFQUFzQixDQUF0QixDQUF0QjtBQUVBRCxNQUFBQSxhQUFhLENBQUNoRixPQUFkLENBQXNCLFVBQUF0RCxLQUFLLEVBQUk7QUFDM0IsWUFBTXdJLFNBQVMsR0FBRyxJQUFJNUcsSUFBSixDQUFTNUIsS0FBSyxDQUFDMkIsU0FBTixHQUFrQixJQUEzQixDQUFsQjtBQUNBLFlBQU1KLEtBQUssR0FBR3ZCLEtBQUssQ0FBQ3VCLEtBQU4sSUFBZXZCLEtBQUssQ0FBQ3dCLFNBQXJCLElBQWtDLFNBQWhELENBRjJCLENBRzNCOztBQUNBLFlBQU1pSCxlQUFlLEdBQUcsU0FBbEJBLGVBQWtCLENBQUNDLEdBQUQsRUFBUztBQUM3QixjQUFJLENBQUNBLEdBQUwsRUFBVSxPQUFPQSxHQUFQO0FBQ1YsaUJBQU9BLEdBQUcsQ0FBQ0MsTUFBSixDQUFXLENBQVgsRUFBY25HLFdBQWQsS0FBOEJrRyxHQUFHLENBQUNILEtBQUosQ0FBVSxDQUFWLEVBQWFLLFdBQWIsRUFBckM7QUFDSCxTQUhEOztBQUlBLFlBQU1sSCxTQUFTLEdBQUdSLGVBQWUsMkJBQW9CdUgsZUFBZSxDQUFDbEgsS0FBRCxDQUFuQyxFQUFmLElBQWdFQSxLQUFsRjs7QUFDQSxZQUFNcUYsS0FBSyxHQUFHLE1BQUksQ0FBQ00sV0FBTCxDQUFpQixNQUFJLENBQUNoQixhQUFMLENBQW1CM0UsS0FBbkIsQ0FBakIsQ0FBZDs7QUFFQUgsUUFBQUEsSUFBSSxJQUFJLCtDQUFSO0FBQ0FBLFFBQUFBLElBQUksMkNBQWtDb0gsU0FBUyxDQUFDVCxrQkFBVixDQUE2QixPQUE3QixFQUFzQztBQUFDQyxVQUFBQSxJQUFJLEVBQUUsU0FBUDtBQUFrQkMsVUFBQUEsTUFBTSxFQUFFLFNBQTFCO0FBQXFDWSxVQUFBQSxNQUFNLEVBQUU7QUFBN0MsU0FBdEMsQ0FBbEMsYUFBSjtBQUNBekgsUUFBQUEsSUFBSSxtQ0FBMkJ3RixLQUEzQiwyQ0FBMkRsRixTQUEzRCxZQUFKLENBYjJCLENBZTNCOztBQUNBLFlBQUkxQixLQUFLLENBQUM4SSxHQUFWLEVBQWU7QUFDWDFILFVBQUFBLElBQUksNkNBQW9DcEIsS0FBSyxDQUFDOEksR0FBMUMsZUFBSjtBQUNILFNBbEIwQixDQW9CM0I7OztBQUNBLFlBQUk5SSxLQUFLLENBQUN1RyxTQUFWLEVBQXFCO0FBQ2pCbkYsVUFBQUEsSUFBSSxJQUFJLHVFQUFSO0FBQ0g7O0FBRURBLFFBQUFBLElBQUksSUFBSSxRQUFSO0FBQ0gsT0ExQkQ7O0FBNEJBLFVBQUk4RyxZQUFZLENBQUN6RSxNQUFiLEdBQXNCLENBQTFCLEVBQTZCO0FBQ3pCckMsUUFBQUEsSUFBSSxzR0FBeUU4RyxZQUFZLENBQUN6RSxNQUFiLEdBQXNCLENBQS9GLHlEQUFKO0FBQ0g7O0FBRURyQyxNQUFBQSxJQUFJLElBQUksUUFBUjtBQUNILEtBMUNELE1BMENPO0FBQ0hBLE1BQUFBLElBQUksSUFBSSw4RkFBUjtBQUNIOztBQUVEQSxJQUFBQSxJQUFJLElBQUksUUFBUjtBQUVBLFdBQU9BLElBQVA7QUFDSCxHQXR0QjhCOztBQXd0Qi9CO0FBQ0o7QUFDQTtBQUNJYyxFQUFBQSx3QkEzdEIrQixvQ0EydEJONkcsVUEzdEJNLEVBMnRCTTtBQUNqQztBQUNBLFFBQU1DLElBQUksR0FBR3pLLENBQUMsQ0FBQyxxQkFBRCxDQUFkO0FBQ0EsUUFBTTBLLGFBQWEsR0FBR0QsSUFBSSxDQUFDRSxNQUFMLEVBQXRCOztBQUNBLFFBQUlGLElBQUksQ0FBQ3ZGLE1BQVQsRUFBaUI7QUFDYixVQUFJc0YsVUFBVSxDQUFDRCxHQUFYLEtBQW1CLElBQW5CLElBQTJCQyxVQUFVLENBQUNELEdBQVgsS0FBbUJLLFNBQWxELEVBQTZEO0FBQ3pELFlBQU1DLFFBQVEsR0FBR0wsVUFBVSxDQUFDRCxHQUFYLEdBQWlCLEdBQWpCLEdBQXVCLFNBQXZCLEdBQW1DQyxVQUFVLENBQUNELEdBQVgsR0FBaUIsR0FBakIsR0FBdUIsU0FBdkIsR0FBbUMsU0FBdkY7QUFDQUUsUUFBQUEsSUFBSSxDQUFDSyxJQUFMLFdBQWFOLFVBQVUsQ0FBQ0QsR0FBeEIsY0FBK0I1SCxlQUFlLENBQUNvSSxlQUEvQztBQUNBTCxRQUFBQSxhQUFhLENBQUNoQyxHQUFkLENBQWtCLE9BQWxCLEVBQTJCbUMsUUFBM0I7QUFDSCxPQUpELE1BSU87QUFDSEosUUFBQUEsSUFBSSxDQUFDSyxJQUFMLENBQVUsSUFBVjtBQUNBSixRQUFBQSxhQUFhLENBQUNoQyxHQUFkLENBQWtCLE9BQWxCLEVBQTJCLFNBQTNCO0FBQ0g7QUFDSixLQWJnQyxDQWVqQzs7O0FBQ0EsUUFBTXNDLFNBQVMsR0FBR2hMLENBQUMsQ0FBQywwQkFBRCxDQUFuQjtBQUNBLFFBQU1pTCxXQUFXLEdBQUdqTCxDQUFDLENBQUMsdUJBQUQsQ0FBckI7QUFDQSxRQUFNa0wsa0JBQWtCLEdBQUdGLFNBQVMsQ0FBQ0wsTUFBVixFQUEzQjs7QUFFQSxRQUFJSyxTQUFTLENBQUM5RixNQUFWLElBQW9Cc0YsVUFBVSxDQUFDVyxhQUFuQyxFQUFrRDtBQUM5Q0gsTUFBQUEsU0FBUyxDQUFDRixJQUFWLENBQWUsS0FBS00sY0FBTCxDQUFvQlosVUFBVSxDQUFDVyxhQUEvQixDQUFmO0FBQ0gsS0F0QmdDLENBd0JqQzs7O0FBQ0EsUUFBSUYsV0FBVyxDQUFDL0YsTUFBaEIsRUFBd0I7QUFDcEIsVUFBTS9CLFNBQVMsR0FBR3FILFVBQVUsQ0FBQ3JILFNBQVgsSUFDRnFILFVBQVUsQ0FBQ3hILEtBRFQsSUFFRkwsZUFBZSxDQUFDMEksZUFGaEM7QUFHQUosTUFBQUEsV0FBVyxDQUFDSCxJQUFaLENBQWlCM0gsU0FBakI7QUFDSCxLQTlCZ0MsQ0FnQ2pDOzs7QUFDQSxRQUFJK0gsa0JBQWtCLENBQUNoRyxNQUFuQixJQUE2QnNGLFVBQVUsQ0FBQ3RILFVBQTVDLEVBQXdEO0FBQ3BELFVBQU1vSSxRQUFRLEdBQUcsS0FBSzNDLFdBQUwsQ0FBaUI2QixVQUFVLENBQUN0SCxVQUE1QixDQUFqQjtBQUNBZ0ksTUFBQUEsa0JBQWtCLENBQUN4QyxHQUFuQixDQUF1QixPQUF2QixFQUFnQzRDLFFBQWhDO0FBQ0gsS0FwQ2dDLENBc0NqQzs7O0FBQ0EsUUFBSWQsVUFBVSxDQUFDZSxVQUFmLEVBQTJCO0FBQ3ZCLFVBQU1DLEtBQUssR0FBR2hCLFVBQVUsQ0FBQ2UsVUFBekI7QUFDQSxVQUFNRSxhQUFhLEdBQUd6TCxDQUFDLENBQUMsOEJBQUQsQ0FBdkI7O0FBQ0EsVUFBSXlMLGFBQWEsQ0FBQ3ZHLE1BQWxCLEVBQTBCO0FBQ3RCdUcsUUFBQUEsYUFBYSxDQUFDWCxJQUFkLENBQW1CVSxLQUFLLENBQUNFLFlBQU4sYUFBd0JGLEtBQUssQ0FBQ0UsWUFBOUIsU0FBZ0QsSUFBbkU7QUFDSDs7QUFFRCxVQUFNQyxPQUFPLEdBQUczTCxDQUFDLENBQUMsd0JBQUQsQ0FBakI7O0FBQ0EsVUFBSTJMLE9BQU8sQ0FBQ3pHLE1BQVosRUFBb0I7QUFDaEJ5RyxRQUFBQSxPQUFPLENBQUNiLElBQVIsQ0FBYVUsS0FBSyxDQUFDSSxXQUFOLElBQXFCLEdBQWxDO0FBQ0g7QUFDSjtBQUNKLEdBOXdCOEI7O0FBZ3hCL0I7QUFDSjtBQUNBO0FBQ0kxRixFQUFBQSxrQkFueEIrQixnQ0FteEJWO0FBQUE7O0FBQ2pCLFFBQU0yRixJQUFJLEdBQUc3TCxDQUFDLENBQUMscUJBQUQsQ0FBZDtBQUNBNkwsSUFBQUEsSUFBSSxDQUFDcEosUUFBTCxDQUFjLFNBQWQsRUFGaUIsQ0FJakI7O0FBQ0EsUUFBTXFKLFlBQVksR0FBRztBQUNqQkMsTUFBQUEsSUFBSSxFQUFFLEtBQUtoTSxRQUFMLENBQWNlLElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsTUFBaEMsQ0FEVztBQUVqQmtMLE1BQUFBLFFBQVEsRUFBRSxLQUFLak0sUUFBTCxDQUFjZSxJQUFkLENBQW1CLFdBQW5CLEVBQWdDLFVBQWhDLENBRk87QUFHakJtTCxNQUFBQSxXQUFXLEVBQUUsS0FBS2xNLFFBQUwsQ0FBY2UsSUFBZCxDQUFtQixXQUFuQixFQUFnQyxhQUFoQztBQUhJLEtBQXJCLENBTGlCLENBV2pCOztBQUNBLFFBQU0rRSxTQUFTLEdBQUcsS0FBSzNGLFlBQUwsS0FBc0IsS0FBdEIsR0FBOEI0RixlQUE5QixHQUFnREMsZUFBbEUsQ0FaaUIsQ0FjakI7O0FBQ0FGLElBQUFBLFNBQVMsQ0FBQ00sVUFBVixDQUFxQixLQUFLaEcsVUFBMUIsRUFBc0MsVUFBQ3FFLFFBQUQsRUFBYztBQUNoRHFILE1BQUFBLElBQUksQ0FBQ3JKLFdBQUwsQ0FBaUIsU0FBakI7O0FBQ0EsVUFBSWdDLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDaEQsSUFBNUIsSUFBb0NnRCxRQUFRLENBQUNoRCxJQUFULENBQWM0RSxNQUF0RCxFQUE4RDtBQUMxRCxRQUFBLE9BQUksQ0FBQzhGLFdBQUwsQ0FBaUIxSCxRQUFRLENBQUNoRCxJQUFULENBQWM0RSxNQUEvQjtBQUNJakcsVUFBQUEsVUFBVSxFQUFFLE9BQUksQ0FBQ0EsVUFEckI7QUFFSUQsVUFBQUEsWUFBWSxFQUFFLE9BQUksQ0FBQ0EsWUFBTCxDQUFrQitELFdBQWxCO0FBRmxCLFdBR082SCxZQUhQO0FBS0gsT0FORCxNQU1PLElBQUksQ0FBQ3RILFFBQVEsQ0FBQ0MsTUFBZCxFQUFzQjtBQUN6QjBILFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQnpKLGVBQWUsQ0FBQzBKLGVBQXRDO0FBQ0g7QUFDSixLQVhEO0FBWUgsR0E5eUI4Qjs7QUFnekIvQjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsV0FuekIrQix1QkFtekJuQjlGLE1BbnpCbUIsRUFtekJYMEYsWUFuekJXLEVBbXpCRztBQUM5QixRQUFJLENBQUMxRixNQUFELElBQVdBLE1BQU0sQ0FBQ2xCLE1BQVAsS0FBa0IsQ0FBakMsRUFBb0M7QUFDaENpSCxNQUFBQSxXQUFXLENBQUNHLFdBQVosQ0FBd0IzSixlQUFlLENBQUM0SixvQkFBeEM7QUFDQTtBQUNILEtBSjZCLENBTTlCOzs7QUFDQSxRQUFNQyxPQUFPLEdBQUcsQ0FDWixXQURZLEVBRVosVUFGWSxFQUdaLGFBSFksRUFJWixlQUpZLEVBS1osZUFMWSxFQU1aLG1CQU5ZLEVBT1osc0JBUFksRUFRWixPQVJZLEVBU1osWUFUWSxFQVVaLGdCQVZZLEVBV1osV0FYWSxFQVlaLFFBWlksRUFhWixhQWJZLEVBY1osY0FkWSxFQWVaLGNBZlksRUFnQlosaUJBaEJZLEVBaUJaLFNBakJZLEVBa0JaLFlBbEJZLEVBbUJaLG1CQW5CWSxFQW9CWixTQXBCWSxFQXFCWixlQXJCWSxFQXNCWixVQXRCWSxDQUFoQixDQVA4QixDQWdDOUI7O0FBQ0EsUUFBTUMsSUFBSSxHQUFHckcsTUFBTSxDQUFDa0IsR0FBUCxDQUFXLFVBQUE3RixLQUFLLEVBQUk7QUFDN0I7QUFDQSxhQUFPLENBQ0hBLEtBQUssQ0FBQzJCLFNBQU4sSUFBbUIsRUFEaEIsRUFFSDNCLEtBQUssQ0FBQ2lMLFFBQU4sSUFBa0IsRUFGZixFQUdIWixZQUFZLENBQUMzTCxVQUFiLElBQTJCLEVBSHhCLEVBSUgyTCxZQUFZLENBQUM1TCxZQUFiLElBQTZCLEVBSjFCLEVBS0g0TCxZQUFZLENBQUNDLElBQWIsSUFBcUIsRUFMbEIsRUFNSEQsWUFBWSxDQUFDRSxRQUFiLElBQXlCLEVBTnRCLEVBT0hGLFlBQVksQ0FBQ0csV0FBYixJQUE0QixFQVB6QixFQVFIeEssS0FBSyxDQUFDQSxLQUFOLElBQWUsRUFSWixFQVNIQSxLQUFLLENBQUNzQixJQUFOLElBQWMsRUFUWCxFQVVIdEIsS0FBSyxDQUFDa0wsYUFBTixJQUF1QmxMLEtBQUssQ0FBQ21MLGNBQTdCLElBQStDLEVBVjVDLEVBV0huTCxLQUFLLENBQUN1QixLQUFOLElBQWV2QixLQUFLLENBQUN3QixTQUFyQixJQUFrQyxFQVgvQixFQVlIeEIsS0FBSyxDQUFDOEksR0FBTixJQUFhLEVBWlYsRUFhSDlJLEtBQUssQ0FBQ29MLFVBQU4sSUFBb0JwTCxLQUFLLENBQUNxTCxXQUExQixJQUF5QyxFQWJ0QyxFQWNIckwsS0FBSyxDQUFDc0wsV0FBTixJQUFxQnRMLEtBQUssQ0FBQ3VMLFlBQTNCLElBQTJDLEVBZHhDLEVBZUh2TCxLQUFLLENBQUN3TCxXQUFOLElBQXFCeEwsS0FBSyxDQUFDeUwsWUFBM0IsSUFBMkMsRUFmeEMsRUFnQkh6TCxLQUFLLENBQUMwTCxjQUFOLElBQXdCMUwsS0FBSyxDQUFDMkwsZUFBOUIsSUFBaUQsRUFoQjlDLEVBaUJIM0wsS0FBSyxDQUFDNEwsT0FBTixJQUFpQixFQWpCZCxFQWtCSDVMLEtBQUssQ0FBQzZMLFNBQU4sSUFBbUI3TCxLQUFLLENBQUM4TCxVQUF6QixJQUF1QyxFQWxCcEMsRUFtQkg5TCxLQUFLLENBQUMrTCxnQkFBTixJQUEwQi9MLEtBQUssQ0FBQ2dNLGlCQUFoQyxJQUFxRCxFQW5CbEQsRUFvQkhoTSxLQUFLLENBQUNpTSxPQUFOLElBQWlCLEVBcEJkLEVBcUJIak0sS0FBSyxDQUFDbUQsS0FBTixJQUFlbkQsS0FBSyxDQUFDa00sWUFBckIsSUFBcUMsRUFyQmxDLEVBc0JIQyxJQUFJLENBQUNDLFNBQUwsQ0FBZXBNLEtBQWYsQ0F0QkcsQ0FzQm1CO0FBdEJuQixPQUFQO0FBd0JILEtBMUJZLENBQWIsQ0FqQzhCLENBNkQ5Qjs7QUFDQSxRQUFNcU0sR0FBRyxHQUFHLFFBQVo7QUFDQSxRQUFJQyxVQUFVLEdBQUdELEdBQWpCLENBL0Q4QixDQWlFOUI7O0FBQ0FDLElBQUFBLFVBQVUsaUNBQTBCakMsWUFBWSxDQUFDM0wsVUFBdkMsZUFBc0QyTCxZQUFZLENBQUM1TCxZQUFuRSxRQUFWO0FBQ0E2TixJQUFBQSxVQUFVLHNCQUFlakMsWUFBWSxDQUFDQyxJQUE1QixPQUFWO0FBQ0FnQyxJQUFBQSxVQUFVLDBCQUFtQmpDLFlBQVksQ0FBQ0UsUUFBaEMsT0FBVjtBQUNBK0IsSUFBQUEsVUFBVSw2QkFBc0JqQyxZQUFZLENBQUNHLFdBQW5DLE9BQVY7QUFDQThCLElBQUFBLFVBQVUsNkJBQXNCLElBQUkxSyxJQUFKLEdBQVdDLFdBQVgsRUFBdEIsT0FBVjtBQUNBeUssSUFBQUEsVUFBVSw4QkFBdUIzSCxNQUFNLENBQUNsQixNQUE5QixPQUFWO0FBQ0E2SSxJQUFBQSxVQUFVLElBQUksSUFBZCxDQXhFOEIsQ0EwRTlCOztBQUNBQSxJQUFBQSxVQUFVLElBQUl2QixPQUFPLENBQUN3QixJQUFSLENBQWEsR0FBYixJQUFvQixJQUFsQyxDQTNFOEIsQ0E2RTlCOztBQUNBdkIsSUFBQUEsSUFBSSxDQUFDMUgsT0FBTCxDQUFhLFVBQUFrSixHQUFHLEVBQUk7QUFDaEJGLE1BQUFBLFVBQVUsSUFBSUUsR0FBRyxDQUFDM0csR0FBSixDQUFRLFVBQUE0RyxJQUFJLEVBQUk7QUFDMUI7QUFDQSxZQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQ0YsSUFBRCxDQUF0Qjs7QUFDQSxZQUFJQyxPQUFPLENBQUN0TixRQUFSLENBQWlCLEdBQWpCLEtBQXlCc04sT0FBTyxDQUFDdE4sUUFBUixDQUFpQixJQUFqQixDQUF6QixJQUFtRHNOLE9BQU8sQ0FBQ3ROLFFBQVIsQ0FBaUIsR0FBakIsQ0FBbkQsSUFBNEVzTixPQUFPLENBQUN0TixRQUFSLENBQWlCLEdBQWpCLENBQWhGLEVBQXVHO0FBQ25HLDZCQUFXc04sT0FBTyxDQUFDRSxPQUFSLENBQWdCLElBQWhCLEVBQXNCLElBQXRCLENBQVg7QUFDSDs7QUFDRCxlQUFPRixPQUFQO0FBQ0gsT0FQYSxFQU9YSCxJQVBXLENBT04sR0FQTSxJQU9DLElBUGY7QUFRSCxLQVRELEVBOUU4QixDQXlGOUI7O0FBQ0EsUUFBTU0sSUFBSSxHQUFHLElBQUlDLElBQUosQ0FBUyxDQUFDUixVQUFELENBQVQsRUFBdUI7QUFBRWhMLE1BQUFBLElBQUksRUFBRTtBQUFSLEtBQXZCLENBQWI7QUFDQSxRQUFNeUwsR0FBRyxHQUFHQyxHQUFHLENBQUNDLGVBQUosQ0FBb0JKLElBQXBCLENBQVo7QUFDQSxRQUFNSyxJQUFJLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixHQUF2QixDQUFiLENBNUY4QixDQThGOUI7O0FBQ0EsUUFBTWxJLEdBQUcsR0FBRyxJQUFJdEQsSUFBSixFQUFaO0FBQ0EsUUFBTUQsU0FBUyxHQUFHdUQsR0FBRyxDQUFDckQsV0FBSixHQUFrQitLLE9BQWxCLENBQTBCLE9BQTFCLEVBQW1DLEdBQW5DLEVBQXdDUyxTQUF4QyxDQUFrRCxDQUFsRCxFQUFxRCxFQUFyRCxDQUFsQjtBQUNBLFFBQU1DLFFBQVEsc0JBQWVqRCxZQUFZLENBQUMzTCxVQUE1QixjQUEwQzJMLFlBQVksQ0FBQzVMLFlBQXZELGNBQXVFa0QsU0FBdkUsU0FBZDtBQUVBdUwsSUFBQUEsSUFBSSxDQUFDSyxZQUFMLENBQWtCLE1BQWxCLEVBQTBCUixHQUExQjtBQUNBRyxJQUFBQSxJQUFJLENBQUNLLFlBQUwsQ0FBa0IsVUFBbEIsRUFBOEJELFFBQTlCO0FBQ0FKLElBQUFBLElBQUksQ0FBQ00sS0FBTCxDQUFXQyxPQUFYLEdBQXFCLE1BQXJCO0FBRUFOLElBQUFBLFFBQVEsQ0FBQ08sSUFBVCxDQUFjQyxXQUFkLENBQTBCVCxJQUExQjtBQUNBQSxJQUFBQSxJQUFJLENBQUNVLEtBQUw7QUFDQVQsSUFBQUEsUUFBUSxDQUFDTyxJQUFULENBQWNHLFdBQWQsQ0FBMEJYLElBQTFCLEVBekc4QixDQTJHOUI7O0FBQ0FySixJQUFBQSxVQUFVLENBQUM7QUFBQSxhQUFNbUosR0FBRyxDQUFDYyxlQUFKLENBQW9CZixHQUFwQixDQUFOO0FBQUEsS0FBRCxFQUFpQyxHQUFqQyxDQUFWO0FBQ0gsR0FoNkI4Qjs7QUFrNkIvQjtBQUNKO0FBQ0E7QUFDSXBELEVBQUFBLGNBcjZCK0IsMEJBcTZCaEJvRSxPQXI2QmdCLEVBcTZCUDtBQUNwQixRQUFJLENBQUNBLE9BQUwsRUFBYyxPQUFPLElBQVA7QUFFZCxRQUFNQyxJQUFJLEdBQUc3SSxJQUFJLENBQUNDLEtBQUwsQ0FBVzJJLE9BQU8sR0FBRyxLQUFyQixDQUFiO0FBQ0EsUUFBTUUsS0FBSyxHQUFHOUksSUFBSSxDQUFDQyxLQUFMLENBQVkySSxPQUFPLEdBQUcsS0FBWCxHQUFvQixJQUEvQixDQUFkO0FBQ0EsUUFBTUcsT0FBTyxHQUFHL0ksSUFBSSxDQUFDQyxLQUFMLENBQVkySSxPQUFPLEdBQUcsSUFBWCxHQUFtQixFQUE5QixDQUFoQjtBQUNBLFFBQU1JLElBQUksR0FBR0osT0FBTyxHQUFHLEVBQXZCLENBTm9CLENBUXBCOztBQUNBLFFBQU1LLE9BQU8sR0FBR2xOLGVBQWUsQ0FBQ21OLE9BQWhDO0FBQ0EsUUFBTUMsUUFBUSxHQUFHcE4sZUFBZSxDQUFDcU4sUUFBakM7QUFDQSxRQUFNQyxVQUFVLEdBQUd0TixlQUFlLENBQUN1TixVQUFuQztBQUNBLFFBQU1DLFVBQVUsR0FBR3hOLGVBQWUsQ0FBQ3lOLFVBQW5DOztBQUVBLFFBQUlYLElBQUksR0FBRyxDQUFYLEVBQWM7QUFDVix1QkFBVUEsSUFBVixTQUFpQkksT0FBakIsY0FBNEJILEtBQTVCLFNBQW9DSyxRQUFwQyxjQUFnREosT0FBaEQsU0FBMERNLFVBQTFEO0FBQ0gsS0FGRCxNQUVPLElBQUlQLEtBQUssR0FBRyxDQUFaLEVBQWU7QUFDbEIsdUJBQVVBLEtBQVYsU0FBa0JLLFFBQWxCLGNBQThCSixPQUE5QixTQUF3Q00sVUFBeEMsY0FBc0RMLElBQXRELFNBQTZETyxVQUE3RDtBQUNILEtBRk0sTUFFQSxJQUFJUixPQUFPLEdBQUcsQ0FBZCxFQUFpQjtBQUNwQix1QkFBVUEsT0FBVixTQUFvQk0sVUFBcEIsY0FBa0NMLElBQWxDLFNBQXlDTyxVQUF6QztBQUNILEtBRk0sTUFFQTtBQUNILHVCQUFVUCxJQUFWLFNBQWlCTyxVQUFqQjtBQUNIO0FBQ0osR0E1N0I4Qjs7QUE4N0IvQjtBQUNKO0FBQ0E7QUFDSUUsRUFBQUEsT0FqOEIrQixxQkFpOEJyQjtBQUNOLFFBQUksS0FBS2hMLGFBQVQsRUFBd0I7QUFDcEJELE1BQUFBLFlBQVksQ0FBQyxLQUFLQyxhQUFOLENBQVo7QUFDSDs7QUFFRCxRQUFJLEtBQUtFLGdCQUFULEVBQTJCO0FBQ3ZCK0ssTUFBQUEsYUFBYSxDQUFDLEtBQUsvSyxnQkFBTixDQUFiO0FBQ0gsS0FQSyxDQVNOOzs7QUFDQSxRQUFJLEtBQUtuRixZQUFMLElBQXFCLE9BQU9lLFFBQVAsS0FBb0IsV0FBN0MsRUFBMEQ7QUFDdERBLE1BQUFBLFFBQVEsQ0FBQ29QLFdBQVQsQ0FBcUIsaUJBQXJCO0FBQ0EsV0FBS25RLFlBQUwsR0FBb0IsS0FBcEI7QUFDSDtBQUNKO0FBLzhCOEIsQ0FBbkMsQyxDQW05QkE7O0FBQ0FKLENBQUMsQ0FBQzRPLFFBQUQsQ0FBRCxDQUFZNEIsS0FBWixDQUFrQixZQUFNO0FBQ3BCMVEsRUFBQUEsMEJBQTBCLENBQUNXLFVBQTNCO0FBQ0gsQ0FGRCxFLENBSUE7O0FBQ0FULENBQUMsQ0FBQ1UsTUFBRCxDQUFELENBQVV5RSxFQUFWLENBQWEsY0FBYixFQUE2QixZQUFNO0FBQy9CckYsRUFBQUEsMEJBQTBCLENBQUN1USxPQUEzQjtBQUNILENBRkQsRSxDQUlBOztBQUNBM1AsTUFBTSxDQUFDWiwwQkFBUCxHQUFvQ0EsMEJBQXBDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBEZWJ1Z2dlckluZm8sIEV2ZW50QnVzLCBnbG9iYWxSb290VXJsLCBQcm92aWRlcnNBUEksIFNpcFByb3ZpZGVyc0FQSSwgSWF4UHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogUHJvdmlkZXIgU3RhdHVzIFdvcmtlciBmb3IgTW9kaWZ5IFBhZ2VcbiAqIEhhbmRsZXMgcmVhbC10aW1lIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzIHZpYSBFdmVudEJ1cyBmb3IgaW5kaXZpZHVhbCBwcm92aWRlciBlZGl0IHBhZ2VzXG4gKiBSZXBsYWNlcyB0aGUgb2xkIHBvbGxpbmctYmFzZWQgYXBwcm9hY2ggd2l0aCBlZmZpY2llbnQgRXZlbnRCdXMgc3Vic2NyaXB0aW9uXG4gKlxuICogQG1vZHVsZSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlclxuICovXG5jb25zdCBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtcHJvdmlkZXItZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN0YXR1cyBsYWJlbFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN0YXR1czogJCgnI3N0YXR1cycpLFxuXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXIgdHlwZSBkZXRlcm1pbmVkIGZyb20gdGhlIHBhZ2UgVVJMXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwcm92aWRlclR5cGU6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgcHJvdmlkZXIgaWRcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHByb3ZpZGVySWQ6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBzdGF0dXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1N1YnNjcmliZWQ6IGZhbHNlLFxuICAgIFxuICAgIC8qKlxuICAgICAqIExhc3Qga25vd24gcHJvdmlkZXIgc3RhdHVzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBsYXN0U3RhdHVzOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpYWdub3N0aWNzIHRhYiBpbml0aWFsaXplZCBmbGFnXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGlhZ25vc3RpY3NJbml0aWFsaXplZDogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogSGlzdG9yeSBEYXRhVGFibGUgaW5zdGFuY2VcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGhpc3RvcnlUYWJsZTogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHN0YXR1cyBkYXRhIGZvciBkaWFnbm9zdGljc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgc3RhdHVzRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyB3b3JrZXIgd2l0aCBFdmVudEJ1cyBzdWJzY3JpcHRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgcHJvdmlkZXIgdHlwZSBhbmQgdW5pcWlkXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJ21vZGlmeXNpcCcpKSB7XG4gICAgICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9ICdzaXAnO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnbW9kaWZ5aWF4JykpIHtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gJ2lheCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBwcm92aWRlciBpZCBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5wcm92aWRlcklkID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgaWYgKCF0aGlzLnByb3ZpZGVySWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJ1Z2dlciBpbmZvXG4gICAgICAgIGlmICh0eXBlb2YgRGVidWdnZXJJbmZvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRCdXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXNcbiAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byByZWZyZXNoIHN0YXR1c1xuICAgICAgICB0aGlzLnNldHVwRm9ybUNoYW5nZURldGVjdGlvbigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciBwcm92aWRlciBzdGF0dXMgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRCdXMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNVcGRhdGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pc1N1YnNjcmliZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2UgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlIHx8ICFtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBldmVudCBhbmQgZGF0YVxuICAgICAgICBsZXQgZXZlbnQsIGRhdGE7XG4gICAgICAgIGlmIChtZXNzYWdlLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuZGF0YS5ldmVudCkge1xuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmRhdGEuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhLmRhdGEgfHwgbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgb3RoZXIgZXZlbnRzXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3Mgc3RhdHVzIHVwZGF0ZSB3aXRoIGNoYW5nZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLmNoYW5nZXMgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jaGFuZ2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIHN0YXR1cyBjaGFuZ2UgZm9yIG91ciBzcGVjaWZpYyBwcm92aWRlclxuICAgICAgICBjb25zdCByZWxldmFudENoYW5nZSA9IGRhdGEuY2hhbmdlcy5maW5kKGNoYW5nZSA9PiBcbiAgICAgICAgICAgIGNoYW5nZS5wcm92aWRlcl9pZCA9PT0gdGhpcy5wcm92aWRlcklkIHx8IGNoYW5nZS5pZCA9PT0gdGhpcy5wcm92aWRlcklkXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVsZXZhbnRDaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShyZWxldmFudENoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29tcGxldGUgc3RhdHVzIGRhdGFcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9vayBmb3Igb3VyIHByb3ZpZGVyIGluIHRoZSBzdGF0dXMgZGF0YVxuICAgICAgICBjb25zdCBwcm92aWRlclN0YXR1cyA9IGRhdGEuc3RhdHVzZXNbdGhpcy5wcm92aWRlclR5cGVdPy5bdGhpcy5wcm92aWRlcklkXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5zdGF0dXNlc1t0aGlzLnByb3ZpZGVySWRdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyU3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocHJvdmlkZXJTdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3RhdHVzIGVycm9yXG4gICAgICovXG4gICAgaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSkge1xuICAgICAgICAvLyBTaG93IGVycm9yIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncmVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0Vycm9yO1xuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2Vycm9yVGV4dH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgZGlzcGxheSB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIHByb3BlcnRpZXMgb3IgZmFsbGJhY2tcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNEaXNwbGF5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGxhc3Qgc3RhdHVzIGZvciBkZWJ1Z2dpbmdcbiAgICAgICAgdGhpcy5sYXN0U3RhdHVzID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgc3RhdHVzIGRhdGEgZm9yIGRpYWdub3N0aWNzXG4gICAgICAgIHRoaXMuc3RhdHVzRGF0YSA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgRGVidWdnZXJJbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIERlYnVnZ2VySW5mbyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlYnVnSW5mbyA9IHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5wcm92aWRlcklkLFxuICAgICAgICAgICAgICAgIHR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLFxuICAgICAgICAgICAgICAgIHN0YXRlOiBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlLFxuICAgICAgICAgICAgICAgIHN0YXRlQ29sb3I6IHN0YXR1c0RhdGEuc3RhdGVDb2xvcixcbiAgICAgICAgICAgICAgICBzdGF0ZVRleHQ6IHN0YXR1c0RhdGEuc3RhdGVUZXh0LFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBodG1sVGFibGUgPSBgXG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+UHJvdmlkZXI8L3RkPjx0ZD4ke2RlYnVnSW5mby5pZH08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VHlwZTwvdGQ+PHRkPiR7ZGVidWdJbmZvLnR5cGV9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPlN0YXRlPC90ZD48dGQ+JHtkZWJ1Z0luZm8uc3RhdGV9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPkNvbG9yPC90ZD48dGQ+JHtkZWJ1Z0luZm8uc3RhdGVDb2xvcn08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VXBkYXRlZDwvdGQ+PHRkPiR7ZGVidWdJbmZvLnRpbWVzdGFtcH08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdGF0dXNEYXRhLnN0YXRlQ29sb3IgJiYgc3RhdHVzRGF0YS5zdGF0ZVRleHQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzV2l0aEJhY2tlbmRQcm9wZXJ0aWVzKHN0YXR1c0RhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbGVnYWN5IHN0YXRlLWJhc2VkIHVwZGF0ZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNMZWdhY3koc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkaWFnbm9zdGljcyBkaXNwbGF5IGlmIGluaXRpYWxpemVkXG4gICAgICAgIGlmICh0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRGlhZ25vc3RpY3NEaXNwbGF5KHN0YXR1c0RhdGEpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzV2l0aEJhY2tlbmRQcm9wZXJ0aWVzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZUNvbG9yLCBzdGF0ZUljb24sIHN0YXRlVGV4dCwgc3RhdGVEZXNjcmlwdGlvbiwgc3RhdGUgfSA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBjb2xvciBjbGFzc1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IGdyZXkgcmVkIGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHN0YXRlQ29sb3IpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIGNvbnRlbnQgd2l0aCBpY29uIGFuZCB0cmFuc2xhdGVkIHRleHRcbiAgICAgICAgbGV0IHN0YXR1c0NvbnRlbnQgPSAnJztcbiAgICAgICAgaWYgKHN0YXRlSWNvbikge1xuICAgICAgICAgICAgc3RhdHVzQ29udGVudCArPSBgPGkgY2xhc3M9XCIke3N0YXRlSWNvbn0gaWNvblwiPjwvaT4gYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RhdGUgdGV4dCBpcyBhbHJlYWR5IHRyYW5zbGF0ZWQgYnkgQVBJLCB1c2UgaXQgZGlyZWN0bHlcbiAgICAgICAgY29uc3QgZGlzcGxheVRleHQgPSBzdGF0ZVRleHQgfHwgc3RhdGUgfHwgJ1Vua25vd24nO1xuICAgICAgICBzdGF0dXNDb250ZW50ICs9IGRpc3BsYXlUZXh0O1xuICAgICAgICBcbiAgICAgICAgdGhpcy4kc3RhdHVzLmh0bWwoc3RhdHVzQ29udGVudCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMZWdhY3kgc3RhdHVzIHVwZGF0ZSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0xlZ2FjeShzdGF0dXNEYXRhKSB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gc3RhdHVzRGF0YS5zdGF0ZSB8fCBzdGF0dXNEYXRhLm5ld19zdGF0ZSB8fCAnJztcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFN0YXRlID0gc3RhdGUudG9VcHBlckNhc2UoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIGNsYXNzIGFuZCB1cGRhdGUgYmFzZWQgb24gc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKG5vcm1hbGl6ZWRTdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAnUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdPSyc6XG4gICAgICAgICAgICBjYXNlICdSRUFDSEFCTEUnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZXkgeWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JlZW4nKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJjaGVja21hcmsgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT25saW5lfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnTEFHR0VEJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiBncmV5IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygneWVsbG93JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfV2l0aG91dFJlZ2lzdHJhdGlvbn1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ09GRic6XG4gICAgICAgICAgICBjYXNlICdVTk1PTklUT1JFRCc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cIm1pbnVzIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX09mZmxpbmV9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdSRUpFQ1RFRCc6XG4gICAgICAgICAgICBjYXNlICdVTlJFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnRkFJTEVEJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwidGltZXMgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZX1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInF1ZXN0aW9uIGljb25cIj48L2k+ICR7c3RhdGUgfHwgJ1Vua25vd24nfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgc3RhdHVzIGZvciB0aGUgcHJvdmlkZXJcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdsb2FkaW5nJylcbiAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja2luZ1N0YXR1c31gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIGZvciB0aGlzIHNwZWNpZmljIHByb3ZpZGVyIHZpYSBSRVNUIEFQSSB2M1xuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzKHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGRpc3BsYXkgd2l0aCB0aGUgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgbm90IGZvdW5kIG9yIGVycm9yXG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInF1ZXN0aW9uIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX05vdEZvdW5kfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVJlcXVlc3RFcnJvcignSW52YWxpZCByZXNwb25zZSBmb3JtYXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVxdWVzdCBlcnJvcnNcbiAgICAgKi9cbiAgICBoYW5kbGVSZXF1ZXN0RXJyb3IoZXJyb3IpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZ3JlZW4geWVsbG93IGdyZXknKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyZWQnKVxuICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfQ29ubmVjdGlvbkVycm9yfWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHJlZnJlc2ggc3RhdHVzIHdoZW4gcHJvdmlkZXIgc2V0dGluZ3MgY2hhbmdlXG4gICAgICovXG4gICAgc2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uKCkge1xuICAgICAgICAvLyBNb25pdG9yIGtleSBmaWVsZHMgdGhhdCBtaWdodCBhZmZlY3QgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgIGNvbnN0IGtleUZpZWxkcyA9IFsnaG9zdCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAnZGlzYWJsZWQnXTtcbiAgICAgICAgXG4gICAgICAgIGtleUZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSB0aGlzLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRmaWVsZC5vbignY2hhbmdlIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlYm91bmNlIHN0YXR1cyByZXF1ZXN0c1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5jaGFuZ2VUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm92aWRlcklkKSB7IC8vIE9ubHkgcmVxdWVzdCBpZiB3ZSBoYXZlIGEgdmFsaWQgcHJvdmlkZXIgSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIHBlcmlvZGljIHVwZGF0ZSBmb3Igd2hlbiBFdmVudEJ1cyBpcyBub3QgYXZhaWxhYmxlXG4gICAgICovXG4gICAgc3RhcnRQZXJpb2RpY1VwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5wZXJpb2RpY0ludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICB9LCA1MDAwKTsgLy8gQ2hlY2sgZXZlcnkgNSBzZWNvbmRzIGFzIGZhbGxiYWNrXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCkge1xuICAgICAgICBpZiAodGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZWxpbmVcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGltZWxpbmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcmNlIGNoZWNrIGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgIGNvbnN0ICRjaGVja0J0biA9ICQoJyNjaGVjay1ub3ctYnRuJyk7XG4gICAgICAgICRjaGVja0J0bi5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgJGNoZWNrQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgICAgICBjb25zdCBhcGlDbGllbnQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgZm9yY2VDaGVjayB1c2luZyB2MyBBUElcbiAgICAgICAgICAgIGFwaUNsaWVudC5mb3JjZUNoZWNrKHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGNoZWNrQnRuLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGltZWxpbmVEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXhwb3J0IGhpc3RvcnkgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgJCgnI2V4cG9ydC1oaXN0b3J5LWJ0bicpLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmV4cG9ydEhpc3RvcnlUb0NTVigpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERpc3BsYXkgY3VycmVudCBzdGF0dXMgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0aGlzLnN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRGlhZ25vc3RpY3NEaXNwbGF5KHRoaXMuc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVsaW5lIHZpc3VhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZWxpbmUoKSB7XG4gICAgICAgIC8vIExvYWQgdGltZWxpbmUgZGF0YVxuICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgdGltZWxpbmUgZGF0YSBmcm9tIGhpc3RvcnlcbiAgICAgKi9cbiAgICBsb2FkVGltZWxpbmVEYXRhKCkge1xuICAgICAgICAvLyBVc2UgdGhlIGFwcHJvcHJpYXRlIEFQSSBjbGllbnQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBjb25zdCBhcGlDbGllbnQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG5cbiAgICAgICAgLy8gQ2FsbCBnZXRIaXN0b3J5IHVzaW5nIHYzIEFQSVxuICAgICAgICBhcGlDbGllbnQuZ2V0SGlzdG9yeSh0aGlzLnByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUGFzcyBib3RoIGV2ZW50cyBhbmQgY3VycmVudCBwcm92aWRlciBzdGF0dXMgdG8gdGltZWxpbmVcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudHMgPSByZXNwb25zZS5kYXRhLmV2ZW50cyB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50U3RhdHVzID0gcmVzcG9uc2UuZGF0YS5wcm92aWRlciB8fCB0aGlzLnN0YXR1c0RhdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJUaW1lbGluZShldmVudHMsIGN1cnJlbnRTdGF0dXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3RpbWVsaW5lLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIHJlbmRlclRpbWVsaW5lKGV2ZW50cywgY3VycmVudFN0YXR1cyA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRpbWVsaW5lID0gJCgnI3Byb3ZpZGVyLXRpbWVsaW5lJyk7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjcHJvdmlkZXItdGltZWxpbmUtY29udGFpbmVyJyk7XG5cbiAgICAgICAgaWYgKCEkdGltZWxpbmUubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lbGluZVxuICAgICAgICAkdGltZWxpbmUuZW1wdHkoKTtcblxuICAgICAgICAvLyBHZXQgdGltZSByYW5nZSAobGFzdCAyNCBob3VycylcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuICAgICAgICBjb25zdCB0aW1lUmFuZ2UgPSAyNCAqIDYwICogNjA7IC8vIDI0IGhvdXJzIGluIHNlY29uZHNcblxuICAgICAgICAvLyBHcm91cCBldmVudHMgYnkgdGltZSBzZWdtZW50cyAoMTUgbWludXRlIHNlZ21lbnRzKVxuICAgICAgICBjb25zdCBzZWdtZW50RHVyYXRpb24gPSAxNSAqIDYwOyAvLyAxNSBtaW51dGVzIGluIHNlY29uZHNcbiAgICAgICAgY29uc3Qgc2VnbWVudHMgPSBNYXRoLmNlaWwodGltZVJhbmdlIC8gc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudERhdGEgPSBuZXcgQXJyYXkoc2VnbWVudHMpLmZpbGwobnVsbCk7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRFdmVudHMgPSBuZXcgQXJyYXkoc2VnbWVudHMpLmZpbGwobnVsbCkubWFwKCgpID0+IFtdKTtcblxuICAgICAgICAvLyBQcm9jZXNzIGV2ZW50cyBhbmQgc3RvcmUgdGhlbSBpbiBzZWdtZW50cyBpZiB3ZSBoYXZlIGFueVxuICAgICAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBldmVudHMuZm9yRWFjaChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnRpbWVzdGFtcCAmJiBldmVudC50aW1lc3RhbXAgPj0gZGF5QWdvKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRJbmRleCA9IE1hdGguZmxvb3IoKGV2ZW50LnRpbWVzdGFtcCAtIGRheUFnbykgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEluZGV4ID49IDAgJiYgc2VnbWVudEluZGV4IDwgc2VnbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGV2ZW50IGluIHNlZ21lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnRFdmVudHNbc2VnbWVudEluZGV4XS5wdXNoKGV2ZW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJpb3JpdGl6ZSB3b3JzZSBzdGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHNlZ21lbnREYXRhW3NlZ21lbnRJbmRleF07XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuZ2V0U3RhdGVDb2xvcihldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRTdGF0ZSB8fCB0aGlzLmdldFN0YXRlUHJpb3JpdHkobmV3U3RhdGUpID4gdGhpcy5nZXRTdGF0ZVByaW9yaXR5KGN1cnJlbnRTdGF0ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdID0gbmV3U3RhdGU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVybWluZSBpbml0aWFsIHN0YXRlIGJhc2VkIG9uIGN1cnJlbnQgcHJvdmlkZXIgc3RhdHVzIG9yIGRlZmF1bHQgdG8gZ3JleVxuICAgICAgICBsZXQgbGFzdEtub3duU3RhdGUgPSAnZ3JleSc7XG4gICAgICAgIGlmIChjdXJyZW50U3RhdHVzKSB7XG4gICAgICAgICAgICAvLyBVc2UgY3VycmVudCBwcm92aWRlciBzdGF0ZSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGlmIChjdXJyZW50U3RhdHVzLnN0YXRlQ29sb3IpIHtcbiAgICAgICAgICAgICAgICBsYXN0S25vd25TdGF0ZSA9IGN1cnJlbnRTdGF0dXMuc3RhdGVDb2xvcjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudFN0YXR1cy5zdGF0ZSkge1xuICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gdGhpcy5nZXRTdGF0ZUNvbG9yKGN1cnJlbnRTdGF0dXMuc3RhdGUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50U3RhdHVzLmRpc2FibGVkID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFByb3ZpZGVyIGlzIGVuYWJsZWQgYnV0IHN0YXRlIHVua25vd24gLSBhc3N1bWUgcmVnaXN0ZXJlZFxuICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gJ2dyZWVuJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzeW50aGV0aWMgY3VycmVudCBzdGF0ZSBldmVudCBmb3IgdG9vbHRpcHMgd2hlbiBubyBldmVudHMgZXhpc3RcbiAgICAgICAgbGV0IGxhc3RLbm93bkV2ZW50ID0gbnVsbDtcbiAgICAgICAgaWYgKGN1cnJlbnRTdGF0dXMgJiYgKCFldmVudHMgfHwgZXZlbnRzLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgIGxhc3RLbm93bkV2ZW50ID0ge1xuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbm93LFxuICAgICAgICAgICAgICAgIHN0YXRlOiBjdXJyZW50U3RhdHVzLnN0YXRlIHx8ICdyZWdpc3RlcmVkJyxcbiAgICAgICAgICAgICAgICBpbmhlcml0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgc3ludGhldGljOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmlsbCBpbiBnYXBzOiBzZWdtZW50cyBhZnRlciBsYXN0IHJlYWwgZXZlbnQgaW5oZXJpdCBpdHMgc3RhdGUsXG4gICAgICAgIC8vIHNlZ21lbnRzIGJlZm9yZSBhbnkgcmVhbCBldmVudCBzdGF5IGdyZXkgKG5vIGNvbmZpcm1lZCBkYXRhKVxuICAgICAgICBsZXQgaGFzUmVhbEV2ZW50ID0gZmFsc2U7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHM7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNlZ21lbnREYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgaGFzUmVhbEV2ZW50ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBsYXN0S25vd25TdGF0ZSA9IHNlZ21lbnREYXRhW2ldO1xuICAgICAgICAgICAgICAgIGlmIChzZWdtZW50RXZlbnRzW2ldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbGFzdEtub3duRXZlbnQgPSBzZWdtZW50RXZlbnRzW2ldW3NlZ21lbnRFdmVudHNbaV0ubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNSZWFsRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBBZnRlciBhIHJlYWwgZXZlbnQg4oCUIGluaGVyaXQgbGFzdCBrbm93biBzdGF0ZVxuICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW2ldID0gbGFzdEtub3duU3RhdGU7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RLbm93bkV2ZW50ICYmIHNlZ21lbnRFdmVudHNbaV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRFdmVudHNbaV0gPSBbey4uLmxhc3RLbm93bkV2ZW50LCBpbmhlcml0ZWQ6IHRydWV9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEJlZm9yZSBhbnkgcmVhbCBldmVudCDigJQgbm8gZGF0YSwgZ3JleVxuICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW2ldID0gJ2dyZXknO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG5cbiAgICAgICAgLy8gSWYgbm8gZXZlbnRzIGluIDI0aCB3aW5kb3cgYnV0IHByb3ZpZGVyIGhhcyBrbm93biBzdGF0ZSwgc2hvdyBpdFxuICAgICAgICBpZiAoIWhhc1JlYWxFdmVudCAmJiBjdXJyZW50U3RhdHVzICYmIGxhc3RLbm93blN0YXRlICE9PSAnZ3JleScpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHM7IGkrKykge1xuICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW2ldID0gbGFzdEtub3duU3RhdGU7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RLbm93bkV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRFdmVudHNbaV0gPSBbey4uLmxhc3RLbm93bkV2ZW50LCBpbmhlcml0ZWQ6IHRydWV9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW5kZXIgc2VnbWVudHNcbiAgICAgICAgY29uc3Qgc2VnbWVudFdpZHRoID0gMTAwIC8gc2VnbWVudHM7XG4gICAgICAgIHNlZ21lbnREYXRhLmZvckVhY2goKGNvbG9yLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSB0aGlzLmdldFNlZ21lbnRUb29sdGlwV2l0aEV2ZW50cyhpbmRleCwgc2VnbWVudER1cmF0aW9uLCBzZWdtZW50RXZlbnRzW2luZGV4XSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0ICRzZWdtZW50ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgICAgIC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICAnd2lkdGgnOiBgJHtzZWdtZW50V2lkdGh9JWAsXG4gICAgICAgICAgICAgICAgICAgICdoZWlnaHQnOiAnMTAwJScsXG4gICAgICAgICAgICAgICAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogdGhpcy5nZXRDb2xvckhleChjb2xvciksXG4gICAgICAgICAgICAgICAgICAgICdib3gtc2l6aW5nJzogJ2JvcmRlci1ib3gnLFxuICAgICAgICAgICAgICAgICAgICAnY3Vyc29yJzogJ3BvaW50ZXInXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1odG1sJywgdG9vbHRpcENvbnRlbnQpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcG9zaXRpb24nLCAndG9wIGNlbnRlcicpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtdmFyaWF0aW9uJywgJ21pbmknKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHRpbWVsaW5lLmFwcGVuZCgkc2VnbWVudCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyB3aXRoIEhUTUwgY29udGVudFxuICAgICAgICAkdGltZWxpbmUuZmluZCgnW2RhdGEtaHRtbF0nKS5wb3B1cCh7XG4gICAgICAgICAgICB2YXJpYXRpb246ICdtaW5pJyxcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIGh0bWw6IHRydWVcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RhdGUgY29sb3IgY2xhc3NcbiAgICAgKi9cbiAgICBnZXRTdGF0ZUNvbG9yKHN0YXRlKSB7XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRTdGF0ZSA9IChzdGF0ZSB8fCAnJykudG9VcHBlckNhc2UoKTtcbiAgICAgICAgc3dpdGNoIChub3JtYWxpemVkU3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1JFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnT0snOlxuICAgICAgICAgICAgY2FzZSAnUkVBQ0hBQkxFJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuJztcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVBQ0hBQkxFJzpcbiAgICAgICAgICAgIGNhc2UgJ0xBR0dFRCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICd5ZWxsb3cnO1xuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAncmVkJztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRlIHByaW9yaXR5IGZvciBjb25mbGljdCByZXNvbHV0aW9uXG4gICAgICovXG4gICAgZ2V0U3RhdGVQcmlvcml0eShjb2xvcikge1xuICAgICAgICBzd2l0Y2ggKGNvbG9yKSB7XG4gICAgICAgICAgICBjYXNlICdyZWQnOiByZXR1cm4gMztcbiAgICAgICAgICAgIGNhc2UgJ3llbGxvdyc6IHJldHVybiAyO1xuICAgICAgICAgICAgY2FzZSAnZ3JlZW4nOiByZXR1cm4gMTtcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgaGV4IGNvbG9yIGNvZGVcbiAgICAgKi9cbiAgICBnZXRDb2xvckhleChjb2xvcikge1xuICAgICAgICBzd2l0Y2ggKGNvbG9yKSB7XG4gICAgICAgICAgICBjYXNlICdncmVlbic6IHJldHVybiAnIzIxYmE0NSc7XG4gICAgICAgICAgICBjYXNlICd5ZWxsb3cnOiByZXR1cm4gJyNmYmJkMDgnO1xuICAgICAgICAgICAgY2FzZSAncmVkJzogcmV0dXJuICcjZGIyODI4JztcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiAnIzc2NzY3Nic7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzZWdtZW50IHRvb2x0aXAgdGV4dFxuICAgICAqL1xuICAgIGdldFNlZ21lbnRUb29sdGlwKHNlZ21lbnRJbmRleCwgc2VnbWVudER1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IGhvdXJzQWdvID0gTWF0aC5mbG9vcigoOTYgLSBzZWdtZW50SW5kZXggLSAxKSAqIHNlZ21lbnREdXJhdGlvbiAvIDM2MDApO1xuICAgICAgICBjb25zdCBtaW51dGVzQWdvID0gTWF0aC5mbG9vcigoKDk2IC0gc2VnbWVudEluZGV4IC0gMSkgKiBzZWdtZW50RHVyYXRpb24gJSAzNjAwKSAvIDYwKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChob3Vyc0FnbyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc0Fnb33RhyAke21pbnV0ZXNBZ2990Lwg0L3QsNC30LDQtGA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc0Fnb33QvCDQvdCw0LfQsNC0YDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHNlZ21lbnQgdG9vbHRpcCB3aXRoIGV2ZW50cyBkZXRhaWxzXG4gICAgICovXG4gICAgZ2V0U2VnbWVudFRvb2x0aXBXaXRoRXZlbnRzKHNlZ21lbnRJbmRleCwgc2VnbWVudER1cmF0aW9uLCBldmVudHMpIHtcbiAgICAgICAgY29uc3Qgc2VnbWVudFN0YXJ0VGltZSA9IChzZWdtZW50SW5kZXggKiBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICBjb25zdCBzZWdtZW50RW5kVGltZSA9ICgoc2VnbWVudEluZGV4ICsgMSkgKiBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxjdWxhdGUgdGltZSByYW5nZSBmb3IgdGhpcyBzZWdtZW50XG4gICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKChkYXlBZ28gKyBzZWdtZW50U3RhcnRUaW1lKSAqIDEwMDApO1xuICAgICAgICBjb25zdCBlbmRUaW1lID0gbmV3IERhdGUoKGRheUFnbyArIHNlZ21lbnRFbmRUaW1lKSAqIDEwMDApO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBzdHlsZT1cInRleHQtYWxpZ246IGxlZnQ7IG1pbi13aWR0aDogMjAwcHg7XCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIFRpbWUgcmFuZ2UgaGVhZGVyXG4gICAgICAgIGh0bWwgKz0gYDxkaXYgc3R5bGU9XCJmb250LXdlaWdodDogYm9sZDsgbWFyZ2luLWJvdHRvbTogNXB4O1wiPmA7XG4gICAgICAgIGh0bWwgKz0gYCR7c3RhcnRUaW1lLnRvTG9jYWxlVGltZVN0cmluZygncnUtUlUnLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pfSAtIGA7XG4gICAgICAgIGh0bWwgKz0gYCR7ZW5kVGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KX1gO1xuICAgICAgICBodG1sICs9IGA8L2Rpdj5gO1xuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRzIGluIHRoaXMgc2VnbWVudFxuICAgICAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IHN0eWxlPVwiYm9yZGVyLXRvcDogMXB4IHNvbGlkICNkZGQ7IG1hcmdpbi10b3A6IDVweDsgcGFkZGluZy10b3A6IDVweDtcIj4nO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTb3J0IGV2ZW50cyBieSB0aW1lc3RhbXAgKG5ld2VzdCBmaXJzdClcbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZEV2ZW50cyA9IFsuLi5ldmVudHNdLnNvcnQoKGEsIGIpID0+IChiLnRpbWVzdGFtcCB8fCAwKSAtIChhLnRpbWVzdGFtcCB8fCAwKSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgdXAgdG8gMyBldmVudHNcbiAgICAgICAgICAgIGNvbnN0IGRpc3BsYXlFdmVudHMgPSBzb3J0ZWRFdmVudHMuc2xpY2UoMCwgMyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGRpc3BsYXlFdmVudHMuZm9yRWFjaChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRUaW1lID0gbmV3IERhdGUoZXZlbnQudGltZXN0YW1wICogMTAwMCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGUgPSBldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUgfHwgJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgIC8vIENhcGl0YWxpemUgZmlyc3QgbGV0dGVyIG9mIHN0YXRlIGZvciB0cmFuc2xhdGlvbiBrZXlcbiAgICAgICAgICAgICAgICBjb25zdCBjYXBpdGFsaXplRmlyc3QgPSAoc3RyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3RyKSByZXR1cm4gc3RyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgc3RyLnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZVRleHQgPSBnbG9iYWxUcmFuc2xhdGVbYHByX1Byb3ZpZGVyU3RhdGUke2NhcGl0YWxpemVGaXJzdChzdGF0ZSl9YF0gfHwgc3RhdGU7XG4gICAgICAgICAgICAgICAgY29uc3QgY29sb3IgPSB0aGlzLmdldENvbG9ySGV4KHRoaXMuZ2V0U3RhdGVDb2xvcihzdGF0ZSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJtYXJnaW46IDNweCAwOyBmb250LXNpemU6IDEycHg7XCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjNjY2O1wiPiR7ZXZlbnRUaW1lLnRvTG9jYWxlVGltZVN0cmluZygncnUtUlUnLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0Jywgc2Vjb25kOiAnMi1kaWdpdCd9KX08L3NwYW4+IGA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtjb2xvcn07IGZvbnQtd2VpZ2h0OiBib2xkO1wiPuKXjyAke3N0YXRlVGV4dH08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgUlRUIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGlmIChldmVudC5ydHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgIDxzcGFuIHN0eWxlPVwiY29sb3I6ICM5OTk7XCI+KCR7ZXZlbnQucnR0fW1zKTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBNYXJrIGluaGVyaXRlZCBzdGF0ZXNcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQuaW5oZXJpdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gJyA8c3BhbiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXN0eWxlOiBpdGFsaWM7XCI+KNC/0YDQvtC00L7Qu9C20LDQtdGC0YHRjyk8L3NwYW4+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc29ydGVkRXZlbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IHN0eWxlPVwiY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMTFweDsgbWFyZ2luLXRvcDogM3B4O1wiPtC4INC10YnQtSAke3NvcnRlZEV2ZW50cy5sZW5ndGggLSAzfSDRgdC+0LHRi9GC0LjQuS4uLjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IHN0eWxlPVwiY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMTJweDsgbWFyZ2luLXRvcDogNXB4O1wiPtCd0LXRgiDRgdC+0LHRi9GC0LjQuSDQsiDRjdGC0L7QvCDQv9C10YDQuNC+0LTQtTwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBkaWFnbm9zdGljcyBkaXNwbGF5IHdpdGggc3RhdHVzIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgdXBkYXRlRGlhZ25vc3RpY3NEaXNwbGF5KHN0YXR1c0luZm8pIHtcbiAgICAgICAgLy8gVXBkYXRlIFJUVFxuICAgICAgICBjb25zdCAkcnR0ID0gJCgnI3Byb3ZpZGVyLXJ0dC12YWx1ZScpO1xuICAgICAgICBjb25zdCAkcnR0Q29udGFpbmVyID0gJHJ0dC5wYXJlbnQoKTtcbiAgICAgICAgaWYgKCRydHQubGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoc3RhdHVzSW5mby5ydHQgIT09IG51bGwgJiYgc3RhdHVzSW5mby5ydHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ0dENvbG9yID0gc3RhdHVzSW5mby5ydHQgPiAyMDAgPyAnI2RiMjgyOCcgOiBzdGF0dXNJbmZvLnJ0dCA+IDEwMCA/ICcjZmJiZDA4JyA6ICcjMjFiYTQ1JztcbiAgICAgICAgICAgICAgICAkcnR0LnRleHQoYCR7c3RhdHVzSW5mby5ydHR9ICR7Z2xvYmFsVHJhbnNsYXRlLnByX01pbGxpc2Vjb25kc31gKTtcbiAgICAgICAgICAgICAgICAkcnR0Q29udGFpbmVyLmNzcygnY29sb3InLCBydHRDb2xvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRydHQudGV4dCgnLS0nKTtcbiAgICAgICAgICAgICAgICAkcnR0Q29udGFpbmVyLmNzcygnY29sb3InLCAnIzc2NzY3NicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGUgZHVyYXRpb24gYW5kIGxhYmVsXG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbiA9ICQoJyNwcm92aWRlci1kdXJhdGlvbi12YWx1ZScpO1xuICAgICAgICBjb25zdCAkc3RhdGVMYWJlbCA9ICQoJyNwcm92aWRlci1zdGF0ZS1sYWJlbCcpO1xuICAgICAgICBjb25zdCAkZHVyYXRpb25Db250YWluZXIgPSAkZHVyYXRpb24ucGFyZW50KCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGR1cmF0aW9uLmxlbmd0aCAmJiBzdGF0dXNJbmZvLnN0YXRlRHVyYXRpb24pIHtcbiAgICAgICAgICAgICRkdXJhdGlvbi50ZXh0KHRoaXMuZm9ybWF0RHVyYXRpb24oc3RhdHVzSW5mby5zdGF0ZUR1cmF0aW9uKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSBsYWJlbCB3aXRoIGFjdHVhbCBzdGF0ZSB0ZXh0IChhbHJlYWR5IHRyYW5zbGF0ZWQgYnkgQVBJKVxuICAgICAgICBpZiAoJHN0YXRlTGFiZWwubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBzdGF0ZVRleHQgPSBzdGF0dXNJbmZvLnN0YXRlVGV4dCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0luZm8uc3RhdGUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ3VycmVudFN0YXRlO1xuICAgICAgICAgICAgJHN0YXRlTGFiZWwudGV4dChzdGF0ZVRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBzdGF0ZSBjb2xvciB0byB0aGUgZHVyYXRpb24gdmFsdWUgYW5kIGxhYmVsXG4gICAgICAgIGlmICgkZHVyYXRpb25Db250YWluZXIubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgY29uc3QgY29sb3JIZXggPSB0aGlzLmdldENvbG9ySGV4KHN0YXR1c0luZm8uc3RhdGVDb2xvcik7XG4gICAgICAgICAgICAkZHVyYXRpb25Db250YWluZXIuY3NzKCdjb2xvcicsIGNvbG9ySGV4KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3MgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdGF0dXNJbmZvLnN0YXRpc3RpY3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gc3RhdHVzSW5mby5zdGF0aXN0aWNzO1xuICAgICAgICAgICAgY29uc3QgJGF2YWlsYWJpbGl0eSA9ICQoJyNwcm92aWRlci1hdmFpbGFiaWxpdHktdmFsdWUnKTtcbiAgICAgICAgICAgIGlmICgkYXZhaWxhYmlsaXR5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRhdmFpbGFiaWxpdHkudGV4dChzdGF0cy5hdmFpbGFiaWxpdHkgPyBgJHtzdGF0cy5hdmFpbGFiaWxpdHl9JWAgOiAnLS0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgJGNoZWNrcyA9ICQoJyNwcm92aWRlci1jaGVja3MtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRjaGVja3MudGV4dChzdGF0cy50b3RhbENoZWNrcyB8fCAnMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFeHBvcnQgaGlzdG9yeSB0byBDU1YgZmlsZVxuICAgICAqL1xuICAgIGV4cG9ydEhpc3RvcnlUb0NTVigpIHtcbiAgICAgICAgY29uc3QgJGJ0biA9ICQoJyNleHBvcnQtaGlzdG9yeS1idG4nKTtcbiAgICAgICAgJGJ0bi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIGRldGFpbHNcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJbmZvID0ge1xuICAgICAgICAgICAgaG9zdDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaG9zdCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJuYW1lJyksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZGVzY3JpcHRpb24nKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRoZSBhcHByb3ByaWF0ZSBBUEkgY2xpZW50IGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3QgYXBpQ2xpZW50ID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdzaXAnID8gU2lwUHJvdmlkZXJzQVBJIDogSWF4UHJvdmlkZXJzQVBJO1xuXG4gICAgICAgIC8vIEZldGNoIGhpc3RvcnkgZGF0YSB1c2luZyB2MyBBUElcbiAgICAgICAgYXBpQ2xpZW50LmdldEhpc3RvcnkodGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmV2ZW50cykge1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRDU1YocmVzcG9uc2UuZGF0YS5ldmVudHMsIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogdGhpcy5wcm92aWRlcklkLFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlclR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLnRvVXBwZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgICAgIC4uLnByb3ZpZGVySW5mb1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wcl9FeHBvcnRGYWlsZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgZXZlbnRzIHRvIENTViBhbmQgdHJpZ2dlciBkb3dubG9hZFxuICAgICAqL1xuICAgIGRvd25sb2FkQ1NWKGV2ZW50cywgcHJvdmlkZXJJbmZvKSB7XG4gICAgICAgIGlmICghZXZlbnRzIHx8IGV2ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKGdsb2JhbFRyYW5zbGF0ZS5wcl9Ob0hpc3RvcnlUb0V4cG9ydCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRlY2huaWNhbCBoZWFkZXJzIHdpdGhvdXQgdHJhbnNsYXRpb25zXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSBbXG4gICAgICAgICAgICAndGltZXN0YW1wJyxcbiAgICAgICAgICAgICdkYXRldGltZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfaWQnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX3R5cGUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9kZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAnZXZlbnQnLFxuICAgICAgICAgICAgJ2V2ZW50X3R5cGUnLFxuICAgICAgICAgICAgJ3ByZXZpb3VzX3N0YXRlJyxcbiAgICAgICAgICAgICduZXdfc3RhdGUnLFxuICAgICAgICAgICAgJ3J0dF9tcycsXG4gICAgICAgICAgICAncGVlcl9zdGF0dXMnLFxuICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcScsXG4gICAgICAgICAgICAncXVhbGlmeV90aW1lJyxcbiAgICAgICAgICAgICdyZWdpc3Rlcl9zdGF0dXMnLFxuICAgICAgICAgICAgJ2NvbnRhY3QnLFxuICAgICAgICAgICAgJ3VzZXJfYWdlbnQnLFxuICAgICAgICAgICAgJ2xhc3RfcmVnaXN0cmF0aW9uJyxcbiAgICAgICAgICAgICdkZXRhaWxzJyxcbiAgICAgICAgICAgICdlcnJvcl9tZXNzYWdlJyxcbiAgICAgICAgICAgICdyYXdfZGF0YSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZXZlbnRzIHRvIENTViByb3dzIHdpdGggYWxsIHRlY2huaWNhbCBkYXRhXG4gICAgICAgIGNvbnN0IHJvd3MgPSBldmVudHMubWFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgYWxsIGF2YWlsYWJsZSBmaWVsZHMgZnJvbSB0aGUgZXZlbnRcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgZXZlbnQudGltZXN0YW1wIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGV0aW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5wcm92aWRlcklkIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5wcm92aWRlclR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnVzZXJuYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5ldmVudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC50eXBlIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZpb3VzU3RhdGUgfHwgZXZlbnQucHJldmlvdXNfc3RhdGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnJ0dCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5wZWVyU3RhdHVzIHx8IGV2ZW50LnBlZXJfc3RhdHVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnF1YWxpZnlGcmVxIHx8IGV2ZW50LnF1YWxpZnlfZnJlcSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5xdWFsaWZ5VGltZSB8fCBldmVudC5xdWFsaWZ5X3RpbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucmVnaXN0ZXJTdGF0dXMgfHwgZXZlbnQucmVnaXN0ZXJfc3RhdHVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmNvbnRhY3QgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQudXNlckFnZW50IHx8IGV2ZW50LnVzZXJfYWdlbnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQubGFzdFJlZ2lzdHJhdGlvbiB8fCBldmVudC5sYXN0X3JlZ2lzdHJhdGlvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5kZXRhaWxzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmVycm9yIHx8IGV2ZW50LmVycm9yTWVzc2FnZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShldmVudCkgLy8gSW5jbHVkZSBjb21wbGV0ZSByYXcgZGF0YVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgQ1NWIGNvbnRlbnQgd2l0aCBCT00gZm9yIHByb3BlciBVVEYtOCBlbmNvZGluZyBpbiBFeGNlbFxuICAgICAgICBjb25zdCBCT00gPSAnXFx1RkVGRic7XG4gICAgICAgIGxldCBjc3ZDb250ZW50ID0gQk9NO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG1ldGFkYXRhIGhlYWRlclxuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIFByb3ZpZGVyIEV4cG9ydDogJHtwcm92aWRlckluZm8ucHJvdmlkZXJJZH0gKCR7cHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZX0pXFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBIb3N0OiAke3Byb3ZpZGVySW5mby5ob3N0fVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgVXNlcm5hbWU6ICR7cHJvdmlkZXJJbmZvLnVzZXJuYW1lfVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgRGVzY3JpcHRpb246ICR7cHJvdmlkZXJJbmZvLmRlc2NyaXB0aW9ufVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgRXhwb3J0IERhdGU6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgVG90YWwgRXZlbnRzOiAke2V2ZW50cy5sZW5ndGh9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSAnXFxuJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2x1bW4gaGVhZGVyc1xuICAgICAgICBjc3ZDb250ZW50ICs9IGhlYWRlcnMuam9pbignLCcpICsgJ1xcbic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGF0YSByb3dzXG4gICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICAgICAgY3N2Q29udGVudCArPSByb3cubWFwKGNlbGwgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEVzY2FwZSBxdW90ZXMgYW5kIHdyYXAgaW4gcXVvdGVzIGlmIGNvbnRhaW5zIGNvbW1hLCBuZXdsaW5lLCBvciBxdW90ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBjZWxsU3RyID0gU3RyaW5nKGNlbGwpO1xuICAgICAgICAgICAgICAgIGlmIChjZWxsU3RyLmluY2x1ZGVzKCcsJykgfHwgY2VsbFN0ci5pbmNsdWRlcygnXFxuJykgfHwgY2VsbFN0ci5pbmNsdWRlcygnXCInKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCcjJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBcIiR7Y2VsbFN0ci5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNlbGxTdHI7XG4gICAgICAgICAgICB9KS5qb2luKCcsJykgKyAnXFxuJztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYmxvYiBhbmQgZG93bmxvYWRcbiAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtjc3ZDb250ZW50XSwgeyB0eXBlOiAndGV4dC9jc3Y7Y2hhcnNldD11dGYtODsnIH0pO1xuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgZmlsZW5hbWUgd2l0aCBwcm92aWRlciBJRCBhbmQgdGltZXN0YW1wXG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5vdy50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywgJy0nKS5zdWJzdHJpbmcoMCwgMTkpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGBwcm92aWRlcl8ke3Byb3ZpZGVySW5mby5wcm92aWRlcklkfV8ke3Byb3ZpZGVySW5mby5wcm92aWRlclR5cGV9XyR7dGltZXN0YW1wfS5jc3ZgO1xuICAgICAgICBcbiAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCB1cmwpO1xuICAgICAgICBsaW5rLnNldEF0dHJpYnV0ZSgnZG93bmxvYWQnLCBmaWxlbmFtZSk7XG4gICAgICAgIGxpbmsuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICAgIGxpbmsuY2xpY2soKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpLCAxMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGR1cmF0aW9uIGluIHNlY29uZHMgdG8gaHVtYW4tcmVhZGFibGUgZm9ybWF0IHdpdGggbG9jYWxpemF0aW9uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBpZiAoIXNlY29uZHMpIHJldHVybiAnLS0nO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDg2NDAwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgODY0MDApIC8gMzYwMCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgMzYwMCkgLyA2MCk7XG4gICAgICAgIGNvbnN0IHNlY3MgPSBzZWNvbmRzICUgNjA7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgbG9jYWxpemVkIHVuaXRzXG4gICAgICAgIGNvbnN0IGRheVVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfRGF5cztcbiAgICAgICAgY29uc3QgaG91clVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfSG91cnM7XG4gICAgICAgIGNvbnN0IG1pbnV0ZVVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfTWludXRlcztcbiAgICAgICAgY29uc3Qgc2Vjb25kVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TZWNvbmRzO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2RheVVuaXR9ICR7aG91cnN9JHtob3VyVW5pdH0gJHttaW51dGVzfSR7bWludXRlVW5pdH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7aG91clVuaXR9ICR7bWludXRlc30ke21pbnV0ZVVuaXR9ICR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHttaW51dGVVbml0fSAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgcmVzb3VyY2VzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hhbmdlVGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY2hhbmdlVGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnBlcmlvZGljSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY0ludGVydmFsKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1cyBpZiBzdWJzY3JpYmVkXG4gICAgICAgIGlmICh0aGlzLmlzU3Vic2NyaWJlZCAmJiB0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgncHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBwcm92aWRlciBzdGF0dXMgd29ya2VyIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcblxuLy8gQ2xlYW4gdXAgb24gcGFnZSB1bmxvYWRcbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmRlc3Ryb3koKTtcbn0pO1xuXG4vLyBFeHBvcnQgZm9yIGV4dGVybmFsIGFjY2Vzc1xud2luZG93LnByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyID0gcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXI7Il19