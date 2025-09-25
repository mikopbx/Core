"use strict";

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

/* global globalRootUrl, globalTranslate, EventBus, SipAPI */

/**
 * Extension Index Status Monitor
 * Simple extension status monitoring for extensions index page:
 * - Shows basic online/offline/unknown status indicators
 * - Real-time status updates via EventBus
 * - Backend-provided display properties (no hardcoded state mapping)
 * - Detailed status monitoring is handled in extension-modify-status-monitor.js
 */
var ExtensionIndexStatusMonitor = {
  channelId: 'extension-status',
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
   * Initialize the extension status monitor with enhanced features
   */
  initialize: function initialize() {
    if (this.isInitialized) {
      return;
    } // Cache DOM elements for performance


    this.cacheElements(); // Create simple status indicator

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

    this.$statusCells = $('.extension-status, .extension-status-cell'); // Cache extension rows for quick access

    $('tr.extension-row, tr[id]').each(function (index, element) {
      var $row = $(element);
      var id = $row.attr('id') || $row.attr('data-value');

      if (id) {
        _this.cachedRows.set(id, $row);

        var $statusCell = $row.find('.extension-status');

        if ($statusCell.length) {
          _this.cachedStatusCells.set(id, $statusCell);
        }
      }
    });
  },

  /**
   * Create simple status indicator
   */
  createStatusIndicator: function createStatusIndicator() {
    if ($('#extension-status-indicator').length === 0) {
      var indicator = "\n                <div id=\"extension-status-indicator\" class=\"ui mini message hidden\">\n                    <i class=\"sync alternate icon\"></i>\n                    <div class=\"content\">\n                        <span class=\"status-message\"></span>\n                    </div>\n                </div>\n            ";
      $('.ui.container.segment').prepend(indicator);
    }

    this.$lastUpdateIndicator = $('#extension-status-indicator');
  },

  /**
   * Subscribe to EventBus for real-time updates
   */
  subscribeToEvents: function subscribeToEvents() {
    var _this2 = this;

    if (typeof EventBus !== 'undefined') {
      EventBus.subscribe('extension-status', function (message) {
        _this2.handleEventBusMessage(message);
      });
    } // EventBus not available, extension status monitor will work without real-time updates

  },

  /**
   * Setup periodic health checks and cache maintenance
   */
  setupHealthChecks: function setupHealthChecks() {
    var _this3 = this;

    // Refresh cache every 30 seconds to handle dynamic content
    setInterval(function () {
      _this3.refreshCache();
    }, 30000); // Request status update every 2 minutes as fallback

    setInterval(function () {
      _this3.requestStatusUpdate();
    }, 120000);
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
    } // EventBus now sends data directly without double nesting


    var event = message.event;
    var data = message;

    if (!event) {
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
    this.$lastUpdateIndicator.find('.content').text(data.message || globalTranslate.ex_CheckingExtensionStatuses); // Auto-hide after 3 seconds

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
      _this5.updateExtensionStatus(change);
    }); // Show update notification

    var changeCount = data.changes.length;
    var message = changeCount === 1 ? globalTranslate.ex_OneExtensionStatusChanged : globalTranslate.ex_MultipleExtensionStatusesChanged.replace('%s', changeCount);
    this.showUpdateNotification(message, 'success');
  },

  /**
   * Process complete status data
   */
  processCompleteStatus: function processCompleteStatus(data) {
    if (!data.statuses) {
      return;
    } // Update all extension statuses on the page (this will also update cache)


    this.updateAllExtensionStatuses(data.statuses);
  },

  /**
   * Handle status error
   */
  handleStatusError: function handleStatusError(data) {
    var errorMsg = data.error || globalTranslate.ex_StatusCheckFailed;
    this.showUpdateNotification(errorMsg, 'error');
  },

  /**
   * Update single extension status using backend-provided display properties
   */
  updateExtensionStatus: function updateExtensionStatus(change) {
    var extension = change.extension,
        type = change.type,
        state = change.state,
        stateColor = change.stateColor,
        stateIcon = change.stateIcon,
        stateText = change.stateText,
        stateDescription = change.stateDescription,
        stateDuration = change.stateDuration,
        deviceCount = change.deviceCount,
        availableDevices = change.availableDevices,
        devices = change.devices;
    var extensionId = extension; // Use cached elements for better performance

    var $row = this.cachedRows.get(extensionId);

    if (!$row) {
      // Try multiple selectors for extension rows
      $row = $("#".concat(extensionId, ", tr[data-value=\"").concat(extensionId, "\"], tr.extension-row[id=\"").concat(extensionId, "\"]"));

      if ($row.length > 0) {
        this.cachedRows.set(extensionId, $row);
      } else {
        return; // Row not found
      }
    }

    var $statusCell = this.cachedStatusCells.get(extensionId);

    if (!$statusCell) {
      $statusCell = $row.find('.extension-status');

      if ($statusCell.length > 0) {
        this.cachedStatusCells.set(extensionId, $statusCell);
      } else {
        return; // Status cell not found
      }
    }

    var previousState = $statusCell.data('prev-state'); // Use backend-provided display properties directly for simple status

    if (stateColor) {
      // Simple status indicator without detailed tooltips
      var statusHtml = "\n                <div class=\"ui ".concat(stateColor, " empty circular label\" \n                     style=\"width: 1px;height: 1px;\"\n                     title=\"Extension ").concat(extensionId, ": ").concat(stateText || state, "\">\n                </div>\n            "); // Update DOM

      requestAnimationFrame(function () {
        $statusCell.html(statusHtml); // Animate if state changed

        if (previousState && previousState !== state) {
          $statusCell.transition('pulse');
        } // Store current state for future comparison


        $statusCell.data('prev-state', state);
      });
    }
  },

  /**
   * Update all extension statuses with simple display
   */
  updateAllExtensionStatuses: function updateAllExtensionStatuses(statuses) {
    var _this6 = this;

    if (!statuses) {
      return;
    } // Update cache first


    this.statusCache = statuses; // Process each extension status

    Object.keys(statuses).forEach(function (extensionId) {
      var extensionData = statuses[extensionId];

      if (extensionData) {
        var stateColor = _this6.getColorForStatus(extensionData.status);

        _this6.updateExtensionStatus({
          extension: extensionId,
          state: extensionData.status,
          stateColor: stateColor
        });
      }
    });
  },

  /**
   * Apply cached statuses to all visible rows
   */
  applyStatusesToVisibleRows: function applyStatusesToVisibleRows() {
    var _this7 = this;

    if (!this.statusCache || Object.keys(this.statusCache).length === 0) {
      return;
    } // Find all visible extension rows


    $('tr.extension-row').each(function (index, element) {
      var $row = $(element);
      var extensionId = $row.attr('id') || $row.attr('data-value');

      if (extensionId && _this7.statusCache[extensionId]) {
        var cachedStatus = _this7.statusCache[extensionId];

        var stateColor = _this7.getColorForStatus(cachedStatus.status);

        var $statusCell = $row.find('.extension-status');

        if ($statusCell.length && $statusCell.find('.circular.label').length === 0) {
          // Only apply if status not already set
          var statusHtml = "\n                        <div class=\"ui ".concat(stateColor, " empty circular label\" \n                             style=\"width: 1px;height: 1px;\"\n                             title=\"Extension ").concat(extensionId, ": ").concat(cachedStatus.status, "\">\n                        </div>\n                    ");
          $statusCell.html(statusHtml);
        }
      }
    });
  },

  /**
   * Request statuses only for extensions not in cache
   */
  requestStatusesForNewExtensions: function requestStatusesForNewExtensions() {
    var _this8 = this;

    var newExtensions = []; // Find all visible extension rows

    $('tr.extension-row').each(function (index, element) {
      var $row = $(element);
      var extensionId = $row.attr('id') || $row.attr('data-value');

      if (extensionId && !_this8.statusCache[extensionId]) {
        // Extension not in cache, add to list
        newExtensions.push(extensionId);
      }
    }); // If we have new extensions, request their statuses

    if (newExtensions.length > 0) {
      // Request status for new extensions
      if (typeof SipAPI !== 'undefined') {
        SipAPI.getStatuses({
          simplified: true
        }, function (response) {
          if (response && response.result && response.data) {
            // Merge new statuses into cache
            Object.assign(_this8.statusCache, response.data); // Apply statuses to visible rows

            _this8.applyStatusesToVisibleRows();
          }
        });
      }
    }
  },

  /**
   * Get color for status value
   */
  getColorForStatus: function getColorForStatus(status) {
    switch (status) {
      case 'Available':
        return 'green';

      case 'Unavailable':
        return 'grey';

      case 'Disabled':
        return 'grey';

      default:
        return 'grey';
    }
  },

  /**
   * Show simple update notification
   */
  showUpdateNotification: function showUpdateNotification(message) {
    var _this9 = this;

    var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    var duration = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 3000;

    if (!this.$lastUpdateIndicator || !this.$lastUpdateIndicator.length) {
      return;
    }

    var $indicator = this.$lastUpdateIndicator;
    var $statusMessage = $indicator.find('.status-message'); // Update classes for styling

    $indicator.removeClass('hidden info success error warning').addClass(type);
    $statusMessage.text(message); // Auto-hide

    clearTimeout(this.notificationTimeout);
    this.notificationTimeout = setTimeout(function () {
      $indicator.addClass('hidden');
    }, duration); // Add click handler to manually dismiss

    $indicator.off('click.dismiss').on('click.dismiss', function () {
      clearTimeout(_this9.notificationTimeout);
      $indicator.addClass('hidden');
    });
  },

  /**
   * Request immediate status update
   */
  requestStatusUpdate: function requestStatusUpdate() {
    var _this10 = this;

    // Request status via SipAPI if available
    if (typeof SipAPI !== 'undefined') {
      SipAPI.getStatuses(function (response) {
        if (response && response.result && response.data) {
          _this10.updateAllExtensionStatuses(response.data);
        }
      });
    } else {
      // Fallback to direct REST API call
      $.api({
        url: "".concat(globalRootUrl, "pbxcore/api/extensions/getStatuses"),
        method: 'POST',
        data: {
          action: 'getStatuses',
          data: {}
        },
        on: 'now',
        onSuccess: function onSuccess(response) {
          if (response.result && response.data) {
            _this10.updateAllExtensionStatuses(response.data);
          }
        }
      });
    }
  },

  /**
   * Get cached row element for extension
   */
  getCachedRow: function getCachedRow(extensionId) {
    var $row = this.cachedRows.get(extensionId);

    if (!$row || !$row.length) {
      $row = $("#".concat(extensionId, ", tr[data-value=\"").concat(extensionId, "\"]"));

      if ($row.length) {
        this.cachedRows.set(extensionId, $row);
      }
    }

    return $row;
  }
}; // Simple initialization without extra UI elements

$(document).ready(function () {
  // Add double-click handlers for status cells to navigate to extension modify
  $(document).on('dblclick', '.extension-status .ui.label', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var extensionId = $(this).closest('tr').attr('id') || $(this).closest('tr').attr('data-value');
    var databaseId = $(this).closest('tr').attr('data-extension-id');

    if (databaseId) {
      // Navigate to extension modify page for detailed status
      window.location.href = "".concat(globalRootUrl, "extensions/modify/").concat(databaseId);
    }
  });
}); // Don't auto-initialize the monitor here - let extensions-index.js handle it
// This allows for proper sequencing with DataTable initialization
// Export for use in other modules

window.ExtensionIndexStatusMonitor = ExtensionIndexStatusMonitor;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1pbmRleC1zdGF0dXMtbW9uaXRvci5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJjaGFubmVsSWQiLCJpc0luaXRpYWxpemVkIiwibGFzdFVwZGF0ZVRpbWUiLCJzdGF0dXNDYWNoZSIsIiRzdGF0dXNDZWxscyIsIiRsYXN0VXBkYXRlSW5kaWNhdG9yIiwiY2FjaGVkUm93cyIsIk1hcCIsImNhY2hlZFN0YXR1c0NlbGxzIiwiaW5pdGlhbGl6ZSIsImNhY2hlRWxlbWVudHMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIiwic2V0VGltZW91dCIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwibm93IiwiZm9yRWFjaCIsImNoYW5nZSIsInVwZGF0ZUV4dGVuc2lvblN0YXR1cyIsImNoYW5nZUNvdW50IiwiZXhfT25lRXh0ZW5zaW9uU3RhdHVzQ2hhbmdlZCIsImV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIiwicmVwbGFjZSIsInNob3dVcGRhdGVOb3RpZmljYXRpb24iLCJzdGF0dXNlcyIsInVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzIiwiZXJyb3JNc2ciLCJlcnJvciIsImV4X1N0YXR1c0NoZWNrRmFpbGVkIiwiZXh0ZW5zaW9uIiwidHlwZSIsInN0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlSWNvbiIsInN0YXRlVGV4dCIsInN0YXRlRGVzY3JpcHRpb24iLCJzdGF0ZUR1cmF0aW9uIiwiZGV2aWNlQ291bnQiLCJhdmFpbGFibGVEZXZpY2VzIiwiZGV2aWNlcyIsImV4dGVuc2lvbklkIiwiZ2V0IiwicHJldmlvdXNTdGF0ZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwidHJhbnNpdGlvbiIsIk9iamVjdCIsImtleXMiLCJleHRlbnNpb25EYXRhIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCJhcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cyIsImNhY2hlZFN0YXR1cyIsInJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMiLCJuZXdFeHRlbnNpb25zIiwicHVzaCIsIlNpcEFQSSIsImdldFN0YXR1c2VzIiwic2ltcGxpZmllZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiYXNzaWduIiwiZHVyYXRpb24iLCIkaW5kaWNhdG9yIiwiJHN0YXR1c01lc3NhZ2UiLCJjbGVhclRpbWVvdXQiLCJub3RpZmljYXRpb25UaW1lb3V0Iiwib2ZmIiwib24iLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiYWN0aW9uIiwib25TdWNjZXNzIiwiZ2V0Q2FjaGVkUm93IiwiZG9jdW1lbnQiLCJyZWFkeSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsImNsb3Nlc3QiLCJkYXRhYmFzZUlkIiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIl0s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QUkzRCxJQUFJLENBQUNNLE1BQVQsRUFBaUI7QUFDYixhQUFLbEIsVUFBTCxDQUFnQmUsR0FBaEIsQ0FBb0J3RCxXQUFwQixFQUFpQzNELElBQWpDO0FBQ0g7QUFDSjs7QUFDRCxXQUFPQSxJQUFQO0FBQ0g7QUFyZCtCLENBQXBDLEMsQ0F3ZEE7O0FBQ0FKLENBQUMsQ0FBQ29HLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI7QUFDQXJHLEVBQUFBLENBQUMsQ0FBQ29HLFFBQUQsQ0FBRCxDQUFZUixFQUFaLENBQWUsVUFBZixFQUEyQiw2QkFBM0IsRUFBMEQsVUFBU1UsQ0FBVCxFQUFZO0FBQ2xFQSxJQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQUQsSUFBQUEsQ0FBQyxDQUFDRSxlQUFGO0FBRUEsUUFBTXpDLFdBQVcsR0FBRy9ELENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXlHLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0JuRyxJQUF0QixDQUEyQixJQUEzQixLQUFvQ04sQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFReUcsT0FBUixDQUFnQixJQUFoQixFQUFzQm5HLElBQXRCLENBQTJCLFlBQTNCLENBQXhEO0FBQ0EsUUFBTW9HLFVBQVUsR0FBRzFHLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXlHLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0JuRyxJQUF0QixDQUEyQixtQkFBM0IsQ0FBbkI7O0FBRUEsUUFBSW9HLFVBQUosRUFBZ0I7QUFDWjtBQUNBQyxNQUFBQSxNQUFNLENBQUNDLFFBQVAsQ0FBZ0JDLElBQWhCLGFBQTBCZCxhQUExQiwrQkFBNERXLFVBQTVEO0FBQ0g7QUFDSixHQVhEO0FBWUgsQ0FkRCxFLENBZ0JBO0FBQ0E7QUFFQTs7QUFDQUMsTUFBTSxDQUFDMUgsMkJBQVAsR0FBcUNBLDJCQUFyQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEV2ZW50QnVzLCBTaXBBUEkgKi9cblxuLyoqXG4gKiBFeHRlbnNpb24gSW5kZXggU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbnMgaW5kZXggcGFnZTpcbiAqIC0gU2hvd3MgYmFzaWMgb25saW5lL29mZmxpbmUvdW5rbm93biBzdGF0dXMgaW5kaWNhdG9yc1xuICogLSBSZWFsLXRpbWUgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRGV0YWlsZWQgc3RhdHVzIG1vbml0b3JpbmcgaXMgaGFuZGxlZCBpbiBleHRlbnNpb24tbW9kaWZ5LXN0YXR1cy1tb25pdG9yLmpzXG4gKi9cbmNvbnN0IEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdleHRlbnNpb24tc3RhdHVzJyxcbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBsYXN0VXBkYXRlVGltZTogMCxcbiAgICBzdGF0dXNDYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHNcbiAgICAgKi9cbiAgICAkc3RhdHVzQ2VsbHM6IG51bGwsXG4gICAgJGxhc3RVcGRhdGVJbmRpY2F0b3I6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRE9NIGNhY2hlIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZWRSb3dzOiBuZXcgTWFwKCksXG4gICAgY2FjaGVkU3RhdHVzQ2VsbHM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3Igd2l0aCBlbmhhbmNlZCBmZWF0dXJlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLmV4dGVuc2lvbi1zdGF0dXMsIC5leHRlbnNpb24tc3RhdHVzLWNlbGwnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIGV4dGVuc2lvbiByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkcm93LmF0dHIoJ2lkJykgfHwgJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGlkLCAkcm93KTtcbiAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KGlkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZVN0YXR1c0luZGljYXRvcigpIHtcbiAgICAgICAgaWYgKCQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJleHRlbnNpb24tc3RhdHVzLWluZGljYXRvclwiIGNsYXNzPVwidWkgbWluaSBtZXNzYWdlIGhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy1tZXNzYWdlXCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5wcmVwZW5kKGluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciA9ICQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdCBhdmFpbGFibGUsIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvciB3aWxsIHdvcmsgd2l0aG91dCByZWFsLXRpbWUgdXBkYXRlc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrcyBhbmQgY2FjaGUgbWFpbnRlbmFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEhlYWx0aENoZWNrcygpIHtcbiAgICAgICAgLy8gUmVmcmVzaCBjYWNoZSBldmVyeSAzMCBzZWNvbmRzIHRvIGhhbmRsZSBkeW5hbWljIGNvbnRlbnRcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoQ2FjaGUoKTtcbiAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdXBkYXRlIGV2ZXJ5IDIgbWludXRlcyBhcyBmYWxsYmFja1xuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgfSwgMTIwMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggY2FjaGVkIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIHJlZnJlc2hDYWNoZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZWRSb3dzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuY2xlYXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jaGVjayc6XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBjaGVja2luZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBzaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSkge1xuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBlcnJvciBzdWNjZXNzJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnaW5mbycpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuZmluZCgnLmNvbnRlbnQnKVxuICAgICAgICAgICAgLnRleHQoZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wIHx8IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gdGltZXN0YW1wO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoYW5nZVxuICAgICAgICBkYXRhLmNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXMoY2hhbmdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgICAgY29uc3QgY2hhbmdlQ291bnQgPSBkYXRhLmNoYW5nZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gY2hhbmdlQ291bnQgPT09IDFcbiAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLmV4X09uZUV4dGVuc2lvblN0YXR1c0NoYW5nZWRcbiAgICAgICAgICAgIDogZ2xvYmFsVHJhbnNsYXRlLmV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkLnJlcGxhY2UoJyVzJywgY2hhbmdlQ291bnQpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIGV4dGVuc2lvbiBzdGF0dXNlcyBvbiB0aGUgcGFnZSAodGhpcyB3aWxsIGFsc28gdXBkYXRlIGNhY2hlKVxuICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKGRhdGEuc3RhdHVzZXMpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN0YXR1cyBlcnJvclxuICAgICAqL1xuICAgIGhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9TdGF0dXNDaGVja0ZhaWxlZDtcbiAgICAgICAgdGhpcy5zaG93VXBkYXRlTm90aWZpY2F0aW9uKGVycm9yTXNnLCAnZXJyb3InKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzaW5nbGUgZXh0ZW5zaW9uIHN0YXR1cyB1c2luZyBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllc1xuICAgICAqL1xuICAgIHVwZGF0ZUV4dGVuc2lvblN0YXR1cyhjaGFuZ2UpIHtcbiAgICAgICAgY29uc3QgeyBcbiAgICAgICAgICAgIGV4dGVuc2lvbixcbiAgICAgICAgICAgIHR5cGUsIFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBzdGF0ZUNvbG9yLCBcbiAgICAgICAgICAgIHN0YXRlSWNvbiwgXG4gICAgICAgICAgICBzdGF0ZVRleHQsIFxuICAgICAgICAgICAgc3RhdGVEZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHN0YXRlRHVyYXRpb24sXG4gICAgICAgICAgICBkZXZpY2VDb3VudCxcbiAgICAgICAgICAgIGF2YWlsYWJsZURldmljZXMsXG4gICAgICAgICAgICBkZXZpY2VzXG4gICAgICAgIH0gPSBjaGFuZ2U7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9IGV4dGVuc2lvbjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjYWNoZWQgZWxlbWVudHMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgJHJvdyA9IHRoaXMuY2FjaGVkUm93cy5nZXQoZXh0ZW5zaW9uSWQpO1xuICAgICAgICBpZiAoISRyb3cpIHtcbiAgICAgICAgICAgIC8vIFRyeSBtdWx0aXBsZSBzZWxlY3RvcnMgZm9yIGV4dGVuc2lvbiByb3dzXG4gICAgICAgICAgICAkcm93ID0gJChgIyR7ZXh0ZW5zaW9uSWR9LCB0cltkYXRhLXZhbHVlPVwiJHtleHRlbnNpb25JZH1cIl0sIHRyLmV4dGVuc2lvbi1yb3dbaWQ9XCIke2V4dGVuc2lvbklkfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRyb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoZXh0ZW5zaW9uSWQsICRyb3cpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFJvdyBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0ICRzdGF0dXNDZWxsID0gdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5nZXQoZXh0ZW5zaW9uSWQpO1xuICAgICAgICBpZiAoISRzdGF0dXNDZWxsKSB7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5zZXQoZXh0ZW5zaW9uSWQsICRzdGF0dXNDZWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBTdGF0dXMgY2VsbCBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJldmlvdXNTdGF0ZSA9ICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBkaXJlY3RseSBmb3Igc2ltcGxlIHN0YXR1c1xuICAgICAgICBpZiAoc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgLy8gU2ltcGxlIHN0YXR1cyBpbmRpY2F0b3Igd2l0aG91dCBkZXRhaWxlZCB0b29sdGlwc1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiXG4gICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkV4dGVuc2lvbiAke2V4dGVuc2lvbklkfTogJHtzdGF0ZVRleHQgfHwgc3RhdGV9XCI+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgRE9NXG4gICAgICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoc3RhdHVzSHRtbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQW5pbWF0ZSBpZiBzdGF0ZSBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzU3RhdGUgJiYgcHJldmlvdXNTdGF0ZSAhPT0gc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU3RvcmUgY3VycmVudCBzdGF0ZSBmb3IgZnV0dXJlIGNvbXBhcmlzb25cbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5kYXRhKCdwcmV2LXN0YXRlJywgc3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhbGwgZXh0ZW5zaW9uIHN0YXR1c2VzIHdpdGggc2ltcGxlIGRpc3BsYXlcbiAgICAgKi9cbiAgICB1cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhzdGF0dXNlcykge1xuICAgICAgICBpZiAoIXN0YXR1c2VzKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjYWNoZSBmaXJzdFxuICAgICAgICB0aGlzLnN0YXR1c0NhY2hlID0gc3RhdHVzZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggZXh0ZW5zaW9uIHN0YXR1c1xuICAgICAgICBPYmplY3Qua2V5cyhzdGF0dXNlcykuZm9yRWFjaChleHRlbnNpb25JZCA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25EYXRhID0gc3RhdHVzZXNbZXh0ZW5zaW9uSWRdO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbkRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZUNvbG9yID0gdGhpcy5nZXRDb2xvckZvclN0YXR1cyhleHRlbnNpb25EYXRhLnN0YXR1cyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXMoe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZTogZXh0ZW5zaW9uRGF0YS5zdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlQ29sb3I6IHN0YXRlQ29sb3JcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBcHBseSBjYWNoZWQgc3RhdHVzZXMgdG8gYWxsIHZpc2libGUgcm93c1xuICAgICAqL1xuICAgIGFwcGx5U3RhdHVzZXNUb1Zpc2libGVSb3dzKCkge1xuICAgICAgICBpZiAoIXRoaXMuc3RhdHVzQ2FjaGUgfHwgT2JqZWN0LmtleXModGhpcy5zdGF0dXNDYWNoZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIHZpc2libGUgZXh0ZW5zaW9uIHJvd3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdycpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJHJvdy5hdHRyKCdpZCcpIHx8ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uSWQgJiYgdGhpcy5zdGF0dXNDYWNoZVtleHRlbnNpb25JZF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYWNoZWRTdGF0dXMgPSB0aGlzLnN0YXR1c0NhY2hlW2V4dGVuc2lvbklkXTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ZUNvbG9yID0gdGhpcy5nZXRDb2xvckZvclN0YXR1cyhjYWNoZWRTdGF0dXMuc3RhdHVzKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoICYmICRzdGF0dXNDZWxsLmZpbmQoJy5jaXJjdWxhci5sYWJlbCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFwcGx5IGlmIHN0YXR1cyBub3QgYWxyZWFkeSBzZXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXRlQ29sb3J9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkV4dGVuc2lvbiAke2V4dGVuc2lvbklkfTogJHtjYWNoZWRTdGF0dXMuc3RhdHVzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwoc3RhdHVzSHRtbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3Qgc3RhdHVzZXMgb25seSBmb3IgZXh0ZW5zaW9ucyBub3QgaW4gY2FjaGVcbiAgICAgKi9cbiAgICByZXF1ZXN0U3RhdHVzZXNGb3JOZXdFeHRlbnNpb25zKCkge1xuICAgICAgICBjb25zdCBuZXdFeHRlbnNpb25zID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFsbCB2aXNpYmxlIGV4dGVuc2lvbiByb3dzXG4gICAgICAgICQoJ3RyLmV4dGVuc2lvbi1yb3cnKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICRyb3cuYXR0cignaWQnKSB8fCAkcm93LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbklkICYmICF0aGlzLnN0YXR1c0NhY2hlW2V4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBub3QgaW4gY2FjaGUsIGFkZCB0byBsaXN0XG4gICAgICAgICAgICAgICAgbmV3RXh0ZW5zaW9ucy5wdXNoKGV4dGVuc2lvbklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIG5ldyBleHRlbnNpb25zLCByZXF1ZXN0IHRoZWlyIHN0YXR1c2VzXG4gICAgICAgIGlmIChuZXdFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIGZvciBuZXcgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBTaXBBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgU2lwQVBJLmdldFN0YXR1c2VzKHsgc2ltcGxpZmllZDogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNZXJnZSBuZXcgc3RhdHVzZXMgaW50byBjYWNoZVxuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnN0YXR1c0NhY2hlLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IHN0YXR1c2VzIHRvIHZpc2libGUgcm93c1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBmb3Igc3RhdHVzIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKSB7XG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVW5hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBjYXNlICdEaXNhYmxlZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBzaW1wbGUgdXBkYXRlIG5vdGlmaWNhdGlvblxuICAgICAqL1xuICAgIHNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gICAgICAgIGlmICghdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciB8fCAhdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGluZGljYXRvciA9IHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3I7XG4gICAgICAgIGNvbnN0ICRzdGF0dXNNZXNzYWdlID0gJGluZGljYXRvci5maW5kKCcuc3RhdHVzLW1lc3NhZ2UnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjbGFzc2VzIGZvciBzdHlsaW5nXG4gICAgICAgICRpbmRpY2F0b3JcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuIGluZm8gc3VjY2VzcyBlcnJvciB3YXJuaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0eXBlKTtcbiAgICAgICAgXG4gICAgICAgICRzdGF0dXNNZXNzYWdlLnRleHQobWVzc2FnZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGVcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMubm90aWZpY2F0aW9uVGltZW91dCk7XG4gICAgICAgIHRoaXMubm90aWZpY2F0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgJGluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIG1hbnVhbGx5IGRpc21pc3NcbiAgICAgICAgJGluZGljYXRvci5vZmYoJ2NsaWNrLmRpc21pc3MnKS5vbignY2xpY2suZGlzbWlzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICAgICAgJGluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbW1lZGlhdGUgc3RhdHVzIHVwZGF0ZVxuICAgICAqL1xuICAgIHJlcXVlc3RTdGF0dXNVcGRhdGUoKSB7XG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIHZpYSBTaXBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgU2lwQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgU2lwQVBJLmdldFN0YXR1c2VzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IFJFU1QgQVBJIGNhbGxcbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9cGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRTdGF0dXNlc2AsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdnZXRTdGF0dXNlcycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHt9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjYWNoZWQgcm93IGVsZW1lbnQgZm9yIGV4dGVuc2lvblxuICAgICAqL1xuICAgIGdldENhY2hlZFJvdyhleHRlbnNpb25JZCkge1xuICAgICAgICBsZXQgJHJvdyA9IHRoaXMuY2FjaGVkUm93cy5nZXQoZXh0ZW5zaW9uSWQpO1xuICAgICAgICBpZiAoISRyb3cgfHwgISRyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkcm93ID0gJChgIyR7ZXh0ZW5zaW9uSWR9LCB0cltkYXRhLXZhbHVlPVwiJHtleHRlbnNpb25JZH1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoZXh0ZW5zaW9uSWQsICRyb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcm93O1xuICAgIH1cbn07XG5cbi8vIFNpbXBsZSBpbml0aWFsaXphdGlvbiB3aXRob3V0IGV4dHJhIFVJIGVsZW1lbnRzXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgLy8gQWRkIGRvdWJsZS1jbGljayBoYW5kbGVycyBmb3Igc3RhdHVzIGNlbGxzIHRvIG5hdmlnYXRlIHRvIGV4dGVuc2lvbiBtb2RpZnlcbiAgICAkKGRvY3VtZW50KS5vbignZGJsY2xpY2snLCAnLmV4dGVuc2lvbi1zdGF0dXMgLnVpLmxhYmVsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpIHx8ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGRhdGFiYXNlSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1leHRlbnNpb24taWQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhYmFzZUlkKSB7XG4gICAgICAgICAgICAvLyBOYXZpZ2F0ZSB0byBleHRlbnNpb24gbW9kaWZ5IHBhZ2UgZm9yIGRldGFpbGVkIHN0YXR1c1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YWJhc2VJZH1gO1xuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuLy8gRG9uJ3QgYXV0by1pbml0aWFsaXplIHRoZSBtb25pdG9yIGhlcmUgLSBsZXQgZXh0ZW5zaW9ucy1pbmRleC5qcyBoYW5kbGUgaXRcbi8vIFRoaXMgYWxsb3dzIGZvciBwcm9wZXIgc2VxdWVuY2luZyB3aXRoIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yID0gRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yOyJdfQ==