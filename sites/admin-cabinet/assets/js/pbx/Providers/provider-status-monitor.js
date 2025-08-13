"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl, globalTranslate, EventBus */

/**
 * Provider Status Monitor
 * Handles real-time provider status updates via EventBus with enhanced features:
 * - Real-time status updates with EventBus integration
 * - Backend-provided display properties (no hardcoded state mapping)
 * - Duration displays (state duration, success/failure duration)
 * - Last success information
 * - Enhanced visual feedback with Fomantic UI components
 */
var ProviderStatusMonitor = {
  channelId: 'provider-status',
  isInitialized: false,
  lastUpdateTime: 0,
  statusCache: {},

  /**
   * jQuery objects
   */
  $statusCells: null,
  $lastUpdateIndicator: null,

  /**
   * DOM cache for performance optimization
   */
  cachedRows: new Map(),
  cachedStatusCells: new Map(),

  /**
   * Initialize the provider status monitor with enhanced features
   */
  initialize: function initialize() {
    if (this.isInitialized) {
      return;
    } // Cache DOM elements for performance


    this.cacheElements(); // Create enhanced status indicator

    this.createStatusIndicator(); // Subscribe to EventBus channel for real-time updates

    this.subscribeToEvents(); // Set up periodic health checks

    this.setupHealthChecks();
    this.isInitialized = true;
  },

  /**
   * Cache DOM elements for performance optimization
   */
  cacheElements: function cacheElements() {
    var _this = this;

    this.$statusCells = $('.provider-status, .provider-status-cell'); // Cache provider rows for quick access

    $('tr.provider-row, tr[id]').each(function (index, element) {
      var $row = $(element);
      var id = $row.attr('id');

      if (id) {
        _this.cachedRows.set(id, $row);

        var $statusCell = $row.find('.provider-status');

        if ($statusCell.length) {
          _this.cachedStatusCells.set(id, $statusCell);
        }
      }
    });
  },

  /**
   * Create enhanced status indicator with duration info
   */
  createStatusIndicator: function createStatusIndicator() {
    if ($('#provider-status-indicator').length === 0) {
      var indicator = "\n                <div id=\"provider-status-indicator\" class=\"ui mini message hidden\">\n                    <i class=\"sync alternate icon\"></i>\n                    <div class=\"content\">\n                        <div class=\"header\"></div>\n                        <div class=\"description\">\n                            <span class=\"status-message\"></span>\n                            <span class=\"last-check-time\" style=\"font-size: 0.85em; color: #888;\"></span>\n                        </div>\n                    </div>\n                </div>\n            ";
      $('.ui.container.segment').prepend(indicator);
    }

    this.$lastUpdateIndicator = $('#provider-status-indicator');
  },

  /**
   * Subscribe to EventBus for real-time updates
   */
  subscribeToEvents: function subscribeToEvents() {
    var _this2 = this;

    if (typeof EventBus !== 'undefined') {
      EventBus.subscribe('provider-status', function (message) {
        _this2.handleEventBusMessage(message);
      });
    } else {
      console.warn('EventBus not available, provider status monitor disabled');
    }
  },

  /**
   * Setup periodic health checks and cache maintenance
   */
  setupHealthChecks: function setupHealthChecks() {
    var _this3 = this;

    // Refresh cache every 30 seconds to handle dynamic content
    setInterval(function () {
      _this3.refreshCache();
    }, 30000); // Request status update every 5 minutes as fallback

    setInterval(function () {
      _this3.requestStatusUpdate();
    }, 300000);
  },

  /**
   * Refresh cached DOM elements
   */
  refreshCache: function refreshCache() {
    // Clear existing cache
    this.cachedRows.clear();
    this.cachedStatusCells.clear(); // Rebuild cache

    this.cacheElements();
  },

  /**
   * Handle EventBus message
   */
  handleEventBusMessage: function handleEventBusMessage(message) {
    if (!message) {
      return;
    } // EventBus message can have event at top level or in data


    var event, data;

    if (message.event) {
      // Event at top level
      event = message.event;
      data = message.data;
    } else if (message.data && message.data.event) {
      // Event in data
      event = message.data.event;
      data = message.data.data || message.data;
    } else {
      return;
    }

    switch (event) {
      case 'status_check':
        this.showCheckingIndicator(data);
        break;

      case 'status_update':
        this.processStatusUpdate(data);
        break;

      case 'status_complete':
        this.processCompleteStatus(data);
        break;

      case 'status_error':
        this.handleStatusError(data);
        break;

      default:
        console.warn('Unknown provider status event:', event);
    }
  },

  /**
   * Show checking indicator
   */
  showCheckingIndicator: function showCheckingIndicator(data) {
    var _this4 = this;

    this.$lastUpdateIndicator.removeClass('hidden error success').addClass('info');
    this.$lastUpdateIndicator.find('.content').text(data.message || globalTranslate.pr_CheckingProviderStatuses); // Auto-hide after 3 seconds

    setTimeout(function () {
      _this4.$lastUpdateIndicator.addClass('hidden');
    }, 3000);
  },

  /**
   * Process status update with changes
   */
  processStatusUpdate: function processStatusUpdate(data) {
    var _this5 = this;

    if (!data.changes || !Array.isArray(data.changes)) {
      return;
    }

    var timestamp = data.timestamp || Date.now() / 1000;
    this.lastUpdateTime = timestamp; // Process each change

    data.changes.forEach(function (change) {
      _this5.updateProviderStatus(change);
    }); // Show update notification

    var changeCount = data.changes.length;
    var message = changeCount === 1 ? globalTranslate.pr_OneProviderStatusChanged : globalTranslate.pr_MultipleProviderStatusesChanged.replace('%s', changeCount);
    this.showUpdateNotification(message, 'success');
  },

  /**
   * Process complete status data
   */
  processCompleteStatus: function processCompleteStatus(data) {
    if (!data.statuses) {
      return;
    } // Update cache


    this.statusCache = data.statuses; // Update all provider statuses on the page

    this.updateAllProviderStatuses(data.statuses); // Update last check time

    if (data.timestamp) {
      this.updateLastCheckTime(data.timestamp);
    }
  },

  /**
   * Handle status error
   */
  handleStatusError: function handleStatusError(data) {
    var errorMsg = data.error || globalTranslate.pr_StatusCheckFailed;
    this.showUpdateNotification(errorMsg, 'error');
  },

  /**
   * Update single provider status using backend-provided display properties
   * No hardcoded state mapping - backend provides all display properties
   */
  updateProviderStatus: function updateProviderStatus(change) {
    var _this6 = this;

    var provider_id = change.provider_id,
        type = change.type,
        state = change.state,
        new_state = change.new_state,
        old_state = change.old_state,
        stateColor = change.stateColor,
        stateIcon = change.stateIcon,
        stateText = change.stateText,
        stateDescription = change.stateDescription,
        stateDuration = change.stateDuration,
        lastSuccessTime = change.lastSuccessTime,
        timeSinceLastSuccess = change.timeSinceLastSuccess,
        successDuration = change.successDuration,
        failureDuration = change.failureDuration; // Use cached elements for better performance

    var $row = this.cachedRows.get(provider_id);

    if (!$row) {
      $row = $("#".concat(provider_id));

      if ($row.length > 0) {
        this.cachedRows.set(provider_id, $row);
      } else {
        return; // Row not found
      }
    }

    var $statusCell = this.cachedStatusCells.get(provider_id);

    if (!$statusCell) {
      $statusCell = $row.find('.provider-status');

      if ($statusCell.length > 0) {
        this.cachedStatusCells.set(provider_id, $statusCell);
      } else {
        return; // Status cell not found
      }
    } // Use current state or fallback to new_state for compatibility


    var currentState = state || new_state;
    var previousState = $statusCell.data('prev-state'); // Use backend-provided display properties directly

    if (stateColor) {
      // Enhanced status indicator with tooltip support
      var tooltipContent = this.buildTooltipContent({
        state: currentState,
        stateText: stateText,
        stateDescription: stateDescription,
        stateDuration: stateDuration,
        lastSuccessTime: lastSuccessTime,
        timeSinceLastSuccess: timeSinceLastSuccess,
        successDuration: successDuration,
        failureDuration: failureDuration,
        rtt: change.rtt,
        host: change.host,
        username: change.username
      });
      var statusHtml = "\n                <div class=\"ui ".concat(stateColor, " empty circular label\" \n                     style=\"width: 1px;height: 1px;\"\n                     data-content=\"").concat(tooltipContent, "\"\n                     data-position=\"top center\"\n                     data-variation=\"small\">\n                </div>\n            "); // Batch DOM updates for better performance

      requestAnimationFrame(function () {
        $statusCell.html(statusHtml); // Initialize popup (Fomantic UI tooltip)

        $statusCell.find('.ui.label').popup({
          hoverable: false,
          position: 'top center',
          variation: 'small',
          html: tooltipContent,
          delay: {
            show: 200,
            hide: 100
          }
        }); // Clear failure text when using modern status display

        var $failureCell = $row.find('.failure, .features.failure');

        if ($failureCell.length) {
          // Don't show text status when we have visual indicators
          $failureCell.text('');
        } // Add duration information if available


        _this6.updateDurationDisplay($row, {
          stateDuration: stateDuration,
          lastSuccessTime: lastSuccessTime,
          successDuration: successDuration,
          failureDuration: failureDuration,
          stateText: stateText
        }); // Animate if state changed


        if (previousState && previousState !== currentState) {
          $statusCell.transition('pulse');
        } // Store current state for future comparison


        $statusCell.data('prev-state', currentState);
      });
    } else {
      // Fallback for backward compatibility - use simple state-based display
      this.updateProviderStatusLegacy(change);
    }
  },

  /**
   * Build tooltip content with enhanced information
   */
  buildTooltipContent: function buildTooltipContent(statusInfo) {
    var state = statusInfo.state,
        stateText = statusInfo.stateText,
        stateDescription = statusInfo.stateDescription,
        stateDuration = statusInfo.stateDuration,
        lastSuccessTime = statusInfo.lastSuccessTime,
        timeSinceLastSuccess = statusInfo.timeSinceLastSuccess,
        successDuration = statusInfo.successDuration,
        failureDuration = statusInfo.failureDuration,
        rtt = statusInfo.rtt,
        host = statusInfo.host,
        username = statusInfo.username; // Use translated state text as main title

    var stateTitle = stateText ? globalTranslate[stateText] || stateText : globalTranslate[stateDescription] || stateDescription || state || '';
    var tooltip = "<div class=\"provider-status-tooltip\">";
    tooltip += "<strong class=\"provider-status-tooltip__title\">".concat(stateTitle, "</strong>"); // Add original state value if available and different from title

    if (state && state !== stateTitle) {
      tooltip += "<div class=\"provider-status-tooltip__state-original\">[".concat(state, "]</div>");
    } // Add host and username if available


    if (host || username) {
      tooltip += "<div class=\"provider-status-tooltip__section\">";

      if (host) {
        tooltip += "<div class=\"provider-status-tooltip__info-item\">Host: <strong>".concat(host, "</strong></div>");
      }

      if (username) {
        tooltip += "<div class=\"provider-status-tooltip__info-item\">User: <strong>".concat(username, "</strong></div>");
      }

      tooltip += "</div>";
    } // Add status information section


    var hasStatusInfo = false;
    var statusSection = "<div class=\"provider-status-tooltip__section\">"; // Format and add duration information (now comes as seconds from backend)

    if (stateDuration !== undefined && stateDuration !== null && stateDuration >= 0) {
      var formattedDuration = this.formatDuration(stateDuration);
      var durationLabel = globalTranslate.pr_StatusDuration || 'Длительность';
      statusSection += "<div class=\"provider-status-tooltip__status-item\">".concat(durationLabel, ": <strong>").concat(formattedDuration, "</strong></div>");
      hasStatusInfo = true;
    } // Add RTT (Round Trip Time) if available


    if (rtt !== undefined && rtt !== null && rtt >= 0) {
      var rttLabel = globalTranslate.pr_RTT || 'Задержка'; // Format RTT with color coding

      var rttClass = 'provider-status-tooltip__rtt--good';
      if (rtt > 100) rttClass = 'provider-status-tooltip__rtt--warning';
      if (rtt > 200) rttClass = 'provider-status-tooltip__rtt--bad';
      statusSection += "<div class=\"provider-status-tooltip__status-item\">".concat(rttLabel, ": <strong class=\"").concat(rttClass, "\">").concat(rtt, " \u043C\u0441</strong></div>");
      hasStatusInfo = true;
    } // Format time since last success if provided (now comes as seconds)


    if (timeSinceLastSuccess !== undefined && timeSinceLastSuccess !== null && timeSinceLastSuccess >= 0) {
      var formattedTime = this.formatDuration(timeSinceLastSuccess);
      var lastSuccessLabel = globalTranslate.pr_LastSuccessTime || 'Последний успех';
      statusSection += "<div class=\"provider-status-tooltip__status-item provider-status-tooltip__last-success\">".concat(lastSuccessLabel, ": <strong>").concat(formattedTime, " \u043D\u0430\u0437\u0430\u0434</strong></div>");
      hasStatusInfo = true;
    } // Add success/failure duration if available


    if (successDuration !== undefined && successDuration !== null && successDuration > 0) {
      var _formattedDuration = this.formatDuration(successDuration);

      var successLabel = globalTranslate.pr_SuccessDuration || 'Время работы';
      statusSection += "<div class=\"provider-status-tooltip__status-item provider-status-tooltip__success-duration\">".concat(successLabel, ": <strong>").concat(_formattedDuration, "</strong></div>");
      hasStatusInfo = true;
    }

    if (failureDuration !== undefined && failureDuration !== null && failureDuration > 0) {
      var _formattedDuration2 = this.formatDuration(failureDuration);

      var failureLabel = globalTranslate.pr_FailureDuration || 'Время сбоя';
      statusSection += "<div class=\"provider-status-tooltip__status-item provider-status-tooltip__failure-duration\">".concat(failureLabel, ": <strong>").concat(_formattedDuration2, "</strong></div>");
      hasStatusInfo = true;
    }

    statusSection += "</div>";

    if (hasStatusInfo) {
      tooltip += statusSection;
    } // Add description if different from state text


    if (stateDescription && globalTranslate[stateDescription] && globalTranslate[stateDescription] !== stateTitle) {
      tooltip += "<div class=\"provider-status-tooltip__description\">";
      tooltip += globalTranslate[stateDescription];
      tooltip += "</div>";
    }

    tooltip += "</div>";
    return tooltip.replace(/"/g, '&quot;');
  },

  /**
   * Update duration display in provider row
   */
  updateDurationDisplay: function updateDurationDisplay($row, durations) {
    var stateDuration = durations.stateDuration,
        lastSuccessTime = durations.lastSuccessTime,
        successDuration = durations.successDuration,
        failureDuration = durations.failureDuration,
        stateText = durations.stateText; // Look for duration display elements or create them

    var $durationInfo = $row.find('.provider-duration-info');

    if ($durationInfo.length === 0) {
      // Add duration info container to the provider name column
      var $nameColumn = $row.find('td').eq(2); // Usually the third column contains provider name

      if ($nameColumn.length) {
        $nameColumn.append('<div class="provider-duration-info"></div>');
        $durationInfo = $nameColumn.find('.provider-duration-info');
      }
    }

    if ($durationInfo.length && (stateDuration || lastSuccessTime || successDuration || failureDuration)) {
      var durationText = '';

      if (stateDuration) {
        // Use translated state text if available, otherwise use generic label
        var stateLabel = stateText ? globalTranslate[stateText] || stateText : globalTranslate.pr_StatusDuration || 'State';
        durationText += "".concat(stateLabel, ": ").concat(this.formatDuration(stateDuration));
      }

      if (lastSuccessTime) {
        var timeAgo = this.formatTimeAgo(lastSuccessTime);
        var lastSuccessLabel = globalTranslate.pr_LastSuccessTime || 'Last success';
        if (durationText) durationText += ' | ';
        durationText += "".concat(lastSuccessLabel, ": ").concat(timeAgo);
      }

      $durationInfo.text(durationText);
    }
  },

  /**
   * Format duration in seconds to human readable format
   */
  formatDuration: function formatDuration(seconds) {
    if (!seconds || seconds < 0) {
      // Return 0 seconds using translation
      var zeroFormat = globalTranslate.pr_TimeFormat_Seconds || '%s s';
      return zeroFormat.replace('%s', '0');
    }

    var days = Math.floor(seconds / 86400);
    var hours = Math.floor(seconds % 86400 / 3600);
    var minutes = Math.floor(seconds % 3600 / 60);
    var secs = Math.floor(seconds % 60);
    var result = []; // Use translated format strings

    if (days > 0) {
      var format = globalTranslate.pr_TimeFormat_Days || '%s d';
      result.push(format.replace('%s', days));
    }

    if (hours > 0) {
      var _format = globalTranslate.pr_TimeFormat_Hours || '%s h';

      result.push(_format.replace('%s', hours));
    }

    if (minutes > 0) {
      var _format2 = globalTranslate.pr_TimeFormat_Minutes || '%s m';

      result.push(_format2.replace('%s', minutes));
    }

    if (secs > 0 || result.length === 0) {
      var _format3 = globalTranslate.pr_TimeFormat_Seconds || '%s s';

      result.push(_format3.replace('%s', secs));
    } // Join with space, show max 2 units for readability


    return result.slice(0, 2).join(' ');
  },

  /**
   * Format timestamp to "time ago" format
   */
  formatTimeAgo: function formatTimeAgo(timestamp) {
    var now = Date.now() / 1000;
    var diff = now - timestamp; // Use formatDuration to get consistent formatting with translations

    var formattedTime = this.formatDuration(diff);
    var agoLabel = globalTranslate.pr_TimeAgo || 'ago'; // For very recent times, use special label

    if (diff < 60) {
      return globalTranslate.pr_JustNow || formattedTime + ' ' + agoLabel;
    }

    return formattedTime + ' ' + agoLabel;
  },

  /**
   * Legacy status update method for backward compatibility
   */
  updateProviderStatusLegacy: function updateProviderStatusLegacy(change) {
    var provider_id = change.provider_id,
        new_state = change.new_state,
        old_state = change.old_state;
    var $row = $("#".concat(provider_id));
    if ($row.length === 0) return;
    var $statusCell = $row.find('.provider-status');
    if ($statusCell.length === 0) return; // Clear any existing content

    $statusCell.html(''); // Simple status indicators

    var green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
    var grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
    var yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';
    var red = '<div class="ui red empty circular label" style="width: 1px;height: 1px;"></div>'; // Basic state mapping for backward compatibility

    var normalizedState = (new_state || '').toUpperCase();

    switch (normalizedState) {
      case 'REGISTERED':
      case 'OK':
      case 'REACHABLE':
        $statusCell.html(green);
        $row.find('.failure').text('');
        break;

      case 'UNREACHABLE':
      case 'LAGGED':
        $statusCell.html(yellow);
        $row.find('.failure').text('');
        break;

      case 'OFF':
      case 'UNMONITORED':
        $statusCell.html(grey);
        $row.find('.failure').text('');
        break;

      case 'REJECTED':
      case 'UNREGISTERED':
      case 'FAILED':
        $statusCell.html(red);
        $row.find('.failure').text(new_state);
        break;

      default:
        $statusCell.html(grey);
        $row.find('.failure').text(new_state || 'Unknown');
        break;
    } // Add animation for change


    if (old_state !== new_state) {
      $statusCell.transition('pulse');
    }
  },

  /**
   * Update all provider statuses using backend-provided display properties
   * Supports both legacy format and new enhanced format with durations
   */
  updateAllProviderStatuses: function updateAllProviderStatuses(statuses) {
    if (!statuses) {
      return;
    } // Batch DOM updates for better performance


    var updates = []; // Handle structured format with sip/iax separation

    if (statuses.sip && _typeof(statuses.sip) === 'object') {
      Object.keys(statuses.sip).forEach(function (providerId) {
        var provider = statuses.sip[providerId];

        if (provider) {
          updates.push({
            provider_id: providerId,
            type: 'sip',
            state: provider.state,
            new_state: provider.state,
            // For backward compatibility
            old_state: provider.state,
            // No animation for bulk update
            stateColor: provider.stateColor,
            stateIcon: provider.stateIcon,
            stateText: provider.stateText,
            stateDescription: provider.stateDescription,
            stateDuration: provider.stateDuration,
            lastSuccessTime: provider.lastSuccessTime,
            timeSinceLastSuccess: provider.timeSinceLastSuccess,
            successDuration: provider.successDuration,
            failureDuration: provider.failureDuration,
            rtt: provider.rtt
          });
        }
      });
    } // Update IAX providers


    if (statuses.iax && _typeof(statuses.iax) === 'object') {
      Object.keys(statuses.iax).forEach(function (providerId) {
        var provider = statuses.iax[providerId];

        if (provider) {
          updates.push({
            provider_id: providerId,
            type: 'iax',
            state: provider.state,
            new_state: provider.state,
            // For backward compatibility
            old_state: provider.state,
            // No animation for bulk update
            stateColor: provider.stateColor,
            stateIcon: provider.stateIcon,
            stateText: provider.stateText,
            stateDescription: provider.stateDescription,
            stateDuration: provider.stateDuration,
            lastSuccessTime: provider.lastSuccessTime,
            timeSinceLastSuccess: provider.timeSinceLastSuccess,
            successDuration: provider.successDuration,
            failureDuration: provider.failureDuration,
            rtt: provider.rtt
          });
        }
      });
    } // If no structured format found, try simple object format (legacy)


    if (!statuses.sip && !statuses.iax && _typeof(statuses) === 'object') {
      Object.keys(statuses).forEach(function (providerId) {
        var provider = statuses[providerId];

        if (provider) {
          updates.push({
            provider_id: providerId,
            type: 'unknown',
            state: provider.state,
            new_state: provider.state,
            old_state: provider.state,
            stateColor: provider.stateColor,
            stateIcon: provider.stateIcon,
            stateText: provider.stateText,
            stateDescription: provider.stateDescription,
            stateDuration: provider.stateDuration,
            lastSuccessTime: provider.lastSuccessTime,
            successDuration: provider.successDuration,
            failureDuration: provider.failureDuration
          });
        }
      });
    } // Process all updates efficiently


    this.processBatchUpdates(updates);
  },

  /**
   * Process multiple status updates efficiently in batches
   */
  processBatchUpdates: function processBatchUpdates(updates) {
    var _this7 = this;

    if (!Array.isArray(updates) || updates.length === 0) {
      return;
    } // Split updates into batches for performance


    var batchSize = 10;
    var batches = [];

    for (var i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    } // Process each batch with a small delay to prevent blocking UI


    var batchIndex = 0;

    var processBatch = function processBatch() {
      if (batchIndex >= batches.length) return;
      var batch = batches[batchIndex];
      requestAnimationFrame(function () {
        batch.forEach(function (update) {
          _this7.updateProviderStatus(update);
        });
        batchIndex++;

        if (batchIndex < batches.length) {
          setTimeout(processBatch, 10); // Small delay between batches
        }
      });
    };

    processBatch();
  },

  /**
   * Show enhanced update notification with timing information
   */
  showUpdateNotification: function showUpdateNotification(message) {
    var _this8 = this;

    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;

    if (!this.$lastUpdateIndicator || !this.$lastUpdateIndicator.length) {
      return;
    }

    var $indicator = this.$lastUpdateIndicator;
    var $header = $indicator.find('.header');
    var $statusMessage = $indicator.find('.status-message');
    var $timeInfo = $indicator.find('.last-check-time'); // Update classes for styling

    $indicator.removeClass('hidden info success error warning').addClass(type); // Set appropriate header based on type

    var headers = {
      'info': globalTranslate.pr_StatusInfo || 'Status Info',
      'success': globalTranslate.pr_StatusUpdated || 'Status Updated',
      'error': globalTranslate.pr_StatusError || 'Status Error',
      'warning': globalTranslate.pr_StatusWarning || 'Status Warning'
    };
    $header.text(headers[type] || 'Status');
    $statusMessage.text(message); // Update timing information

    var now = new Date();
    $timeInfo.text("Last check: ".concat(now.toLocaleTimeString())); // Store update time

    this.lastUpdateTime = Date.now() / 1000; // Auto-hide with enhanced timing

    clearTimeout(this.notificationTimeout);
    this.notificationTimeout = setTimeout(function () {
      $indicator.addClass('hidden');
    }, duration); // Add click handler to manually dismiss

    $indicator.off('click.dismiss').on('click.dismiss', function () {
      clearTimeout(_this8.notificationTimeout);
      $indicator.addClass('hidden');
    });
  },

  /**
   * Update last check time display
   */
  updateLastCheckTime: function updateLastCheckTime(timestamp) {
    var date = new Date(timestamp * 1000);
    var timeStr = date.toLocaleTimeString(); // Update any last check time displays

    $('.provider-last-check-time').text(timeStr);
  },

  /**
   * Request immediate status update with enhanced error handling
   */
  requestStatusUpdate: function requestStatusUpdate() {
    var _this9 = this;

    // Show loading indicator
    this.showUpdateNotification(globalTranslate.pr_RequestingStatusUpdate || 'Requesting status update...', 'info', 3000); // Request status via REST API

    $.api({
      url: "".concat(globalRootUrl, "providers/api/statuses"),
      method: 'GET',
      data: {
        force: true // Force immediate update

      },
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Process the status data
          _this9.updateAllProviderStatuses(response.data); // Show success notification


          var providerCount = _this9.countProviders(response.data);

          var message = globalTranslate.pr_StatusUpdateComplete ? globalTranslate.pr_StatusUpdateComplete.replace('%s', providerCount) : "Status updated for ".concat(providerCount, " providers");

          _this9.showUpdateNotification(message, 'success');
        } else {
          _this9.showUpdateNotification(globalTranslate.pr_StatusUpdateFailed || 'Status update failed', 'error');
        }
      },
      onFailure: function onFailure(response) {
        var errorMessage = response.messages ? response.messages.join(', ') : globalTranslate.pr_StatusUpdateError || 'Error updating provider status';

        _this9.showUpdateNotification(errorMessage, 'error');
      },
      onError: function onError() {
        _this9.showUpdateNotification(globalTranslate.pr_ConnectionError || 'Connection error', 'error');
      }
    });
  },

  /**
   * Count total providers in status data
   */
  countProviders: function countProviders(statusData) {
    if (!statusData) return 0;
    var count = 0;
    if (statusData.sip) count += Object.keys(statusData.sip).length;
    if (statusData.iax) count += Object.keys(statusData.iax).length;
    if (!statusData.sip && !statusData.iax) count = Object.keys(statusData).length;
    return count;
  },

  /**
   * Get cached row element for provider
   */
  getCachedRow: function getCachedRow(providerId) {
    var $row = this.cachedRows.get(providerId);

    if (!$row || !$row.length) {
      $row = $("#".concat(providerId));

      if ($row.length) {
        this.cachedRows.set(providerId, $row);
      }
    }

    return $row;
  },

  /**
   * Show provider details modal/popup
   */
  showProviderDetails: function showProviderDetails(providerId) {
    var _this10 = this;

    // Show loading state
    this.showUpdateNotification(globalTranslate.pr_LoadingProviderDetails || 'Loading provider details...', 'info', 2000); // Fetch fresh details from API

    $.api({
      url: "".concat(globalRootUrl, "providers/api/status/").concat(providerId),
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Create detailed status modal content
          var modalContent = _this10.buildStatusDetailsModal(providerId, response.data); // Remove any existing modal


          $('#provider-status-details-modal').remove(); // Show modal using Fomantic UI

          $('body').append(modalContent);
          $('#provider-status-details-modal').modal({
            closable: true,
            onHidden: function onHidden() {
              $(this).remove();
            }
          }).modal('show');
        } else {
          _this10.showUpdateNotification(globalTranslate.pr_NoStatusInfo || 'No status information available', 'warning');
        }
      },
      onFailure: function onFailure() {
        _this10.showUpdateNotification(globalTranslate.pr_FailedToLoadDetails || 'Failed to load provider details', 'error');
      }
    });
  },

  /**
   * Build detailed status modal content
   */
  buildStatusDetailsModal: function buildStatusDetailsModal(providerId, statusInfo) {
    var uniqid = statusInfo.uniqid,
        description = statusInfo.description,
        host = statusInfo.host,
        username = statusInfo.username,
        state = statusInfo.state,
        stateDescription = statusInfo.stateDescription,
        stateColor = statusInfo.stateColor,
        stateDuration = statusInfo.stateDuration,
        lastSuccessTime = statusInfo.lastSuccessTime,
        timeSinceLastSuccess = statusInfo.timeSinceLastSuccess,
        successDuration = statusInfo.successDuration,
        failureDuration = statusInfo.failureDuration,
        rtt = statusInfo.rtt,
        statistics = statusInfo.statistics,
        recentEvents = statusInfo.recentEvents,
        lastUpdateFormatted = statusInfo.lastUpdateFormatted,
        stateStartTimeFormatted = statusInfo.stateStartTimeFormatted; // Build statistics section

    var statsHtml = '';

    if (statistics) {
      var totalChecks = statistics.totalChecks,
          successCount = statistics.successCount,
          failureCount = statistics.failureCount,
          availability = statistics.availability,
          averageRtt = statistics.averageRtt,
          minRtt = statistics.minRtt,
          maxRtt = statistics.maxRtt;

      if (totalChecks > 0) {
        statsHtml = "\n                <div class=\"ui segment\">\n                    <h4>".concat(globalTranslate.pr_Statistics || 'Statistics', "</h4>\n                    <div class=\"ui four column grid\">\n                        <div class=\"column\">\n                            <div class=\"ui tiny statistic\">\n                                <div class=\"value\">").concat(totalChecks, "</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_TotalChecks || 'Total Checks', "</div>\n                            </div>\n                        </div>\n                        <div class=\"column\">\n                            <div class=\"ui tiny green statistic\">\n                                <div class=\"value\">").concat(successCount, "</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_Success || 'Success', "</div>\n                            </div>\n                        </div>\n                        <div class=\"column\">\n                            <div class=\"ui tiny red statistic\">\n                                <div class=\"value\">").concat(failureCount, "</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_Failures || 'Failures', "</div>\n                            </div>\n                        </div>\n                        <div class=\"column\">\n                            <div class=\"ui tiny ").concat(availability >= 99 ? 'green' : availability >= 95 ? 'yellow' : 'red', " statistic\">\n                                <div class=\"value\">").concat(availability, "%</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_Availability || 'Availability', "</div>\n                            </div>\n                        </div>\n                    </div>\n                    ").concat(averageRtt !== null ? "\n                    <div class=\"ui divider\"></div>\n                    <div class=\"ui three column grid\">\n                        <div class=\"column\">\n                            <strong>".concat(globalTranslate.pr_AverageRTT || 'Average RTT', ":</strong> ").concat(averageRtt, " ms\n                        </div>\n                        <div class=\"column\">\n                            <strong>").concat(globalTranslate.pr_MinRTT || 'Min RTT', ":</strong> ").concat(minRtt, " ms\n                        </div>\n                        <div class=\"column\">\n                            <strong>").concat(globalTranslate.pr_MaxRTT || 'Max RTT', ":</strong> ").concat(maxRtt, " ms\n                        </div>\n                    </div>") : '', "\n                </div>");
      }
    } // Build recent events section


    var eventsHtml = '';

    if (recentEvents && recentEvents.length > 0) {
      var eventRows = recentEvents.slice(0, 5).map(function (event) {
        var eventType = event.type === 'error' ? 'red' : event.type === 'warning' ? 'yellow' : 'green';
        var eventText = globalTranslate[event.event] || event.event || event.state;
        return "\n                    <tr>\n                        <td><i class=\"".concat(eventType, " circle icon\"></i></td>\n                        <td>").concat(event.date, "</td>\n                        <td>").concat(eventText, "</td>\n                        <td>").concat(event.state, "</td>\n                    </tr>\n                ");
      }).join('');
      eventsHtml = "\n            <div class=\"ui segment\">\n                <h4>".concat(globalTranslate.pr_RecentEvents || 'Recent Events', "</h4>\n                <table class=\"ui very basic compact table\">\n                    <tbody>\n                        ").concat(eventRows, "\n                    </tbody>\n                </table>\n            </div>");
    }

    return "\n            <div id=\"provider-status-details-modal\" class=\"ui large modal\">\n                <div class=\"header\">\n                    <i class=\"".concat(stateColor, " circle icon\"></i>\n                    ").concat(description || uniqid, "\n                </div>\n                <div class=\"content\">\n                    <div class=\"ui segments\">\n                        <div class=\"ui segment\">\n                            <h4>").concat(globalTranslate.pr_ProviderInfo || 'Provider Information', "</h4>\n                            <div class=\"ui two column grid\">\n                                <div class=\"column\">\n                                    <div class=\"ui list\">\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_ProviderId || 'Provider ID', ":</strong> ").concat(uniqid, "\n                                        </div>\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_Host || 'Host', ":</strong> ").concat(host, "\n                                        </div>\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_Username || 'Username', ":</strong> ").concat(username, "\n                                        </div>\n                                    </div>\n                                </div>\n                                <div class=\"column\">\n                                    <div class=\"ui list\">\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_CurrentState || 'Current State', ":</strong> \n                                            <span class=\"ui ").concat(stateColor, " text\">").concat(globalTranslate[stateDescription] || state, "</span>\n                                        </div>\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_StateDuration || 'State Duration', ":</strong> \n                                            ").concat(this.formatDuration(stateDuration), "\n                                        </div>\n                                        ").concat(rtt !== null && rtt !== undefined ? "\n                                        <div class=\"item\">\n                                            <strong>".concat(globalTranslate.pr_CurrentRTT || 'Current RTT', ":</strong> \n                                            <span style=\"color: ").concat(rtt > 200 ? 'red' : rtt > 100 ? 'orange' : 'green', "\">\n                                                ").concat(rtt, " ms\n                                            </span>\n                                        </div>") : '', "\n                                    </div>\n                                </div>\n                            </div>\n                            ").concat(lastSuccessTime ? "\n                            <div class=\"ui divider\"></div>\n                            <div class=\"ui two column grid\">\n                                <div class=\"column\">\n                                    <strong>".concat(globalTranslate.pr_LastSuccess || 'Last Success', ":</strong> \n                                    ").concat(this.formatTimeAgo(lastSuccessTime), "\n                                </div>\n                                <div class=\"column\">\n                                    <strong>").concat(globalTranslate.pr_LastUpdate || 'Last Update', ":</strong> \n                                    ").concat(lastUpdateFormatted || new Date().toLocaleString(), "\n                                </div>\n                            </div>") : '', "\n                        </div>\n                        ").concat(statsHtml, "\n                        ").concat(eventsHtml, "\n                    </div>\n                </div>\n                <div class=\"actions\">\n                    <button class=\"ui button\" onclick=\"window.location.href='").concat(globalRootUrl, "providers/modify/").concat(uniqid, "'\">\n                        <i class=\"edit icon\"></i>\n                        ").concat(globalTranslate.pr_EditProvider || 'Edit Provider', "\n                    </button>\n                    <button class=\"ui primary button\" onclick=\"ProviderStatusMonitor.requestProviderCheck('").concat(uniqid, "')\">\n                        <i class=\"sync icon\"></i>\n                        ").concat(globalTranslate.pr_CheckNow || 'Check Now', "\n                    </button>\n                    <div class=\"ui cancel button\">\n                        ").concat(globalTranslate.pr_Close || 'Close', "\n                    </div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Request immediate check for specific provider
   */
  requestProviderCheck: function requestProviderCheck(providerId) {
    var _this11 = this;

    $.api({
      url: "".concat(globalRootUrl, "providers/api/status/").concat(providerId),
      method: 'GET',
      data: {
        forceCheck: true,
        refreshFromAmi: true
      },
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result) {
          _this11.showUpdateNotification(globalTranslate.pr_CheckRequested || 'Check requested', 'success', 2000); // Update modal with fresh data if still open


          if ($('#provider-status-details-modal').length && response.data) {
            $('#provider-status-details-modal').modal('hide'); // Show updated modal with fresh data

            setTimeout(function () {
              var modalContent = _this11.buildStatusDetailsModal(providerId, response.data);

              $('#provider-status-details-modal').remove();
              $('body').append(modalContent);
              $('#provider-status-details-modal').modal({
                closable: true,
                onHidden: function onHidden() {
                  $(this).remove();
                }
              }).modal('show');
            }, 500);
          }
        }
      },
      onFailure: function onFailure() {
        _this11.showUpdateNotification(globalTranslate.pr_CheckFailed || 'Check failed', 'error', 3000);
      }
    });
  }
}; // Enhanced initialization with user interaction support

$(document).ready(function () {
  // Add manual refresh button if not exists
  if ($('.provider-refresh-btn').length === 0 && $('.ui.container.segment').length) {
    var refreshButton = "\n            <button class=\"ui mini labeled icon button provider-refresh-btn\" \n                    style=\"position: absolute; top: 10px; right: 10px; z-index: 100;\">\n                <i class=\"sync icon\"></i>\n                ".concat(globalTranslate.pr_RefreshStatus || 'Refresh Status', "\n            </button>\n        ");
    $('.ui.container.segment').css('position', 'relative').append(refreshButton); // Add click handler for refresh button

    $('.provider-refresh-btn').on('click', function (e) {
      e.preventDefault();

      if (typeof ProviderStatusMonitor !== 'undefined') {
        ProviderStatusMonitor.requestStatusUpdate();
      }
    });
  } // Add double-click handlers for status cells to show details modal


  $(document).on('dblclick', '.provider-status .ui.label', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var providerId = $(this).closest('tr').attr('id');

    if (providerId && typeof ProviderStatusMonitor !== 'undefined') {
      ProviderStatusMonitor.showProviderDetails(providerId);
    }
  }); // Clean up modals when they're hidden

  $(document).on('hidden.bs.modal', '#provider-status-details-modal', function () {
    $(this).remove();
  });
}); // Don't auto-initialize the monitor here - let providers-index.js handle it
// This allows for proper sequencing with DataTable initialization
// Export for use in other modules

window.ProviderStatusMonitor = ProviderStatusMonitor;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwiY2hhbm5lbElkIiwiaXNJbml0aWFsaXplZCIsImxhc3RVcGRhdGVUaW1lIiwic3RhdHVzQ2FjaGUiLCIkc3RhdHVzQ2VsbHMiLCIkbGFzdFVwZGF0ZUluZGljYXRvciIsImNhY2hlZFJvd3MiLCJNYXAiLCJjYWNoZWRTdGF0dXNDZWxscyIsImluaXRpYWxpemUiLCJjYWNoZUVsZW1lbnRzIiwiY3JlYXRlU3RhdHVzSW5kaWNhdG9yIiwic3Vic2NyaWJlVG9FdmVudHMiLCJzZXR1cEhlYWx0aENoZWNrcyIsIiQiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJHJvdyIsImlkIiwiYXR0ciIsInNldCIsIiRzdGF0dXNDZWxsIiwiZmluZCIsImxlbmd0aCIsImluZGljYXRvciIsInByZXBlbmQiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudEJ1c01lc3NhZ2UiLCJjb25zb2xlIiwid2FybiIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwiY2hhbmdlcyIsIkFycmF5IiwiaXNBcnJheSIsInRpbWVzdGFtcCIsIkRhdGUiLCJub3ciLCJmb3JFYWNoIiwiY2hhbmdlIiwidXBkYXRlUHJvdmlkZXJTdGF0dXMiLCJjaGFuZ2VDb3VudCIsInByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZCIsInByX011bHRpcGxlUHJvdmlkZXJTdGF0dXNlc0NoYW5nZWQiLCJyZXBsYWNlIiwic2hvd1VwZGF0ZU5vdGlmaWNhdGlvbiIsInN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsInVwZGF0ZUxhc3RDaGVja1RpbWUiLCJlcnJvck1zZyIsImVycm9yIiwicHJfU3RhdHVzQ2hlY2tGYWlsZWQiLCJwcm92aWRlcl9pZCIsInR5cGUiLCJzdGF0ZSIsIm5ld19zdGF0ZSIsIm9sZF9zdGF0ZSIsInN0YXRlQ29sb3IiLCJzdGF0ZUljb24iLCJzdGF0ZVRleHQiLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdGVEdXJhdGlvbiIsImxhc3RTdWNjZXNzVGltZSIsInRpbWVTaW5jZUxhc3RTdWNjZXNzIiwic3VjY2Vzc0R1cmF0aW9uIiwiZmFpbHVyZUR1cmF0aW9uIiwiZ2V0IiwiY3VycmVudFN0YXRlIiwicHJldmlvdXNTdGF0ZSIsInRvb2x0aXBDb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInJ0dCIsImhvc3QiLCJ1c2VybmFtZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwicG9wdXAiLCJob3ZlcmFibGUiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCIkZmFpbHVyZUNlbGwiLCJ1cGRhdGVEdXJhdGlvbkRpc3BsYXkiLCJ0cmFuc2l0aW9uIiwidXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3kiLCJzdGF0dXNJbmZvIiwic3RhdGVUaXRsZSIsInRvb2x0aXAiLCJoYXNTdGF0dXNJbmZvIiwic3RhdHVzU2VjdGlvbiIsInVuZGVmaW5lZCIsImZvcm1hdHRlZER1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJkdXJhdGlvbkxhYmVsIiwicHJfU3RhdHVzRHVyYXRpb24iLCJydHRMYWJlbCIsInByX1JUVCIsInJ0dENsYXNzIiwiZm9ybWF0dGVkVGltZSIsImxhc3RTdWNjZXNzTGFiZWwiLCJwcl9MYXN0U3VjY2Vzc1RpbWUiLCJzdWNjZXNzTGFiZWwiLCJwcl9TdWNjZXNzRHVyYXRpb24iLCJmYWlsdXJlTGFiZWwiLCJwcl9GYWlsdXJlRHVyYXRpb24iLCJkdXJhdGlvbnMiLCIkZHVyYXRpb25JbmZvIiwiJG5hbWVDb2x1bW4iLCJlcSIsImFwcGVuZCIsImR1cmF0aW9uVGV4dCIsInN0YXRlTGFiZWwiLCJ0aW1lQWdvIiwiZm9ybWF0VGltZUFnbyIsInNlY29uZHMiLCJ6ZXJvRm9ybWF0IiwicHJfVGltZUZvcm1hdF9TZWNvbmRzIiwiZGF5cyIsIk1hdGgiLCJmbG9vciIsImhvdXJzIiwibWludXRlcyIsInNlY3MiLCJyZXN1bHQiLCJmb3JtYXQiLCJwcl9UaW1lRm9ybWF0X0RheXMiLCJwdXNoIiwicHJfVGltZUZvcm1hdF9Ib3VycyIsInByX1RpbWVGb3JtYXRfTWludXRlcyIsInNsaWNlIiwiam9pbiIsImRpZmYiLCJhZ29MYWJlbCIsInByX1RpbWVBZ28iLCJwcl9KdXN0Tm93IiwiZ3JlZW4iLCJncmV5IiwieWVsbG93IiwicmVkIiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJ1cGRhdGVzIiwic2lwIiwiT2JqZWN0Iiwia2V5cyIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsImlheCIsInByb2Nlc3NCYXRjaFVwZGF0ZXMiLCJiYXRjaFNpemUiLCJiYXRjaGVzIiwiaSIsImJhdGNoSW5kZXgiLCJwcm9jZXNzQmF0Y2giLCJiYXRjaCIsInVwZGF0ZSIsImR1cmF0aW9uIiwiJGluZGljYXRvciIsIiRoZWFkZXIiLCIkc3RhdHVzTWVzc2FnZSIsIiR0aW1lSW5mbyIsImhlYWRlcnMiLCJwcl9TdGF0dXNJbmZvIiwicHJfU3RhdHVzVXBkYXRlZCIsInByX1N0YXR1c0Vycm9yIiwicHJfU3RhdHVzV2FybmluZyIsInRvTG9jYWxlVGltZVN0cmluZyIsImNsZWFyVGltZW91dCIsIm5vdGlmaWNhdGlvblRpbWVvdXQiLCJvZmYiLCJvbiIsImRhdGUiLCJ0aW1lU3RyIiwicHJfUmVxdWVzdGluZ1N0YXR1c1VwZGF0ZSIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJmb3JjZSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwicHJvdmlkZXJDb3VudCIsImNvdW50UHJvdmlkZXJzIiwicHJfU3RhdHVzVXBkYXRlQ29tcGxldGUiLCJwcl9TdGF0dXNVcGRhdGVGYWlsZWQiLCJvbkZhaWx1cmUiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsInByX1N0YXR1c1VwZGF0ZUVycm9yIiwib25FcnJvciIsInByX0Nvbm5lY3Rpb25FcnJvciIsInN0YXR1c0RhdGEiLCJjb3VudCIsImdldENhY2hlZFJvdyIsInNob3dQcm92aWRlckRldGFpbHMiLCJwcl9Mb2FkaW5nUHJvdmlkZXJEZXRhaWxzIiwibW9kYWxDb250ZW50IiwiYnVpbGRTdGF0dXNEZXRhaWxzTW9kYWwiLCJyZW1vdmUiLCJtb2RhbCIsImNsb3NhYmxlIiwib25IaWRkZW4iLCJwcl9Ob1N0YXR1c0luZm8iLCJwcl9GYWlsZWRUb0xvYWREZXRhaWxzIiwidW5pcWlkIiwiZGVzY3JpcHRpb24iLCJzdGF0aXN0aWNzIiwicmVjZW50RXZlbnRzIiwibGFzdFVwZGF0ZUZvcm1hdHRlZCIsInN0YXRlU3RhcnRUaW1lRm9ybWF0dGVkIiwic3RhdHNIdG1sIiwidG90YWxDaGVja3MiLCJzdWNjZXNzQ291bnQiLCJmYWlsdXJlQ291bnQiLCJhdmFpbGFiaWxpdHkiLCJhdmVyYWdlUnR0IiwibWluUnR0IiwibWF4UnR0IiwicHJfU3RhdGlzdGljcyIsInByX1RvdGFsQ2hlY2tzIiwicHJfU3VjY2VzcyIsInByX0ZhaWx1cmVzIiwicHJfQXZhaWxhYmlsaXR5IiwicHJfQXZlcmFnZVJUVCIsInByX01pblJUVCIsInByX01heFJUVCIsImV2ZW50c0h0bWwiLCJldmVudFJvd3MiLCJtYXAiLCJldmVudFR5cGUiLCJldmVudFRleHQiLCJwcl9SZWNlbnRFdmVudHMiLCJwcl9Qcm92aWRlckluZm8iLCJwcl9Qcm92aWRlcklkIiwicHJfSG9zdCIsInByX1VzZXJuYW1lIiwicHJfQ3VycmVudFN0YXRlIiwicHJfU3RhdGVEdXJhdGlvbiIsInByX0N1cnJlbnRSVFQiLCJwcl9MYXN0U3VjY2VzcyIsInByX0xhc3RVcGRhdGUiLCJ0b0xvY2FsZVN0cmluZyIsInByX0VkaXRQcm92aWRlciIsInByX0NoZWNrTm93IiwicHJfQ2xvc2UiLCJyZXF1ZXN0UHJvdmlkZXJDaGVjayIsImZvcmNlQ2hlY2siLCJyZWZyZXNoRnJvbUFtaSIsInByX0NoZWNrUmVxdWVzdGVkIiwicHJfQ2hlY2tGYWlsZWQiLCJkb2N1bWVudCIsInJlYWR5IiwicmVmcmVzaEJ1dHRvbiIsInByX1JlZnJlc2hTdGF0dXMiLCJjc3MiLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJjbG9zZXN0Iiwid2luZG93Il0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQkMsRUFBQUEsU0FBUyxFQUFFLGlCQURlO0FBRTFCQyxFQUFBQSxhQUFhLEVBQUUsS0FGVztBQUcxQkMsRUFBQUEsY0FBYyxFQUFFLENBSFU7QUFJMUJDLEVBQUFBLFdBQVcsRUFBRSxFQUphOztBQU0xQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBVFk7QUFVMUJDLEVBQUFBLG9CQUFvQixFQUFFLElBVkk7O0FBWTFCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFBSUMsR0FBSixFQWZjO0FBZ0IxQkMsRUFBQUEsaUJBQWlCLEVBQUUsSUFBSUQsR0FBSixFQWhCTzs7QUFrQjFCO0FBQ0o7QUFDQTtBQUNJRSxFQUFBQSxVQXJCMEIsd0JBcUJiO0FBQ1QsUUFBSSxLQUFLUixh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QUksT0FBT3RLLHFCQUFQLEtBQWlDLFdBQW5ELEVBQWdFO0FBQzVEQSxNQUFBQSxxQkFBcUIsQ0FBQ3VOLG1CQUF0QixDQUEwQ2pELFVBQTFDO0FBQ0g7QUFDSixHQVJELEVBdEJvQixDQWdDcEI7O0FBQ0F2SixFQUFBQSxDQUFDLENBQUNnUSxRQUFELENBQUQsQ0FBWWhGLEVBQVosQ0FBZSxpQkFBZixFQUFrQyxnQ0FBbEMsRUFBb0UsWUFBVztBQUMzRWhMLElBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTRNLE1BQVI7QUFDSCxHQUZEO0FBR0gsQ0FwQ0QsRSxDQXNDQTtBQUNBO0FBRUE7O0FBQ0E2RCxNQUFNLENBQUN4UixxQkFBUCxHQUErQkEscUJBQS9CIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXZlbnRCdXMgKi9cblxuLyoqXG4gKiBQcm92aWRlciBTdGF0dXMgTW9uaXRvclxuICogSGFuZGxlcyByZWFsLXRpbWUgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIHdpdGggZW5oYW5jZWQgZmVhdHVyZXM6XG4gKiAtIFJlYWwtdGltZSBzdGF0dXMgdXBkYXRlcyB3aXRoIEV2ZW50QnVzIGludGVncmF0aW9uXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRHVyYXRpb24gZGlzcGxheXMgKHN0YXRlIGR1cmF0aW9uLCBzdWNjZXNzL2ZhaWx1cmUgZHVyYXRpb24pXG4gKiAtIExhc3Qgc3VjY2VzcyBpbmZvcm1hdGlvblxuICogLSBFbmhhbmNlZCB2aXN1YWwgZmVlZGJhY2sgd2l0aCBGb21hbnRpYyBVSSBjb21wb25lbnRzXG4gKi9cbmNvbnN0IFByb3ZpZGVyU3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdwcm92aWRlci1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGxhc3RVcGRhdGVUaW1lOiAwLFxuICAgIHN0YXR1c0NhY2hlOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNDZWxsczogbnVsbCxcbiAgICAkbGFzdFVwZGF0ZUluZGljYXRvcjogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBET00gY2FjaGUgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlZFJvd3M6IG5ldyBNYXAoKSxcbiAgICBjYWNoZWRTdGF0dXNDZWxsczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyBtb25pdG9yIHdpdGggZW5oYW5jZWQgZmVhdHVyZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50cyBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZW5oYW5jZWQgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLnByb3ZpZGVyLXN0YXR1cywgLnByb3ZpZGVyLXN0YXR1cy1jZWxsJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBwcm92aWRlciByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIucHJvdmlkZXItcm93LCB0cltpZF0nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICRyb3cuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoaWQsICRyb3cpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChpZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZW5oYW5jZWQgc3RhdHVzIGluZGljYXRvciB3aXRoIGR1cmF0aW9uIGluZm9cbiAgICAgKi9cbiAgICBjcmVhdGVTdGF0dXNJbmRpY2F0b3IoKSB7XG4gICAgICAgIGlmICgkKCcjcHJvdmlkZXItc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJwcm92aWRlci1zdGF0dXMtaW5kaWNhdG9yXCIgY2xhc3M9XCJ1aSBtaW5pIG1lc3NhZ2UgaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic3RhdHVzLW1lc3NhZ2VcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYXN0LWNoZWNrLXRpbWVcIiBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBjb2xvcjogIzg4ODtcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykucHJlcGVuZChpbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgPSAkKCcjcHJvdmlkZXItc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0V2ZW50QnVzIG5vdCBhdmFpbGFibGUsIHByb3ZpZGVyIHN0YXR1cyBtb25pdG9yIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIHBlcmlvZGljIGhlYWx0aCBjaGVja3MgYW5kIGNhY2hlIG1haW50ZW5hbmNlXG4gICAgICovXG4gICAgc2V0dXBIZWFsdGhDaGVja3MoKSB7XG4gICAgICAgIC8vIFJlZnJlc2ggY2FjaGUgZXZlcnkgMzAgc2Vjb25kcyB0byBoYW5kbGUgZHluYW1pYyBjb250ZW50XG4gICAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaENhY2hlKCk7XG4gICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIHVwZGF0ZSBldmVyeSA1IG1pbnV0ZXMgYXMgZmFsbGJhY2tcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0U3RhdHVzVXBkYXRlKCk7XG4gICAgICAgIH0sIDMwMDAwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGNhY2hlZCBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICByZWZyZXNoQ2FjaGUoKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVkUm93cy5jbGVhcigpO1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmNsZWFyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRCdXMgbWVzc2FnZSBjYW4gaGF2ZSBldmVudCBhdCB0b3AgbGV2ZWwgb3IgaW4gZGF0YVxuICAgICAgICBsZXQgZXZlbnQsIGRhdGE7XG4gICAgICAgIGlmIChtZXNzYWdlLmV2ZW50KSB7XG4gICAgICAgICAgICAvLyBFdmVudCBhdCB0b3AgbGV2ZWxcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhICYmIG1lc3NhZ2UuZGF0YS5ldmVudCkge1xuICAgICAgICAgICAgLy8gRXZlbnQgaW4gZGF0YVxuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmRhdGEuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhLmRhdGEgfHwgbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY2hlY2snOlxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0NoZWNraW5nSW5kaWNhdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX3VwZGF0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19lcnJvcic6XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTdGF0dXNFcnJvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdVbmtub3duIHByb3ZpZGVyIHN0YXR1cyBldmVudDonLCBldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgY2hlY2tpbmcgaW5kaWNhdG9yXG4gICAgICovXG4gICAgc2hvd0NoZWNraW5nSW5kaWNhdG9yKGRhdGEpIHtcbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gZXJyb3Igc3VjY2VzcycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2luZm8nKTtcbiAgICAgICAgICAgIFxuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmZpbmQoJy5jb250ZW50JylcbiAgICAgICAgICAgIC50ZXh0KGRhdGEubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tpbmdQcm92aWRlclN0YXR1c2VzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wIHx8IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gdGltZXN0YW1wO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoYW5nZVxuICAgICAgICBkYXRhLmNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm92aWRlclN0YXR1cyhjaGFuZ2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgdXBkYXRlIG5vdGlmaWNhdGlvblxuICAgICAgICBjb25zdCBjaGFuZ2VDb3VudCA9IGRhdGEuY2hhbmdlcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBjaGFuZ2VDb3VudCA9PT0gMSBcbiAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLnByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZFxuICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUucHJfTXVsdGlwbGVQcm92aWRlclN0YXR1c2VzQ2hhbmdlZC5yZXBsYWNlKCclcycsIGNoYW5nZUNvdW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgJ3N1Y2Nlc3MnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29tcGxldGUgc3RhdHVzIGRhdGFcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgICAgIHRoaXMuc3RhdHVzQ2FjaGUgPSBkYXRhLnN0YXR1c2VzO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBwcm92aWRlciBzdGF0dXNlcyBvbiB0aGUgcGFnZVxuICAgICAgICB0aGlzLnVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMoZGF0YS5zdGF0dXNlcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgbGFzdCBjaGVjayB0aW1lXG4gICAgICAgIGlmIChkYXRhLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVMYXN0Q2hlY2tUaW1lKGRhdGEudGltZXN0YW1wKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN0YXR1cyBlcnJvclxuICAgICAqL1xuICAgIGhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNDaGVja0ZhaWxlZDtcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTXNnLCAnZXJyb3InKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzaW5nbGUgcHJvdmlkZXIgc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICogTm8gaGFyZGNvZGVkIHN0YXRlIG1hcHBpbmcgLSBiYWNrZW5kIHByb3ZpZGVzIGFsbCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVQcm92aWRlclN0YXR1cyhjaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgeyBcbiAgICAgICAgICAgIHByb3ZpZGVyX2lkLCBcbiAgICAgICAgICAgIHR5cGUsIFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBuZXdfc3RhdGUsIFxuICAgICAgICAgICAgb2xkX3N0YXRlLFxuICAgICAgICAgICAgc3RhdGVDb2xvciwgXG4gICAgICAgICAgICBzdGF0ZUljb24sIFxuICAgICAgICAgICAgc3RhdGVUZXh0LCBcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICBmYWlsdXJlRHVyYXRpb25cbiAgICAgICAgfSA9IGNoYW5nZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjYWNoZWQgZWxlbWVudHMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgJHJvdyA9IHRoaXMuY2FjaGVkUm93cy5nZXQocHJvdmlkZXJfaWQpO1xuICAgICAgICBpZiAoISRyb3cpIHtcbiAgICAgICAgICAgICRyb3cgPSAkKGAjJHtwcm92aWRlcl9pZH1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KHByb3ZpZGVyX2lkLCAkcm93KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBSb3cgbm90IGZvdW5kXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCAkc3RhdHVzQ2VsbCA9IHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuZ2V0KHByb3ZpZGVyX2lkKTtcbiAgICAgICAgaWYgKCEkc3RhdHVzQ2VsbCkge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5zZXQocHJvdmlkZXJfaWQsICRzdGF0dXNDZWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBTdGF0dXMgY2VsbCBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGN1cnJlbnQgc3RhdGUgb3IgZmFsbGJhY2sgdG8gbmV3X3N0YXRlIGZvciBjb21wYXRpYmlsaXR5XG4gICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHN0YXRlIHx8IG5ld19zdGF0ZTtcbiAgICAgICAgY29uc3QgcHJldmlvdXNTdGF0ZSA9ICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBkaXJlY3RseVxuICAgICAgICBpZiAoc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgLy8gRW5oYW5jZWQgc3RhdHVzIGluZGljYXRvciB3aXRoIHRvb2x0aXAgc3VwcG9ydFxuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIHN0YXRlOiBjdXJyZW50U3RhdGUsXG4gICAgICAgICAgICAgICAgc3RhdGVUZXh0LFxuICAgICAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICBydHQ6IGNoYW5nZS5ydHQsXG4gICAgICAgICAgICAgICAgaG9zdDogY2hhbmdlLmhvc3QsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGNoYW5nZS51c2VybmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdGVDb2xvcn0gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBcbiAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIlxuICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHt0b29sdGlwQ29udGVudH1cIlxuICAgICAgICAgICAgICAgICAgICAgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIlxuICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJzbWFsbFwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQmF0Y2ggRE9NIHVwZGF0ZXMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHN0YXR1c0h0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgKEZvbWFudGljIFVJIHRvb2x0aXApXG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuZmluZCgnLnVpLmxhYmVsJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdzbWFsbCcsXG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBmYWlsdXJlIHRleHQgd2hlbiB1c2luZyBtb2Rlcm4gc3RhdHVzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCAkZmFpbHVyZUNlbGwgPSAkcm93LmZpbmQoJy5mYWlsdXJlLCAuZmVhdHVyZXMuZmFpbHVyZScpO1xuICAgICAgICAgICAgICAgIGlmICgkZmFpbHVyZUNlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgdGV4dCBzdGF0dXMgd2hlbiB3ZSBoYXZlIHZpc3VhbCBpbmRpY2F0b3JzXG4gICAgICAgICAgICAgICAgICAgICRmYWlsdXJlQ2VsbC50ZXh0KCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGR1cmF0aW9uIGluZm9ybWF0aW9uIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRHVyYXRpb25EaXNwbGF5KCRyb3csIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVUZXh0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQW5pbWF0ZSBpZiBzdGF0ZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzU3RhdGUgJiYgcHJldmlvdXNTdGF0ZSAhPT0gY3VycmVudFN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGN1cnJlbnQgc3RhdGUgZm9yIGZ1dHVyZSBjb21wYXJpc29uXG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScsIGN1cnJlbnRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0gdXNlIHNpbXBsZSBzdGF0ZS1iYXNlZCBkaXNwbGF5XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb3ZpZGVyU3RhdHVzTGVnYWN5KGNoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRvb2x0aXAgY29udGVudCB3aXRoIGVuaGFuY2VkIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChzdGF0dXNJbmZvKSB7XG4gICAgICAgIGNvbnN0IHsgXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlVGV4dCxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sIFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbiwgXG4gICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbiwgXG4gICAgICAgICAgICBmYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICBydHQsXG4gICAgICAgICAgICBob3N0LFxuICAgICAgICAgICAgdXNlcm5hbWVcbiAgICAgICAgfSA9IHN0YXR1c0luZm87XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdHJhbnNsYXRlZCBzdGF0ZSB0ZXh0IGFzIG1haW4gdGl0bGVcbiAgICAgICAgY29uc3Qgc3RhdGVUaXRsZSA9IHN0YXRlVGV4dCA/IChnbG9iYWxUcmFuc2xhdGVbc3RhdGVUZXh0XSB8fCBzdGF0ZVRleHQpIDogKGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXSB8fCBzdGF0ZURlc2NyaXB0aW9uIHx8IHN0YXRlIHx8ICcnKTtcbiAgICAgICAgXG4gICAgICAgIGxldCB0b29sdGlwID0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcFwiPmA7XG4gICAgICAgIHRvb2x0aXAgKz0gYDxzdHJvbmcgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fdGl0bGVcIj4ke3N0YXRlVGl0bGV9PC9zdHJvbmc+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBvcmlnaW5hbCBzdGF0ZSB2YWx1ZSBpZiBhdmFpbGFibGUgYW5kIGRpZmZlcmVudCBmcm9tIHRpdGxlXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZSAhPT0gc3RhdGVUaXRsZSkge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0ZS1vcmlnaW5hbFwiPlske3N0YXRlfV08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaG9zdCBhbmQgdXNlcm5hbWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChob3N0IHx8IHVzZXJuYW1lKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3NlY3Rpb25cIj5gO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2luZm8taXRlbVwiPkhvc3Q6IDxzdHJvbmc+JHtob3N0fTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodXNlcm5hbWUpIHtcbiAgICAgICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2luZm8taXRlbVwiPlVzZXI6IDxzdHJvbmc+JHt1c2VybmFtZX08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YXR1cyBpbmZvcm1hdGlvbiBzZWN0aW9uXG4gICAgICAgIGxldCBoYXNTdGF0dXNJbmZvID0gZmFsc2U7XG4gICAgICAgIGxldCBzdGF0dXNTZWN0aW9uID0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc2VjdGlvblwiPmA7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgYW5kIGFkZCBkdXJhdGlvbiBpbmZvcm1hdGlvbiAobm93IGNvbWVzIGFzIHNlY29uZHMgZnJvbSBiYWNrZW5kKVxuICAgICAgICBpZiAoc3RhdGVEdXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHN0YXRlRHVyYXRpb24gIT09IG51bGwgJiYgc3RhdGVEdXJhdGlvbiA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMuZm9ybWF0RHVyYXRpb24oc3RhdGVEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbkxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0R1cmF0aW9uIHx8ICfQlNC70LjRgtC10LvRjNC90L7RgdGC0YwnO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbVwiPiR7ZHVyYXRpb25MYWJlbH06IDxzdHJvbmc+JHtmb3JtYXR0ZWREdXJhdGlvbn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBSVFQgKFJvdW5kIFRyaXAgVGltZSkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChydHQgIT09IHVuZGVmaW5lZCAmJiBydHQgIT09IG51bGwgJiYgcnR0ID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0dExhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX1JUVCB8fCAn0JfQsNC00LXRgNC20LrQsCc7XG4gICAgICAgICAgICAvLyBGb3JtYXQgUlRUIHdpdGggY29sb3IgY29kaW5nXG4gICAgICAgICAgICBsZXQgcnR0Q2xhc3MgPSAncHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3J0dC0tZ29vZCc7XG4gICAgICAgICAgICBpZiAocnR0ID4gMTAwKSBydHRDbGFzcyA9ICdwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fcnR0LS13YXJuaW5nJztcbiAgICAgICAgICAgIGlmIChydHQgPiAyMDApIHJ0dENsYXNzID0gJ3Byb3ZpZGVyLXN0YXR1cy10b29sdGlwX19ydHQtLWJhZCc7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtXCI+JHtydHRMYWJlbH06IDxzdHJvbmcgY2xhc3M9XCIke3J0dENsYXNzfVwiPiR7cnR0fSDQvNGBPC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGhhc1N0YXR1c0luZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgdGltZSBzaW5jZSBsYXN0IHN1Y2Nlc3MgaWYgcHJvdmlkZWQgKG5vdyBjb21lcyBhcyBzZWNvbmRzKVxuICAgICAgICBpZiAodGltZVNpbmNlTGFzdFN1Y2Nlc3MgIT09IHVuZGVmaW5lZCAmJiB0aW1lU2luY2VMYXN0U3VjY2VzcyAhPT0gbnVsbCAmJiB0aW1lU2luY2VMYXN0U3VjY2VzcyA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRUaW1lID0gdGhpcy5mb3JtYXREdXJhdGlvbih0aW1lU2luY2VMYXN0U3VjY2Vzcyk7XG4gICAgICAgICAgICBjb25zdCBsYXN0U3VjY2Vzc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX0xhc3RTdWNjZXNzVGltZSB8fCAn0J/QvtGB0LvQtdC00L3QuNC5INGD0YHQv9C10YUnO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbSBwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fbGFzdC1zdWNjZXNzXCI+JHtsYXN0U3VjY2Vzc0xhYmVsfTogPHN0cm9uZz4ke2Zvcm1hdHRlZFRpbWV9INC90LDQt9Cw0LQ8L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdWNjZXNzL2ZhaWx1cmUgZHVyYXRpb24gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdWNjZXNzRHVyYXRpb24gIT09IHVuZGVmaW5lZCAmJiBzdWNjZXNzRHVyYXRpb24gIT09IG51bGwgJiYgc3VjY2Vzc0R1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRHVyYXRpb24gPSB0aGlzLmZvcm1hdER1cmF0aW9uKHN1Y2Nlc3NEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBzdWNjZXNzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3VjY2Vzc0R1cmF0aW9uIHx8ICfQktGA0LXQvNGPINGA0LDQsdC+0YLRiyc7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdWNjZXNzLWR1cmF0aW9uXCI+JHtzdWNjZXNzTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkRHVyYXRpb259PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGhhc1N0YXR1c0luZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZmFpbHVyZUR1cmF0aW9uICE9PSB1bmRlZmluZWQgJiYgZmFpbHVyZUR1cmF0aW9uICE9PSBudWxsICYmIGZhaWx1cmVEdXJhdGlvbiA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbihmYWlsdXJlRHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgZmFpbHVyZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX0ZhaWx1cmVEdXJhdGlvbiB8fCAn0JLRgNC10LzRjyDRgdCx0L7Rjyc7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19mYWlsdXJlLWR1cmF0aW9uXCI+JHtmYWlsdXJlTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkRHVyYXRpb259PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGhhc1N0YXR1c0luZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8L2Rpdj5gO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhhc1N0YXR1c0luZm8pIHtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gc3RhdHVzU2VjdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGRpZmZlcmVudCBmcm9tIHN0YXRlIHRleHRcbiAgICAgICAgaWYgKHN0YXRlRGVzY3JpcHRpb24gJiYgZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dICYmIGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXSAhPT0gc3RhdGVUaXRsZSkge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19kZXNjcmlwdGlvblwiPmA7XG4gICAgICAgICAgICB0b29sdGlwICs9IGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXTtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gYDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRvb2x0aXAgKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdG9vbHRpcC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZHVyYXRpb24gZGlzcGxheSBpbiBwcm92aWRlciByb3dcbiAgICAgKi9cbiAgICB1cGRhdGVEdXJhdGlvbkRpc3BsYXkoJHJvdywgZHVyYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGVEdXJhdGlvbiwgbGFzdFN1Y2Nlc3NUaW1lLCBzdWNjZXNzRHVyYXRpb24sIGZhaWx1cmVEdXJhdGlvbiwgc3RhdGVUZXh0IH0gPSBkdXJhdGlvbnM7XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBkdXJhdGlvbiBkaXNwbGF5IGVsZW1lbnRzIG9yIGNyZWF0ZSB0aGVtXG4gICAgICAgIGxldCAkZHVyYXRpb25JbmZvID0gJHJvdy5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICBpZiAoJGR1cmF0aW9uSW5mby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIEFkZCBkdXJhdGlvbiBpbmZvIGNvbnRhaW5lciB0byB0aGUgcHJvdmlkZXIgbmFtZSBjb2x1bW5cbiAgICAgICAgICAgIGNvbnN0ICRuYW1lQ29sdW1uID0gJHJvdy5maW5kKCd0ZCcpLmVxKDIpOyAvLyBVc3VhbGx5IHRoZSB0aGlyZCBjb2x1bW4gY29udGFpbnMgcHJvdmlkZXIgbmFtZVxuICAgICAgICAgICAgaWYgKCRuYW1lQ29sdW1uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRuYW1lQ29sdW1uLmFwcGVuZCgnPGRpdiBjbGFzcz1cInByb3ZpZGVyLWR1cmF0aW9uLWluZm9cIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkZHVyYXRpb25JbmZvID0gJG5hbWVDb2x1bW4uZmluZCgnLnByb3ZpZGVyLWR1cmF0aW9uLWluZm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCRkdXJhdGlvbkluZm8ubGVuZ3RoICYmIChzdGF0ZUR1cmF0aW9uIHx8IGxhc3RTdWNjZXNzVGltZSB8fCBzdWNjZXNzRHVyYXRpb24gfHwgZmFpbHVyZUR1cmF0aW9uKSkge1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uVGV4dCA9ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0cmFuc2xhdGVkIHN0YXRlIHRleHQgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgdXNlIGdlbmVyaWMgbGFiZWxcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZUxhYmVsID0gc3RhdGVUZXh0ID8gZ2xvYmFsVHJhbnNsYXRlW3N0YXRlVGV4dF0gfHwgc3RhdGVUZXh0IDogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0R1cmF0aW9uIHx8ICdTdGF0ZSc7XG4gICAgICAgICAgICAgICAgZHVyYXRpb25UZXh0ICs9IGAke3N0YXRlTGFiZWx9OiAke3RoaXMuZm9ybWF0RHVyYXRpb24oc3RhdGVEdXJhdGlvbil9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGxhc3RTdWNjZXNzVGltZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVBZ28gPSB0aGlzLmZvcm1hdFRpbWVBZ28obGFzdFN1Y2Nlc3NUaW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0U3VjY2Vzc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX0xhc3RTdWNjZXNzVGltZSB8fCAnTGFzdCBzdWNjZXNzJztcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25UZXh0KSBkdXJhdGlvblRleHQgKz0gJyB8ICc7XG4gICAgICAgICAgICAgICAgZHVyYXRpb25UZXh0ICs9IGAke2xhc3RTdWNjZXNzTGFiZWx9OiAke3RpbWVBZ299YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGR1cmF0aW9uSW5mby50ZXh0KGR1cmF0aW9uVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBkdXJhdGlvbiBpbiBzZWNvbmRzIHRvIGh1bWFuIHJlYWRhYmxlIGZvcm1hdFxuICAgICAqL1xuICAgIGZvcm1hdER1cmF0aW9uKHNlY29uZHMpIHtcbiAgICAgICAgaWYgKCFzZWNvbmRzIHx8IHNlY29uZHMgPCAwKSB7XG4gICAgICAgICAgICAvLyBSZXR1cm4gMCBzZWNvbmRzIHVzaW5nIHRyYW5zbGF0aW9uXG4gICAgICAgICAgICBjb25zdCB6ZXJvRm9ybWF0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1RpbWVGb3JtYXRfU2Vjb25kcyB8fCAnJXMgcyc7XG4gICAgICAgICAgICByZXR1cm4gemVyb0Zvcm1hdC5yZXBsYWNlKCclcycsICcwJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKHNlY29uZHMgLyA4NjQwMCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDg2NDAwKSAvIDM2MDApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApIC8gNjApO1xuICAgICAgICBjb25zdCBzZWNzID0gTWF0aC5mbG9vcihzZWNvbmRzICUgNjApO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRyYW5zbGF0ZWQgZm9ybWF0IHN0cmluZ3NcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9EYXlzIHx8ICclcyBkJztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIGRheXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9Ib3VycyB8fCAnJXMgaCc7XG4gICAgICAgICAgICByZXN1bHQucHVzaChmb3JtYXQucmVwbGFjZSgnJXMnLCBob3VycykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtaW51dGVzID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1RpbWVGb3JtYXRfTWludXRlcyB8fCAnJXMgbSc7XG4gICAgICAgICAgICByZXN1bHQucHVzaChmb3JtYXQucmVwbGFjZSgnJXMnLCBtaW51dGVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlY3MgPiAwIHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X1NlY29uZHMgfHwgJyVzIHMnO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgc2VjcykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBKb2luIHdpdGggc3BhY2UsIHNob3cgbWF4IDIgdW5pdHMgZm9yIHJlYWRhYmlsaXR5XG4gICAgICAgIHJldHVybiByZXN1bHQuc2xpY2UoMCwgMikuam9pbignICcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWVzdGFtcCB0byBcInRpbWUgYWdvXCIgZm9ybWF0XG4gICAgICovXG4gICAgZm9ybWF0VGltZUFnbyh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKSAvIDEwMDA7XG4gICAgICAgIGNvbnN0IGRpZmYgPSBub3cgLSB0aW1lc3RhbXA7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgZm9ybWF0RHVyYXRpb24gdG8gZ2V0IGNvbnNpc3RlbnQgZm9ybWF0dGluZyB3aXRoIHRyYW5zbGF0aW9uc1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRUaW1lID0gdGhpcy5mb3JtYXREdXJhdGlvbihkaWZmKTtcbiAgICAgICAgY29uc3QgYWdvTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUFnbyB8fCAnYWdvJztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciB2ZXJ5IHJlY2VudCB0aW1lcywgdXNlIHNwZWNpYWwgbGFiZWxcbiAgICAgICAgaWYgKGRpZmYgPCA2MCkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5wcl9KdXN0Tm93IHx8IGZvcm1hdHRlZFRpbWUgKyAnICcgKyBhZ29MYWJlbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFRpbWUgKyAnICcgKyBhZ29MYWJlbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIG1ldGhvZCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZVByb3ZpZGVyU3RhdHVzTGVnYWN5KGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IHByb3ZpZGVyX2lkLCBuZXdfc3RhdGUsIG9sZF9zdGF0ZSB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke3Byb3ZpZGVyX2lkfWApO1xuICAgICAgICBpZiAoJHJvdy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBjb250ZW50XG4gICAgICAgICRzdGF0dXNDZWxsLmh0bWwoJycpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2ltcGxlIHN0YXR1cyBpbmRpY2F0b3JzXG4gICAgICAgIGNvbnN0IGdyZWVuID0gJzxkaXYgY2xhc3M9XCJ1aSBncmVlbiBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuICAgICAgICBjb25zdCBncmV5ID0gJzxkaXYgY2xhc3M9XCJ1aSBncmV5IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IHllbGxvdyA9ICc8ZGl2IGNsYXNzPVwidWkgeWVsbG93IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IHJlZCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVkIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICAvLyBCYXNpYyBzdGF0ZSBtYXBwaW5nIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRTdGF0ZSA9IChuZXdfc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmVlbik7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnTEFHR0VEJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHllbGxvdyk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZXkpO1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnLmZhaWx1cmUnKS50ZXh0KCcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwocmVkKTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dChuZXdfc3RhdGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZXkpO1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnLmZhaWx1cmUnKS50ZXh0KG5ld19zdGF0ZSB8fCAnVW5rbm93bicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYW5pbWF0aW9uIGZvciBjaGFuZ2VcbiAgICAgICAgaWYgKG9sZF9zdGF0ZSAhPT0gbmV3X3N0YXRlKSB7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWxsIHByb3ZpZGVyIHN0YXR1c2VzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICogU3VwcG9ydHMgYm90aCBsZWdhY3kgZm9ybWF0IGFuZCBuZXcgZW5oYW5jZWQgZm9ybWF0IHdpdGggZHVyYXRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhzdGF0dXNlcykge1xuICAgICAgICBpZiAoIXN0YXR1c2VzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJhdGNoIERPTSB1cGRhdGVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgY29uc3QgdXBkYXRlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHN0cnVjdHVyZWQgZm9ybWF0IHdpdGggc2lwL2lheCBzZXBhcmF0aW9uXG4gICAgICAgIGlmIChzdGF0dXNlcy5zaXAgJiYgdHlwZW9mIHN0YXR1c2VzLnNpcCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0YXR1c2VzLnNpcCkuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IHN0YXR1c2VzLnNpcFtwcm92aWRlcklkXTtcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyX2lkOiBwcm92aWRlcklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3NpcCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZTogcHJvdmlkZXIuc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdfc3RhdGU6IHByb3ZpZGVyLnN0YXRlLCAvLyBGb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgICAgICAgICAgb2xkX3N0YXRlOiBwcm92aWRlci5zdGF0ZSwgLy8gTm8gYW5pbWF0aW9uIGZvciBidWxrIHVwZGF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVDb2xvcjogcHJvdmlkZXIuc3RhdGVDb2xvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlSWNvbjogcHJvdmlkZXIuc3RhdGVJY29uLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVUZXh0OiBwcm92aWRlci5zdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uOiBwcm92aWRlci5zdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVEdXJhdGlvbjogcHJvdmlkZXIuc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZTogcHJvdmlkZXIubGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3M6IHByb3ZpZGVyLnRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uOiBwcm92aWRlci5zdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlRHVyYXRpb246IHByb3ZpZGVyLmZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ0dDogcHJvdmlkZXIucnR0XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgSUFYIHByb3ZpZGVyc1xuICAgICAgICBpZiAoc3RhdHVzZXMuaWF4ICYmIHR5cGVvZiBzdGF0dXNlcy5pYXggPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzdGF0dXNlcy5pYXgpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBzdGF0dXNlcy5pYXhbcHJvdmlkZXJJZF07XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcl9pZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpYXgnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGU6IHByb3ZpZGVyLnN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3X3N0YXRlOiBwcm92aWRlci5zdGF0ZSwgLy8gRm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9sZF9zdGF0ZTogcHJvdmlkZXIuc3RhdGUsIC8vIE5vIGFuaW1hdGlvbiBmb3IgYnVsayB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlQ29sb3I6IHByb3ZpZGVyLnN0YXRlQ29sb3IsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZUljb246IHByb3ZpZGVyLnN0YXRlSWNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlVGV4dDogcHJvdmlkZXIuc3RhdGVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbjogcHJvdmlkZXIuc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlRHVyYXRpb246IHByb3ZpZGVyLnN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWU6IHByb3ZpZGVyLmxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzOiBwcm92aWRlci50aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbjogcHJvdmlkZXIuc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uOiBwcm92aWRlci5mYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBydHQ6IHByb3ZpZGVyLnJ0dFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gc3RydWN0dXJlZCBmb3JtYXQgZm91bmQsIHRyeSBzaW1wbGUgb2JqZWN0IGZvcm1hdCAobGVnYWN5KVxuICAgICAgICBpZiAoIXN0YXR1c2VzLnNpcCAmJiAhc3RhdHVzZXMuaWF4ICYmIHR5cGVvZiBzdGF0dXNlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0YXR1c2VzKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gc3RhdHVzZXNbcHJvdmlkZXJJZF07XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcl9pZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd1bmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlOiBwcm92aWRlci5zdGF0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld19zdGF0ZTogcHJvdmlkZXIuc3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbGRfc3RhdGU6IHByb3ZpZGVyLnN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVDb2xvcjogcHJvdmlkZXIuc3RhdGVDb2xvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlSWNvbjogcHJvdmlkZXIuc3RhdGVJY29uLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVUZXh0OiBwcm92aWRlci5zdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uOiBwcm92aWRlci5zdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGVEdXJhdGlvbjogcHJvdmlkZXIuc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZTogcHJvdmlkZXIubGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uOiBwcm92aWRlci5zdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlRHVyYXRpb246IHByb3ZpZGVyLmZhaWx1cmVEdXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgdXBkYXRlcyBlZmZpY2llbnRseVxuICAgICAgICB0aGlzLnByb2Nlc3NCYXRjaFVwZGF0ZXModXBkYXRlcyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIG11bHRpcGxlIHN0YXR1cyB1cGRhdGVzIGVmZmljaWVudGx5IGluIGJhdGNoZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQmF0Y2hVcGRhdGVzKHVwZGF0ZXMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHVwZGF0ZXMpIHx8IHVwZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNwbGl0IHVwZGF0ZXMgaW50byBiYXRjaGVzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICBjb25zdCBiYXRjaFNpemUgPSAxMDtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1cGRhdGVzLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcbiAgICAgICAgICAgIGJhdGNoZXMucHVzaCh1cGRhdGVzLnNsaWNlKGksIGkgKyBiYXRjaFNpemUpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGJhdGNoIHdpdGggYSBzbWFsbCBkZWxheSB0byBwcmV2ZW50IGJsb2NraW5nIFVJXG4gICAgICAgIGxldCBiYXRjaEluZGV4ID0gMDtcbiAgICAgICAgY29uc3QgcHJvY2Vzc0JhdGNoID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGJhdGNoSW5kZXggPj0gYmF0Y2hlcy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICBiYXRjaC5mb3JFYWNoKHVwZGF0ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvdmlkZXJTdGF0dXModXBkYXRlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBiYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgaWYgKGJhdGNoSW5kZXggPCBiYXRjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHByb2Nlc3NCYXRjaCwgMTApOyAvLyBTbWFsbCBkZWxheSBiZXR3ZWVuIGJhdGNoZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHByb2Nlc3NCYXRjaCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBlbmhhbmNlZCB1cGRhdGUgbm90aWZpY2F0aW9uIHdpdGggdGltaW5nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlID0gJ2luZm8nLCBkdXJhdGlvbiA9IDUwMDApIHtcbiAgICAgICAgaWYgKCF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yIHx8ICF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaW5kaWNhdG9yID0gdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvcjtcbiAgICAgICAgY29uc3QgJGhlYWRlciA9ICRpbmRpY2F0b3IuZmluZCgnLmhlYWRlcicpO1xuICAgICAgICBjb25zdCAkc3RhdHVzTWVzc2FnZSA9ICRpbmRpY2F0b3IuZmluZCgnLnN0YXR1cy1tZXNzYWdlJyk7XG4gICAgICAgIGNvbnN0ICR0aW1lSW5mbyA9ICRpbmRpY2F0b3IuZmluZCgnLmxhc3QtY2hlY2stdGltZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsYXNzZXMgZm9yIHN0eWxpbmdcbiAgICAgICAgJGluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gaW5mbyBzdWNjZXNzIGVycm9yIHdhcm5pbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGFwcHJvcHJpYXRlIGhlYWRlciBiYXNlZCBvbiB0eXBlXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnaW5mbyc6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNJbmZvIHx8ICdTdGF0dXMgSW5mbycsXG4gICAgICAgICAgICAnc3VjY2Vzcyc6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVkIHx8ICdTdGF0dXMgVXBkYXRlZCcsXG4gICAgICAgICAgICAnZXJyb3InOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRXJyb3IgfHwgJ1N0YXR1cyBFcnJvcicsXG4gICAgICAgICAgICAnd2FybmluZyc6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNXYXJuaW5nIHx8ICdTdGF0dXMgV2FybmluZydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgICRoZWFkZXIudGV4dChoZWFkZXJzW3R5cGVdIHx8ICdTdGF0dXMnKTtcbiAgICAgICAgJHN0YXR1c01lc3NhZ2UudGV4dChtZXNzYWdlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aW1pbmcgaW5mb3JtYXRpb25cbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgJHRpbWVJbmZvLnRleHQoYExhc3QgY2hlY2s6ICR7bm93LnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgdXBkYXRlIHRpbWVcbiAgICAgICAgdGhpcy5sYXN0VXBkYXRlVGltZSA9IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlIHdpdGggZW5oYW5jZWQgdGltaW5nXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCBkdXJhdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBtYW51YWxseSBkaXNtaXNzXG4gICAgICAgICRpbmRpY2F0b3Iub2ZmKCdjbGljay5kaXNtaXNzJykub24oJ2NsaWNrLmRpc21pc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBsYXN0IGNoZWNrIHRpbWUgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZUxhc3RDaGVja1RpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgdGltZVN0ciA9IGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYW55IGxhc3QgY2hlY2sgdGltZSBkaXNwbGF5c1xuICAgICAgICAkKCcucHJvdmlkZXItbGFzdC1jaGVjay10aW1lJykudGV4dCh0aW1lU3RyKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIHN0YXR1cyB1cGRhdGUgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZ1xuICAgICAqL1xuICAgIHJlcXVlc3RTdGF0dXNVcGRhdGUoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUgfHwgJ1JlcXVlc3Rpbmcgc3RhdHVzIHVwZGF0ZS4uLicsXG4gICAgICAgICAgICAnaW5mbycsXG4gICAgICAgICAgICAzMDAwXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyB2aWEgUkVTVCBBUElcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9hcGkvc3RhdHVzZXNgLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmb3JjZTogdHJ1ZSAvLyBGb3JjZSBpbW1lZGlhdGUgdXBkYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgc3RhdHVzIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVBbGxQcm92aWRlclN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlckNvdW50ID0gdGhpcy5jb3VudFByb3ZpZGVycyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVDb21wbGV0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlQ29tcGxldGUucmVwbGFjZSgnJXMnLCBwcm92aWRlckNvdW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBgU3RhdHVzIHVwZGF0ZWQgZm9yICR7cHJvdmlkZXJDb3VudH0gcHJvdmlkZXJzYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVGYWlsZWQgfHwgJ1N0YXR1cyB1cGRhdGUgZmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyBcbiAgICAgICAgICAgICAgICAgICAgPyByZXNwb25zZS5tZXNzYWdlcy5qb2luKCcsICcpXG4gICAgICAgICAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1VwZGF0ZUVycm9yIHx8ICdFcnJvciB1cGRhdGluZyBwcm92aWRlciBzdGF0dXMnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNZXNzYWdlLCAnZXJyb3InKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ29ubmVjdGlvbkVycm9yIHx8ICdDb25uZWN0aW9uIGVycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ291bnQgdG90YWwgcHJvdmlkZXJzIGluIHN0YXR1cyBkYXRhXG4gICAgICovXG4gICAgY291bnRQcm92aWRlcnMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHJldHVybiAwO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc2lwKSBjb3VudCArPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhLnNpcCkubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhdHVzRGF0YS5pYXgpIGNvdW50ICs9IE9iamVjdC5rZXlzKHN0YXR1c0RhdGEuaWF4KS5sZW5ndGg7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YS5zaXAgJiYgIXN0YXR1c0RhdGEuaWF4KSBjb3VudCA9IE9iamVjdC5rZXlzKHN0YXR1c0RhdGEpLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjYWNoZWQgcm93IGVsZW1lbnQgZm9yIHByb3ZpZGVyXG4gICAgICovXG4gICAgZ2V0Q2FjaGVkUm93KHByb3ZpZGVySWQpIHtcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KHByb3ZpZGVySWQpO1xuICAgICAgICBpZiAoISRyb3cgfHwgISRyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkcm93ID0gJChgIyR7cHJvdmlkZXJJZH1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQocHJvdmlkZXJJZCwgJHJvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRyb3c7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHByb3ZpZGVyIGRldGFpbHMgbW9kYWwvcG9wdXBcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJEZXRhaWxzKHByb3ZpZGVySWQpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Mb2FkaW5nUHJvdmlkZXJEZXRhaWxzIHx8ICdMb2FkaW5nIHByb3ZpZGVyIGRldGFpbHMuLi4nLFxuICAgICAgICAgICAgJ2luZm8nLFxuICAgICAgICAgICAgMjAwMFxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgLy8gRmV0Y2ggZnJlc2ggZGV0YWlscyBmcm9tIEFQSVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2FwaS9zdGF0dXMvJHtwcm92aWRlcklkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRldGFpbGVkIHN0YXR1cyBtb2RhbCBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsQ29udGVudCA9IHRoaXMuYnVpbGRTdGF0dXNEZXRhaWxzTW9kYWwocHJvdmlkZXJJZCwgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIG1vZGFsXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtb2RhbCB1c2luZyBGb21hbnRpYyBVSVxuICAgICAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKG1vZGFsQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uSGlkZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX05vU3RhdHVzSW5mbyB8fCAnTm8gc3RhdHVzIGluZm9ybWF0aW9uIGF2YWlsYWJsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnd2FybmluZydcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfRmFpbGVkVG9Mb2FkRGV0YWlscyB8fCAnRmFpbGVkIHRvIGxvYWQgcHJvdmlkZXIgZGV0YWlscycsXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRldGFpbGVkIHN0YXR1cyBtb2RhbCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRTdGF0dXNEZXRhaWxzTW9kYWwocHJvdmlkZXJJZCwgc3RhdHVzSW5mbykge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgICB1bmlxaWQsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbixcbiAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICB1c2VybmFtZSxcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHN0YXRlQ29sb3IsXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICBmYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICBydHQsXG4gICAgICAgICAgICBzdGF0aXN0aWNzLFxuICAgICAgICAgICAgcmVjZW50RXZlbnRzLFxuICAgICAgICAgICAgbGFzdFVwZGF0ZUZvcm1hdHRlZCxcbiAgICAgICAgICAgIHN0YXRlU3RhcnRUaW1lRm9ybWF0dGVkXG4gICAgICAgIH0gPSBzdGF0dXNJbmZvO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgc3RhdGlzdGljcyBzZWN0aW9uXG4gICAgICAgIGxldCBzdGF0c0h0bWwgPSAnJztcbiAgICAgICAgaWYgKHN0YXRpc3RpY3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHsgdG90YWxDaGVja3MsIHN1Y2Nlc3NDb3VudCwgZmFpbHVyZUNvdW50LCBhdmFpbGFiaWxpdHksIGF2ZXJhZ2VSdHQsIG1pblJ0dCwgbWF4UnR0IH0gPSBzdGF0aXN0aWNzO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodG90YWxDaGVja3MgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdHNIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxoND4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0aXN0aWNzIHx8ICdTdGF0aXN0aWNzJ308L2g0PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZm91ciBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke3RvdGFsQ2hlY2tzfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Ub3RhbENoZWNrcyB8fCAnVG90YWwgQ2hlY2tzJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IGdyZWVuIHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke3N1Y2Nlc3NDb3VudH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3VjY2VzcyB8fCAnU3VjY2Vzcyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSByZWQgc3RhdGlzdGljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiPiR7ZmFpbHVyZUNvdW50fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9GYWlsdXJlcyB8fCAnRmFpbHVyZXMnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgJHthdmFpbGFiaWxpdHkgPj0gOTkgPyAnZ3JlZW4nIDogYXZhaWxhYmlsaXR5ID49IDk1ID8gJ3llbGxvdycgOiAncmVkJ30gc3RhdGlzdGljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiPiR7YXZhaWxhYmlsaXR5fSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfQXZhaWxhYmlsaXR5IHx8ICdBdmFpbGFiaWxpdHknfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2F2ZXJhZ2VSdHQgIT09IG51bGwgPyBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aHJlZSBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfQXZlcmFnZVJUVCB8fCAnQXZlcmFnZSBSVFQnfTo8L3N0cm9uZz4gJHthdmVyYWdlUnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9NaW5SVFQgfHwgJ01pbiBSVFQnfTo8L3N0cm9uZz4gJHttaW5SdHR9IG1zXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX01heFJUVCB8fCAnTWF4IFJUVCd9Ojwvc3Ryb25nPiAke21heFJ0dH0gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgcmVjZW50IGV2ZW50cyBzZWN0aW9uXG4gICAgICAgIGxldCBldmVudHNIdG1sID0gJyc7XG4gICAgICAgIGlmIChyZWNlbnRFdmVudHMgJiYgcmVjZW50RXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50Um93cyA9IHJlY2VudEV2ZW50cy5zbGljZSgwLCA1KS5tYXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VHlwZSA9IGV2ZW50LnR5cGUgPT09ICdlcnJvcicgPyAncmVkJyA6IGV2ZW50LnR5cGUgPT09ICd3YXJuaW5nJyA/ICd5ZWxsb3cnIDogJ2dyZWVuJztcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudFRleHQgPSBnbG9iYWxUcmFuc2xhdGVbZXZlbnQuZXZlbnRdIHx8IGV2ZW50LmV2ZW50IHx8IGV2ZW50LnN0YXRlO1xuICAgICAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD48aSBjbGFzcz1cIiR7ZXZlbnRUeXBlfSBjaXJjbGUgaWNvblwiPjwvaT48L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7ZXZlbnQuZGF0ZX08L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7ZXZlbnRUZXh0fTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtldmVudC5zdGF0ZX08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZXZlbnRzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGg0PiR7Z2xvYmFsVHJhbnNsYXRlLnByX1JlY2VudEV2ZW50cyB8fCAnUmVjZW50IEV2ZW50cyd9PC9oND5cbiAgICAgICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGJhc2ljIGNvbXBhY3QgdGFibGVcIj5cbiAgICAgICAgICAgICAgICAgICAgPHRib2R5PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtldmVudFJvd3N9XG4gICAgICAgICAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGlkPVwicHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWxcIiBjbGFzcz1cInVpIGxhcmdlIG1vZGFsXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7c3RhdGVDb2xvcn0gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICR7ZGVzY3JpcHRpb24gfHwgdW5pcWlkfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50c1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDQ+JHtnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJJbmZvIHx8ICdQcm92aWRlciBJbmZvcm1hdGlvbid9PC9oND5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlcklkIHx8ICdQcm92aWRlciBJRCd9Ojwvc3Ryb25nPiAke3VuaXFpZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0hvc3QgfHwgJ0hvc3QnfTo8L3N0cm9uZz4gJHtob3N0fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfVXNlcm5hbWUgfHwgJ1VzZXJuYW1lJ306PC9zdHJvbmc+ICR7dXNlcm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGUgfHwgJ0N1cnJlbnQgU3RhdGUnfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSB0ZXh0XCI+JHtnbG9iYWxUcmFuc2xhdGVbc3RhdGVEZXNjcmlwdGlvbl0gfHwgc3RhdGV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3RhdGVEdXJhdGlvbiB8fCAnU3RhdGUgRHVyYXRpb24nfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7dGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3J0dCAhPT0gbnVsbCAmJiBydHQgIT09IHVuZGVmaW5lZCA/IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0N1cnJlbnRSVFQgfHwgJ0N1cnJlbnQgUlRUJ306PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBzdHlsZT1cImNvbG9yOiAke3J0dCA+IDIwMCA/ICdyZWQnIDogcnR0ID4gMTAwID8gJ29yYW5nZScgOiAnZ3JlZW4nfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtydHR9IG1zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtsYXN0U3VjY2Vzc1RpbWUgPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfTGFzdFN1Y2Nlc3MgfHwgJ0xhc3QgU3VjY2Vzcyd9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7dGhpcy5mb3JtYXRUaW1lQWdvKGxhc3RTdWNjZXNzVGltZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0xhc3RVcGRhdGUgfHwgJ0xhc3QgVXBkYXRlJ306PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtsYXN0VXBkYXRlRm9ybWF0dGVkIHx8IG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3N0YXRzSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZXZlbnRzSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvblwiIG9uY2xpY2s9XCJ3aW5kb3cubG9jYXRpb24uaHJlZj0nJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnkvJHt1bmlxaWR9J1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJlZGl0IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wcl9FZGl0UHJvdmlkZXIgfHwgJ0VkaXQgUHJvdmlkZXInfVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIHByaW1hcnkgYnV0dG9uXCIgb25jbGljaz1cIlByb3ZpZGVyU3RhdHVzTW9uaXRvci5yZXF1ZXN0UHJvdmlkZXJDaGVjaygnJHt1bmlxaWR9JylcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tOb3cgfHwgJ0NoZWNrIE5vdyd9XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY2FuY2VsIGJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHJfQ2xvc2UgfHwgJ0Nsb3NlJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIGNoZWNrIGZvciBzcGVjaWZpYyBwcm92aWRlclxuICAgICAqL1xuICAgIHJlcXVlc3RQcm92aWRlckNoZWNrKHByb3ZpZGVySWQpIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9hcGkvc3RhdHVzLyR7cHJvdmlkZXJJZH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmb3JjZUNoZWNrOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlZnJlc2hGcm9tQW1pOiB0cnVlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja1JlcXVlc3RlZCB8fCAnQ2hlY2sgcmVxdWVzdGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdzdWNjZXNzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDIwMDBcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RhbCB3aXRoIGZyZXNoIGRhdGEgaWYgc3RpbGwgb3BlblxuICAgICAgICAgICAgICAgICAgICBpZiAoJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJykubGVuZ3RoICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHVwZGF0ZWQgbW9kYWwgd2l0aCBmcmVzaCBkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbENvbnRlbnQgPSB0aGlzLmJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsKHByb3ZpZGVySWQsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQobW9kYWxDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2FibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkhpZGRlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NoZWNrRmFpbGVkIHx8ICdDaGVjayBmYWlsZWQnLFxuICAgICAgICAgICAgICAgICAgICAnZXJyb3InLFxuICAgICAgICAgICAgICAgICAgICAzMDAwXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gRW5oYW5jZWQgaW5pdGlhbGl6YXRpb24gd2l0aCB1c2VyIGludGVyYWN0aW9uIHN1cHBvcnRcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICAvLyBBZGQgbWFudWFsIHJlZnJlc2ggYnV0dG9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoJCgnLnByb3ZpZGVyLXJlZnJlc2gtYnRuJykubGVuZ3RoID09PSAwICYmICQoJy51aS5jb250YWluZXIuc2VnbWVudCcpLmxlbmd0aCkge1xuICAgICAgICBjb25zdCByZWZyZXNoQnV0dG9uID0gYFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIG1pbmkgbGFiZWxlZCBpY29uIGJ1dHRvbiBwcm92aWRlci1yZWZyZXNoLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICBzdHlsZT1cInBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAxMHB4OyByaWdodDogMTBweDsgei1pbmRleDogMTAwO1wiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX1JlZnJlc2hTdGF0dXMgfHwgJ1JlZnJlc2ggU3RhdHVzJ31cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgO1xuICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJykuYXBwZW5kKHJlZnJlc2hCdXR0b24pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgZm9yIHJlZnJlc2ggYnV0dG9uXG4gICAgICAgICQoJy5wcm92aWRlci1yZWZyZXNoLWJ0bicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IucmVxdWVzdFN0YXR1c1VwZGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQWRkIGRvdWJsZS1jbGljayBoYW5kbGVycyBmb3Igc3RhdHVzIGNlbGxzIHRvIHNob3cgZGV0YWlscyBtb2RhbFxuICAgICQoZG9jdW1lbnQpLm9uKCdkYmxjbGljaycsICcucHJvdmlkZXItc3RhdHVzIC51aS5sYWJlbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICBpZiAocHJvdmlkZXJJZCAmJiB0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnNob3dQcm92aWRlckRldGFpbHMocHJvdmlkZXJJZCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICAvLyBDbGVhbiB1cCBtb2RhbHMgd2hlbiB0aGV5J3JlIGhpZGRlblxuICAgICQoZG9jdW1lbnQpLm9uKCdoaWRkZW4uYnMubW9kYWwnLCAnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgfSk7XG59KTtcblxuLy8gRG9uJ3QgYXV0by1pbml0aWFsaXplIHRoZSBtb25pdG9yIGhlcmUgLSBsZXQgcHJvdmlkZXJzLWluZGV4LmpzIGhhbmRsZSBpdFxuLy8gVGhpcyBhbGxvd3MgZm9yIHByb3BlciBzZXF1ZW5jaW5nIHdpdGggRGF0YVRhYmxlIGluaXRpYWxpemF0aW9uXG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5Qcm92aWRlclN0YXR1c01vbml0b3IgPSBQcm92aWRlclN0YXR1c01vbml0b3I7Il19