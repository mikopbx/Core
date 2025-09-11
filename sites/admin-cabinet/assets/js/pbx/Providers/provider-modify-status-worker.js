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

/* global globalTranslate, PbxApi, DebuggerInfo, EventBus, globalRootUrl, ProvidersAPI */

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
    var errorText = globalTranslate.pr_StatusError || 'Status Error';
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
        this.$status.removeClass('grey yellow red').addClass('green').html("<i class=\"checkmark icon\"></i> ".concat(globalTranslate.pr_Online || 'Online'));
        break;

      case 'UNREACHABLE':
      case 'LAGGED':
        this.$status.removeClass('green grey red').addClass('yellow').html("<i class=\"exclamation triangle icon\"></i> ".concat(globalTranslate.pr_WithoutRegistration || 'Without Registration'));
        break;

      case 'OFF':
      case 'UNMONITORED':
        this.$status.removeClass('green yellow red').addClass('grey').html("<i class=\"minus icon\"></i> ".concat(globalTranslate.pr_Offline || 'Offline'));
        break;

      case 'REJECTED':
      case 'UNREGISTERED':
      case 'FAILED':
        this.$status.removeClass('green yellow grey').addClass('red').html("<i class=\"times icon\"></i> ".concat(globalTranslate.pr_Offline || 'Offline'));
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
    this.$status.removeClass('green yellow grey red').addClass('loading').html("<i class=\"spinner loading icon\"></i> ".concat(globalTranslate.pr_CheckingStatus || 'Checking...')); // Request status for this specific provider via REST API V2
    // Pass provider type for optimized lookup

    ProvidersAPI.getStatusById(this.providerId, this.providerType, function (response) {
      _this3.$status.removeClass('loading');

      if (response && response.result && response.data) {
        // Update display with the provider status
        _this3.updateStatusDisplay(response.data);
      } else if (response && !response.result) {
        // Provider not found or error
        _this3.$status.removeClass('green yellow red').addClass('grey').html("<i class=\"question icon\"></i> ".concat(globalTranslate.pr_NotFound || 'Not Found'));
      } else {
        _this3.handleRequestError('Invalid response format');
      }
    });
  },

  /**
   * Handle request errors
   */
  handleRequestError: function handleRequestError(error) {
    this.$status.removeClass('loading green yellow grey').addClass('red').html("<i class=\"exclamation triangle icon\"></i> ".concat(globalTranslate.pr_ConnectionError || 'Error'));
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
      $checkBtn.addClass('loading');
      $.api({
        url: "/pbxcore/api/v2/providers/getStatus/".concat(_this6.providerType.toUpperCase(), "/").concat(_this6.providerId),
        method: 'GET',
        data: {
          forceCheck: true
        },
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          $checkBtn.removeClass('loading');

          if (response.result && response.data) {
            _this6.updateStatusDisplay(response.data);

            _this6.loadTimelineData();
          }
        },
        onFailure: function onFailure() {
          $checkBtn.removeClass('loading');
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

    $.api({
      url: "/pbxcore/api/v2/providers/getHistory/".concat(this.providerType.toUpperCase(), "/").concat(this.providerId),
      method: 'GET',
      data: {
        limit: 1000
      },
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (response.result && response.data && response.data.events) {
          _this7.renderTimeline(response.data.events);
        }

        $('#timeline-loader').removeClass('active');
      },
      onFailure: function onFailure() {
        $('#timeline-loader').removeClass('active');
      }
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
        $rtt.text("".concat(statusInfo.rtt, " ").concat(globalTranslate.pr_Milliseconds || 'мс'));
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
      var stateText = globalTranslate[statusInfo.stateText] || statusInfo.stateText || statusInfo.state || globalTranslate.pr_CurrentState || 'Состояние';
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
    }; // Fetch history data

    $.api({
      url: "/pbxcore/api/v2/providers/getHistory/".concat(this.providerType.toUpperCase(), "/").concat(this.providerId),
      method: 'GET',
      data: {
        limit: 10000 // Get more records for export

      },
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        $btn.removeClass('loading');

        if (response.result && response.data && response.data.events) {
          _this10.downloadCSV(response.data.events, _objectSpread({
            providerId: _this10.providerId,
            providerType: _this10.providerType.toUpperCase()
          }, providerInfo));
        }
      },
      onFailure: function onFailure() {
        $btn.removeClass('loading');
        UserMessage.showError(globalTranslate.pr_ExportFailed || 'Export failed');
      }
    });
  },

  /**
   * Convert events to CSV and trigger download
   */
  downloadCSV: function downloadCSV(events, providerInfo) {
    if (!events || events.length === 0) {
      UserMessage.showWarning(globalTranslate.pr_NoHistoryToExport || 'No history to export');
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

    var dayUnit = globalTranslate.pr_Days || 'д';
    var hourUnit = globalTranslate.pr_Hours || 'ч';
    var minuteUnit = globalTranslate.pr_Minutes || 'м';
    var secondUnit = globalTranslate.pr_Seconds || 'с';

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiQiLCIkc3RhdHVzIiwicHJvdmlkZXJUeXBlIiwicHJvdmlkZXJJZCIsImlzU3Vic2NyaWJlZCIsImxhc3RTdGF0dXMiLCJkaWFnbm9zdGljc0luaXRpYWxpemVkIiwiaGlzdG9yeVRhYmxlIiwic3RhdHVzRGF0YSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaW5jbHVkZXMiLCJmb3JtIiwiRGVidWdnZXJJbmZvIiwic3Vic2NyaWJlVG9FdmVudEJ1cyIsInJlcXVlc3RJbml0aWFsU3RhdHVzIiwic2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uIiwiRXZlbnRCdXMiLCJzdGFydFBlcmlvZGljVXBkYXRlIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsImRhdGEiLCJldmVudCIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxldmFudENoYW5nZSIsImZpbmQiLCJjaGFuZ2UiLCJwcm92aWRlcl9pZCIsImlkIiwidXBkYXRlU3RhdHVzRGlzcGxheSIsInN0YXR1c2VzIiwicHJvdmlkZXJTdGF0dXMiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZXJyb3JUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfU3RhdHVzRXJyb3IiLCJodG1sIiwiZGVidWdJbmZvIiwidHlwZSIsInN0YXRlIiwibmV3X3N0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlVGV4dCIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b0lTT1N0cmluZyIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJ1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMiLCJ1cGRhdGVTdGF0dXNMZWdhY3kiLCJ1cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkiLCJzdGF0ZUljb24iLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdHVzQ29udGVudCIsImRpc3BsYXlUZXh0Iiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJwcl9PbmxpbmUiLCJwcl9XaXRob3V0UmVnaXN0cmF0aW9uIiwicHJfT2ZmbGluZSIsInByX0NoZWNraW5nU3RhdHVzIiwiUHJvdmlkZXJzQVBJIiwiZ2V0U3RhdHVzQnlJZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicHJfTm90Rm91bmQiLCJoYW5kbGVSZXF1ZXN0RXJyb3IiLCJlcnJvciIsInByX0Nvbm5lY3Rpb25FcnJvciIsImtleUZpZWxkcyIsImZvckVhY2giLCJmaWVsZE5hbWUiLCIkZmllbGQiLCJsZW5ndGgiLCJvbiIsImNsZWFyVGltZW91dCIsImNoYW5nZVRpbWVvdXQiLCJzZXRUaW1lb3V0IiwicGVyaW9kaWNJbnRlcnZhbCIsInNldEludGVydmFsIiwiaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiIiwiaW5pdGlhbGl6ZVRpbWVsaW5lIiwiJGNoZWNrQnRuIiwib2ZmIiwiYXBpIiwidXJsIiwibWV0aG9kIiwiZm9yY2VDaGVjayIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwibG9hZFRpbWVsaW5lRGF0YSIsIm9uRmFpbHVyZSIsImV4cG9ydEhpc3RvcnlUb0NTViIsImxpbWl0IiwiZXZlbnRzIiwicmVuZGVyVGltZWxpbmUiLCIkdGltZWxpbmUiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJub3ciLCJNYXRoIiwiZmxvb3IiLCJkYXlBZ28iLCJ0aW1lUmFuZ2UiLCJzZWdtZW50RHVyYXRpb24iLCJzZWdtZW50cyIsImNlaWwiLCJzZWdtZW50RGF0YSIsImZpbGwiLCJzZWdtZW50RXZlbnRzIiwibWFwIiwic2VnbWVudEluZGV4IiwicHVzaCIsImN1cnJlbnRTdGF0ZSIsIm5ld1N0YXRlIiwiZ2V0U3RhdGVDb2xvciIsImdldFN0YXRlUHJpb3JpdHkiLCJsYXN0S25vd25TdGF0ZSIsImxhc3RLbm93bkV2ZW50IiwiaSIsImluaGVyaXRlZCIsInNlZ21lbnRXaWR0aCIsImNvbG9yIiwiaW5kZXgiLCJ0b29sdGlwQ29udGVudCIsImdldFNlZ21lbnRUb29sdGlwV2l0aEV2ZW50cyIsIiRzZWdtZW50IiwiY3NzIiwiZ2V0Q29sb3JIZXgiLCJhdHRyIiwiYXBwZW5kIiwicG9wdXAiLCJ2YXJpYXRpb24iLCJob3ZlcmFibGUiLCJnZXRTZWdtZW50VG9vbHRpcCIsImhvdXJzQWdvIiwibWludXRlc0FnbyIsInNlZ21lbnRTdGFydFRpbWUiLCJzZWdtZW50RW5kVGltZSIsInN0YXJ0VGltZSIsImVuZFRpbWUiLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJob3VyIiwibWludXRlIiwic29ydGVkRXZlbnRzIiwic29ydCIsImEiLCJiIiwiZGlzcGxheUV2ZW50cyIsInNsaWNlIiwiZXZlbnRUaW1lIiwiY2FwaXRhbGl6ZUZpcnN0Iiwic3RyIiwiY2hhckF0IiwidG9Mb3dlckNhc2UiLCJzZWNvbmQiLCJydHQiLCJzdGF0dXNJbmZvIiwiJHJ0dCIsIiRydHRDb250YWluZXIiLCJwYXJlbnQiLCJ1bmRlZmluZWQiLCJydHRDb2xvciIsInRleHQiLCJwcl9NaWxsaXNlY29uZHMiLCIkZHVyYXRpb24iLCIkc3RhdGVMYWJlbCIsIiRkdXJhdGlvbkNvbnRhaW5lciIsInN0YXRlRHVyYXRpb24iLCJmb3JtYXREdXJhdGlvbiIsInByX0N1cnJlbnRTdGF0ZSIsImNvbG9ySGV4Iiwic3RhdGlzdGljcyIsInN0YXRzIiwiJGF2YWlsYWJpbGl0eSIsImF2YWlsYWJpbGl0eSIsIiRjaGVja3MiLCJ0b3RhbENoZWNrcyIsIiRidG4iLCJwcm92aWRlckluZm8iLCJob3N0IiwidXNlcm5hbWUiLCJkZXNjcmlwdGlvbiIsImRvd25sb2FkQ1NWIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJwcl9FeHBvcnRGYWlsZWQiLCJzaG93V2FybmluZyIsInByX05vSGlzdG9yeVRvRXhwb3J0IiwiaGVhZGVycyIsInJvd3MiLCJkYXRldGltZSIsInByZXZpb3VzU3RhdGUiLCJwcmV2aW91c19zdGF0ZSIsInBlZXJTdGF0dXMiLCJwZWVyX3N0YXR1cyIsInF1YWxpZnlGcmVxIiwicXVhbGlmeV9mcmVxIiwicXVhbGlmeVRpbWUiLCJxdWFsaWZ5X3RpbWUiLCJyZWdpc3RlclN0YXR1cyIsInJlZ2lzdGVyX3N0YXR1cyIsImNvbnRhY3QiLCJ1c2VyQWdlbnQiLCJ1c2VyX2FnZW50IiwibGFzdFJlZ2lzdHJhdGlvbiIsImxhc3RfcmVnaXN0cmF0aW9uIiwiZGV0YWlscyIsImVycm9yTWVzc2FnZSIsIkpTT04iLCJzdHJpbmdpZnkiLCJCT00iLCJjc3ZDb250ZW50Iiwiam9pbiIsInJvdyIsImNlbGwiLCJjZWxsU3RyIiwiU3RyaW5nIiwicmVwbGFjZSIsImJsb2IiLCJCbG9iIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwibGluayIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInN1YnN0cmluZyIsImZpbGVuYW1lIiwic2V0QXR0cmlidXRlIiwic3R5bGUiLCJkaXNwbGF5IiwiYm9keSIsImFwcGVuZENoaWxkIiwiY2xpY2siLCJyZW1vdmVDaGlsZCIsInJldm9rZU9iamVjdFVSTCIsInNlY29uZHMiLCJkYXlzIiwiaG91cnMiLCJtaW51dGVzIiwic2VjcyIsImRheVVuaXQiLCJwcl9EYXlzIiwiaG91clVuaXQiLCJwcl9Ib3VycyIsIm1pbnV0ZVVuaXQiLCJwcl9NaW51dGVzIiwic2Vjb25kVW5pdCIsInByX1NlY29uZHMiLCJkZXN0cm95IiwiY2xlYXJJbnRlcnZhbCIsInVuc3Vic2NyaWJlIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDcVEsT0FBM0I7QUFDSCxDQUZELEUsQ0FJQTs7QUFDQXpQLE1BQU0sQ0FBQ1osMEJBQVAsR0FBb0NBLDBCQUFwQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgRGVidWdnZXJJbmZvLCBFdmVudEJ1cywgZ2xvYmFsUm9vdFVybCwgUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogUHJvdmlkZXIgU3RhdHVzIFdvcmtlciBmb3IgTW9kaWZ5IFBhZ2VcbiAqIEhhbmRsZXMgcmVhbC10aW1lIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzIHZpYSBFdmVudEJ1cyBmb3IgaW5kaXZpZHVhbCBwcm92aWRlciBlZGl0IHBhZ2VzXG4gKiBSZXBsYWNlcyB0aGUgb2xkIHBvbGxpbmctYmFzZWQgYXBwcm9hY2ggd2l0aCBlZmZpY2llbnQgRXZlbnRCdXMgc3Vic2NyaXB0aW9uXG4gKlxuICogQG1vZHVsZSBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlclxuICovXG5jb25zdCBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtcHJvdmlkZXItZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN0YXR1cyBsYWJlbFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN0YXR1czogJCgnI3N0YXR1cycpLFxuXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXIgdHlwZSBkZXRlcm1pbmVkIGZyb20gdGhlIHBhZ2UgVVJMXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwcm92aWRlclR5cGU6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgcHJvdmlkZXIgaWRcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHByb3ZpZGVySWQ6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV2ZW50QnVzIHN1YnNjcmlwdGlvbiBzdGF0dXNcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc1N1YnNjcmliZWQ6IGZhbHNlLFxuICAgIFxuICAgIC8qKlxuICAgICAqIExhc3Qga25vd24gcHJvdmlkZXIgc3RhdHVzXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBsYXN0U3RhdHVzOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERpYWdub3N0aWNzIHRhYiBpbml0aWFsaXplZCBmbGFnXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgZGlhZ25vc3RpY3NJbml0aWFsaXplZDogZmFsc2UsXG4gICAgXG4gICAgLyoqXG4gICAgICogSGlzdG9yeSBEYXRhVGFibGUgaW5zdGFuY2VcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGhpc3RvcnlUYWJsZTogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHN0YXR1cyBkYXRhIGZvciBkaWFnbm9zdGljc1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgc3RhdHVzRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyB3b3JrZXIgd2l0aCBFdmVudEJ1cyBzdWJzY3JpcHRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBEZXRlcm1pbmUgcHJvdmlkZXIgdHlwZSBhbmQgdW5pcWlkXG4gICAgICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJ21vZGlmeXNpcCcpKSB7XG4gICAgICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9ICdzaXAnO1xuICAgICAgICB9IGVsc2UgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5pbmNsdWRlcygnbW9kaWZ5aWF4JykpIHtcbiAgICAgICAgICAgIHRoaXMucHJvdmlkZXJUeXBlID0gJ2lheCc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBwcm92aWRlciBpZCBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy5wcm92aWRlcklkID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgaWYgKCF0aGlzLnByb3ZpZGVySWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWJ1Z2dlciBpbmZvXG4gICAgICAgIGlmICh0eXBlb2YgRGVidWdnZXJJbmZvICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRCdXMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXNcbiAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byByZWZyZXNoIHN0YXR1c1xuICAgICAgICB0aGlzLnNldHVwRm9ybUNoYW5nZURldGVjdGlvbigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciBwcm92aWRlciBzdGF0dXMgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRCdXMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0UGVyaW9kaWNVcGRhdGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pc1N1YnNjcmliZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2UgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlIHx8ICFtZXNzYWdlLmRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0cmFjdCBldmVudCBhbmQgZGF0YVxuICAgICAgICBsZXQgZXZlbnQsIGRhdGE7XG4gICAgICAgIGlmIChtZXNzYWdlLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuZGF0YS5ldmVudCkge1xuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmRhdGEuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhLmRhdGEgfHwgbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBJZ25vcmUgb3RoZXIgZXZlbnRzXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3Mgc3RhdHVzIHVwZGF0ZSB3aXRoIGNoYW5nZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLmNoYW5nZXMgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jaGFuZ2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIHN0YXR1cyBjaGFuZ2UgZm9yIG91ciBzcGVjaWZpYyBwcm92aWRlclxuICAgICAgICBjb25zdCByZWxldmFudENoYW5nZSA9IGRhdGEuY2hhbmdlcy5maW5kKGNoYW5nZSA9PiBcbiAgICAgICAgICAgIGNoYW5nZS5wcm92aWRlcl9pZCA9PT0gdGhpcy5wcm92aWRlcklkIHx8IGNoYW5nZS5pZCA9PT0gdGhpcy5wcm92aWRlcklkXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVsZXZhbnRDaGFuZ2UpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShyZWxldmFudENoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29tcGxldGUgc3RhdHVzIGRhdGFcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTG9vayBmb3Igb3VyIHByb3ZpZGVyIGluIHRoZSBzdGF0dXMgZGF0YVxuICAgICAgICBjb25zdCBwcm92aWRlclN0YXR1cyA9IGRhdGEuc3RhdHVzZXNbdGhpcy5wcm92aWRlclR5cGVdPy5bdGhpcy5wcm92aWRlcklkXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5zdGF0dXNlc1t0aGlzLnByb3ZpZGVySWRdO1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyU3RhdHVzKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocHJvdmlkZXJTdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3RhdHVzIGVycm9yXG4gICAgICovXG4gICAgaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSkge1xuICAgICAgICAvLyBTaG93IGVycm9yIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSBsb2FkaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncmVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgY29uc3QgZXJyb3JUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0Vycm9yIHx8ICdTdGF0dXMgRXJyb3InO1xuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2Vycm9yVGV4dH1gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgZGlzcGxheSB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIHByb3BlcnRpZXMgb3IgZmFsbGJhY2tcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNEaXNwbGF5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGxhc3Qgc3RhdHVzIGZvciBkZWJ1Z2dpbmdcbiAgICAgICAgdGhpcy5sYXN0U3RhdHVzID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNhdmUgc3RhdHVzIGRhdGEgZm9yIGRpYWdub3N0aWNzXG4gICAgICAgIHRoaXMuc3RhdHVzRGF0YSA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgRGVidWdnZXJJbmZvIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIERlYnVnZ2VySW5mbyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlYnVnSW5mbyA9IHtcbiAgICAgICAgICAgICAgICBpZDogdGhpcy5wcm92aWRlcklkLFxuICAgICAgICAgICAgICAgIHR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLFxuICAgICAgICAgICAgICAgIHN0YXRlOiBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlLFxuICAgICAgICAgICAgICAgIHN0YXRlQ29sb3I6IHN0YXR1c0RhdGEuc3RhdGVDb2xvcixcbiAgICAgICAgICAgICAgICBzdGF0ZVRleHQ6IHN0YXR1c0RhdGEuc3RhdGVUZXh0LFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBodG1sVGFibGUgPSBgXG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+UHJvdmlkZXI8L3RkPjx0ZD4ke2RlYnVnSW5mby5pZH08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VHlwZTwvdGQ+PHRkPiR7ZGVidWdJbmZvLnR5cGV9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPlN0YXRlPC90ZD48dGQ+JHtkZWJ1Z0luZm8uc3RhdGV9PC90ZD48L3RyPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPkNvbG9yPC90ZD48dGQ+JHtkZWJ1Z0luZm8uc3RhdGVDb2xvcn08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+VXBkYXRlZDwvdGQ+PHRkPiR7ZGVidWdJbmZvLnRpbWVzdGFtcH08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdGF0dXNEYXRhLnN0YXRlQ29sb3IgJiYgc3RhdHVzRGF0YS5zdGF0ZVRleHQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzV2l0aEJhY2tlbmRQcm9wZXJ0aWVzKHN0YXR1c0RhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbGVnYWN5IHN0YXRlLWJhc2VkIHVwZGF0ZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNMZWdhY3koc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkaWFnbm9zdGljcyBkaXNwbGF5IGlmIGluaXRpYWxpemVkXG4gICAgICAgIGlmICh0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRGlhZ25vc3RpY3NEaXNwbGF5KHN0YXR1c0RhdGEpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzV2l0aEJhY2tlbmRQcm9wZXJ0aWVzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZUNvbG9yLCBzdGF0ZUljb24sIHN0YXRlVGV4dCwgc3RhdGVEZXNjcmlwdGlvbiwgc3RhdGUgfSA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSBjb2xvciBjbGFzc1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IGdyZXkgcmVkIGxvYWRpbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHN0YXRlQ29sb3IpO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdHVzIGNvbnRlbnQgd2l0aCBpY29uIGFuZCB0cmFuc2xhdGVkIHRleHRcbiAgICAgICAgbGV0IHN0YXR1c0NvbnRlbnQgPSAnJztcbiAgICAgICAgaWYgKHN0YXRlSWNvbikge1xuICAgICAgICAgICAgc3RhdHVzQ29udGVudCArPSBgPGkgY2xhc3M9XCIke3N0YXRlSWNvbn0gaWNvblwiPjwvaT4gYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRyYW5zbGF0ZWQgdGV4dCBvciBmYWxsYmFja1xuICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZVRleHRdIHx8IHN0YXRlVGV4dCB8fCBzdGF0ZSB8fCAnVW5rbm93bic7XG4gICAgICAgIHN0YXR1c0NvbnRlbnQgKz0gZGlzcGxheVRleHQ7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRzdGF0dXMuaHRtbChzdGF0dXNDb250ZW50KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzTGVnYWN5KHN0YXR1c0RhdGEpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBzdGF0dXNEYXRhLnN0YXRlIHx8IHN0YXR1c0RhdGEubmV3X3N0YXRlIHx8ICcnO1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSBzdGF0ZS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgY2xhc3MgYW5kIHVwZGF0ZSBiYXNlZCBvbiBzdGF0ZVxuICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JleSB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmVlbicpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cImNoZWNrbWFyayBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PbmxpbmUgfHwgJ09ubGluZSd9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIGdyZXkgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCd5ZWxsb3cnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9XaXRob3V0UmVnaXN0cmF0aW9uIHx8ICdXaXRob3V0IFJlZ2lzdHJhdGlvbid9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdPRkYnOlxuICAgICAgICAgICAgY2FzZSAnVU5NT05JVE9SRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyByZWQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2dyZXknKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJtaW51cyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PZmZsaW5lIHx8ICdPZmZsaW5lJ31gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdyZWQnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0aW1lcyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9PZmZsaW5lIHx8ICdPZmZsaW5lJ31gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInF1ZXN0aW9uIGljb25cIj48L2k+ICR7c3RhdGUgfHwgJ1Vua25vd24nfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGluaXRpYWwgc3RhdHVzIGZvciB0aGUgcHJvdmlkZXJcbiAgICAgKi9cbiAgICByZXF1ZXN0SW5pdGlhbFN0YXR1cygpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdsb2FkaW5nJylcbiAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNwaW5uZXIgbG9hZGluZyBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja2luZ1N0YXR1cyB8fCAnQ2hlY2tpbmcuLi4nfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgZm9yIHRoaXMgc3BlY2lmaWMgcHJvdmlkZXIgdmlhIFJFU1QgQVBJIFYyXG4gICAgICAgIC8vIFBhc3MgcHJvdmlkZXIgdHlwZSBmb3Igb3B0aW1pemVkIGxvb2t1cFxuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzQnlJZCh0aGlzLnByb3ZpZGVySWQsIHRoaXMucHJvdmlkZXJUeXBlLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJHN0YXR1cy5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZGlzcGxheSB3aXRoIHRoZSBwcm92aWRlciBzdGF0dXNcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm92aWRlciBub3QgZm91bmQgb3IgZXJyb3JcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUucHJfTm90Rm91bmQgfHwgJ05vdCBGb3VuZCd9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUmVxdWVzdEVycm9yKCdJbnZhbGlkIHJlc3BvbnNlIGZvcm1hdCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXF1ZXN0IGVycm9yc1xuICAgICAqL1xuICAgIGhhbmRsZVJlcXVlc3RFcnJvcihlcnJvcikge1xuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZyBncmVlbiB5ZWxsb3cgZ3JleScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpXG4gICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9Db25uZWN0aW9uRXJyb3IgfHwgJ0Vycm9yJ31gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byByZWZyZXNoIHN0YXR1cyB3aGVuIHByb3ZpZGVyIHNldHRpbmdzIGNoYW5nZVxuICAgICAqL1xuICAgIHNldHVwRm9ybUNoYW5nZURldGVjdGlvbigpIHtcbiAgICAgICAgLy8gTW9uaXRvciBrZXkgZmllbGRzIHRoYXQgbWlnaHQgYWZmZWN0IHByb3ZpZGVyIHN0YXR1c1xuICAgICAgICBjb25zdCBrZXlGaWVsZHMgPSBbJ2hvc3QnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2Rpc2FibGVkJ107XG4gICAgICAgIFxuICAgICAgICBrZXlGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gdGhpcy4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkZmllbGQub24oJ2NoYW5nZSBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZWJvdW5jZSBzdGF0dXMgcmVxdWVzdHNcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY2hhbmdlVGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucHJvdmlkZXJJZCkgeyAvLyBPbmx5IHJlcXVlc3QgaWYgd2UgaGF2ZSBhIHZhbGlkIHByb3ZpZGVyIElEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCAxMDAwKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGYWxsYmFjayBwZXJpb2RpYyB1cGRhdGUgZm9yIHdoZW4gRXZlbnRCdXMgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqL1xuICAgIHN0YXJ0UGVyaW9kaWNVcGRhdGUoKSB7XG4gICAgICAgIHRoaXMucGVyaW9kaWNJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdEluaXRpYWxTdGF0dXMoKTtcbiAgICAgICAgfSwgNTAwMCk7IC8vIENoZWNrIGV2ZXJ5IDUgc2Vjb25kcyBhcyBmYWxsYmFja1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpIHtcbiAgICAgICAgaWYgKHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVsaW5lXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRpbWVsaW5lKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JjZSBjaGVjayBidXR0b24gaGFuZGxlclxuICAgICAgICBjb25zdCAkY2hlY2tCdG4gPSAkKCcjY2hlY2stbm93LWJ0bicpO1xuICAgICAgICAkY2hlY2tCdG4ub2ZmKCdjbGljaycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgICRjaGVja0J0bi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogYC9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0U3RhdHVzLyR7dGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKX0vJHt0aGlzLnByb3ZpZGVySWR9YCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgXG4gICAgICAgICAgICAgICAgICAgIGZvcmNlQ2hlY2s6IHRydWUgXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkY2hlY2tCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRjaGVja0J0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEV4cG9ydCBoaXN0b3J5IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNleHBvcnQtaGlzdG9yeS1idG4nKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5leHBvcnRIaXN0b3J5VG9DU1YoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNwbGF5IGN1cnJlbnQgc3RhdHVzIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodGhpcy5zdGF0dXNEYXRhKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZURpYWdub3N0aWNzRGlzcGxheSh0aGlzLnN0YXR1c0RhdGEpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRpYWdub3N0aWNzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aW1lbGluZSB2aXN1YWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRpbWVsaW5lKCkge1xuICAgICAgICAvLyBMb2FkIHRpbWVsaW5lIGRhdGFcbiAgICAgICAgdGhpcy5sb2FkVGltZWxpbmVEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHRpbWVsaW5lIGRhdGEgZnJvbSBoaXN0b3J5XG4gICAgICovXG4gICAgbG9hZFRpbWVsaW5lRGF0YSgpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRIaXN0b3J5LyR7dGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKX0vJHt0aGlzLnByb3ZpZGVySWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7IFxuICAgICAgICAgICAgICAgIGxpbWl0OiAxMDAwIFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclRpbWVsaW5lKHJlc3BvbnNlLmRhdGEuZXZlbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgnI3RpbWVsaW5lLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjdGltZWxpbmUtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aW1lbGluZSB2aXN1YWxpemF0aW9uXG4gICAgICovXG4gICAgcmVuZGVyVGltZWxpbmUoZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0ICR0aW1lbGluZSA9ICQoJyNwcm92aWRlci10aW1lbGluZScpO1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI3Byb3ZpZGVyLXRpbWVsaW5lLWNvbnRhaW5lcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkdGltZWxpbmUubGVuZ3RoIHx8ICFldmVudHMgfHwgZXZlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lbGluZVxuICAgICAgICAkdGltZWxpbmUuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aW1lIHJhbmdlIChsYXN0IDI0IGhvdXJzKVxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG4gICAgICAgIGNvbnN0IHRpbWVSYW5nZSA9IDI0ICogNjAgKiA2MDsgLy8gMjQgaG91cnMgaW4gc2Vjb25kc1xuICAgICAgICBcbiAgICAgICAgLy8gR3JvdXAgZXZlbnRzIGJ5IHRpbWUgc2VnbWVudHMgKDE1IG1pbnV0ZSBzZWdtZW50cylcbiAgICAgICAgY29uc3Qgc2VnbWVudER1cmF0aW9uID0gMTUgKiA2MDsgLy8gMTUgbWludXRlcyBpbiBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gTWF0aC5jZWlsKHRpbWVSYW5nZSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IHNlZ21lbnREYXRhID0gbmV3IEFycmF5KHNlZ21lbnRzKS5maWxsKG51bGwpO1xuICAgICAgICBjb25zdCBzZWdtZW50RXZlbnRzID0gbmV3IEFycmF5KHNlZ21lbnRzKS5maWxsKG51bGwpLm1hcCgoKSA9PiBbXSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGV2ZW50cyBhbmQgc3RvcmUgdGhlbSBpbiBzZWdtZW50c1xuICAgICAgICBldmVudHMuZm9yRWFjaChldmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQudGltZXN0YW1wICYmIGV2ZW50LnRpbWVzdGFtcCA+PSBkYXlBZ28pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWdtZW50SW5kZXggPSBNYXRoLmZsb29yKChldmVudC50aW1lc3RhbXAgLSBkYXlBZ28pIC8gc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEluZGV4ID49IDAgJiYgc2VnbWVudEluZGV4IDwgc2VnbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgZXZlbnQgaW4gc2VnbWVudFxuICAgICAgICAgICAgICAgICAgICBzZWdtZW50RXZlbnRzW3NlZ21lbnRJbmRleF0ucHVzaChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBQcmlvcml0aXplIHdvcnNlIHN0YXRlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuZ2V0U3RhdGVDb2xvcihldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50U3RhdGUgfHwgdGhpcy5nZXRTdGF0ZVByaW9yaXR5KG5ld1N0YXRlKSA+IHRoaXMuZ2V0U3RhdGVQcmlvcml0eShjdXJyZW50U3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdID0gbmV3U3RhdGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlsbCBpbiBnYXBzIHdpdGggbGFzdCBrbm93biBzdGF0ZVxuICAgICAgICBsZXQgbGFzdEtub3duU3RhdGUgPSAnZ3JleSc7XG4gICAgICAgIGxldCBsYXN0S25vd25FdmVudCA9IG51bGw7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHM7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNlZ21lbnREYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSBzZWdtZW50RGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RLbm93bkV2ZW50ID0gc2VnbWVudEV2ZW50c1tpXVtzZWdtZW50RXZlbnRzW2ldLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudERhdGFbaV0gPSBsYXN0S25vd25TdGF0ZTtcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGxhc3Qga25vd24gZXZlbnQgZm9yIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBpZiAobGFzdEtub3duRXZlbnQgJiYgc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tpXSA9IFt7Li4ubGFzdEtub3duRXZlbnQsIGluaGVyaXRlZDogdHJ1ZX1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVuZGVyIHNlZ21lbnRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRXaWR0aCA9IDEwMCAvIHNlZ21lbnRzO1xuICAgICAgICBzZWdtZW50RGF0YS5mb3JFYWNoKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gdGhpcy5nZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoaW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgc2VnbWVudEV2ZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoJzogYCR7c2VnbWVudFdpZHRofSVgLFxuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0JzogJzEwMCUnLFxuICAgICAgICAgICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IHRoaXMuZ2V0Q29sb3JIZXgoY29sb3IpLFxuICAgICAgICAgICAgICAgICAgICAnYm94LXNpemluZyc6ICdib3JkZXItYm94JyxcbiAgICAgICAgICAgICAgICAgICAgJ2N1cnNvcic6ICdwb2ludGVyJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaHRtbCcsIHRvb2x0aXBDb250ZW50KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXZhcmlhdGlvbicsICdtaW5pJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0aW1lbGluZS5hcHBlbmQoJHNlZ21lbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgd2l0aCBIVE1MIGNvbnRlbnRcbiAgICAgICAgJHRpbWVsaW5lLmZpbmQoJ1tkYXRhLWh0bWxdJykucG9wdXAoe1xuICAgICAgICAgICAgdmFyaWF0aW9uOiAnbWluaScsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBodG1sOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRlIGNvbG9yIGNsYXNzXG4gICAgICovXG4gICAgZ2V0U3RhdGVDb2xvcihzdGF0ZSkge1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSAoc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAneWVsbG93JztcbiAgICAgICAgICAgIGNhc2UgJ09GRic6XG4gICAgICAgICAgICBjYXNlICdSRUpFQ1RFRCc6XG4gICAgICAgICAgICBjYXNlICdVTlJFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnRkFJTEVEJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlZCc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0ZSBwcmlvcml0eSBmb3IgY29uZmxpY3QgcmVzb2x1dGlvblxuICAgICAqL1xuICAgIGdldFN0YXRlUHJpb3JpdHkoY29sb3IpIHtcbiAgICAgICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICAgICAgY2FzZSAncmVkJzogcmV0dXJuIDM7XG4gICAgICAgICAgICBjYXNlICd5ZWxsb3cnOiByZXR1cm4gMjtcbiAgICAgICAgICAgIGNhc2UgJ2dyZWVuJzogcmV0dXJuIDE7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGhleCBjb2xvciBjb2RlXG4gICAgICovXG4gICAgZ2V0Q29sb3JIZXgoY29sb3IpIHtcbiAgICAgICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICAgICAgY2FzZSAnZ3JlZW4nOiByZXR1cm4gJyMyMWJhNDUnO1xuICAgICAgICAgICAgY2FzZSAneWVsbG93JzogcmV0dXJuICcjZmJiZDA4JztcbiAgICAgICAgICAgIGNhc2UgJ3JlZCc6IHJldHVybiAnI2RiMjgyOCc7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gJyM3Njc2NzYnO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc2VnbWVudCB0b29sdGlwIHRleHRcbiAgICAgKi9cbiAgICBnZXRTZWdtZW50VG9vbHRpcChzZWdtZW50SW5kZXgsIHNlZ21lbnREdXJhdGlvbikge1xuICAgICAgICBjb25zdCBob3Vyc0FnbyA9IE1hdGguZmxvb3IoKDk2IC0gc2VnbWVudEluZGV4IC0gMSkgKiBzZWdtZW50RHVyYXRpb24gLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlc0FnbyA9IE1hdGguZmxvb3IoKCg5NiAtIHNlZ21lbnRJbmRleCAtIDEpICogc2VnbWVudER1cmF0aW9uICUgMzYwMCkgLyA2MCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaG91cnNBZ28gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnNBZ2990YcgJHttaW51dGVzQWdvfdC8INC90LDQt9Cw0LRgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXNBZ2990Lwg0L3QsNC30LDQtGA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzZWdtZW50IHRvb2x0aXAgd2l0aCBldmVudHMgZGV0YWlsc1xuICAgICAqL1xuICAgIGdldFNlZ21lbnRUb29sdGlwV2l0aEV2ZW50cyhzZWdtZW50SW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRTdGFydFRpbWUgPSAoc2VnbWVudEluZGV4ICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEVuZFRpbWUgPSAoKHNlZ21lbnRJbmRleCArIDEpICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgcmFuZ2UgZm9yIHRoaXMgc2VnbWVudFxuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgoZGF5QWdvICsgc2VnbWVudFN0YXJ0VGltZSkgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKChkYXlBZ28gKyBzZWdtZW50RW5kVGltZSkgKiAxMDAwKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOiBsZWZ0OyBtaW4td2lkdGg6IDIwMHB4O1wiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBUaW1lIHJhbmdlIGhlYWRlclxuICAgICAgICBodG1sICs9IGA8ZGl2IHN0eWxlPVwiZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbi1ib3R0b206IDVweDtcIj5gO1xuICAgICAgICBodG1sICs9IGAke3N0YXJ0VGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KX0gLSBgO1xuICAgICAgICBodG1sICs9IGAke2VuZFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSl9YDtcbiAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50cyBpbiB0aGlzIHNlZ21lbnRcbiAgICAgICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cImJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkOyBtYXJnaW4tdG9wOiA1cHg7IHBhZGRpbmctdG9wOiA1cHg7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU29ydCBldmVudHMgYnkgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpXG4gICAgICAgICAgICBjb25zdCBzb3J0ZWRFdmVudHMgPSBbLi4uZXZlbnRzXS5zb3J0KChhLCBiKSA9PiAoYi50aW1lc3RhbXAgfHwgMCkgLSAoYS50aW1lc3RhbXAgfHwgMCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHVwIHRvIDMgZXZlbnRzXG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5RXZlbnRzID0gc29ydGVkRXZlbnRzLnNsaWNlKDAsIDMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkaXNwbGF5RXZlbnRzLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IG5ldyBEYXRlKGV2ZW50LnRpbWVzdGFtcCAqIDEwMDApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlIHx8ICd1bmtub3duJztcbiAgICAgICAgICAgICAgICAvLyBDYXBpdGFsaXplIGZpcnN0IGxldHRlciBvZiBzdGF0ZSBmb3IgdHJhbnNsYXRpb24ga2V5XG4gICAgICAgICAgICAgICAgY29uc3QgY2FwaXRhbGl6ZUZpcnN0ID0gKHN0cikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0cikgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW2Bwcl9Qcm92aWRlclN0YXRlJHtjYXBpdGFsaXplRmlyc3Qoc3RhdGUpfWBdIHx8IHN0YXRlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckhleCh0aGlzLmdldFN0YXRlQ29sb3Ioc3RhdGUpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IHN0eWxlPVwibWFyZ2luOiAzcHggMDsgZm9udC1zaXplOiAxMnB4O1wiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzY2NjtcIj4ke2V2ZW50VGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcsIHNlY29uZDogJzItZGlnaXQnfSl9PC9zcGFuPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICR7Y29sb3J9OyBmb250LXdlaWdodDogYm9sZDtcIj7il48gJHtzdGF0ZVRleHR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIFJUVCBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQucnR0KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYCA8c3BhbiBzdHlsZT1cImNvbG9yOiAjOTk5O1wiPigke2V2ZW50LnJ0dH1tcyk8L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTWFyayBpbmhlcml0ZWQgc3RhdGVzXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmluaGVyaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zdHlsZTogaXRhbGljO1wiPijQv9GA0L7QtNC+0LvQttCw0LXRgtGB0Y8pPC9zcGFuPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNvcnRlZEV2ZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDExcHg7IG1hcmdpbi10b3A6IDNweDtcIj7QuCDQtdGJ0LUgJHtzb3J0ZWRFdmVudHMubGVuZ3RoIC0gM30g0YHQvtCx0YvRgtC40LkuLi48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDEycHg7IG1hcmdpbi10b3A6IDVweDtcIj7QndC10YIg0YHQvtCx0YvRgtC40Lkg0LIg0Y3RgtC+0Lwg0L/QtdGA0LjQvtC00LU8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZGlhZ25vc3RpY3MgZGlzcGxheSB3aXRoIHN0YXR1cyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHVwZGF0ZURpYWdub3N0aWNzRGlzcGxheShzdGF0dXNJbmZvKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBSVFRcbiAgICAgICAgY29uc3QgJHJ0dCA9ICQoJyNwcm92aWRlci1ydHQtdmFsdWUnKTtcbiAgICAgICAgY29uc3QgJHJ0dENvbnRhaW5lciA9ICRydHQucGFyZW50KCk7XG4gICAgICAgIGlmICgkcnR0Lmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHN0YXR1c0luZm8ucnR0ICE9PSBudWxsICYmIHN0YXR1c0luZm8ucnR0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBydHRDb2xvciA9IHN0YXR1c0luZm8ucnR0ID4gMjAwID8gJyNkYjI4MjgnIDogc3RhdHVzSW5mby5ydHQgPiAxMDAgPyAnI2ZiYmQwOCcgOiAnIzIxYmE0NSc7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KGAke3N0YXR1c0luZm8ucnR0fSAke2dsb2JhbFRyYW5zbGF0ZS5wcl9NaWxsaXNlY29uZHMgfHwgJ9C80YEnfWApO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsIHJ0dENvbG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KCctLScpO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsICcjNzY3Njc2Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSBkdXJhdGlvbiBhbmQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1cmF0aW9uID0gJCgnI3Byb3ZpZGVyLWR1cmF0aW9uLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRzdGF0ZUxhYmVsID0gJCgnI3Byb3ZpZGVyLXN0YXRlLWxhYmVsJyk7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbkNvbnRhaW5lciA9ICRkdXJhdGlvbi5wYXJlbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHVyYXRpb24ubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgJGR1cmF0aW9uLnRleHQodGhpcy5mb3JtYXREdXJhdGlvbihzdGF0dXNJbmZvLnN0YXRlRHVyYXRpb24pKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlIGxhYmVsIHdpdGggYWN0dWFsIHN0YXRlIHRleHRcbiAgICAgICAgaWYgKCRzdGF0ZUxhYmVsLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW3N0YXR1c0luZm8uc3RhdGVUZXh0XSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNJbmZvLnN0YXRlVGV4dCB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNJbmZvLnN0YXRlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Ch0L7RgdGC0L7Rj9C90LjQtSc7XG4gICAgICAgICAgICAkc3RhdGVMYWJlbC50ZXh0KHN0YXRlVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHN0YXRlIGNvbG9yIHRvIHRoZSBkdXJhdGlvbiB2YWx1ZSBhbmQgbGFiZWxcbiAgICAgICAgaWYgKCRkdXJhdGlvbkNvbnRhaW5lci5sZW5ndGggJiYgc3RhdHVzSW5mby5zdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICBjb25zdCBjb2xvckhleCA9IHRoaXMuZ2V0Q29sb3JIZXgoc3RhdHVzSW5mby5zdGF0ZUNvbG9yKTtcbiAgICAgICAgICAgICRkdXJhdGlvbkNvbnRhaW5lci5jc3MoJ2NvbG9yJywgY29sb3JIZXgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGlzdGljcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0luZm8uc3RhdGlzdGljcykge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBzdGF0dXNJbmZvLnN0YXRpc3RpY3M7XG4gICAgICAgICAgICBjb25zdCAkYXZhaWxhYmlsaXR5ID0gJCgnI3Byb3ZpZGVyLWF2YWlsYWJpbGl0eS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRhdmFpbGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGF2YWlsYWJpbGl0eS50ZXh0KHN0YXRzLmF2YWlsYWJpbGl0eSA/IGAke3N0YXRzLmF2YWlsYWJpbGl0eX0lYCA6ICctLScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tzID0gJCgnI3Byb3ZpZGVyLWNoZWNrcy12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRjaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNoZWNrcy50ZXh0KHN0YXRzLnRvdGFsQ2hlY2tzIHx8ICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4cG9ydCBoaXN0b3J5IHRvIENTViBmaWxlXG4gICAgICovXG4gICAgZXhwb3J0SGlzdG9yeVRvQ1NWKCkge1xuICAgICAgICBjb25zdCAkYnRuID0gJCgnI2V4cG9ydC1oaXN0b3J5LWJ0bicpO1xuICAgICAgICAkYnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgcHJvdmlkZXIgZGV0YWlsc1xuICAgICAgICBjb25zdCBwcm92aWRlckluZm8gPSB7XG4gICAgICAgICAgICBob3N0OiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdob3N0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAndXNlcm5hbWUnKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdkZXNjcmlwdGlvbicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBGZXRjaCBoaXN0b3J5IGRhdGFcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRIaXN0b3J5LyR7dGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKX0vJHt0aGlzLnByb3ZpZGVySWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7IFxuICAgICAgICAgICAgICAgIGxpbWl0OiAxMDAwMCAvLyBHZXQgbW9yZSByZWNvcmRzIGZvciBleHBvcnRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkYnRuLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuZXZlbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG93bmxvYWRDU1YocmVzcG9uc2UuZGF0YS5ldmVudHMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVySWQ6IHRoaXMucHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogdGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC4uLnByb3ZpZGVySW5mb1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUucHJfRXhwb3J0RmFpbGVkIHx8ICdFeHBvcnQgZmFpbGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydCBldmVudHMgdG8gQ1NWIGFuZCB0cmlnZ2VyIGRvd25sb2FkXG4gICAgICovXG4gICAgZG93bmxvYWRDU1YoZXZlbnRzLCBwcm92aWRlckluZm8pIHtcbiAgICAgICAgaWYgKCFldmVudHMgfHwgZXZlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd1dhcm5pbmcoZ2xvYmFsVHJhbnNsYXRlLnByX05vSGlzdG9yeVRvRXhwb3J0IHx8ICdObyBoaXN0b3J5IHRvIGV4cG9ydCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUZWNobmljYWwgaGVhZGVycyB3aXRob3V0IHRyYW5zbGF0aW9uc1xuICAgICAgICBjb25zdCBoZWFkZXJzID0gW1xuICAgICAgICAgICAgJ3RpbWVzdGFtcCcsXG4gICAgICAgICAgICAnZGF0ZXRpbWUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2lkJyxcbiAgICAgICAgICAgICdwcm92aWRlcl90eXBlJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9ob3N0JyxcbiAgICAgICAgICAgICdwcm92aWRlcl91c2VybmFtZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgJ2V2ZW50JyxcbiAgICAgICAgICAgICdldmVudF90eXBlJyxcbiAgICAgICAgICAgICdwcmV2aW91c19zdGF0ZScsXG4gICAgICAgICAgICAnbmV3X3N0YXRlJyxcbiAgICAgICAgICAgICdydHRfbXMnLFxuICAgICAgICAgICAgJ3BlZXJfc3RhdHVzJyxcbiAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXEnLFxuICAgICAgICAgICAgJ3F1YWxpZnlfdGltZScsXG4gICAgICAgICAgICAncmVnaXN0ZXJfc3RhdHVzJyxcbiAgICAgICAgICAgICdjb250YWN0JyxcbiAgICAgICAgICAgICd1c2VyX2FnZW50JyxcbiAgICAgICAgICAgICdsYXN0X3JlZ2lzdHJhdGlvbicsXG4gICAgICAgICAgICAnZGV0YWlscycsXG4gICAgICAgICAgICAnZXJyb3JfbWVzc2FnZScsXG4gICAgICAgICAgICAncmF3X2RhdGEnXG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IGV2ZW50cyB0byBDU1Ygcm93cyB3aXRoIGFsbCB0ZWNobmljYWwgZGF0YVxuICAgICAgICBjb25zdCByb3dzID0gZXZlbnRzLm1hcChldmVudCA9PiB7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGFsbCBhdmFpbGFibGUgZmllbGRzIGZyb20gdGhlIGV2ZW50XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIGV2ZW50LnRpbWVzdGFtcCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5kYXRldGltZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8ucHJvdmlkZXJJZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlIHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby5ob3N0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHByb3ZpZGVySW5mby51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8uZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZXZlbnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQudHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2aW91c1N0YXRlIHx8IGV2ZW50LnByZXZpb3VzX3N0YXRlIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnN0YXRlIHx8IGV2ZW50Lm5ld19zdGF0ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5ydHQgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucGVlclN0YXR1cyB8fCBldmVudC5wZWVyX3N0YXR1cyB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5xdWFsaWZ5RnJlcSB8fCBldmVudC5xdWFsaWZ5X2ZyZXEgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucXVhbGlmeVRpbWUgfHwgZXZlbnQucXVhbGlmeV90aW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnJlZ2lzdGVyU3RhdHVzIHx8IGV2ZW50LnJlZ2lzdGVyX3N0YXR1cyB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5jb250YWN0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnVzZXJBZ2VudCB8fCBldmVudC51c2VyX2FnZW50IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50Lmxhc3RSZWdpc3RyYXRpb24gfHwgZXZlbnQubGFzdF9yZWdpc3RyYXRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZGV0YWlscyB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5lcnJvciB8fCBldmVudC5lcnJvck1lc3NhZ2UgfHwgJycsXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZXZlbnQpIC8vIEluY2x1ZGUgY29tcGxldGUgcmF3IGRhdGFcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIENTViBjb250ZW50IHdpdGggQk9NIGZvciBwcm9wZXIgVVRGLTggZW5jb2RpbmcgaW4gRXhjZWxcbiAgICAgICAgY29uc3QgQk9NID0gJ1xcdUZFRkYnO1xuICAgICAgICBsZXQgY3N2Q29udGVudCA9IEJPTTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtZXRhZGF0YSBoZWFkZXJcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBQcm92aWRlciBFeHBvcnQ6ICR7cHJvdmlkZXJJbmZvLnByb3ZpZGVySWR9ICgke3Byb3ZpZGVySW5mby5wcm92aWRlclR5cGV9KVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgSG9zdDogJHtwcm92aWRlckluZm8uaG9zdH1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIFVzZXJuYW1lOiAke3Byb3ZpZGVySW5mby51c2VybmFtZX1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIERlc2NyaXB0aW9uOiAke3Byb3ZpZGVySW5mby5kZXNjcmlwdGlvbn1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIEV4cG9ydCBEYXRlOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIFRvdGFsIEV2ZW50czogJHtldmVudHMubGVuZ3RofVxcbmA7XG4gICAgICAgIGNzdkNvbnRlbnQgKz0gJ1xcbic7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29sdW1uIGhlYWRlcnNcbiAgICAgICAgY3N2Q29udGVudCArPSBoZWFkZXJzLmpvaW4oJywnKSArICdcXG4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRhdGEgcm93c1xuICAgICAgICByb3dzLmZvckVhY2gocm93ID0+IHtcbiAgICAgICAgICAgIGNzdkNvbnRlbnQgKz0gcm93Lm1hcChjZWxsID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgcXVvdGVzIGFuZCB3cmFwIGluIHF1b3RlcyBpZiBjb250YWlucyBjb21tYSwgbmV3bGluZSwgb3IgcXVvdGVzXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbFN0ciA9IFN0cmluZyhjZWxsKTtcbiAgICAgICAgICAgICAgICBpZiAoY2VsbFN0ci5pbmNsdWRlcygnLCcpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJ1xcbicpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJ1wiJykgfHwgY2VsbFN0ci5pbmNsdWRlcygnIycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgXCIke2NlbGxTdHIucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjZWxsU3RyO1xuICAgICAgICAgICAgfSkuam9pbignLCcpICsgJ1xcbic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGJsb2IgYW5kIGRvd25sb2FkXG4gICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbY3N2Q29udGVudF0sIHsgdHlwZTogJ3RleHQvY3N2O2NoYXJzZXQ9dXRmLTg7JyB9KTtcbiAgICAgICAgY29uc3QgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIGZpbGVuYW1lIHdpdGggcHJvdmlkZXIgSUQgYW5kIHRpbWVzdGFtcFxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBub3cudG9JU09TdHJpbmcoKS5yZXBsYWNlKC9bOi5dL2csICctJykuc3Vic3RyaW5nKDAsIDE5KTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgcHJvdmlkZXJfJHtwcm92aWRlckluZm8ucHJvdmlkZXJJZH1fJHtwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlfV8ke3RpbWVzdGFtcH0uY3N2YDtcbiAgICAgICAgXG4gICAgICAgIGxpbmsuc2V0QXR0cmlidXRlKCdocmVmJywgdXJsKTtcbiAgICAgICAgbGluay5zZXRBdHRyaWJ1dGUoJ2Rvd25sb2FkJywgZmlsZW5hbWUpO1xuICAgICAgICBsaW5rLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIFxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGxpbmspO1xuICAgICAgICBsaW5rLmNsaWNrKCk7XG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQobGluayk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IFVSTC5yZXZva2VPYmplY3RVUkwodXJsKSwgMTAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkdXJhdGlvbiBpbiBzZWNvbmRzIHRvIGh1bWFuLXJlYWRhYmxlIGZvcm1hdCB3aXRoIGxvY2FsaXphdGlvblxuICAgICAqL1xuICAgIGZvcm1hdER1cmF0aW9uKHNlY29uZHMpIHtcbiAgICAgICAgaWYgKCFzZWNvbmRzKSByZXR1cm4gJy0tJztcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKHNlY29uZHMgLyA4NjQwMCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDg2NDAwKSAvIDM2MDApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApIC8gNjApO1xuICAgICAgICBjb25zdCBzZWNzID0gc2Vjb25kcyAlIDYwO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGxvY2FsaXplZCB1bml0c1xuICAgICAgICBjb25zdCBkYXlVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX0RheXMgfHwgJ9C0JztcbiAgICAgICAgY29uc3QgaG91clVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfSG91cnMgfHwgJ9GHJztcbiAgICAgICAgY29uc3QgbWludXRlVW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9NaW51dGVzIHx8ICfQvCc7XG4gICAgICAgIGNvbnN0IHNlY29uZFVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfU2Vjb25kcyB8fCAn0YEnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7ZGF5c30ke2RheVVuaXR9ICR7aG91cnN9JHtob3VyVW5pdH0gJHttaW51dGVzfSR7bWludXRlVW5pdH1gO1xuICAgICAgICB9IGVsc2UgaWYgKGhvdXJzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2hvdXJzfSR7aG91clVuaXR9ICR7bWludXRlc30ke21pbnV0ZVVuaXR9ICR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfSBlbHNlIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXN9JHttaW51dGVVbml0fSAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7c2Vjc30ke3NlY29uZFVuaXR9YDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYW4gdXAgcmVzb3VyY2VzXG4gICAgICovXG4gICAgZGVzdHJveSgpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hhbmdlVGltZW91dCkge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY2hhbmdlVGltZW91dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnBlcmlvZGljSW50ZXJ2YWwpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5wZXJpb2RpY0ludGVydmFsKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVW5zdWJzY3JpYmUgZnJvbSBFdmVudEJ1cyBpZiBzdWJzY3JpYmVkXG4gICAgICAgIGlmICh0aGlzLmlzU3Vic2NyaWJlZCAmJiB0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy51bnN1YnNjcmliZSgncHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBwcm92aWRlciBzdGF0dXMgd29ya2VyIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplKCk7XG59KTtcblxuLy8gQ2xlYW4gdXAgb24gcGFnZSB1bmxvYWRcbiQod2luZG93KS5vbignYmVmb3JldW5sb2FkJywgKCkgPT4ge1xuICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmRlc3Ryb3koKTtcbn0pO1xuXG4vLyBFeHBvcnQgZm9yIGV4dGVybmFsIGFjY2Vzc1xud2luZG93LnByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyID0gcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXI7Il19