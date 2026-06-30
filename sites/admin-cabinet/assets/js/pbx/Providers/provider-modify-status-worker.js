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
        // Genuine incident — red, consistent with getStateColor()/the badge (#1085).
        this.$status.removeClass('green yellow grey').addClass('red').html("<i class=\"times icon\"></i> ".concat(globalTranslate.pr_Offline));
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
    }); // Chronologically-last event per segment — used to propagate the *actual*
    // recovered state forward instead of the worst colour of the slot (#1085).

    var segmentLastEvent = new Array(segments).fill(null); // Process events and store them in segments if we have any

    if (events && events.length > 0) {
      // History arrives newest-first (Redis LIFO); sort ascending so the
      // "last event in a segment" is genuinely the latest by time.
      var sortedEvents = events.slice().sort(function (a, b) {
        return (a.timestamp || 0) - (b.timestamp || 0);
      });
      sortedEvents.forEach(function (event) {
        if (event.timestamp && event.timestamp >= dayAgo) {
          var segmentIndex = Math.floor((event.timestamp - dayAgo) / segmentDuration);

          if (segmentIndex >= 0 && segmentIndex < segments) {
            // Store event in segment
            segmentEvents[segmentIndex].push(event);
            segmentLastEvent[segmentIndex] = event; // The slot's own colour keeps "worst wins" so a short blip is
            // not hidden. Prefer the colour already resolved by the backend.

            var currentState = segmentData[segmentIndex];

            var newState = event.stateColor || _this8.getStateColor(event.state || event.new_state);

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
        hasRealEvent = true; // Inherit the *last actual* state by timestamp, not the worst colour
        // of the slot — otherwise one recovered blip paints the whole forward
        // span red until the next change event (#1085).

        if (segmentLastEvent[i]) {
          lastKnownEvent = segmentLastEvent[i];
          lastKnownState = lastKnownEvent.stateColor || this.getStateColor(lastKnownEvent.state || lastKnownEvent.new_state);
        } else {
          lastKnownState = segmentData[i];
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
      // OFF (disabled) and UNMONITORED are neutral, not faults — keep grey to
      // match the backend getStateColor() so badge/list/timeline agree (#1085).

      case 'OFF':
      case 'UNMONITORED':
        return 'grey';

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiRzdGF0dXMiLCJwcm92aWRlclR5cGUiLCJwcm92aWRlcklkIiwiaXNTdWJzY3JpYmVkIiwibGFzdFN0YXR1cyIsImRpYWdub3N0aWNzSW5pdGlhbGl6ZWQiLCJoaXN0b3J5VGFibGUiLCJzdGF0dXNEYXRhIiwiaW5pdGlhbGl6ZSIsIiQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaW5jbHVkZXMiLCJmb3JtIiwiRGVidWdnZXJJbmZvIiwic3Vic2NyaWJlVG9FdmVudEJ1cyIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwic2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uIiwiRXZlbnRCdXMiLCJzdGFydFBlcmlvZGljVXBkYXRlIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImRhdGEiLCJldmVudCIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxldmFudENoYW5nZSIsImZpbmQiLCJjaGFuZ2UiLCJwcm92aWRlcl9pZCIsImlkIiwidXBkYXRlU3RhdHVzRGlzcGxheSIsInN0YXR1c2VzIiwicHJvdmlkZXJTdGF0dXMiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZXJyb3JUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfU3RhdHVzRXJyb3IiLCJodG1sIiwiZGVidWdJbmZvIiwidHlwZSIsInN0YXRlIiwibmV3X3N0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlVGV4dCIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMiLCJ1cGRhdGVTdGF0dXNMZWdhY3kiLCJ1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkiLCJzdGF0ZUljb24iLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdHVzQ29udGVudCIsImRpc3BsYXlUZXh0Iiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsInByX0NoZWNraW5nU3RhdHVzIiwiUHJvdmlkZXJzQVBJIiwiZ2V0U3RhdHVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcl9Ob3RGb3VuZCIsImhhbmRsZVJlcXVlc3RFcnJvciIsImVycm9yIiwicHJfQ29ubmVjdGlvbkVycm9yIiwia2V5RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsIiRmaWVsZCIsImxlbmd0aCIsIm9uIiwiY2xlYXJUaW1lb3V0IiwiY2hhbmdlVGltZW91dCIsInNldFRpbWVvdXQiLCJwZXJpb2RpY0ludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJpbml0aWFsaXplVGltZWxpbmUiLCIkY2hlY2tCdG4iLCJvZmYiLCJhcGlDbGllbnQiLCJTaXBQcm92aWRlcnNBUEkiLCJJYXhQcm92aWRlcnNBUEkiLCJmb3JjZUNoZWNrIiwibG9hZFRpbWVsaW5lRGF0YSIsImV4cG9ydEhpc3RvcnlUb0NTViIsImdldEhpc3RvcnkiLCJldmVudHMiLCJjdXJyZW50U3RhdHVzIiwicHJvdmlkZXIiLCJyZW5kZXJUaW1lbGluZSIsIiR0aW1lbGluZSIsIiRjb250YWluZXIiLCJlbXB0eSIsIm5vdyIsIk1hdGgiLCJmbG9vciIsImRheUFnbyIsInRpbWVSYW5nZSIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwiY2VpbCIsInNlZ21lbnREYXRhIiwiZmlsbCIsInNlZ21lbnRFdmVudHMiLCJtYXAiLCJzZWdtZW50TGFzdEV2ZW50Iiwic29ydGVkRXZlbnRzIiwic2xpY2UiLCJzb3J0IiwiYSIsImIiLCJzZWdtZW50SW5kZXgiLCJwdXNoIiwiY3VycmVudFN0YXRlIiwibmV3U3RhdGUiLCJnZXRTdGF0ZUNvbG9yIiwiZ2V0U3RhdGVQcmlvcml0eSIsImxhc3RLbm93blN0YXRlIiwiZGlzYWJsZWQiLCJsYXN0S25vd25FdmVudCIsImluaGVyaXRlZCIsInN5bnRoZXRpYyIsImhhc1JlYWxFdmVudCIsImkiLCJzZWdtZW50V2lkdGgiLCJjb2xvciIsImluZGV4IiwidG9vbHRpcENvbnRlbnQiLCJnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMiLCIkc2VnbWVudCIsImNzcyIsImdldENvbG9ySGV4IiwiYXR0ciIsImFwcGVuZCIsInBvcHVwIiwidmFyaWF0aW9uIiwiaG92ZXJhYmxlIiwiZ2V0U2VnbWVudFRvb2x0aXAiLCJob3Vyc0FnbyIsIm1pbnV0ZXNBZ28iLCJzZWdtZW50U3RhcnRUaW1lIiwic2VnbWVudEVuZFRpbWUiLCJzdGFydFRpbWUiLCJlbmRUaW1lIiwidG9Mb2NhbGVUaW1lU3RyaW5nIiwiaG91ciIsIm1pbnV0ZSIsImRpc3BsYXlFdmVudHMiLCJldmVudFRpbWUiLCJjYXBpdGFsaXplRmlyc3QiLCJzdHIiLCJjaGFyQXQiLCJ0b0xvd2VyQ2FzZSIsInNlY29uZCIsInJ0dCIsInN0YXR1c0luZm8iLCIkcnR0IiwiJHJ0dENvbnRhaW5lciIsInBhcmVudCIsInVuZGVmaW5lZCIsInJ0dENvbG9yIiwidGV4dCIsInByX01pbGxpc2Vjb25kcyIsIiRkdXJhdGlvbiIsIiRzdGF0ZUxhYmVsIiwiJGR1cmF0aW9uQ29udGFpbmVyIiwic3RhdGVEdXJhdGlvbiIsImZvcm1hdER1cmF0aW9uIiwicHJfQ3VycmVudFN0YXRlIiwiY29sb3JIZXgiLCJzdGF0aXN0aWNzIiwic3RhdHMiLCIkYXZhaWxhYmlsaXR5IiwiYXZhaWxhYmlsaXR5IiwiJGNoZWNrcyIsInRvdGFsQ2hlY2tzIiwiJGJ0biIsInByb3ZpZGVySW5mbyIsImhvc3QiLCJ1c2VybmFtZSIsImRlc2NyaXB0aW9uIiwiZG93bmxvYWRDU1YiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInByX0V4cG9ydEZhaWxlZCIsInNob3dXYXJuaW5nIiwicHJfTm9IaXN0b3J5VG9FeHBvcnQiLCJoZWFkZXJzIiwicm93cyIsImRhdGV0aW1lIiwicHJldmlvdXNTdGF0ZSIsInByZXZpb3VzX3N0YXRlIiwicGVlclN0YXR1cyIsInBlZXJfc3RhdHVzIiwicXVhbGlmeUZyZXEiLCJxdWFsaWZ5X2ZyZXEiLCJxdWFsaWZ5VGltZSIsInF1YWxpZnlfdGltZSIsInJlZ2lzdGVyU3RhdHVzIiwicmVnaXN0ZXJfc3RhdHVzIiwiY29udGFjdCIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJsYXN0UmVnaXN0cmF0aW9uIiwibGFzdF9yZWdpc3RyYXRpb24iLCJkZXRhaWxzIiwiZXJyb3JNZXNzYWdlIiwiSlNPTiIsInN0cmluZ2lmeSIsIkJPTSIsImNzdkNvbnRlbnQiLCJqb2luIiwicm93IiwiY2VsbCIsImNlbGxTdHIiLCJTdHJpbmciLCJyZXBsYWNlIiwiYmxvYiIsIkJsb2IiLCJ1cmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJsaW5rIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3Vic3RyaW5nIiwiZmlsZW5hbWUiLCJzZXRBdHRyaWJ1dGUiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwicmV2b2tlT2JqZWN0VVJMIiwic2Vjb25kcyIsImRheXMiLCJob3VycyIsIm1pbnV0ZXMiLCJzZWNzIiwiZGF5VW5pdCIsInByX0RheXMiLCJob3VyVW5pdCIsInByX0hvdXJzIiwibWludXRlVW5pdCIsInByX01pbnV0ZXMiLCJzZWNvbmRVbml0IiwicHJfU2Vjb25kcyIsImRlc3Ryb3kiLCJjbGVhckludGVydmFsIiwidW5zdWJzY3JpYmUiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtB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Y0FBYixFQUE2QixZQUFNO0FBQy9CckYsRUFBQUEsMEJBQTBCLENBQUN3USxPQUEzQjtBQUNILENBRkQsRSxDQUlBOztBQUNBNVAsTUFBTSxDQUFDWiwwQkFBUCxHQUFvQ0EsMEJBQXBDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBEZWJ1Z2dlckluZm8sIEV2ZW50QnVzLCBnbG9iYWxSb290VXJsLCBQcm92aWRlcnNBUEksIFNpcFByb3ZpZGVyc0FQSSwgSWF4UHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogUHJvdmlkZXIgU3RhdHVzIFdvcmtlciBmb3IgTW9kaWZ5IFBhZ2VcbiAqIEhhbmRsZXMgcmVhbC10aW1lIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzIHZpYSBFdmVudEJ1cyBmb3IgaW5kaXZpZHVhbCBwcm92aWRlciBlZGl0IHBhZ2VzXG4gKiBSZXBsYWNlcyB0aGUgb2xkIHBvbGxpbmctYmFzZWQgYXBwcm9hY2ggd2l0aCBlZmZpY2llbnQgRXZlbnRCdXMgc3Vic2NyaXB0aW9uXG4gKlxuICogQG1vZHVsZSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlclxuICovXG5jb25zdCBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN0YXR1cyBsYWJlbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdGF0dXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBQcm92aWRlciB0eXBlIGRldGVybWluZWQgZnJvbSB0aGUgcGFnZSBVUkxcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHByb3ZpZGVyVHlwZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudCBwcm92aWRlciBpZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcHJvdmlkZXJJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRXZlbnRCdXMgc3Vic2NyaXB0aW9uIHN0YXR1c1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzU3Vic2NyaWJlZDogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogTGFzdCBrbm93biBwcm92aWRlciBzdGF0dXNcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGxhc3RTdGF0dXM6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRGlhZ25vc3RpY3MgdGFiIGluaXRpYWxpemVkIGZsYWdcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBkaWFnbm9zdGljc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaXN0b3J5IERhdGFUYWJsZSBpbnN0YW5jZVxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgaGlzdG9yeVRhYmxlOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgc3RhdHVzIGRhdGEgZm9yIGRpYWdub3N0aWNzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBzdGF0dXNEYXRhOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgc3RhdHVzIHdvcmtlciB3aXRoIEV2ZW50QnVzIHN1YnNjcmlwdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLiRmb3JtT2JqID0gJCgnI3NhdmUtcHJvdmlkZXItZm9ybScpO1xuICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci4kc3RhdHVzID0gJCgnI3N0YXR1cycpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBwcm92aWRlciB0eXBlIGFuZCB1bmlxaWRcbiAgICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnbW9kaWZ5c2lwJykpIHtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gJ3NpcCc7XG4gICAgICAgIH0gZWxzZSBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCdtb2RpZnlpYXgnKSkge1xuICAgICAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSAnaWF4JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIGlkIGZyb20gZm9ybVxuICAgICAgICB0aGlzLnByb3ZpZGVySWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICBpZiAoIXRoaXMucHJvdmlkZXJJZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnZ2VyIGluZm9cbiAgICAgICAgaWYgKHR5cGVvZiBEZWJ1Z2dlckluZm8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudEJ1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1c1xuICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHJlZnJlc2ggc3RhdHVzXG4gICAgICAgIHRoaXMuc2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudEJ1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1VwZGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZSBmb3IgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGV2ZW50IGFuZCBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c191cGRhdGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfZXJyb3InOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBvdGhlciBldmVudHNcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgc3RhdHVzIGNoYW5nZSBmb3Igb3VyIHNwZWNpZmljIHByb3ZpZGVyXG4gICAgICAgIGNvbnN0IHJlbGV2YW50Q2hhbmdlID0gZGF0YS5jaGFuZ2VzLmZpbmQoY2hhbmdlID0+IFxuICAgICAgICAgICAgY2hhbmdlLnByb3ZpZGVyX2lkID09PSB0aGlzLnByb3ZpZGVySWQgfHwgY2hhbmdlLmlkID09PSB0aGlzLnByb3ZpZGVySWRcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZWxldmFudENoYW5nZSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlbGV2YW50Q2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBvdXIgcHJvdmlkZXIgaW4gdGhlIHN0YXR1cyBkYXRhXG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU3RhdHVzID0gZGF0YS5zdGF0dXNlc1t0aGlzLnByb3ZpZGVyVHlwZV0/Llt0aGlzLnByb3ZpZGVySWRdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnN0YXR1c2VzW3RoaXMucHJvdmlkZXJJZF07XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJTdGF0dXMpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShwcm92aWRlclN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdGF0dXMgZXJyb3JcbiAgICAgKi9cbiAgICBoYW5kbGVTdGF0dXNFcnJvcihkYXRhKSB7XG4gICAgICAgIC8vIFNob3cgZXJyb3Igc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICBjb25zdCBlcnJvclRleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRXJyb3I7XG4gICAgICAgIHRoaXMuJHN0YXR1cy5odG1sKGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+ICR7ZXJyb3JUZXh0fWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHN0YXR1cyBkaXNwbGF5IHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgcHJvcGVydGllcyBvciBmYWxsYmFja1xuICAgICAqL1xuICAgIHVwZGF0ZVN0YXR1c0Rpc3BsYXkoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgbGFzdCBzdGF0dXMgZm9yIGRlYnVnZ2luZ1xuICAgICAgICB0aGlzLmxhc3RTdGF0dXMgPSBzdGF0dXNEYXRhO1xuICAgICAgICBcbiAgICAgICAgLy8gU2F2ZSBzdGF0dXMgZGF0YSBmb3IgZGlhZ25vc3RpY3NcbiAgICAgICAgdGhpcy5zdGF0dXNEYXRhID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBEZWJ1Z2dlckluZm8gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRGVidWdnZXJJbmZvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgY29uc3QgZGVidWdJbmZvID0ge1xuICAgICAgICAgICAgICAgIGlkOiB0aGlzLnByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgdHlwZTogdGhpcy5wcm92aWRlclR5cGUsXG4gICAgICAgICAgICAgICAgc3RhdGU6IHN0YXR1c0RhdGEuc3RhdGUgfHwgc3RhdHVzRGF0YS5uZXdfc3RhdGUsXG4gICAgICAgICAgICAgICAgc3RhdGVDb2xvcjogc3RhdHVzRGF0YS5zdGF0ZUNvbG9yLFxuICAgICAgICAgICAgICAgIHN0YXRlVGV4dDogc3RhdHVzRGF0YS5zdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGh0bWxUYWJsZSA9IGBcbiAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5Qcm92aWRlcjwvdGQ+PHRkPiR7ZGVidWdJbmZvLmlkfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5UeXBlPC90ZD48dGQ+JHtkZWJ1Z0luZm8udHlwZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+U3RhdGU8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+Q29sb3I8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZUNvbG9yfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5VcGRhdGVkPC90ZD48dGQ+JHtkZWJ1Z0luZm8udGltZXN0YW1wfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc3RhdGVDb2xvciAmJiBzdGF0dXNEYXRhLnN0YXRlVGV4dCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsZWdhY3kgc3RhdGUtYmFzZWQgdXBkYXRlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xlZ2FjeShzdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgaWYgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBjb25zdCB7IHN0YXRlQ29sb3IsIHN0YXRlSWNvbiwgc3RhdGVUZXh0LCBzdGF0ZURlc2NyaXB0aW9uLCBzdGF0ZSB9ID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGNvbG9yIGNsYXNzXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3Moc3RhdGVDb2xvcik7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzdGF0dXMgY29udGVudCB3aXRoIGljb24gYW5kIHRyYW5zbGF0ZWQgdGV4dFxuICAgICAgICBsZXQgc3RhdHVzQ29udGVudCA9ICcnO1xuICAgICAgICBpZiAoc3RhdGVJY29uKSB7XG4gICAgICAgICAgICBzdGF0dXNDb250ZW50ICs9IGA8aSBjbGFzcz1cIiR7c3RhdGVJY29ufSBpY29uXCI+PC9pPiBgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdGF0ZSB0ZXh0IGlzIGFscmVhZHkgdHJhbnNsYXRlZCBieSBBUEksIHVzZSBpdCBkaXJlY3RseVxuICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IHN0YXRlVGV4dCB8fCBzdGF0ZSB8fCAnVW5rbm93bic7XG4gICAgICAgIHN0YXR1c0NvbnRlbnQgKz0gZGlzcGxheVRleHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChzdGF0dXNDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGVnYWN5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlIHx8ICcnO1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSBzdGF0ZS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBiYXNlZCBvbiBzdGF0ZVxuICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cImNoZWNrbWFyayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PbmxpbmV9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIGdyZXkgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCd5ZWxsb3cnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9XaXRob3V0UmVnaXN0cmF0aW9ufWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwibWludXMgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZX1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgIC8vIEdlbnVpbmUgaW5jaWRlbnQg4oCUIHJlZCwgY29uc2lzdGVudCB3aXRoIGdldFN0YXRlQ29sb3IoKS90aGUgYmFkZ2UgKCMxMDg1KS5cbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygncmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwidGltZXMgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZX1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInF1ZXN0aW9uIGljb25cIj48L2k+ICR7c3RhdGUgfHwgJ1Vua25vd24nfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgc3RhdHVzIGZvciB0aGUgcHJvdmlkZXJcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdsb2FkaW5nJylcbiAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja2luZ1N0YXR1c31gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIGZvciB0aGlzIHNwZWNpZmljIHByb3ZpZGVyIHZpYSBSRVNUIEFQSSB2M1xuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzKHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGRpc3BsYXkgd2l0aCB0aGUgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgbm90IGZvdW5kIG9yIGVycm9yXG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInF1ZXN0aW9uIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX05vdEZvdW5kfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVJlcXVlc3RFcnJvcignSW52YWxpZCByZXNwb25zZSBmb3JtYXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVxdWVzdCBlcnJvcnNcbiAgICAgKi9cbiAgICBoYW5kbGVSZXF1ZXN0RXJyb3IoZXJyb3IpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZ3JlZW4geWVsbG93IGdyZXknKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyZWQnKVxuICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfQ29ubmVjdGlvbkVycm9yfWApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHJlZnJlc2ggc3RhdHVzIHdoZW4gcHJvdmlkZXIgc2V0dGluZ3MgY2hhbmdlXG4gICAgICovXG4gICAgc2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uKCkge1xuICAgICAgICAvLyBNb25pdG9yIGtleSBmaWVsZHMgdGhhdCBtaWdodCBhZmZlY3QgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgIGNvbnN0IGtleUZpZWxkcyA9IFsnaG9zdCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAnZGlzYWJsZWQnXTtcbiAgICAgICAgXG4gICAgICAgIGtleUZpZWxkcy5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZmllbGQgPSB0aGlzLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRmaWVsZC5vbignY2hhbmdlIGJsdXInLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlYm91bmNlIHN0YXR1cyByZXF1ZXN0c1xuICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5jaGFuZ2VUaW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wcm92aWRlcklkKSB7IC8vIE9ubHkgcmVxdWVzdCBpZiB3ZSBoYXZlIGEgdmFsaWQgcHJvdmlkZXIgSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIHBlcmlvZGljIHVwZGF0ZSBmb3Igd2hlbiBFdmVudEJ1cyBpcyBub3QgYXZhaWxhYmxlXG4gICAgICovXG4gICAgc3RhcnRQZXJpb2RpY1VwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5wZXJpb2RpY0ludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICB9LCA1MDAwKTsgLy8gQ2hlY2sgZXZlcnkgNSBzZWNvbmRzIGFzIGZhbGxiYWNrXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCkge1xuICAgICAgICBpZiAodGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZWxpbmVcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGltZWxpbmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcmNlIGNoZWNrIGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgIGNvbnN0ICRjaGVja0J0biA9ICQoJyNjaGVjay1ub3ctYnRuJyk7XG4gICAgICAgICRjaGVja0J0bi5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgJGNoZWNrQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgICAgICBjb25zdCBhcGlDbGllbnQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgZm9yY2VDaGVjayB1c2luZyB2MyBBUElcbiAgICAgICAgICAgIGFwaUNsaWVudC5mb3JjZUNoZWNrKHRoaXMucHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGNoZWNrQnRuLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGltZWxpbmVEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXhwb3J0IGhpc3RvcnkgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgJCgnI2V4cG9ydC1oaXN0b3J5LWJ0bicpLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmV4cG9ydEhpc3RvcnlUb0NTVigpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERpc3BsYXkgY3VycmVudCBzdGF0dXMgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0aGlzLnN0YXR1c0RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRGlhZ25vc3RpY3NEaXNwbGF5KHRoaXMuc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVsaW5lIHZpc3VhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGltZWxpbmUoKSB7XG4gICAgICAgIC8vIExvYWQgdGltZWxpbmUgZGF0YVxuICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgdGltZWxpbmUgZGF0YSBmcm9tIGhpc3RvcnlcbiAgICAgKi9cbiAgICBsb2FkVGltZWxpbmVEYXRhKCkge1xuICAgICAgICAvLyBVc2UgdGhlIGFwcHJvcHJpYXRlIEFQSSBjbGllbnQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBjb25zdCBhcGlDbGllbnQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG5cbiAgICAgICAgLy8gQ2FsbCBnZXRIaXN0b3J5IHVzaW5nIHYzIEFQSVxuICAgICAgICBhcGlDbGllbnQuZ2V0SGlzdG9yeSh0aGlzLnByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUGFzcyBib3RoIGV2ZW50cyBhbmQgY3VycmVudCBwcm92aWRlciBzdGF0dXMgdG8gdGltZWxpbmVcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudHMgPSByZXNwb25zZS5kYXRhLmV2ZW50cyB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50U3RhdHVzID0gcmVzcG9uc2UuZGF0YS5wcm92aWRlciB8fCB0aGlzLnN0YXR1c0RhdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJUaW1lbGluZShldmVudHMsIGN1cnJlbnRTdGF0dXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3RpbWVsaW5lLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIHJlbmRlclRpbWVsaW5lKGV2ZW50cywgY3VycmVudFN0YXR1cyA9IG51bGwpIHtcbiAgICAgICAgY29uc3QgJHRpbWVsaW5lID0gJCgnI3Byb3ZpZGVyLXRpbWVsaW5lJyk7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjcHJvdmlkZXItdGltZWxpbmUtY29udGFpbmVyJyk7XG5cbiAgICAgICAgaWYgKCEkdGltZWxpbmUubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lbGluZVxuICAgICAgICAkdGltZWxpbmUuZW1wdHkoKTtcblxuICAgICAgICAvLyBHZXQgdGltZSByYW5nZSAobGFzdCAyNCBob3VycylcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuICAgICAgICBjb25zdCB0aW1lUmFuZ2UgPSAyNCAqIDYwICogNjA7IC8vIDI0IGhvdXJzIGluIHNlY29uZHNcblxuICAgICAgICAvLyBHcm91cCBldmVudHMgYnkgdGltZSBzZWdtZW50cyAoMTUgbWludXRlIHNlZ21lbnRzKVxuICAgICAgICBjb25zdCBzZWdtZW50RHVyYXRpb24gPSAxNSAqIDYwOyAvLyAxNSBtaW51dGVzIGluIHNlY29uZHNcbiAgICAgICAgY29uc3Qgc2VnbWVudHMgPSBNYXRoLmNlaWwodGltZVJhbmdlIC8gc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudERhdGEgPSBuZXcgQXJyYXkoc2VnbWVudHMpLmZpbGwobnVsbCk7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRFdmVudHMgPSBuZXcgQXJyYXkoc2VnbWVudHMpLmZpbGwobnVsbCkubWFwKCgpID0+IFtdKTtcbiAgICAgICAgLy8gQ2hyb25vbG9naWNhbGx5LWxhc3QgZXZlbnQgcGVyIHNlZ21lbnQg4oCUIHVzZWQgdG8gcHJvcGFnYXRlIHRoZSAqYWN0dWFsKlxuICAgICAgICAvLyByZWNvdmVyZWQgc3RhdGUgZm9yd2FyZCBpbnN0ZWFkIG9mIHRoZSB3b3JzdCBjb2xvdXIgb2YgdGhlIHNsb3QgKCMxMDg1KS5cbiAgICAgICAgY29uc3Qgc2VnbWVudExhc3RFdmVudCA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKTtcblxuICAgICAgICAvLyBQcm9jZXNzIGV2ZW50cyBhbmQgc3RvcmUgdGhlbSBpbiBzZWdtZW50cyBpZiB3ZSBoYXZlIGFueVxuICAgICAgICBpZiAoZXZlbnRzICYmIGV2ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBIaXN0b3J5IGFycml2ZXMgbmV3ZXN0LWZpcnN0IChSZWRpcyBMSUZPKTsgc29ydCBhc2NlbmRpbmcgc28gdGhlXG4gICAgICAgICAgICAvLyBcImxhc3QgZXZlbnQgaW4gYSBzZWdtZW50XCIgaXMgZ2VudWluZWx5IHRoZSBsYXRlc3QgYnkgdGltZS5cbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZEV2ZW50cyA9IGV2ZW50cy5zbGljZSgpLnNvcnQoKGEsIGIpID0+IChhLnRpbWVzdGFtcCB8fCAwKSAtIChiLnRpbWVzdGFtcCB8fCAwKSk7XG4gICAgICAgICAgICBzb3J0ZWRFdmVudHMuZm9yRWFjaChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnRpbWVzdGFtcCAmJiBldmVudC50aW1lc3RhbXAgPj0gZGF5QWdvKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRJbmRleCA9IE1hdGguZmxvb3IoKGV2ZW50LnRpbWVzdGFtcCAtIGRheUFnbykgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEluZGV4ID49IDAgJiYgc2VnbWVudEluZGV4IDwgc2VnbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGV2ZW50IGluIHNlZ21lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnRFdmVudHNbc2VnbWVudEluZGV4XS5wdXNoKGV2ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnRMYXN0RXZlbnRbc2VnbWVudEluZGV4XSA9IGV2ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgc2xvdCdzIG93biBjb2xvdXIga2VlcHMgXCJ3b3JzdCB3aW5zXCIgc28gYSBzaG9ydCBibGlwIGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBub3QgaGlkZGVuLiBQcmVmZXIgdGhlIGNvbG91ciBhbHJlYWR5IHJlc29sdmVkIGJ5IHRoZSBiYWNrZW5kLlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gc2VnbWVudERhdGFbc2VnbWVudEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1N0YXRlID0gZXZlbnQuc3RhdGVDb2xvciB8fCB0aGlzLmdldFN0YXRlQ29sb3IoZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50U3RhdGUgfHwgdGhpcy5nZXRTdGF0ZVByaW9yaXR5KG5ld1N0YXRlKSA+IHRoaXMuZ2V0U3RhdGVQcmlvcml0eShjdXJyZW50U3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudERhdGFbc2VnbWVudEluZGV4XSA9IG5ld1N0YXRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRlcm1pbmUgaW5pdGlhbCBzdGF0ZSBiYXNlZCBvbiBjdXJyZW50IHByb3ZpZGVyIHN0YXR1cyBvciBkZWZhdWx0IHRvIGdyZXlcbiAgICAgICAgbGV0IGxhc3RLbm93blN0YXRlID0gJ2dyZXknO1xuICAgICAgICBpZiAoY3VycmVudFN0YXR1cykge1xuICAgICAgICAgICAgLy8gVXNlIGN1cnJlbnQgcHJvdmlkZXIgc3RhdGUgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAoY3VycmVudFN0YXR1cy5zdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSBjdXJyZW50U3RhdHVzLnN0YXRlQ29sb3I7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRTdGF0dXMuc3RhdGUpIHtcbiAgICAgICAgICAgICAgICBsYXN0S25vd25TdGF0ZSA9IHRoaXMuZ2V0U3RhdGVDb2xvcihjdXJyZW50U3RhdHVzLnN0YXRlKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY3VycmVudFN0YXR1cy5kaXNhYmxlZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBpcyBlbmFibGVkIGJ1dCBzdGF0ZSB1bmtub3duIC0gYXNzdW1lIHJlZ2lzdGVyZWRcbiAgICAgICAgICAgICAgICBsYXN0S25vd25TdGF0ZSA9ICdncmVlbic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgc3ludGhldGljIGN1cnJlbnQgc3RhdGUgZXZlbnQgZm9yIHRvb2x0aXBzIHdoZW4gbm8gZXZlbnRzIGV4aXN0XG4gICAgICAgIGxldCBsYXN0S25vd25FdmVudCA9IG51bGw7XG4gICAgICAgIGlmIChjdXJyZW50U3RhdHVzICYmICghZXZlbnRzIHx8IGV2ZW50cy5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICBsYXN0S25vd25FdmVudCA9IHtcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5vdyxcbiAgICAgICAgICAgICAgICBzdGF0ZTogY3VycmVudFN0YXR1cy5zdGF0ZSB8fCAncmVnaXN0ZXJlZCcsXG4gICAgICAgICAgICAgICAgaW5oZXJpdGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgIHN5bnRoZXRpYzogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbGwgaW4gZ2Fwczogc2VnbWVudHMgYWZ0ZXIgbGFzdCByZWFsIGV2ZW50IGluaGVyaXQgaXRzIHN0YXRlLFxuICAgICAgICAvLyBzZWdtZW50cyBiZWZvcmUgYW55IHJlYWwgZXZlbnQgc3RheSBncmV5IChubyBjb25maXJtZWQgZGF0YSlcbiAgICAgICAgbGV0IGhhc1JlYWxFdmVudCA9IGZhbHNlO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlZ21lbnRzOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzZWdtZW50RGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGhhc1JlYWxFdmVudCA9IHRydWU7XG4gICAgICAgICAgICAgICAgLy8gSW5oZXJpdCB0aGUgKmxhc3QgYWN0dWFsKiBzdGF0ZSBieSB0aW1lc3RhbXAsIG5vdCB0aGUgd29yc3QgY29sb3VyXG4gICAgICAgICAgICAgICAgLy8gb2YgdGhlIHNsb3Qg4oCUIG90aGVyd2lzZSBvbmUgcmVjb3ZlcmVkIGJsaXAgcGFpbnRzIHRoZSB3aG9sZSBmb3J3YXJkXG4gICAgICAgICAgICAgICAgLy8gc3BhbiByZWQgdW50aWwgdGhlIG5leHQgY2hhbmdlIGV2ZW50ICgjMTA4NSkuXG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnRMYXN0RXZlbnRbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgbGFzdEtub3duRXZlbnQgPSBzZWdtZW50TGFzdEV2ZW50W2ldO1xuICAgICAgICAgICAgICAgICAgICBsYXN0S25vd25TdGF0ZSA9IGxhc3RLbm93bkV2ZW50LnN0YXRlQ29sb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIHx8IHRoaXMuZ2V0U3RhdGVDb2xvcihsYXN0S25vd25FdmVudC5zdGF0ZSB8fCBsYXN0S25vd25FdmVudC5uZXdfc3RhdGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gc2VnbWVudERhdGFbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChoYXNSZWFsRXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBBZnRlciBhIHJlYWwgZXZlbnQg4oCUIGluaGVyaXQgbGFzdCBrbm93biBzdGF0ZVxuICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW2ldID0gbGFzdEtub3duU3RhdGU7XG4gICAgICAgICAgICAgICAgaWYgKGxhc3RLbm93bkV2ZW50ICYmIHNlZ21lbnRFdmVudHNbaV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRFdmVudHNbaV0gPSBbey4uLmxhc3RLbm93bkV2ZW50LCBpbmhlcml0ZWQ6IHRydWV9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEJlZm9yZSBhbnkgcmVhbCBldmVudCDigJQgbm8gZGF0YSwgZ3JleVxuICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW2ldID0gJ2dyZXknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuXG4gICAgICAgIC8vIElmIG5vIGV2ZW50cyBpbiAyNGggd2luZG93IGJ1dCBwcm92aWRlciBoYXMga25vd24gc3RhdGUsIHNob3cgaXRcbiAgICAgICAgaWYgKCFoYXNSZWFsRXZlbnQgJiYgY3VycmVudFN0YXR1cyAmJiBsYXN0S25vd25TdGF0ZSAhPT0gJ2dyZXknKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlZ21lbnRzOyBpKyspIHtcbiAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtpXSA9IGxhc3RLbm93blN0YXRlO1xuICAgICAgICAgICAgICAgIGlmIChsYXN0S25vd25FdmVudCkge1xuICAgICAgICAgICAgICAgICAgICBzZWdtZW50RXZlbnRzW2ldID0gW3suLi5sYXN0S25vd25FdmVudCwgaW5oZXJpdGVkOiB0cnVlfV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVuZGVyIHNlZ21lbnRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRXaWR0aCA9IDEwMCAvIHNlZ21lbnRzO1xuICAgICAgICBzZWdtZW50RGF0YS5mb3JFYWNoKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gdGhpcy5nZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoaW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgc2VnbWVudEV2ZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoJzogYCR7c2VnbWVudFdpZHRofSVgLFxuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0JzogJzEwMCUnLFxuICAgICAgICAgICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IHRoaXMuZ2V0Q29sb3JIZXgoY29sb3IpLFxuICAgICAgICAgICAgICAgICAgICAnYm94LXNpemluZyc6ICdib3JkZXItYm94JyxcbiAgICAgICAgICAgICAgICAgICAgJ2N1cnNvcic6ICdwb2ludGVyJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaHRtbCcsIHRvb2x0aXBDb250ZW50KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXZhcmlhdGlvbicsICdtaW5pJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0aW1lbGluZS5hcHBlbmQoJHNlZ21lbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgd2l0aCBIVE1MIGNvbnRlbnRcbiAgICAgICAgJHRpbWVsaW5lLmZpbmQoJ1tkYXRhLWh0bWxdJykucG9wdXAoe1xuICAgICAgICAgICAgdmFyaWF0aW9uOiAnbWluaScsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBodG1sOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRlIGNvbG9yIGNsYXNzXG4gICAgICovXG4gICAgZ2V0U3RhdGVDb2xvcihzdGF0ZSkge1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSAoc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAneWVsbG93JztcbiAgICAgICAgICAgIC8vIE9GRiAoZGlzYWJsZWQpIGFuZCBVTk1PTklUT1JFRCBhcmUgbmV1dHJhbCwgbm90IGZhdWx0cyDigJQga2VlcCBncmV5IHRvXG4gICAgICAgICAgICAvLyBtYXRjaCB0aGUgYmFja2VuZCBnZXRTdGF0ZUNvbG9yKCkgc28gYmFkZ2UvbGlzdC90aW1lbGluZSBhZ3JlZSAoIzEwODUpLlxuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgY2FzZSAnUkVKRUNURUQnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ0ZBSUxFRCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQnO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RhdGUgcHJpb3JpdHkgZm9yIGNvbmZsaWN0IHJlc29sdXRpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0ZVByaW9yaXR5KGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlZCc6IHJldHVybiAzO1xuICAgICAgICAgICAgY2FzZSAneWVsbG93JzogcmV0dXJuIDI7XG4gICAgICAgICAgICBjYXNlICdncmVlbic6IHJldHVybiAxO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBoZXggY29sb3IgY29kZVxuICAgICAqL1xuICAgIGdldENvbG9ySGV4KGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ2dyZWVuJzogcmV0dXJuICcjMjFiYTQ1JztcbiAgICAgICAgICAgIGNhc2UgJ3llbGxvdyc6IHJldHVybiAnI2ZiYmQwOCc7XG4gICAgICAgICAgICBjYXNlICdyZWQnOiByZXR1cm4gJyNkYjI4MjgnO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuICcjNzY3Njc2JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHNlZ21lbnQgdG9vbHRpcCB0ZXh0XG4gICAgICovXG4gICAgZ2V0U2VnbWVudFRvb2x0aXAoc2VnbWVudEluZGV4LCBzZWdtZW50RHVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgaG91cnNBZ28gPSBNYXRoLmZsb29yKCg5NiAtIHNlZ21lbnRJbmRleCAtIDEpICogc2VnbWVudER1cmF0aW9uIC8gMzYwMCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXNBZ28gPSBNYXRoLmZsb29yKCgoOTYgLSBzZWdtZW50SW5kZXggLSAxKSAqIHNlZ21lbnREdXJhdGlvbiAlIDM2MDApIC8gNjApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhvdXJzQWdvID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzQWdvfdGHICR7bWludXRlc0Fnb33QvCDQvdCw0LfQsNC0YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzQWdvfdC8INC90LDQt9Cw0LRgO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc2VnbWVudCB0b29sdGlwIHdpdGggZXZlbnRzIGRldGFpbHNcbiAgICAgKi9cbiAgICBnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoc2VnbWVudEluZGV4LCBzZWdtZW50RHVyYXRpb24sIGV2ZW50cykge1xuICAgICAgICBjb25zdCBzZWdtZW50U3RhcnRUaW1lID0gKHNlZ21lbnRJbmRleCAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRFbmRUaW1lID0gKChzZWdtZW50SW5kZXggKyAxKSAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkYXlBZ28gPSBub3cgLSAoMjQgKiA2MCAqIDYwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIHJhbmdlIGZvciB0aGlzIHNlZ21lbnRcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKGRheUFnbyArIHNlZ21lbnRTdGFydFRpbWUpICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXcgRGF0ZSgoZGF5QWdvICsgc2VnbWVudEVuZFRpbWUpICogMTAwMCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogbGVmdDsgbWluLXdpZHRoOiAyMDBweDtcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gVGltZSByYW5nZSBoZWFkZXJcbiAgICAgICAgaHRtbCArPSBgPGRpdiBzdHlsZT1cImZvbnQtd2VpZ2h0OiBib2xkOyBtYXJnaW4tYm90dG9tOiA1cHg7XCI+YDtcbiAgICAgICAgaHRtbCArPSBgJHtzdGFydFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSl9IC0gYDtcbiAgICAgICAgaHRtbCArPSBgJHtlbmRUaW1lLnRvTG9jYWxlVGltZVN0cmluZygncnUtUlUnLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pfWA7XG4gICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudHMgaW4gdGhpcyBzZWdtZW50XG4gICAgICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJib3JkZXItdG9wOiAxcHggc29saWQgI2RkZDsgbWFyZ2luLXRvcDogNXB4OyBwYWRkaW5nLXRvcDogNXB4O1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvcnQgZXZlbnRzIGJ5IHRpbWVzdGFtcCAobmV3ZXN0IGZpcnN0KVxuICAgICAgICAgICAgY29uc3Qgc29ydGVkRXZlbnRzID0gWy4uLmV2ZW50c10uc29ydCgoYSwgYikgPT4gKGIudGltZXN0YW1wIHx8IDApIC0gKGEudGltZXN0YW1wIHx8IDApKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyB1cCB0byAzIGV2ZW50c1xuICAgICAgICAgICAgY29uc3QgZGlzcGxheUV2ZW50cyA9IHNvcnRlZEV2ZW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGlzcGxheUV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudFRpbWUgPSBuZXcgRGF0ZShldmVudC50aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZSA9IGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSB8fCAndW5rbm93bic7XG4gICAgICAgICAgICAgICAgLy8gQ2FwaXRhbGl6ZSBmaXJzdCBsZXR0ZXIgb2Ygc3RhdGUgZm9yIHRyYW5zbGF0aW9uIGtleVxuICAgICAgICAgICAgICAgIGNvbnN0IGNhcGl0YWxpemVGaXJzdCA9IChzdHIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdHIpIHJldHVybiBzdHI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtgcHJfUHJvdmlkZXJTdGF0ZSR7Y2FwaXRhbGl6ZUZpcnN0KHN0YXRlKX1gXSB8fCBzdGF0ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JIZXgodGhpcy5nZXRTdGF0ZUNvbG9yKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cIm1hcmdpbjogM3B4IDA7IGZvbnQtc2l6ZTogMTJweDtcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICM2NjY7XCI+JHtldmVudFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBzZWNvbmQ6ICcyLWRpZ2l0J30pfTwvc3Bhbj4gYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAke2NvbG9yfTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+4pePICR7c3RhdGVUZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBSVFQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnJ0dCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGAgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzk5OTtcIj4oJHtldmVudC5ydHR9bXMpPC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1hcmsgaW5oZXJpdGVkIHN0YXRlc1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5pbmhlcml0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIHN0eWxlPVwiY29sb3I6ICM5OTk7IGZvbnQtc3R5bGU6IGl0YWxpYztcIj4o0L/RgNC+0LTQvtC70LbQsNC10YLRgdGPKTwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzb3J0ZWRFdmVudHMubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMXB4OyBtYXJnaW4tdG9wOiAzcHg7XCI+0Lgg0LXRidC1ICR7c29ydGVkRXZlbnRzLmxlbmd0aCAtIDN9INGB0L7QsdGL0YLQuNC5Li4uPC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMnB4OyBtYXJnaW4tdG9wOiA1cHg7XCI+0J3QtdGCINGB0L7QsdGL0YLQuNC5INCyINGN0YLQvtC8INC/0LXRgNC40L7QtNC1PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgd2l0aCBzdGF0dXMgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICB1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzSW5mbykge1xuICAgICAgICAvLyBVcGRhdGUgUlRUXG4gICAgICAgIGNvbnN0ICRydHQgPSAkKCcjcHJvdmlkZXItcnR0LXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRydHRDb250YWluZXIgPSAkcnR0LnBhcmVudCgpO1xuICAgICAgICBpZiAoJHJ0dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzdGF0dXNJbmZvLnJ0dCAhPT0gbnVsbCAmJiBzdGF0dXNJbmZvLnJ0dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnR0Q29sb3IgPSBzdGF0dXNJbmZvLnJ0dCA+IDIwMCA/ICcjZGIyODI4JyA6IHN0YXR1c0luZm8ucnR0ID4gMTAwID8gJyNmYmJkMDgnIDogJyMyMWJhNDUnO1xuICAgICAgICAgICAgICAgICRydHQudGV4dChgJHtzdGF0dXNJbmZvLnJ0dH0gJHtnbG9iYWxUcmFuc2xhdGUucHJfTWlsbGlzZWNvbmRzfWApO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsIHJ0dENvbG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KCctLScpO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsICcjNzY3Njc2Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSBkdXJhdGlvbiBhbmQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1cmF0aW9uID0gJCgnI3Byb3ZpZGVyLWR1cmF0aW9uLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRzdGF0ZUxhYmVsID0gJCgnI3Byb3ZpZGVyLXN0YXRlLWxhYmVsJyk7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbkNvbnRhaW5lciA9ICRkdXJhdGlvbi5wYXJlbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHVyYXRpb24ubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgJGR1cmF0aW9uLnRleHQodGhpcy5mb3JtYXREdXJhdGlvbihzdGF0dXNJbmZvLnN0YXRlRHVyYXRpb24pKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlIGxhYmVsIHdpdGggYWN0dWFsIHN0YXRlIHRleHQgKGFscmVhZHkgdHJhbnNsYXRlZCBieSBBUEkpXG4gICAgICAgIGlmICgkc3RhdGVMYWJlbC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRlVGV4dCA9IHN0YXR1c0luZm8uc3RhdGVUZXh0IHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzSW5mby5zdGF0ZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGU7XG4gICAgICAgICAgICAkc3RhdGVMYWJlbC50ZXh0KHN0YXRlVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHN0YXRlIGNvbG9yIHRvIHRoZSBkdXJhdGlvbiB2YWx1ZSBhbmQgbGFiZWxcbiAgICAgICAgaWYgKCRkdXJhdGlvbkNvbnRhaW5lci5sZW5ndGggJiYgc3RhdHVzSW5mby5zdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICBjb25zdCBjb2xvckhleCA9IHRoaXMuZ2V0Q29sb3JIZXgoc3RhdHVzSW5mby5zdGF0ZUNvbG9yKTtcbiAgICAgICAgICAgICRkdXJhdGlvbkNvbnRhaW5lci5jc3MoJ2NvbG9yJywgY29sb3JIZXgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGlzdGljcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0luZm8uc3RhdGlzdGljcykge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBzdGF0dXNJbmZvLnN0YXRpc3RpY3M7XG4gICAgICAgICAgICBjb25zdCAkYXZhaWxhYmlsaXR5ID0gJCgnI3Byb3ZpZGVyLWF2YWlsYWJpbGl0eS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRhdmFpbGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGF2YWlsYWJpbGl0eS50ZXh0KHN0YXRzLmF2YWlsYWJpbGl0eSA/IGAke3N0YXRzLmF2YWlsYWJpbGl0eX0lYCA6ICctLScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tzID0gJCgnI3Byb3ZpZGVyLWNoZWNrcy12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRjaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNoZWNrcy50ZXh0KHN0YXRzLnRvdGFsQ2hlY2tzIHx8ICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4cG9ydCBoaXN0b3J5IHRvIENTViBmaWxlXG4gICAgICovXG4gICAgZXhwb3J0SGlzdG9yeVRvQ1NWKCkge1xuICAgICAgICBjb25zdCAkYnRuID0gJCgnI2V4cG9ydC1oaXN0b3J5LWJ0bicpO1xuICAgICAgICAkYnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgcHJvdmlkZXIgZGV0YWlsc1xuICAgICAgICBjb25zdCBwcm92aWRlckluZm8gPSB7XG4gICAgICAgICAgICBob3N0OiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdob3N0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcm5hbWUnKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdkZXNjcmlwdGlvbicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdGhlIGFwcHJvcHJpYXRlIEFQSSBjbGllbnQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBjb25zdCBhcGlDbGllbnQgPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ3NpcCcgPyBTaXBQcm92aWRlcnNBUEkgOiBJYXhQcm92aWRlcnNBUEk7XG5cbiAgICAgICAgLy8gRmV0Y2ggaGlzdG9yeSBkYXRhIHVzaW5nIHYzIEFQSVxuICAgICAgICBhcGlDbGllbnQuZ2V0SGlzdG9yeSh0aGlzLnByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZENTVihyZXNwb25zZS5kYXRhLmV2ZW50cywge1xuICAgICAgICAgICAgICAgICAgICBwcm92aWRlcklkOiB0aGlzLnByb3ZpZGVySWQsXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogdGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgLi4ucHJvdmlkZXJJbmZvXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnByX0V4cG9ydEZhaWxlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydCBldmVudHMgdG8gQ1NWIGFuZCB0cmlnZ2VyIGRvd25sb2FkXG4gICAgICovXG4gICAgZG93bmxvYWRDU1YoZXZlbnRzLCBwcm92aWRlckluZm8pIHtcbiAgICAgICAgaWYgKCFldmVudHMgfHwgZXZlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoZ2xvYmFsVHJhbnNsYXRlLnByX05vSGlzdG9yeVRvRXhwb3J0KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGVjaG5pY2FsIGhlYWRlcnMgd2l0aG91dCB0cmFuc2xhdGlvbnNcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IFtcbiAgICAgICAgICAgICd0aW1lc3RhbXAnLFxuICAgICAgICAgICAgJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9pZCcsXG4gICAgICAgICAgICAncHJvdmlkZXJfdHlwZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCcsXG4gICAgICAgICAgICAncHJvdmlkZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICdldmVudCcsXG4gICAgICAgICAgICAnZXZlbnRfdHlwZScsXG4gICAgICAgICAgICAncHJldmlvdXNfc3RhdGUnLFxuICAgICAgICAgICAgJ25ld19zdGF0ZScsXG4gICAgICAgICAgICAncnR0X21zJyxcbiAgICAgICAgICAgICdwZWVyX3N0YXR1cycsXG4gICAgICAgICAgICAncXVhbGlmeV9mcmVxJyxcbiAgICAgICAgICAgICdxdWFsaWZ5X3RpbWUnLFxuICAgICAgICAgICAgJ3JlZ2lzdGVyX3N0YXR1cycsXG4gICAgICAgICAgICAnY29udGFjdCcsXG4gICAgICAgICAgICAndXNlcl9hZ2VudCcsXG4gICAgICAgICAgICAnbGFzdF9yZWdpc3RyYXRpb24nLFxuICAgICAgICAgICAgJ2RldGFpbHMnLFxuICAgICAgICAgICAgJ2Vycm9yX21lc3NhZ2UnLFxuICAgICAgICAgICAgJ3Jhd19kYXRhJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBldmVudHMgdG8gQ1NWIHJvd3Mgd2l0aCBhbGwgdGVjaG5pY2FsIGRhdGFcbiAgICAgICAgY29uc3Qgcm93cyA9IGV2ZW50cy5tYXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBhbGwgYXZhaWxhYmxlIGZpZWxkcyBmcm9tIHRoZSBldmVudFxuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBldmVudC50aW1lc3RhbXAgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0ZXRpbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnByb3ZpZGVySWQgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8uaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8udXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmV2ZW50IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmlvdXNTdGF0ZSB8fCBldmVudC5wcmV2aW91c19zdGF0ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucnR0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnBlZXJTdGF0dXMgfHwgZXZlbnQucGVlcl9zdGF0dXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucXVhbGlmeUZyZXEgfHwgZXZlbnQucXVhbGlmeV9mcmVxIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnF1YWxpZnlUaW1lIHx8IGV2ZW50LnF1YWxpZnlfdGltZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5yZWdpc3RlclN0YXR1cyB8fCBldmVudC5yZWdpc3Rlcl9zdGF0dXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuY29udGFjdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC51c2VyQWdlbnQgfHwgZXZlbnQudXNlcl9hZ2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5sYXN0UmVnaXN0cmF0aW9uIHx8IGV2ZW50Lmxhc3RfcmVnaXN0cmF0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmRldGFpbHMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZXJyb3IgfHwgZXZlbnQuZXJyb3JNZXNzYWdlIHx8ICcnLFxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGV2ZW50KSAvLyBJbmNsdWRlIGNvbXBsZXRlIHJhdyBkYXRhXG4gICAgICAgICAgICBdO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBDU1YgY29udGVudCB3aXRoIEJPTSBmb3IgcHJvcGVyIFVURi04IGVuY29kaW5nIGluIEV4Y2VsXG4gICAgICAgIGNvbnN0IEJPTSA9ICdcXHVGRUZGJztcbiAgICAgICAgbGV0IGNzdkNvbnRlbnQgPSBCT007XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbWV0YWRhdGEgaGVhZGVyXG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgUHJvdmlkZXIgRXhwb3J0OiAke3Byb3ZpZGVySW5mby5wcm92aWRlcklkfSAoJHtwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlfSlcXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIEhvc3Q6ICR7cHJvdmlkZXJJbmZvLmhvc3R9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBVc2VybmFtZTogJHtwcm92aWRlckluZm8udXNlcm5hbWV9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBEZXNjcmlwdGlvbjogJHtwcm92aWRlckluZm8uZGVzY3JpcHRpb259XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBFeHBvcnQgRGF0ZTogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBUb3RhbCBFdmVudHM6ICR7ZXZlbnRzLmxlbmd0aH1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9ICdcXG4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvbHVtbiBoZWFkZXJzXG4gICAgICAgIGNzdkNvbnRlbnQgKz0gaGVhZGVycy5qb2luKCcsJykgKyAnXFxuJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkYXRhIHJvd3NcbiAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBjc3ZDb250ZW50ICs9IHJvdy5tYXAoY2VsbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIHF1b3RlcyBhbmQgd3JhcCBpbiBxdW90ZXMgaWYgY29udGFpbnMgY29tbWEsIG5ld2xpbmUsIG9yIHF1b3Rlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGxTdHIgPSBTdHJpbmcoY2VsbCk7XG4gICAgICAgICAgICAgICAgaWYgKGNlbGxTdHIuaW5jbHVkZXMoJywnKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCdcXG4nKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCdcIicpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJyMnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFwiJHtjZWxsU3RyLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2VsbFN0cjtcbiAgICAgICAgICAgIH0pLmpvaW4oJywnKSArICdcXG4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBibG9iIGFuZCBkb3dubG9hZFxuICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2NzdkNvbnRlbnRdLCB7IHR5cGU6ICd0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04OycgfSk7XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBmaWxlbmFtZSB3aXRoIHByb3ZpZGVyIElEIGFuZCB0aW1lc3RhbXBcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbm93LnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCAnLScpLnN1YnN0cmluZygwLCAxOSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYHByb3ZpZGVyXyR7cHJvdmlkZXJJbmZvLnByb3ZpZGVySWR9XyR7cHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZX1fJHt0aW1lc3RhbXB9LmNzdmA7XG4gICAgICAgIFxuICAgICAgICBsaW5rLnNldEF0dHJpYnV0ZSgnaHJlZicsIHVybCk7XG4gICAgICAgIGxpbmsuc2V0QXR0cmlidXRlKCdkb3dubG9hZCcsIGZpbGVuYW1lKTtcbiAgICAgICAgbGluay5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGxpbmspO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXBcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCksIDEwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZHVyYXRpb24gaW4gc2Vjb25kcyB0byBodW1hbi1yZWFkYWJsZSBmb3JtYXQgd2l0aCBsb2NhbGl6YXRpb25cbiAgICAgKi9cbiAgICBmb3JtYXREdXJhdGlvbihzZWNvbmRzKSB7XG4gICAgICAgIGlmICghc2Vjb25kcykgcmV0dXJuICctLSc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gODY0MDApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSA4NjQwMCkgLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICAgICAgY29uc3Qgc2VjcyA9IHNlY29uZHMgJSA2MDtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBsb2NhbGl6ZWQgdW5pdHNcbiAgICAgICAgY29uc3QgZGF5VW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9EYXlzO1xuICAgICAgICBjb25zdCBob3VyVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9Ib3VycztcbiAgICAgICAgY29uc3QgbWludXRlVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9NaW51dGVzO1xuICAgICAgICBjb25zdCBzZWNvbmRVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1NlY29uZHM7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtkYXlzfSR7ZGF5VW5pdH0gJHtob3Vyc30ke2hvdXJVbml0fSAke21pbnV0ZXN9JHttaW51dGVVbml0fWA7XG4gICAgICAgIH0gZWxzZSBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnN9JHtob3VyVW5pdH0gJHttaW51dGVzfSR7bWludXRlVW5pdH0gJHtzZWNzfSR7c2Vjb25kVW5pdH1gO1xuICAgICAgICB9IGVsc2UgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7bWludXRlc30ke21pbnV0ZVVuaXR9ICR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtzZWNzfSR7c2Vjb25kVW5pdH1gO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhbiB1cCByZXNvdXJjZXNcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICBpZiAodGhpcy5jaGFuZ2VUaW1lb3V0KSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5jaGFuZ2VUaW1lb3V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHRoaXMucGVyaW9kaWNJbnRlcnZhbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLnBlcmlvZGljSW50ZXJ2YWwpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVbnN1YnNjcmliZSBmcm9tIEV2ZW50QnVzIGlmIHN1YnNjcmliZWRcbiAgICAgICAgaWYgKHRoaXMuaXNTdWJzY3JpYmVkICYmIHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnVuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgICAgIHRoaXMuaXNTdWJzY3JpYmVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyB3b3JrZXIgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuXG4vLyBDbGVhbiB1cCBvbiBwYWdlIHVubG9hZFxuJCh3aW5kb3cpLm9uKCdiZWZvcmV1bmxvYWQnLCAoKSA9PiB7XG4gICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuZGVzdHJveSgpO1xufSk7XG5cbi8vIEV4cG9ydCBmb3IgZXh0ZXJuYWwgYWNjZXNzXG53aW5kb3cucHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgPSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlcjsiXX0=