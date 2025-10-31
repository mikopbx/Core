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
    } // Use translated text or fallback


    var displayText = globalTranslate[stateText] || stateText || state || 'Unknown';
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
      if (response.result && response.data && response.data.events) {
        _this7.renderTimeline(response.data.events);
      }

      $('#timeline-loader').removeClass('active');
    });
  },

  /**
   * Render timeline visualization
   */
  renderTimeline: function renderTimeline(events) {
    var _this8 = this;

    var $timeline = $('#provider-timeline');
    var $container = $('#provider-timeline-container');

    if (!$timeline.length || !events || events.length === 0) {
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
    }); // Process events and store them in segments

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
    }); // Fill in gaps with last known state

    var lastKnownState = 'grey';
    var lastKnownEvent = null;

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
    } // Update state label with actual state text


    if ($stateLabel.length) {
      var stateText = globalTranslate[statusInfo.stateText] || statusInfo.stateText || statusInfo.state || globalTranslate.pr_CurrentState;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiQiLCIkc3RhdHVzIiwicHJvdmlkZXJUeXBlIiwicHJvdmlkZXJJZCIsImlzU3Vic2NyaWJlZCIsImxhc3RTdGF0dXMiLCJkaWFnbm9zdGljc0luaXRpYWxpemVkIiwiaGlzdG9yeVRhYmxlIiwic3RhdHVzRGF0YSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaW5jbHVkZXMiLCJmb3JtIiwiRGVidWdnZXJJbmZvIiwic3Vic2NyaWJlVG9FdmVudEJ1cyIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwic2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uIiwiRXZlbnRCdXMiLCJzdGFydFBlcmlvZGljVXBkYXRlIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImRhdGEiLCJldmVudCIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxldmFudENoYW5nZSIsImZpbmQiLCJjaGFuZ2UiLCJwcm92aWRlcl9pZCIsImlkIiwidXBkYXRlU3RhdHVzRGlzcGxheSIsInN0YXR1c2VzIiwicHJvdmlkZXJTdGF0dXMiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZXJyb3JUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfU3RhdHVzRXJyb3IiLCJodG1sIiwiZGVidWdJbmZvIiwidHlwZSIsInN0YXRlIiwibmV3X3N0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlVGV4dCIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMiLCJ1cGRhdGVTdGF0dXNMZWdhY3kiLCJ1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkiLCJzdGF0ZUljb24iLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdHVzQ29udGVudCIsImRpc3BsYXlUZXh0Iiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsInByX0NoZWNraW5nU3RhdHVzIiwiUHJvdmlkZXJzQVBJIiwiZ2V0U3RhdHVzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcl9Ob3RGb3VuZCIsImhhbmRsZVJlcXVlc3RFcnJvciIsImVycm9yIiwicHJfQ29ubmVjdGlvbkVycm9yIiwia2V5RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsIiRmaWVsZCIsImxlbmd0aCIsIm9uIiwiY2xlYXJUaW1lb3V0IiwiY2hhbmdlVGltZW91dCIsInNldFRpbWVvdXQiLCJwZXJpb2RpY0ludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJpbml0aWFsaXplVGltZWxpbmUiLCIkY2hlY2tCdG4iLCJvZmYiLCJhcGlDbGllbnQiLCJTaXBQcm92aWRlcnNBUEkiLCJJYXhQcm92aWRlcnNBUEkiLCJmb3JjZUNoZWNrIiwibG9hZFRpbWVsaW5lRGF0YSIsImV4cG9ydEhpc3RvcnlUb0NTViIsImdldEhpc3RvcnkiLCJldmVudHMiLCJyZW5kZXJUaW1lbGluZSIsIiR0aW1lbGluZSIsIiRjb250YWluZXIiLCJlbXB0eSIsIm5vdyIsIk1hdGgiLCJmbG9vciIsImRheUFnbyIsInRpbWVSYW5nZSIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwiY2VpbCIsInNlZ21lbnREYXRhIiwiZmlsbCIsInNlZ21lbnRFdmVudHMiLCJtYXAiLCJzZWdtZW50SW5kZXgiLCJwdXNoIiwiY3VycmVudFN0YXRlIiwibmV3U3RhdGUiLCJnZXRTdGF0ZUNvbG9yIiwiZ2V0U3RhdGVQcmlvcml0eSIsImxhc3RLbm93blN0YXRlIiwibGFzdEtub3duRXZlbnQiLCJpIiwiaW5oZXJpdGVkIiwic2VnbWVudFdpZHRoIiwiY29sb3IiLCJpbmRleCIsInRvb2x0aXBDb250ZW50IiwiZ2V0U2VnbWVudFRvb2x0aXBXaXRoRXZlbnRzIiwiJHNlZ21lbnQiLCJjc3MiLCJnZXRDb2xvckhleCIsImF0dHIiLCJhcHBlbmQiLCJwb3B1cCIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImdldFNlZ21lbnRUb29sdGlwIiwiaG91cnNBZ28iLCJtaW51dGVzQWdvIiwic2VnbWVudFN0YXJ0VGltZSIsInNlZ21lbnRFbmRUaW1lIiwic3RhcnRUaW1lIiwiZW5kVGltZSIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJzb3J0ZWRFdmVudHMiLCJzb3J0IiwiYSIsImIiLCJkaXNwbGF5RXZlbnRzIiwic2xpY2UiLCJldmVudFRpbWUiLCJjYXBpdGFsaXplRmlyc3QiLCJzdHIiLCJjaGFyQXQiLCJ0b0xvd2VyQ2FzZSIsInNlY29uZCIsInJ0dCIsInN0YXR1c0luZm8iLCIkcnR0IiwiJHJ0dENvbnRhaW5lciIsInBhcmVudCIsInVuZGVmaW5lZCIsInJ0dENvbG9yIiwidGV4dCIsInByX01pbGxpc2Vjb25kcyIsIiRkdXJhdGlvbiIsIiRzdGF0ZUxhYmVsIiwiJGR1cmF0aW9uQ29udGFpbmVyIiwic3RhdGVEdXJhdGlvbiIsImZvcm1hdER1cmF0aW9uIiwicHJfQ3VycmVudFN0YXRlIiwiY29sb3JIZXgiLCJzdGF0aXN0aWNzIiwic3RhdHMiLCIkYXZhaWxhYmlsaXR5IiwiYXZhaWxhYmlsaXR5IiwiJGNoZWNrcyIsInRvdGFsQ2hlY2tzIiwiJGJ0biIsInByb3ZpZGVySW5mbyIsImhvc3QiLCJ1c2VybmFtZSIsImRlc2NyaXB0aW9uIiwiZG93bmxvYWRDU1YiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInByX0V4cG9ydEZhaWxlZCIsInNob3dXYXJuaW5nIiwicHJfTm9IaXN0b3J5VG9FeHBvcnQiLCJoZWFkZXJzIiwicm93cyIsImRhdGV0aW1lIiwicHJldmlvdXNTdGF0ZSIsInByZXZpb3VzX3N0YXRlIiwicGVlclN0YXR1cyIsInBlZXJfc3RhdHVzIiwicXVhbGlmeUZyZXEiLCJxdWFsaWZ5X2ZyZXEiLCJxdWFsaWZ5VGltZSIsInF1YWxpZnlfdGltZSIsInJlZ2lzdGVyU3RhdHVzIiwicmVnaXN0ZXJfc3RhdHVzIiwiY29udGFjdCIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJsYXN0UmVnaXN0cmF0aW9uIiwibGFzdF9yZWdpc3RyYXRpb24iLCJkZXRhaWxzIiwiZXJyb3JNZXNzYWdlIiwiSlNPTiIsInN0cmluZ2lmeSIsIkJPTSIsImNzdkNvbnRlbnQiLCJqb2luIiwicm93IiwiY2VsbCIsImNlbGxTdHIiLCJTdHJpbmciLCJyZXBsYWNlIiwiYmxvYiIsIkJsb2IiLCJ1cmwiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJsaW5rIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3Vic3RyaW5nIiwiZmlsZW5hbWUiLCJzZXRBdHRyaWJ1dGUiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwicmV2b2tlT2JqZWN0VVJMIiwic2Vjb25kcyIsImRheXMiLCJob3VycyIsIm1pbnV0ZXMiLCJzZWNzIiwiZGF5VW5pdCIsInByX0RheXMiLCJob3VyVW5pdCIsInByX0hvdXJzIiwibWludXRlVW5pdCIsInByX01pbnV0ZXMiLCJzZWNvbmRVbml0IiwicHJfU2Vjb25kcyIsImRlc3Ryb3kiLCJjbGVhckludGVydmFsIiwidW5zdWJzY3JpYmUiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVB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QUNILENBRkQsRSxDQUlBOztBQUNBdFAsTUFBTSxDQUFDWiwwQkFBUCxHQUFvQ0EsMEJBQXBDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBEZWJ1Z2dlckluZm8sIEV2ZW50QnVzLCBnbG9iYWxSb290VXJsLCBQcm92aWRlcnNBUEksIFNpcFByb3ZpZGVyc0FQSSwgSWF4UHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogUHJvdmlkZXIgU3RhdHVzIFdvcmtlciBmb3IgTW9kaWZ5IFBhZ2VcbiAqIEhhbmRsZXMgcmVhbC10aW1lIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzIHZpYSBFdmVudEJ1cyBmb3IgaW5kaXZpZHVhbCBwcm92aWRlciBlZGl0IHBhZ2VzXG4gKiBSZXBsYWNlcyB0aGUgb2xkIHBvbGxpbmctYmFzZWQgYXBwcm9hY2ggd2l0aCBlZmZpY2llbnQgRXZlbnRCdXMgc3Vic2NyaXB0aW9uXG4gKlxuICogQG1vZHVsZSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlclxuICovXG5jb25zdCBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtcHJvdmlkZXItZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN0YXR1cyBsYWJlbFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN0YXR1czogJCgnI3N0YXR1cycpLFxuXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXIgdHlwZSBkZXRlcm1pbmVkIGZyb20gdGhlIHBhZ2UgVVJMXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwcm92aWRlclR5cGU6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgcHJvdmlkZXIgaWRcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHByb3ZpZGVySWQ6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBzdGF0dXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1N1YnNjcmliZWQ6IGZhbHNlLFxuICAgIFxuICAgIC8qKlxuICAgICAqIExhc3Qga25vd24gcHJvdmlkZXIgc3RhdHVzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBsYXN0U3RhdHVzOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpYWdub3N0aWNzIHRhYiBpbml0aWFsaXplZCBmbGFnXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGlhZ25vc3RpY3NJbml0aWFsaXplZDogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogSGlzdG9yeSBEYXRhVGFibGUgaW5zdGFuY2VcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGhpc3RvcnlUYWJsZTogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHN0YXR1cyBkYXRhIGZvciBkaWFnbm9zdGljc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgc3RhdHVzRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyB3b3JrZXIgd2l0aCBFdmVudEJ1cyBzdWJzY3JpcHRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgcHJvdmlkZXIgdHlwZSBhbmQgdW5pcWlkXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJ21vZGlmeXNpcCcpKSB7XG4gICAgICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9ICdzaXAnO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnbW9kaWZ5aWF4JykpIHtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gJ2lheCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBwcm92aWRlciBpZCBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5wcm92aWRlcklkID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgaWYgKCF0aGlzLnByb3ZpZGVySWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJ1Z2dlciBpbmZvXG4gICAgICAgIGlmICh0eXBlb2YgRGVidWdnZXJJbmZvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRCdXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXNcbiAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byByZWZyZXNoIHN0YXR1c1xuICAgICAgICB0aGlzLnNldHVwRm9ybUNoYW5nZURldGVjdGlvbigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciBwcm92aWRlciBzdGF0dXMgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRCdXMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNVcGRhdGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pc1N1YnNjcmliZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2UgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlIHx8ICFtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBldmVudCBhbmQgZGF0YVxuICAgICAgICBsZXQgZXZlbnQsIGRhdGE7XG4gICAgICAgIGlmIChtZXNzYWdlLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuZGF0YS5ldmVudCkge1xuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmRhdGEuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhLmRhdGEgfHwgbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgb3RoZXIgZXZlbnRzXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3Mgc3RhdHVzIHVwZGF0ZSB3aXRoIGNoYW5nZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLmNoYW5nZXMgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jaGFuZ2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIHN0YXR1cyBjaGFuZ2UgZm9yIG91ciBzcGVjaWZpYyBwcm92aWRlclxuICAgICAgICBjb25zdCByZWxldmFudENoYW5nZSA9IGRhdGEuY2hhbmdlcy5maW5kKGNoYW5nZSA9PiBcbiAgICAgICAgICAgIGNoYW5nZS5wcm92aWRlcl9pZCA9PT0gdGhpcy5wcm92aWRlcklkIHx8IGNoYW5nZS5pZCA9PT0gdGhpcy5wcm92aWRlcklkXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVsZXZhbnRDaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShyZWxldmFudENoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29tcGxldGUgc3RhdHVzIGRhdGFcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9vayBmb3Igb3VyIHByb3ZpZGVyIGluIHRoZSBzdGF0dXMgZGF0YVxuICAgICAgICBjb25zdCBwcm92aWRlclN0YXR1cyA9IGRhdGEuc3RhdHVzZXNbdGhpcy5wcm92aWRlclR5cGVdPy5bdGhpcy5wcm92aWRlcklkXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5zdGF0dXNlc1t0aGlzLnByb3ZpZGVySWRdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyU3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocHJvdmlkZXJTdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3RhdHVzIGVycm9yXG4gICAgICovXG4gICAgaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSkge1xuICAgICAgICAvLyBTaG93IGVycm9yIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncmVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0Vycm9yO1xuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2Vycm9yVGV4dH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgZGlzcGxheSB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIHByb3BlcnRpZXMgb3IgZmFsbGJhY2tcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNEaXNwbGF5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGxhc3Qgc3RhdHVzIGZvciBkZWJ1Z2dpbmdcbiAgICAgICAgdGhpcy5sYXN0U3RhdHVzID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgc3RhdHVzIGRhdGEgZm9yIGRpYWdub3N0aWNzXG4gICAgICAgIHRoaXMuc3RhdHVzRGF0YSA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgRGVidWdnZXJJbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIERlYnVnZ2VySW5mbyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlYnVnSW5mbyA9IHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5wcm92aWRlcklkLFxuICAgICAgICAgICAgICAgIHR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLFxuICAgICAgICAgICAgICAgIHN0YXRlOiBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlLFxuICAgICAgICAgICAgICAgIHN0YXRlQ29sb3I6IHN0YXR1c0RhdGEuc3RhdGVDb2xvcixcbiAgICAgICAgICAgICAgICBzdGF0ZVRleHQ6IHN0YXR1c0RhdGEuc3RhdGVUZXh0LFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBodG1sVGFibGUgPSBgXG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+UHJvdmlkZXI8L3RkPjx0ZD4ke2RlYnVnSW5mby5pZH08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VHlwZTwvdGQ+PHRkPiR7ZGVidWdJbmZvLnR5cGV9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPlN0YXRlPC90ZD48dGQ+JHtkZWJ1Z0luZm8uc3RhdGV9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPkNvbG9yPC90ZD48dGQ+JHtkZWJ1Z0luZm8uc3RhdGVDb2xvcn08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VXBkYXRlZDwvdGQ+PHRkPiR7ZGVidWdJbmZvLnRpbWVzdGFtcH08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdGF0dXNEYXRhLnN0YXRlQ29sb3IgJiYgc3RhdHVzRGF0YS5zdGF0ZVRleHQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzV2l0aEJhY2tlbmRQcm9wZXJ0aWVzKHN0YXR1c0RhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbGVnYWN5IHN0YXRlLWJhc2VkIHVwZGF0ZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNMZWdhY3koc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkaWFnbm9zdGljcyBkaXNwbGF5IGlmIGluaXRpYWxpemVkXG4gICAgICAgIGlmICh0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRGlhZ25vc3RpY3NEaXNwbGF5KHN0YXR1c0RhdGEpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzV2l0aEJhY2tlbmRQcm9wZXJ0aWVzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZUNvbG9yLCBzdGF0ZUljb24sIHN0YXRlVGV4dCwgc3RhdGVEZXNjcmlwdGlvbiwgc3RhdGUgfSA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBjb2xvciBjbGFzc1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IGdyZXkgcmVkIGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHN0YXRlQ29sb3IpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIGNvbnRlbnQgd2l0aCBpY29uIGFuZCB0cmFuc2xhdGVkIHRleHRcbiAgICAgICAgbGV0IHN0YXR1c0NvbnRlbnQgPSAnJztcbiAgICAgICAgaWYgKHN0YXRlSWNvbikge1xuICAgICAgICAgICAgc3RhdHVzQ29udGVudCArPSBgPGkgY2xhc3M9XCIke3N0YXRlSWNvbn0gaWNvblwiPjwvaT4gYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRyYW5zbGF0ZWQgdGV4dCBvciBmYWxsYmFja1xuICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZVRleHRdIHx8IHN0YXRlVGV4dCB8fCBzdGF0ZSB8fCAnVW5rbm93bic7XG4gICAgICAgIHN0YXR1c0NvbnRlbnQgKz0gZGlzcGxheVRleHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChzdGF0dXNDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGVnYWN5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlIHx8ICcnO1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSBzdGF0ZS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBiYXNlZCBvbiBzdGF0ZVxuICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cImNoZWNrbWFyayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PbmxpbmV9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIGdyZXkgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCd5ZWxsb3cnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9XaXRob3V0UmVnaXN0cmF0aW9ufWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwibWludXMgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfT2ZmbGluZX1gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyByZWQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2dyZXknKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0aW1lcyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PZmZsaW5lfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtzdGF0ZSB8fCAnVW5rbm93bid9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgZm9yIHRoZSBwcm92aWRlclxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2xvYWRpbmcnKVxuICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNraW5nU3RhdHVzfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgZm9yIHRoaXMgc3BlY2lmaWMgcHJvdmlkZXIgdmlhIFJFU1QgQVBJIHYzXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXModGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1cy5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZGlzcGxheSB3aXRoIHRoZSBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBub3QgZm91bmQgb3IgZXJyb3JcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfTm90Rm91bmR9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUmVxdWVzdEVycm9yKCdJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXF1ZXN0IGVycm9yc1xuICAgICAqL1xuICAgIGhhbmRsZVJlcXVlc3RFcnJvcihlcnJvcikge1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZyBncmVlbiB5ZWxsb3cgZ3JleScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpXG4gICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9Db25uZWN0aW9uRXJyb3J9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gcmVmcmVzaCBzdGF0dXMgd2hlbiBwcm92aWRlciBzZXR0aW5ncyBjaGFuZ2VcbiAgICAgKi9cbiAgICBzZXR1cEZvcm1DaGFuZ2VEZXRlY3Rpb24oKSB7XG4gICAgICAgIC8vIE1vbml0b3Iga2V5IGZpZWxkcyB0aGF0IG1pZ2h0IGFmZmVjdCBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgY29uc3Qga2V5RmllbGRzID0gWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdkaXNhYmxlZCddO1xuICAgICAgICBcbiAgICAgICAga2V5RmllbGRzLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9IHRoaXMuJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkZmllbGQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGZpZWxkLm9uKCdjaGFuZ2UgYmx1cicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVib3VuY2Ugc3RhdHVzIHJlcXVlc3RzXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNoYW5nZVRpbWVvdXQpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZVRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnByb3ZpZGVySWQpIHsgLy8gT25seSByZXF1ZXN0IGlmIHdlIGhhdmUgYSB2YWxpZCBwcm92aWRlciBJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwMCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgcGVyaW9kaWMgdXBkYXRlIGZvciB3aGVuIEV2ZW50QnVzIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBzdGFydFBlcmlvZGljVXBkYXRlKCkge1xuICAgICAgICB0aGlzLnBlcmlvZGljSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIH0sIDUwMDApOyAvLyBDaGVjayBldmVyeSA1IHNlY29uZHMgYXMgZmFsbGJhY2tcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKSB7XG4gICAgICAgIGlmICh0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aW1lbGluZVxuICAgICAgICB0aGlzLmluaXRpYWxpemVUaW1lbGluZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yY2UgY2hlY2sgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgY29uc3QgJGNoZWNrQnRuID0gJCgnI2NoZWNrLW5vdy1idG4nKTtcbiAgICAgICAgJGNoZWNrQnRuLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAkY2hlY2tCdG4uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBhcHByb3ByaWF0ZSBBUEkgY2xpZW50IGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBmb3JjZUNoZWNrIHVzaW5nIHYzIEFQSVxuICAgICAgICAgICAgYXBpQ2xpZW50LmZvcmNlQ2hlY2sodGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkY2hlY2tCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHBvcnQgaGlzdG9yeSBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjZXhwb3J0LWhpc3RvcnktYnRuJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZXhwb3J0SGlzdG9yeVRvQ1NWKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzcGxheSBjdXJyZW50IHN0YXR1cyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkodGhpcy5zdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lbGluZSgpIHtcbiAgICAgICAgLy8gTG9hZCB0aW1lbGluZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFRpbWVsaW5lRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB0aW1lbGluZSBkYXRhIGZyb20gaGlzdG9yeVxuICAgICAqL1xuICAgIGxvYWRUaW1lbGluZURhdGEoKSB7XG4gICAgICAgIC8vIFVzZSB0aGUgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGNvbnN0IGFwaUNsaWVudCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnc2lwJyA/IFNpcFByb3ZpZGVyc0FQSSA6IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGwgZ2V0SGlzdG9yeSB1c2luZyB2MyBBUElcbiAgICAgICAgYXBpQ2xpZW50LmdldEhpc3RvcnkodGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmV2ZW50cykge1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyVGltZWxpbmUocmVzcG9uc2UuZGF0YS5ldmVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3RpbWVsaW5lLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIHJlbmRlclRpbWVsaW5lKGV2ZW50cykge1xuICAgICAgICBjb25zdCAkdGltZWxpbmUgPSAkKCcjcHJvdmlkZXItdGltZWxpbmUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNwcm92aWRlci10aW1lbGluZS1jb250YWluZXInKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJHRpbWVsaW5lLmxlbmd0aCB8fCAhZXZlbnRzIHx8IGV2ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgdGltZWxpbmVcbiAgICAgICAgJHRpbWVsaW5lLmVtcHR5KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdGltZSByYW5nZSAobGFzdCAyNCBob3VycylcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuICAgICAgICBjb25zdCB0aW1lUmFuZ2UgPSAyNCAqIDYwICogNjA7IC8vIDI0IGhvdXJzIGluIHNlY29uZHNcbiAgICAgICAgXG4gICAgICAgIC8vIEdyb3VwIGV2ZW50cyBieSB0aW1lIHNlZ21lbnRzICgxNSBtaW51dGUgc2VnbWVudHMpXG4gICAgICAgIGNvbnN0IHNlZ21lbnREdXJhdGlvbiA9IDE1ICogNjA7IC8vIDE1IG1pbnV0ZXMgaW4gc2Vjb25kc1xuICAgICAgICBjb25zdCBzZWdtZW50cyA9IE1hdGguY2VpbCh0aW1lUmFuZ2UgLyBzZWdtZW50RHVyYXRpb24pO1xuICAgICAgICBjb25zdCBzZWdtZW50RGF0YSA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEV2ZW50cyA9IG5ldyBBcnJheShzZWdtZW50cykuZmlsbChudWxsKS5tYXAoKCkgPT4gW10pO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBldmVudHMgYW5kIHN0b3JlIHRoZW0gaW4gc2VnbWVudHNcbiAgICAgICAgZXZlbnRzLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnRpbWVzdGFtcCAmJiBldmVudC50aW1lc3RhbXAgPj0gZGF5QWdvKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VnbWVudEluZGV4ID0gTWF0aC5mbG9vcigoZXZlbnQudGltZXN0YW1wIC0gZGF5QWdvKSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnRJbmRleCA+PSAwICYmIHNlZ21lbnRJbmRleCA8IHNlZ21lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGV2ZW50IGluIHNlZ21lbnRcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tzZWdtZW50SW5kZXhdLnB1c2goZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJpb3JpdGl6ZSB3b3JzZSBzdGF0ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gc2VnbWVudERhdGFbc2VnbWVudEluZGV4XTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U3RhdGUgPSB0aGlzLmdldFN0YXRlQ29sb3IoZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFN0YXRlIHx8IHRoaXMuZ2V0U3RhdGVQcmlvcml0eShuZXdTdGF0ZSkgPiB0aGlzLmdldFN0YXRlUHJpb3JpdHkoY3VycmVudFN0YXRlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudERhdGFbc2VnbWVudEluZGV4XSA9IG5ld1N0YXRlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbGwgaW4gZ2FwcyB3aXRoIGxhc3Qga25vd24gc3RhdGVcbiAgICAgICAgbGV0IGxhc3RLbm93blN0YXRlID0gJ2dyZXknO1xuICAgICAgICBsZXQgbGFzdEtub3duRXZlbnQgPSBudWxsO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNlZ21lbnRzOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChzZWdtZW50RGF0YVtpXSkge1xuICAgICAgICAgICAgICAgIGxhc3RLbm93blN0YXRlID0gc2VnbWVudERhdGFbaV07XG4gICAgICAgICAgICAgICAgaWYgKHNlZ21lbnRFdmVudHNbaV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBsYXN0S25vd25FdmVudCA9IHNlZ21lbnRFdmVudHNbaV1bc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlZ21lbnREYXRhW2ldID0gbGFzdEtub3duU3RhdGU7XG4gICAgICAgICAgICAgICAgLy8gQ29weSBsYXN0IGtub3duIGV2ZW50IGZvciB0b29sdGlwXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RLbm93bkV2ZW50ICYmIHNlZ21lbnRFdmVudHNbaV0ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlZ21lbnRFdmVudHNbaV0gPSBbey4uLmxhc3RLbm93bkV2ZW50LCBpbmhlcml0ZWQ6IHRydWV9XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbmRlciBzZWdtZW50c1xuICAgICAgICBjb25zdCBzZWdtZW50V2lkdGggPSAxMDAgLyBzZWdtZW50cztcbiAgICAgICAgc2VnbWVudERhdGEuZm9yRWFjaCgoY29sb3IsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IHRoaXMuZ2V0U2VnbWVudFRvb2x0aXBXaXRoRXZlbnRzKGluZGV4LCBzZWdtZW50RHVyYXRpb24sIHNlZ21lbnRFdmVudHNbaW5kZXhdKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgJHNlZ21lbnQgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAgICAgLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgICd3aWR0aCc6IGAke3NlZ21lbnRXaWR0aH0lYCxcbiAgICAgICAgICAgICAgICAgICAgJ2hlaWdodCc6ICcxMDAlJyxcbiAgICAgICAgICAgICAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiB0aGlzLmdldENvbG9ySGV4KGNvbG9yKSxcbiAgICAgICAgICAgICAgICAgICAgJ2JveC1zaXppbmcnOiAnYm9yZGVyLWJveCcsXG4gICAgICAgICAgICAgICAgICAgICdjdXJzb3InOiAncG9pbnRlcidcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLWh0bWwnLCB0b29sdGlwQ29udGVudClcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS1wb3NpdGlvbicsICd0b3AgY2VudGVyJylcbiAgICAgICAgICAgICAgICAuYXR0cignZGF0YS12YXJpYXRpb24nLCAnbWluaScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGltZWxpbmUuYXBwZW5kKCRzZWdtZW50KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHdpdGggSFRNTCBjb250ZW50XG4gICAgICAgICR0aW1lbGluZS5maW5kKCdbZGF0YS1odG1sXScpLnBvcHVwKHtcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ21pbmknLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgaHRtbDogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0ZSBjb2xvciBjbGFzc1xuICAgICAqL1xuICAgIGdldFN0YXRlQ29sb3Ioc3RhdGUpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFN0YXRlID0gKHN0YXRlIHx8ICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBzd2l0Y2ggKG5vcm1hbGl6ZWRTdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAnUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdPSyc6XG4gICAgICAgICAgICBjYXNlICdSRUFDSEFCTEUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnTEFHR0VEJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3llbGxvdyc7XG4gICAgICAgICAgICBjYXNlICdPRkYnOlxuICAgICAgICAgICAgY2FzZSAnUkVKRUNURUQnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ0ZBSUxFRCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdyZWQnO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc3RhdGUgcHJpb3JpdHkgZm9yIGNvbmZsaWN0IHJlc29sdXRpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0ZVByaW9yaXR5KGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlZCc6IHJldHVybiAzO1xuICAgICAgICAgICAgY2FzZSAneWVsbG93JzogcmV0dXJuIDI7XG4gICAgICAgICAgICBjYXNlICdncmVlbic6IHJldHVybiAxO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBoZXggY29sb3IgY29kZVxuICAgICAqL1xuICAgIGdldENvbG9ySGV4KGNvbG9yKSB7XG4gICAgICAgIHN3aXRjaCAoY29sb3IpIHtcbiAgICAgICAgICAgIGNhc2UgJ2dyZWVuJzogcmV0dXJuICcjMjFiYTQ1JztcbiAgICAgICAgICAgIGNhc2UgJ3llbGxvdyc6IHJldHVybiAnI2ZiYmQwOCc7XG4gICAgICAgICAgICBjYXNlICdyZWQnOiByZXR1cm4gJyNkYjI4MjgnO1xuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuICcjNzY3Njc2JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHNlZ21lbnQgdG9vbHRpcCB0ZXh0XG4gICAgICovXG4gICAgZ2V0U2VnbWVudFRvb2x0aXAoc2VnbWVudEluZGV4LCBzZWdtZW50RHVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgaG91cnNBZ28gPSBNYXRoLmZsb29yKCg5NiAtIHNlZ21lbnRJbmRleCAtIDEpICogc2VnbWVudER1cmF0aW9uIC8gMzYwMCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXNBZ28gPSBNYXRoLmZsb29yKCgoOTYgLSBzZWdtZW50SW5kZXggLSAxKSAqIHNlZ21lbnREdXJhdGlvbiAlIDM2MDApIC8gNjApO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhvdXJzQWdvID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzQWdvfdGHICR7bWludXRlc0Fnb33QvCDQvdCw0LfQsNC0YDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzQWdvfdC8INC90LDQt9Cw0LRgO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc2VnbWVudCB0b29sdGlwIHdpdGggZXZlbnRzIGRldGFpbHNcbiAgICAgKi9cbiAgICBnZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoc2VnbWVudEluZGV4LCBzZWdtZW50RHVyYXRpb24sIGV2ZW50cykge1xuICAgICAgICBjb25zdCBzZWdtZW50U3RhcnRUaW1lID0gKHNlZ21lbnRJbmRleCAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRFbmRUaW1lID0gKChzZWdtZW50SW5kZXggKyAxKSAqIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICBjb25zdCBkYXlBZ28gPSBub3cgLSAoMjQgKiA2MCAqIDYwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aW1lIHJhbmdlIGZvciB0aGlzIHNlZ21lbnRcbiAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKGRheUFnbyArIHNlZ21lbnRTdGFydFRpbWUpICogMTAwMCk7XG4gICAgICAgIGNvbnN0IGVuZFRpbWUgPSBuZXcgRGF0ZSgoZGF5QWdvICsgc2VnbWVudEVuZFRpbWUpICogMTAwMCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjogbGVmdDsgbWluLXdpZHRoOiAyMDBweDtcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gVGltZSByYW5nZSBoZWFkZXJcbiAgICAgICAgaHRtbCArPSBgPGRpdiBzdHlsZT1cImZvbnQtd2VpZ2h0OiBib2xkOyBtYXJnaW4tYm90dG9tOiA1cHg7XCI+YDtcbiAgICAgICAgaHRtbCArPSBgJHtzdGFydFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSl9IC0gYDtcbiAgICAgICAgaHRtbCArPSBgJHtlbmRUaW1lLnRvTG9jYWxlVGltZVN0cmluZygncnUtUlUnLCB7aG91cjogJzItZGlnaXQnLCBtaW51dGU6ICcyLWRpZ2l0J30pfWA7XG4gICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudHMgaW4gdGhpcyBzZWdtZW50XG4gICAgICAgIGlmIChldmVudHMgJiYgZXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJib3JkZXItdG9wOiAxcHggc29saWQgI2RkZDsgbWFyZ2luLXRvcDogNXB4OyBwYWRkaW5nLXRvcDogNXB4O1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvcnQgZXZlbnRzIGJ5IHRpbWVzdGFtcCAobmV3ZXN0IGZpcnN0KVxuICAgICAgICAgICAgY29uc3Qgc29ydGVkRXZlbnRzID0gWy4uLmV2ZW50c10uc29ydCgoYSwgYikgPT4gKGIudGltZXN0YW1wIHx8IDApIC0gKGEudGltZXN0YW1wIHx8IDApKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2hvdyB1cCB0byAzIGV2ZW50c1xuICAgICAgICAgICAgY29uc3QgZGlzcGxheUV2ZW50cyA9IHNvcnRlZEV2ZW50cy5zbGljZSgwLCAzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZGlzcGxheUV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudFRpbWUgPSBuZXcgRGF0ZShldmVudC50aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZSA9IGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSB8fCAndW5rbm93bic7XG4gICAgICAgICAgICAgICAgLy8gQ2FwaXRhbGl6ZSBmaXJzdCBsZXR0ZXIgb2Ygc3RhdGUgZm9yIHRyYW5zbGF0aW9uIGtleVxuICAgICAgICAgICAgICAgIGNvbnN0IGNhcGl0YWxpemVGaXJzdCA9IChzdHIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzdHIpIHJldHVybiBzdHI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtgcHJfUHJvdmlkZXJTdGF0ZSR7Y2FwaXRhbGl6ZUZpcnN0KHN0YXRlKX1gXSB8fCBzdGF0ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xvciA9IHRoaXMuZ2V0Q29sb3JIZXgodGhpcy5nZXRTdGF0ZUNvbG9yKHN0YXRlKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cIm1hcmdpbjogM3B4IDA7IGZvbnQtc2l6ZTogMTJweDtcIj4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICM2NjY7XCI+JHtldmVudFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnLCBzZWNvbmQ6ICcyLWRpZ2l0J30pfTwvc3Bhbj4gYDtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAke2NvbG9yfTsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+4pePICR7c3RhdGVUZXh0fTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBSVFQgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnJ0dCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGAgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzk5OTtcIj4oJHtldmVudC5ydHR9bXMpPC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1hcmsgaW5oZXJpdGVkIHN0YXRlc1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5pbmhlcml0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSAnIDxzcGFuIHN0eWxlPVwiY29sb3I6ICM5OTk7IGZvbnQtc3R5bGU6IGl0YWxpYztcIj4o0L/RgNC+0LTQvtC70LbQsNC10YLRgdGPKTwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzb3J0ZWRFdmVudHMubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMXB4OyBtYXJnaW4tdG9wOiAzcHg7XCI+0Lgg0LXRidC1ICR7c29ydGVkRXZlbnRzLmxlbmd0aCAtIDN9INGB0L7QsdGL0YLQuNC5Li4uPC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMnB4OyBtYXJnaW4tdG9wOiA1cHg7XCI+0J3QtdGCINGB0L7QsdGL0YLQuNC5INCyINGN0YLQvtC8INC/0LXRgNC40L7QtNC1PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgd2l0aCBzdGF0dXMgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICB1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzSW5mbykge1xuICAgICAgICAvLyBVcGRhdGUgUlRUXG4gICAgICAgIGNvbnN0ICRydHQgPSAkKCcjcHJvdmlkZXItcnR0LXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRydHRDb250YWluZXIgPSAkcnR0LnBhcmVudCgpO1xuICAgICAgICBpZiAoJHJ0dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGlmIChzdGF0dXNJbmZvLnJ0dCAhPT0gbnVsbCAmJiBzdGF0dXNJbmZvLnJ0dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnR0Q29sb3IgPSBzdGF0dXNJbmZvLnJ0dCA+IDIwMCA/ICcjZGIyODI4JyA6IHN0YXR1c0luZm8ucnR0ID4gMTAwID8gJyNmYmJkMDgnIDogJyMyMWJhNDUnO1xuICAgICAgICAgICAgICAgICRydHQudGV4dChgJHtzdGF0dXNJbmZvLnJ0dH0gJHtnbG9iYWxUcmFuc2xhdGUucHJfTWlsbGlzZWNvbmRzfWApO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsIHJ0dENvbG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KCctLScpO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsICcjNzY3Njc2Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSBkdXJhdGlvbiBhbmQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1cmF0aW9uID0gJCgnI3Byb3ZpZGVyLWR1cmF0aW9uLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRzdGF0ZUxhYmVsID0gJCgnI3Byb3ZpZGVyLXN0YXRlLWxhYmVsJyk7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbkNvbnRhaW5lciA9ICRkdXJhdGlvbi5wYXJlbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHVyYXRpb24ubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgJGR1cmF0aW9uLnRleHQodGhpcy5mb3JtYXREdXJhdGlvbihzdGF0dXNJbmZvLnN0YXRlRHVyYXRpb24pKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlIGxhYmVsIHdpdGggYWN0dWFsIHN0YXRlIHRleHRcbiAgICAgICAgaWYgKCRzdGF0ZUxhYmVsLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW3N0YXR1c0luZm8uc3RhdGVUZXh0XSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNJbmZvLnN0YXRlVGV4dCB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0luZm8uc3RhdGUgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ3VycmVudFN0YXRlO1xuICAgICAgICAgICAgJHN0YXRlTGFiZWwudGV4dChzdGF0ZVRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBzdGF0ZSBjb2xvciB0byB0aGUgZHVyYXRpb24gdmFsdWUgYW5kIGxhYmVsXG4gICAgICAgIGlmICgkZHVyYXRpb25Db250YWluZXIubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgY29uc3QgY29sb3JIZXggPSB0aGlzLmdldENvbG9ySGV4KHN0YXR1c0luZm8uc3RhdGVDb2xvcik7XG4gICAgICAgICAgICAkZHVyYXRpb25Db250YWluZXIuY3NzKCdjb2xvcicsIGNvbG9ySGV4KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRpc3RpY3MgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdGF0dXNJbmZvLnN0YXRpc3RpY3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gc3RhdHVzSW5mby5zdGF0aXN0aWNzO1xuICAgICAgICAgICAgY29uc3QgJGF2YWlsYWJpbGl0eSA9ICQoJyNwcm92aWRlci1hdmFpbGFiaWxpdHktdmFsdWUnKTtcbiAgICAgICAgICAgIGlmICgkYXZhaWxhYmlsaXR5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRhdmFpbGFiaWxpdHkudGV4dChzdGF0cy5hdmFpbGFiaWxpdHkgPyBgJHtzdGF0cy5hdmFpbGFiaWxpdHl9JWAgOiAnLS0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgJGNoZWNrcyA9ICQoJyNwcm92aWRlci1jaGVja3MtdmFsdWUnKTtcbiAgICAgICAgICAgIGlmICgkY2hlY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRjaGVja3MudGV4dChzdGF0cy50b3RhbENoZWNrcyB8fCAnMCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFeHBvcnQgaGlzdG9yeSB0byBDU1YgZmlsZVxuICAgICAqL1xuICAgIGV4cG9ydEhpc3RvcnlUb0NTVigpIHtcbiAgICAgICAgY29uc3QgJGJ0biA9ICQoJyNleHBvcnQtaGlzdG9yeS1idG4nKTtcbiAgICAgICAgJGJ0bi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIGRldGFpbHNcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJbmZvID0ge1xuICAgICAgICAgICAgaG9zdDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaG9zdCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3VzZXJuYW1lJyksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZGVzY3JpcHRpb24nKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRoZSBhcHByb3ByaWF0ZSBBUEkgY2xpZW50IGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3QgYXBpQ2xpZW50ID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdzaXAnID8gU2lwUHJvdmlkZXJzQVBJIDogSWF4UHJvdmlkZXJzQVBJO1xuXG4gICAgICAgIC8vIEZldGNoIGhpc3RvcnkgZGF0YSB1c2luZyB2MyBBUElcbiAgICAgICAgYXBpQ2xpZW50LmdldEhpc3RvcnkodGhpcy5wcm92aWRlcklkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICRidG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmV2ZW50cykge1xuICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRDU1YocmVzcG9uc2UuZGF0YS5ldmVudHMsIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogdGhpcy5wcm92aWRlcklkLFxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlclR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLnRvVXBwZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgICAgIC4uLnByb3ZpZGVySW5mb1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wcl9FeHBvcnRGYWlsZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgZXZlbnRzIHRvIENTViBhbmQgdHJpZ2dlciBkb3dubG9hZFxuICAgICAqL1xuICAgIGRvd25sb2FkQ1NWKGV2ZW50cywgcHJvdmlkZXJJbmZvKSB7XG4gICAgICAgIGlmICghZXZlbnRzIHx8IGV2ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKGdsb2JhbFRyYW5zbGF0ZS5wcl9Ob0hpc3RvcnlUb0V4cG9ydCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRlY2huaWNhbCBoZWFkZXJzIHdpdGhvdXQgdHJhbnNsYXRpb25zXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSBbXG4gICAgICAgICAgICAndGltZXN0YW1wJyxcbiAgICAgICAgICAgICdkYXRldGltZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfaWQnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX3R5cGUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2hvc3QnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX3VzZXJuYW1lJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9kZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAnZXZlbnQnLFxuICAgICAgICAgICAgJ2V2ZW50X3R5cGUnLFxuICAgICAgICAgICAgJ3ByZXZpb3VzX3N0YXRlJyxcbiAgICAgICAgICAgICduZXdfc3RhdGUnLFxuICAgICAgICAgICAgJ3J0dF9tcycsXG4gICAgICAgICAgICAncGVlcl9zdGF0dXMnLFxuICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcScsXG4gICAgICAgICAgICAncXVhbGlmeV90aW1lJyxcbiAgICAgICAgICAgICdyZWdpc3Rlcl9zdGF0dXMnLFxuICAgICAgICAgICAgJ2NvbnRhY3QnLFxuICAgICAgICAgICAgJ3VzZXJfYWdlbnQnLFxuICAgICAgICAgICAgJ2xhc3RfcmVnaXN0cmF0aW9uJyxcbiAgICAgICAgICAgICdkZXRhaWxzJyxcbiAgICAgICAgICAgICdlcnJvcl9tZXNzYWdlJyxcbiAgICAgICAgICAgICdyYXdfZGF0YSdcbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZXZlbnRzIHRvIENTViByb3dzIHdpdGggYWxsIHRlY2huaWNhbCBkYXRhXG4gICAgICAgIGNvbnN0IHJvd3MgPSBldmVudHMubWFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgYWxsIGF2YWlsYWJsZSBmaWVsZHMgZnJvbSB0aGUgZXZlbnRcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgZXZlbnQudGltZXN0YW1wIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGV0aW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5wcm92aWRlcklkIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5wcm92aWRlclR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnVzZXJuYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5ldmVudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC50eXBlIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZpb3VzU3RhdGUgfHwgZXZlbnQucHJldmlvdXNfc3RhdGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnJ0dCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5wZWVyU3RhdHVzIHx8IGV2ZW50LnBlZXJfc3RhdHVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnF1YWxpZnlGcmVxIHx8IGV2ZW50LnF1YWxpZnlfZnJlcSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5xdWFsaWZ5VGltZSB8fCBldmVudC5xdWFsaWZ5X3RpbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucmVnaXN0ZXJTdGF0dXMgfHwgZXZlbnQucmVnaXN0ZXJfc3RhdHVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmNvbnRhY3QgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQudXNlckFnZW50IHx8IGV2ZW50LnVzZXJfYWdlbnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQubGFzdFJlZ2lzdHJhdGlvbiB8fCBldmVudC5sYXN0X3JlZ2lzdHJhdGlvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5kZXRhaWxzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmVycm9yIHx8IGV2ZW50LmVycm9yTWVzc2FnZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShldmVudCkgLy8gSW5jbHVkZSBjb21wbGV0ZSByYXcgZGF0YVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgQ1NWIGNvbnRlbnQgd2l0aCBCT00gZm9yIHByb3BlciBVVEYtOCBlbmNvZGluZyBpbiBFeGNlbFxuICAgICAgICBjb25zdCBCT00gPSAnXFx1RkVGRic7XG4gICAgICAgIGxldCBjc3ZDb250ZW50ID0gQk9NO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG1ldGFkYXRhIGhlYWRlclxuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIFByb3ZpZGVyIEV4cG9ydDogJHtwcm92aWRlckluZm8ucHJvdmlkZXJJZH0gKCR7cHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZX0pXFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBIb3N0OiAke3Byb3ZpZGVySW5mby5ob3N0fVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgVXNlcm5hbWU6ICR7cHJvdmlkZXJJbmZvLnVzZXJuYW1lfVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgRGVzY3JpcHRpb246ICR7cHJvdmlkZXJJbmZvLmRlc2NyaXB0aW9ufVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgRXhwb3J0IERhdGU6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgVG90YWwgRXZlbnRzOiAke2V2ZW50cy5sZW5ndGh9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSAnXFxuJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2x1bW4gaGVhZGVyc1xuICAgICAgICBjc3ZDb250ZW50ICs9IGhlYWRlcnMuam9pbignLCcpICsgJ1xcbic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGF0YSByb3dzXG4gICAgICAgIHJvd3MuZm9yRWFjaChyb3cgPT4ge1xuICAgICAgICAgICAgY3N2Q29udGVudCArPSByb3cubWFwKGNlbGwgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEVzY2FwZSBxdW90ZXMgYW5kIHdyYXAgaW4gcXVvdGVzIGlmIGNvbnRhaW5zIGNvbW1hLCBuZXdsaW5lLCBvciBxdW90ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBjZWxsU3RyID0gU3RyaW5nKGNlbGwpO1xuICAgICAgICAgICAgICAgIGlmIChjZWxsU3RyLmluY2x1ZGVzKCcsJykgfHwgY2VsbFN0ci5pbmNsdWRlcygnXFxuJykgfHwgY2VsbFN0ci5pbmNsdWRlcygnXCInKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCcjJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBcIiR7Y2VsbFN0ci5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNlbGxTdHI7XG4gICAgICAgICAgICB9KS5qb2luKCcsJykgKyAnXFxuJztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgYmxvYiBhbmQgZG93bmxvYWRcbiAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtjc3ZDb250ZW50XSwgeyB0eXBlOiAndGV4dC9jc3Y7Y2hhcnNldD11dGYtODsnIH0pO1xuICAgICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBcbiAgICAgICAgLy8gR2VuZXJhdGUgZmlsZW5hbWUgd2l0aCBwcm92aWRlciBJRCBhbmQgdGltZXN0YW1wXG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5vdy50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywgJy0nKS5zdWJzdHJpbmcoMCwgMTkpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGBwcm92aWRlcl8ke3Byb3ZpZGVySW5mby5wcm92aWRlcklkfV8ke3Byb3ZpZGVySW5mby5wcm92aWRlclR5cGV9XyR7dGltZXN0YW1wfS5jc3ZgO1xuICAgICAgICBcbiAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCB1cmwpO1xuICAgICAgICBsaW5rLnNldEF0dHJpYnV0ZSgnZG93bmxvYWQnLCBmaWxlbmFtZSk7XG4gICAgICAgIGxpbmsuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICAgIGxpbmsuY2xpY2soKTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChsaW5rKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpLCAxMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGR1cmF0aW9uIGluIHNlY29uZHMgdG8gaHVtYW4tcmVhZGFibGUgZm9ybWF0IHdpdGggbG9jYWxpemF0aW9uXG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBpZiAoIXNlY29uZHMpIHJldHVybiAnLS0nO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDg2NDAwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgODY0MDApIC8gMzYwMCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgMzYwMCkgLyA2MCk7XG4gICAgICAgIGNvbnN0IHNlY3MgPSBzZWNvbmRzICUgNjA7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgbG9jYWxpemVkIHVuaXRzXG4gICAgICAgIGNvbnN0IGRheVVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfRGF5cztcbiAgICAgICAgY29uc3QgaG91clVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfSG91cnM7XG4gICAgICAgIGNvbnN0IG1pbnV0ZVVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfTWludXRlcztcbiAgICAgICAgY29uc3Qgc2Vjb25kVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TZWNvbmRzO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2RheVVuaXR9ICR7aG91cnN9JHtob3VyVW5pdH0gJHttaW51dGVzfSR7bWludXRlVW5pdH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7aG91clVuaXR9ICR7bWludXRlc30ke21pbnV0ZVVuaXR9ICR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHttaW51dGVVbml0fSAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgcmVzb3VyY2VzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hhbmdlVGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY2hhbmdlVGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnBlcmlvZGljSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY0ludGVydmFsKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1cyBpZiBzdWJzY3JpYmVkXG4gICAgICAgIGlmICh0aGlzLmlzU3Vic2NyaWJlZCAmJiB0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgncHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBwcm92aWRlciBzdGF0dXMgd29ya2VyIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcblxuLy8gQ2xlYW4gdXAgb24gcGFnZSB1bmxvYWRcbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmRlc3Ryb3koKTtcbn0pO1xuXG4vLyBFeHBvcnQgZm9yIGV4dGVybmFsIGFjY2Vzc1xud2luZG93LnByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyID0gcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXI7Il19