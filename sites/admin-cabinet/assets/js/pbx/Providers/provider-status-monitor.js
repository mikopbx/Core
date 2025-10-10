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

/* global globalRootUrl, globalTranslate, EventBus, ProvidersAPI */

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
    this.showUpdateNotification(globalTranslate.pr_RequestingStatusUpdate, 'info', 3000); // Request status via REST API using ProvidersAPI

    ProvidersAPI.getStatuses(function (response) {
      if (response.success && response.data) {
        // Process the status data
        _this9.updateAllProviderStatuses(response.data); // Show success notification


        var providerCount = _this9.countProviders(response.data);

        var message = globalTranslate.pr_StatusUpdateComplete ? globalTranslate.pr_StatusUpdateComplete.replace('%s', providerCount) : "Status updated for ".concat(providerCount, " providers");

        _this9.showUpdateNotification(message, 'success');
      } else {
        var errorMessage = response.messages ? Array.isArray(response.messages) ? response.messages.join(', ') : response.messages : globalTranslate.pr_StatusUpdateFailed;

        _this9.showUpdateNotification(errorMessage, 'error');
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
    this.showUpdateNotification(globalTranslate.pr_LoadingProviderDetails, 'info', 2000); // Fetch fresh details from API using ProvidersAPI

    ProvidersAPI.getStatus(providerId, function (response) {
      if (response.success && response.data) {
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
        var errorMessage = response.messages ? Array.isArray(response.messages) ? response.messages.join(', ') : response.messages : globalTranslate.pr_NoStatusInfo;

        _this10.showUpdateNotification(errorMessage, 'warning');
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

    // Use ProvidersAPI.forceCheck for forcing a status check
    ProvidersAPI.forceCheck(providerId, function (response) {
      if (response.success) {
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
      } else {
        var errorMessage = response.messages ? Array.isArray(response.messages) ? response.messages.join(', ') : response.messages : globalTranslate.pr_CheckFailed;

        _this11.showUpdateNotification(errorMessage, 'error', 3000);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwiY2hhbm5lbElkIiwiaXNJbml0aWFsaXplZCIsImxhc3RVcGRhdGVUaW1lIiwic3RhdHVzQ2FjaGUiLCIkc3RhdHVzQ2VsbHMiLCIkbGFzdFVwZGF0ZUluZGljYXRvciIsImNhY2hlZFJvd3MiLCJNYXAiLCJjYWNoZWRTdGF0dXNDZWxscyIsImluaXRpYWxpemUiLCJjYWNoZUVsZW1lbnRzIiwiaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwiY2hhbmdlcyIsIkFycmF5IiwiaXNBcnJheSIsInRpbWVzdGFtcCIsIkRhdGUiLCJub3ciLCJmb3JFYWNoIiwiY2hhbmdlIiwidXBkYXRlUHJvdmlkZXJTdGF0dXMiLCJjaGFuZ2VDb3VudCIsInByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZCIsInByX011bHRpcGxlUHJvdmlkZXJTdGF0dXNlc0NoYW5nZWQiLCJyZXBsYWNlIiwic2hvd1VwZGF0ZU5vdGlmaWNhdGlvbiIsInN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsInVwZGF0ZUxhc3RDaGVja1RpbWUiLCJlcnJvck1zZyIsImVycm9yIiwicHJfU3RhdHVzQ2hlY2tGYWlsZWQiLCJwcm92aWRlcl9pZCIsInR5cGUiLCJzdGF0ZSIsIm5ld19zdGF0ZSIsIm9sZF9zdGF0ZSIsInN0YXRlQ29sb3IiLCJzdGF0ZUljb24iLCJzdGF0ZVRleHQiLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdGVEdXJhdGlvbiIsImxhc3RTdWNjZXNzVGltZSIsInRpbWVTaW5jZUxhc3RTdWNjZXNzIiwic3VjY2Vzc0R1cmF0aW9uIiwiZmFpbHVyZUR1cmF0aW9uIiwiZ2V0IiwiY3VycmVudFN0YXRlIiwicHJldmlvdXNTdGF0ZSIsInRvb2x0aXBDb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInJ0dCIsImhvc3QiLCJ1c2VybmFtZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwicG9wdXAiLCJob3ZlcmFibGUiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCIkZmFpbHVyZUNlbGwiLCJ1cGRhdGVEdXJhdGlvbkRpc3BsYXkiLCJ0cmFuc2l0aW9uIiwidXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3kiLCJzdGF0dXNJbmZvIiwic3RhdGVUaXRsZSIsInRvb2x0aXAiLCJoYXNTdGF0dXNJbmZvIiwic3RhdHVzU2VjdGlvbiIsInVuZGVmaW5lZCIsImZvcm1hdHRlZER1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJkdXJhdGlvbkxhYmVsIiwicHJfU3RhdHVzRHVyYXRpb24iLCJydHRMYWJlbCIsInByX1JUVCIsInJ0dENsYXNzIiwiZm9ybWF0dGVkVGltZSIsImxhc3RTdWNjZXNzTGFiZWwiLCJwcl9MYXN0U3VjY2Vzc1RpbWUiLCJzdWNjZXNzTGFiZWwiLCJwcl9TdWNjZXNzRHVyYXRpb24iLCJmYWlsdXJlTGFiZWwiLCJwcl9GYWlsdXJlRHVyYXRpb24iLCJkdXJhdGlvbnMiLCIkZHVyYXRpb25JbmZvIiwiJG5hbWVDb2x1bW4iLCJlcSIsImFwcGVuZCIsImR1cmF0aW9uVGV4dCIsInN0YXRlTGFiZWwiLCJ0aW1lQWdvIiwiZm9ybWF0VGltZUFnbyIsImxvYWRpbmdUZXh0Iiwic2Vjb25kcyIsInplcm9Gb3JtYXQiLCJwcl9UaW1lRm9ybWF0X1NlY29uZHMiLCJkYXlzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJtaW51dGVzIiwic2VjcyIsInJlc3VsdCIsImZvcm1hdCIsInByX1RpbWVGb3JtYXRfRGF5cyIsInB1c2giLCJwcl9UaW1lRm9ybWF0X0hvdXJzIiwicHJfVGltZUZvcm1hdF9NaW51dGVzIiwic2xpY2UiLCJqb2luIiwiZGlmZiIsImFnb0xhYmVsIiwicHJfVGltZUFnbyIsInByX0p1c3ROb3ciLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJyZWQiLCJub3JtYWxpemVkU3RhdGUiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZXMiLCJidWlsZFVwZGF0ZU9iamVjdCIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyVHlwZSIsIk9iamVjdCIsImtleXMiLCJzaXAiLCJpYXgiLCJwcm9jZXNzQmF0Y2hVcGRhdGVzIiwiYmF0Y2hTaXplIiwiYmF0Y2hlcyIsImkiLCJiYXRjaEluZGV4IiwicHJvY2Vzc0JhdGNoIiwiYmF0Y2giLCJ1cGRhdGUiLCJkdXJhdGlvbiIsIiRpbmRpY2F0b3IiLCIkaGVhZGVyIiwiJHN0YXR1c01lc3NhZ2UiLCIkdGltZUluZm8iLCJoZWFkZXJzIiwicHJfU3RhdHVzSW5mbyIsInByX1N0YXR1c1VwZGF0ZWQiLCJwcl9TdGF0dXNFcnJvciIsInByX1N0YXR1c1dhcm5pbmciLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJjbGVhclRpbWVvdXQiLCJub3RpZmljYXRpb25UaW1lb3V0Iiwib2ZmIiwib24iLCJkYXRlIiwidGltZVN0ciIsInByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUiLCJQcm92aWRlcnNBUEkiLCJnZXRTdGF0dXNlcyIsInJlc3BvbnNlIiwic3VjY2VzcyIsInByb3ZpZGVyQ291bnQiLCJjb3VudFByb3ZpZGVycyIsInByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJwcl9TdGF0dXNVcGRhdGVGYWlsZWQiLCJzdGF0dXNEYXRhIiwiY291bnQiLCJnZXRDYWNoZWRSb3ciLCJzaG93UHJvdmlkZXJEZXRhaWxzIiwicHJfTG9hZGluZ1Byb3ZpZGVyRGV0YWlscyIsImdldFN0YXR1cyIsIm1vZGFsQ29udGVudCIsImJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsIiwicmVtb3ZlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uSGlkZGVuIiwicHJfTm9TdGF0dXNJbmZvIiwidW5pcWlkIiwiZGVzY3JpcHRpb24iLCJzdGF0aXN0aWNzIiwicmVjZW50RXZlbnRzIiwibGFzdFVwZGF0ZUZvcm1hdHRlZCIsInN0YXRlU3RhcnRUaW1lRm9ybWF0dGVkIiwic3RhdHNIdG1sIiwidG90YWxDaGVja3MiLCJzdWNjZXNzQ291bnQiLCJmYWlsdXJlQ291bnQiLCJhdmFpbGFiaWxpdHkiLCJhdmVyYWdlUnR0IiwibWluUnR0IiwibWF4UnR0IiwicHJfU3RhdGlzdGljcyIsInByX1RvdGFsQ2hlY2tzIiwicHJfU3VjY2VzcyIsInByX0ZhaWx1cmVzIiwicHJfQXZhaWxhYmlsaXR5IiwicHJfQXZlcmFnZVJUVCIsInByX01pblJUVCIsInByX01heFJUVCIsImV2ZW50c0h0bWwiLCJldmVudFJvd3MiLCJtYXAiLCJldmVudFR5cGUiLCJldmVudFRleHQiLCJwcl9SZWNlbnRFdmVudHMiLCJwcl9Qcm92aWRlckluZm8iLCJwcl9Qcm92aWRlcklkIiwicHJfSG9zdCIsInByX1VzZXJuYW1lIiwicHJfQ3VycmVudFN0YXRlIiwicHJfU3RhdGVEdXJhdGlvbiIsInByX0N1cnJlbnRSVFQiLCJwcl9MYXN0U3VjY2VzcyIsInByX0xhc3RVcGRhdGUiLCJ0b0xvY2FsZVN0cmluZyIsImdsb2JhbFJvb3RVcmwiLCJwcl9FZGl0UHJvdmlkZXIiLCJwcl9DaGVja05vdyIsInByX0Nsb3NlIiwicmVxdWVzdFByb3ZpZGVyQ2hlY2siLCJmb3JjZUNoZWNrIiwicHJfQ2hlY2tSZXF1ZXN0ZWQiLCJwcl9DaGVja0ZhaWxlZCIsImRvY3VtZW50IiwicmVhZHkiLCJyZWZyZXNoQnV0dG9uIiwicHJfUmVmcmVzaFN0YXR1cyIsImNzcyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsImNsb3Nlc3QiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCQyxFQUFBQSxTQUFTLEVBQUUsaUJBRGU7QUFFMUJDLEVBQUFBLGFBQWEsRUFBRSxLQUZXO0FBRzFCQyxFQUFBQSxjQUFjLEVBQUUsQ0FIVTtBQUkxQkMsRUFBQUEsV0FBVyxFQUFFLEVBSmE7O0FBTTFCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFUWTtBQVUxQkMsRUFBQUEsb0JBQW9CLEVBQUUsSUFWSTs7QUFZMUI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQUFJQyxHQUFKLEVBZmM7QUFnQjFCQyxFQUFBQSxpQkFBaUIsRUFBRSxJQUFJRCxHQUFKLEVBaEJPOztBQWtCMUI7QUFDSjtBQUNBO0FBQ0lFLEVBQUFBLFVBckIwQix3QkFxQmI7QUFDVCxRQUFJLEtBQUtSLGFBQVQsRUFBd0I7QUFDcEI7QUFDSCxLQUhRLENBS1Q7OztB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RUEsUUFBTTdHLFVBQVUsR0FBR3BKLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUWtRLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0I1UCxJQUF0QixDQUEyQixJQUEzQixDQUFuQjs7QUFDQSxRQUFJOEksVUFBVSxJQUFJLE9BQU9wSyxxQkFBUCxLQUFpQyxXQUFuRCxFQUFnRTtBQUM1REEsTUFBQUEscUJBQXFCLENBQUNrTixtQkFBdEIsQ0FBMEM5QyxVQUExQztBQUNIO0FBQ0osR0FSRCxFQXRCb0IsQ0FnQ3BCOztBQUNBcEosRUFBQUEsQ0FBQyxDQUFDMFAsUUFBRCxDQUFELENBQVl6RSxFQUFaLENBQWUsaUJBQWYsRUFBa0MsZ0NBQWxDLEVBQW9FLFlBQVc7QUFDM0VqTCxJQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVF1TSxNQUFSO0FBQ0gsR0FGRDtBQUdILENBcENELEUsQ0FzQ0E7QUFDQTtBQUVBOztBQUNBNEQsTUFBTSxDQUFDblIscUJBQVAsR0FBK0JBLHFCQUEvQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV2ZW50QnVzLCBQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBQcm92aWRlciBTdGF0dXMgTW9uaXRvclxuICogSGFuZGxlcyByZWFsLXRpbWUgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIHdpdGggZW5oYW5jZWQgZmVhdHVyZXM6XG4gKiAtIFJlYWwtdGltZSBzdGF0dXMgdXBkYXRlcyB3aXRoIEV2ZW50QnVzIGludGVncmF0aW9uXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRHVyYXRpb24gZGlzcGxheXMgKHN0YXRlIGR1cmF0aW9uLCBzdWNjZXNzL2ZhaWx1cmUgZHVyYXRpb24pXG4gKiAtIExhc3Qgc3VjY2VzcyBpbmZvcm1hdGlvblxuICogLSBFbmhhbmNlZCB2aXN1YWwgZmVlZGJhY2sgd2l0aCBGb21hbnRpYyBVSSBjb21wb25lbnRzXG4gKi9cbmNvbnN0IFByb3ZpZGVyU3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdwcm92aWRlci1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGxhc3RVcGRhdGVUaW1lOiAwLFxuICAgIHN0YXR1c0NhY2hlOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNDZWxsczogbnVsbCxcbiAgICAkbGFzdFVwZGF0ZUluZGljYXRvcjogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBET00gY2FjaGUgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlZFJvd3M6IG5ldyBNYXAoKSxcbiAgICBjYWNoZWRTdGF0dXNDZWxsczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyBtb25pdG9yIHdpdGggZW5oYW5jZWQgZmVhdHVyZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50cyBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGxvYWRpbmcgcGxhY2Vob2xkZXJzIGZvciBhbGwgcHJvdmlkZXIgcm93c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVMb2FkaW5nUGxhY2Vob2xkZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZW5oYW5jZWQgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLnByb3ZpZGVyLXN0YXR1cywgLnByb3ZpZGVyLXN0YXR1cy1jZWxsJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBwcm92aWRlciByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIucHJvdmlkZXItcm93LCB0cltpZF0nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICRyb3cuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoaWQsICRyb3cpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChpZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZW5oYW5jZWQgc3RhdHVzIGluZGljYXRvciB3aXRoIGR1cmF0aW9uIGluZm9cbiAgICAgKi9cbiAgICBjcmVhdGVTdGF0dXNJbmRpY2F0b3IoKSB7XG4gICAgICAgIGlmICgkKCcjcHJvdmlkZXItc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJwcm92aWRlci1zdGF0dXMtaW5kaWNhdG9yXCIgY2xhc3M9XCJ1aSBtaW5pIG1lc3NhZ2UgaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic3RhdHVzLW1lc3NhZ2VcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYXN0LWNoZWNrLXRpbWVcIiBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBjb2xvcjogIzg4ODtcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykucHJlcGVuZChpbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgPSAkKCcjcHJvdmlkZXItc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXZlbnRCdXMgbm90IGF2YWlsYWJsZSwgcHJvdmlkZXIgc3RhdHVzIG1vbml0b3Igd2lsbCB3b3JrIHdpdGhvdXQgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIHBlcmlvZGljIGhlYWx0aCBjaGVja3MgYW5kIGNhY2hlIG1haW50ZW5hbmNlXG4gICAgICovXG4gICAgc2V0dXBIZWFsdGhDaGVja3MoKSB7XG4gICAgICAgIC8vIFJlZnJlc2ggY2FjaGUgZXZlcnkgMzAgc2Vjb25kcyB0byBoYW5kbGUgZHluYW1pYyBjb250ZW50XG4gICAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaENhY2hlKCk7XG4gICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIHVwZGF0ZSBldmVyeSA1IG1pbnV0ZXMgYXMgZmFsbGJhY2tcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0U3RhdHVzVXBkYXRlKCk7XG4gICAgICAgIH0sIDMwMDAwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGNhY2hlZCBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICByZWZyZXNoQ2FjaGUoKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVkUm93cy5jbGVhcigpO1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmNsZWFyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGxvYWRpbmcgcGxhY2Vob2xkZXJzIGZvciBuZXcgcm93c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVMb2FkaW5nUGxhY2Vob2xkZXJzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBtZXNzYWdlIGNhbiBoYXZlIGV2ZW50IGF0IHRvcCBsZXZlbCBvciBpbiBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIEV2ZW50IGF0IHRvcCBsZXZlbFxuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmV2ZW50O1xuICAgICAgICAgICAgZGF0YSA9IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmRhdGEgJiYgbWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICAvLyBFdmVudCBpbiBkYXRhXG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jaGVjayc6XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBjaGVja2luZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBzaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSkge1xuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBlcnJvciBzdWNjZXNzJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnaW5mbycpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuZmluZCgnLmNvbnRlbnQnKVxuICAgICAgICAgICAgLnRleHQoZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMpO1xuICAgICAgICAgICAgXG4gICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSwgMzAwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHN0YXR1cyB1cGRhdGUgd2l0aCBjaGFuZ2VzXG4gICAgICovXG4gICAgcHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5jaGFuZ2VzIHx8ICFBcnJheS5pc0FycmF5KGRhdGEuY2hhbmdlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXAgfHwgRGF0ZS5ub3coKSAvIDEwMDA7XG4gICAgICAgIHRoaXMubGFzdFVwZGF0ZVRpbWUgPSB0aW1lc3RhbXA7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2hhbmdlXG4gICAgICAgIGRhdGEuY2hhbmdlcy5mb3JFYWNoKGNoYW5nZSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb3ZpZGVyU3RhdHVzKGNoYW5nZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB1cGRhdGUgbm90aWZpY2F0aW9uXG4gICAgICAgIGNvbnN0IGNoYW5nZUNvdW50ID0gZGF0YS5jaGFuZ2VzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGNoYW5nZUNvdW50ID09PSAxIFxuICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUucHJfT25lUHJvdmlkZXJTdGF0dXNDaGFuZ2VkXG4gICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NdWx0aXBsZVByb3ZpZGVyU3RhdHVzZXNDaGFuZ2VkLnJlcGxhY2UoJyVzJywgY2hhbmdlQ291bnQpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2FjaGVcbiAgICAgICAgdGhpcy5zdGF0dXNDYWNoZSA9IGRhdGEuc3RhdHVzZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIHByb3ZpZGVyIHN0YXR1c2VzIG9uIHRoZSBwYWdlXG4gICAgICAgIHRoaXMudXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhkYXRhLnN0YXR1c2VzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBsYXN0IGNoZWNrIHRpbWVcbiAgICAgICAgaWYgKGRhdGEudGltZXN0YW1wKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUxhc3RDaGVja1RpbWUoZGF0YS50aW1lc3RhbXApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3RhdHVzIGVycm9yXG4gICAgICovXG4gICAgaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSkge1xuICAgICAgICBjb25zdCBlcnJvck1zZyA9IGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0NoZWNrRmFpbGVkO1xuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNc2csICdlcnJvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNpbmdsZSBwcm92aWRlciBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKiBObyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZyAtIGJhY2tlbmQgcHJvdmlkZXMgYWxsIGRpc3BsYXkgcHJvcGVydGllc1xuICAgICAqL1xuICAgIHVwZGF0ZVByb3ZpZGVyU3RhdHVzKGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IFxuICAgICAgICAgICAgcHJvdmlkZXJfaWQsIFxuICAgICAgICAgICAgdHlwZSwgXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIG5ld19zdGF0ZSwgXG4gICAgICAgICAgICBvbGRfc3RhdGUsXG4gICAgICAgICAgICBzdGF0ZUNvbG9yLCBcbiAgICAgICAgICAgIHN0YXRlSWNvbiwgXG4gICAgICAgICAgICBzdGF0ZVRleHQsIFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvblxuICAgICAgICB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGNhY2hlZCBlbGVtZW50cyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChwcm92aWRlcl9pZCk7XG4gICAgICAgIGlmICghJHJvdykge1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke3Byb3ZpZGVyX2lkfWApO1xuICAgICAgICAgICAgaWYgKCRyb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQocHJvdmlkZXJfaWQsICRyb3cpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFJvdyBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0ICRzdGF0dXNDZWxsID0gdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5nZXQocHJvdmlkZXJfaWQpO1xuICAgICAgICBpZiAoISRzdGF0dXNDZWxsKSB7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLnByb3ZpZGVyLXN0YXR1cycpO1xuICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChwcm92aWRlcl9pZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFN0YXR1cyBjZWxsIG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY3VycmVudCBzdGF0ZSBvciBmYWxsYmFjayB0byBuZXdfc3RhdGUgZm9yIGNvbXBhdGliaWxpdHlcbiAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gc3RhdGUgfHwgbmV3X3N0YXRlO1xuICAgICAgICBjb25zdCBwcmV2aW91c1N0YXRlID0gJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIGRpcmVjdGx5XG4gICAgICAgIGlmIChzdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICAvLyBFbmhhbmNlZCBzdGF0dXMgaW5kaWNhdG9yIHdpdGggdG9vbHRpcCBzdXBwb3J0XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgc3RhdGU6IGN1cnJlbnRTdGF0ZSxcbiAgICAgICAgICAgICAgICBzdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIHJ0dDogY2hhbmdlLnJ0dCxcbiAgICAgICAgICAgICAgICBob3N0OiBjaGFuZ2UuaG9zdCxcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogY2hhbmdlLnVzZXJuYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiXG4gICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiXG4gICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiXG4gICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cInNtYWxsXCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBCYXRjaCBET00gdXBkYXRlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoc3RhdHVzSHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCAoRm9tYW50aWMgVUkgdG9vbHRpcClcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5maW5kKCcudWkubGFiZWwnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3NtYWxsJyxcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAyMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENsZWFyIGZhaWx1cmUgdGV4dCB3aGVuIHVzaW5nIG1vZGVybiBzdGF0dXMgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0ICRmYWlsdXJlQ2VsbCA9ICRyb3cuZmluZCgnLmZhaWx1cmUsIC5mZWF0dXJlcy5mYWlsdXJlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRmYWlsdXJlQ2VsbC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyB0ZXh0IHN0YXR1cyB3aGVuIHdlIGhhdmUgdmlzdWFsIGluZGljYXRvcnNcbiAgICAgICAgICAgICAgICAgICAgJGZhaWx1cmVDZWxsLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgZHVyYXRpb24gaW5mb3JtYXRpb24gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVEdXJhdGlvbkRpc3BsYXkoJHJvdywge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVRleHRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBbmltYXRlIGlmIHN0YXRlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNTdGF0ZSAmJiBwcmV2aW91c1N0YXRlICE9PSBjdXJyZW50U3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY3VycmVudCBzdGF0ZSBmb3IgZnV0dXJlIGNvbXBhcmlzb25cbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5kYXRhKCdwcmV2LXN0YXRlJywgY3VycmVudFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgLSB1c2Ugc2ltcGxlIHN0YXRlLWJhc2VkIGRpc3BsYXlcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3koY2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgdG9vbHRpcCBjb250ZW50IHdpdGggZW5oYW5jZWQgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHN0YXR1c0luZm8pIHtcbiAgICAgICAgY29uc3QgeyBcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgc3RhdGVUZXh0LFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbiwgXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLCBcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLCBcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgIHJ0dCxcbiAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICB1c2VybmFtZVxuICAgICAgICB9ID0gc3RhdHVzSW5mbztcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB0cmFuc2xhdGVkIHN0YXRlIHRleHQgYXMgbWFpbiB0aXRsZVxuICAgICAgICBjb25zdCBzdGF0ZVRpdGxlID0gc3RhdGVUZXh0ID8gKGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZVRleHRdIHx8IHN0YXRlVGV4dCkgOiAoZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dIHx8IHN0YXRlRGVzY3JpcHRpb24gfHwgc3RhdGUgfHwgJycpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHRvb2x0aXAgPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwXCI+YDtcbiAgICAgICAgdG9vbHRpcCArPSBgPHN0cm9uZyBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX190aXRsZVwiPiR7c3RhdGVUaXRsZX08L3N0cm9uZz5gO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG9yaWdpbmFsIHN0YXRlIHZhbHVlIGlmIGF2YWlsYWJsZSBhbmQgZGlmZmVyZW50IGZyb20gdGl0bGVcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlICE9PSBzdGF0ZVRpdGxlKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXRlLW9yaWdpbmFsXCI+WyR7c3RhdGV9XTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBob3N0IGFuZCB1c2VybmFtZSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGhvc3QgfHwgdXNlcm5hbWUpIHtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc2VjdGlvblwiPmA7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9faW5mby1pdGVtXCI+SG9zdDogPHN0cm9uZz4ke2hvc3R9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1c2VybmFtZSkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9faW5mby1pdGVtXCI+VXNlcjogPHN0cm9uZz4ke3VzZXJuYW1lfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RhdHVzIGluZm9ybWF0aW9uIHNlY3Rpb25cbiAgICAgICAgbGV0IGhhc1N0YXR1c0luZm8gPSBmYWxzZTtcbiAgICAgICAgbGV0IHN0YXR1c1NlY3Rpb24gPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zZWN0aW9uXCI+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBhbmQgYWRkIGR1cmF0aW9uIGluZm9ybWF0aW9uIChub3cgY29tZXMgYXMgc2Vjb25kcyBmcm9tIGJhY2tlbmQpXG4gICAgICAgIGlmIChzdGF0ZUR1cmF0aW9uICE9PSB1bmRlZmluZWQgJiYgc3RhdGVEdXJhdGlvbiAhPT0gbnVsbCAmJiBzdGF0ZUR1cmF0aW9uID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRHVyYXRpb247XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtXCI+JHtkdXJhdGlvbkxhYmVsfTogPHN0cm9uZz4ke2Zvcm1hdHRlZER1cmF0aW9ufTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIFJUVCAoUm91bmQgVHJpcCBUaW1lKSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHJ0dCAhPT0gdW5kZWZpbmVkICYmIHJ0dCAhPT0gbnVsbCAmJiBydHQgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfUlRUO1xuICAgICAgICAgICAgLy8gRm9ybWF0IFJUVCB3aXRoIGNvbG9yIGNvZGluZ1xuICAgICAgICAgICAgbGV0IHJ0dENsYXNzID0gJ3Byb3ZpZGVyLXN0YXR1cy10b29sdGlwX19ydHQtLWdvb2QnO1xuICAgICAgICAgICAgaWYgKHJ0dCA+IDEwMCkgcnR0Q2xhc3MgPSAncHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3J0dC0td2FybmluZyc7XG4gICAgICAgICAgICBpZiAocnR0ID4gMjAwKSBydHRDbGFzcyA9ICdwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fcnR0LS1iYWQnO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbVwiPiR7cnR0TGFiZWx9OiA8c3Ryb25nIGNsYXNzPVwiJHtydHRDbGFzc31cIj4ke3J0dH0g0LzRgTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9ybWF0IHRpbWUgc2luY2UgbGFzdCBzdWNjZXNzIGlmIHByb3ZpZGVkIChub3cgY29tZXMgYXMgc2Vjb25kcylcbiAgICAgICAgaWYgKHRpbWVTaW5jZUxhc3RTdWNjZXNzICE9PSB1bmRlZmluZWQgJiYgdGltZVNpbmNlTGFzdFN1Y2Nlc3MgIT09IG51bGwgJiYgdGltZVNpbmNlTGFzdFN1Y2Nlc3MgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkVGltZSA9IHRoaXMuZm9ybWF0RHVyYXRpb24odGltZVNpbmNlTGFzdFN1Y2Nlc3MpO1xuICAgICAgICAgICAgY29uc3QgbGFzdFN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0U3VjY2Vzc1RpbWU7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19sYXN0LXN1Y2Nlc3NcIj4ke2xhc3RTdWNjZXNzTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkVGltZX0g0L3QsNC30LDQtDwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN1Y2Nlc3MvZmFpbHVyZSBkdXJhdGlvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN1Y2Nlc3NEdXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHN1Y2Nlc3NEdXJhdGlvbiAhPT0gbnVsbCAmJiBzdWNjZXNzRHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMuZm9ybWF0RHVyYXRpb24oc3VjY2Vzc0R1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdWNjZXNzRHVyYXRpb247XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdWNjZXNzLWR1cmF0aW9uXCI+JHtzdWNjZXNzTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkRHVyYXRpb259PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGhhc1N0YXR1c0luZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZmFpbHVyZUR1cmF0aW9uICE9PSB1bmRlZmluZWQgJiYgZmFpbHVyZUR1cmF0aW9uICE9PSBudWxsICYmIGZhaWx1cmVEdXJhdGlvbiA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbihmYWlsdXJlRHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgZmFpbHVyZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX0ZhaWx1cmVEdXJhdGlvbjtcbiAgICAgICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3RhdHVzLWl0ZW0gcHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2ZhaWx1cmUtZHVyYXRpb25cIj4ke2ZhaWx1cmVMYWJlbH06IDxzdHJvbmc+JHtmb3JtYXR0ZWREdXJhdGlvbn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzU3RhdHVzSW5mbykge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBzdGF0dXNTZWN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZGlmZmVyZW50IGZyb20gc3RhdGUgdGV4dFxuICAgICAgICBpZiAoc3RhdGVEZXNjcmlwdGlvbiAmJiBnbG9iYWxUcmFuc2xhdGVbc3RhdGVEZXNjcmlwdGlvbl0gJiYgZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dICE9PSBzdGF0ZVRpdGxlKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2Rlc2NyaXB0aW9uXCI+YDtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dO1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0b29sdGlwLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBkdXJhdGlvbiBkaXNwbGF5IGluIHByb3ZpZGVyIHJvd1xuICAgICAqL1xuICAgIHVwZGF0ZUR1cmF0aW9uRGlzcGxheSgkcm93LCBkdXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZUR1cmF0aW9uLCBsYXN0U3VjY2Vzc1RpbWUsIHN1Y2Nlc3NEdXJhdGlvbiwgZmFpbHVyZUR1cmF0aW9uLCBzdGF0ZVRleHQgfSA9IGR1cmF0aW9ucztcbiAgICAgICAgXG4gICAgICAgIC8vIExvb2sgZm9yIGR1cmF0aW9uIGRpc3BsYXkgZWxlbWVudHMgb3IgY3JlYXRlIHRoZW1cbiAgICAgICAgbGV0ICRkdXJhdGlvbkluZm8gPSAkcm93LmZpbmQoJy5wcm92aWRlci1kdXJhdGlvbi1pbmZvJyk7XG4gICAgICAgIGlmICgkZHVyYXRpb25JbmZvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gQWRkIGR1cmF0aW9uIGluZm8gY29udGFpbmVyIHRvIHRoZSBwcm92aWRlciBuYW1lIGNvbHVtblxuICAgICAgICAgICAgY29uc3QgJG5hbWVDb2x1bW4gPSAkcm93LmZpbmQoJ3RkJykuZXEoMik7IC8vIFVzdWFsbHkgdGhlIHRoaXJkIGNvbHVtbiBjb250YWlucyBwcm92aWRlciBuYW1lXG4gICAgICAgICAgICBpZiAoJG5hbWVDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJG5hbWVDb2x1bW4uYXBwZW5kKCc8ZGl2IGNsYXNzPVwicHJvdmlkZXItZHVyYXRpb24taW5mb1wiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRkdXJhdGlvbkluZm8gPSAkbmFtZUNvbHVtbi5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJGR1cmF0aW9uSW5mby5sZW5ndGggJiYgKHN0YXRlRHVyYXRpb24gfHwgbGFzdFN1Y2Nlc3NUaW1lIHx8IHN1Y2Nlc3NEdXJhdGlvbiB8fCBmYWlsdXJlRHVyYXRpb24pKSB7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb25UZXh0ID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdGF0ZUR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRyYW5zbGF0ZWQgc3RhdGUgdGV4dCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSB1c2UgZ2VuZXJpYyBsYWJlbFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlTGFiZWwgPSBzdGF0ZVRleHQgPyBnbG9iYWxUcmFuc2xhdGVbc3RhdGVUZXh0XSB8fCBzdGF0ZVRleHQgOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRHVyYXRpb247XG4gICAgICAgICAgICAgICAgZHVyYXRpb25UZXh0ICs9IGAke3N0YXRlTGFiZWx9OiAke3RoaXMuZm9ybWF0RHVyYXRpb24oc3RhdGVEdXJhdGlvbil9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGxhc3RTdWNjZXNzVGltZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVBZ28gPSB0aGlzLmZvcm1hdFRpbWVBZ28obGFzdFN1Y2Nlc3NUaW1lKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0U3VjY2Vzc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX0xhc3RTdWNjZXNzVGltZTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25UZXh0KSBkdXJhdGlvblRleHQgKz0gJyB8ICc7XG4gICAgICAgICAgICAgICAgZHVyYXRpb25UZXh0ICs9IGAke2xhc3RTdWNjZXNzTGFiZWx9OiAke3RpbWVBZ299YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJGR1cmF0aW9uSW5mby50ZXh0KGR1cmF0aW9uVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbG9hZGluZyBwbGFjZWhvbGRlcnMgZm9yIGFsbCBwcm92aWRlciByb3dzXG4gICAgICogVGhpcyBwcmV2ZW50cyB0YWJsZSBqdW1waW5nIHdoZW4gc3RhdHVzZXMgYXJlIGxvYWRpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTG9hZGluZ1BsYWNlaG9sZGVycygpIHtcbiAgICAgICAgJCgndHIucHJvdmlkZXItcm93LCB0cltpZF0nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCAkbmFtZUNvbHVtbiA9ICRyb3cuZmluZCgndGQnKS5lcSgyKTsgLy8gUHJvdmlkZXIgbmFtZSBjb2x1bW5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZHVyYXRpb24gaW5mbyBhbHJlYWR5IGV4aXN0c1xuICAgICAgICAgICAgbGV0ICRkdXJhdGlvbkluZm8gPSAkcm93LmZpbmQoJy5wcm92aWRlci1kdXJhdGlvbi1pbmZvJyk7XG4gICAgICAgICAgICBpZiAoJGR1cmF0aW9uSW5mby5sZW5ndGggPT09IDAgJiYgJG5hbWVDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2FkaW5nVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXM7XG4gICAgICAgICAgICAgICAgJG5hbWVDb2x1bW4uYXBwZW5kKGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItZHVyYXRpb24taW5mb1wiIHN0eWxlPVwiY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMC45ZW07XCI+JHtsb2FkaW5nVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgZHVyYXRpb24gaW4gc2Vjb25kcyB0byBodW1hbiByZWFkYWJsZSBmb3JtYXRcbiAgICAgKi9cbiAgICBmb3JtYXREdXJhdGlvbihzZWNvbmRzKSB7XG4gICAgICAgIGlmICghc2Vjb25kcyB8fCBzZWNvbmRzIDwgMCkge1xuICAgICAgICAgICAgLy8gUmV0dXJuIDAgc2Vjb25kcyB1c2luZyB0cmFuc2xhdGlvblxuICAgICAgICAgICAgY29uc3QgemVyb0Zvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X1NlY29uZHM7XG4gICAgICAgICAgICByZXR1cm4gemVyb0Zvcm1hdC5yZXBsYWNlKCclcycsICcwJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGRheXMgPSBNYXRoLmZsb29yKHNlY29uZHMgLyA4NjQwMCk7XG4gICAgICAgIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDg2NDAwKSAvIDM2MDApO1xuICAgICAgICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigoc2Vjb25kcyAlIDM2MDApIC8gNjApO1xuICAgICAgICBjb25zdCBzZWNzID0gTWF0aC5mbG9vcihzZWNvbmRzICUgNjApO1xuICAgICAgICBcbiAgICAgICAgbGV0IHJlc3VsdCA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHRyYW5zbGF0ZWQgZm9ybWF0IHN0cmluZ3NcbiAgICAgICAgaWYgKGRheXMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9EYXlzO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgZGF5cykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X0hvdXJzO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgaG91cnMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWludXRlcyA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X01pbnV0ZXM7XG4gICAgICAgICAgICByZXN1bHQucHVzaChmb3JtYXQucmVwbGFjZSgnJXMnLCBtaW51dGVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNlY3MgPiAwIHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X1NlY29uZHM7XG4gICAgICAgICAgICByZXN1bHQucHVzaChmb3JtYXQucmVwbGFjZSgnJXMnLCBzZWNzKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEpvaW4gd2l0aCBzcGFjZSwgc2hvdyBtYXggMiB1bml0cyBmb3IgcmVhZGFiaWxpdHlcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5zbGljZSgwLCAyKS5qb2luKCcgJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZXN0YW1wIHRvIFwidGltZSBhZ29cIiBmb3JtYXRcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lQWdvKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpIC8gMTAwMDtcbiAgICAgICAgY29uc3QgZGlmZiA9IG5vdyAtIHRpbWVzdGFtcDtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBmb3JtYXREdXJhdGlvbiB0byBnZXQgY29uc2lzdGVudCBmb3JtYXR0aW5nIHdpdGggdHJhbnNsYXRpb25zXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFRpbWUgPSB0aGlzLmZvcm1hdER1cmF0aW9uKGRpZmYpO1xuICAgICAgICBjb25zdCBhZ29MYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lQWdvO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHZlcnkgcmVjZW50IHRpbWVzLCB1c2Ugc3BlY2lhbCBsYWJlbFxuICAgICAgICBpZiAoZGlmZiA8IDYwKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLnByX0p1c3ROb3cgfHwgZm9ybWF0dGVkVGltZSArICcgJyArIGFnb0xhYmVsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkVGltZSArICcgJyArIGFnb0xhYmVsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTGVnYWN5IHN0YXR1cyB1cGRhdGUgbWV0aG9kIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3koY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHsgcHJvdmlkZXJfaWQsIG5ld19zdGF0ZSwgb2xkX3N0YXRlIH0gPSBjaGFuZ2U7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7cHJvdmlkZXJfaWR9YCk7XG4gICAgICAgIGlmICgkcm93Lmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCgnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaW1wbGUgc3RhdHVzIGluZGljYXRvcnNcbiAgICAgICAgY29uc3QgZ3JlZW4gPSAnPGRpdiBjbGFzcz1cInVpIGdyZWVuIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IGdyZXkgPSAnPGRpdiBjbGFzcz1cInVpIGdyZXkgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgY29uc3QgeWVsbG93ID0gJzxkaXYgY2xhc3M9XCJ1aSB5ZWxsb3cgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgY29uc3QgcmVkID0gJzxkaXYgY2xhc3M9XCJ1aSByZWQgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJhc2ljIHN0YXRlIG1hcHBpbmcgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFN0YXRlID0gKG5ld19zdGF0ZSB8fCAnJykudG9VcHBlckNhc2UoKTtcbiAgICAgICAgc3dpdGNoIChub3JtYWxpemVkU3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1JFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnT0snOlxuICAgICAgICAgICAgY2FzZSAnUkVBQ0hBQkxFJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZWVuKTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoeWVsbG93KTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdPRkYnOlxuICAgICAgICAgICAgY2FzZSAnVU5NT05JVE9SRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoZ3JleSk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnUkVKRUNURUQnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ0ZBSUxFRCc6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmV5KTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dChuZXdfc3RhdGUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZXkpO1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnLmZhaWx1cmUnKS50ZXh0KG5ld19zdGF0ZSB8fCAnVW5rbm93bicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYW5pbWF0aW9uIGZvciBjaGFuZ2VcbiAgICAgICAgaWYgKG9sZF9zdGF0ZSAhPT0gbmV3X3N0YXRlKSB7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWxsIHByb3ZpZGVyIHN0YXR1c2VzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICogU3VwcG9ydHMgYm90aCBsZWdhY3kgZm9ybWF0IGFuZCBuZXcgZW5oYW5jZWQgZm9ybWF0IHdpdGggZHVyYXRpb25zXG4gICAgICovXG4gICAgdXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhzdGF0dXNlcykge1xuICAgICAgICBpZiAoIXN0YXR1c2VzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJhdGNoIERPTSB1cGRhdGVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgY29uc3QgdXBkYXRlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGJ1aWxkIHVwZGF0ZSBvYmplY3QgZnJvbSBwcm92aWRlciBkYXRhXG4gICAgICAgIGNvbnN0IGJ1aWxkVXBkYXRlT2JqZWN0ID0gKHByb3ZpZGVySWQsIHByb3ZpZGVyLCB0eXBlKSA9PiAoe1xuICAgICAgICAgICAgcHJvdmlkZXJfaWQ6IHByb3ZpZGVySWQsXG4gICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgc3RhdGU6IHByb3ZpZGVyLnN0YXRlLFxuICAgICAgICAgICAgbmV3X3N0YXRlOiBwcm92aWRlci5zdGF0ZSwgLy8gRm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgIG9sZF9zdGF0ZTogcHJvdmlkZXIuc3RhdGUsIC8vIE5vIGFuaW1hdGlvbiBmb3IgYnVsayB1cGRhdGVcbiAgICAgICAgICAgIHN0YXRlQ29sb3I6IHByb3ZpZGVyLnN0YXRlQ29sb3IsXG4gICAgICAgICAgICBzdGF0ZUljb246IHByb3ZpZGVyLnN0YXRlSWNvbixcbiAgICAgICAgICAgIHN0YXRlVGV4dDogcHJvdmlkZXIuc3RhdGVUZXh0LFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbjogcHJvdmlkZXIuc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHN0YXRlRHVyYXRpb246IHByb3ZpZGVyLnN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWU6IHByb3ZpZGVyLmxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzOiBwcm92aWRlci50aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbjogcHJvdmlkZXIuc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uOiBwcm92aWRlci5mYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICBydHQ6IHByb3ZpZGVyLnJ0dFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBzdHJ1Y3R1cmVkIGZvcm1hdCB3aXRoIHNpcC9pYXggc2VwYXJhdGlvblxuICAgICAgICBbJ3NpcCcsICdpYXgnXS5mb3JFYWNoKHByb3ZpZGVyVHlwZSA9PiB7XG4gICAgICAgICAgICBpZiAoc3RhdHVzZXNbcHJvdmlkZXJUeXBlXSAmJiB0eXBlb2Ygc3RhdHVzZXNbcHJvdmlkZXJUeXBlXSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhzdGF0dXNlc1twcm92aWRlclR5cGVdKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IHN0YXR1c2VzW3Byb3ZpZGVyVHlwZV1bcHJvdmlkZXJJZF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlcy5wdXNoKGJ1aWxkVXBkYXRlT2JqZWN0KHByb3ZpZGVySWQsIHByb3ZpZGVyLCBwcm92aWRlclR5cGUpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIG5vIHN0cnVjdHVyZWQgZm9ybWF0IGZvdW5kLCB0cnkgc2ltcGxlIG9iamVjdCBmb3JtYXQgKGxlZ2FjeSlcbiAgICAgICAgaWYgKCFzdGF0dXNlcy5zaXAgJiYgIXN0YXR1c2VzLmlheCAmJiB0eXBlb2Ygc3RhdHVzZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhzdGF0dXNlcykuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IHN0YXR1c2VzW3Byb3ZpZGVySWRdO1xuICAgICAgICAgICAgICAgIGlmIChwcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICB1cGRhdGVzLnB1c2goYnVpbGRVcGRhdGVPYmplY3QocHJvdmlkZXJJZCwgcHJvdmlkZXIsICd1bmtub3duJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGFsbCB1cGRhdGVzIGVmZmljaWVudGx5XG4gICAgICAgIHRoaXMucHJvY2Vzc0JhdGNoVXBkYXRlcyh1cGRhdGVzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgbXVsdGlwbGUgc3RhdHVzIHVwZGF0ZXMgZWZmaWNpZW50bHkgaW4gYmF0Y2hlc1xuICAgICAqL1xuICAgIHByb2Nlc3NCYXRjaFVwZGF0ZXModXBkYXRlcykge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkodXBkYXRlcykgfHwgdXBkYXRlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3BsaXQgdXBkYXRlcyBpbnRvIGJhdGNoZXMgZm9yIHBlcmZvcm1hbmNlXG4gICAgICAgIGNvbnN0IGJhdGNoU2l6ZSA9IDEwO1xuICAgICAgICBjb25zdCBiYXRjaGVzID0gW107XG4gICAgICAgIFxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVwZGF0ZXMubGVuZ3RoOyBpICs9IGJhdGNoU2l6ZSkge1xuICAgICAgICAgICAgYmF0Y2hlcy5wdXNoKHVwZGF0ZXMuc2xpY2UoaSwgaSArIGJhdGNoU2l6ZSkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggYmF0Y2ggd2l0aCBhIHNtYWxsIGRlbGF5IHRvIHByZXZlbnQgYmxvY2tpbmcgVUlcbiAgICAgICAgbGV0IGJhdGNoSW5kZXggPSAwO1xuICAgICAgICBjb25zdCBwcm9jZXNzQmF0Y2ggPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoYmF0Y2hJbmRleCA+PSBiYXRjaGVzLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBiYXRjaCA9IGJhdGNoZXNbYmF0Y2hJbmRleF07XG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGJhdGNoLmZvckVhY2godXBkYXRlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm92aWRlclN0YXR1cyh1cGRhdGUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGJhdGNoSW5kZXgrKztcbiAgICAgICAgICAgICAgICBpZiAoYmF0Y2hJbmRleCA8IGJhdGNoZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQocHJvY2Vzc0JhdGNoLCAxMCk7IC8vIFNtYWxsIGRlbGF5IGJldHdlZW4gYmF0Y2hlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgcHJvY2Vzc0JhdGNoKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGVuaGFuY2VkIHVwZGF0ZSBub3RpZmljYXRpb24gd2l0aCB0aW1pbmcgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBzaG93VXBkYXRlTm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycsIGR1cmF0aW9uID0gNTAwMCkge1xuICAgICAgICBpZiAoIXRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgfHwgIXRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRpbmRpY2F0b3IgPSB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yO1xuICAgICAgICBjb25zdCAkaGVhZGVyID0gJGluZGljYXRvci5maW5kKCcuaGVhZGVyJyk7XG4gICAgICAgIGNvbnN0ICRzdGF0dXNNZXNzYWdlID0gJGluZGljYXRvci5maW5kKCcuc3RhdHVzLW1lc3NhZ2UnKTtcbiAgICAgICAgY29uc3QgJHRpbWVJbmZvID0gJGluZGljYXRvci5maW5kKCcubGFzdC1jaGVjay10aW1lJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2xhc3NlcyBmb3Igc3R5bGluZ1xuICAgICAgICAkaW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBpbmZvIHN1Y2Nlc3MgZXJyb3Igd2FybmluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModHlwZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgYXBwcm9wcmlhdGUgaGVhZGVyIGJhc2VkIG9uIHR5cGVcbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdpbmZvJzogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0luZm8sXG4gICAgICAgICAgICAnc3VjY2Vzcyc6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVkLFxuICAgICAgICAgICAgJ2Vycm9yJzogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0Vycm9yLFxuICAgICAgICAgICAgJ3dhcm5pbmcnOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzV2FybmluZ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgJGhlYWRlci50ZXh0KGhlYWRlcnNbdHlwZV0gfHwgJ1N0YXR1cycpO1xuICAgICAgICAkc3RhdHVzTWVzc2FnZS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHRpbWluZyBpbmZvcm1hdGlvblxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAkdGltZUluZm8udGV4dChgTGFzdCBjaGVjazogJHtub3cudG9Mb2NhbGVUaW1lU3RyaW5nKCl9YCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSB1cGRhdGUgdGltZVxuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gRGF0ZS5ub3coKSAvIDEwMDA7XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgd2l0aCBlbmhhbmNlZCB0aW1pbmdcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMubm90aWZpY2F0aW9uVGltZW91dCk7XG4gICAgICAgIHRoaXMubm90aWZpY2F0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgJGluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIG1hbnVhbGx5IGRpc21pc3NcbiAgICAgICAgJGluZGljYXRvci5vZmYoJ2NsaWNrLmRpc21pc3MnKS5vbignY2xpY2suZGlzbWlzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICAgICAgJGluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGxhc3QgY2hlY2sgdGltZSBkaXNwbGF5XG4gICAgICovXG4gICAgdXBkYXRlTGFzdENoZWNrVGltZSh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApO1xuICAgICAgICBjb25zdCB0aW1lU3RyID0gZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhbnkgbGFzdCBjaGVjayB0aW1lIGRpc3BsYXlzXG4gICAgICAgICQoJy5wcm92aWRlci1sYXN0LWNoZWNrLXRpbWUnKS50ZXh0KHRpbWVTdHIpO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbW1lZGlhdGUgc3RhdHVzIHVwZGF0ZSB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXG4gICAgICovXG4gICAgcmVxdWVzdFN0YXR1c1VwZGF0ZSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIGluZGljYXRvclxuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfUmVxdWVzdGluZ1N0YXR1c1VwZGF0ZSxcbiAgICAgICAgICAgICdpbmZvJyxcbiAgICAgICAgICAgIDMwMDBcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyB2aWEgUkVTVCBBUEkgdXNpbmcgUHJvdmlkZXJzQVBJXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXNlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm9jZXNzIHRoZSBzdGF0dXMgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBub3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBwcm92aWRlckNvdW50ID0gdGhpcy5jb3VudFByb3ZpZGVycyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlXG4gICAgICAgICAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlLnJlcGxhY2UoJyVzJywgcHJvdmlkZXJDb3VudClcbiAgICAgICAgICAgICAgICAgICAgOiBgU3RhdHVzIHVwZGF0ZWQgZm9yICR7cHJvdmlkZXJDb3VudH0gcHJvdmlkZXJzYDtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICA/IChBcnJheS5pc0FycmF5KHJlc3BvbnNlLm1lc3NhZ2VzKSA/IHJlc3BvbnNlLm1lc3NhZ2VzLmpvaW4oJywgJykgOiByZXNwb25zZS5tZXNzYWdlcylcbiAgICAgICAgICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlRmFpbGVkO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTWVzc2FnZSwgJ2Vycm9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ291bnQgdG90YWwgcHJvdmlkZXJzIGluIHN0YXR1cyBkYXRhXG4gICAgICovXG4gICAgY291bnRQcm92aWRlcnMoc3RhdHVzRGF0YSkge1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEpIHJldHVybiAwO1xuICAgICAgICBcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuc2lwKSBjb3VudCArPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhLnNpcCkubGVuZ3RoO1xuICAgICAgICBpZiAoc3RhdHVzRGF0YS5pYXgpIGNvdW50ICs9IE9iamVjdC5rZXlzKHN0YXR1c0RhdGEuaWF4KS5sZW5ndGg7XG4gICAgICAgIGlmICghc3RhdHVzRGF0YS5zaXAgJiYgIXN0YXR1c0RhdGEuaWF4KSBjb3VudCA9IE9iamVjdC5rZXlzKHN0YXR1c0RhdGEpLmxlbmd0aDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjYWNoZWQgcm93IGVsZW1lbnQgZm9yIHByb3ZpZGVyXG4gICAgICovXG4gICAgZ2V0Q2FjaGVkUm93KHByb3ZpZGVySWQpIHtcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KHByb3ZpZGVySWQpO1xuICAgICAgICBpZiAoISRyb3cgfHwgISRyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkcm93ID0gJChgIyR7cHJvdmlkZXJJZH1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQocHJvdmlkZXJJZCwgJHJvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRyb3c7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHByb3ZpZGVyIGRldGFpbHMgbW9kYWwvcG9wdXBcbiAgICAgKi9cbiAgICBzaG93UHJvdmlkZXJEZXRhaWxzKHByb3ZpZGVySWQpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Mb2FkaW5nUHJvdmlkZXJEZXRhaWxzLFxuICAgICAgICAgICAgJ2luZm8nLFxuICAgICAgICAgICAgMjAwMFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEZldGNoIGZyZXNoIGRldGFpbHMgZnJvbSBBUEkgdXNpbmcgUHJvdmlkZXJzQVBJXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRTdGF0dXMocHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGRldGFpbGVkIHN0YXR1cyBtb2RhbCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kYWxDb250ZW50ID0gdGhpcy5idWlsZFN0YXR1c0RldGFpbHNNb2RhbChwcm92aWRlcklkLCByZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgbW9kYWxcbiAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgbW9kYWwgdXNpbmcgRm9tYW50aWMgVUlcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKG1vZGFsQ29udGVudCk7XG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJylcbiAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb25IaWRkZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICA/IChBcnJheS5pc0FycmF5KHJlc3BvbnNlLm1lc3NhZ2VzKSA/IHJlc3BvbnNlLm1lc3NhZ2VzLmpvaW4oJywgJykgOiByZXNwb25zZS5tZXNzYWdlcylcbiAgICAgICAgICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUucHJfTm9TdGF0dXNJbmZvO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTWVzc2FnZSwgJ3dhcm5pbmcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkZXRhaWxlZCBzdGF0dXMgbW9kYWwgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsKHByb3ZpZGVySWQsIHN0YXR1c0luZm8pIHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgdW5pcWlkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBob3N0LFxuICAgICAgICAgICAgdXNlcm5hbWUsXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUNvbG9yLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgcnR0LFxuICAgICAgICAgICAgc3RhdGlzdGljcyxcbiAgICAgICAgICAgIHJlY2VudEV2ZW50cyxcbiAgICAgICAgICAgIGxhc3RVcGRhdGVGb3JtYXR0ZWQsXG4gICAgICAgICAgICBzdGF0ZVN0YXJ0VGltZUZvcm1hdHRlZFxuICAgICAgICB9ID0gc3RhdHVzSW5mbztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHN0YXRpc3RpY3Mgc2VjdGlvblxuICAgICAgICBsZXQgc3RhdHNIdG1sID0gJyc7XG4gICAgICAgIGlmIChzdGF0aXN0aWNzKSB7XG4gICAgICAgICAgICBjb25zdCB7IHRvdGFsQ2hlY2tzLCBzdWNjZXNzQ291bnQsIGZhaWx1cmVDb3VudCwgYXZhaWxhYmlsaXR5LCBhdmVyYWdlUnR0LCBtaW5SdHQsIG1heFJ0dCB9ID0gc3RhdGlzdGljcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRvdGFsQ2hlY2tzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8aDQ+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3RhdGlzdGljc308L2g0PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZm91ciBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke3RvdGFsQ2hlY2tzfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Ub3RhbENoZWNrc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IGdyZWVuIHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke3N1Y2Nlc3NDb3VudH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3VjY2Vzc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IHJlZCBzdGF0aXN0aWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCI+JHtmYWlsdXJlQ291bnR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0ZhaWx1cmVzfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgJHthdmFpbGFiaWxpdHkgPj0gOTkgPyAnZ3JlZW4nIDogYXZhaWxhYmlsaXR5ID49IDk1ID8gJ3llbGxvdycgOiAncmVkJ30gc3RhdGlzdGljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiPiR7YXZhaWxhYmlsaXR5fSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfQXZhaWxhYmlsaXR5fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAke2F2ZXJhZ2VSdHQgIT09IG51bGwgPyBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aHJlZSBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfQXZlcmFnZVJUVH06PC9zdHJvbmc+ICR7YXZlcmFnZVJ0dH0gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfTWluUlRUfTo8L3N0cm9uZz4gJHttaW5SdHR9IG1zXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX01heFJUVH06PC9zdHJvbmc+ICR7bWF4UnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmAgOiAnJ31cbiAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCByZWNlbnQgZXZlbnRzIHNlY3Rpb25cbiAgICAgICAgbGV0IGV2ZW50c0h0bWwgPSAnJztcbiAgICAgICAgaWYgKHJlY2VudEV2ZW50cyAmJiByZWNlbnRFdmVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZXZlbnRSb3dzID0gcmVjZW50RXZlbnRzLnNsaWNlKDAsIDUpLm1hcChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRUeXBlID0gZXZlbnQudHlwZSA9PT0gJ2Vycm9yJyA/ICdyZWQnIDogZXZlbnQudHlwZSA9PT0gJ3dhcm5pbmcnID8gJ3llbGxvdycgOiAnZ3JlZW4nO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VGV4dCA9IGdsb2JhbFRyYW5zbGF0ZVtldmVudC5ldmVudF0gfHwgZXZlbnQuZXZlbnQgfHwgZXZlbnQuc3RhdGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwiJHtldmVudFR5cGV9IGNpcmNsZSBpY29uXCI+PC9pPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtldmVudC5kYXRlfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtldmVudFRleHR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke2V2ZW50LnN0YXRlfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH0pLmpvaW4oJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBldmVudHNIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8aDQ+JHtnbG9iYWxUcmFuc2xhdGUucHJfUmVjZW50RXZlbnRzfTwvaDQ+XG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyBjb21wYWN0IHRhYmxlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0Ym9keT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZXZlbnRSb3dzfVxuICAgICAgICAgICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBpZD1cInByb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsXCIgY2xhc3M9XCJ1aSBsYXJnZSBtb2RhbFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke3N0YXRlQ29sb3J9IGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2Rlc2NyaXB0aW9uIHx8IHVuaXFpZH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudHNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGg0PiR7Z2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySW5mb308L2g0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxpc3RcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySWR9Ojwvc3Ryb25nPiAke3VuaXFpZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0hvc3R9Ojwvc3Ryb25nPiAke2hvc3R9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Vc2VybmFtZX06PC9zdHJvbmc+ICR7dXNlcm5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50U3RhdGV9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ1aSAke3N0YXRlQ29sb3J9IHRleHRcIj4ke2dsb2JhbFRyYW5zbGF0ZVtzdGF0ZURlc2NyaXB0aW9uXSB8fCBzdGF0ZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0ZUR1cmF0aW9ufTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7dGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3J0dCAhPT0gbnVsbCAmJiBydHQgIT09IHVuZGVmaW5lZCA/IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0N1cnJlbnRSVFR9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtydHQgPiAyMDAgPyAncmVkJyA6IHJ0dCA+IDEwMCA/ICdvcmFuZ2UnIDogJ2dyZWVuJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7bGFzdFN1Y2Nlc3NUaW1lID8gYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHR3byBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0xhc3RTdWNjZXNzfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RoaXMuZm9ybWF0VGltZUFnbyhsYXN0U3VjY2Vzc1RpbWUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0VXBkYXRlfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2xhc3RVcGRhdGVGb3JtYXR0ZWQgfHwgbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7c3RhdHNIdG1sfVxuICAgICAgICAgICAgICAgICAgICAgICAgJHtldmVudHNIdG1sfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYWN0aW9uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgYnV0dG9uXCIgb25jbGljaz1cIndpbmRvdy5sb2NhdGlvbi5ocmVmPScke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeS8ke3VuaXFpZH0nXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImVkaXQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0VkaXRQcm92aWRlcn1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBwcmltYXJ5IGJ1dHRvblwiIG9uY2xpY2s9XCJQcm92aWRlclN0YXR1c01vbml0b3IucmVxdWVzdFByb3ZpZGVyQ2hlY2soJyR7dW5pcWlkfScpXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNrTm93fVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNhbmNlbCBidXR0b25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0Nsb3NlfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbW1lZGlhdGUgY2hlY2sgZm9yIHNwZWNpZmljIHByb3ZpZGVyXG4gICAgICovXG4gICAgcmVxdWVzdFByb3ZpZGVyQ2hlY2socHJvdmlkZXJJZCkge1xuICAgICAgICAvLyBVc2UgUHJvdmlkZXJzQVBJLmZvcmNlQ2hlY2sgZm9yIGZvcmNpbmcgYSBzdGF0dXMgY2hlY2tcbiAgICAgICAgUHJvdmlkZXJzQVBJLmZvcmNlQ2hlY2socHJvdmlkZXJJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0NoZWNrUmVxdWVzdGVkLFxuICAgICAgICAgICAgICAgICAgICAnc3VjY2VzcycsXG4gICAgICAgICAgICAgICAgICAgIDIwMDBcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG1vZGFsIHdpdGggZnJlc2ggZGF0YSBpZiBzdGlsbCBvcGVuXG4gICAgICAgICAgICAgICAgaWYgKCQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLmxlbmd0aCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdXBkYXRlZCBtb2RhbCB3aXRoIGZyZXNoIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbENvbnRlbnQgPSB0aGlzLmJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsKHByb3ZpZGVySWQsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKG1vZGFsQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkhpZGRlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzXG4gICAgICAgICAgICAgICAgICAgID8gKEFycmF5LmlzQXJyYXkocmVzcG9uc2UubWVzc2FnZXMpID8gcmVzcG9uc2UubWVzc2FnZXMuam9pbignLCAnKSA6IHJlc3BvbnNlLm1lc3NhZ2VzKVxuICAgICAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja0ZhaWxlZDtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihlcnJvck1lc3NhZ2UsICdlcnJvcicsIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBFbmhhbmNlZCBpbml0aWFsaXphdGlvbiB3aXRoIHVzZXIgaW50ZXJhY3Rpb24gc3VwcG9ydFxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIC8vIEFkZCBtYW51YWwgcmVmcmVzaCBidXR0b24gaWYgbm90IGV4aXN0c1xuICAgIGlmICgkKCcucHJvdmlkZXItcmVmcmVzaC1idG4nKS5sZW5ndGggPT09IDAgJiYgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IHJlZnJlc2hCdXR0b24gPSBgXG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgbWluaSBsYWJlbGVkIGljb24gYnV0dG9uIHByb3ZpZGVyLXJlZnJlc2gtYnRuXCIgXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPVwicG9zaXRpb246IGFic29sdXRlOyB0b3A6IDEwcHg7IHJpZ2h0OiAxMHB4OyB6LWluZGV4OiAxMDA7XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHJfUmVmcmVzaFN0YXR1c31cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICBgO1xuICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5jc3MoJ3Bvc2l0aW9uJywgJ3JlbGF0aXZlJykuYXBwZW5kKHJlZnJlc2hCdXR0b24pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgZm9yIHJlZnJlc2ggYnV0dG9uXG4gICAgICAgICQoJy5wcm92aWRlci1yZWZyZXNoLWJ0bicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQcm92aWRlclN0YXR1c01vbml0b3IucmVxdWVzdFN0YXR1c1VwZGF0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQWRkIGRvdWJsZS1jbGljayBoYW5kbGVycyBmb3Igc3RhdHVzIGNlbGxzIHRvIHNob3cgZGV0YWlscyBtb2RhbFxuICAgICQoZG9jdW1lbnQpLm9uKCdkYmxjbGljaycsICcucHJvdmlkZXItc3RhdHVzIC51aS5sYWJlbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICBpZiAocHJvdmlkZXJJZCAmJiB0eXBlb2YgUHJvdmlkZXJTdGF0dXNNb25pdG9yICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnNob3dQcm92aWRlckRldGFpbHMocHJvdmlkZXJJZCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBcbiAgICAvLyBDbGVhbiB1cCBtb2RhbHMgd2hlbiB0aGV5J3JlIGhpZGRlblxuICAgICQoZG9jdW1lbnQpLm9uKCdoaWRkZW4uYnMubW9kYWwnLCAnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgfSk7XG59KTtcblxuLy8gRG9uJ3QgYXV0by1pbml0aWFsaXplIHRoZSBtb25pdG9yIGhlcmUgLSBsZXQgcHJvdmlkZXJzLWluZGV4LmpzIGhhbmRsZSBpdFxuLy8gVGhpcyBhbGxvd3MgZm9yIHByb3BlciBzZXF1ZW5jaW5nIHdpdGggRGF0YVRhYmxlIGluaXRpYWxpemF0aW9uXG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5Qcm92aWRlclN0YXR1c01vbml0b3IgPSBQcm92aWRlclN0YXR1c01vbml0b3I7Il19