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


    this.cacheElements(); // Initialize loading placeholders for all provider rows

    this.initializeLoadingPlaceholders(); // Create enhanced status indicator

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
    } // EventBus not available, provider status monitor will work without real-time updates

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

    this.cacheElements(); // Reinitialize loading placeholders for new rows

    this.initializeLoadingPlaceholders();
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

      default: // Unknown event type

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
      var durationLabel = globalTranslate.pr_StatusDuration;
      statusSection += "<div class=\"provider-status-tooltip__status-item\">".concat(durationLabel, ": <strong>").concat(formattedDuration, "</strong></div>");
      hasStatusInfo = true;
    } // Add RTT (Round Trip Time) if available


    if (rtt !== undefined && rtt !== null && rtt >= 0) {
      var rttLabel = globalTranslate.pr_RTT; // Format RTT with color coding

      var rttClass = 'provider-status-tooltip__rtt--good';
      if (rtt > 100) rttClass = 'provider-status-tooltip__rtt--warning';
      if (rtt > 200) rttClass = 'provider-status-tooltip__rtt--bad';
      statusSection += "<div class=\"provider-status-tooltip__status-item\">".concat(rttLabel, ": <strong class=\"").concat(rttClass, "\">").concat(rtt, " \u043C\u0441</strong></div>");
      hasStatusInfo = true;
    } // Format time since last success if provided (now comes as seconds)


    if (timeSinceLastSuccess !== undefined && timeSinceLastSuccess !== null && timeSinceLastSuccess >= 0) {
      var formattedTime = this.formatDuration(timeSinceLastSuccess);
      var lastSuccessLabel = globalTranslate.pr_LastSuccessTime;
      statusSection += "<div class=\"provider-status-tooltip__status-item provider-status-tooltip__last-success\">".concat(lastSuccessLabel, ": <strong>").concat(formattedTime, " \u043D\u0430\u0437\u0430\u0434</strong></div>");
      hasStatusInfo = true;
    } // Add success/failure duration if available


    if (successDuration !== undefined && successDuration !== null && successDuration > 0) {
      var _formattedDuration = this.formatDuration(successDuration);

      var successLabel = globalTranslate.pr_SuccessDuration;
      statusSection += "<div class=\"provider-status-tooltip__status-item provider-status-tooltip__success-duration\">".concat(successLabel, ": <strong>").concat(_formattedDuration, "</strong></div>");
      hasStatusInfo = true;
    }

    if (failureDuration !== undefined && failureDuration !== null && failureDuration > 0) {
      var _formattedDuration2 = this.formatDuration(failureDuration);

      var failureLabel = globalTranslate.pr_FailureDuration;
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
        var stateLabel = stateText ? globalTranslate[stateText] || stateText : globalTranslate.pr_StatusDuration;
        durationText += "".concat(stateLabel, ": ").concat(this.formatDuration(stateDuration));
      }

      if (lastSuccessTime) {
        var timeAgo = this.formatTimeAgo(lastSuccessTime);
        var lastSuccessLabel = globalTranslate.pr_LastSuccessTime;
        if (durationText) durationText += ' | ';
        durationText += "".concat(lastSuccessLabel, ": ").concat(timeAgo);
      }

      $durationInfo.text(durationText);
    }
  },

  /**
   * Initialize loading placeholders for all provider rows
   * This prevents table jumping when statuses are loading
   */
  initializeLoadingPlaceholders: function initializeLoadingPlaceholders() {
    $('tr.provider-row, tr[id]').each(function (index, element) {
      var $row = $(element);
      var $nameColumn = $row.find('td').eq(2); // Provider name column
      // Check if duration info already exists

      var $durationInfo = $row.find('.provider-duration-info');

      if ($durationInfo.length === 0 && $nameColumn.length) {
        // Add loading placeholder
        var loadingText = globalTranslate.pr_CheckingProviderStatuses;
        $nameColumn.append("<div class=\"provider-duration-info\" style=\"color: #999; font-size: 0.9em;\">".concat(loadingText, "</div>"));
      }
    });
  },

  /**
   * Format duration in seconds to human readable format
   */
  formatDuration: function formatDuration(seconds) {
    if (!seconds || seconds < 0) {
      // Return 0 seconds using translation
      var zeroFormat = globalTranslate.pr_TimeFormat_Seconds;
      return zeroFormat.replace('%s', '0');
    }

    var days = Math.floor(seconds / 86400);
    var hours = Math.floor(seconds % 86400 / 3600);
    var minutes = Math.floor(seconds % 3600 / 60);
    var secs = Math.floor(seconds % 60);
    var result = []; // Use translated format strings

    if (days > 0) {
      var format = globalTranslate.pr_TimeFormat_Days;
      result.push(format.replace('%s', days));
    }

    if (hours > 0) {
      var _format = globalTranslate.pr_TimeFormat_Hours;
      result.push(_format.replace('%s', hours));
    }

    if (minutes > 0) {
      var _format2 = globalTranslate.pr_TimeFormat_Minutes;
      result.push(_format2.replace('%s', minutes));
    }

    if (secs > 0 || result.length === 0) {
      var _format3 = globalTranslate.pr_TimeFormat_Seconds;
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
    var agoLabel = globalTranslate.pr_TimeAgo; // For very recent times, use special label

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
        $statusCell.html(grey);
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


    var updates = []; // Helper function to build update object from provider data

    var buildUpdateObject = function buildUpdateObject(providerId, provider, type) {
      return {
        provider_id: providerId,
        type: type,
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
      };
    }; // Handle structured format with sip/iax separation


    ['sip', 'iax'].forEach(function (providerType) {
      if (statuses[providerType] && _typeof(statuses[providerType]) === 'object') {
        Object.keys(statuses[providerType]).forEach(function (providerId) {
          var provider = statuses[providerType][providerId];

          if (provider) {
            updates.push(buildUpdateObject(providerId, provider, providerType));
          }
        });
      }
    }); // If no structured format found, try simple object format (legacy)

    if (!statuses.sip && !statuses.iax && _typeof(statuses) === 'object') {
      Object.keys(statuses).forEach(function (providerId) {
        var provider = statuses[providerId];

        if (provider) {
          updates.push(buildUpdateObject(providerId, provider, 'unknown'));
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
      'info': globalTranslate.pr_StatusInfo,
      'success': globalTranslate.pr_StatusUpdated,
      'error': globalTranslate.pr_StatusError,
      'warning': globalTranslate.pr_StatusWarning
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
    this.showUpdateNotification(globalTranslate.pr_RequestingStatusUpdate, 'info', 3000); // Request status via REST API

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
          _this9.showUpdateNotification(globalTranslate.pr_StatusUpdateFailed, 'error');
        }
      },
      onFailure: function onFailure(response) {
        var errorMessage = response.messages ? response.messages.join(', ') : globalTranslate.pr_StatusUpdateError;

        _this9.showUpdateNotification(errorMessage, 'error');
      },
      onError: function onError() {
        _this9.showUpdateNotification(globalTranslate.pr_ConnectionError, 'error');
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
    this.showUpdateNotification(globalTranslate.pr_LoadingProviderDetails, 'info', 2000); // Fetch fresh details from API

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
          _this10.showUpdateNotification(globalTranslate.pr_NoStatusInfo, 'warning');
        }
      },
      onFailure: function onFailure() {
        _this10.showUpdateNotification(globalTranslate.pr_FailedToLoadDetails, 'error');
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
        statsHtml = "\n                <div class=\"ui segment\">\n                    <h4>".concat(globalTranslate.pr_Statistics, "</h4>\n                    <div class=\"ui four column grid\">\n                        <div class=\"column\">\n                            <div class=\"ui tiny statistic\">\n                                <div class=\"value\">").concat(totalChecks, "</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_TotalChecks, "</div>\n                            </div>\n                        </div>\n                        <div class=\"column\">\n                            <div class=\"ui tiny green statistic\">\n                                <div class=\"value\">").concat(successCount, "</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_Success, "</div>\n                            </div>\n                        </div>\n                        <div class=\"column\">\n                            <div class=\"ui tiny red statistic\">\n                                <div class=\"value\">").concat(failureCount, "</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_Failures, "</div>\n                            </div>\n                        </div>\n                        <div class=\"column\">\n                            <div class=\"ui tiny ").concat(availability >= 99 ? 'green' : availability >= 95 ? 'yellow' : 'red', " statistic\">\n                                <div class=\"value\">").concat(availability, "%</div>\n                                <div class=\"label\">").concat(globalTranslate.pr_Availability, "</div>\n                            </div>\n                        </div>\n                    </div>\n                    ").concat(averageRtt !== null ? "\n                    <div class=\"ui divider\"></div>\n                    <div class=\"ui three column grid\">\n                        <div class=\"column\">\n                            <strong>".concat(globalTranslate.pr_AverageRTT, ":</strong> ").concat(averageRtt, " ms\n                        </div>\n                        <div class=\"column\">\n                            <strong>").concat(globalTranslate.pr_MinRTT, ":</strong> ").concat(minRtt, " ms\n                        </div>\n                        <div class=\"column\">\n                            <strong>").concat(globalTranslate.pr_MaxRTT, ":</strong> ").concat(maxRtt, " ms\n                        </div>\n                    </div>") : '', "\n                </div>");
      }
    } // Build recent events section


    var eventsHtml = '';

    if (recentEvents && recentEvents.length > 0) {
      var eventRows = recentEvents.slice(0, 5).map(function (event) {
        var eventType = event.type === 'error' ? 'red' : event.type === 'warning' ? 'yellow' : 'green';
        var eventText = globalTranslate[event.event] || event.event || event.state;
        return "\n                    <tr>\n                        <td><i class=\"".concat(eventType, " circle icon\"></i></td>\n                        <td>").concat(event.date, "</td>\n                        <td>").concat(eventText, "</td>\n                        <td>").concat(event.state, "</td>\n                    </tr>\n                ");
      }).join('');
      eventsHtml = "\n            <div class=\"ui segment\">\n                <h4>".concat(globalTranslate.pr_RecentEvents, "</h4>\n                <table class=\"ui very basic compact table\">\n                    <tbody>\n                        ").concat(eventRows, "\n                    </tbody>\n                </table>\n            </div>");
    }

    return "\n            <div id=\"provider-status-details-modal\" class=\"ui large modal\">\n                <div class=\"header\">\n                    <i class=\"".concat(stateColor, " circle icon\"></i>\n                    ").concat(description || uniqid, "\n                </div>\n                <div class=\"content\">\n                    <div class=\"ui segments\">\n                        <div class=\"ui segment\">\n                            <h4>").concat(globalTranslate.pr_ProviderInfo, "</h4>\n                            <div class=\"ui two column grid\">\n                                <div class=\"column\">\n                                    <div class=\"ui list\">\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_ProviderId, ":</strong> ").concat(uniqid, "\n                                        </div>\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_Host, ":</strong> ").concat(host, "\n                                        </div>\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_Username, ":</strong> ").concat(username, "\n                                        </div>\n                                    </div>\n                                </div>\n                                <div class=\"column\">\n                                    <div class=\"ui list\">\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_CurrentState, ":</strong> \n                                            <span class=\"ui ").concat(stateColor, " text\">").concat(globalTranslate[stateDescription] || state, "</span>\n                                        </div>\n                                        <div class=\"item\">\n                                            <strong>").concat(globalTranslate.pr_StateDuration, ":</strong> \n                                            ").concat(this.formatDuration(stateDuration), "\n                                        </div>\n                                        ").concat(rtt !== null && rtt !== undefined ? "\n                                        <div class=\"item\">\n                                            <strong>".concat(globalTranslate.pr_CurrentRTT, ":</strong> \n                                            <span style=\"color: ").concat(rtt > 200 ? 'red' : rtt > 100 ? 'orange' : 'green', "\">\n                                                ").concat(rtt, " ms\n                                            </span>\n                                        </div>") : '', "\n                                    </div>\n                                </div>\n                            </div>\n                            ").concat(lastSuccessTime ? "\n                            <div class=\"ui divider\"></div>\n                            <div class=\"ui two column grid\">\n                                <div class=\"column\">\n                                    <strong>".concat(globalTranslate.pr_LastSuccess, ":</strong> \n                                    ").concat(this.formatTimeAgo(lastSuccessTime), "\n                                </div>\n                                <div class=\"column\">\n                                    <strong>").concat(globalTranslate.pr_LastUpdate, ":</strong> \n                                    ").concat(lastUpdateFormatted || new Date().toLocaleString(), "\n                                </div>\n                            </div>") : '', "\n                        </div>\n                        ").concat(statsHtml, "\n                        ").concat(eventsHtml, "\n                    </div>\n                </div>\n                <div class=\"actions\">\n                    <button class=\"ui button\" onclick=\"window.location.href='").concat(globalRootUrl, "providers/modify/").concat(uniqid, "'\">\n                        <i class=\"edit icon\"></i>\n                        ").concat(globalTranslate.pr_EditProvider, "\n                    </button>\n                    <button class=\"ui primary button\" onclick=\"ProviderStatusMonitor.requestProviderCheck('").concat(uniqid, "')\">\n                        <i class=\"sync icon\"></i>\n                        ").concat(globalTranslate.pr_CheckNow, "\n                    </button>\n                    <div class=\"ui cancel button\">\n                        ").concat(globalTranslate.pr_Close, "\n                    </div>\n                </div>\n            </div>\n        ");
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
          _this11.showUpdateNotification(globalTranslate.pr_CheckRequested, 'success', 2000); // Update modal with fresh data if still open


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
        _this11.showUpdateNotification(globalTranslate.pr_CheckFailed, 'error', 3000);
      }
    });
  }
}; // Enhanced initialization with user interaction support

$(document).ready(function () {
  // Add manual refresh button if not exists
  if ($('.provider-refresh-btn').length === 0 && $('.ui.container.segment').length) {
    var refreshButton = "\n            <button class=\"ui mini labeled icon button provider-refresh-btn\" \n                    style=\"position: absolute; top: 10px; right: 10px; z-index: 100;\">\n                <i class=\"sync icon\"></i>\n                ".concat(globalTranslate.pr_RefreshStatus, "\n            </button>\n        ");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwiY2hhbm5lbElkIiwiaXNJbml0aWFsaXplZCIsImxhc3RVcGRhdGVUaW1lIiwic3RhdHVzQ2FjaGUiLCIkc3RhdHVzQ2VsbHMiLCIkbGFzdFVwZGF0ZUluZGljYXRvciIsImNhY2hlZFJvd3MiLCJNYXAiLCJjYWNoZWRTdGF0dXNDZWxscyIsImluaXRpYWxpemUiLCJjYWNoZUVsZW1lbnRzIiwiaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwiY2hhbmdlcyIsIkFycmF5IiwiaXNBcnJheSIsInRpbWVzdGFtcCIsIkRhdGUiLCJub3ciLCJmb3JFYWNoIiwiY2hhbmdlIiwidXBkYXRlUHJvdmlkZXJTdGF0dXMiLCJjaGFuZ2VDb3VudCIsInByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZCIsInByX011bHRpcGxlUHJvdmlkZXJTdGF0dXNlc0NoYW5nZWQiLCJyZXBsYWNlIiwic2hvd1VwZGF0ZU5vdGlmaWNhdGlvbiIsInN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsInVwZGF0ZUxhc3RDaGVja1RpbWUiLCJlcnJvck1zZyIsImVycm9yIiwicHJfU3RhdHVzQ2hlY2tGYWlsZWQiLCJwcm92aWRlcl9pZCIsInR5cGUiLCJzdGF0ZSIsIm5ld19zdGF0ZSIsIm9sZF9zdGF0ZSIsInN0YXRlQ29sb3IiLCJzdGF0ZUljb24iLCJzdGF0ZVRleHQiLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdGVEdXJhdGlvbiIsImxhc3RTdWNjZXNzVGltZSIsInRpbWVTaW5jZUxhc3RTdWNjZXNzIiwic3VjY2Vzc0R1cmF0aW9uIiwiZmFpbHVyZUR1cmF0aW9uIiwiZ2V0IiwiY3VycmVudFN0YXRlIiwicHJldmlvdXNTdGF0ZSIsInRvb2x0aXBDb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInJ0dCIsImhvc3QiLCJ1c2VybmFtZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwicG9wdXAiLCJob3ZlcmFibGUiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCIkZmFpbHVyZUNlbGwiLCJ1cGRhdGVEdXJhdGlvbkRpc3BsYXkiLCJ0cmFuc2l0aW9uIiwidXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3kiLCJzdGF0dXNJbmZvIiwic3RhdGVUaXRsZSIsInRvb2x0aXAiLCJoYXNTdGF0dXNJbmZvIiwic3RhdHVzU2VjdGlvbiIsInVuZGVmaW5lZCIsImZvcm1hdHRlZER1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJkdXJhdGlvbkxhYmVsIiwicHJfU3RhdHVzRHVyYXRpb24iLCJydHRMYWJlbCIsInByX1JUVCIsInJ0dENsYXNzIiwiZm9ybWF0dGVkVGltZSIsImxhc3RTdWNjZXNzTGFiZWwiLCJwcl9MYXN0U3VjY2Vzc1RpbWUiLCJzdWNjZXNzTGFiZWwiLCJwcl9TdWNjZXNzRHVyYXRpb24iLCJmYWlsdXJlTGFiZWwiLCJwcl9GYWlsdXJlRHVyYXRpb24iLCJkdXJhdGlvbnMiLCIkZHVyYXRpb25JbmZvIiwiJG5hbWVDb2x1bW4iLCJlcSIsImFwcGVuZCIsImR1cmF0aW9uVGV4dCIsInN0YXRlTGFiZWwiLCJ0aW1lQWdvIiwiZm9ybWF0VGltZUFnbyIsImxvYWRpbmdUZXh0Iiwic2Vjb25kcyIsInplcm9Gb3JtYXQiLCJwcl9UaW1lRm9ybWF0X1NlY29uZHMiLCJkYXlzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJtaW51dGVzIiwic2VjcyIsInJlc3VsdCIsImZvcm1hdCIsInByX1RpbWVGb3JtYXRfRGF5cyIsInB1c2giLCJwcl9UaW1lRm9ybWF0X0hvdXJzIiwicHJfVGltZUZvcm1hdF9NaW51dGVzIiwic2xpY2UiLCJqb2luIiwiZGlmZiIsImFnb0xhYmVsIiwicHJfVGltZUFnbyIsInByX0p1c3ROb3ciLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJyZWQiLCJub3JtYWxpemVkU3RhdGUiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZXMiLCJidWlsZFVwZGF0ZU9iamVjdCIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyVHlwZSIsIk9iamVjdCIsImtleXMiLCJzaXAiLCJpYXgiLCJwcm9jZXNzQmF0Y2hVcGRhdGVzIiwiYmF0Y2hTaXplIiwiYmF0Y2hlcyIsImkiLCJiYXRjaEluZGV4IiwicHJvY2Vzc0JhdGNoIiwiYmF0Y2giLCJ1cGRhdGUiLCJkdXJhdGlvbiIsIiRpbmRpY2F0b3IiLCIkaGVhZGVyIiwiJHN0YXR1c01lc3NhZ2UiLCIkdGltZUluZm8iLCJoZWFkZXJzIiwicHJfU3RhdHVzSW5mbyIsInByX1N0YXR1c1VwZGF0ZWQiLCJwcl9TdGF0dXNFcnJvciIsInByX1N0YXR1c1dhcm5pbmciLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJjbGVhclRpbWVvdXQiLCJub3RpZmljYXRpb25UaW1lb3V0Iiwib2ZmIiwib24iLCJkYXRlIiwidGltZVN0ciIsInByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZm9yY2UiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInByb3ZpZGVyQ291bnQiLCJjb3VudFByb3ZpZGVycyIsInByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlIiwicHJfU3RhdHVzVXBkYXRlRmFpbGVkIiwib25GYWlsdXJlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJwcl9TdGF0dXNVcGRhdGVFcnJvciIsIm9uRXJyb3IiLCJwcl9Db25uZWN0aW9uRXJyb3IiLCJzdGF0dXNEYXRhIiwiY291bnQiLCJnZXRDYWNoZWRSb3ciLCJzaG93UHJvdmlkZXJEZXRhaWxzIiwicHJfTG9hZGluZ1Byb3ZpZGVyRGV0YWlscyIsIm1vZGFsQ29udGVudCIsImJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsIiwicmVtb3ZlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uSGlkZGVuIiwicHJfTm9TdGF0dXNJbmZvIiwicHJfRmFpbGVkVG9Mb2FkRGV0YWlscyIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwic3RhdGlzdGljcyIsInJlY2VudEV2ZW50cyIsImxhc3RVcGRhdGVGb3JtYXR0ZWQiLCJzdGF0ZVN0YXJ0VGltZUZvcm1hdHRlZCIsInN0YXRzSHRtbCIsInRvdGFsQ2hlY2tzIiwic3VjY2Vzc0NvdW50IiwiZmFpbHVyZUNvdW50IiwiYXZhaWxhYmlsaXR5IiwiYXZlcmFnZVJ0dCIsIm1pblJ0dCIsIm1heFJ0dCIsInByX1N0YXRpc3RpY3MiLCJwcl9Ub3RhbENoZWNrcyIsInByX1N1Y2Nlc3MiLCJwcl9GYWlsdXJlcyIsInByX0F2YWlsYWJpbGl0eSIsInByX0F2ZXJhZ2VSVFQiLCJwcl9NaW5SVFQiLCJwcl9NYXhSVFQiLCJldmVudHNIdG1sIiwiZXZlbnRSb3dzIiwibWFwIiwiZXZlbnRUeXBlIiwiZXZlbnRUZXh0IiwicHJfUmVjZW50RXZlbnRzIiwicHJfUHJvdmlkZXJJbmZvIiwicHJfUHJvdmlkZXJJZCIsInByX0hvc3QiLCJwcl9Vc2VybmFtZSIsInByX0N1cnJlbnRTdGF0ZSIsInByX1N0YXRlRHVyYXRpb24iLCJwcl9DdXJyZW50UlRUIiwicHJfTGFzdFN1Y2Nlc3MiLCJwcl9MYXN0VXBkYXRlIiwidG9Mb2NhbGVTdHJpbmciLCJwcl9FZGl0UHJvdmlkZXIiLCJwcl9DaGVja05vdyIsInByX0Nsb3NlIiwicmVxdWVzdFByb3ZpZGVyQ2hlY2siLCJmb3JjZUNoZWNrIiwicmVmcmVzaEZyb21BbWkiLCJwcl9DaGVja1JlcXVlc3RlZCIsInByX0NoZWNrRmFpbGVkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInJlZnJlc2hCdXR0b24iLCJwcl9SZWZyZXNoU3RhdHVzIiwiY3NzIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwiY2xvc2VzdCIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUJDLEVBQUFBLFNBQVMsRUFBRSxpQkFEZTtBQUUxQkMsRUFBQUEsYUFBYSxFQUFFLEtBRlc7QUFHMUJDLEVBQUFBLGNBQWMsRUFBRSxDQUhVO0FBSTFCQyxFQUFBQSxXQUFXLEVBQUUsRUFKYTs7QUFNMUI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVRZO0FBVTFCQyxFQUFBQSxvQkFBb0IsRUFBRSxJQVZJOztBQVkxQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBQUlDLEdBQUosRUFmYztBQWdCMUJDLEVBQUFBLGlCQUFpQixFQUFFLElBQUlELEdBQUosRUFo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QUVBOztBQUNBNkQsTUFBTSxDQUFDMVIscUJBQVAsR0FBK0JBLHFCQUEvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV2ZW50QnVzICovXG5cbi8qKlxuICogUHJvdmlkZXIgU3RhdHVzIE1vbml0b3JcbiAqIEhhbmRsZXMgcmVhbC10aW1lIHByb3ZpZGVyIHN0YXR1cyB1cGRhdGVzIHZpYSBFdmVudEJ1cyB3aXRoIGVuaGFuY2VkIGZlYXR1cmVzOlxuICogLSBSZWFsLXRpbWUgc3RhdHVzIHVwZGF0ZXMgd2l0aCBFdmVudEJ1cyBpbnRlZ3JhdGlvblxuICogLSBCYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyAobm8gaGFyZGNvZGVkIHN0YXRlIG1hcHBpbmcpXG4gKiAtIER1cmF0aW9uIGRpc3BsYXlzIChzdGF0ZSBkdXJhdGlvbiwgc3VjY2Vzcy9mYWlsdXJlIGR1cmF0aW9uKVxuICogLSBMYXN0IHN1Y2Nlc3MgaW5mb3JtYXRpb25cbiAqIC0gRW5oYW5jZWQgdmlzdWFsIGZlZWRiYWNrIHdpdGggRm9tYW50aWMgVUkgY29tcG9uZW50c1xuICovXG5jb25zdCBQcm92aWRlclN0YXR1c01vbml0b3IgPSB7XG4gICAgY2hhbm5lbElkOiAncHJvdmlkZXItc3RhdHVzJyxcbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBsYXN0VXBkYXRlVGltZTogMCxcbiAgICBzdGF0dXNDYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHNcbiAgICAgKi9cbiAgICAkc3RhdHVzQ2VsbHM6IG51bGwsXG4gICAgJGxhc3RVcGRhdGVJbmRpY2F0b3I6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRE9NIGNhY2hlIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZWRSb3dzOiBuZXcgTWFwKCksXG4gICAgY2FjaGVkU3RhdHVzQ2VsbHM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBzdGF0dXMgbW9uaXRvciB3aXRoIGVuaGFuY2VkIGZlYXR1cmVzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2FkaW5nIHBsYWNlaG9sZGVycyBmb3IgYWxsIHByb3ZpZGVyIHJvd3NcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTG9hZGluZ1BsYWNlaG9sZGVycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGVuaGFuY2VkIHN0YXR1cyBpbmRpY2F0b3JcbiAgICAgICAgdGhpcy5jcmVhdGVTdGF0dXNJbmRpY2F0b3IoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBjaGFubmVsIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrc1xuICAgICAgICB0aGlzLnNldHVwSGVhbHRoQ2hlY2tzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZUVsZW1lbnRzKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNDZWxscyA9ICQoJy5wcm92aWRlci1zdGF0dXMsIC5wcm92aWRlci1zdGF0dXMtY2VsbCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgcHJvdmlkZXIgcm93cyBmb3IgcXVpY2sgYWNjZXNzXG4gICAgICAgICQoJ3RyLnByb3ZpZGVyLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkcm93LmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGlkLCAkcm93KTtcbiAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLnByb3ZpZGVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5zZXQoaWQsICRzdGF0dXNDZWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGVuaGFuY2VkIHN0YXR1cyBpbmRpY2F0b3Igd2l0aCBkdXJhdGlvbiBpbmZvXG4gICAgICovXG4gICAgY3JlYXRlU3RhdHVzSW5kaWNhdG9yKCkge1xuICAgICAgICBpZiAoJCgnI3Byb3ZpZGVyLXN0YXR1cy1pbmRpY2F0b3InKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGljYXRvciA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwicHJvdmlkZXItc3RhdHVzLWluZGljYXRvclwiIGNsYXNzPVwidWkgbWluaSBtZXNzYWdlIGhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy1tZXNzYWdlXCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibGFzdC1jaGVjay10aW1lXCIgc3R5bGU9XCJmb250LXNpemU6IDAuODVlbTsgY29sb3I6ICM4ODg7XCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICQoJy51aS5jb250YWluZXIuc2VnbWVudCcpLnByZXBlbmQoaW5kaWNhdG9yKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yID0gJCgnI3Byb3ZpZGVyLXN0YXR1cy1pbmRpY2F0b3InKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgncHJvdmlkZXItc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdCBhdmFpbGFibGUsIHByb3ZpZGVyIHN0YXR1cyBtb25pdG9yIHdpbGwgd29yayB3aXRob3V0IHJlYWwtdGltZSB1cGRhdGVzXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXR1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzIGFuZCBjYWNoZSBtYWludGVuYW5jZVxuICAgICAqL1xuICAgIHNldHVwSGVhbHRoQ2hlY2tzKCkge1xuICAgICAgICAvLyBSZWZyZXNoIGNhY2hlIGV2ZXJ5IDMwIHNlY29uZHMgdG8gaGFuZGxlIGR5bmFtaWMgY29udGVudFxuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlZnJlc2hDYWNoZSgpO1xuICAgICAgICB9LCAzMDAwMCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyB1cGRhdGUgZXZlcnkgNSBtaW51dGVzIGFzIGZhbGxiYWNrXG4gICAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdFN0YXR1c1VwZGF0ZSgpO1xuICAgICAgICB9LCAzMDAwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBjYWNoZWQgRE9NIGVsZW1lbnRzXG4gICAgICovXG4gICAgcmVmcmVzaENhY2hlKCkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBjYWNoZVxuICAgICAgICB0aGlzLmNhY2hlZFJvd3MuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5jbGVhcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVidWlsZCBjYWNoZVxuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBsb2FkaW5nIHBsYWNlaG9sZGVycyBmb3IgbmV3IHJvd3NcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTG9hZGluZ1BsYWNlaG9sZGVycygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRCdXMgbWVzc2FnZSBjYW4gaGF2ZSBldmVudCBhdCB0b3AgbGV2ZWwgb3IgaW4gZGF0YVxuICAgICAgICBsZXQgZXZlbnQsIGRhdGE7XG4gICAgICAgIGlmIChtZXNzYWdlLmV2ZW50KSB7XG4gICAgICAgICAgICAvLyBFdmVudCBhdCB0b3AgbGV2ZWxcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5kYXRhICYmIG1lc3NhZ2UuZGF0YS5ldmVudCkge1xuICAgICAgICAgICAgLy8gRXZlbnQgaW4gZGF0YVxuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmRhdGEuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhLmRhdGEgfHwgbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY2hlY2snOlxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0NoZWNraW5nSW5kaWNhdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX3VwZGF0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19lcnJvcic6XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTdGF0dXNFcnJvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gVW5rbm93biBldmVudCB0eXBlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgY2hlY2tpbmcgaW5kaWNhdG9yXG4gICAgICovXG4gICAgc2hvd0NoZWNraW5nSW5kaWNhdG9yKGRhdGEpIHtcbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gZXJyb3Igc3VjY2VzcycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2luZm8nKTtcbiAgICAgICAgICAgIFxuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmZpbmQoJy5jb250ZW50JylcbiAgICAgICAgICAgIC50ZXh0KGRhdGEubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tpbmdQcm92aWRlclN0YXR1c2VzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wIHx8IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gdGltZXN0YW1wO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoYW5nZVxuICAgICAgICBkYXRhLmNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm92aWRlclN0YXR1cyhjaGFuZ2UpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgdXBkYXRlIG5vdGlmaWNhdGlvblxuICAgICAgICBjb25zdCBjaGFuZ2VDb3VudCA9IGRhdGEuY2hhbmdlcy5sZW5ndGg7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBjaGFuZ2VDb3VudCA9PT0gMSBcbiAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLnByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZFxuICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUucHJfTXVsdGlwbGVQcm92aWRlclN0YXR1c2VzQ2hhbmdlZC5yZXBsYWNlKCclcycsIGNoYW5nZUNvdW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgJ3N1Y2Nlc3MnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29tcGxldGUgc3RhdHVzIGRhdGFcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgICAgIHRoaXMuc3RhdHVzQ2FjaGUgPSBkYXRhLnN0YXR1c2VzO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBwcm92aWRlciBzdGF0dXNlcyBvbiB0aGUgcGFnZVxuICAgICAgICB0aGlzLnVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMoZGF0YS5zdGF0dXNlcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgbGFzdCBjaGVjayB0aW1lXG4gICAgICAgIGlmIChkYXRhLnRpbWVzdGFtcCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVMYXN0Q2hlY2tUaW1lKGRhdGEudGltZXN0YW1wKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN0YXR1cyBlcnJvclxuICAgICAqL1xuICAgIGhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNDaGVja0ZhaWxlZDtcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTXNnLCAnZXJyb3InKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzaW5nbGUgcHJvdmlkZXIgc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICogTm8gaGFyZGNvZGVkIHN0YXRlIG1hcHBpbmcgLSBiYWNrZW5kIHByb3ZpZGVzIGFsbCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVQcm92aWRlclN0YXR1cyhjaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgeyBcbiAgICAgICAgICAgIHByb3ZpZGVyX2lkLCBcbiAgICAgICAgICAgIHR5cGUsIFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBuZXdfc3RhdGUsIFxuICAgICAgICAgICAgb2xkX3N0YXRlLFxuICAgICAgICAgICAgc3RhdGVDb2xvciwgXG4gICAgICAgICAgICBzdGF0ZUljb24sIFxuICAgICAgICAgICAgc3RhdGVUZXh0LCBcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICBmYWlsdXJlRHVyYXRpb25cbiAgICAgICAgfSA9IGNoYW5nZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjYWNoZWQgZWxlbWVudHMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgJHJvdyA9IHRoaXMuY2FjaGVkUm93cy5nZXQocHJvdmlkZXJfaWQpO1xuICAgICAgICBpZiAoISRyb3cpIHtcbiAgICAgICAgICAgICRyb3cgPSAkKGAjJHtwcm92aWRlcl9pZH1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KHByb3ZpZGVyX2lkLCAkcm93KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBSb3cgbm90IGZvdW5kXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCAkc3RhdHVzQ2VsbCA9IHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuZ2V0KHByb3ZpZGVyX2lkKTtcbiAgICAgICAgaWYgKCEkc3RhdHVzQ2VsbCkge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5zZXQocHJvdmlkZXJfaWQsICRzdGF0dXNDZWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBTdGF0dXMgY2VsbCBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGN1cnJlbnQgc3RhdGUgb3IgZmFsbGJhY2sgdG8gbmV3X3N0YXRlIGZvciBjb21wYXRpYmlsaXR5XG4gICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHN0YXRlIHx8IG5ld19zdGF0ZTtcbiAgICAgICAgY29uc3QgcHJldmlvdXNTdGF0ZSA9ICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBkaXJlY3RseVxuICAgICAgICBpZiAoc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgLy8gRW5oYW5jZWQgc3RhdHVzIGluZGljYXRvciB3aXRoIHRvb2x0aXAgc3VwcG9ydFxuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIHN0YXRlOiBjdXJyZW50U3RhdGUsXG4gICAgICAgICAgICAgICAgc3RhdGVUZXh0LFxuICAgICAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICBydHQ6IGNoYW5nZS5ydHQsXG4gICAgICAgICAgICAgICAgaG9zdDogY2hhbmdlLmhvc3QsXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGNoYW5nZS51c2VybmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdGVDb2xvcn0gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBcbiAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIlxuICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHt0b29sdGlwQ29udGVudH1cIlxuICAgICAgICAgICAgICAgICAgICAgZGF0YS1wb3NpdGlvbj1cInRvcCBjZW50ZXJcIlxuICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJzbWFsbFwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQmF0Y2ggRE9NIHVwZGF0ZXMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHN0YXR1c0h0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgKEZvbWFudGljIFVJIHRvb2x0aXApXG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuZmluZCgnLnVpLmxhYmVsJykucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdzbWFsbCcsXG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBmYWlsdXJlIHRleHQgd2hlbiB1c2luZyBtb2Rlcm4gc3RhdHVzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICBjb25zdCAkZmFpbHVyZUNlbGwgPSAkcm93LmZpbmQoJy5mYWlsdXJlLCAuZmVhdHVyZXMuZmFpbHVyZScpO1xuICAgICAgICAgICAgICAgIGlmICgkZmFpbHVyZUNlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHNob3cgdGV4dCBzdGF0dXMgd2hlbiB3ZSBoYXZlIHZpc3VhbCBpbmRpY2F0b3JzXG4gICAgICAgICAgICAgICAgICAgICRmYWlsdXJlQ2VsbC50ZXh0KCcnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGR1cmF0aW9uIGluZm9ybWF0aW9uIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRHVyYXRpb25EaXNwbGF5KCRyb3csIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVUZXh0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQW5pbWF0ZSBpZiBzdGF0ZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzU3RhdGUgJiYgcHJldmlvdXNTdGF0ZSAhPT0gY3VycmVudFN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGN1cnJlbnQgc3RhdGUgZm9yIGZ1dHVyZSBjb21wYXJpc29uXG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScsIGN1cnJlbnRTdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IC0gdXNlIHNpbXBsZSBzdGF0ZS1iYXNlZCBkaXNwbGF5XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb3ZpZGVyU3RhdHVzTGVnYWN5KGNoYW5nZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRvb2x0aXAgY29udGVudCB3aXRoIGVuaGFuY2VkIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChzdGF0dXNJbmZvKSB7XG4gICAgICAgIGNvbnN0IHsgXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlVGV4dCxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sIFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbiwgXG4gICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbiwgXG4gICAgICAgICAgICBmYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICBydHQsXG4gICAgICAgICAgICBob3N0LFxuICAgICAgICAgICAgdXNlcm5hbWVcbiAgICAgICAgfSA9IHN0YXR1c0luZm87XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdHJhbnNsYXRlZCBzdGF0ZSB0ZXh0IGFzIG1haW4gdGl0bGVcbiAgICAgICAgY29uc3Qgc3RhdGVUaXRsZSA9IHN0YXRlVGV4dCA/IChnbG9iYWxUcmFuc2xhdGVbc3RhdGVUZXh0XSB8fCBzdGF0ZVRleHQpIDogKGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXSB8fCBzdGF0ZURlc2NyaXB0aW9uIHx8IHN0YXRlIHx8ICcnKTtcbiAgICAgICAgXG4gICAgICAgIGxldCB0b29sdGlwID0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcFwiPmA7XG4gICAgICAgIHRvb2x0aXAgKz0gYDxzdHJvbmcgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fdGl0bGVcIj4ke3N0YXRlVGl0bGV9PC9zdHJvbmc+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBvcmlnaW5hbCBzdGF0ZSB2YWx1ZSBpZiBhdmFpbGFibGUgYW5kIGRpZmZlcmVudCBmcm9tIHRpdGxlXG4gICAgICAgIGlmIChzdGF0ZSAmJiBzdGF0ZSAhPT0gc3RhdGVUaXRsZSkge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0ZS1vcmlnaW5hbFwiPlske3N0YXRlfV08L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaG9zdCBhbmQgdXNlcm5hbWUgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChob3N0IHx8IHVzZXJuYW1lKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3NlY3Rpb25cIj5gO1xuICAgICAgICAgICAgaWYgKGhvc3QpIHtcbiAgICAgICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2luZm8taXRlbVwiPkhvc3Q6IDxzdHJvbmc+JHtob3N0fTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodXNlcm5hbWUpIHtcbiAgICAgICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2luZm8taXRlbVwiPlVzZXI6IDxzdHJvbmc+JHt1c2VybmFtZX08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YXR1cyBpbmZvcm1hdGlvbiBzZWN0aW9uXG4gICAgICAgIGxldCBoYXNTdGF0dXNJbmZvID0gZmFsc2U7XG4gICAgICAgIGxldCBzdGF0dXNTZWN0aW9uID0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc2VjdGlvblwiPmA7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgYW5kIGFkZCBkdXJhdGlvbiBpbmZvcm1hdGlvbiAobm93IGNvbWVzIGFzIHNlY29uZHMgZnJvbSBiYWNrZW5kKVxuICAgICAgICBpZiAoc3RhdGVEdXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHN0YXRlRHVyYXRpb24gIT09IG51bGwgJiYgc3RhdGVEdXJhdGlvbiA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMuZm9ybWF0RHVyYXRpb24oc3RhdGVEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBkdXJhdGlvbkxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0R1cmF0aW9uO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbVwiPiR7ZHVyYXRpb25MYWJlbH06IDxzdHJvbmc+JHtmb3JtYXR0ZWREdXJhdGlvbn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBSVFQgKFJvdW5kIFRyaXAgVGltZSkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChydHQgIT09IHVuZGVmaW5lZCAmJiBydHQgIT09IG51bGwgJiYgcnR0ID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0dExhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX1JUVDtcbiAgICAgICAgICAgIC8vIEZvcm1hdCBSVFQgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgICAgICAgIGxldCBydHRDbGFzcyA9ICdwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fcnR0LS1nb29kJztcbiAgICAgICAgICAgIGlmIChydHQgPiAxMDApIHJ0dENsYXNzID0gJ3Byb3ZpZGVyLXN0YXR1cy10b29sdGlwX19ydHQtLXdhcm5pbmcnO1xuICAgICAgICAgICAgaWYgKHJ0dCA+IDIwMCkgcnR0Q2xhc3MgPSAncHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3J0dC0tYmFkJztcbiAgICAgICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3RhdHVzLWl0ZW1cIj4ke3J0dExhYmVsfTogPHN0cm9uZyBjbGFzcz1cIiR7cnR0Q2xhc3N9XCI+JHtydHR9INC80YE8L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCB0aW1lIHNpbmNlIGxhc3Qgc3VjY2VzcyBpZiBwcm92aWRlZCAobm93IGNvbWVzIGFzIHNlY29uZHMpXG4gICAgICAgIGlmICh0aW1lU2luY2VMYXN0U3VjY2VzcyAhPT0gdW5kZWZpbmVkICYmIHRpbWVTaW5jZUxhc3RTdWNjZXNzICE9PSBudWxsICYmIHRpbWVTaW5jZUxhc3RTdWNjZXNzID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFRpbWUgPSB0aGlzLmZvcm1hdER1cmF0aW9uKHRpbWVTaW5jZUxhc3RTdWNjZXNzKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RTdWNjZXNzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfTGFzdFN1Y2Nlc3NUaW1lO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbSBwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fbGFzdC1zdWNjZXNzXCI+JHtsYXN0U3VjY2Vzc0xhYmVsfTogPHN0cm9uZz4ke2Zvcm1hdHRlZFRpbWV9INC90LDQt9Cw0LQ8L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdWNjZXNzL2ZhaWx1cmUgZHVyYXRpb24gaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmIChzdWNjZXNzRHVyYXRpb24gIT09IHVuZGVmaW5lZCAmJiBzdWNjZXNzRHVyYXRpb24gIT09IG51bGwgJiYgc3VjY2Vzc0R1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRHVyYXRpb24gPSB0aGlzLmZvcm1hdER1cmF0aW9uKHN1Y2Nlc3NEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBzdWNjZXNzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3VjY2Vzc0R1cmF0aW9uO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbSBwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3VjY2Vzcy1kdXJhdGlvblwiPiR7c3VjY2Vzc0xhYmVsfTogPHN0cm9uZz4ke2Zvcm1hdHRlZER1cmF0aW9ufTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGZhaWx1cmVEdXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIGZhaWx1cmVEdXJhdGlvbiAhPT0gbnVsbCAmJiBmYWlsdXJlRHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMuZm9ybWF0RHVyYXRpb24oZmFpbHVyZUR1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGZhaWx1cmVMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9GYWlsdXJlRHVyYXRpb247XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19mYWlsdXJlLWR1cmF0aW9uXCI+JHtmYWlsdXJlTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkRHVyYXRpb259PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGhhc1N0YXR1c0luZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8L2Rpdj5gO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhhc1N0YXR1c0luZm8pIHtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gc3RhdHVzU2VjdGlvbjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGRpZmZlcmVudCBmcm9tIHN0YXRlIHRleHRcbiAgICAgICAgaWYgKHN0YXRlRGVzY3JpcHRpb24gJiYgZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dICYmIGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXSAhPT0gc3RhdGVUaXRsZSkge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19kZXNjcmlwdGlvblwiPmA7XG4gICAgICAgICAgICB0b29sdGlwICs9IGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXTtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gYDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRvb2x0aXAgKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdG9vbHRpcC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZHVyYXRpb24gZGlzcGxheSBpbiBwcm92aWRlciByb3dcbiAgICAgKi9cbiAgICB1cGRhdGVEdXJhdGlvbkRpc3BsYXkoJHJvdywgZHVyYXRpb25zKSB7XG4gICAgICAgIGNvbnN0IHsgc3RhdGVEdXJhdGlvbiwgbGFzdFN1Y2Nlc3NUaW1lLCBzdWNjZXNzRHVyYXRpb24sIGZhaWx1cmVEdXJhdGlvbiwgc3RhdGVUZXh0IH0gPSBkdXJhdGlvbnM7XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBkdXJhdGlvbiBkaXNwbGF5IGVsZW1lbnRzIG9yIGNyZWF0ZSB0aGVtXG4gICAgICAgIGxldCAkZHVyYXRpb25JbmZvID0gJHJvdy5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICBpZiAoJGR1cmF0aW9uSW5mby5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIEFkZCBkdXJhdGlvbiBpbmZvIGNvbnRhaW5lciB0byB0aGUgcHJvdmlkZXIgbmFtZSBjb2x1bW5cbiAgICAgICAgICAgIGNvbnN0ICRuYW1lQ29sdW1uID0gJHJvdy5maW5kKCd0ZCcpLmVxKDIpOyAvLyBVc3VhbGx5IHRoZSB0aGlyZCBjb2x1bW4gY29udGFpbnMgcHJvdmlkZXIgbmFtZVxuICAgICAgICAgICAgaWYgKCRuYW1lQ29sdW1uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRuYW1lQ29sdW1uLmFwcGVuZCgnPGRpdiBjbGFzcz1cInByb3ZpZGVyLWR1cmF0aW9uLWluZm9cIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkZHVyYXRpb25JbmZvID0gJG5hbWVDb2x1bW4uZmluZCgnLnByb3ZpZGVyLWR1cmF0aW9uLWluZm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKCRkdXJhdGlvbkluZm8ubGVuZ3RoICYmIChzdGF0ZUR1cmF0aW9uIHx8IGxhc3RTdWNjZXNzVGltZSB8fCBzdWNjZXNzRHVyYXRpb24gfHwgZmFpbHVyZUR1cmF0aW9uKSkge1xuICAgICAgICAgICAgbGV0IGR1cmF0aW9uVGV4dCA9ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoc3RhdGVEdXJhdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0cmFuc2xhdGVkIHN0YXRlIHRleHQgaWYgYXZhaWxhYmxlLCBvdGhlcndpc2UgdXNlIGdlbmVyaWMgbGFiZWxcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZUxhYmVsID0gc3RhdGVUZXh0ID8gZ2xvYmFsVHJhbnNsYXRlW3N0YXRlVGV4dF0gfHwgc3RhdGVUZXh0IDogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0R1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uVGV4dCArPSBgJHtzdGF0ZUxhYmVsfTogJHt0aGlzLmZvcm1hdER1cmF0aW9uKHN0YXRlRHVyYXRpb24pfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChsYXN0U3VjY2Vzc1RpbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lQWdvID0gdGhpcy5mb3JtYXRUaW1lQWdvKGxhc3RTdWNjZXNzVGltZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdFN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0U3VjY2Vzc1RpbWU7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uVGV4dCkgZHVyYXRpb25UZXh0ICs9ICcgfCAnO1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uVGV4dCArPSBgJHtsYXN0U3VjY2Vzc0xhYmVsfTogJHt0aW1lQWdvfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkdXJhdGlvbkluZm8udGV4dChkdXJhdGlvblRleHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGxvYWRpbmcgcGxhY2Vob2xkZXJzIGZvciBhbGwgcHJvdmlkZXIgcm93c1xuICAgICAqIFRoaXMgcHJldmVudHMgdGFibGUganVtcGluZyB3aGVuIHN0YXR1c2VzIGFyZSBsb2FkaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMoKSB7XG4gICAgICAgICQoJ3RyLnByb3ZpZGVyLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgJG5hbWVDb2x1bW4gPSAkcm93LmZpbmQoJ3RkJykuZXEoMik7IC8vIFByb3ZpZGVyIG5hbWUgY29sdW1uXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGR1cmF0aW9uIGluZm8gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGxldCAkZHVyYXRpb25JbmZvID0gJHJvdy5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICAgICAgaWYgKCRkdXJhdGlvbkluZm8ubGVuZ3RoID09PSAwICYmICRuYW1lQ29sdW1uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgbG9hZGluZ1RleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tpbmdQcm92aWRlclN0YXR1c2VzO1xuICAgICAgICAgICAgICAgICRuYW1lQ29sdW1uLmFwcGVuZChgPGRpdiBjbGFzcz1cInByb3ZpZGVyLWR1cmF0aW9uLWluZm9cIiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDAuOWVtO1wiPiR7bG9hZGluZ1RleHR9PC9kaXY+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGR1cmF0aW9uIGluIHNlY29uZHMgdG8gaHVtYW4gcmVhZGFibGUgZm9ybWF0XG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBpZiAoIXNlY29uZHMgfHwgc2Vjb25kcyA8IDApIHtcbiAgICAgICAgICAgIC8vIFJldHVybiAwIHNlY29uZHMgdXNpbmcgdHJhbnNsYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHplcm9Gb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9TZWNvbmRzO1xuICAgICAgICAgICAgcmV0dXJuIHplcm9Gb3JtYXQucmVwbGFjZSgnJXMnLCAnMCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gODY0MDApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSA4NjQwMCkgLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICAgICAgY29uc3Qgc2VjcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAlIDYwKTtcbiAgICAgICAgXG4gICAgICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB0cmFuc2xhdGVkIGZvcm1hdCBzdHJpbmdzXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1RpbWVGb3JtYXRfRGF5cztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIGRheXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9Ib3VycztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIGhvdXJzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9NaW51dGVzO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgbWludXRlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWNzID4gMCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9TZWNvbmRzO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgc2VjcykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBKb2luIHdpdGggc3BhY2UsIHNob3cgbWF4IDIgdW5pdHMgZm9yIHJlYWRhYmlsaXR5XG4gICAgICAgIHJldHVybiByZXN1bHQuc2xpY2UoMCwgMikuam9pbignICcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWVzdGFtcCB0byBcInRpbWUgYWdvXCIgZm9ybWF0XG4gICAgICovXG4gICAgZm9ybWF0VGltZUFnbyh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKSAvIDEwMDA7XG4gICAgICAgIGNvbnN0IGRpZmYgPSBub3cgLSB0aW1lc3RhbXA7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgZm9ybWF0RHVyYXRpb24gdG8gZ2V0IGNvbnNpc3RlbnQgZm9ybWF0dGluZyB3aXRoIHRyYW5zbGF0aW9uc1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRUaW1lID0gdGhpcy5mb3JtYXREdXJhdGlvbihkaWZmKTtcbiAgICAgICAgY29uc3QgYWdvTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUFnbztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciB2ZXJ5IHJlY2VudCB0aW1lcywgdXNlIHNwZWNpYWwgbGFiZWxcbiAgICAgICAgaWYgKGRpZmYgPCA2MCkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5wcl9KdXN0Tm93IHx8IGZvcm1hdHRlZFRpbWUgKyAnICcgKyBhZ29MYWJlbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFRpbWUgKyAnICcgKyBhZ29MYWJlbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIG1ldGhvZCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZVByb3ZpZGVyU3RhdHVzTGVnYWN5KGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IHByb3ZpZGVyX2lkLCBuZXdfc3RhdGUsIG9sZF9zdGF0ZSB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke3Byb3ZpZGVyX2lkfWApO1xuICAgICAgICBpZiAoJHJvdy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBjb250ZW50XG4gICAgICAgICRzdGF0dXNDZWxsLmh0bWwoJycpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2ltcGxlIHN0YXR1cyBpbmRpY2F0b3JzXG4gICAgICAgIGNvbnN0IGdyZWVuID0gJzxkaXYgY2xhc3M9XCJ1aSBncmVlbiBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuICAgICAgICBjb25zdCBncmV5ID0gJzxkaXYgY2xhc3M9XCJ1aSBncmV5IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IHllbGxvdyA9ICc8ZGl2IGNsYXNzPVwidWkgeWVsbG93IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IHJlZCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVkIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICAvLyBCYXNpYyBzdGF0ZSBtYXBwaW5nIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRTdGF0ZSA9IChuZXdfc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmVlbik7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnTEFHR0VEJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHllbGxvdyk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZXkpO1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnLmZhaWx1cmUnKS50ZXh0KCcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoZ3JleSk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQobmV3X3N0YXRlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmV5KTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dChuZXdfc3RhdGUgfHwgJ1Vua25vd24nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFuaW1hdGlvbiBmb3IgY2hhbmdlXG4gICAgICAgIGlmIChvbGRfc3RhdGUgIT09IG5ld19zdGF0ZSkge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBwcm92aWRlciBzdGF0dXNlcyB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllc1xuICAgICAqIFN1cHBvcnRzIGJvdGggbGVnYWN5IGZvcm1hdCBhbmQgbmV3IGVuaGFuY2VkIGZvcm1hdCB3aXRoIGR1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMoc3RhdHVzZXMpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCYXRjaCBET00gdXBkYXRlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGNvbnN0IHVwZGF0ZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhlbHBlciBmdW5jdGlvbiB0byBidWlsZCB1cGRhdGUgb2JqZWN0IGZyb20gcHJvdmlkZXIgZGF0YVxuICAgICAgICBjb25zdCBidWlsZFVwZGF0ZU9iamVjdCA9IChwcm92aWRlcklkLCBwcm92aWRlciwgdHlwZSkgPT4gKHtcbiAgICAgICAgICAgIHByb3ZpZGVyX2lkOiBwcm92aWRlcklkLFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIHN0YXRlOiBwcm92aWRlci5zdGF0ZSxcbiAgICAgICAgICAgIG5ld19zdGF0ZTogcHJvdmlkZXIuc3RhdGUsIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBvbGRfc3RhdGU6IHByb3ZpZGVyLnN0YXRlLCAvLyBObyBhbmltYXRpb24gZm9yIGJ1bGsgdXBkYXRlXG4gICAgICAgICAgICBzdGF0ZUNvbG9yOiBwcm92aWRlci5zdGF0ZUNvbG9yLFxuICAgICAgICAgICAgc3RhdGVJY29uOiBwcm92aWRlci5zdGF0ZUljb24sXG4gICAgICAgICAgICBzdGF0ZVRleHQ6IHByb3ZpZGVyLnN0YXRlVGV4dCxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb246IHByb3ZpZGVyLnN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uOiBwcm92aWRlci5zdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lOiBwcm92aWRlci5sYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzczogcHJvdmlkZXIudGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICBzdWNjZXNzRHVyYXRpb246IHByb3ZpZGVyLnN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbjogcHJvdmlkZXIuZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgcnR0OiBwcm92aWRlci5ydHRcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc3RydWN0dXJlZCBmb3JtYXQgd2l0aCBzaXAvaWF4IHNlcGFyYXRpb25cbiAgICAgICAgWydzaXAnLCAnaWF4J10uZm9yRWFjaChwcm92aWRlclR5cGUgPT4ge1xuICAgICAgICAgICAgaWYgKHN0YXR1c2VzW3Byb3ZpZGVyVHlwZV0gJiYgdHlwZW9mIHN0YXR1c2VzW3Byb3ZpZGVyVHlwZV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXNbcHJvdmlkZXJUeXBlXSkuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBzdGF0dXNlc1twcm92aWRlclR5cGVdW3Byb3ZpZGVySWRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaChidWlsZFVwZGF0ZU9iamVjdChwcm92aWRlcklkLCBwcm92aWRlciwgcHJvdmlkZXJUeXBlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBzdHJ1Y3R1cmVkIGZvcm1hdCBmb3VuZCwgdHJ5IHNpbXBsZSBvYmplY3QgZm9ybWF0IChsZWdhY3kpXG4gICAgICAgIGlmICghc3RhdHVzZXMuc2lwICYmICFzdGF0dXNlcy5pYXggJiYgdHlwZW9mIHN0YXR1c2VzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXMpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBzdGF0dXNlc1twcm92aWRlcklkXTtcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlcy5wdXNoKGJ1aWxkVXBkYXRlT2JqZWN0KHByb3ZpZGVySWQsIHByb3ZpZGVyLCAndW5rbm93bicpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgdXBkYXRlcyBlZmZpY2llbnRseVxuICAgICAgICB0aGlzLnByb2Nlc3NCYXRjaFVwZGF0ZXModXBkYXRlcyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIG11bHRpcGxlIHN0YXR1cyB1cGRhdGVzIGVmZmljaWVudGx5IGluIGJhdGNoZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQmF0Y2hVcGRhdGVzKHVwZGF0ZXMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHVwZGF0ZXMpIHx8IHVwZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNwbGl0IHVwZGF0ZXMgaW50byBiYXRjaGVzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICBjb25zdCBiYXRjaFNpemUgPSAxMDtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1cGRhdGVzLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcbiAgICAgICAgICAgIGJhdGNoZXMucHVzaCh1cGRhdGVzLnNsaWNlKGksIGkgKyBiYXRjaFNpemUpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGJhdGNoIHdpdGggYSBzbWFsbCBkZWxheSB0byBwcmV2ZW50IGJsb2NraW5nIFVJXG4gICAgICAgIGxldCBiYXRjaEluZGV4ID0gMDtcbiAgICAgICAgY29uc3QgcHJvY2Vzc0JhdGNoID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGJhdGNoSW5kZXggPj0gYmF0Y2hlcy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICBiYXRjaC5mb3JFYWNoKHVwZGF0ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvdmlkZXJTdGF0dXModXBkYXRlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBiYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgaWYgKGJhdGNoSW5kZXggPCBiYXRjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHByb2Nlc3NCYXRjaCwgMTApOyAvLyBTbWFsbCBkZWxheSBiZXR3ZWVuIGJhdGNoZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHByb2Nlc3NCYXRjaCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBlbmhhbmNlZCB1cGRhdGUgbm90aWZpY2F0aW9uIHdpdGggdGltaW5nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlID0gJ2luZm8nLCBkdXJhdGlvbiA9IDUwMDApIHtcbiAgICAgICAgaWYgKCF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yIHx8ICF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaW5kaWNhdG9yID0gdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvcjtcbiAgICAgICAgY29uc3QgJGhlYWRlciA9ICRpbmRpY2F0b3IuZmluZCgnLmhlYWRlcicpO1xuICAgICAgICBjb25zdCAkc3RhdHVzTWVzc2FnZSA9ICRpbmRpY2F0b3IuZmluZCgnLnN0YXR1cy1tZXNzYWdlJyk7XG4gICAgICAgIGNvbnN0ICR0aW1lSW5mbyA9ICRpbmRpY2F0b3IuZmluZCgnLmxhc3QtY2hlY2stdGltZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsYXNzZXMgZm9yIHN0eWxpbmdcbiAgICAgICAgJGluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gaW5mbyBzdWNjZXNzIGVycm9yIHdhcm5pbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGFwcHJvcHJpYXRlIGhlYWRlciBiYXNlZCBvbiB0eXBlXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnaW5mbyc6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNJbmZvLFxuICAgICAgICAgICAgJ3N1Y2Nlc3MnOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlZCxcbiAgICAgICAgICAgICdlcnJvcic6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNFcnJvcixcbiAgICAgICAgICAgICd3YXJuaW5nJzogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1dhcm5pbmdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgICRoZWFkZXIudGV4dChoZWFkZXJzW3R5cGVdIHx8ICdTdGF0dXMnKTtcbiAgICAgICAgJHN0YXR1c01lc3NhZ2UudGV4dChtZXNzYWdlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aW1pbmcgaW5mb3JtYXRpb25cbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgJHRpbWVJbmZvLnRleHQoYExhc3QgY2hlY2s6ICR7bm93LnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgdXBkYXRlIHRpbWVcbiAgICAgICAgdGhpcy5sYXN0VXBkYXRlVGltZSA9IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlIHdpdGggZW5oYW5jZWQgdGltaW5nXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCBkdXJhdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBtYW51YWxseSBkaXNtaXNzXG4gICAgICAgICRpbmRpY2F0b3Iub2ZmKCdjbGljay5kaXNtaXNzJykub24oJ2NsaWNrLmRpc21pc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBsYXN0IGNoZWNrIHRpbWUgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZUxhc3RDaGVja1RpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgdGltZVN0ciA9IGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYW55IGxhc3QgY2hlY2sgdGltZSBkaXNwbGF5c1xuICAgICAgICAkKCcucHJvdmlkZXItbGFzdC1jaGVjay10aW1lJykudGV4dCh0aW1lU3RyKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIHN0YXR1cyB1cGRhdGUgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZ1xuICAgICAqL1xuICAgIHJlcXVlc3RTdGF0dXNVcGRhdGUoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUsXG4gICAgICAgICAgICAnaW5mbycsXG4gICAgICAgICAgICAzMDAwXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyB2aWEgUkVTVCBBUElcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9hcGkvc3RhdHVzZXNgLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBmb3JjZTogdHJ1ZSAvLyBGb3JjZSBpbW1lZGlhdGUgdXBkYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgc3RhdHVzIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVBbGxQcm92aWRlclN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG5vdGlmaWNhdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlckNvdW50ID0gdGhpcy5jb3VudFByb3ZpZGVycyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVDb21wbGV0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlQ29tcGxldGUucmVwbGFjZSgnJXMnLCBwcm92aWRlckNvdW50KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBgU3RhdHVzIHVwZGF0ZWQgZm9yICR7cHJvdmlkZXJDb3VudH0gcHJvdmlkZXJzYDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVGYWlsZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgXG4gICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXMuam9pbignLCAnKVxuICAgICAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVFcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTWVzc2FnZSwgJ2Vycm9yJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0Nvbm5lY3Rpb25FcnJvcixcbiAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ291bnQgdG90YWwgcHJvdmlkZXJzIGluIHN0YXR1cyBkYXRhXG4gICAgICovXG4gICAgY291bnRQcm92aWRlcnMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHJldHVybiAwO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc2lwKSBjb3VudCArPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhLnNpcCkubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhdHVzRGF0YS5pYXgpIGNvdW50ICs9IE9iamVjdC5rZXlzKHN0YXR1c0RhdGEuaWF4KS5sZW5ndGg7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YS5zaXAgJiYgIXN0YXR1c0RhdGEuaWF4KSBjb3VudCA9IE9iamVjdC5rZXlzKHN0YXR1c0RhdGEpLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjYWNoZWQgcm93IGVsZW1lbnQgZm9yIHByb3ZpZGVyXG4gICAgICovXG4gICAgZ2V0Q2FjaGVkUm93KHByb3ZpZGVySWQpIHtcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KHByb3ZpZGVySWQpO1xuICAgICAgICBpZiAoISRyb3cgfHwgISRyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkcm93ID0gJChgIyR7cHJvdmlkZXJJZH1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQocHJvdmlkZXJJZCwgJHJvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRyb3c7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHByb3ZpZGVyIGRldGFpbHMgbW9kYWwvcG9wdXBcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJEZXRhaWxzKHByb3ZpZGVySWQpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Mb2FkaW5nUHJvdmlkZXJEZXRhaWxzLFxuICAgICAgICAgICAgJ2luZm8nLFxuICAgICAgICAgICAgMjAwMFxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgLy8gRmV0Y2ggZnJlc2ggZGV0YWlscyBmcm9tIEFQSVxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2FwaS9zdGF0dXMvJHtwcm92aWRlcklkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRldGFpbGVkIHN0YXR1cyBtb2RhbCBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsQ29udGVudCA9IHRoaXMuYnVpbGRTdGF0dXNEZXRhaWxzTW9kYWwocHJvdmlkZXJJZCwgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIG1vZGFsXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBtb2RhbCB1c2luZyBGb21hbnRpYyBVSVxuICAgICAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKG1vZGFsQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uSGlkZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX05vU3RhdHVzSW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgICd3YXJuaW5nJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9GYWlsZWRUb0xvYWREZXRhaWxzLFxuICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkZXRhaWxlZCBzdGF0dXMgbW9kYWwgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsKHByb3ZpZGVySWQsIHN0YXR1c0luZm8pIHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgdW5pcWlkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBob3N0LFxuICAgICAgICAgICAgdXNlcm5hbWUsXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUNvbG9yLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgcnR0LFxuICAgICAgICAgICAgc3RhdGlzdGljcyxcbiAgICAgICAgICAgIHJlY2VudEV2ZW50cyxcbiAgICAgICAgICAgIGxhc3RVcGRhdGVGb3JtYXR0ZWQsXG4gICAgICAgICAgICBzdGF0ZVN0YXJ0VGltZUZvcm1hdHRlZFxuICAgICAgICB9ID0gc3RhdHVzSW5mbztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHN0YXRpc3RpY3Mgc2VjdGlvblxuICAgICAgICBsZXQgc3RhdHNIdG1sID0gJyc7XG4gICAgICAgIGlmIChzdGF0aXN0aWNzKSB7XG4gICAgICAgICAgICBjb25zdCB7IHRvdGFsQ2hlY2tzLCBzdWNjZXNzQ291bnQsIGZhaWx1cmVDb3VudCwgYXZhaWxhYmlsaXR5LCBhdmVyYWdlUnR0LCBtaW5SdHQsIG1heFJ0dCB9ID0gc3RhdGlzdGljcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRvdGFsQ2hlY2tzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8aDQ+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3RhdGlzdGljc308L2g0PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZm91ciBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke3RvdGFsQ2hlY2tzfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Ub3RhbENoZWNrc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IGdyZWVuIHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke3N1Y2Nlc3NDb3VudH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3VjY2Vzc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IHJlZCBzdGF0aXN0aWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCI+JHtmYWlsdXJlQ291bnR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0ZhaWx1cmVzfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgJHthdmFpbGFiaWxpdHkgPj0gOTkgPyAnZ3JlZW4nIDogYXZhaWxhYmlsaXR5ID49IDk1ID8gJ3llbGxvdycgOiAncmVkJ30gc3RhdGlzdGljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiPiR7YXZhaWxhYmlsaXR5fSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfQXZhaWxhYmlsaXR5fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2F2ZXJhZ2VSdHQgIT09IG51bGwgPyBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aHJlZSBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfQXZlcmFnZVJUVH06PC9zdHJvbmc+ICR7YXZlcmFnZVJ0dH0gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfTWluUlRUfTo8L3N0cm9uZz4gJHttaW5SdHR9IG1zXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX01heFJUVH06PC9zdHJvbmc+ICR7bWF4UnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmAgOiAnJ31cbiAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCByZWNlbnQgZXZlbnRzIHNlY3Rpb25cbiAgICAgICAgbGV0IGV2ZW50c0h0bWwgPSAnJztcbiAgICAgICAgaWYgKHJlY2VudEV2ZW50cyAmJiByZWNlbnRFdmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRSb3dzID0gcmVjZW50RXZlbnRzLnNsaWNlKDAsIDUpLm1hcChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRUeXBlID0gZXZlbnQudHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogZXZlbnQudHlwZSA9PT0gJ3dhcm5pbmcnID8gJ3llbGxvdycgOiAnZ3JlZW4nO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtldmVudC5ldmVudF0gfHwgZXZlbnQuZXZlbnQgfHwgZXZlbnQuc3RhdGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwiJHtldmVudFR5cGV9IGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtldmVudC5kYXRlfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtldmVudFRleHR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke2V2ZW50LnN0YXRlfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH0pLmpvaW4oJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBldmVudHNIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8aDQ+JHtnbG9iYWxUcmFuc2xhdGUucHJfUmVjZW50RXZlbnRzfTwvaDQ+XG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyBjb21wYWN0IHRhYmxlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0Ym9keT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZXZlbnRSb3dzfVxuICAgICAgICAgICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBpZD1cInByb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsXCIgY2xhc3M9XCJ1aSBsYXJnZSBtb2RhbFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke3N0YXRlQ29sb3J9IGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2Rlc2NyaXB0aW9uIHx8IHVuaXFpZH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudHNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGg0PiR7Z2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySW5mb308L2g0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySWR9Ojwvc3Ryb25nPiAke3VuaXFpZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0hvc3R9Ojwvc3Ryb25nPiAke2hvc3R9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Vc2VybmFtZX06PC9zdHJvbmc+ICR7dXNlcm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGV9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ1aSAke3N0YXRlQ29sb3J9IHRleHRcIj4ke2dsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXSB8fCBzdGF0ZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0ZUR1cmF0aW9ufTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7dGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3J0dCAhPT0gbnVsbCAmJiBydHQgIT09IHVuZGVmaW5lZCA/IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0N1cnJlbnRSVFR9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtydHQgPiAyMDAgPyAncmVkJyA6IHJ0dCA+IDEwMCA/ICdvcmFuZ2UnIDogJ2dyZWVuJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7bGFzdFN1Y2Nlc3NUaW1lID8gYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHR3byBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0xhc3RTdWNjZXNzfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RoaXMuZm9ybWF0VGltZUFnbyhsYXN0U3VjY2Vzc1RpbWUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0VXBkYXRlfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2xhc3RVcGRhdGVGb3JtYXR0ZWQgfHwgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7c3RhdHNIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtldmVudHNIdG1sfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uXCIgb25jbGljaz1cIndpbmRvdy5sb2NhdGlvbi5ocmVmPScke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeS8ke3VuaXFpZH0nXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0VkaXRQcm92aWRlcn1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBwcmltYXJ5IGJ1dHRvblwiIG9uY2xpY2s9XCJQcm92aWRlclN0YXR1c01vbml0b3IucmVxdWVzdFByb3ZpZGVyQ2hlY2soJyR7dW5pcWlkfScpXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNrTm93fVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNhbmNlbCBidXR0b25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0Nsb3NlfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbW1lZGlhdGUgY2hlY2sgZm9yIHNwZWNpZmljIHByb3ZpZGVyXG4gICAgICovXG4gICAgcmVxdWVzdFByb3ZpZGVyQ2hlY2socHJvdmlkZXJJZCkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2FwaS9zdGF0dXMvJHtwcm92aWRlcklkfWAsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGZvcmNlQ2hlY2s6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVmcmVzaEZyb21BbWk6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NoZWNrUmVxdWVzdGVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgMjAwMFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1vZGFsIHdpdGggZnJlc2ggZGF0YSBpZiBzdGlsbCBvcGVuXG4gICAgICAgICAgICAgICAgICAgIGlmICgkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5sZW5ndGggJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJykubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdXBkYXRlZCBtb2RhbCB3aXRoIGZyZXNoIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsQ29udGVudCA9IHRoaXMuYnVpbGRTdGF0dXNEZXRhaWxzTW9kYWwocHJvdmlkZXJJZCwgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZChtb2RhbENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uSGlkZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tGYWlsZWQsXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcicsXG4gICAgICAgICAgICAgICAgICAgIDMwMDBcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBFbmhhbmNlZCBpbml0aWFsaXphdGlvbiB3aXRoIHVzZXIgaW50ZXJhY3Rpb24gc3VwcG9ydFxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIC8vIEFkZCBtYW51YWwgcmVmcmVzaCBidXR0b24gaWYgbm90IGV4aXN0c1xuICAgIGlmICgkKCcucHJvdmlkZXItcmVmcmVzaC1idG4nKS5sZW5ndGggPT09IDAgJiYgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHJlZnJlc2hCdXR0b24gPSBgXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgbWluaSBsYWJlbGVkIGljb24gYnV0dG9uIHByb3ZpZGVyLXJlZnJlc2gtYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPVwicG9zaXRpb246IGFic29sdXRlOyB0b3A6IDEwcHg7IHJpZ2h0OiAxMHB4OyB6LWluZGV4OiAxMDA7XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHJfUmVmcmVzaFN0YXR1c31cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgO1xuICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJykuYXBwZW5kKHJlZnJlc2hCdXR0b24pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgZm9yIHJlZnJlc2ggYnV0dG9uXG4gICAgICAgICQoJy5wcm92aWRlci1yZWZyZXNoLWJ0bicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IucmVxdWVzdFN0YXR1c1VwZGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQWRkIGRvdWJsZS1jbGljayBoYW5kbGVycyBmb3Igc3RhdHVzIGNlbGxzIHRvIHNob3cgZGV0YWlscyBtb2RhbFxuICAgICQoZG9jdW1lbnQpLm9uKCdkYmxjbGljaycsICcucHJvdmlkZXItc3RhdHVzIC51aS5sYWJlbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICBpZiAocHJvdmlkZXJJZCAmJiB0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnNob3dQcm92aWRlckRldGFpbHMocHJvdmlkZXJJZCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICAvLyBDbGVhbiB1cCBtb2RhbHMgd2hlbiB0aGV5J3JlIGhpZGRlblxuICAgICQoZG9jdW1lbnQpLm9uKCdoaWRkZW4uYnMubW9kYWwnLCAnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgfSk7XG59KTtcblxuLy8gRG9uJ3QgYXV0by1pbml0aWFsaXplIHRoZSBtb25pdG9yIGhlcmUgLSBsZXQgcHJvdmlkZXJzLWluZGV4LmpzIGhhbmRsZSBpdFxuLy8gVGhpcyBhbGxvd3MgZm9yIHByb3BlciBzZXF1ZW5jaW5nIHdpdGggRGF0YVRhYmxlIGluaXRpYWxpemF0aW9uXG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5Qcm92aWRlclN0YXR1c01vbml0b3IgPSBQcm92aWRlclN0YXR1c01vbml0b3I7Il19