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
        var loadingText = globalTranslate.pr_CheckingProviderStatuses || 'Getting status...';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItc3RhdHVzLW1vbml0b3IuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJTdGF0dXNNb25pdG9yIiwiY2hhbm5lbElkIiwiaXNJbml0aWFsaXplZCIsImxhc3RVcGRhdGVUaW1lIiwic3RhdHVzQ2FjaGUiLCIkc3RhdHVzQ2VsbHMiLCIkbGFzdFVwZGF0ZUluZGljYXRvciIsImNhY2hlZFJvd3MiLCJNYXAiLCJjYWNoZWRTdGF0dXNDZWxscyIsImluaXRpYWxpemUiLCJjYWNoZUVsZW1lbnRzIiwiaW5pdGlhbGl6ZUxvYWRpbmdQbGFjZWhvbGRlcnMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwiY2hhbmdlcyIsIkFycmF5IiwiaXNBcnJheSIsInRpbWVzdGFtcCIsIkRhdGUiLCJub3ciLCJmb3JFYWNoIiwiY2hhbmdlIiwidXBkYXRlUHJvdmlkZXJTdGF0dXMiLCJjaGFuZ2VDb3VudCIsInByX09uZVByb3ZpZGVyU3RhdHVzQ2hhbmdlZCIsInByX011bHRpcGxlUHJvdmlkZXJTdGF0dXNlc0NoYW5nZWQiLCJyZXBsYWNlIiwic2hvd1VwZGF0ZU5vdGlmaWNhdGlvbiIsInN0YXR1c2VzIiwidXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyIsInVwZGF0ZUxhc3RDaGVja1RpbWUiLCJlcnJvck1zZyIsImVycm9yIiwicHJfU3RhdHVzQ2hlY2tGYWlsZWQiLCJwcm92aWRlcl9pZCIsInR5cGUiLCJzdGF0ZSIsIm5ld19zdGF0ZSIsIm9sZF9zdGF0ZSIsInN0YXRlQ29sb3IiLCJzdGF0ZUljb24iLCJzdGF0ZVRleHQiLCJzdGF0ZURlc2NyaXB0aW9uIiwic3RhdGVEdXJhdGlvbiIsImxhc3RTdWNjZXNzVGltZSIsInRpbWVTaW5jZUxhc3RTdWNjZXNzIiwic3VjY2Vzc0R1cmF0aW9uIiwiZmFpbHVyZUR1cmF0aW9uIiwiZ2V0IiwiY3VycmVudFN0YXRlIiwicHJldmlvdXNTdGF0ZSIsInRvb2x0aXBDb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInJ0dCIsImhvc3QiLCJ1c2VybmFtZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwicG9wdXAiLCJob3ZlcmFibGUiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCIkZmFpbHVyZUNlbGwiLCJ1cGRhdGVEdXJhdGlvbkRpc3BsYXkiLCJ0cmFuc2l0aW9uIiwidXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3kiLCJzdGF0dXNJbmZvIiwic3RhdGVUaXRsZSIsInRvb2x0aXAiLCJoYXNTdGF0dXNJbmZvIiwic3RhdHVzU2VjdGlvbiIsInVuZGVmaW5lZCIsImZvcm1hdHRlZER1cmF0aW9uIiwiZm9ybWF0RHVyYXRpb24iLCJkdXJhdGlvbkxhYmVsIiwicHJfU3RhdHVzRHVyYXRpb24iLCJydHRMYWJlbCIsInByX1JUVCIsInJ0dENsYXNzIiwiZm9ybWF0dGVkVGltZSIsImxhc3RTdWNjZXNzTGFiZWwiLCJwcl9MYXN0U3VjY2Vzc1RpbWUiLCJzdWNjZXNzTGFiZWwiLCJwcl9TdWNjZXNzRHVyYXRpb24iLCJmYWlsdXJlTGFiZWwiLCJwcl9GYWlsdXJlRHVyYXRpb24iLCJkdXJhdGlvbnMiLCIkZHVyYXRpb25JbmZvIiwiJG5hbWVDb2x1bW4iLCJlcSIsImFwcGVuZCIsImR1cmF0aW9uVGV4dCIsInN0YXRlTGFiZWwiLCJ0aW1lQWdvIiwiZm9ybWF0VGltZUFnbyIsImxvYWRpbmdUZXh0Iiwic2Vjb25kcyIsInplcm9Gb3JtYXQiLCJwcl9UaW1lRm9ybWF0X1NlY29uZHMiLCJkYXlzIiwiTWF0aCIsImZsb29yIiwiaG91cnMiLCJtaW51dGVzIiwic2VjcyIsInJlc3VsdCIsImZvcm1hdCIsInByX1RpbWVGb3JtYXRfRGF5cyIsInB1c2giLCJwcl9UaW1lRm9ybWF0X0hvdXJzIiwicHJfVGltZUZvcm1hdF9NaW51dGVzIiwic2xpY2UiLCJqb2luIiwiZGlmZiIsImFnb0xhYmVsIiwicHJfVGltZUFnbyIsInByX0p1c3ROb3ciLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJyZWQiLCJub3JtYWxpemVkU3RhdGUiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZXMiLCJidWlsZFVwZGF0ZU9iamVjdCIsInByb3ZpZGVySWQiLCJwcm92aWRlciIsInByb3ZpZGVyVHlwZSIsIk9iamVjdCIsImtleXMiLCJzaXAiLCJpYXgiLCJwcm9jZXNzQmF0Y2hVcGRhdGVzIiwiYmF0Y2hTaXplIiwiYmF0Y2hlcyIsImkiLCJiYXRjaEluZGV4IiwicHJvY2Vzc0JhdGNoIiwiYmF0Y2giLCJ1cGRhdGUiLCJkdXJhdGlvbiIsIiRpbmRpY2F0b3IiLCIkaGVhZGVyIiwiJHN0YXR1c01lc3NhZ2UiLCIkdGltZUluZm8iLCJoZWFkZXJzIiwicHJfU3RhdHVzSW5mbyIsInByX1N0YXR1c1VwZGF0ZWQiLCJwcl9TdGF0dXNFcnJvciIsInByX1N0YXR1c1dhcm5pbmciLCJ0b0xvY2FsZVRpbWVTdHJpbmciLCJjbGVhclRpbWVvdXQiLCJub3RpZmljYXRpb25UaW1lb3V0Iiwib2ZmIiwib24iLCJkYXRlIiwidGltZVN0ciIsInByX1JlcXVlc3RpbmdTdGF0dXNVcGRhdGUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZm9yY2UiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInByb3ZpZGVyQ291bnQiLCJjb3VudFByb3ZpZGVycyIsInByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlIiwicHJfU3RhdHVzVXBkYXRlRmFpbGVkIiwib25GYWlsdXJlIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJwcl9TdGF0dXNVcGRhdGVFcnJvciIsIm9uRXJyb3IiLCJwcl9Db25uZWN0aW9uRXJyb3IiLCJzdGF0dXNEYXRhIiwiY291bnQiLCJnZXRDYWNoZWRSb3ciLCJzaG93UHJvdmlkZXJEZXRhaWxzIiwicHJfTG9hZGluZ1Byb3ZpZGVyRGV0YWlscyIsIm1vZGFsQ29udGVudCIsImJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsIiwicmVtb3ZlIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uSGlkZGVuIiwicHJfTm9TdGF0dXNJbmZvIiwicHJfRmFpbGVkVG9Mb2FkRGV0YWlscyIsInVuaXFpZCIsImRlc2NyaXB0aW9uIiwic3RhdGlzdGljcyIsInJlY2VudEV2ZW50cyIsImxhc3RVcGRhdGVGb3JtYXR0ZWQiLCJzdGF0ZVN0YXJ0VGltZUZvcm1hdHRlZCIsInN0YXRzSHRtbCIsInRvdGFsQ2hlY2tzIiwic3VjY2Vzc0NvdW50IiwiZmFpbHVyZUNvdW50IiwiYXZhaWxhYmlsaXR5IiwiYXZlcmFnZVJ0dCIsIm1pblJ0dCIsIm1heFJ0dCIsInByX1N0YXRpc3RpY3MiLCJwcl9Ub3RhbENoZWNrcyIsInByX1N1Y2Nlc3MiLCJwcl9GYWlsdXJlcyIsInByX0F2YWlsYWJpbGl0eSIsInByX0F2ZXJhZ2VSVFQiLCJwcl9NaW5SVFQiLCJwcl9NYXhSVFQiLCJldmVudHNIdG1sIiwiZXZlbnRSb3dzIiwibWFwIiwiZXZlbnRUeXBlIiwiZXZlbnRUZXh0IiwicHJfUmVjZW50RXZlbnRzIiwicHJfUHJvdmlkZXJJbmZvIiwicHJfUHJvdmlkZXJJZCIsInByX0hvc3QiLCJwcl9Vc2VybmFtZSIsInByX0N1cnJlbnRTdGF0ZSIsInByX1N0YXRlRHVyYXRpb24iLCJwcl9DdXJyZW50UlRUIiwicHJfTGFzdFN1Y2Nlc3MiLCJwcl9MYXN0VXBkYXRlIiwidG9Mb2NhbGVTdHJpbmciLCJwcl9FZGl0UHJvdmlkZXIiLCJwcl9DaGVja05vdyIsInByX0Nsb3NlIiwicmVxdWVzdFByb3ZpZGVyQ2hlY2siLCJmb3JjZUNoZWNrIiwicmVmcmVzaEZyb21BbWkiLCJwcl9DaGVja1JlcXVlc3RlZCIsInByX0NoZWNrRmFpbGVkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInJlZnJlc2hCdXR0b24iLCJwcl9SZWZyZXNoU3RhdHVzIiwiY3NzIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwiY2xvc2VzdCIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUJDLEVBQUFBLFNBQVMsRUFBRSxpQkFEZTtBQUUxQkMsRUFBQUEsYUFBYSxFQUFFLEtBRlc7QUFHMUJDLEVBQUFBLGNBQWMsRUFBRSxDQUhVO0FBSTFCQyxFQUFBQSxXQUFXLEVBQUUsRUFKYTs7QUFNMUI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQVRZO0FBVTFCQyxFQUFBQSxvQkFBb0IsRUFBRSxJQVZJOztBQVkxQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBQUlDLEdBQUosRUFmYztBQWdCMUJDLEVBQUFBLGlCQUFpQixFQUFFLElBQUlELEdBQUosRUFo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Q0EsUUFBQUEscUJBQXFCLENBQUNtQyxtQkFBdEI7QUFDSDtBQUNKLEtBTEQ7QUFNSCxHQW5CbUIsQ0FxQnBCOzs7QUFDQW5CLEVBQUFBLENBQUMsQ0FBQ2lRLFFBQUQsQ0FBRCxDQUFZaEYsRUFBWixDQUFlLFVBQWYsRUFBMkIsNEJBQTNCLEVBQXlELFVBQVNxRixDQUFULEVBQVk7QUFDakVBLElBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBRCxJQUFBQSxDQUFDLENBQUNFLGVBQUY7QUFFQSxRQUFNcEgsVUFBVSxHQUFHcEosQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFReVEsT0FBUixDQUFnQixJQUFoQixFQUFzQm5RLElBQXRCLENBQTJCLElBQTNCLENBQW5COztBQUNBLFFBQUk4SSxVQUFVLElBQUksT0FBT3BLLHFCQUFQLEtBQWlDLFdBQW5ELEVBQWdFO0FBQzVEQSxNQUFBQSxxQkFBcUIsQ0FBQ3lOLG1CQUF0QixDQUEwQ3JELFVBQTFDO0FBQ0g7QUFDSixHQVJELEVBdEJvQixDQWdDcEI7O0FBQ0FwSixFQUFBQSxDQUFDLENBQUNpUSxRQUFELENBQUQsQ0FBWWhGLEVBQVosQ0FBZSxpQkFBZixFQUFrQyxnQ0FBbEMsRUFBb0UsWUFBVztBQUMzRWpMLElBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTZNLE1BQVI7QUFDSCxHQUZEO0FBR0gsQ0FwQ0QsRSxDQXNDQTtBQUNBO0FBRUE7O0FBQ0E2RCxNQUFNLENBQUMxUixxQkFBUCxHQUErQkEscUJBQS9CIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXZlbnRCdXMgKi9cblxuLyoqXG4gKiBQcm92aWRlciBTdGF0dXMgTW9uaXRvclxuICogSGFuZGxlcyByZWFsLXRpbWUgcHJvdmlkZXIgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzIHdpdGggZW5oYW5jZWQgZmVhdHVyZXM6XG4gKiAtIFJlYWwtdGltZSBzdGF0dXMgdXBkYXRlcyB3aXRoIEV2ZW50QnVzIGludGVncmF0aW9uXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRHVyYXRpb24gZGlzcGxheXMgKHN0YXRlIGR1cmF0aW9uLCBzdWNjZXNzL2ZhaWx1cmUgZHVyYXRpb24pXG4gKiAtIExhc3Qgc3VjY2VzcyBpbmZvcm1hdGlvblxuICogLSBFbmhhbmNlZCB2aXN1YWwgZmVlZGJhY2sgd2l0aCBGb21hbnRpYyBVSSBjb21wb25lbnRzXG4gKi9cbmNvbnN0IFByb3ZpZGVyU3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdwcm92aWRlci1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGxhc3RVcGRhdGVUaW1lOiAwLFxuICAgIHN0YXR1c0NhY2hlOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0c1xuICAgICAqL1xuICAgICRzdGF0dXNDZWxsczogbnVsbCxcbiAgICAkbGFzdFVwZGF0ZUluZGljYXRvcjogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBET00gY2FjaGUgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlZFJvd3M6IG5ldyBNYXAoKSxcbiAgICBjYWNoZWRTdGF0dXNDZWxsczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIHN0YXR1cyBtb25pdG9yIHdpdGggZW5oYW5jZWQgZmVhdHVyZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50cyBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGxvYWRpbmcgcGxhY2Vob2xkZXJzIGZvciBhbGwgcHJvdmlkZXIgcm93c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVMb2FkaW5nUGxhY2Vob2xkZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZW5oYW5jZWQgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLnByb3ZpZGVyLXN0YXR1cywgLnByb3ZpZGVyLXN0YXR1cy1jZWxsJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBwcm92aWRlciByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIucHJvdmlkZXItcm93LCB0cltpZF0nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICRyb3cuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoaWQsICRyb3cpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcucHJvdmlkZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChpZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZW5oYW5jZWQgc3RhdHVzIGluZGljYXRvciB3aXRoIGR1cmF0aW9uIGluZm9cbiAgICAgKi9cbiAgICBjcmVhdGVTdGF0dXNJbmRpY2F0b3IoKSB7XG4gICAgICAgIGlmICgkKCcjcHJvdmlkZXItc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJwcm92aWRlci1zdGF0dXMtaW5kaWNhdG9yXCIgY2xhc3M9XCJ1aSBtaW5pIG1lc3NhZ2UgaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwic3luYyBhbHRlcm5hdGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic3RhdHVzLW1lc3NhZ2VcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYXN0LWNoZWNrLXRpbWVcIiBzdHlsZT1cImZvbnQtc2l6ZTogMC44NWVtOyBjb2xvcjogIzg4ODtcIj48L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykucHJlcGVuZChpbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgPSAkKCcjcHJvdmlkZXItc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdwcm92aWRlci1zdGF0dXMnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRXZlbnRCdXNNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRXZlbnRCdXMgbm90IGF2YWlsYWJsZSwgcHJvdmlkZXIgc3RhdHVzIG1vbml0b3Igd2lsbCB3b3JrIHdpdGhvdXQgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIHBlcmlvZGljIGhlYWx0aCBjaGVja3MgYW5kIGNhY2hlIG1haW50ZW5hbmNlXG4gICAgICovXG4gICAgc2V0dXBIZWFsdGhDaGVja3MoKSB7XG4gICAgICAgIC8vIFJlZnJlc2ggY2FjaGUgZXZlcnkgMzAgc2Vjb25kcyB0byBoYW5kbGUgZHluYW1pYyBjb250ZW50XG4gICAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaENhY2hlKCk7XG4gICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIHVwZGF0ZSBldmVyeSA1IG1pbnV0ZXMgYXMgZmFsbGJhY2tcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0U3RhdHVzVXBkYXRlKCk7XG4gICAgICAgIH0sIDMwMDAwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGNhY2hlZCBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICByZWZyZXNoQ2FjaGUoKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVkUm93cy5jbGVhcigpO1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmNsZWFyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGxvYWRpbmcgcGxhY2Vob2xkZXJzIGZvciBuZXcgcm93c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVMb2FkaW5nUGxhY2Vob2xkZXJzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBtZXNzYWdlIGNhbiBoYXZlIGV2ZW50IGF0IHRvcCBsZXZlbCBvciBpbiBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIEV2ZW50IGF0IHRvcCBsZXZlbFxuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmV2ZW50O1xuICAgICAgICAgICAgZGF0YSA9IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmRhdGEgJiYgbWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICAvLyBFdmVudCBpbiBkYXRhXG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jaGVjayc6XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBjaGVja2luZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBzaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSkge1xuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBlcnJvciBzdWNjZXNzJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnaW5mbycpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuZmluZCgnLmNvbnRlbnQnKVxuICAgICAgICAgICAgLnRleHQoZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja2luZ1Byb3ZpZGVyU3RhdHVzZXMpO1xuICAgICAgICAgICAgXG4gICAgICAgIC8vIEF1dG8taGlkZSBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSwgMzAwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHN0YXR1cyB1cGRhdGUgd2l0aCBjaGFuZ2VzXG4gICAgICovXG4gICAgcHJvY2Vzc1N0YXR1c1VwZGF0ZShkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5jaGFuZ2VzIHx8ICFBcnJheS5pc0FycmF5KGRhdGEuY2hhbmdlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgdGltZXN0YW1wID0gZGF0YS50aW1lc3RhbXAgfHwgRGF0ZS5ub3coKSAvIDEwMDA7XG4gICAgICAgIHRoaXMubGFzdFVwZGF0ZVRpbWUgPSB0aW1lc3RhbXA7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2hhbmdlXG4gICAgICAgIGRhdGEuY2hhbmdlcy5mb3JFYWNoKGNoYW5nZSA9PiB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb3ZpZGVyU3RhdHVzKGNoYW5nZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB1cGRhdGUgbm90aWZpY2F0aW9uXG4gICAgICAgIGNvbnN0IGNoYW5nZUNvdW50ID0gZGF0YS5jaGFuZ2VzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGNoYW5nZUNvdW50ID09PSAxIFxuICAgICAgICAgICAgPyBnbG9iYWxUcmFuc2xhdGUucHJfT25lUHJvdmlkZXJTdGF0dXNDaGFuZ2VkXG4gICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5wcl9NdWx0aXBsZVByb3ZpZGVyU3RhdHVzZXNDaGFuZ2VkLnJlcGxhY2UoJyVzJywgY2hhbmdlQ291bnQpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2FjaGVcbiAgICAgICAgdGhpcy5zdGF0dXNDYWNoZSA9IGRhdGEuc3RhdHVzZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIHByb3ZpZGVyIHN0YXR1c2VzIG9uIHRoZSBwYWdlXG4gICAgICAgIHRoaXMudXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhkYXRhLnN0YXR1c2VzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBsYXN0IGNoZWNrIHRpbWVcbiAgICAgICAgaWYgKGRhdGEudGltZXN0YW1wKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUxhc3RDaGVja1RpbWUoZGF0YS50aW1lc3RhbXApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgc3RhdHVzIGVycm9yXG4gICAgICovXG4gICAgaGFuZGxlU3RhdHVzRXJyb3IoZGF0YSkge1xuICAgICAgICBjb25zdCBlcnJvck1zZyA9IGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0NoZWNrRmFpbGVkO1xuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNc2csICdlcnJvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNpbmdsZSBwcm92aWRlciBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKiBObyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZyAtIGJhY2tlbmQgcHJvdmlkZXMgYWxsIGRpc3BsYXkgcHJvcGVydGllc1xuICAgICAqL1xuICAgIHVwZGF0ZVByb3ZpZGVyU3RhdHVzKGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IFxuICAgICAgICAgICAgcHJvdmlkZXJfaWQsIFxuICAgICAgICAgICAgdHlwZSwgXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIG5ld19zdGF0ZSwgXG4gICAgICAgICAgICBvbGRfc3RhdGUsXG4gICAgICAgICAgICBzdGF0ZUNvbG9yLCBcbiAgICAgICAgICAgIHN0YXRlSWNvbiwgXG4gICAgICAgICAgICBzdGF0ZVRleHQsIFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvblxuICAgICAgICB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGNhY2hlZCBlbGVtZW50cyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChwcm92aWRlcl9pZCk7XG4gICAgICAgIGlmICghJHJvdykge1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke3Byb3ZpZGVyX2lkfWApO1xuICAgICAgICAgICAgaWYgKCRyb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQocHJvdmlkZXJfaWQsICRyb3cpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFJvdyBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0ICRzdGF0dXNDZWxsID0gdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5nZXQocHJvdmlkZXJfaWQpO1xuICAgICAgICBpZiAoISRzdGF0dXNDZWxsKSB7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLnByb3ZpZGVyLXN0YXR1cycpO1xuICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChwcm92aWRlcl9pZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFN0YXR1cyBjZWxsIG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY3VycmVudCBzdGF0ZSBvciBmYWxsYmFjayB0byBuZXdfc3RhdGUgZm9yIGNvbXBhdGliaWxpdHlcbiAgICAgICAgY29uc3QgY3VycmVudFN0YXRlID0gc3RhdGUgfHwgbmV3X3N0YXRlO1xuICAgICAgICBjb25zdCBwcmV2aW91c1N0YXRlID0gJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIGRpcmVjdGx5XG4gICAgICAgIGlmIChzdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICAvLyBFbmhhbmNlZCBzdGF0dXMgaW5kaWNhdG9yIHdpdGggdG9vbHRpcCBzdXBwb3J0XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgc3RhdGU6IGN1cnJlbnRTdGF0ZSxcbiAgICAgICAgICAgICAgICBzdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgICAgICB0aW1lU2luY2VMYXN0U3VjY2VzcyxcbiAgICAgICAgICAgICAgICBzdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgIHJ0dDogY2hhbmdlLnJ0dCxcbiAgICAgICAgICAgICAgICBob3N0OiBjaGFuZ2UuaG9zdCxcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogY2hhbmdlLnVzZXJuYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiXG4gICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke3Rvb2x0aXBDb250ZW50fVwiXG4gICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIGNlbnRlclwiXG4gICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cInNtYWxsXCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBCYXRjaCBET00gdXBkYXRlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoc3RhdHVzSHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCAoRm9tYW50aWMgVUkgdG9vbHRpcClcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5maW5kKCcudWkubGFiZWwnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3NtYWxsJyxcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAyMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENsZWFyIGZhaWx1cmUgdGV4dCB3aGVuIHVzaW5nIG1vZGVybiBzdGF0dXMgZGlzcGxheVxuICAgICAgICAgICAgICAgIGNvbnN0ICRmYWlsdXJlQ2VsbCA9ICRyb3cuZmluZCgnLmZhaWx1cmUsIC5mZWF0dXJlcy5mYWlsdXJlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRmYWlsdXJlQ2VsbC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc2hvdyB0ZXh0IHN0YXR1cyB3aGVuIHdlIGhhdmUgdmlzdWFsIGluZGljYXRvcnNcbiAgICAgICAgICAgICAgICAgICAgJGZhaWx1cmVDZWxsLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgZHVyYXRpb24gaW5mb3JtYXRpb24gaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVEdXJhdGlvbkRpc3BsYXkoJHJvdywge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBsYXN0U3VjY2Vzc1RpbWUsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZVRleHRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBbmltYXRlIGlmIHN0YXRlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNTdGF0ZSAmJiBwcmV2aW91c1N0YXRlICE9PSBjdXJyZW50U3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY3VycmVudCBzdGF0ZSBmb3IgZnV0dXJlIGNvbXBhcmlzb25cbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5kYXRhKCdwcmV2LXN0YXRlJywgY3VycmVudFN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgLSB1c2Ugc2ltcGxlIHN0YXRlLWJhc2VkIGRpc3BsYXlcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3koY2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgdG9vbHRpcCBjb250ZW50IHdpdGggZW5oYW5jZWQgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHN0YXR1c0luZm8pIHtcbiAgICAgICAgY29uc3QgeyBcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgc3RhdGVUZXh0LFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbiwgXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLCBcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLCBcbiAgICAgICAgICAgIGZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgIHJ0dCxcbiAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICB1c2VybmFtZVxuICAgICAgICB9ID0gc3RhdHVzSW5mbztcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB0cmFuc2xhdGVkIHN0YXRlIHRleHQgYXMgbWFpbiB0aXRsZVxuICAgICAgICBjb25zdCBzdGF0ZVRpdGxlID0gc3RhdGVUZXh0ID8gKGdsb2JhbFRyYW5zbGF0ZVtzdGF0ZVRleHRdIHx8IHN0YXRlVGV4dCkgOiAoZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dIHx8IHN0YXRlRGVzY3JpcHRpb24gfHwgc3RhdGUgfHwgJycpO1xuICAgICAgICBcbiAgICAgICAgbGV0IHRvb2x0aXAgPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwXCI+YDtcbiAgICAgICAgdG9vbHRpcCArPSBgPHN0cm9uZyBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX190aXRsZVwiPiR7c3RhdGVUaXRsZX08L3N0cm9uZz5gO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG9yaWdpbmFsIHN0YXRlIHZhbHVlIGlmIGF2YWlsYWJsZSBhbmQgZGlmZmVyZW50IGZyb20gdGl0bGVcbiAgICAgICAgaWYgKHN0YXRlICYmIHN0YXRlICE9PSBzdGF0ZVRpdGxlKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXRlLW9yaWdpbmFsXCI+WyR7c3RhdGV9XTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBob3N0IGFuZCB1c2VybmFtZSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKGhvc3QgfHwgdXNlcm5hbWUpIHtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc2VjdGlvblwiPmA7XG4gICAgICAgICAgICBpZiAoaG9zdCkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9faW5mby1pdGVtXCI+SG9zdDogPHN0cm9uZz4ke2hvc3R9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh1c2VybmFtZSkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAgKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9faW5mby1pdGVtXCI+VXNlcjogPHN0cm9uZz4ke3VzZXJuYW1lfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RhdHVzIGluZm9ybWF0aW9uIHNlY3Rpb25cbiAgICAgICAgbGV0IGhhc1N0YXR1c0luZm8gPSBmYWxzZTtcbiAgICAgICAgbGV0IHN0YXR1c1NlY3Rpb24gPSBgPGRpdiBjbGFzcz1cInByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19zZWN0aW9uXCI+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBhbmQgYWRkIGR1cmF0aW9uIGluZm9ybWF0aW9uIChub3cgY29tZXMgYXMgc2Vjb25kcyBmcm9tIGJhY2tlbmQpXG4gICAgICAgIGlmIChzdGF0ZUR1cmF0aW9uICE9PSB1bmRlZmluZWQgJiYgc3RhdGVEdXJhdGlvbiAhPT0gbnVsbCAmJiBzdGF0ZUR1cmF0aW9uID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZER1cmF0aW9uID0gdGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRHVyYXRpb24gfHwgJ9CU0LvQuNGC0LXQu9GM0L3QvtGB0YLRjCc7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtXCI+JHtkdXJhdGlvbkxhYmVsfTogPHN0cm9uZz4ke2Zvcm1hdHRlZER1cmF0aW9ufTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIFJUVCAoUm91bmQgVHJpcCBUaW1lKSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHJ0dCAhPT0gdW5kZWZpbmVkICYmIHJ0dCAhPT0gbnVsbCAmJiBydHQgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgcnR0TGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfUlRUIHx8ICfQl9Cw0LTQtdGA0LbQutCwJztcbiAgICAgICAgICAgIC8vIEZvcm1hdCBSVFQgd2l0aCBjb2xvciBjb2RpbmdcbiAgICAgICAgICAgIGxldCBydHRDbGFzcyA9ICdwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fcnR0LS1nb29kJztcbiAgICAgICAgICAgIGlmIChydHQgPiAxMDApIHJ0dENsYXNzID0gJ3Byb3ZpZGVyLXN0YXR1cy10b29sdGlwX19ydHQtLXdhcm5pbmcnO1xuICAgICAgICAgICAgaWYgKHJ0dCA+IDIwMCkgcnR0Q2xhc3MgPSAncHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3J0dC0tYmFkJztcbiAgICAgICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3RhdHVzLWl0ZW1cIj4ke3J0dExhYmVsfTogPHN0cm9uZyBjbGFzcz1cIiR7cnR0Q2xhc3N9XCI+JHtydHR9INC80YE8L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCB0aW1lIHNpbmNlIGxhc3Qgc3VjY2VzcyBpZiBwcm92aWRlZCAobm93IGNvbWVzIGFzIHNlY29uZHMpXG4gICAgICAgIGlmICh0aW1lU2luY2VMYXN0U3VjY2VzcyAhPT0gdW5kZWZpbmVkICYmIHRpbWVTaW5jZUxhc3RTdWNjZXNzICE9PSBudWxsICYmIHRpbWVTaW5jZUxhc3RTdWNjZXNzID49IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZFRpbWUgPSB0aGlzLmZvcm1hdER1cmF0aW9uKHRpbWVTaW5jZUxhc3RTdWNjZXNzKTtcbiAgICAgICAgICAgIGNvbnN0IGxhc3RTdWNjZXNzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfTGFzdFN1Y2Nlc3NUaW1lIHx8ICfQn9C+0YHQu9C10LTQvdC40Lkg0YPRgdC/0LXRhSc7XG4gICAgICAgICAgICBzdGF0dXNTZWN0aW9uICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N0YXR1cy1pdGVtIHByb3ZpZGVyLXN0YXR1cy10b29sdGlwX19sYXN0LXN1Y2Nlc3NcIj4ke2xhc3RTdWNjZXNzTGFiZWx9OiA8c3Ryb25nPiR7Zm9ybWF0dGVkVGltZX0g0L3QsNC30LDQtDwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBoYXNTdGF0dXNJbmZvID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN1Y2Nlc3MvZmFpbHVyZSBkdXJhdGlvbiBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHN1Y2Nlc3NEdXJhdGlvbiAhPT0gdW5kZWZpbmVkICYmIHN1Y2Nlc3NEdXJhdGlvbiAhPT0gbnVsbCAmJiBzdWNjZXNzRHVyYXRpb24gPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMuZm9ybWF0RHVyYXRpb24oc3VjY2Vzc0R1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdWNjZXNzRHVyYXRpb24gfHwgJ9CS0YDQtdC80Y8g0YDQsNCx0L7RgtGLJztcbiAgICAgICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3RhdHVzLWl0ZW0gcHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX3N1Y2Nlc3MtZHVyYXRpb25cIj4ke3N1Y2Nlc3NMYWJlbH06IDxzdHJvbmc+JHtmb3JtYXR0ZWREdXJhdGlvbn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChmYWlsdXJlRHVyYXRpb24gIT09IHVuZGVmaW5lZCAmJiBmYWlsdXJlRHVyYXRpb24gIT09IG51bGwgJiYgZmFpbHVyZUR1cmF0aW9uID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkRHVyYXRpb24gPSB0aGlzLmZvcm1hdER1cmF0aW9uKGZhaWx1cmVEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBmYWlsdXJlTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfRmFpbHVyZUR1cmF0aW9uIHx8ICfQktGA0LXQvNGPINGB0LHQvtGPJztcbiAgICAgICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDxkaXYgY2xhc3M9XCJwcm92aWRlci1zdGF0dXMtdG9vbHRpcF9fc3RhdHVzLWl0ZW0gcHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2ZhaWx1cmUtZHVyYXRpb25cIj4ke2ZhaWx1cmVMYWJlbH06IDxzdHJvbmc+JHtmb3JtYXR0ZWREdXJhdGlvbn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaGFzU3RhdHVzSW5mbyA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN0YXR1c1NlY3Rpb24gKz0gYDwvZGl2PmA7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzU3RhdHVzSW5mbykge1xuICAgICAgICAgICAgdG9vbHRpcCArPSBzdGF0dXNTZWN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZGlmZmVyZW50IGZyb20gc3RhdGUgdGV4dFxuICAgICAgICBpZiAoc3RhdGVEZXNjcmlwdGlvbiAmJiBnbG9iYWxUcmFuc2xhdGVbc3RhdGVEZXNjcmlwdGlvbl0gJiYgZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dICE9PSBzdGF0ZVRpdGxlKSB7XG4gICAgICAgICAgICB0b29sdGlwICs9IGA8ZGl2IGNsYXNzPVwicHJvdmlkZXItc3RhdHVzLXRvb2x0aXBfX2Rlc2NyaXB0aW9uXCI+YDtcbiAgICAgICAgICAgIHRvb2x0aXAgKz0gZ2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dO1xuICAgICAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdG9vbHRpcCArPSBgPC9kaXY+YDtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0b29sdGlwLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBkdXJhdGlvbiBkaXNwbGF5IGluIHByb3ZpZGVyIHJvd1xuICAgICAqL1xuICAgIHVwZGF0ZUR1cmF0aW9uRGlzcGxheSgkcm93LCBkdXJhdGlvbnMpIHtcbiAgICAgICAgY29uc3QgeyBzdGF0ZUR1cmF0aW9uLCBsYXN0U3VjY2Vzc1RpbWUsIHN1Y2Nlc3NEdXJhdGlvbiwgZmFpbHVyZUR1cmF0aW9uLCBzdGF0ZVRleHQgfSA9IGR1cmF0aW9ucztcbiAgICAgICAgXG4gICAgICAgIC8vIExvb2sgZm9yIGR1cmF0aW9uIGRpc3BsYXkgZWxlbWVudHMgb3IgY3JlYXRlIHRoZW1cbiAgICAgICAgbGV0ICRkdXJhdGlvbkluZm8gPSAkcm93LmZpbmQoJy5wcm92aWRlci1kdXJhdGlvbi1pbmZvJyk7XG4gICAgICAgIGlmICgkZHVyYXRpb25JbmZvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gQWRkIGR1cmF0aW9uIGluZm8gY29udGFpbmVyIHRvIHRoZSBwcm92aWRlciBuYW1lIGNvbHVtblxuICAgICAgICAgICAgY29uc3QgJG5hbWVDb2x1bW4gPSAkcm93LmZpbmQoJ3RkJykuZXEoMik7IC8vIFVzdWFsbHkgdGhlIHRoaXJkIGNvbHVtbiBjb250YWlucyBwcm92aWRlciBuYW1lXG4gICAgICAgICAgICBpZiAoJG5hbWVDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJG5hbWVDb2x1bW4uYXBwZW5kKCc8ZGl2IGNsYXNzPVwicHJvdmlkZXItZHVyYXRpb24taW5mb1wiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRkdXJhdGlvbkluZm8gPSAkbmFtZUNvbHVtbi5maW5kKCcucHJvdmlkZXItZHVyYXRpb24taW5mbycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJGR1cmF0aW9uSW5mby5sZW5ndGggJiYgKHN0YXRlRHVyYXRpb24gfHwgbGFzdFN1Y2Nlc3NUaW1lIHx8IHN1Y2Nlc3NEdXJhdGlvbiB8fCBmYWlsdXJlRHVyYXRpb24pKSB7XG4gICAgICAgICAgICBsZXQgZHVyYXRpb25UZXh0ID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChzdGF0ZUR1cmF0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRyYW5zbGF0ZWQgc3RhdGUgdGV4dCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSB1c2UgZ2VuZXJpYyBsYWJlbFxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlTGFiZWwgPSBzdGF0ZVRleHQgPyBnbG9iYWxUcmFuc2xhdGVbc3RhdGVUZXh0XSB8fCBzdGF0ZVRleHQgOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzRHVyYXRpb24gfHwgJ1N0YXRlJztcbiAgICAgICAgICAgICAgICBkdXJhdGlvblRleHQgKz0gYCR7c3RhdGVMYWJlbH06ICR7dGhpcy5mb3JtYXREdXJhdGlvbihzdGF0ZUR1cmF0aW9uKX1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobGFzdFN1Y2Nlc3NUaW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGltZUFnbyA9IHRoaXMuZm9ybWF0VGltZUFnbyhsYXN0U3VjY2Vzc1RpbWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxhc3RTdWNjZXNzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUucHJfTGFzdFN1Y2Nlc3NUaW1lIHx8ICdMYXN0IHN1Y2Nlc3MnO1xuICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvblRleHQpIGR1cmF0aW9uVGV4dCArPSAnIHwgJztcbiAgICAgICAgICAgICAgICBkdXJhdGlvblRleHQgKz0gYCR7bGFzdFN1Y2Nlc3NMYWJlbH06ICR7dGltZUFnb31gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAkZHVyYXRpb25JbmZvLnRleHQoZHVyYXRpb25UZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2FkaW5nIHBsYWNlaG9sZGVycyBmb3IgYWxsIHByb3ZpZGVyIHJvd3NcbiAgICAgKiBUaGlzIHByZXZlbnRzIHRhYmxlIGp1bXBpbmcgd2hlbiBzdGF0dXNlcyBhcmUgbG9hZGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVMb2FkaW5nUGxhY2Vob2xkZXJzKCkge1xuICAgICAgICAkKCd0ci5wcm92aWRlci1yb3csIHRyW2lkXScpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0ICRuYW1lQ29sdW1uID0gJHJvdy5maW5kKCd0ZCcpLmVxKDIpOyAvLyBQcm92aWRlciBuYW1lIGNvbHVtblxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkdXJhdGlvbiBpbmZvIGFscmVhZHkgZXhpc3RzXG4gICAgICAgICAgICBsZXQgJGR1cmF0aW9uSW5mbyA9ICRyb3cuZmluZCgnLnByb3ZpZGVyLWR1cmF0aW9uLWluZm8nKTtcbiAgICAgICAgICAgIGlmICgkZHVyYXRpb25JbmZvLmxlbmd0aCA9PT0gMCAmJiAkbmFtZUNvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgbG9hZGluZyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRpbmdUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX0NoZWNraW5nUHJvdmlkZXJTdGF0dXNlcyB8fCAnR2V0dGluZyBzdGF0dXMuLi4nO1xuICAgICAgICAgICAgICAgICRuYW1lQ29sdW1uLmFwcGVuZChgPGRpdiBjbGFzcz1cInByb3ZpZGVyLWR1cmF0aW9uLWluZm9cIiBzdHlsZT1cImNvbG9yOiAjOTk5OyBmb250LXNpemU6IDAuOWVtO1wiPiR7bG9hZGluZ1RleHR9PC9kaXY+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGR1cmF0aW9uIGluIHNlY29uZHMgdG8gaHVtYW4gcmVhZGFibGUgZm9ybWF0XG4gICAgICovXG4gICAgZm9ybWF0RHVyYXRpb24oc2Vjb25kcykge1xuICAgICAgICBpZiAoIXNlY29uZHMgfHwgc2Vjb25kcyA8IDApIHtcbiAgICAgICAgICAgIC8vIFJldHVybiAwIHNlY29uZHMgdXNpbmcgdHJhbnNsYXRpb25cbiAgICAgICAgICAgIGNvbnN0IHplcm9Gb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9TZWNvbmRzIHx8ICclcyBzJztcbiAgICAgICAgICAgIHJldHVybiB6ZXJvRm9ybWF0LnJlcGxhY2UoJyVzJywgJzAnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgZGF5cyA9IE1hdGguZmxvb3Ioc2Vjb25kcyAvIDg2NDAwKTtcbiAgICAgICAgY29uc3QgaG91cnMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgODY0MDApIC8gMzYwMCk7XG4gICAgICAgIGNvbnN0IG1pbnV0ZXMgPSBNYXRoLmZsb29yKChzZWNvbmRzICUgMzYwMCkgLyA2MCk7XG4gICAgICAgIGNvbnN0IHNlY3MgPSBNYXRoLmZsb29yKHNlY29uZHMgJSA2MCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmVzdWx0ID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdHJhbnNsYXRlZCBmb3JtYXQgc3RyaW5nc1xuICAgICAgICBpZiAoZGF5cyA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X0RheXMgfHwgJyVzIGQnO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goZm9ybWF0LnJlcGxhY2UoJyVzJywgZGF5cykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChob3VycyA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1hdCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lRm9ybWF0X0hvdXJzIHx8ICclcyBoJztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIGhvdXJzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1pbnV0ZXMgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSBnbG9iYWxUcmFuc2xhdGUucHJfVGltZUZvcm1hdF9NaW51dGVzIHx8ICclcyBtJztcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGZvcm1hdC5yZXBsYWNlKCclcycsIG1pbnV0ZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2VjcyA+IDAgfHwgcmVzdWx0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX1RpbWVGb3JtYXRfU2Vjb25kcyB8fCAnJXMgcyc7XG4gICAgICAgICAgICByZXN1bHQucHVzaChmb3JtYXQucmVwbGFjZSgnJXMnLCBzZWNzKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEpvaW4gd2l0aCBzcGFjZSwgc2hvdyBtYXggMiB1bml0cyBmb3IgcmVhZGFiaWxpdHlcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5zbGljZSgwLCAyKS5qb2luKCcgJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgdGltZXN0YW1wIHRvIFwidGltZSBhZ29cIiBmb3JtYXRcbiAgICAgKi9cbiAgICBmb3JtYXRUaW1lQWdvKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpIC8gMTAwMDtcbiAgICAgICAgY29uc3QgZGlmZiA9IG5vdyAtIHRpbWVzdGFtcDtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBmb3JtYXREdXJhdGlvbiB0byBnZXQgY29uc2lzdGVudCBmb3JtYXR0aW5nIHdpdGggdHJhbnNsYXRpb25zXG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFRpbWUgPSB0aGlzLmZvcm1hdER1cmF0aW9uKGRpZmYpO1xuICAgICAgICBjb25zdCBhZ29MYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9UaW1lQWdvIHx8ICdhZ28nO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHZlcnkgcmVjZW50IHRpbWVzLCB1c2Ugc3BlY2lhbCBsYWJlbFxuICAgICAgICBpZiAoZGlmZiA8IDYwKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLnByX0p1c3ROb3cgfHwgZm9ybWF0dGVkVGltZSArICcgJyArIGFnb0xhYmVsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkVGltZSArICcgJyArIGFnb0xhYmVsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTGVnYWN5IHN0YXR1cyB1cGRhdGUgbWV0aG9kIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlUHJvdmlkZXJTdGF0dXNMZWdhY3koY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHsgcHJvdmlkZXJfaWQsIG5ld19zdGF0ZSwgb2xkX3N0YXRlIH0gPSBjaGFuZ2U7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7cHJvdmlkZXJfaWR9YCk7XG4gICAgICAgIGlmICgkcm93Lmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKTtcbiAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCgnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaW1wbGUgc3RhdHVzIGluZGljYXRvcnNcbiAgICAgICAgY29uc3QgZ3JlZW4gPSAnPGRpdiBjbGFzcz1cInVpIGdyZWVuIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG4gICAgICAgIGNvbnN0IGdyZXkgPSAnPGRpdiBjbGFzcz1cInVpIGdyZXkgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgY29uc3QgeWVsbG93ID0gJzxkaXYgY2xhc3M9XCJ1aSB5ZWxsb3cgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgY29uc3QgcmVkID0gJzxkaXYgY2xhc3M9XCJ1aSByZWQgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIC8vIEJhc2ljIHN0YXRlIG1hcHBpbmcgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFN0YXRlID0gKG5ld19zdGF0ZSB8fCAnJykudG9VcHBlckNhc2UoKTtcbiAgICAgICAgc3dpdGNoIChub3JtYWxpemVkU3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1JFR0lTVEVSRUQnOlxuICAgICAgICAgICAgY2FzZSAnT0snOlxuICAgICAgICAgICAgY2FzZSAnUkVBQ0hBQkxFJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZWVuKTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdVTlJFQUNIQUJMRSc6XG4gICAgICAgICAgICBjYXNlICdMQUdHRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoeWVsbG93KTtcbiAgICAgICAgICAgICAgICAkcm93LmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdPRkYnOlxuICAgICAgICAgICAgY2FzZSAnVU5NT05JVE9SRUQnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoZ3JleSk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnUkVKRUNURUQnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUdJU1RFUkVEJzpcbiAgICAgICAgICAgIGNhc2UgJ0ZBSUxFRCc6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChyZWQpO1xuICAgICAgICAgICAgICAgICRyb3cuZmluZCgnLmZhaWx1cmUnKS50ZXh0KG5ld19zdGF0ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoZ3JleSk7XG4gICAgICAgICAgICAgICAgJHJvdy5maW5kKCcuZmFpbHVyZScpLnRleHQobmV3X3N0YXRlIHx8ICdVbmtub3duJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhbmltYXRpb24gZm9yIGNoYW5nZVxuICAgICAgICBpZiAob2xkX3N0YXRlICE9PSBuZXdfc3RhdGUpIHtcbiAgICAgICAgICAgICRzdGF0dXNDZWxsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhbGwgcHJvdmlkZXIgc3RhdHVzZXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKiBTdXBwb3J0cyBib3RoIGxlZ2FjeSBmb3JtYXQgYW5kIG5ldyBlbmhhbmNlZCBmb3JtYXQgd2l0aCBkdXJhdGlvbnNcbiAgICAgKi9cbiAgICB1cGRhdGVBbGxQcm92aWRlclN0YXR1c2VzKHN0YXR1c2VzKSB7XG4gICAgICAgIGlmICghc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQmF0Y2ggRE9NIHVwZGF0ZXMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBjb25zdCB1cGRhdGVzID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gYnVpbGQgdXBkYXRlIG9iamVjdCBmcm9tIHByb3ZpZGVyIGRhdGFcbiAgICAgICAgY29uc3QgYnVpbGRVcGRhdGVPYmplY3QgPSAocHJvdmlkZXJJZCwgcHJvdmlkZXIsIHR5cGUpID0+ICh7XG4gICAgICAgICAgICBwcm92aWRlcl9pZDogcHJvdmlkZXJJZCxcbiAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICBzdGF0ZTogcHJvdmlkZXIuc3RhdGUsXG4gICAgICAgICAgICBuZXdfc3RhdGU6IHByb3ZpZGVyLnN0YXRlLCAvLyBGb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgb2xkX3N0YXRlOiBwcm92aWRlci5zdGF0ZSwgLy8gTm8gYW5pbWF0aW9uIGZvciBidWxrIHVwZGF0ZVxuICAgICAgICAgICAgc3RhdGVDb2xvcjogcHJvdmlkZXIuc3RhdGVDb2xvcixcbiAgICAgICAgICAgIHN0YXRlSWNvbjogcHJvdmlkZXIuc3RhdGVJY29uLFxuICAgICAgICAgICAgc3RhdGVUZXh0OiBwcm92aWRlci5zdGF0ZVRleHQsXG4gICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uOiBwcm92aWRlci5zdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbjogcHJvdmlkZXIuc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZTogcHJvdmlkZXIubGFzdFN1Y2Nlc3NUaW1lLFxuICAgICAgICAgICAgdGltZVNpbmNlTGFzdFN1Y2Nlc3M6IHByb3ZpZGVyLnRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uOiBwcm92aWRlci5zdWNjZXNzRHVyYXRpb24sXG4gICAgICAgICAgICBmYWlsdXJlRHVyYXRpb246IHByb3ZpZGVyLmZhaWx1cmVEdXJhdGlvbixcbiAgICAgICAgICAgIHJ0dDogcHJvdmlkZXIucnR0XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHN0cnVjdHVyZWQgZm9ybWF0IHdpdGggc2lwL2lheCBzZXBhcmF0aW9uXG4gICAgICAgIFsnc2lwJywgJ2lheCddLmZvckVhY2gocHJvdmlkZXJUeXBlID0+IHtcbiAgICAgICAgICAgIGlmIChzdGF0dXNlc1twcm92aWRlclR5cGVdICYmIHR5cGVvZiBzdGF0dXNlc1twcm92aWRlclR5cGVdID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0YXR1c2VzW3Byb3ZpZGVyVHlwZV0pLmZvckVhY2gocHJvdmlkZXJJZCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gc3RhdHVzZXNbcHJvdmlkZXJUeXBlXVtwcm92aWRlcklkXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVzLnB1c2goYnVpbGRVcGRhdGVPYmplY3QocHJvdmlkZXJJZCwgcHJvdmlkZXIsIHByb3ZpZGVyVHlwZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gc3RydWN0dXJlZCBmb3JtYXQgZm91bmQsIHRyeSBzaW1wbGUgb2JqZWN0IGZvcm1hdCAobGVnYWN5KVxuICAgICAgICBpZiAoIXN0YXR1c2VzLnNpcCAmJiAhc3RhdHVzZXMuaWF4ICYmIHR5cGVvZiBzdGF0dXNlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0YXR1c2VzKS5mb3JFYWNoKHByb3ZpZGVySWQgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gc3RhdHVzZXNbcHJvdmlkZXJJZF07XG4gICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaChidWlsZFVwZGF0ZU9iamVjdChwcm92aWRlcklkLCBwcm92aWRlciwgJ3Vua25vd24nKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgYWxsIHVwZGF0ZXMgZWZmaWNpZW50bHlcbiAgICAgICAgdGhpcy5wcm9jZXNzQmF0Y2hVcGRhdGVzKHVwZGF0ZXMpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBtdWx0aXBsZSBzdGF0dXMgdXBkYXRlcyBlZmZpY2llbnRseSBpbiBiYXRjaGVzXG4gICAgICovXG4gICAgcHJvY2Vzc0JhdGNoVXBkYXRlcyh1cGRhdGVzKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheSh1cGRhdGVzKSB8fCB1cGRhdGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTcGxpdCB1cGRhdGVzIGludG8gYmF0Y2hlcyBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgY29uc3QgYmF0Y2hTaXplID0gMTA7XG4gICAgICAgIGNvbnN0IGJhdGNoZXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXBkYXRlcy5sZW5ndGg7IGkgKz0gYmF0Y2hTaXplKSB7XG4gICAgICAgICAgICBiYXRjaGVzLnB1c2godXBkYXRlcy5zbGljZShpLCBpICsgYmF0Y2hTaXplKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBiYXRjaCB3aXRoIGEgc21hbGwgZGVsYXkgdG8gcHJldmVudCBibG9ja2luZyBVSVxuICAgICAgICBsZXQgYmF0Y2hJbmRleCA9IDA7XG4gICAgICAgIGNvbnN0IHByb2Nlc3NCYXRjaCA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChiYXRjaEluZGV4ID49IGJhdGNoZXMubGVuZ3RoKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gYmF0Y2hlc1tiYXRjaEluZGV4XTtcbiAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgYmF0Y2guZm9yRWFjaCh1cGRhdGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb3ZpZGVyU3RhdHVzKHVwZGF0ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYmF0Y2hJbmRleCsrO1xuICAgICAgICAgICAgICAgIGlmIChiYXRjaEluZGV4IDwgYmF0Y2hlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChwcm9jZXNzQmF0Y2gsIDEwKTsgLy8gU21hbGwgZGVsYXkgYmV0d2VlbiBiYXRjaGVzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBwcm9jZXNzQmF0Y2goKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgZW5oYW5jZWQgdXBkYXRlIG5vdGlmaWNhdGlvbiB3aXRoIHRpbWluZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIHNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSA1MDAwKSB7XG4gICAgICAgIGlmICghdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciB8fCAhdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGluZGljYXRvciA9IHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3I7XG4gICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkaW5kaWNhdG9yLmZpbmQoJy5oZWFkZXInKTtcbiAgICAgICAgY29uc3QgJHN0YXR1c01lc3NhZ2UgPSAkaW5kaWNhdG9yLmZpbmQoJy5zdGF0dXMtbWVzc2FnZScpO1xuICAgICAgICBjb25zdCAkdGltZUluZm8gPSAkaW5kaWNhdG9yLmZpbmQoJy5sYXN0LWNoZWNrLXRpbWUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjbGFzc2VzIGZvciBzdHlsaW5nXG4gICAgICAgICRpbmRpY2F0b3JcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuIGluZm8gc3VjY2VzcyBlcnJvciB3YXJuaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0eXBlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBhcHByb3ByaWF0ZSBoZWFkZXIgYmFzZWQgb24gdHlwZVxuICAgICAgICBjb25zdCBoZWFkZXJzID0ge1xuICAgICAgICAgICAgJ2luZm8nOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzSW5mbyB8fCAnU3RhdHVzIEluZm8nLFxuICAgICAgICAgICAgJ3N1Y2Nlc3MnOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlZCB8fCAnU3RhdHVzIFVwZGF0ZWQnLFxuICAgICAgICAgICAgJ2Vycm9yJzogZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c0Vycm9yIHx8ICdTdGF0dXMgRXJyb3InLFxuICAgICAgICAgICAgJ3dhcm5pbmcnOiBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzV2FybmluZyB8fCAnU3RhdHVzIFdhcm5pbmcnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAkaGVhZGVyLnRleHQoaGVhZGVyc1t0eXBlXSB8fCAnU3RhdHVzJyk7XG4gICAgICAgICRzdGF0dXNNZXNzYWdlLnRleHQobWVzc2FnZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgdGltaW5nIGluZm9ybWF0aW9uXG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICAgICR0aW1lSW5mby50ZXh0KGBMYXN0IGNoZWNrOiAke25vdy50b0xvY2FsZVRpbWVTdHJpbmcoKX1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIHVwZGF0ZSB0aW1lXG4gICAgICAgIHRoaXMubGFzdFVwZGF0ZVRpbWUgPSBEYXRlLm5vdygpIC8gMTAwMDtcbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8taGlkZSB3aXRoIGVuaGFuY2VkIHRpbWluZ1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgdGhpcy5ub3RpZmljYXRpb25UaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAkaW5kaWNhdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSwgZHVyYXRpb24pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gbWFudWFsbHkgZGlzbWlzc1xuICAgICAgICAkaW5kaWNhdG9yLm9mZignY2xpY2suZGlzbWlzcycpLm9uKCdjbGljay5kaXNtaXNzJywgKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMubm90aWZpY2F0aW9uVGltZW91dCk7XG4gICAgICAgICAgICAkaW5kaWNhdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgbGFzdCBjaGVjayB0aW1lIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVMYXN0Q2hlY2tUaW1lKHRpbWVzdGFtcCkge1xuICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUodGltZXN0YW1wICogMTAwMCk7XG4gICAgICAgIGNvbnN0IHRpbWVTdHIgPSBkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFueSBsYXN0IGNoZWNrIHRpbWUgZGlzcGxheXNcbiAgICAgICAgJCgnLnByb3ZpZGVyLWxhc3QtY2hlY2stdGltZScpLnRleHQodGltZVN0cik7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGltbWVkaWF0ZSBzdGF0dXMgdXBkYXRlIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcbiAgICAgKi9cbiAgICByZXF1ZXN0U3RhdHVzVXBkYXRlKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgaW5kaWNhdG9yXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9SZXF1ZXN0aW5nU3RhdHVzVXBkYXRlIHx8ICdSZXF1ZXN0aW5nIHN0YXR1cyB1cGRhdGUuLi4nLFxuICAgICAgICAgICAgJ2luZm8nLFxuICAgICAgICAgICAgMzAwMFxuICAgICAgICApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdmlhIFJFU1QgQVBJXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvYXBpL3N0YXR1c2VzYCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZm9yY2U6IHRydWUgLy8gRm9yY2UgaW1tZWRpYXRlIHVwZGF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByb2Nlc3MgdGhlIHN0YXR1cyBkYXRhXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQWxsUHJvdmlkZXJTdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBub3RpZmljYXRpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdmlkZXJDb3VudCA9IHRoaXMuY291bnRQcm92aWRlcnMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlQ29tcGxldGVcbiAgICAgICAgICAgICAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLnByX1N0YXR1c1VwZGF0ZUNvbXBsZXRlLnJlcGxhY2UoJyVzJywgcHJvdmlkZXJDb3VudClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYFN0YXR1cyB1cGRhdGVkIGZvciAke3Byb3ZpZGVyQ291bnR9IHByb3ZpZGVyc2A7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfU3RhdHVzVXBkYXRlRmFpbGVkIHx8ICdTdGF0dXMgdXBkYXRlIGZhaWxlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgXG4gICAgICAgICAgICAgICAgICAgID8gcmVzcG9uc2UubWVzc2FnZXMuam9pbignLCAnKVxuICAgICAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5wcl9TdGF0dXNVcGRhdGVFcnJvciB8fCAnRXJyb3IgdXBkYXRpbmcgcHJvdmlkZXIgc3RhdHVzJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTWVzc2FnZSwgJ2Vycm9yJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0Nvbm5lY3Rpb25FcnJvciB8fCAnQ29ubmVjdGlvbiBlcnJvcicsXG4gICAgICAgICAgICAgICAgICAgICdlcnJvcidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvdW50IHRvdGFsIHByb3ZpZGVycyBpbiBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIGNvdW50UHJvdmlkZXJzKHN0YXR1c0RhdGEpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNEYXRhKSByZXR1cm4gMDtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGlmIChzdGF0dXNEYXRhLnNpcCkgY291bnQgKz0gT2JqZWN0LmtleXMoc3RhdHVzRGF0YS5zaXApLmxlbmd0aDtcbiAgICAgICAgaWYgKHN0YXR1c0RhdGEuaWF4KSBjb3VudCArPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhLmlheCkubGVuZ3RoO1xuICAgICAgICBpZiAoIXN0YXR1c0RhdGEuc2lwICYmICFzdGF0dXNEYXRhLmlheCkgY291bnQgPSBPYmplY3Qua2V5cyhzdGF0dXNEYXRhKS5sZW5ndGg7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY291bnQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY2FjaGVkIHJvdyBlbGVtZW50IGZvciBwcm92aWRlclxuICAgICAqL1xuICAgIGdldENhY2hlZFJvdyhwcm92aWRlcklkKSB7XG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChwcm92aWRlcklkKTtcbiAgICAgICAgaWYgKCEkcm93IHx8ICEkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke3Byb3ZpZGVySWR9YCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KHByb3ZpZGVySWQsICRyb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcm93O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwcm92aWRlciBkZXRhaWxzIG1vZGFsL3BvcHVwXG4gICAgICovXG4gICAgc2hvd1Byb3ZpZGVyRGV0YWlscyhwcm92aWRlcklkKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfTG9hZGluZ1Byb3ZpZGVyRGV0YWlscyB8fCAnTG9hZGluZyBwcm92aWRlciBkZXRhaWxzLi4uJyxcbiAgICAgICAgICAgICdpbmZvJyxcbiAgICAgICAgICAgIDIwMDBcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZldGNoIGZyZXNoIGRldGFpbHMgZnJvbSBBUElcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9hcGkvc3RhdHVzLyR7cHJvdmlkZXJJZH1gLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBkZXRhaWxlZCBzdGF0dXMgbW9kYWwgY29udGVudFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RhbENvbnRlbnQgPSB0aGlzLmJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsKHByb3ZpZGVySWQsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBtb2RhbFxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbW9kYWwgdXNpbmcgRm9tYW50aWMgVUlcbiAgICAgICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZChtb2RhbENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkhpZGRlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9Ob1N0YXR1c0luZm8gfHwgJ05vIHN0YXR1cyBpbmZvcm1hdGlvbiBhdmFpbGFibGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3dhcm5pbmcnXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnByX0ZhaWxlZFRvTG9hZERldGFpbHMgfHwgJ0ZhaWxlZCB0byBsb2FkIHByb3ZpZGVyIGRldGFpbHMnLFxuICAgICAgICAgICAgICAgICAgICAnZXJyb3InXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkZXRhaWxlZCBzdGF0dXMgbW9kYWwgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkU3RhdHVzRGV0YWlsc01vZGFsKHByb3ZpZGVySWQsIHN0YXR1c0luZm8pIHtcbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgICAgdW5pcWlkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICBob3N0LFxuICAgICAgICAgICAgdXNlcm5hbWUsXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUNvbG9yLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGxhc3RTdWNjZXNzVGltZSxcbiAgICAgICAgICAgIHRpbWVTaW5jZUxhc3RTdWNjZXNzLFxuICAgICAgICAgICAgc3VjY2Vzc0R1cmF0aW9uLFxuICAgICAgICAgICAgZmFpbHVyZUR1cmF0aW9uLFxuICAgICAgICAgICAgcnR0LFxuICAgICAgICAgICAgc3RhdGlzdGljcyxcbiAgICAgICAgICAgIHJlY2VudEV2ZW50cyxcbiAgICAgICAgICAgIGxhc3RVcGRhdGVGb3JtYXR0ZWQsXG4gICAgICAgICAgICBzdGF0ZVN0YXJ0VGltZUZvcm1hdHRlZFxuICAgICAgICB9ID0gc3RhdHVzSW5mbztcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHN0YXRpc3RpY3Mgc2VjdGlvblxuICAgICAgICBsZXQgc3RhdHNIdG1sID0gJyc7XG4gICAgICAgIGlmIChzdGF0aXN0aWNzKSB7XG4gICAgICAgICAgICBjb25zdCB7IHRvdGFsQ2hlY2tzLCBzdWNjZXNzQ291bnQsIGZhaWx1cmVDb3VudCwgYXZhaWxhYmlsaXR5LCBhdmVyYWdlUnR0LCBtaW5SdHQsIG1heFJ0dCB9ID0gc3RhdGlzdGljcztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRvdGFsQ2hlY2tzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8aDQ+JHtnbG9iYWxUcmFuc2xhdGUucHJfU3RhdGlzdGljcyB8fCAnU3RhdGlzdGljcyd9PC9oND5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGZvdXIgY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBzdGF0aXN0aWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCI+JHt0b3RhbENoZWNrc308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfVG90YWxDaGVja3MgfHwgJ1RvdGFsIENoZWNrcyd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBncmVlbiBzdGF0aXN0aWNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInZhbHVlXCI+JHtzdWNjZXNzQ291bnR9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLnByX1N1Y2Nlc3MgfHwgJ1N1Y2Nlc3MnfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgcmVkIHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke2ZhaWx1cmVDb3VudH08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUucHJfRmFpbHVyZXMgfHwgJ0ZhaWx1cmVzJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55ICR7YXZhaWxhYmlsaXR5ID49IDk5ID8gJ2dyZWVuJyA6IGF2YWlsYWJpbGl0eSA+PSA5NSA/ICd5ZWxsb3cnIDogJ3JlZCd9IHN0YXRpc3RpY1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmFsdWVcIj4ke2F2YWlsYWJpbGl0eX0lPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0F2YWlsYWJpbGl0eSB8fCAnQXZhaWxhYmlsaXR5J308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgJHthdmVyYWdlUnR0ICE9PSBudWxsID8gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGhyZWUgY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0F2ZXJhZ2VSVFQgfHwgJ0F2ZXJhZ2UgUlRUJ306PC9zdHJvbmc+ICR7YXZlcmFnZVJ0dH0gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfTWluUlRUIHx8ICdNaW4gUlRUJ306PC9zdHJvbmc+ICR7bWluUnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9NYXhSVFQgfHwgJ01heCBSVFQnfTo8L3N0cm9uZz4gJHttYXhSdHR9IG1zXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHJlY2VudCBldmVudHMgc2VjdGlvblxuICAgICAgICBsZXQgZXZlbnRzSHRtbCA9ICcnO1xuICAgICAgICBpZiAocmVjZW50RXZlbnRzICYmIHJlY2VudEV2ZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBldmVudFJvd3MgPSByZWNlbnRFdmVudHMuc2xpY2UoMCwgNSkubWFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBldmVudFR5cGUgPSBldmVudC50eXBlID09PSAnZXJyb3InID8gJ3JlZCcgOiBldmVudC50eXBlID09PSAnd2FybmluZycgPyAneWVsbG93JyA6ICdncmVlbic7XG4gICAgICAgICAgICAgICAgY29uc3QgZXZlbnRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW2V2ZW50LmV2ZW50XSB8fCBldmVudC5ldmVudCB8fCBldmVudC5zdGF0ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCIke2V2ZW50VHlwZX0gY2lyY2xlIGljb25cIj48L2k+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke2V2ZW50LmRhdGV9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD4ke2V2ZW50VGV4dH08L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPiR7ZXZlbnQuc3RhdGV9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSkuam9pbignJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGV2ZW50c0h0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxoND4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9SZWNlbnRFdmVudHMgfHwgJ1JlY2VudCBFdmVudHMnfTwvaDQ+XG4gICAgICAgICAgICAgICAgPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBiYXNpYyBjb21wYWN0IHRhYmxlXCI+XG4gICAgICAgICAgICAgICAgICAgIDx0Ym9keT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7ZXZlbnRSb3dzfVxuICAgICAgICAgICAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBpZD1cInByb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsXCIgY2xhc3M9XCJ1aSBsYXJnZSBtb2RhbFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke3N0YXRlQ29sb3J9IGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2Rlc2NyaXB0aW9uIHx8IHVuaXFpZH1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudHNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGg0PiR7Z2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySW5mbyB8fCAnUHJvdmlkZXIgSW5mb3JtYXRpb24nfTwvaDQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHR3byBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJJZCB8fCAnUHJvdmlkZXIgSUQnfTo8L3N0cm9uZz4gJHt1bmlxaWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9Ib3N0IHx8ICdIb3N0J306PC9zdHJvbmc+ICR7aG9zdH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX1VzZXJuYW1lIHx8ICdVc2VybmFtZSd9Ojwvc3Ryb25nPiAke3VzZXJuYW1lfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGlzdFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpdGVtXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzdHJvbmc+JHtnbG9iYWxUcmFuc2xhdGUucHJfQ3VycmVudFN0YXRlIHx8ICdDdXJyZW50IFN0YXRlJ306PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInVpICR7c3RhdGVDb2xvcn0gdGV4dFwiPiR7Z2xvYmFsVHJhbnNsYXRlW3N0YXRlRGVzY3JpcHRpb25dIHx8IHN0YXRlfTwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXRlbVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX1N0YXRlRHVyYXRpb24gfHwgJ1N0YXRlIER1cmF0aW9uJ306PC9zdHJvbmc+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RoaXMuZm9ybWF0RHVyYXRpb24oc3RhdGVEdXJhdGlvbil9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtydHQgIT09IG51bGwgJiYgcnR0ICE9PSB1bmRlZmluZWQgPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIml0ZW1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9DdXJyZW50UlRUIHx8ICdDdXJyZW50IFJUVCd9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gc3R5bGU9XCJjb2xvcjogJHtydHQgPiAyMDAgPyAncmVkJyA6IHJ0dCA+IDEwMCA/ICdvcmFuZ2UnIDogJ2dyZWVuJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7cnR0fSBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7bGFzdFN1Y2Nlc3NUaW1lID8gYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHR3byBjb2x1bW4gZ3JpZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7Z2xvYmFsVHJhbnNsYXRlLnByX0xhc3RTdWNjZXNzIHx8ICdMYXN0IFN1Y2Nlc3MnfTo8L3N0cm9uZz4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke3RoaXMuZm9ybWF0VGltZUFnbyhsYXN0U3VjY2Vzc1RpbWUpfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke2dsb2JhbFRyYW5zbGF0ZS5wcl9MYXN0VXBkYXRlIHx8ICdMYXN0IFVwZGF0ZSd9Ojwvc3Ryb25nPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7bGFzdFVwZGF0ZUZvcm1hdHRlZCB8fCBuZXcgRGF0ZSgpLnRvTG9jYWxlU3RyaW5nKCl9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtzdGF0c0h0bWx9XG4gICAgICAgICAgICAgICAgICAgICAgICAke2V2ZW50c0h0bWx9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJhY3Rpb25zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBidXR0b25cIiBvbmNsaWNrPVwid2luZG93LmxvY2F0aW9uLmhyZWY9JyR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5LyR7dW5pcWlkfSdcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZWRpdCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUucHJfRWRpdFByb3ZpZGVyIHx8ICdFZGl0IFByb3ZpZGVyJ31cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBwcmltYXJ5IGJ1dHRvblwiIG9uY2xpY2s9XCJQcm92aWRlclN0YXR1c01vbml0b3IucmVxdWVzdFByb3ZpZGVyQ2hlY2soJyR7dW5pcWlkfScpXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0NoZWNrTm93IHx8ICdDaGVjayBOb3cnfVxuICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNhbmNlbCBidXR0b25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLnByX0Nsb3NlIHx8ICdDbG9zZSd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGltbWVkaWF0ZSBjaGVjayBmb3Igc3BlY2lmaWMgcHJvdmlkZXJcbiAgICAgKi9cbiAgICByZXF1ZXN0UHJvdmlkZXJDaGVjayhwcm92aWRlcklkKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvYXBpL3N0YXR1cy8ke3Byb3ZpZGVySWR9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgZm9yY2VDaGVjazogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZWZyZXNoRnJvbUFtaTogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfQ2hlY2tSZXF1ZXN0ZWQgfHwgJ0NoZWNrIHJlcXVlc3RlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnc3VjY2VzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAyMDAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbW9kYWwgd2l0aCBmcmVzaCBkYXRhIGlmIHN0aWxsIG9wZW5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCQoJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcpLmxlbmd0aCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB1cGRhdGVkIG1vZGFsIHdpdGggZnJlc2ggZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kYWxDb250ZW50ID0gdGhpcy5idWlsZFN0YXR1c0RldGFpbHNNb2RhbChwcm92aWRlcklkLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItc3RhdHVzLWRldGFpbHMtbW9kYWwnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKG1vZGFsQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXN0YXR1cy1kZXRhaWxzLW1vZGFsJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25IaWRkZW46IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9DaGVja0ZhaWxlZCB8fCAnQ2hlY2sgZmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Vycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgMzAwMFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8vIEVuaGFuY2VkIGluaXRpYWxpemF0aW9uIHdpdGggdXNlciBpbnRlcmFjdGlvbiBzdXBwb3J0XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgLy8gQWRkIG1hbnVhbCByZWZyZXNoIGJ1dHRvbiBpZiBub3QgZXhpc3RzXG4gICAgaWYgKCQoJy5wcm92aWRlci1yZWZyZXNoLWJ0bicpLmxlbmd0aCA9PT0gMCAmJiAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgcmVmcmVzaEJ1dHRvbiA9IGBcbiAgICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJ1aSBtaW5pIGxhYmVsZWQgaWNvbiBidXR0b24gcHJvdmlkZXItcmVmcmVzaC1idG5cIiBcbiAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJwb3NpdGlvbjogYWJzb2x1dGU7IHRvcDogMTBweDsgcmlnaHQ6IDEwcHg7IHotaW5kZXg6IDEwMDtcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5wcl9SZWZyZXNoU3RhdHVzIHx8ICdSZWZyZXNoIFN0YXR1cyd9XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgYDtcbiAgICAgICAgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykuY3NzKCdwb3NpdGlvbicsICdyZWxhdGl2ZScpLmFwcGVuZChyZWZyZXNoQnV0dG9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIGZvciByZWZyZXNoIGJ1dHRvblxuICAgICAgICAkKCcucHJvdmlkZXItcmVmcmVzaC1idG4nKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBQcm92aWRlclN0YXR1c01vbml0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgUHJvdmlkZXJTdGF0dXNNb25pdG9yLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8vIEFkZCBkb3VibGUtY2xpY2sgaGFuZGxlcnMgZm9yIHN0YXR1cyBjZWxscyB0byBzaG93IGRldGFpbHMgbW9kYWxcbiAgICAkKGRvY3VtZW50KS5vbignZGJsY2xpY2snLCAnLnByb3ZpZGVyLXN0YXR1cyAudWkubGFiZWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgaWYgKHByb3ZpZGVySWQgJiYgdHlwZW9mIFByb3ZpZGVyU3RhdHVzTW9uaXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIFByb3ZpZGVyU3RhdHVzTW9uaXRvci5zaG93UHJvdmlkZXJEZXRhaWxzKHByb3ZpZGVySWQpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgXG4gICAgLy8gQ2xlYW4gdXAgbW9kYWxzIHdoZW4gdGhleSdyZSBoaWRkZW5cbiAgICAkKGRvY3VtZW50KS5vbignaGlkZGVuLmJzLm1vZGFsJywgJyNwcm92aWRlci1zdGF0dXMtZGV0YWlscy1tb2RhbCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkKHRoaXMpLnJlbW92ZSgpO1xuICAgIH0pO1xufSk7XG5cbi8vIERvbid0IGF1dG8taW5pdGlhbGl6ZSB0aGUgbW9uaXRvciBoZXJlIC0gbGV0IHByb3ZpZGVycy1pbmRleC5qcyBoYW5kbGUgaXRcbi8vIFRoaXMgYWxsb3dzIGZvciBwcm9wZXIgc2VxdWVuY2luZyB3aXRoIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuUHJvdmlkZXJTdGF0dXNNb25pdG9yID0gUHJvdmlkZXJTdGF0dXNNb25pdG9yOyJdfQ==