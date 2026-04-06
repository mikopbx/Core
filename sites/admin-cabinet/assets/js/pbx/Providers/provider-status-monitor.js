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
        username = statusInfo.username; // State text is already translated by API, use it directly

    var stateTitle = stateText || stateDescription || state || '';
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
        // State text is already translated by API, use it directly or fallback to generic label
        var stateLabel = stateText || globalTranslate.pr_StatusDuration;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwiY2hhbm5lbElkIiwiaXNJbml0aWFsaXplZCIsImxhc3RVcGRhdGVUaW1lIiwic3RhdHVzQ2FjaGUiLCIkc3RhdHVzQ2VsbHMiLCIkbGFzdFVwZGF0ZUluZGljYXRvciIsImNhY2hlZFJvd3MiLCJNYXAiLCJjYWNoZWRTdGF0dXNDZWxscyIsImluaXRpYWxpemUiLCJjYWNoZUVsZW1lbnRzIiwiaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwiY2hhbmdlcyIsIkFycmF5IiwiaXNBcnJheSIsInRpbWVzdGFtcCIsIkRhdGUiLCJub3ciLCJmb3JFYWNoIiwiY2hhbmdlIiwidXBkYXRlUHJvdmlkZXJTdGF0dXMiLCJjaGFuZ2VDb3VudCIsInByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZCIsInByX011bHRpcGxlUHJvdmlkZXJTdGF0dXNlc0NoYW5nZWQiLCJyZXBsYWNlIiwic2hvd1VwZGF0ZU5vdGlmaWNhdGlvbiIsInN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsInVwZGF0ZUxhc3RDaGVja1RpbWUiLCJlcnJvck1zZyIsImVycm9yIiwicHJfU3RhdHVzQ2hlY2tGYWlsZWQiLCJwcm92aWRlcl9pZCIsInR5cGUiLCJzdGF0ZSIsIm5ld19zdGF0ZSIsIm9sZF9zdGF0ZSIsInN0YXRlQ29sb3IiLCJzdGF0ZUljb24iLCJzdGF0ZVRleHQiLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdGVEdXJhdGlvbiIsImxhc3RTdWNjZXNzVGltZSIsInRpbWVTaW5jZUxhc3RTdWNjZXNzIiwic3VjY2Vzc0R1cmF0aW9uIiwiZmFpbHVyZUR1cmF0aW9uIiwiZ2V0IiwiY3VycmVudFN0YXRlIiwicHJldmlvdXNTdGF0ZSIsInRvb2x0aXBDb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInJ0dCIsImhvc3QiLCJ1c2VybmFtZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwicG9wdXAiLCJob3ZlcmFibGUiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCIkZmFpbHVyZUNlbGwiLCJ1cGRhdGVEdXJhdGlvbkRpc3BsYXkiLCJ0cmFuc2l0aW9uIiwidXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3kiLCJzdGF0dXNJbmZvIiwic3RhdGVUaXRsZSIsInRvb2x0aXAiLCJoYXNTdGF0dXNJbmZvIiwic3RhdHVzU2VjdGlvbiIsInVuZGVmaW5lZCIsImZvcm1hdHRlZER1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJkdXJhdGlvbkxhYmVsIiwicHJfU3RhdHVzRHVyYXRpb24iLCJydHRMYWJlbCIsInByX1JUVCIsInJ0dENsYXNzIiwiZm9ybWF0dGVkVGltZSIsImxhc3RTdWNjZXNzTGFiZWwiLCJwcl9MYXN0U3VjY2Vzc1RpbWUiLCJzdWNjZXNzTGFiZWwiLCJwcl9TdWNjZXNzRHVyYXRpb24iLCJmYWlsdXJlTGFiZWwiLCJwcl9GYWlsdXJlRHVyYXRpb24iLCJkdXJhdGlvbnMiLCIkZHVyYXRpb25JbmZvIiwiJG5hbWVDb2x1bW4iLCJlcSIsImFwcGVuZCIsImR1cmF0aW9uVGV4dCIsInN0YXRlTGFiZWwiLCJ0aW1lQWdvIiwiZm9ybWF0VGltZUFnbyIsImxvYWRpbmdUZXh0Iiwic2Vjb25kcyIsInplcm9Gb3JtYXQiLCJwcl9UaW1lRm9ybWF0X1NlY29uZHMiLCJkYXlzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJtaW51dGVzIiwic2VjcyIsInJlc3VsdCIsImZvcm1hdCIsInByX1RpbWVGb3JtYXRfRGF5cyIsInB1c2giLCJwcl9UaW1lRm9ybWF0X0hvdXJzIiwicHJfVGltZUZvcm1hdF9NaW51dGVzIiwic2xpY2UiLCJqb2luIiwiZGlmZiIsImFnb0xhYmVsIiwicHJfVGltZUFnbyIsInByX0p1c3ROb3ciLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJyZWQiLCJub3JtYWxpemVkU3RhdGUiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZXMiLCJidWlsZFVwZGF0ZU9iamVjdCIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyVHlwZSIsIk9iamVjdCIsImtleXMiLCJzaXAiLCJpYXgiLCJwcm9jZXNzQmF0Y2hVcGRhdGVzIiwiYmF0Y2hTaXplIiwiYmF0Y2hlcyIsImkiLCJiYXRjaEluZGV4IiwicHJvY2Vzc0JhdGNoIiwiYmF0Y2giLCJ1cGRhdGUiLCJkdXJhdGlvbiIsIiRpbmRpY2F0b3IiLCIkaGVhZGVyIiwiJHN0YXR1c01lc3NhZ2UiLCIkdGltZUluZm8iLCJoZWFkZXJzIiwicHJfU3RhdHVzSW5mbyIsInByX1N0YXR1c1VwZGF0ZWQiLCJwcl9TdGF0dXNFcnJvciIsInByX1N0YXR1c1dhcm5pbmciLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJjbGVhclRpbWVvdXQiLCJub3RpZmljYXRpb25UaW1lb3V0Iiwib2ZmIiwib24iLCJkYXRlIiwidGltZVN0ciIsInByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUiLCJQcm92aWRlcnNBUEkiLCJnZXRTdGF0dXNlcyIsInJlc3BvbnNlIiwic3VjY2VzcyIsInByb3ZpZGVyQ291bnQiLCJjb3VudFByb3ZpZGVycyIsInByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJwcl9TdGF0dXNVcGRhdGVGYWlsZWQiLCJzdGF0dXNEYXRhIiwiY291bnQiLCJnZXRDYWNoZWRSb3ciLCJzaG93UHJvdmlkZXJEZXRhaWxzIiwicHJfTG9hZGluZ1Byb3ZpZGVyRGV0YWlscyIsImdldFN0YXR1cyIsIm1vZGFsQ29udGVudCIsImJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsIiwicmVtb3ZlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uSGlkZGVuIiwicHJfTm9TdGF0dXNJbmZvIiwidW5pcWlkIiwiZGVzY3JpcHRpb24iLCJzdGF0aXN0aWNzIiwicmVjZW50RXZlbnRzIiwibGFzdFVwZGF0ZUZvcm1hdHRlZCIsInN0YXRlU3RhcnRUaW1lRm9ybWF0dGVkIiwic3RhdHNIdG1sIiwidG90YWxDaGVja3MiLCJzdWNjZXNzQ291bnQiLCJmYWlsdXJlQ291bnQiLCJhdmFpbGFiaWxpdHkiLCJhdmVyYWdlUnR0IiwibWluUnR0IiwibWF4UnR0IiwicHJfU3RhdGlzdGljcyIsInByX1RvdGFsQ2hlY2tzIiwicHJfU3VjY2VzcyIsInByX0ZhaWx1cmVzIiwicHJfQXZhaWxhYmlsaXR5IiwicHJfQXZlcmFnZVJUVCIsInByX01pblJUVCIsInByX01heFJUVCIsImV2ZW50c0h0bWwiLCJldmVudFJvd3MiLCJtYXAiLCJldmVudFR5cGUiLCJldmVudFRleHQiLCJwcl9SZWNlbnRFdmVudHMiLCJwcl9Qcm92aWRlckluZm8iLCJwcl9Qcm92aWRlcklkIiwicHJfSG9zdCIsInByX1VzZXJuYW1lIiwicHJfQ3VycmVudFN0YXRlIiwicHJfU3RhdGVEdXJhdGlvbiIsInByX0N1cnJlbnRSVFQiLCJwcl9MYXN0U3VjY2VzcyIsInByX0xhc3RVcGRhdGUiLCJ0b0xvY2FsZVN0cmluZyIsImdsb2JhbFJvb3RVcmwiLCJwcl9FZGl0UHJvdmlkZXIiLCJwcl9DaGVja05vdyIsInByX0Nsb3NlIiwicmVxdWVzdFByb3ZpZGVyQ2hlY2siLCJmb3JjZUNoZWNrIiwicHJfQ2hlY2tSZXF1ZXN0ZWQiLCJwcl9DaGVja0ZhaWxlZCIsImRvY3VtZW50IiwicmVhZHkiLCJyZWZyZXNoQnV0dG9uIiwicHJfUmVmcmVzaFN0YXR1cyIsImNzcyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsImNsb3Nlc3QiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCQyxFQUFBQSxTQUFTLEVBQUUsaUJBRGU7QUFFMUJDLEVBQUFBLGFBQWEsRUFBRSxLQUZXO0FBRzFCQyxFQUFBQSxjQUFjLEVBQUUsQ0FIVTtBQUkxQkMsRUFBQUEsV0FBVyxFQUFFLEVBSmE7O0FBTTFCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFUWTtBQVUxQkMsRUFBQUEsb0JBQW9CLEVBQUUsSUFWSTs7QUFZMUI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQUFJQyxHQUFKLEVBZmM7QUFnQjFCQyxFQUFBQSxpQkFBaUIsRUFBRSxJQUFJRCxHQUFKLEVBaEJPOztBQWtCMUI7QUFDSjtBQUNBO0FBQ0lFLEVBQUFBLFVBckIwQix3QkFxQmI7QUFDVCxRQUFJLEtBQUtSLGFBQVQsRUFBd0I7QUFDcEI7QUFDSCxLQUhRLENBS1Q7OztB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QUksT0FBT3BLLHFCQUFQLEtBQWlDLFdBQW5ELEVBQWdFO0FBQzVEQSxNQUFBQSxxQkFBcUIsQ0FBQ2tOLG1CQUF0QixDQUEwQzlDLFVBQTFDO0FBQ0g7QUFDSixHQVJELEVBdEJvQixDQWdDcEI7O0FBQ0FwSixFQUFBQSxDQUFDLENBQUMwUCxRQUFELENBQUQsQ0FBWXpFLEVBQVosQ0FBZSxpQkFBZixFQUFrQyxnQ0FBbEMsRUFBb0UsWUFBVztBQUMzRWpMLElBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXVNLE1BQVI7QUFDSCxHQUZEO0FBR0gsQ0FwQ0QsRSxDQXNDQTtBQUNBO0FBRUE7O0FBQ0E0RCxNQUFNLENBQUNuUixxQkFBUCxHQUErQkEscUJBQS9CIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXZlbnRCdXMsIFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIFByb3ZpZGVyIFN0YXR1cyBNb25pdG9yXG4gKiBIYW5kbGVzIHJlYWwtdGltZSBwcm92aWRlciBzdGF0dXMgdXBkYXRlcyB2aWEgRXZlbnRCdXMgd2l0aCBlbmhhbmNlZCBmZWF0dXJlczpcbiAqIC0gUmVhbC10aW1lIHN0YXR1cyB1cGRhdGVzIHdpdGggRXZlbnRCdXMgaW50ZWdyYXRpb25cbiAqIC0gQmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgKG5vIGhhcmRjb2RlZCBzdGF0ZSBtYXBwaW5nKVxuICogLSBEdXJhdGlvbiBkaXNwbGF5cyAoc3RhdGUgZHVyYXRpb24sIHN1Y2Nlc3MvZmFpbHVyZSBkdXJhdGlvbilcbiAqIC0gTGFzdCBzdWNjZXNzIGluZm9ybWF0aW9uXG4gKiAtIEVuaGFuY2VkIHZpc3VhbCBmZWVkYmFjayB3aXRoIEZvbWFudGljIFVJIGNvbXBvbmVudHNcbiAqL1xuY29uc3QgUHJvdmlkZXJTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ3Byb3ZpZGVyLXN0YXR1cycsXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG4gICAgbGFzdFVwZGF0ZVRpbWU6IDAsXG4gICAgc3RhdHVzQ2FjaGU6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0NlbGxzOiBudWxsLFxuICAgICRsYXN0VXBkYXRlSW5kaWNhdG9yOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERPTSBjYWNoZSBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gICAgICovXG4gICAgY2FjaGVkUm93czogbmV3IE1hcCgpLFxuICAgIGNhY2hlZFN0YXR1c0NlbGxzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgc3RhdHVzIG1vbml0b3Igd2l0aCBlbmhhbmNlZCBmZWF0dXJlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbG9hZGluZyBwbGFjZWhvbGRlcnMgZm9yIGFsbCBwcm92aWRlciByb3dzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBlbmhhbmNlZCBzdGF0dXMgaW5kaWNhdG9yXG4gICAgICAgIHRoaXMuY3JlYXRlU3RhdHVzSW5kaWNhdG9yKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgY2hhbm5lbCBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgICAgdGhpcy5zdWJzY3JpYmVUb0V2ZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHVwIHBlcmlvZGljIGhlYWx0aCBjaGVja3NcbiAgICAgICAgdGhpcy5zZXR1cEhlYWx0aENoZWNrcygpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhY2hlIERPTSBlbGVtZW50cyBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gICAgICovXG4gICAgY2FjaGVFbGVtZW50cygpIHtcbiAgICAgICAgdGhpcy4kc3RhdHVzQ2VsbHMgPSAkKCcucHJvdmlkZXItc3RhdHVzLCAucHJvdmlkZXItc3RhdHVzLWNlbGwnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIHByb3ZpZGVyIHJvd3MgZm9yIHF1aWNrIGFjY2Vzc1xuICAgICAgICAkKCd0ci5wcm92aWRlci1yb3csIHRyW2lkXScpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJHJvdy5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRSb3dzLnNldChpZCwgJHJvdyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KGlkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBlbmhhbmNlZCBzdGF0dXMgaW5kaWNhdG9yIHdpdGggZHVyYXRpb24gaW5mb1xuICAgICAqL1xuICAgIGNyZWF0ZVN0YXR1c0luZGljYXRvcigpIHtcbiAgICAgICAgaWYgKCQoJyNwcm92aWRlci1zdGF0dXMtaW5kaWNhdG9yJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBpbmRpY2F0b3IgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBpZD1cInByb3ZpZGVyLXN0YXR1cy1pbmRpY2F0b3JcIiBjbGFzcz1cInVpIG1pbmkgbWVzc2FnZSBoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGFsdGVybmF0ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzdGF0dXMtbWVzc2FnZVwiPjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImxhc3QtY2hlY2stdGltZVwiIHN0eWxlPVwiZm9udC1zaXplOiAwLjg1ZW07IGNvbG9yOiAjODg4O1wiPjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5wcmVwZW5kKGluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciA9ICQoJyNwcm92aWRlci1zdGF0dXMtaW5kaWNhdG9yJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICovXG4gICAgc3Vic2NyaWJlVG9FdmVudHMoKSB7XG4gICAgICAgIGlmICh0eXBlb2YgRXZlbnRCdXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoJ3Byb3ZpZGVyLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFdmVudEJ1cyBub3QgYXZhaWxhYmxlLCBwcm92aWRlciBzdGF0dXMgbW9uaXRvciB3aWxsIHdvcmsgd2l0aG91dCByZWFsLXRpbWUgdXBkYXRlc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrcyBhbmQgY2FjaGUgbWFpbnRlbmFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEhlYWx0aENoZWNrcygpIHtcbiAgICAgICAgLy8gUmVmcmVzaCBjYWNoZSBldmVyeSAzMCBzZWNvbmRzIHRvIGhhbmRsZSBkeW5hbWljIGNvbnRlbnRcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoQ2FjaGUoKTtcbiAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdXBkYXRlIGV2ZXJ5IDUgbWludXRlcyBhcyBmYWxsYmFja1xuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgfSwgMzAwMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggY2FjaGVkIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIHJlZnJlc2hDYWNoZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZWRSb3dzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuY2xlYXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWluaXRpYWxpemUgbG9hZGluZyBwbGFjZWhvbGRlcnMgZm9yIG5ldyByb3dzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBFdmVudEJ1cyBtZXNzYWdlXG4gICAgICovXG4gICAgaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV2ZW50QnVzIG1lc3NhZ2UgY2FuIGhhdmUgZXZlbnQgYXQgdG9wIGxldmVsIG9yIGluIGRhdGFcbiAgICAgICAgbGV0IGV2ZW50LCBkYXRhO1xuICAgICAgICBpZiAobWVzc2FnZS5ldmVudCkge1xuICAgICAgICAgICAgLy8gRXZlbnQgYXQgdG9wIGxldmVsXG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZXZlbnQ7XG4gICAgICAgICAgICBkYXRhID0gbWVzc2FnZS5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKG1lc3NhZ2UuZGF0YSAmJiBtZXNzYWdlLmRhdGEuZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIEV2ZW50IGluIGRhdGFcbiAgICAgICAgICAgIGV2ZW50ID0gbWVzc2FnZS5kYXRhLmV2ZW50O1xuICAgICAgICAgICAgZGF0YSA9IG1lc3NhZ2UuZGF0YS5kYXRhIHx8IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChldmVudCkge1xuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2NoZWNrJzpcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dDaGVja2luZ0luZGljYXRvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c191cGRhdGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfZXJyb3InOlxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIFVua25vd24gZXZlbnQgdHlwZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGNoZWNraW5nIGluZGljYXRvclxuICAgICAqL1xuICAgIHNob3dDaGVja2luZ0luZGljYXRvcihkYXRhKSB7XG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3JcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuIGVycm9yIHN1Y2Nlc3MnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdpbmZvJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5maW5kKCcuY29udGVudCcpXG4gICAgICAgICAgICAudGV4dChkYXRhLm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLnByX0NoZWNraW5nUHJvdmlkZXJTdGF0dXNlcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCAzMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3Mgc3RhdHVzIHVwZGF0ZSB3aXRoIGNoYW5nZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLmNoYW5nZXMgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jaGFuZ2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcCB8fCBEYXRlLm5vdygpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5sYXN0VXBkYXRlVGltZSA9IHRpbWVzdGFtcDtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBjaGFuZ2VcbiAgICAgICAgZGF0YS5jaGFuZ2VzLmZvckVhY2goY2hhbmdlID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvdmlkZXJTdGF0dXMoY2hhbmdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgICAgY29uc3QgY2hhbmdlQ291bnQgPSBkYXRhLmNoYW5nZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gY2hhbmdlQ291bnQgPT09IDEgXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5wcl9PbmVQcm92aWRlclN0YXR1c0NoYW5nZWRcbiAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLnByX011bHRpcGxlUHJvdmlkZXJTdGF0dXNlc0NoYW5nZWQucmVwbGFjZSgnJXMnLCBjaGFuZ2VDb3VudCk7XG4gICAgICAgICAgICBcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKG1lc3NhZ2UsICdzdWNjZXNzJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbXBsZXRlIHN0YXR1cyBkYXRhXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLnN0YXR1c2VzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjYWNoZVxuICAgICAgICB0aGlzLnN0YXR1c0NhY2hlID0gZGF0YS5zdGF0dXNlcztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgcHJvdmlkZXIgc3RhdHVzZXMgb24gdGhlIHBhZ2VcbiAgICAgICAgdGhpcy51cGRhdGVBbGxQcm92aWRlclN0YXR1c2VzKGRhdGEuc3RhdHVzZXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGxhc3QgY2hlY2sgdGltZVxuICAgICAgICBpZiAoZGF0YS50aW1lc3RhbXApIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTGFzdENoZWNrVGltZShkYXRhLnRpbWVzdGFtcCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdGF0dXMgZXJyb3JcbiAgICAgKi9cbiAgICBoYW5kbGVTdGF0dXNFcnJvcihkYXRhKSB7XG4gICAgICAgIGNvbnN0IGVycm9yTXNnID0gZGF0YS5lcnJvciB8fCBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzQ2hlY2tGYWlsZWQ7XG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihlcnJvck1zZywgJ2Vycm9yJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc2luZ2xlIHByb3ZpZGVyIHN0YXR1cyB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllc1xuICAgICAqIE5vIGhhcmRjb2RlZCBzdGF0ZSBtYXBwaW5nIC0gYmFja2VuZCBwcm92aWRlcyBhbGwgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgdXBkYXRlUHJvdmlkZXJTdGF0dXMoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHsgXG4gICAgICAgICAgICBwcm92aWRlcl9pZCwgXG4gICAgICAgICAgICB0eXBlLCBcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgbmV3X3N0YXRlLCBcbiAgICAgICAgICAgIG9sZF9zdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlQ29sb3IsIFxuICAgICAgICAgICAgc3RhdGVJY29uLCBcbiAgICAgICAgICAgIHN0YXRlVGV4dCwgXG4gICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uXG4gICAgICAgIH0gPSBjaGFuZ2U7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY2FjaGVkIGVsZW1lbnRzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KHByb3ZpZGVyX2lkKTtcbiAgICAgICAgaWYgKCEkcm93KSB7XG4gICAgICAgICAgICAkcm93ID0gJChgIyR7cHJvdmlkZXJfaWR9YCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRSb3dzLnNldChwcm92aWRlcl9pZCwgJHJvdyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gUm93IG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgJHN0YXR1c0NlbGwgPSB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmdldChwcm92aWRlcl9pZCk7XG4gICAgICAgIGlmICghJHN0YXR1c0NlbGwpIHtcbiAgICAgICAgICAgICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KHByb3ZpZGVyX2lkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gU3RhdHVzIGNlbGwgbm90IGZvdW5kXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjdXJyZW50IHN0YXRlIG9yIGZhbGxiYWNrIHRvIG5ld19zdGF0ZSBmb3IgY29tcGF0aWJpbGl0eVxuICAgICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBzdGF0ZSB8fCBuZXdfc3RhdGU7XG4gICAgICAgIGNvbnN0IHByZXZpb3VzU3RhdGUgPSAkc3RhdHVzQ2VsbC5kYXRhKCdwcmV2LXN0YXRlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgZGlyZWN0bHlcbiAgICAgICAgaWYgKHN0YXRlQ29sb3IpIHtcbiAgICAgICAgICAgIC8vIEVuaGFuY2VkIHN0YXR1cyBpbmRpY2F0b3Igd2l0aCB0b29sdGlwIHN1cHBvcnRcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBzdGF0ZTogY3VycmVudFN0YXRlLFxuICAgICAgICAgICAgICAgIHN0YXRlVGV4dCxcbiAgICAgICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgICAgICBmYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgcnR0OiBjaGFuZ2UucnR0LFxuICAgICAgICAgICAgICAgIGhvc3Q6IGNoYW5nZS5ob3N0LFxuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBjaGFuZ2UudXNlcm5hbWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXRlQ29sb3J9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgXG4gICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCJcbiAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7dG9vbHRpcENvbnRlbnR9XCJcbiAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgY2VudGVyXCJcbiAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFyaWF0aW9uPVwic21hbGxcIj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEJhdGNoIERPTSB1cGRhdGVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChzdGF0dXNIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIChGb21hbnRpYyBVSSB0b29sdGlwKVxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmZpbmQoJy51aS5sYWJlbCcpLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnc21hbGwnLFxuICAgICAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgZmFpbHVyZSB0ZXh0IHdoZW4gdXNpbmcgbW9kZXJuIHN0YXR1cyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgY29uc3QgJGZhaWx1cmVDZWxsID0gJHJvdy5maW5kKCcuZmFpbHVyZSwgLmZlYXR1cmVzLmZhaWx1cmUnKTtcbiAgICAgICAgICAgICAgICBpZiAoJGZhaWx1cmVDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBEb24ndCBzaG93IHRleHQgc3RhdHVzIHdoZW4gd2UgaGF2ZSB2aXN1YWwgaW5kaWNhdG9yc1xuICAgICAgICAgICAgICAgICAgICAkZmFpbHVyZUNlbGwudGV4dCgnJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBkdXJhdGlvbiBpbmZvcm1hdGlvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUR1cmF0aW9uRGlzcGxheSgkcm93LCB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBmYWlsdXJlRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlVGV4dFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFuaW1hdGUgaWYgc3RhdGUgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c1N0YXRlICYmIHByZXZpb3VzU3RhdGUgIT09IGN1cnJlbnRTdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjdXJyZW50IHN0YXRlIGZvciBmdXR1cmUgY29tcGFyaXNvblxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnLCBjdXJyZW50U3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSAtIHVzZSBzaW1wbGUgc3RhdGUtYmFzZWQgZGlzcGxheVxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm92aWRlclN0YXR1c0xlZ2FjeShjaGFuZ2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCB0b29sdGlwIGNvbnRlbnQgd2l0aCBlbmhhbmNlZCBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQoc3RhdHVzSW5mbykge1xuICAgICAgICBjb25zdCB7IFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBzdGF0ZVRleHQsXG4gICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uLCBcbiAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sIFxuICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sIFxuICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgcnR0LFxuICAgICAgICAgICAgaG9zdCxcbiAgICAgICAgICAgIHVzZXJuYW1lXG4gICAgICAgIH0gPSBzdGF0dXNJbmZvO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RhdGUgdGV4dCBpcyBhbHJlYWR5IHRyYW5zbGF0ZWQgYnkgQVBJLCB1c2UgaXQgZGlyZWN0bHlcbiAgICAgICAgY29uc3Qgc3RhdGVUaXRsZSA9IHN0YXRlVGV4dCB8fCBzdGF0ZURlc2NyaXB0aW9uIHx8IHN0YXRlIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IHRvb2x0aXAgPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwXCI+YDtcbiAgICAgICAgdG9vbHRpcCArPSBgPHN0cm9uZyBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX190aXRsZVwiPiR7c3RhdGVUaXRsZX08L3N0cm9uZz5gO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG9yaWdpbmFsIHN0YXRlIHZhbHVlIGlmIGF2YWlsYWJsZSBhbmQgZGlmZmVyZW50IGZyb20gdGl0bGVcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlICE9PSBzdGF0ZVRpdGxlKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXRlLW9yaWdpbmFsXCI+WyR7c3RhdGV9XTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBob3N0IGFuZCB1c2VybmFtZSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGhvc3QgfHwgdXNlcm5hbWUpIHtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc2VjdGlvblwiPmA7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9faW5mby1pdGVtXCI+SG9zdDogPHN0cm9uZz4ke2hvc3R9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1c2VybmFtZSkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9faW5mby1pdGVtXCI+VXNlcjogPHN0cm9uZz4ke3VzZXJuYW1lfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RhdHVzIGluZm9ybWF0aW9uIHNlY3Rpb25cbiAgICAgICAgbGV0IGhhc1N0YXR1c0luZm8gPSBmYWxzZTtcbiAgICAgICAgbGV0IHN0YXR1c1NlY3Rpb24gPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zZWN0aW9uXCI+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBhbmQgYWRkIGR1cmF0aW9uIGluZm9ybWF0aW9uIChub3cgY29tZXMgYXMgc2Vjb25kcyBmcm9tIGJhY2tlbmQpXG4gICAgICAgIGlmIChzdGF0ZUR1cmF0aW9uICE9PSB1bmRlZmluZWQgJiYgc3RhdGVEdXJhdGlvbiAhPT0gbnVsbCAmJiBzdGF0ZUR1cmF0aW9uID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRHVyYXRpb247XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtXCI+JHtkdXJhdGlvbkxhYmVsfTogPHN0cm9uZz4ke2Zvcm1hdHRlZER1cmF0aW9ufTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIFJUVCAoUm91bmQgVHJpcCBUaW1lKSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHJ0dCAhPT0gdW5kZWZpbmVkICYmIHJ0dCAhPT0gbnVsbCAmJiBydHQgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfUlRUO1xuICAgICAgICAgICAgLy8gRm9ybWF0IFJUVCB3aXRoIGNvbG9yIGNvZGluZ1xuICAgICAgICAgICAgbGV0IHJ0dENsYXNzID0gJ3Byb3ZpZGVyLXN0YXR1cy10b29sdGlwX19ydHQtLWdvb2QnO1xuICAgICAgICAgICAgaWYgKHJ0dCA+IDEwMCkgcnR0Q2xhc3MgPSAncHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3J0dC0td2FybmluZyc7XG4gICAgICAgICAgICBpZiAocnR0ID4gMjAwKSBydHRDbGFzcyA9ICdwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fcnR0LS1iYWQnO1xuICAgICAgICAgICAgc3RhdHVzU2VjdGlvbiArPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdGF0dXMtaXRlbVwiPiR7cnR0TGFiZWx9OiA8c3Ryb25nIGNsYXNzPVwiJHtydHRDbGFzc31cIj4ke3J0dH0g0LzRgTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9ybWF0IHRpbWUgc2luY2UgbGFzdCBzdWNjZXNzIGlmIHByb3ZpZGVkIChub3cgY29tZXMgYXMgc2Vjb25kcylcbiAgICAgICAgaWYgKHRpbWVTaW5jZUxhc3RTdWNjZXNzICE9PSB1bmRlZmluZWQgJiYgdGltZVNpbmNlTGFzdFN1Y2Nlc3MgIT09IG51bGwgJiYgdGltZVNpbmNlTGFzdFN1Y2Nlc3MgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkVGltZSA9IHRoaXMuZm9ybWF0RHVyYXRpb24odGltZVNpbmNlTGFzdFN1Y2Nlc3MpO1xuICAgICAgICAgICAgY29uc3QgbGFzdFN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0U3VjY2Vzc1RpbWU7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19sYXN0LXN1Y2Nlc3NcIj4ke2xhc3RTdWNjZXNzTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkVGltZX0g0L3QsNC30LDQtDwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN1Y2Nlc3MvZmFpbHVyZSBkdXJhdGlvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN1Y2Nlc3NEdXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHN1Y2Nlc3NEdXJhdGlvbiAhPT0gbnVsbCAmJiBzdWNjZXNzRHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMuZm9ybWF0RHVyYXRpb24oc3VjY2Vzc0R1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdWNjZXNzRHVyYXRpb247XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zdWNjZXNzLWR1cmF0aW9uXCI+JHtzdWNjZXNzTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkRHVyYXRpb259PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGhhc1N0YXR1c0luZm8gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZmFpbHVyZUR1cmF0aW9uICE9PSB1bmRlZmluZWQgJiYgZmFpbHVyZUR1cmF0aW9uICE9PSBudWxsICYmIGZhaWx1cmVEdXJhdGlvbiA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbihmYWlsdXJlRHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgZmFpbHVyZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLnByX0ZhaWx1cmVEdXJhdGlvbjtcbiAgICAgICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3RhdHVzLWl0ZW0gcHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2ZhaWx1cmUtZHVyYXRpb25cIj4ke2ZhaWx1cmVMYWJlbH06IDxzdHJvbmc+JHtmb3JtYXR0ZWREdXJhdGlvbn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzU3RhdHVzSW5mbykge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBzdGF0dXNTZWN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZGlmZmVyZW50IGZyb20gc3RhdGUgdGV4dFxuICAgICAgICBpZiAoc3RhdGVEZXNjcmlwdGlvbiAmJiBnbG9iYWxUcmFuc2xhdGVbc3RhdGVEZXNjcmlwdGlvbl0gJiYgZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dICE9PSBzdGF0ZVRpdGxlKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2Rlc2NyaXB0aW9uXCI+YDtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dO1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0b29sdGlwLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBkdXJhdGlvbiBkaXNwbGF5IGluIHByb3ZpZGVyIHJvd1xuICAgICAqL1xuICAgIHVwZGF0ZUR1cmF0aW9uRGlzcGxheSgkcm93LCBkdXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZUR1cmF0aW9uLCBsYXN0U3VjY2Vzc1RpbWUsIHN1Y2Nlc3NEdXJhdGlvbiwgZmFpbHVyZUR1cmF0aW9uLCBzdGF0ZVRleHQgfSA9IGR1cmF0aW9ucztcbiAgICAgICAgXG4gICAgICAgIC8vIExvb2sgZm9yIGR1cmF0aW9uIGRpc3BsYXkgZWxlbWVudHMgb3IgY3JlYXRlIHRoZW1cbiAgICAgICAgbGV0ICRkdXJhdGlvbkluZm8gPSAkcm93LmZpbmQoJy5wcm92aWRlci1kdXJhdGlvbi1pbmZvJyk7XG4gICAgICAgIGlmICgkZHVyYXRpb25JbmZvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gQWRkIGR1cmF0aW9uIGluZm8gY29udGFpbmVyIHRvIHRoZSBwcm92aWRlciBuYW1lIGNvbHVtblxuICAgICAgICAgICAgY29uc3QgJG5hbWVDb2x1bW4gPSAkcm93LmZpbmQoJ3RkJykuZXEoMik7IC8vIFVzdWFsbHkgdGhlIHRoaXJkIGNvbHVtbiBjb250YWlucyBwcm92aWRlciBuYW1lXG4gICAgICAgICAgICBpZiAoJG5hbWVDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJG5hbWVDb2x1bW4uYXBwZW5kKCc8ZGl2IGNsYXNzPVwicHJvdmlkZXItZHVyYXRpb24taW5mb1wiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRkdXJhdGlvbkluZm8gPSAkbmFtZUNvbHVtbi5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJGR1cmF0aW9uSW5mby5sZW5ndGggJiYgKHN0YXRlRHVyYXRpb24gfHwgbGFzdFN1Y2Nlc3NUaW1lIHx8IHN1Y2Nlc3NEdXJhdGlvbiB8fCBmYWlsdXJlRHVyYXRpb24pKSB7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb25UZXh0ID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdGF0ZUR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RhdGUgdGV4dCBpcyBhbHJlYWR5IHRyYW5zbGF0ZWQgYnkgQVBJLCB1c2UgaXQgZGlyZWN0bHkgb3IgZmFsbGJhY2sgdG8gZ2VuZXJpYyBsYWJlbFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlTGFiZWwgPSBzdGF0ZVRleHQgfHwgZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0R1cmF0aW9uO1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uVGV4dCArPSBgJHtzdGF0ZUxhYmVsfTogJHt0aGlzLmZvcm1hdER1cmF0aW9uKHN0YXRlRHVyYXRpb24pfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChsYXN0U3VjY2Vzc1RpbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lQWdvID0gdGhpcy5mb3JtYXRUaW1lQWdvKGxhc3RTdWNjZXNzVGltZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdFN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0U3VjY2Vzc1RpbWU7XG4gICAgICAgICAgICAgICAgaWYgKGR1cmF0aW9uVGV4dCkgZHVyYXRpb25UZXh0ICs9ICcgfCAnO1xuICAgICAgICAgICAgICAgIGR1cmF0aW9uVGV4dCArPSBgJHtsYXN0U3VjY2Vzc0xhYmVsfTogJHt0aW1lQWdvfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRkdXJhdGlvbkluZm8udGV4dChkdXJhdGlvblRleHQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGxvYWRpbmcgcGxhY2Vob2xkZXJzIGZvciBhbGwgcHJvdmlkZXIgcm93c1xuICAgICAqIFRoaXMgcHJldmVudHMgdGFibGUganVtcGluZyB3aGVuIHN0YXR1c2VzIGFyZSBsb2FkaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMoKSB7XG4gICAgICAgICQoJ3RyLnByb3ZpZGVyLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgJG5hbWVDb2x1bW4gPSAkcm93LmZpbmQoJ3RkJykuZXEoMik7IC8vIFByb3ZpZGVyIG5hbWUgY29sdW1uXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGR1cmF0aW9uIGluZm8gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgICAgIGxldCAkZHVyYXRpb25JbmZvID0gJHJvdy5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICAgICAgaWYgKCRkdXJhdGlvbkluZm8ubGVuZ3RoID09PSAwICYmICRuYW1lQ29sdW1uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgbG9hZGluZ1RleHQgPSBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tpbmdQcm92aWRlclN0YXR1c2VzO1xuICAgICAgICAgICAgICAgICRuYW1lQ29sdW1uLmFwcGVuZChgPGRpdiBjbGFzcz1cInByb3ZpZGVyLWR1cmF0aW9uLWluZm9cIiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDAuOWVtO1wiPiR7bG9hZGluZ1RleHR9PC9kaXY+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGR1cmF0aW9uIGluIHNlY29uZHMgdG8gaHVtYW4gcmVhZGFibGUgZm9ybWF0XG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBpZiAoIXNlY29uZHMgfHwgc2Vjb25kcyA8IDApIHtcbiAgICAgICAgICAgIC8vIFJldHVybiAwIHNlY29uZHMgdXNpbmcgdHJhbnNsYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHplcm9Gb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9TZWNvbmRzO1xuICAgICAgICAgICAgcmV0dXJuIHplcm9Gb3JtYXQucmVwbGFjZSgnJXMnLCAnMCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkYXlzID0gTWF0aC5mbG9vcihzZWNvbmRzIC8gODY0MDApO1xuICAgICAgICBjb25zdCBob3VycyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSA4NjQwMCkgLyAzNjAwKTtcbiAgICAgICAgY29uc3QgbWludXRlcyA9IE1hdGguZmxvb3IoKHNlY29uZHMgJSAzNjAwKSAvIDYwKTtcbiAgICAgICAgY29uc3Qgc2VjcyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAlIDYwKTtcbiAgICAgICAgXG4gICAgICAgIGxldCByZXN1bHQgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB0cmFuc2xhdGVkIGZvcm1hdCBzdHJpbmdzXG4gICAgICAgIGlmIChkYXlzID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1RpbWVGb3JtYXRfRGF5cztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIGRheXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaG91cnMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9Ib3VycztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIGhvdXJzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9NaW51dGVzO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgbWludXRlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzZWNzID4gMCB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9TZWNvbmRzO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgc2VjcykpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBKb2luIHdpdGggc3BhY2UsIHNob3cgbWF4IDIgdW5pdHMgZm9yIHJlYWRhYmlsaXR5XG4gICAgICAgIHJldHVybiByZXN1bHQuc2xpY2UoMCwgMikuam9pbignICcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IHRpbWVzdGFtcCB0byBcInRpbWUgYWdvXCIgZm9ybWF0XG4gICAgICovXG4gICAgZm9ybWF0VGltZUFnbyh0aW1lc3RhbXApIHtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKSAvIDEwMDA7XG4gICAgICAgIGNvbnN0IGRpZmYgPSBub3cgLSB0aW1lc3RhbXA7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgZm9ybWF0RHVyYXRpb24gdG8gZ2V0IGNvbnNpc3RlbnQgZm9ybWF0dGluZyB3aXRoIHRyYW5zbGF0aW9uc1xuICAgICAgICBjb25zdCBmb3JtYXR0ZWRUaW1lID0gdGhpcy5mb3JtYXREdXJhdGlvbihkaWZmKTtcbiAgICAgICAgY29uc3QgYWdvTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUFnbztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvciB2ZXJ5IHJlY2VudCB0aW1lcywgdXNlIHNwZWNpYWwgbGFiZWxcbiAgICAgICAgaWYgKGRpZmYgPCA2MCkge1xuICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5wcl9KdXN0Tm93IHx8IGZvcm1hdHRlZFRpbWUgKyAnICcgKyBhZ29MYWJlbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZvcm1hdHRlZFRpbWUgKyAnICcgKyBhZ29MYWJlbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExlZ2FjeSBzdGF0dXMgdXBkYXRlIG1ldGhvZCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZVByb3ZpZGVyU3RhdHVzTGVnYWN5KGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IHByb3ZpZGVyX2lkLCBuZXdfc3RhdGUsIG9sZF9zdGF0ZSB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHJvdyA9ICQoYCMke3Byb3ZpZGVyX2lkfWApO1xuICAgICAgICBpZiAoJHJvdy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBjb250ZW50XG4gICAgICAgICRzdGF0dXNDZWxsLmh0bWwoJycpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2ltcGxlIHN0YXR1cyBpbmRpY2F0b3JzXG4gICAgICAgIGNvbnN0IGdyZWVuID0gJzxkaXYgY2xhc3M9XCJ1aSBncmVlbiBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuICAgICAgICBjb25zdCBncmV5ID0gJzxkaXYgY2xhc3M9XCJ1aSBncmV5IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IHllbGxvdyA9ICc8ZGl2IGNsYXNzPVwidWkgeWVsbG93IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IHJlZCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVkIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICAvLyBCYXNpYyBzdGF0ZSBtYXBwaW5nIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRTdGF0ZSA9IChuZXdfc3RhdGUgfHwgJycpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIHN3aXRjaCAobm9ybWFsaXplZFN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlICdSRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ09LJzpcbiAgICAgICAgICAgIGNhc2UgJ1JFQUNIQUJMRSc6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmVlbik7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnTEFHR0VEJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHllbGxvdyk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnT0ZGJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOTU9OSVRPUkVEJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZXkpO1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnLmZhaWx1cmUnKS50ZXh0KCcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ1JFSkVDVEVEJzpcbiAgICAgICAgICAgIGNhc2UgJ1VOUkVHSVNURVJFRCc6XG4gICAgICAgICAgICBjYXNlICdGQUlMRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoZ3JleSk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQobmV3X3N0YXRlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmV5KTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dChuZXdfc3RhdGUgfHwgJ1Vua25vd24nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFuaW1hdGlvbiBmb3IgY2hhbmdlXG4gICAgICAgIGlmIChvbGRfc3RhdGUgIT09IG5ld19zdGF0ZSkge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBwcm92aWRlciBzdGF0dXNlcyB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllc1xuICAgICAqIFN1cHBvcnRzIGJvdGggbGVnYWN5IGZvcm1hdCBhbmQgbmV3IGVuaGFuY2VkIGZvcm1hdCB3aXRoIGR1cmF0aW9uc1xuICAgICAqL1xuICAgIHVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMoc3RhdHVzZXMpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCYXRjaCBET00gdXBkYXRlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGNvbnN0IHVwZGF0ZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhlbHBlciBmdW5jdGlvbiB0byBidWlsZCB1cGRhdGUgb2JqZWN0IGZyb20gcHJvdmlkZXIgZGF0YVxuICAgICAgICBjb25zdCBidWlsZFVwZGF0ZU9iamVjdCA9IChwcm92aWRlcklkLCBwcm92aWRlciwgdHlwZSkgPT4gKHtcbiAgICAgICAgICAgIHByb3ZpZGVyX2lkOiBwcm92aWRlcklkLFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIHN0YXRlOiBwcm92aWRlci5zdGF0ZSxcbiAgICAgICAgICAgIG5ld19zdGF0ZTogcHJvdmlkZXIuc3RhdGUsIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICBvbGRfc3RhdGU6IHByb3ZpZGVyLnN0YXRlLCAvLyBObyBhbmltYXRpb24gZm9yIGJ1bGsgdXBkYXRlXG4gICAgICAgICAgICBzdGF0ZUNvbG9yOiBwcm92aWRlci5zdGF0ZUNvbG9yLFxuICAgICAgICAgICAgc3RhdGVJY29uOiBwcm92aWRlci5zdGF0ZUljb24sXG4gICAgICAgICAgICBzdGF0ZVRleHQ6IHByb3ZpZGVyLnN0YXRlVGV4dCxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb246IHByb3ZpZGVyLnN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uOiBwcm92aWRlci5zdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgbGFzdFN1Y2Nlc3NUaW1lOiBwcm92aWRlci5sYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzczogcHJvdmlkZXIudGltZVNpbmNlTGFzdFN1Y2Nlc3MsXG4gICAgICAgICAgICBzdWNjZXNzRHVyYXRpb246IHByb3ZpZGVyLnN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbjogcHJvdmlkZXIuZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgcnR0OiBwcm92aWRlci5ydHRcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgc3RydWN0dXJlZCBmb3JtYXQgd2l0aCBzaXAvaWF4IHNlcGFyYXRpb25cbiAgICAgICAgWydzaXAnLCAnaWF4J10uZm9yRWFjaChwcm92aWRlclR5cGUgPT4ge1xuICAgICAgICAgICAgaWYgKHN0YXR1c2VzW3Byb3ZpZGVyVHlwZV0gJiYgdHlwZW9mIHN0YXR1c2VzW3Byb3ZpZGVyVHlwZV0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXNbcHJvdmlkZXJUeXBlXSkuZm9yRWFjaChwcm92aWRlcklkID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBzdGF0dXNlc1twcm92aWRlclR5cGVdW3Byb3ZpZGVySWRdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaChidWlsZFVwZGF0ZU9iamVjdChwcm92aWRlcklkLCBwcm92aWRlciwgcHJvdmlkZXJUeXBlKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBubyBzdHJ1Y3R1cmVkIGZvcm1hdCBmb3VuZCwgdHJ5IHNpbXBsZSBvYmplY3QgZm9ybWF0IChsZWdhY3kpXG4gICAgICAgIGlmICghc3RhdHVzZXMuc2lwICYmICFzdGF0dXNlcy5pYXggJiYgdHlwZW9mIHN0YXR1c2VzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXMpLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXIgPSBzdGF0dXNlc1twcm92aWRlcklkXTtcbiAgICAgICAgICAgICAgICBpZiAocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlcy5wdXNoKGJ1aWxkVXBkYXRlT2JqZWN0KHByb3ZpZGVySWQsIHByb3ZpZGVyLCAndW5rbm93bicpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBhbGwgdXBkYXRlcyBlZmZpY2llbnRseVxuICAgICAgICB0aGlzLnByb2Nlc3NCYXRjaFVwZGF0ZXModXBkYXRlcyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIG11bHRpcGxlIHN0YXR1cyB1cGRhdGVzIGVmZmljaWVudGx5IGluIGJhdGNoZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzQmF0Y2hVcGRhdGVzKHVwZGF0ZXMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHVwZGF0ZXMpIHx8IHVwZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNwbGl0IHVwZGF0ZXMgaW50byBiYXRjaGVzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICBjb25zdCBiYXRjaFNpemUgPSAxMDtcbiAgICAgICAgY29uc3QgYmF0Y2hlcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1cGRhdGVzLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcbiAgICAgICAgICAgIGJhdGNoZXMucHVzaCh1cGRhdGVzLnNsaWNlKGksIGkgKyBiYXRjaFNpemUpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGJhdGNoIHdpdGggYSBzbWFsbCBkZWxheSB0byBwcmV2ZW50IGJsb2NraW5nIFVJXG4gICAgICAgIGxldCBiYXRjaEluZGV4ID0gMDtcbiAgICAgICAgY29uc3QgcHJvY2Vzc0JhdGNoID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGJhdGNoSW5kZXggPj0gYmF0Y2hlcy5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBiYXRjaGVzW2JhdGNoSW5kZXhdO1xuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICBiYXRjaC5mb3JFYWNoKHVwZGF0ZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvdmlkZXJTdGF0dXModXBkYXRlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBiYXRjaEluZGV4Kys7XG4gICAgICAgICAgICAgICAgaWYgKGJhdGNoSW5kZXggPCBiYXRjaGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHByb2Nlc3NCYXRjaCwgMTApOyAvLyBTbWFsbCBkZWxheSBiZXR3ZWVuIGJhdGNoZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIHByb2Nlc3NCYXRjaCgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBlbmhhbmNlZCB1cGRhdGUgbm90aWZpY2F0aW9uIHdpdGggdGltaW5nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlID0gJ2luZm8nLCBkdXJhdGlvbiA9IDUwMDApIHtcbiAgICAgICAgaWYgKCF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yIHx8ICF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaW5kaWNhdG9yID0gdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvcjtcbiAgICAgICAgY29uc3QgJGhlYWRlciA9ICRpbmRpY2F0b3IuZmluZCgnLmhlYWRlcicpO1xuICAgICAgICBjb25zdCAkc3RhdHVzTWVzc2FnZSA9ICRpbmRpY2F0b3IuZmluZCgnLnN0YXR1cy1tZXNzYWdlJyk7XG4gICAgICAgIGNvbnN0ICR0aW1lSW5mbyA9ICRpbmRpY2F0b3IuZmluZCgnLmxhc3QtY2hlY2stdGltZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsYXNzZXMgZm9yIHN0eWxpbmdcbiAgICAgICAgJGluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gaW5mbyBzdWNjZXNzIGVycm9yIHdhcm5pbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHR5cGUpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGFwcHJvcHJpYXRlIGhlYWRlciBiYXNlZCBvbiB0eXBlXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7XG4gICAgICAgICAgICAnaW5mbyc6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNJbmZvLFxuICAgICAgICAgICAgJ3N1Y2Nlc3MnOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlZCxcbiAgICAgICAgICAgICdlcnJvcic6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNFcnJvcixcbiAgICAgICAgICAgICd3YXJuaW5nJzogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1dhcm5pbmdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgICRoZWFkZXIudGV4dChoZWFkZXJzW3R5cGVdIHx8ICdTdGF0dXMnKTtcbiAgICAgICAgJHN0YXR1c01lc3NhZ2UudGV4dChtZXNzYWdlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSB0aW1pbmcgaW5mb3JtYXRpb25cbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgJHRpbWVJbmZvLnRleHQoYExhc3QgY2hlY2s6ICR7bm93LnRvTG9jYWxlVGltZVN0cmluZygpfWApO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgdXBkYXRlIHRpbWVcbiAgICAgICAgdGhpcy5sYXN0VXBkYXRlVGltZSA9IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlIHdpdGggZW5oYW5jZWQgdGltaW5nXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCBkdXJhdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBtYW51YWxseSBkaXNtaXNzXG4gICAgICAgICRpbmRpY2F0b3Iub2ZmKCdjbGljay5kaXNtaXNzJykub24oJ2NsaWNrLmRpc21pc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBsYXN0IGNoZWNrIHRpbWUgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZUxhc3RDaGVja1RpbWUodGltZXN0YW1wKSB7XG4gICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKTtcbiAgICAgICAgY29uc3QgdGltZVN0ciA9IGRhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYW55IGxhc3QgY2hlY2sgdGltZSBkaXNwbGF5c1xuICAgICAgICAkKCcucHJvdmlkZXItbGFzdC1jaGVjay10aW1lJykudGV4dCh0aW1lU3RyKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIHN0YXR1cyB1cGRhdGUgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZ1xuICAgICAqL1xuICAgIHJlcXVlc3RTdGF0dXNVcGRhdGUoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKFxuICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUsXG4gICAgICAgICAgICAnaW5mbycsXG4gICAgICAgICAgICAzMDAwXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdmlhIFJFU1QgQVBJIHVzaW5nIFByb3ZpZGVyc0FQSVxuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvY2VzcyB0aGUgc3RhdHVzIGRhdGFcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUFsbFByb3ZpZGVyU3RhdHVzZXMocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IHN1Y2Nlc3Mgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJDb3VudCA9IHRoaXMuY291bnRQcm92aWRlcnMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVDb21wbGV0ZVxuICAgICAgICAgICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVDb21wbGV0ZS5yZXBsYWNlKCclcycsIHByb3ZpZGVyQ291bnQpXG4gICAgICAgICAgICAgICAgICAgIDogYFN0YXR1cyB1cGRhdGVkIGZvciAke3Byb3ZpZGVyQ291bnR9IHByb3ZpZGVyc2A7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgPyAoQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlcykgPyByZXNwb25zZS5tZXNzYWdlcy5qb2luKCcsICcpIDogcmVzcG9uc2UubWVzc2FnZXMpXG4gICAgICAgICAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1VwZGF0ZUZhaWxlZDtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihlcnJvck1lc3NhZ2UsICdlcnJvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvdW50IHRvdGFsIHByb3ZpZGVycyBpbiBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIGNvdW50UHJvdmlkZXJzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSByZXR1cm4gMDtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGlmIChzdGF0dXNEYXRhLnNpcCkgY291bnQgKz0gT2JqZWN0LmtleXMoc3RhdHVzRGF0YS5zaXApLmxlbmd0aDtcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuaWF4KSBjb3VudCArPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhLmlheCkubGVuZ3RoO1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEuc2lwICYmICFzdGF0dXNEYXRhLmlheCkgY291bnQgPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhKS5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY2FjaGVkIHJvdyBlbGVtZW50IGZvciBwcm92aWRlclxuICAgICAqL1xuICAgIGdldENhY2hlZFJvdyhwcm92aWRlcklkKSB7XG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChwcm92aWRlcklkKTtcbiAgICAgICAgaWYgKCEkcm93IHx8ICEkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke3Byb3ZpZGVySWR9YCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KHByb3ZpZGVySWQsICRyb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcm93O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwcm92aWRlciBkZXRhaWxzIG1vZGFsL3BvcHVwXG4gICAgICovXG4gICAgc2hvd1Byb3ZpZGVyRGV0YWlscyhwcm92aWRlcklkKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTG9hZGluZ1Byb3ZpZGVyRGV0YWlscyxcbiAgICAgICAgICAgICdpbmZvJyxcbiAgICAgICAgICAgIDIwMDBcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBGZXRjaCBmcmVzaCBkZXRhaWxzIGZyb20gQVBJIHVzaW5nIFByb3ZpZGVyc0FQSVxuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0U3RhdHVzKHByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkZXRhaWxlZCBzdGF0dXMgbW9kYWwgY29udGVudFxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGFsQ29udGVudCA9IHRoaXMuYnVpbGRTdGF0dXNEZXRhaWxzTW9kYWwocHJvdmlkZXJJZCwgcmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIG1vZGFsXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJykucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IG1vZGFsIHVzaW5nIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZChtb2RhbENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpXG4gICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uSGlkZGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXNcbiAgICAgICAgICAgICAgICAgICAgPyAoQXJyYXkuaXNBcnJheShyZXNwb25zZS5tZXNzYWdlcykgPyByZXNwb25zZS5tZXNzYWdlcy5qb2luKCcsICcpIDogcmVzcG9uc2UubWVzc2FnZXMpXG4gICAgICAgICAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLnByX05vU3RhdHVzSW5mbztcblxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihlcnJvck1lc3NhZ2UsICd3YXJuaW5nJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgZGV0YWlsZWQgc3RhdHVzIG1vZGFsIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFN0YXR1c0RldGFpbHNNb2RhbChwcm92aWRlcklkLCBzdGF0dXNJbmZvKSB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICAgIHVuaXFpZCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgaG9zdCxcbiAgICAgICAgICAgIHVzZXJuYW1lLFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgc3RhdGVDb2xvcixcbiAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgIHJ0dCxcbiAgICAgICAgICAgIHN0YXRpc3RpY3MsXG4gICAgICAgICAgICByZWNlbnRFdmVudHMsXG4gICAgICAgICAgICBsYXN0VXBkYXRlRm9ybWF0dGVkLFxuICAgICAgICAgICAgc3RhdGVTdGFydFRpbWVGb3JtYXR0ZWRcbiAgICAgICAgfSA9IHN0YXR1c0luZm87XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBzdGF0aXN0aWNzIHNlY3Rpb25cbiAgICAgICAgbGV0IHN0YXRzSHRtbCA9ICcnO1xuICAgICAgICBpZiAoc3RhdGlzdGljcykge1xuICAgICAgICAgICAgY29uc3QgeyB0b3RhbENoZWNrcywgc3VjY2Vzc0NvdW50LCBmYWlsdXJlQ291bnQsIGF2YWlsYWJpbGl0eSwgYXZlcmFnZVJ0dCwgbWluUnR0LCBtYXhSdHQgfSA9IHN0YXRpc3RpY3M7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0b3RhbENoZWNrcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGg0PiR7Z2xvYmFsVHJhbnNsYXRlLnByX1N0YXRpc3RpY3N9PC9oND5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvdXIgY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBzdGF0aXN0aWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCI+JHt0b3RhbENoZWNrc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfVG90YWxDaGVja3N9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBncmVlbiBzdGF0aXN0aWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCI+JHtzdWNjZXNzQ291bnR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLnByX1N1Y2Nlc3N9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSByZWQgc3RhdGlzdGljXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2YWx1ZVwiPiR7ZmFpbHVyZUNvdW50fTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9GYWlsdXJlc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55ICR7YXZhaWxhYmlsaXR5ID49IDk5ID8gJ2dyZWVuJyA6IGF2YWlsYWJpbGl0eSA+PSA5NSA/ICd5ZWxsb3cnIDogJ3JlZCd9IHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke2F2YWlsYWJpbGl0eX0lPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0F2YWlsYWJpbGl0eX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgJHthdmVyYWdlUnR0ICE9PSBudWxsID8gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGhyZWUgY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0F2ZXJhZ2VSVFR9Ojwvc3Ryb25nPiAke2F2ZXJhZ2VSdHR9IG1zXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX01pblJUVH06PC9zdHJvbmc+ICR7bWluUnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9NYXhSVFR9Ojwvc3Ryb25nPiAke21heFJ0dH0gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gIDogJyd9XG4gICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgcmVjZW50IGV2ZW50cyBzZWN0aW9uXG4gICAgICAgIGxldCBldmVudHNIdG1sID0gJyc7XG4gICAgICAgIGlmIChyZWNlbnRFdmVudHMgJiYgcmVjZW50RXZlbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50Um93cyA9IHJlY2VudEV2ZW50cy5zbGljZSgwLCA1KS5tYXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50VHlwZSA9IGV2ZW50LnR5cGUgPT09ICdlcnJvcicgPyAncmVkJyA6IGV2ZW50LnR5cGUgPT09ICd3YXJuaW5nJyA/ICd5ZWxsb3cnIDogJ2dyZWVuJztcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudFRleHQgPSBnbG9iYWxUcmFuc2xhdGVbZXZlbnQuZXZlbnRdIHx8IGV2ZW50LmV2ZW50IHx8IGV2ZW50LnN0YXRlO1xuICAgICAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD48aSBjbGFzcz1cIiR7ZXZlbnRUeXBlfSBjaXJjbGUgaWNvblwiPjwvaT48L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7ZXZlbnQuZGF0ZX08L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7ZXZlbnRUZXh0fTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+JHtldmVudC5zdGF0ZX08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9KS5qb2luKCcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZXZlbnRzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGg0PiR7Z2xvYmFsVHJhbnNsYXRlLnByX1JlY2VudEV2ZW50c308L2g0PlxuICAgICAgICAgICAgICAgIDx0YWJsZSBjbGFzcz1cInVpIHZlcnkgYmFzaWMgY29tcGFjdCB0YWJsZVwiPlxuICAgICAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2V2ZW50Um93c31cbiAgICAgICAgICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgaWQ9XCJwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbFwiIGNsYXNzPVwidWkgbGFyZ2UgbW9kYWxcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtzdGF0ZUNvbG9yfSBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgJHtkZXNjcmlwdGlvbiB8fCB1bmlxaWR9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoND4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckluZm99PC9oND5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBsaXN0XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlcklkfTo8L3N0cm9uZz4gJHt1bmlxaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Ib3N0fTo8L3N0cm9uZz4gJHtob3N0fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfVXNlcm5hbWV9Ojwvc3Ryb25nPiAke3VzZXJuYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfQ3VycmVudFN0YXRlfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSB0ZXh0XCI+JHtnbG9iYWxUcmFuc2xhdGVbc3RhdGVEZXNjcmlwdGlvbl0gfHwgc3RhdGV9PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3RhdGVEdXJhdGlvbn06PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RoaXMuZm9ybWF0RHVyYXRpb24oc3RhdGVEdXJhdGlvbil9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtydHQgIT09IG51bGwgJiYgcnR0ICE9PSB1bmRlZmluZWQgPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50UlRUfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPVwiY29sb3I6ICR7cnR0ID4gMjAwID8gJ3JlZCcgOiBydHQgPiAxMDAgPyAnb3JhbmdlJyA6ICdncmVlbid9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3J0dH0gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2xhc3RTdWNjZXNzVGltZSA/IGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0U3VjY2Vzc306PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHt0aGlzLmZvcm1hdFRpbWVBZ28obGFzdFN1Y2Nlc3NUaW1lKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfTGFzdFVwZGF0ZX06PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtsYXN0VXBkYXRlRm9ybWF0dGVkIHx8IG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3N0YXRzSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZXZlbnRzSHRtbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImFjdGlvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIGJ1dHRvblwiIG9uY2xpY2s9XCJ3aW5kb3cubG9jYXRpb24uaHJlZj0nJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnkvJHt1bmlxaWR9J1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJlZGl0IGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wcl9FZGl0UHJvdmlkZXJ9XG4gICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwidWkgcHJpbWFyeSBidXR0b25cIiBvbmNsaWNrPVwiUHJvdmlkZXJTdGF0dXNNb25pdG9yLnJlcXVlc3RQcm92aWRlckNoZWNrKCcke3VuaXFpZH0nKVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja05vd31cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjYW5jZWwgYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wcl9DbG9zZX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIGNoZWNrIGZvciBzcGVjaWZpYyBwcm92aWRlclxuICAgICAqL1xuICAgIHJlcXVlc3RQcm92aWRlckNoZWNrKHByb3ZpZGVySWQpIHtcbiAgICAgICAgLy8gVXNlIFByb3ZpZGVyc0FQSS5mb3JjZUNoZWNrIGZvciBmb3JjaW5nIGEgc3RhdHVzIGNoZWNrXG4gICAgICAgIFByb3ZpZGVyc0FQSS5mb3JjZUNoZWNrKHByb3ZpZGVySWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja1JlcXVlc3RlZCxcbiAgICAgICAgICAgICAgICAgICAgJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgICAgICAgICAyMDAwXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RhbCB3aXRoIGZyZXNoIGRhdGEgaWYgc3RpbGwgb3BlblxuICAgICAgICAgICAgICAgIGlmICgkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5sZW5ndGggJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHVwZGF0ZWQgbW9kYWwgd2l0aCBmcmVzaCBkYXRhXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWxDb250ZW50ID0gdGhpcy5idWlsZFN0YXR1c0RldGFpbHNNb2RhbChwcm92aWRlcklkLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZChtb2RhbENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25IaWRkZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlc1xuICAgICAgICAgICAgICAgICAgICA/IChBcnJheS5pc0FycmF5KHJlc3BvbnNlLm1lc3NhZ2VzKSA/IHJlc3BvbnNlLm1lc3NhZ2VzLmpvaW4oJywgJykgOiByZXNwb25zZS5tZXNzYWdlcylcbiAgICAgICAgICAgICAgICAgICAgOiBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tGYWlsZWQ7XG5cbiAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNZXNzYWdlLCAnZXJyb3InLCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gRW5oYW5jZWQgaW5pdGlhbGl6YXRpb24gd2l0aCB1c2VyIGludGVyYWN0aW9uIHN1cHBvcnRcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICAvLyBBZGQgbWFudWFsIHJlZnJlc2ggYnV0dG9uIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoJCgnLnByb3ZpZGVyLXJlZnJlc2gtYnRuJykubGVuZ3RoID09PSAwICYmICQoJy51aS5jb250YWluZXIuc2VnbWVudCcpLmxlbmd0aCkge1xuICAgICAgICBjb25zdCByZWZyZXNoQnV0dG9uID0gYFxuICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cInVpIG1pbmkgbGFiZWxlZCBpY29uIGJ1dHRvbiBwcm92aWRlci1yZWZyZXNoLWJ0blwiIFxuICAgICAgICAgICAgICAgICAgICBzdHlsZT1cInBvc2l0aW9uOiBhYnNvbHV0ZTsgdG9wOiAxMHB4OyByaWdodDogMTBweDsgei1pbmRleDogMTAwO1wiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX1JlZnJlc2hTdGF0dXN9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYDtcbiAgICAgICAgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykuY3NzKCdwb3NpdGlvbicsICdyZWxhdGl2ZScpLmFwcGVuZChyZWZyZXNoQnV0dG9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIGZvciByZWZyZXNoIGJ1dHRvblxuICAgICAgICAkKCcucHJvdmlkZXItcmVmcmVzaC1idG4nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8vIEFkZCBkb3VibGUtY2xpY2sgaGFuZGxlcnMgZm9yIHN0YXR1cyBjZWxscyB0byBzaG93IGRldGFpbHMgbW9kYWxcbiAgICAkKGRvY3VtZW50KS5vbignZGJsY2xpY2snLCAnLnByb3ZpZGVyLXN0YXR1cyAudWkubGFiZWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgaWYgKHByb3ZpZGVySWQgJiYgdHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFByb3ZpZGVyU3RhdHVzTW9uaXRvci5zaG93UHJvdmlkZXJEZXRhaWxzKHByb3ZpZGVySWQpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgLy8gQ2xlYW4gdXAgbW9kYWxzIHdoZW4gdGhleSdyZSBoaWRkZW5cbiAgICAkKGRvY3VtZW50KS5vbignaGlkZGVuLmJzLm1vZGFsJywgJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgIH0pO1xufSk7XG5cbi8vIERvbid0IGF1dG8taW5pdGlhbGl6ZSB0aGUgbW9uaXRvciBoZXJlIC0gbGV0IHByb3ZpZGVycy1pbmRleC5qcyBoYW5kbGUgaXRcbi8vIFRoaXMgYWxsb3dzIGZvciBwcm9wZXIgc2VxdWVuY2luZyB3aXRoIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUHJvdmlkZXJTdGF0dXNNb25pdG9yID0gUHJvdmlkZXJTdGF0dXNNb25pdG9yOyJdfQ==