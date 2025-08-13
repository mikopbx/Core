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
   * Current provider uniqid
   * @type {string}
   */
  uniqid: '',

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
      console.warn('Unknown provider type from URL:', window.location.pathname);
      return;
    } // Get provider uniqid from form


    this.uniqid = this.$formObj.form('get value', 'uniqid');

    if (!this.uniqid) {
      console.warn('No provider uniqid found in form');
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
      console.warn('EventBus not available, falling back to periodic polling');
      this.startPeriodicUpdate();
      return;
    }

    EventBus.subscribe('provider-status', function (message) {
      _this.handleEventBusMessage(message);
    });
    this.isSubscribed = true;
    console.log("Subscribed to EventBus for provider ".concat(this.uniqid, " (").concat(this.providerType, ")"));
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
      return change.provider_id === _this2.uniqid || change.uniqid === _this2.uniqid;
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


    var providerStatus = ((_data$statuses$this$p = data.statuses[this.providerType]) === null || _data$statuses$this$p === void 0 ? void 0 : _data$statuses$this$p[this.uniqid]) || data.statuses[this.uniqid];

    if (providerStatus) {
      this.updateStatusDisplay(providerStatus);
    }
  },

  /**
   * Handle status error
   */
  handleStatusError: function handleStatusError(data) {
    console.warn('Provider status error:', data); // Show error state

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
        uniqid: this.uniqid,
        type: this.providerType,
        state: statusData.state || statusData.new_state,
        stateColor: statusData.stateColor,
        stateText: statusData.stateText,
        timestamp: new Date().toISOString()
      };
      var htmlTable = "\n                <table class=\"ui very compact table\">\n                    <tr><td>Provider</td><td>".concat(debugInfo.uniqid, "</td></tr>\n                    <tr><td>Type</td><td>").concat(debugInfo.type, "</td></tr>\n                    <tr><td>State</td><td>").concat(debugInfo.state, "</td></tr>\n                    <tr><td>Color</td><td>").concat(debugInfo.stateColor, "</td></tr>\n                    <tr><td>Updated</td><td>").concat(debugInfo.timestamp, "</td></tr>\n                </table>\n            ");
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

    ProvidersAPI.getStatusById(this.uniqid, this.providerType, function (response) {
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
    console.warn('Provider status request error:', error);
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
            if (_this4.uniqid) {
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

    $('#check-now-btn').off('click').on('click', function () {
      $('#check-now-btn').addClass('loading');
      $.api({
        url: "/pbxcore/api/v2/providers/getStatus/".concat(_this6.providerType.toUpperCase(), "/").concat(_this6.uniqid),
        method: 'GET',
        data: {
          forceCheck: true
        },
        on: 'now',
        successTest: PbxApi.successTest,
        onSuccess: function onSuccess(response) {
          $('#check-now-btn').removeClass('loading');

          if (response.result && response.data) {
            _this6.updateStatusDisplay(response.data); // Reload timeline after force check


            _this6.loadTimelineData();
          }
        },
        onFailure: function onFailure() {
          $('#check-now-btn').removeClass('loading');
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
      url: "/pbxcore/api/v2/providers/getHistory/".concat(this.providerType.toUpperCase(), "/").concat(this.uniqid),
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
    $btn.addClass('loading'); // First get provider details

    var providerHost = this.$formObj.form('get value', 'host');
    var providerUsername = this.$formObj.form('get value', 'username');
    var providerDescription = this.$formObj.form('get value', 'description'); // Fetch history data

    $.api({
      url: "/pbxcore/api/v2/providers/getHistory/".concat(this.providerType.toUpperCase(), "/").concat(this.uniqid),
      method: 'GET',
      data: {
        limit: 10000 // Get more records for export

      },
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        $btn.removeClass('loading');

        if (response.result && response.data && response.data.events) {
          _this10.downloadCSV(response.data.events, {
            providerId: _this10.uniqid,
            providerType: _this10.providerType.toUpperCase(),
            host: providerHost,
            username: providerUsername,
            description: providerDescription
          });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItbW9kaWZ5LXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCIkZm9ybU9iaiIsIiQiLCIkc3RhdHVzIiwicHJvdmlkZXJUeXBlIiwidW5pcWlkIiwiaXNTdWJzY3JpYmVkIiwibGFzdFN0YXR1cyIsImRpYWdub3N0aWNzSW5pdGlhbGl6ZWQiLCJoaXN0b3J5VGFibGUiLCJzdGF0dXNEYXRhIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJpbmNsdWRlcyIsImNvbnNvbGUiLCJ3YXJuIiwiZm9ybSIsIkRlYnVnZ2VySW5mbyIsInN1YnNjcmliZVRvRXZlbnRCdXMiLCJyZXF1ZXN0SW5pdGlhbFN0YXR1cyIsInNldHVwRm9ybUNoYW5nZURldGVjdGlvbiIsIkV2ZW50QnVzIiwic3RhcnRQZXJpb2RpY1VwZGF0ZSIsInN1YnNjcmliZSIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudEJ1c01lc3NhZ2UiLCJsb2ciLCJkYXRhIiwiZXZlbnQiLCJwcm9jZXNzU3RhdHVzVXBkYXRlIiwicHJvY2Vzc0NvbXBsZXRlU3RhdHVzIiwiaGFuZGxlU3RhdHVzRXJyb3IiLCJjaGFuZ2VzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVsZXZhbnRDaGFuZ2UiLCJmaW5kIiwiY2hhbmdlIiwicHJvdmlkZXJfaWQiLCJ1cGRhdGVTdGF0dXNEaXNwbGF5Iiwic3RhdHVzZXMiLCJwcm92aWRlclN0YXR1cyIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJlcnJvclRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9TdGF0dXNFcnJvciIsImh0bWwiLCJkZWJ1Z0luZm8iLCJ0eXBlIiwic3RhdGUiLCJuZXdfc3RhdGUiLCJzdGF0ZUNvbG9yIiwic3RhdGVUZXh0IiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiaHRtbFRhYmxlIiwiVXBkYXRlQ29udGVudCIsInVwZGF0ZVN0YXR1c1dpdGhCYWNrZW5kUHJvcGVydGllcyIsInVwZGF0ZVN0YXR1c0xlZ2FjeSIsInVwZGF0ZURpYWdub3N0aWNzRGlzcGxheSIsInN0YXRlSWNvbiIsInN0YXRlRGVzY3JpcHRpb24iLCJzdGF0dXNDb250ZW50IiwiZGlzcGxheVRleHQiLCJub3JtYWxpemVkU3RhdGUiLCJ0b1VwcGVyQ2FzZSIsInByX09ubGluZSIsInByX1dpdGhvdXRSZWdpc3RyYXRpb24iLCJwcl9PZmZsaW5lIiwicHJfQ2hlY2tpbmdTdGF0dXMiLCJQcm92aWRlcnNBUEkiLCJnZXRTdGF0dXNCeUlkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwcl9Ob3RGb3VuZCIsImhhbmRsZVJlcXVlc3RFcnJvciIsImVycm9yIiwicHJfQ29ubmVjdGlvbkVycm9yIiwia2V5RmllbGRzIiwiZm9yRWFjaCIsImZpZWxkTmFtZSIsIiRmaWVsZCIsImxlbmd0aCIsIm9uIiwiY2xlYXJUaW1lb3V0IiwiY2hhbmdlVGltZW91dCIsInNldFRpbWVvdXQiLCJwZXJpb2RpY0ludGVydmFsIiwic2V0SW50ZXJ2YWwiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJpbml0aWFsaXplVGltZWxpbmUiLCJvZmYiLCJhcGkiLCJ1cmwiLCJtZXRob2QiLCJmb3JjZUNoZWNrIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJvblN1Y2Nlc3MiLCJsb2FkVGltZWxpbmVEYXRhIiwib25GYWlsdXJlIiwiZXhwb3J0SGlzdG9yeVRvQ1NWIiwibGltaXQiLCJldmVudHMiLCJyZW5kZXJUaW1lbGluZSIsIiR0aW1lbGluZSIsIiRjb250YWluZXIiLCJlbXB0eSIsIm5vdyIsIk1hdGgiLCJmbG9vciIsImRheUFnbyIsInRpbWVSYW5nZSIsInNlZ21lbnREdXJhdGlvbiIsInNlZ21lbnRzIiwiY2VpbCIsInNlZ21lbnREYXRhIiwiZmlsbCIsInNlZ21lbnRFdmVudHMiLCJtYXAiLCJzZWdtZW50SW5kZXgiLCJwdXNoIiwiY3VycmVudFN0YXRlIiwibmV3U3RhdGUiLCJnZXRTdGF0ZUNvbG9yIiwiZ2V0U3RhdGVQcmlvcml0eSIsImxhc3RLbm93blN0YXRlIiwibGFzdEtub3duRXZlbnQiLCJpIiwiaW5oZXJpdGVkIiwic2VnbWVudFdpZHRoIiwiY29sb3IiLCJpbmRleCIsInRvb2x0aXBDb250ZW50IiwiZ2V0U2VnbWVudFRvb2x0aXBXaXRoRXZlbnRzIiwiJHNlZ21lbnQiLCJjc3MiLCJnZXRDb2xvckhleCIsImF0dHIiLCJhcHBlbmQiLCJwb3B1cCIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImdldFNlZ21lbnRUb29sdGlwIiwiaG91cnNBZ28iLCJtaW51dGVzQWdvIiwic2VnbWVudFN0YXJ0VGltZSIsInNlZ21lbnRFbmRUaW1lIiwic3RhcnRUaW1lIiwiZW5kVGltZSIsInRvTG9jYWxlVGltZVN0cmluZyIsImhvdXIiLCJtaW51dGUiLCJzb3J0ZWRFdmVudHMiLCJzb3J0IiwiYSIsImIiLCJkaXNwbGF5RXZlbnRzIiwic2xpY2UiLCJldmVudFRpbWUiLCJjYXBpdGFsaXplRmlyc3QiLCJzdHIiLCJjaGFyQXQiLCJ0b0xvd2VyQ2FzZSIsInNlY29uZCIsInJ0dCIsInN0YXR1c0luZm8iLCIkcnR0IiwiJHJ0dENvbnRhaW5lciIsInBhcmVudCIsInVuZGVmaW5lZCIsInJ0dENvbG9yIiwidGV4dCIsInByX01pbGxpc2Vjb25kcyIsIiRkdXJhdGlvbiIsIiRzdGF0ZUxhYmVsIiwiJGR1cmF0aW9uQ29udGFpbmVyIiwic3RhdGVEdXJhdGlvbiIsImZvcm1hdER1cmF0aW9uIiwicHJfQ3VycmVudFN0YXRlIiwiY29sb3JIZXgiLCJzdGF0aXN0aWNzIiwic3RhdHMiLCIkYXZhaWxhYmlsaXR5IiwiYXZhaWxhYmlsaXR5IiwiJGNoZWNrcyIsInRvdGFsQ2hlY2tzIiwiJGJ0biIsInByb3ZpZGVySG9zdCIsInByb3ZpZGVyVXNlcm5hbWUiLCJwcm92aWRlckRlc2NyaXB0aW9uIiwiZG93bmxvYWRDU1YiLCJwcm92aWRlcklkIiwiaG9zdCIsInVzZXJuYW1lIiwiZGVzY3JpcHRpb24iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsInByX0V4cG9ydEZhaWxlZCIsInByb3ZpZGVySW5mbyIsInNob3dXYXJuaW5nIiwicHJfTm9IaXN0b3J5VG9FeHBvcnQiLCJoZWFkZXJzIiwicm93cyIsImRhdGV0aW1lIiwicHJldmlvdXNTdGF0ZSIsInByZXZpb3VzX3N0YXRlIiwicGVlclN0YXR1cyIsInBlZXJfc3RhdHVzIiwicXVhbGlmeUZyZXEiLCJxdWFsaWZ5X2ZyZXEiLCJxdWFsaWZ5VGltZSIsInF1YWxpZnlfdGltZSIsInJlZ2lzdGVyU3RhdHVzIiwicmVnaXN0ZXJfc3RhdHVzIiwiY29udGFjdCIsInVzZXJBZ2VudCIsInVzZXJfYWdlbnQiLCJsYXN0UmVnaXN0cmF0aW9uIiwibGFzdF9yZWdpc3RyYXRpb24iLCJkZXRhaWxzIiwiZXJyb3JNZXNzYWdlIiwiSlNPTiIsInN0cmluZ2lmeSIsIkJPTSIsImNzdkNvbnRlbnQiLCJqb2luIiwicm93IiwiY2VsbCIsImNlbGxTdHIiLCJTdHJpbmciLCJyZXBsYWNlIiwiYmxvYiIsIkJsb2IiLCJVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJsaW5rIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50Iiwic3Vic3RyaW5nIiwiZmlsZW5hbWUiLCJzZXRBdHRyaWJ1dGUiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwicmV2b2tlT2JqZWN0VVJMIiwic2Vjb25kcyIsImRheXMiLCJob3VycyIsIm1pbnV0ZXMiLCJzZWNzIiwiZGF5VW5pdCIsInByX0RheXMiLCJob3VyVW5pdCIsInByX0hvdXJzIiwibWludXRlVW5pdCIsInByX01pbnV0ZXMiLCJzZWNvbmRVbml0IiwicHJfU2Vjb25kcyIsImRlc3Ryb3kiLCJjbGVhckludGVydmFsIiwidW5zdWJzY3JpYmUiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtB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K0IscUJBcTdCckI7QUFDTixRQUFJLEtBQUtqTCxhQUFULEVBQXdCO0FBQ3BCRCxNQUFBQSxZQUFZLENBQUMsS0FBS0MsYUFBTixDQUFaO0FBQ0g7O0FBRUQsUUFBSSxLQUFLRSxnQkFBVCxFQUEyQjtBQUN2QmdMLE1BQUFBLGFBQWEsQ0FBQyxLQUFLaEwsZ0JBQU4sQ0FBYjtBQUNILEtBUEssQ0FTTjs7O0FBQ0EsUUFBSSxLQUFLckYsWUFBTCxJQUFxQixPQUFPaUIsUUFBUCxLQUFvQixXQUE3QyxFQUEwRDtBQUN0REEsTUFBQUEsUUFBUSxDQUFDcVAsV0FBVCxDQUFxQixpQkFBckI7QUFDQSxXQUFLdFEsWUFBTCxHQUFvQixLQUFwQjtBQUNIO0FBQ0o7QUFuOEI4QixDQUFuQyxDLENBdThCQTs7QUFDQUosQ0FBQyxDQUFDK08sUUFBRCxDQUFELENBQVk0QixLQUFaLENBQWtCLFlBQU07QUFDcEI3USxFQUFBQSwwQkFBMEIsQ0FBQ1csVUFBM0I7QUFDSCxDQUZELEUsQ0FJQTs7QUFDQVQsQ0FBQyxDQUFDVSxNQUFELENBQUQsQ0FBVTJFLEVBQVYsQ0FBYSxjQUFiLEVBQTZCLFlBQU07QUFDL0J2RixFQUFBQSwwQkFBMEIsQ0FBQzBRLE9BQTNCO0FBQ0gsQ0FGRCxFLENBSUE7O0FBQ0E5UCxNQUFNLENBQUNaLDBCQUFQLEdBQW9DQSwwQkFBcEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIERlYnVnZ2VySW5mbywgRXZlbnRCdXMsIGdsb2JhbFJvb3RVcmwsIFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIFByb3ZpZGVyIFN0YXR1cyBXb3JrZXIgZm9yIE1vZGlmeSBQYWdlXG4gKiBIYW5kbGVzIHJlYWwtdGltZSBwcm92aWRlciBzdGF0dXMgdXBkYXRlcyB2aWEgRXZlbnRCdXMgZm9yIGluZGl2aWR1YWwgcHJvdmlkZXIgZWRpdCBwYWdlc1xuICogUmVwbGFjZXMgdGhlIG9sZCBwb2xsaW5nLWJhc2VkIGFwcHJvYWNoIHdpdGggZWZmaWNpZW50IEV2ZW50QnVzIHN1YnNjcmlwdGlvblxuICpcbiAqIEBtb2R1bGUgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXJcbiAqL1xuY29uc3QgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLXByb3ZpZGVyLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdGF0dXMgbGFiZWxcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdGF0dXM6ICQoJyNzdGF0dXMnKSxcblxuICAgIC8qKlxuICAgICAqIFByb3ZpZGVyIHR5cGUgZGV0ZXJtaW5lZCBmcm9tIHRoZSBwYWdlIFVSTFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcHJvdmlkZXJUeXBlOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHByb3ZpZGVyIHVuaXFpZFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgdW5pcWlkOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFdmVudEJ1cyBzdWJzY3JpcHRpb24gc3RhdHVzXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNTdWJzY3JpYmVkOiBmYWxzZSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIHByb3ZpZGVyIHN0YXR1c1xuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgbGFzdFN0YXR1czogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEaWFnbm9zdGljcyB0YWIgaW5pdGlhbGl6ZWQgZmxhZ1xuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGRpYWdub3N0aWNzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpc3RvcnkgRGF0YVRhYmxlIGluc3RhbmNlXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBoaXN0b3J5VGFibGU6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudCBzdGF0dXMgZGF0YSBmb3IgZGlhZ25vc3RpY3NcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIHN0YXR1c0RhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBzdGF0dXMgd29ya2VyIHdpdGggRXZlbnRCdXMgc3Vic2NyaXB0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lIHByb3ZpZGVyIHR5cGUgYW5kIHVuaXFpZFxuICAgICAgICBpZiAod2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLmluY2x1ZGVzKCdtb2RpZnlzaXAnKSkge1xuICAgICAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSAnc2lwJztcbiAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuaW5jbHVkZXMoJ21vZGlmeWlheCcpKSB7XG4gICAgICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9ICdpYXgnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmtub3duIHByb3ZpZGVyIHR5cGUgZnJvbSBVUkw6Jywgd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHByb3ZpZGVyIHVuaXFpZCBmcm9tIGZvcm1cbiAgICAgICAgdGhpcy51bmlxaWQgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1bmlxaWQnKTtcbiAgICAgICAgaWYgKCF0aGlzLnVuaXFpZCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdObyBwcm92aWRlciB1bmlxaWQgZm91bmQgaW4gZm9ybScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlYnVnZ2VyIGluZm9cbiAgICAgICAgaWYgKHR5cGVvZiBEZWJ1Z2dlckluZm8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBEZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudEJ1cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBpbml0aWFsIHN0YXR1c1xuICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHJlZnJlc2ggc3RhdHVzXG4gICAgICAgIHRoaXMuc2V0dXBGb3JtQ2hhbmdlRGV0ZWN0aW9uKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudEJ1cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRXZlbnRCdXMgbm90IGF2YWlsYWJsZSwgZmFsbGluZyBiYWNrIHRvIHBlcmlvZGljIHBvbGxpbmcnKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnRQZXJpb2RpY1VwZGF0ZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzU3Vic2NyaWJlZCA9IHRydWU7XG4gICAgICAgIGNvbnNvbGUubG9nKGBTdWJzY3JpYmVkIHRvIEV2ZW50QnVzIGZvciBwcm92aWRlciAke3RoaXMudW5pcWlkfSAoJHt0aGlzLnByb3ZpZGVyVHlwZX0pYCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZSBmb3IgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgIW1lc3NhZ2UuZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRyYWN0IGV2ZW50IGFuZCBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c191cGRhdGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfZXJyb3InOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIElnbm9yZSBvdGhlciBldmVudHNcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgc3RhdHVzIGNoYW5nZSBmb3Igb3VyIHNwZWNpZmljIHByb3ZpZGVyXG4gICAgICAgIGNvbnN0IHJlbGV2YW50Q2hhbmdlID0gZGF0YS5jaGFuZ2VzLmZpbmQoY2hhbmdlID0+IFxuICAgICAgICAgICAgY2hhbmdlLnByb3ZpZGVyX2lkID09PSB0aGlzLnVuaXFpZCB8fCBjaGFuZ2UudW5pcWlkID09PSB0aGlzLnVuaXFpZFxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlbGV2YW50Q2hhbmdlKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0Rpc3BsYXkocmVsZXZhbnRDaGFuZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbXBsZXRlIHN0YXR1cyBkYXRhXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLnN0YXR1c2VzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIExvb2sgZm9yIG91ciBwcm92aWRlciBpbiB0aGUgc3RhdHVzIGRhdGFcbiAgICAgICAgY29uc3QgcHJvdmlkZXJTdGF0dXMgPSBkYXRhLnN0YXR1c2VzW3RoaXMucHJvdmlkZXJUeXBlXT8uW3RoaXMudW5pcWlkXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5zdGF0dXNlc1t0aGlzLnVuaXFpZF07XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJTdGF0dXMpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzRGlzcGxheShwcm92aWRlclN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdGF0dXMgZXJyb3JcbiAgICAgKi9cbiAgICBoYW5kbGVTdGF0dXNFcnJvcihkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignUHJvdmlkZXIgc3RhdHVzIGVycm9yOicsIGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBlcnJvciBzdGF0ZVxuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IGdyZXkgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgIGNvbnN0IGVycm9yVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNFcnJvciB8fCAnU3RhdHVzIEVycm9yJztcbiAgICAgICAgdGhpcy4kc3RhdHVzLmh0bWwoYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gJHtlcnJvclRleHR9YCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3RhdHVzIGRpc3BsYXkgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBwcm9wZXJ0aWVzIG9yIGZhbGxiYWNrXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzRGlzcGxheShzdGF0dXNEYXRhKSB7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBsYXN0IHN0YXR1cyBmb3IgZGVidWdnaW5nXG4gICAgICAgIHRoaXMubGFzdFN0YXR1cyA9IHN0YXR1c0RhdGE7XG4gICAgICAgIFxuICAgICAgICAvLyBTYXZlIHN0YXR1cyBkYXRhIGZvciBkaWFnbm9zdGljc1xuICAgICAgICB0aGlzLnN0YXR1c0RhdGEgPSBzdGF0dXNEYXRhO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIERlYnVnZ2VySW5mbyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBEZWJ1Z2dlckluZm8gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zdCBkZWJ1Z0luZm8gPSB7XG4gICAgICAgICAgICAgICAgdW5pcWlkOiB0aGlzLnVuaXFpZCxcbiAgICAgICAgICAgICAgICB0eXBlOiB0aGlzLnByb3ZpZGVyVHlwZSxcbiAgICAgICAgICAgICAgICBzdGF0ZTogc3RhdHVzRGF0YS5zdGF0ZSB8fCBzdGF0dXNEYXRhLm5ld19zdGF0ZSxcbiAgICAgICAgICAgICAgICBzdGF0ZUNvbG9yOiBzdGF0dXNEYXRhLnN0YXRlQ29sb3IsXG4gICAgICAgICAgICAgICAgc3RhdGVUZXh0OiBzdGF0dXNEYXRhLnN0YXRlVGV4dCxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgaHRtbFRhYmxlID0gYFxuICAgICAgICAgICAgICAgIDx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPlxuICAgICAgICAgICAgICAgICAgICA8dHI+PHRkPlByb3ZpZGVyPC90ZD48dGQ+JHtkZWJ1Z0luZm8udW5pcWlkfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5UeXBlPC90ZD48dGQ+JHtkZWJ1Z0luZm8udHlwZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+U3RhdGU8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZX08L3RkPjwvdHI+XG4gICAgICAgICAgICAgICAgICAgIDx0cj48dGQ+Q29sb3I8L3RkPjx0ZD4ke2RlYnVnSW5mby5zdGF0ZUNvbG9yfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICAgICAgPHRyPjx0ZD5VcGRhdGVkPC90ZD48dGQ+JHtkZWJ1Z0luZm8udGltZXN0YW1wfTwvdGQ+PC90cj5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc3RhdGVDb2xvciAmJiBzdGF0dXNEYXRhLnN0YXRlVGV4dCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsZWdhY3kgc3RhdGUtYmFzZWQgdXBkYXRlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1c0xlZ2FjeShzdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRpYWdub3N0aWNzIGRpc3BsYXkgaWYgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuZGlhZ25vc3RpY3NJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkoc3RhdHVzRGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNXaXRoQmFja2VuZFByb3BlcnRpZXMoc3RhdHVzRGF0YSkge1xuICAgICAgICBjb25zdCB7IHN0YXRlQ29sb3IsIHN0YXRlSWNvbiwgc3RhdGVUZXh0LCBzdGF0ZURlc2NyaXB0aW9uLCBzdGF0ZSB9ID0gc3RhdHVzRGF0YTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IGNvbG9yIGNsYXNzXG4gICAgICAgIHRoaXMuJHN0YXR1c1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgZ3JleSByZWQgbG9hZGluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3Moc3RhdGVDb2xvcik7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzdGF0dXMgY29udGVudCB3aXRoIGljb24gYW5kIHRyYW5zbGF0ZWQgdGV4dFxuICAgICAgICBsZXQgc3RhdHVzQ29udGVudCA9ICcnO1xuICAgICAgICBpZiAoc3RhdGVJY29uKSB7XG4gICAgICAgICAgICBzdGF0dXNDb250ZW50ICs9IGA8aSBjbGFzcz1cIiR7c3RhdGVJY29ufSBpY29uXCI+PC9pPiBgO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdHJhbnNsYXRlZCB0ZXh0IG9yIGZhbGxiYWNrXG4gICAgICAgIGNvbnN0IGRpc3BsYXlUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW3N0YXRlVGV4dF0gfHwgc3RhdGVUZXh0IHx8IHN0YXRlIHx8ICdVbmtub3duJztcbiAgICAgICAgc3RhdHVzQ29udGVudCArPSBkaXNwbGF5VGV4dDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuJHN0YXR1cy5odG1sKHN0YXR1c0NvbnRlbnQpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTGVnYWN5IHN0YXR1cyB1cGRhdGUgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXNMZWdhY3koc3RhdHVzRGF0YSkge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IHN0YXR1c0RhdGEuc3RhdGUgfHwgc3RhdHVzRGF0YS5uZXdfc3RhdGUgfHwgJyc7XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRTdGF0ZSA9IHN0YXRlLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBjbGFzcyBhbmQgdXBkYXRlIGJhc2VkIG9uIHN0YXRlXG4gICAgICAgIHRoaXMuJHN0YXR1cy5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChub3JtYWxpemVkU3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1JFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnT0snOlxuICAgICAgICAgICAgY2FzZSAnUkVBQ0hBQkxFJzpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmV5IHllbGxvdyByZWQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2dyZWVuJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwiY2hlY2ttYXJrIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX09ubGluZSB8fCAnT25saW5lJ31gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVBQ0hBQkxFJzpcbiAgICAgICAgICAgIGNhc2UgJ0xBR0dFRCc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4gZ3JleSByZWQnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3llbGxvdycpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX1dpdGhvdXRSZWdpc3RyYXRpb24gfHwgJ1dpdGhvdXQgUmVnaXN0cmF0aW9uJ31gKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ09GRic6XG4gICAgICAgICAgICBjYXNlICdVTk1PTklUT1JFRCc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cIm1pbnVzIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX09mZmxpbmUgfHwgJ09mZmxpbmUnfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnUkVKRUNURUQnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ0ZBSUxFRCc6XG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IGdyZXknKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInRpbWVzIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX09mZmxpbmUgfHwgJ09mZmxpbmUnfWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdncmVlbiB5ZWxsb3cgcmVkJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdncmV5JylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwicXVlc3Rpb24gaWNvblwiPjwvaT4gJHtzdGF0ZSB8fCAnVW5rbm93bid9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW5pdGlhbCBzdGF0dXMgZm9yIHRoZSBwcm92aWRlclxuICAgICAqL1xuICAgIHJlcXVlc3RJbml0aWFsU3RhdHVzKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2dyZWVuIHllbGxvdyBncmV5IHJlZCcpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2xvYWRpbmcnKVxuICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic3Bpbm5lciBsb2FkaW5nIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNraW5nU3RhdHVzIHx8ICdDaGVja2luZy4uLid9YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyBmb3IgdGhpcyBzcGVjaWZpYyBwcm92aWRlciB2aWEgUkVTVCBBUEkgVjJcbiAgICAgICAgLy8gUGFzcyBwcm92aWRlciB0eXBlIGZvciBvcHRpbWl6ZWQgbG9va3VwXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXNCeUlkKHRoaXMudW5pcWlkLCB0aGlzLnByb3ZpZGVyVHlwZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzdGF0dXMucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGRpc3BsYXkgd2l0aCB0aGUgcHJvdmlkZXIgc3RhdHVzXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZXIgbm90IGZvdW5kIG9yIGVycm9yXG4gICAgICAgICAgICAgICAgdGhpcy4kc3RhdHVzXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZ3JlZW4geWVsbG93IHJlZCcpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZ3JleScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInF1ZXN0aW9uIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnByX05vdEZvdW5kIHx8ICdOb3QgRm91bmQnfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVJlcXVlc3RFcnJvcignSW52YWxpZCByZXNwb25zZSBmb3JtYXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVxdWVzdCBlcnJvcnNcbiAgICAgKi9cbiAgICBoYW5kbGVSZXF1ZXN0RXJyb3IoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdQcm92aWRlciBzdGF0dXMgcmVxdWVzdCBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgIFxuICAgICAgICB0aGlzLiRzdGF0dXNcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbG9hZGluZyBncmVlbiB5ZWxsb3cgZ3JleScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZCcpXG4gICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5wcl9Db25uZWN0aW9uRXJyb3IgfHwgJ0Vycm9yJ31gKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byByZWZyZXNoIHN0YXR1cyB3aGVuIHByb3ZpZGVyIHNldHRpbmdzIGNoYW5nZVxuICAgICAqL1xuICAgIHNldHVwRm9ybUNoYW5nZURldGVjdGlvbigpIHtcbiAgICAgICAgLy8gTW9uaXRvciBrZXkgZmllbGRzIHRoYXQgbWlnaHQgYWZmZWN0IHByb3ZpZGVyIHN0YXR1c1xuICAgICAgICBjb25zdCBrZXlGaWVsZHMgPSBbJ2hvc3QnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ2Rpc2FibGVkJ107XG4gICAgICAgIFxuICAgICAgICBrZXlGaWVsZHMuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gdGhpcy4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRmaWVsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkZmllbGQub24oJ2NoYW5nZSBibHVyJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZWJvdW5jZSBzdGF0dXMgcmVxdWVzdHNcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuY2hhbmdlVGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudW5pcWlkKSB7IC8vIE9ubHkgcmVxdWVzdCBpZiB3ZSBoYXZlIGEgdmFsaWQgcHJvdmlkZXIgSURcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RJbml0aWFsU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMDApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIHBlcmlvZGljIHVwZGF0ZSBmb3Igd2hlbiBFdmVudEJ1cyBpcyBub3QgYXZhaWxhYmxlXG4gICAgICovXG4gICAgc3RhcnRQZXJpb2RpY1VwZGF0ZSgpIHtcbiAgICAgICAgdGhpcy5wZXJpb2RpY0ludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0SW5pdGlhbFN0YXR1cygpO1xuICAgICAgICB9LCA1MDAwKTsgLy8gQ2hlY2sgZXZlcnkgNSBzZWNvbmRzIGFzIGZhbGxiYWNrXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCkge1xuICAgICAgICBpZiAodGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGltZWxpbmVcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGltZWxpbmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcmNlIGNoZWNrIGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICQoJyNjaGVjay1ub3ctYnRuJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgICQoJyNjaGVjay1ub3ctYnRuJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IGAvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldFN0YXR1cy8ke3RoaXMucHJvdmlkZXJUeXBlLnRvVXBwZXJDYXNlKCl9LyR7dGhpcy51bmlxaWR9YCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgXG4gICAgICAgICAgICAgICAgICAgIGZvcmNlQ2hlY2s6IHRydWUgXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcjY2hlY2stbm93LWJ0bicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXNEaXNwbGF5KHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVsb2FkIHRpbWVsaW5lIGFmdGVyIGZvcmNlIGNoZWNrXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUaW1lbGluZURhdGEoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNjaGVjay1ub3ctYnRuJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHBvcnQgaGlzdG9yeSBidXR0b24gaGFuZGxlclxuICAgICAgICAkKCcjZXhwb3J0LWhpc3RvcnktYnRuJykub2ZmKCdjbGljaycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuZXhwb3J0SGlzdG9yeVRvQ1NWKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzcGxheSBjdXJyZW50IHN0YXR1cyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHRoaXMuc3RhdHVzRGF0YSkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVEaWFnbm9zdGljc0Rpc3BsYXkodGhpcy5zdGF0dXNEYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5kaWFnbm9zdGljc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGltZWxpbmUgdmlzdWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVUaW1lbGluZSgpIHtcbiAgICAgICAgLy8gTG9hZCB0aW1lbGluZSBkYXRhXG4gICAgICAgIHRoaXMubG9hZFRpbWVsaW5lRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCB0aW1lbGluZSBkYXRhIGZyb20gaGlzdG9yeVxuICAgICAqL1xuICAgIGxvYWRUaW1lbGluZURhdGEoKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYC9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0SGlzdG9yeS8ke3RoaXMucHJvdmlkZXJUeXBlLnRvVXBwZXJDYXNlKCl9LyR7dGhpcy51bmlxaWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7IFxuICAgICAgICAgICAgICAgIGxpbWl0OiAxMDAwIFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclRpbWVsaW5lKHJlc3BvbnNlLmRhdGEuZXZlbnRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCgnI3RpbWVsaW5lLWxvYWRlcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCcjdGltZWxpbmUtbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aW1lbGluZSB2aXN1YWxpemF0aW9uXG4gICAgICovXG4gICAgcmVuZGVyVGltZWxpbmUoZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0ICR0aW1lbGluZSA9ICQoJyNwcm92aWRlci10aW1lbGluZScpO1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI3Byb3ZpZGVyLXRpbWVsaW5lLWNvbnRhaW5lcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkdGltZWxpbmUubGVuZ3RoIHx8ICFldmVudHMgfHwgZXZlbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyB0aW1lbGluZVxuICAgICAgICAkdGltZWxpbmUuZW1wdHkoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aW1lIHJhbmdlIChsYXN0IDI0IGhvdXJzKVxuICAgICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcbiAgICAgICAgY29uc3QgZGF5QWdvID0gbm93IC0gKDI0ICogNjAgKiA2MCk7XG4gICAgICAgIGNvbnN0IHRpbWVSYW5nZSA9IDI0ICogNjAgKiA2MDsgLy8gMjQgaG91cnMgaW4gc2Vjb25kc1xuICAgICAgICBcbiAgICAgICAgLy8gR3JvdXAgZXZlbnRzIGJ5IHRpbWUgc2VnbWVudHMgKDE1IG1pbnV0ZSBzZWdtZW50cylcbiAgICAgICAgY29uc3Qgc2VnbWVudER1cmF0aW9uID0gMTUgKiA2MDsgLy8gMTUgbWludXRlcyBpbiBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRzID0gTWF0aC5jZWlsKHRpbWVSYW5nZSAvIHNlZ21lbnREdXJhdGlvbik7XG4gICAgICAgIGNvbnN0IHNlZ21lbnREYXRhID0gbmV3IEFycmF5KHNlZ21lbnRzKS5maWxsKG51bGwpO1xuICAgICAgICBjb25zdCBzZWdtZW50RXZlbnRzID0gbmV3IEFycmF5KHNlZ21lbnRzKS5maWxsKG51bGwpLm1hcCgoKSA9PiBbXSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGV2ZW50cyBhbmQgc3RvcmUgdGhlbSBpbiBzZWdtZW50c1xuICAgICAgICBldmVudHMuZm9yRWFjaChldmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQudGltZXN0YW1wICYmIGV2ZW50LnRpbWVzdGFtcCA+PSBkYXlBZ28pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWdtZW50SW5kZXggPSBNYXRoLmZsb29yKChldmVudC50aW1lc3RhbXAgLSBkYXlBZ28pIC8gc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEluZGV4ID49IDAgJiYgc2VnbWVudEluZGV4IDwgc2VnbWVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgZXZlbnQgaW4gc2VnbWVudFxuICAgICAgICAgICAgICAgICAgICBzZWdtZW50RXZlbnRzW3NlZ21lbnRJbmRleF0ucHVzaChldmVudCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBQcmlvcml0aXplIHdvcnNlIHN0YXRlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdTdGF0ZSA9IHRoaXMuZ2V0U3RhdGVDb2xvcihldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50U3RhdGUgfHwgdGhpcy5nZXRTdGF0ZVByaW9yaXR5KG5ld1N0YXRlKSA+IHRoaXMuZ2V0U3RhdGVQcmlvcml0eShjdXJyZW50U3RhdGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWdtZW50RGF0YVtzZWdtZW50SW5kZXhdID0gbmV3U3RhdGU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRmlsbCBpbiBnYXBzIHdpdGggbGFzdCBrbm93biBzdGF0ZVxuICAgICAgICBsZXQgbGFzdEtub3duU3RhdGUgPSAnZ3JleSc7XG4gICAgICAgIGxldCBsYXN0S25vd25FdmVudCA9IG51bGw7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc2VnbWVudHM7IGkrKykge1xuICAgICAgICAgICAgaWYgKHNlZ21lbnREYXRhW2ldKSB7XG4gICAgICAgICAgICAgICAgbGFzdEtub3duU3RhdGUgPSBzZWdtZW50RGF0YVtpXTtcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RLbm93bkV2ZW50ID0gc2VnbWVudEV2ZW50c1tpXVtzZWdtZW50RXZlbnRzW2ldLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VnbWVudERhdGFbaV0gPSBsYXN0S25vd25TdGF0ZTtcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGxhc3Qga25vd24gZXZlbnQgZm9yIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBpZiAobGFzdEtub3duRXZlbnQgJiYgc2VnbWVudEV2ZW50c1tpXS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VnbWVudEV2ZW50c1tpXSA9IFt7Li4ubGFzdEtub3duRXZlbnQsIGluaGVyaXRlZDogdHJ1ZX1dO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVuZGVyIHNlZ21lbnRzXG4gICAgICAgIGNvbnN0IHNlZ21lbnRXaWR0aCA9IDEwMCAvIHNlZ21lbnRzO1xuICAgICAgICBzZWdtZW50RGF0YS5mb3JFYWNoKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gdGhpcy5nZXRTZWdtZW50VG9vbHRpcFdpdGhFdmVudHMoaW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgc2VnbWVudEV2ZW50c1tpbmRleF0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgICAgICAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgJ3dpZHRoJzogYCR7c2VnbWVudFdpZHRofSVgLFxuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0JzogJzEwMCUnLFxuICAgICAgICAgICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IHRoaXMuZ2V0Q29sb3JIZXgoY29sb3IpLFxuICAgICAgICAgICAgICAgICAgICAnYm94LXNpemluZyc6ICdib3JkZXItYm94JyxcbiAgICAgICAgICAgICAgICAgICAgJ2N1cnNvcic6ICdwb2ludGVyJ1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2RhdGEtaHRtbCcsIHRvb2x0aXBDb250ZW50KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXBvc2l0aW9uJywgJ3RvcCBjZW50ZXInKVxuICAgICAgICAgICAgICAgIC5hdHRyKCdkYXRhLXZhcmlhdGlvbicsICdtaW5pJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICR0aW1lbGluZS5hcHBlbmQoJHNlZ21lbnQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgd2l0aCBIVE1MIGNvbnRlbnRcbiAgICAgICAgJHRpbWVsaW5lLmZpbmQoJ1tkYXRhLWh0bWxdJykucG9wdXAoe1xuICAgICAgICAgICAgdmFyaWF0aW9uOiAnbWluaScsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBodG1sOiB0cnVlXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXRlIGNvbG9yIGNsYXNzXG4gICAgICovXG4gICAgZ2V0U3RhdGVDb2xvcihzdGF0ZSkge1xuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSAoc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAneWVsbG93JztcbiAgICAgICAgICAgIGNhc2UgJ09GRic6XG4gICAgICAgICAgICBjYXNlICdSRUpFQ1RFRCc6XG4gICAgICAgICAgICBjYXNlICdVTlJFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnRkFJTEVEJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3JlZCc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0ZSBwcmlvcml0eSBmb3IgY29uZmxpY3QgcmVzb2x1dGlvblxuICAgICAqL1xuICAgIGdldFN0YXRlUHJpb3JpdHkoY29sb3IpIHtcbiAgICAgICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICAgICAgY2FzZSAncmVkJzogcmV0dXJuIDM7XG4gICAgICAgICAgICBjYXNlICd5ZWxsb3cnOiByZXR1cm4gMjtcbiAgICAgICAgICAgIGNhc2UgJ2dyZWVuJzogcmV0dXJuIDE7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGhleCBjb2xvciBjb2RlXG4gICAgICovXG4gICAgZ2V0Q29sb3JIZXgoY29sb3IpIHtcbiAgICAgICAgc3dpdGNoIChjb2xvcikge1xuICAgICAgICAgICAgY2FzZSAnZ3JlZW4nOiByZXR1cm4gJyMyMWJhNDUnO1xuICAgICAgICAgICAgY2FzZSAneWVsbG93JzogcmV0dXJuICcjZmJiZDA4JztcbiAgICAgICAgICAgIGNhc2UgJ3JlZCc6IHJldHVybiAnI2RiMjgyOCc7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4gJyM3Njc2NzYnO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgc2VnbWVudCB0b29sdGlwIHRleHRcbiAgICAgKi9cbiAgICBnZXRTZWdtZW50VG9vbHRpcChzZWdtZW50SW5kZXgsIHNlZ21lbnREdXJhdGlvbikge1xuICAgICAgICBjb25zdCBob3Vyc0FnbyA9IE1hdGguZmxvb3IoKDk2IC0gc2VnbWVudEluZGV4IC0gMSkgKiBzZWdtZW50RHVyYXRpb24gLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlc0FnbyA9IE1hdGguZmxvb3IoKCg5NiAtIHNlZ21lbnRJbmRleCAtIDEpICogc2VnbWVudER1cmF0aW9uICUgMzYwMCkgLyA2MCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaG91cnNBZ28gPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7aG91cnNBZ2990YcgJHttaW51dGVzQWdvfdC8INC90LDQt9Cw0LRgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke21pbnV0ZXNBZ2990Lwg0L3QsNC30LDQtGA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzZWdtZW50IHRvb2x0aXAgd2l0aCBldmVudHMgZGV0YWlsc1xuICAgICAqL1xuICAgIGdldFNlZ21lbnRUb29sdGlwV2l0aEV2ZW50cyhzZWdtZW50SW5kZXgsIHNlZ21lbnREdXJhdGlvbiwgZXZlbnRzKSB7XG4gICAgICAgIGNvbnN0IHNlZ21lbnRTdGFydFRpbWUgPSAoc2VnbWVudEluZGV4ICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgc2VnbWVudEVuZFRpbWUgPSAoKHNlZ21lbnRJbmRleCArIDEpICogc2VnbWVudER1cmF0aW9uKTtcbiAgICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG4gICAgICAgIGNvbnN0IGRheUFnbyA9IG5vdyAtICgyNCAqIDYwICogNjApO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRpbWUgcmFuZ2UgZm9yIHRoaXMgc2VnbWVudFxuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgoZGF5QWdvICsgc2VnbWVudFN0YXJ0VGltZSkgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgZW5kVGltZSA9IG5ldyBEYXRlKChkYXlBZ28gKyBzZWdtZW50RW5kVGltZSkgKiAxMDAwKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOiBsZWZ0OyBtaW4td2lkdGg6IDIwMHB4O1wiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBUaW1lIHJhbmdlIGhlYWRlclxuICAgICAgICBodG1sICs9IGA8ZGl2IHN0eWxlPVwiZm9udC13ZWlnaHQ6IGJvbGQ7IG1hcmdpbi1ib3R0b206IDVweDtcIj5gO1xuICAgICAgICBodG1sICs9IGAke3N0YXJ0VGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCd9KX0gLSBgO1xuICAgICAgICBodG1sICs9IGAke2VuZFRpbWUudG9Mb2NhbGVUaW1lU3RyaW5nKCdydS1SVScsIHtob3VyOiAnMi1kaWdpdCcsIG1pbnV0ZTogJzItZGlnaXQnfSl9YDtcbiAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50cyBpbiB0aGlzIHNlZ21lbnRcbiAgICAgICAgaWYgKGV2ZW50cyAmJiBldmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cImJvcmRlci10b3A6IDFweCBzb2xpZCAjZGRkOyBtYXJnaW4tdG9wOiA1cHg7IHBhZGRpbmctdG9wOiA1cHg7XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU29ydCBldmVudHMgYnkgdGltZXN0YW1wIChuZXdlc3QgZmlyc3QpXG4gICAgICAgICAgICBjb25zdCBzb3J0ZWRFdmVudHMgPSBbLi4uZXZlbnRzXS5zb3J0KChhLCBiKSA9PiAoYi50aW1lc3RhbXAgfHwgMCkgLSAoYS50aW1lc3RhbXAgfHwgMCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHVwIHRvIDMgZXZlbnRzXG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5RXZlbnRzID0gc29ydGVkRXZlbnRzLnNsaWNlKDAsIDMpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBkaXNwbGF5RXZlbnRzLmZvckVhY2goZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VGltZSA9IG5ldyBEYXRlKGV2ZW50LnRpbWVzdGFtcCAqIDEwMDApO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlID0gZXZlbnQuc3RhdGUgfHwgZXZlbnQubmV3X3N0YXRlIHx8ICd1bmtub3duJztcbiAgICAgICAgICAgICAgICAvLyBDYXBpdGFsaXplIGZpcnN0IGxldHRlciBvZiBzdGF0ZSBmb3IgdHJhbnNsYXRpb24ga2V5XG4gICAgICAgICAgICAgICAgY29uc3QgY2FwaXRhbGl6ZUZpcnN0ID0gKHN0cikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXN0cikgcmV0dXJuIHN0cjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0ci5zbGljZSgxKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW2Bwcl9Qcm92aWRlclN0YXRlJHtjYXBpdGFsaXplRmlyc3Qoc3RhdGUpfWBdIHx8IHN0YXRlO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5nZXRDb2xvckhleCh0aGlzLmdldFN0YXRlQ29sb3Ioc3RhdGUpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IHN0eWxlPVwibWFyZ2luOiAzcHggMDsgZm9udC1zaXplOiAxMnB4O1wiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzY2NjtcIj4ke2V2ZW50VGltZS50b0xvY2FsZVRpbWVTdHJpbmcoJ3J1LVJVJywge2hvdXI6ICcyLWRpZ2l0JywgbWludXRlOiAnMi1kaWdpdCcsIHNlY29uZDogJzItZGlnaXQnfSl9PC9zcGFuPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICR7Y29sb3J9OyBmb250LXdlaWdodDogYm9sZDtcIj7il48gJHtzdGF0ZVRleHR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIFJUVCBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQucnR0KSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYCA8c3BhbiBzdHlsZT1cImNvbG9yOiAjOTk5O1wiPigke2V2ZW50LnJ0dH1tcyk8L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTWFyayBpbmhlcml0ZWQgc3RhdGVzXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmluaGVyaXRlZCkge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9ICcgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zdHlsZTogaXRhbGljO1wiPijQv9GA0L7QtNC+0LvQttCw0LXRgtGB0Y8pPC9zcGFuPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHNvcnRlZEV2ZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDExcHg7IG1hcmdpbi10b3A6IDNweDtcIj7QuCDQtdGJ0LUgJHtzb3J0ZWRFdmVudHMubGVuZ3RoIC0gM30g0YHQvtCx0YvRgtC40LkuLi48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDEycHg7IG1hcmdpbi10b3A6IDVweDtcIj7QndC10YIg0YHQvtCx0YvRgtC40Lkg0LIg0Y3RgtC+0Lwg0L/QtdGA0LjQvtC00LU8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZGlhZ25vc3RpY3MgZGlzcGxheSB3aXRoIHN0YXR1cyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHVwZGF0ZURpYWdub3N0aWNzRGlzcGxheShzdGF0dXNJbmZvKSB7XG4gICAgICAgIC8vIFVwZGF0ZSBSVFRcbiAgICAgICAgY29uc3QgJHJ0dCA9ICQoJyNwcm92aWRlci1ydHQtdmFsdWUnKTtcbiAgICAgICAgY29uc3QgJHJ0dENvbnRhaW5lciA9ICRydHQucGFyZW50KCk7XG4gICAgICAgIGlmICgkcnR0Lmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKHN0YXR1c0luZm8ucnR0ICE9PSBudWxsICYmIHN0YXR1c0luZm8ucnR0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBydHRDb2xvciA9IHN0YXR1c0luZm8ucnR0ID4gMjAwID8gJyNkYjI4MjgnIDogc3RhdHVzSW5mby5ydHQgPiAxMDAgPyAnI2ZiYmQwOCcgOiAnIzIxYmE0NSc7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KGAke3N0YXR1c0luZm8ucnR0fSAke2dsb2JhbFRyYW5zbGF0ZS5wcl9NaWxsaXNlY29uZHMgfHwgJ9C80YEnfWApO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsIHJ0dENvbG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJ0dC50ZXh0KCctLScpO1xuICAgICAgICAgICAgICAgICRydHRDb250YWluZXIuY3NzKCdjb2xvcicsICcjNzY3Njc2Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0ZSBkdXJhdGlvbiBhbmQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1cmF0aW9uID0gJCgnI3Byb3ZpZGVyLWR1cmF0aW9uLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0ICRzdGF0ZUxhYmVsID0gJCgnI3Byb3ZpZGVyLXN0YXRlLWxhYmVsJyk7XG4gICAgICAgIGNvbnN0ICRkdXJhdGlvbkNvbnRhaW5lciA9ICRkdXJhdGlvbi5wYXJlbnQoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkZHVyYXRpb24ubGVuZ3RoICYmIHN0YXR1c0luZm8uc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgJGR1cmF0aW9uLnRleHQodGhpcy5mb3JtYXREdXJhdGlvbihzdGF0dXNJbmZvLnN0YXRlRHVyYXRpb24pKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHN0YXRlIGxhYmVsIHdpdGggYWN0dWFsIHN0YXRlIHRleHRcbiAgICAgICAgaWYgKCRzdGF0ZUxhYmVsLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3Qgc3RhdGVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW3N0YXR1c0luZm8uc3RhdGVUZXh0XSB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNJbmZvLnN0YXRlVGV4dCB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNJbmZvLnN0YXRlIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGUgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ9Ch0L7RgdGC0L7Rj9C90LjQtSc7XG4gICAgICAgICAgICAkc3RhdGVMYWJlbC50ZXh0KHN0YXRlVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHN0YXRlIGNvbG9yIHRvIHRoZSBkdXJhdGlvbiB2YWx1ZSBhbmQgbGFiZWxcbiAgICAgICAgaWYgKCRkdXJhdGlvbkNvbnRhaW5lci5sZW5ndGggJiYgc3RhdHVzSW5mby5zdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICBjb25zdCBjb2xvckhleCA9IHRoaXMuZ2V0Q29sb3JIZXgoc3RhdHVzSW5mby5zdGF0ZUNvbG9yKTtcbiAgICAgICAgICAgICRkdXJhdGlvbkNvbnRhaW5lci5jc3MoJ2NvbG9yJywgY29sb3JIZXgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgc3RhdGlzdGljcyBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN0YXR1c0luZm8uc3RhdGlzdGljcykge1xuICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBzdGF0dXNJbmZvLnN0YXRpc3RpY3M7XG4gICAgICAgICAgICBjb25zdCAkYXZhaWxhYmlsaXR5ID0gJCgnI3Byb3ZpZGVyLWF2YWlsYWJpbGl0eS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRhdmFpbGFiaWxpdHkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGF2YWlsYWJpbGl0eS50ZXh0KHN0YXRzLmF2YWlsYWJpbGl0eSA/IGAke3N0YXRzLmF2YWlsYWJpbGl0eX0lYCA6ICctLScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tzID0gJCgnI3Byb3ZpZGVyLWNoZWNrcy12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKCRjaGVja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNoZWNrcy50ZXh0KHN0YXRzLnRvdGFsQ2hlY2tzIHx8ICcwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEV4cG9ydCBoaXN0b3J5IHRvIENTViBmaWxlXG4gICAgICovXG4gICAgZXhwb3J0SGlzdG9yeVRvQ1NWKCkge1xuICAgICAgICBjb25zdCAkYnRuID0gJCgnI2V4cG9ydC1oaXN0b3J5LWJ0bicpO1xuICAgICAgICAkYnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGaXJzdCBnZXQgcHJvdmlkZXIgZGV0YWlsc1xuICAgICAgICBjb25zdCBwcm92aWRlckhvc3QgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdob3N0Jyk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyVXNlcm5hbWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd1c2VybmFtZScpO1xuICAgICAgICBjb25zdCBwcm92aWRlckRlc2NyaXB0aW9uID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZGVzY3JpcHRpb24nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZldGNoIGhpc3RvcnkgZGF0YVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldEhpc3RvcnkvJHt0aGlzLnByb3ZpZGVyVHlwZS50b1VwcGVyQ2FzZSgpfS8ke3RoaXMudW5pcWlkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogeyBcbiAgICAgICAgICAgICAgICBsaW1pdDogMTAwMDAgLy8gR2V0IG1vcmUgcmVjb3JkcyBmb3IgZXhwb3J0XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ0bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmV2ZW50cykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvd25sb2FkQ1NWKHJlc3BvbnNlLmRhdGEuZXZlbnRzLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcklkOiB0aGlzLnVuaXFpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogdGhpcy5wcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHByb3ZpZGVySG9zdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBwcm92aWRlclVzZXJuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHByb3ZpZGVyRGVzY3JpcHRpb25cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICRidG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLnByX0V4cG9ydEZhaWxlZCB8fCAnRXhwb3J0IGZhaWxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgZXZlbnRzIHRvIENTViBhbmQgdHJpZ2dlciBkb3dubG9hZFxuICAgICAqL1xuICAgIGRvd25sb2FkQ1NWKGV2ZW50cywgcHJvdmlkZXJJbmZvKSB7XG4gICAgICAgIGlmICghZXZlbnRzIHx8IGV2ZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dXYXJuaW5nKGdsb2JhbFRyYW5zbGF0ZS5wcl9Ob0hpc3RvcnlUb0V4cG9ydCB8fCAnTm8gaGlzdG9yeSB0byBleHBvcnQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVGVjaG5pY2FsIGhlYWRlcnMgd2l0aG91dCB0cmFuc2xhdGlvbnNcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IFtcbiAgICAgICAgICAgICd0aW1lc3RhbXAnLFxuICAgICAgICAgICAgJ2RhdGV0aW1lJyxcbiAgICAgICAgICAgICdwcm92aWRlcl9pZCcsXG4gICAgICAgICAgICAncHJvdmlkZXJfdHlwZScsXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCcsXG4gICAgICAgICAgICAncHJvdmlkZXJfdXNlcm5hbWUnLFxuICAgICAgICAgICAgJ3Byb3ZpZGVyX2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICdldmVudCcsXG4gICAgICAgICAgICAnZXZlbnRfdHlwZScsXG4gICAgICAgICAgICAncHJldmlvdXNfc3RhdGUnLFxuICAgICAgICAgICAgJ25ld19zdGF0ZScsXG4gICAgICAgICAgICAncnR0X21zJyxcbiAgICAgICAgICAgICdwZWVyX3N0YXR1cycsXG4gICAgICAgICAgICAncXVhbGlmeV9mcmVxJyxcbiAgICAgICAgICAgICdxdWFsaWZ5X3RpbWUnLFxuICAgICAgICAgICAgJ3JlZ2lzdGVyX3N0YXR1cycsXG4gICAgICAgICAgICAnY29udGFjdCcsXG4gICAgICAgICAgICAndXNlcl9hZ2VudCcsXG4gICAgICAgICAgICAnbGFzdF9yZWdpc3RyYXRpb24nLFxuICAgICAgICAgICAgJ2RldGFpbHMnLFxuICAgICAgICAgICAgJ2Vycm9yX21lc3NhZ2UnLFxuICAgICAgICAgICAgJ3Jhd19kYXRhJ1xuICAgICAgICBdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBldmVudHMgdG8gQ1NWIHJvd3Mgd2l0aCBhbGwgdGVjaG5pY2FsIGRhdGFcbiAgICAgICAgY29uc3Qgcm93cyA9IGV2ZW50cy5tYXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBhbGwgYXZhaWxhYmxlIGZpZWxkcyBmcm9tIHRoZSBldmVudFxuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBldmVudC50aW1lc3RhbXAgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZGF0ZXRpbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnByb3ZpZGVySWQgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8uaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwcm92aWRlckluZm8udXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgcHJvdmlkZXJJbmZvLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmV2ZW50IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnR5cGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmlvdXNTdGF0ZSB8fCBldmVudC5wcmV2aW91c19zdGF0ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5zdGF0ZSB8fCBldmVudC5uZXdfc3RhdGUgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucnR0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnBlZXJTdGF0dXMgfHwgZXZlbnQucGVlcl9zdGF0dXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQucXVhbGlmeUZyZXEgfHwgZXZlbnQucXVhbGlmeV9mcmVxIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LnF1YWxpZnlUaW1lIHx8IGV2ZW50LnF1YWxpZnlfdGltZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5yZWdpc3RlclN0YXR1cyB8fCBldmVudC5yZWdpc3Rlcl9zdGF0dXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuY29udGFjdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC51c2VyQWdlbnQgfHwgZXZlbnQudXNlcl9hZ2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBldmVudC5sYXN0UmVnaXN0cmF0aW9uIHx8IGV2ZW50Lmxhc3RfcmVnaXN0cmF0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGV2ZW50LmRldGFpbHMgfHwgJycsXG4gICAgICAgICAgICAgICAgZXZlbnQuZXJyb3IgfHwgZXZlbnQuZXJyb3JNZXNzYWdlIHx8ICcnLFxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGV2ZW50KSAvLyBJbmNsdWRlIGNvbXBsZXRlIHJhdyBkYXRhXG4gICAgICAgICAgICBdO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBDU1YgY29udGVudCB3aXRoIEJPTSBmb3IgcHJvcGVyIFVURi04IGVuY29kaW5nIGluIEV4Y2VsXG4gICAgICAgIGNvbnN0IEJPTSA9ICdcXHVGRUZGJztcbiAgICAgICAgbGV0IGNzdkNvbnRlbnQgPSBCT007XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbWV0YWRhdGEgaGVhZGVyXG4gICAgICAgIGNzdkNvbnRlbnQgKz0gYCMgUHJvdmlkZXIgRXhwb3J0OiAke3Byb3ZpZGVySW5mby5wcm92aWRlcklkfSAoJHtwcm92aWRlckluZm8ucHJvdmlkZXJUeXBlfSlcXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9IGAjIEhvc3Q6ICR7cHJvdmlkZXJJbmZvLmhvc3R9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBVc2VybmFtZTogJHtwcm92aWRlckluZm8udXNlcm5hbWV9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBEZXNjcmlwdGlvbjogJHtwcm92aWRlckluZm8uZGVzY3JpcHRpb259XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBFeHBvcnQgRGF0ZTogJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCl9XFxuYDtcbiAgICAgICAgY3N2Q29udGVudCArPSBgIyBUb3RhbCBFdmVudHM6ICR7ZXZlbnRzLmxlbmd0aH1cXG5gO1xuICAgICAgICBjc3ZDb250ZW50ICs9ICdcXG4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvbHVtbiBoZWFkZXJzXG4gICAgICAgIGNzdkNvbnRlbnQgKz0gaGVhZGVycy5qb2luKCcsJykgKyAnXFxuJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkYXRhIHJvd3NcbiAgICAgICAgcm93cy5mb3JFYWNoKHJvdyA9PiB7XG4gICAgICAgICAgICBjc3ZDb250ZW50ICs9IHJvdy5tYXAoY2VsbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIHF1b3RlcyBhbmQgd3JhcCBpbiBxdW90ZXMgaWYgY29udGFpbnMgY29tbWEsIG5ld2xpbmUsIG9yIHF1b3Rlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGxTdHIgPSBTdHJpbmcoY2VsbCk7XG4gICAgICAgICAgICAgICAgaWYgKGNlbGxTdHIuaW5jbHVkZXMoJywnKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCdcXG4nKSB8fCBjZWxsU3RyLmluY2x1ZGVzKCdcIicpIHx8IGNlbGxTdHIuaW5jbHVkZXMoJyMnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYFwiJHtjZWxsU3RyLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gY2VsbFN0cjtcbiAgICAgICAgICAgIH0pLmpvaW4oJywnKSArICdcXG4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBibG9iIGFuZCBkb3dubG9hZFxuICAgICAgICBjb25zdCBibG9iID0gbmV3IEJsb2IoW2NzdkNvbnRlbnRdLCB7IHR5cGU6ICd0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04OycgfSk7XG4gICAgICAgIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZW5lcmF0ZSBmaWxlbmFtZSB3aXRoIHByb3ZpZGVyIElEIGFuZCB0aW1lc3RhbXBcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbm93LnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCAnLScpLnN1YnN0cmluZygwLCAxOSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYHByb3ZpZGVyXyR7cHJvdmlkZXJJbmZvLnByb3ZpZGVySWR9XyR7cHJvdmlkZXJJbmZvLnByb3ZpZGVyVHlwZX1fJHt0aW1lc3RhbXB9LmNzdmA7XG4gICAgICAgIFxuICAgICAgICBsaW5rLnNldEF0dHJpYnV0ZSgnaHJlZicsIHVybCk7XG4gICAgICAgIGxpbmsuc2V0QXR0cmlidXRlKCdkb3dubG9hZCcsIGZpbGVuYW1lKTtcbiAgICAgICAgbGluay5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGxpbmspO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW4gdXBcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCksIDEwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZHVyYXRpb24gaW4gc2Vjb25kcyB0byBodW1hbi1yZWFkYWJsZSBmb3JtYXQgd2l0aCBsb2NhbGl6YXRpb25cbiAgICAgKi9cbiAgICBmb3JtYXREdXJhdGlvbihzZWNvbmRzKSB7XG4gICAgICAgIGlmICghc2Vjb25kcykgcmV0dXJuICctLSc7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gODY0MDApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSA4NjQwMCkgLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICAgICAgY29uc3Qgc2VjcyA9IHNlY29uZHMgJSA2MDtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBsb2NhbGl6ZWQgdW5pdHNcbiAgICAgICAgY29uc3QgZGF5VW5pdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9EYXlzIHx8ICfQtCc7XG4gICAgICAgIGNvbnN0IGhvdXJVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX0hvdXJzIHx8ICfRhyc7XG4gICAgICAgIGNvbnN0IG1pbnV0ZVVuaXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfTWludXRlcyB8fCAn0LwnO1xuICAgICAgICBjb25zdCBzZWNvbmRVbml0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1NlY29uZHMgfHwgJ9GBJztcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGAke2RheXN9JHtkYXlVbml0fSAke2hvdXJzfSR7aG91clVuaXR9ICR7bWludXRlc30ke21pbnV0ZVVuaXR9YDtcbiAgICAgICAgfSBlbHNlIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHtob3Vyc30ke2hvdXJVbml0fSAke21pbnV0ZXN9JHttaW51dGVVbml0fSAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH0gZWxzZSBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgJHttaW51dGVzfSR7bWludXRlVW5pdH0gJHtzZWNzfSR7c2Vjb25kVW5pdH1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGAke3NlY3N9JHtzZWNvbmRVbml0fWA7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFuIHVwIHJlc291cmNlc1xuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIGlmICh0aGlzLmNoYW5nZVRpbWVvdXQpIHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLmNoYW5nZVRpbWVvdXQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5wZXJpb2RpY0ludGVydmFsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMucGVyaW9kaWNJbnRlcnZhbCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVuc3Vic2NyaWJlIGZyb20gRXZlbnRCdXMgaWYgc3Vic2NyaWJlZFxuICAgICAgICBpZiAodGhpcy5pc1N1YnNjcmliZWQgJiYgdHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMudW5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycpO1xuICAgICAgICAgICAgdGhpcy5pc1N1YnNjcmliZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgc3RhdHVzIHdvcmtlciB3aGVuIGRvY3VtZW50IGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbi8vIENsZWFuIHVwIG9uIHBhZ2UgdW5sb2FkXG4kKHdpbmRvdykub24oJ2JlZm9yZXVubG9hZCcsICgpID0+IHtcbiAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5kZXN0cm95KCk7XG59KTtcblxuLy8gRXhwb3J0IGZvciBleHRlcm5hbCBhY2Nlc3NcbndpbmRvdy5wcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciA9IHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyOyJdfQ==