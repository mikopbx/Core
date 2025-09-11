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

/* global globalRootUrl, globalTranslate, EventBus, ExtensionsAPI */

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
    this.$lastUpdateIndicator.find('.content').text(data.message || globalTranslate.ex_CheckingExtensionStatuses || 'Checking extension statuses...'); // Auto-hide after 3 seconds

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
    var message = changeCount === 1 ? globalTranslate.ex_OneExtensionStatusChanged || 'One extension status changed' : (globalTranslate.ex_MultipleExtensionStatusesChanged || 'Multiple extension statuses changed').replace('%s', changeCount);
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
    var errorMsg = data.error || globalTranslate.ex_StatusCheckFailed || 'Extension status check failed';
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
      if (typeof ExtensionsAPI !== 'undefined') {
        ExtensionsAPI.getStatuses({
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

    // Request status via ExtensionsAPI if available
    if (typeof ExtensionsAPI !== 'undefined') {
      ExtensionsAPI.getStatuses(function (response) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1pbmRleC1zdGF0dXMtbW9uaXRvci5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJjaGFubmVsSWQiLCJpc0luaXRpYWxpemVkIiwibGFzdFVwZGF0ZVRpbWUiLCJzdGF0dXNDYWNoZSIsIiRzdGF0dXNDZWxscyIsIiRsYXN0VXBkYXRlSW5kaWNhdG9yIiwiY2FjaGVkUm93cyIsIk1hcCIsImNhY2hlZFN0YXR1c0NlbGxzIiwiaW5pdGlhbGl6ZSIsImNhY2hlRWxlbWVudHMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIiwic2V0VGltZW91dCIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwibm93IiwiZm9yRWFjaCIsImNoYW5nZSIsInVwZGF0ZUV4dGVuc2lvblN0YXR1cyIsImNoYW5nZUNvdW50IiwiZXhfT25lRXh0ZW5zaW9uU3RhdHVzQ2hhbmdlZCIsImV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIiwicmVwbGFjZSIsInNob3dVcGRhdGVOb3RpZmljYXRpb24iLCJzdGF0dXNlcyIsInVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzIiwiZXJyb3JNc2ciLCJlcnJvciIsImV4X1N0YXR1c0NoZWNrRmFpbGVkIiwiZXh0ZW5zaW9uIiwidHlwZSIsInN0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlSWNvbiIsInN0YXRlVGV4dCIsInN0YXRlRGVzY3JpcHRpb24iLCJzdGF0ZUR1cmF0aW9uIiwiZGV2aWNlQ291bnQiLCJhdmFpbGFibGVEZXZpY2VzIiwiZGV2aWNlcyIsImV4dGVuc2lvbklkIiwiZ2V0IiwicHJldmlvdXNTdGF0ZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwidHJhbnNpdGlvbiIsIk9iamVjdCIsImtleXMiLCJleHRlbnNpb25EYXRhIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCJhcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cyIsImNhY2hlZFN0YXR1cyIsInJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMiLCJuZXdFeHRlbnNpb25zIiwicHVzaCIsIkV4dGVuc2lvbnNBUEkiLCJnZXRTdGF0dXNlcyIsInNpbXBsaWZpZWQiLCJyZXNwb25zZSIsInJlc3VsdCIsImFzc2lnbiIsImR1cmF0aW9uIiwiJGluZGljYXRvciIsIiRzdGF0dXNNZXNzYWdlIiwiY2xlYXJUaW1lb3V0Iiwibm90aWZpY2F0aW9uVGltZW91dCIsIm9mZiIsIm9uIiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm1ldGhvZCIsImFjdGlvbiIsIm9uU3VjY2VzcyIsImdldENhY2hlZFJvdyIsImRvY3VtZW50IiwicmVhZHkiLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJjbG9zZXN0IiwiZGF0YWJhc2VJZCIsIndpbmRvdyIsImxvY2F0aW9uIiwi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LSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXZlbnRCdXMsIEV4dGVuc2lvbnNBUEkgKi9cblxuLyoqXG4gKiBFeHRlbnNpb24gSW5kZXggU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbnMgaW5kZXggcGFnZTpcbiAqIC0gU2hvd3MgYmFzaWMgb25saW5lL29mZmxpbmUvdW5rbm93biBzdGF0dXMgaW5kaWNhdG9yc1xuICogLSBSZWFsLXRpbWUgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRGV0YWlsZWQgc3RhdHVzIG1vbml0b3JpbmcgaXMgaGFuZGxlZCBpbiBleHRlbnNpb24tbW9kaWZ5LXN0YXR1cy1tb25pdG9yLmpzXG4gKi9cbmNvbnN0IEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdleHRlbnNpb24tc3RhdHVzJyxcbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBsYXN0VXBkYXRlVGltZTogMCxcbiAgICBzdGF0dXNDYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHNcbiAgICAgKi9cbiAgICAkc3RhdHVzQ2VsbHM6IG51bGwsXG4gICAgJGxhc3RVcGRhdGVJbmRpY2F0b3I6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRE9NIGNhY2hlIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZWRSb3dzOiBuZXcgTWFwKCksXG4gICAgY2FjaGVkU3RhdHVzQ2VsbHM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3Igd2l0aCBlbmhhbmNlZCBmZWF0dXJlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLmV4dGVuc2lvbi1zdGF0dXMsIC5leHRlbnNpb24tc3RhdHVzLWNlbGwnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIGV4dGVuc2lvbiByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkcm93LmF0dHIoJ2lkJykgfHwgJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGlkLCAkcm93KTtcbiAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KGlkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZVN0YXR1c0luZGljYXRvcigpIHtcbiAgICAgICAgaWYgKCQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJleHRlbnNpb24tc3RhdHVzLWluZGljYXRvclwiIGNsYXNzPVwidWkgbWluaSBtZXNzYWdlIGhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy1tZXNzYWdlXCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5wcmVwZW5kKGluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciA9ICQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdCBhdmFpbGFibGUsIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvciB3aWxsIHdvcmsgd2l0aG91dCByZWFsLXRpbWUgdXBkYXRlc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrcyBhbmQgY2FjaGUgbWFpbnRlbmFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEhlYWx0aENoZWNrcygpIHtcbiAgICAgICAgLy8gUmVmcmVzaCBjYWNoZSBldmVyeSAzMCBzZWNvbmRzIHRvIGhhbmRsZSBkeW5hbWljIGNvbnRlbnRcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoQ2FjaGUoKTtcbiAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdXBkYXRlIGV2ZXJ5IDIgbWludXRlcyBhcyBmYWxsYmFja1xuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgfSwgMTIwMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggY2FjaGVkIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIHJlZnJlc2hDYWNoZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZWRSb3dzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuY2xlYXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jaGVjayc6XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBjaGVja2luZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBzaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSkge1xuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBlcnJvciBzdWNjZXNzJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnaW5mbycpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuZmluZCgnLmNvbnRlbnQnKVxuICAgICAgICAgICAgLnRleHQoZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIHx8ICdDaGVja2luZyBleHRlbnNpb24gc3RhdHVzZXMuLi4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wIHx8IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gdGltZXN0YW1wO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoYW5nZVxuICAgICAgICBkYXRhLmNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXMoY2hhbmdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgICAgY29uc3QgY2hhbmdlQ291bnQgPSBkYXRhLmNoYW5nZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gY2hhbmdlQ291bnQgPT09IDEgXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5leF9PbmVFeHRlbnNpb25TdGF0dXNDaGFuZ2VkIHx8ICdPbmUgZXh0ZW5zaW9uIHN0YXR1cyBjaGFuZ2VkJ1xuICAgICAgICAgICAgOiAoZ2xvYmFsVHJhbnNsYXRlLmV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIHx8ICdNdWx0aXBsZSBleHRlbnNpb24gc3RhdHVzZXMgY2hhbmdlZCcpLnJlcGxhY2UoJyVzJywgY2hhbmdlQ291bnQpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIGV4dGVuc2lvbiBzdGF0dXNlcyBvbiB0aGUgcGFnZSAodGhpcyB3aWxsIGFsc28gdXBkYXRlIGNhY2hlKVxuICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKGRhdGEuc3RhdHVzZXMpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN0YXR1cyBlcnJvclxuICAgICAqL1xuICAgIGhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9TdGF0dXNDaGVja0ZhaWxlZCB8fCAnRXh0ZW5zaW9uIHN0YXR1cyBjaGVjayBmYWlsZWQnO1xuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNc2csICdlcnJvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNpbmdsZSBleHRlbnNpb24gc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgdXBkYXRlRXh0ZW5zaW9uU3RhdHVzKGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IFxuICAgICAgICAgICAgZXh0ZW5zaW9uLFxuICAgICAgICAgICAgdHlwZSwgXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlQ29sb3IsIFxuICAgICAgICAgICAgc3RhdGVJY29uLCBcbiAgICAgICAgICAgIHN0YXRlVGV4dCwgXG4gICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGRldmljZUNvdW50LFxuICAgICAgICAgICAgYXZhaWxhYmxlRGV2aWNlcyxcbiAgICAgICAgICAgIGRldmljZXNcbiAgICAgICAgfSA9IGNoYW5nZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gZXh0ZW5zaW9uO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGNhY2hlZCBlbGVtZW50cyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChleHRlbnNpb25JZCk7XG4gICAgICAgIGlmICghJHJvdykge1xuICAgICAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHNlbGVjdG9ycyBmb3IgZXh0ZW5zaW9uIHJvd3NcbiAgICAgICAgICAgICRyb3cgPSAkKGAjJHtleHRlbnNpb25JZH0sIHRyW2RhdGEtdmFsdWU9XCIke2V4dGVuc2lvbklkfVwiXSwgdHIuZXh0ZW5zaW9uLXJvd1tpZD1cIiR7ZXh0ZW5zaW9uSWR9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRSb3dzLnNldChleHRlbnNpb25JZCwgJHJvdyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gUm93IG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgJHN0YXR1c0NlbGwgPSB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmdldChleHRlbnNpb25JZCk7XG4gICAgICAgIGlmICghJHN0YXR1c0NlbGwpIHtcbiAgICAgICAgICAgICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChleHRlbnNpb25JZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFN0YXR1cyBjZWxsIG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcmV2aW91c1N0YXRlID0gJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIGRpcmVjdGx5IGZvciBzaW1wbGUgc3RhdHVzXG4gICAgICAgIGlmIChzdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICAvLyBTaW1wbGUgc3RhdHVzIGluZGljYXRvciB3aXRob3V0IGRldGFpbGVkIHRvb2x0aXBzXG4gICAgICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXRlQ29sb3J9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgXG4gICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCJcbiAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRXh0ZW5zaW9uICR7ZXh0ZW5zaW9uSWR9OiAke3N0YXRlVGV4dCB8fCBzdGF0ZX1cIj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBET01cbiAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChzdGF0dXNIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBbmltYXRlIGlmIHN0YXRlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNTdGF0ZSAmJiBwcmV2aW91c1N0YXRlICE9PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjdXJyZW50IHN0YXRlIGZvciBmdXR1cmUgY29tcGFyaXNvblxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnLCBzdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBleHRlbnNpb24gc3RhdHVzZXMgd2l0aCBzaW1wbGUgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHN0YXR1c2VzKSB7XG4gICAgICAgIGlmICghc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNhY2hlIGZpcnN0XG4gICAgICAgIHRoaXMuc3RhdHVzQ2FjaGUgPSBzdGF0dXNlcztcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBleHRlbnNpb24gc3RhdHVzXG4gICAgICAgIE9iamVjdC5rZXlzKHN0YXR1c2VzKS5mb3JFYWNoKGV4dGVuc2lvbklkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbkRhdGEgPSBzdGF0dXNlc1tleHRlbnNpb25JZF07XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uRGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlQ29sb3IgPSB0aGlzLmdldENvbG9yRm9yU3RhdHVzKGV4dGVuc2lvbkRhdGEuc3RhdHVzKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUV4dGVuc2lvblN0YXR1cyh7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZXh0ZW5zaW9uSWQsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBleHRlbnNpb25EYXRhLnN0YXR1cyxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGVDb2xvcjogc3RhdGVDb2xvclxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFwcGx5IGNhY2hlZCBzdGF0dXNlcyB0byBhbGwgdmlzaWJsZSByb3dzXG4gICAgICovXG4gICAgYXBwbHlTdGF0dXNlc1RvVmlzaWJsZVJvd3MoKSB7XG4gICAgICAgIGlmICghdGhpcy5zdGF0dXNDYWNoZSB8fCBPYmplY3Qua2V5cyh0aGlzLnN0YXR1c0NhY2hlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbGwgdmlzaWJsZSBleHRlbnNpb24gcm93c1xuICAgICAgICAkKCd0ci5leHRlbnNpb24tcm93JykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkcm93LmF0dHIoJ2lkJykgfHwgJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25JZCAmJiB0aGlzLnN0YXR1c0NhY2hlW2V4dGVuc2lvbklkXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhY2hlZFN0YXR1cyA9IHRoaXMuc3RhdHVzQ2FjaGVbZXh0ZW5zaW9uSWRdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRlQ29sb3IgPSB0aGlzLmdldENvbG9yRm9yU3RhdHVzKGNhY2hlZFN0YXR1cy5zdGF0dXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggJiYgJHN0YXR1c0NlbGwuZmluZCgnLmNpcmN1bGFyLmxhYmVsJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgYXBwbHkgaWYgc3RhdHVzIG5vdCBhbHJlYWR5IHNldFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdGVDb2xvcn0gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRXh0ZW5zaW9uICR7ZXh0ZW5zaW9uSWR9OiAke2NhY2hlZFN0YXR1cy5zdGF0dXN9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChzdGF0dXNIdG1sKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBzdGF0dXNlcyBvbmx5IGZvciBleHRlbnNpb25zIG5vdCBpbiBjYWNoZVxuICAgICAqL1xuICAgIHJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMoKSB7XG4gICAgICAgIGNvbnN0IG5ld0V4dGVuc2lvbnMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYWxsIHZpc2libGUgZXh0ZW5zaW9uIHJvd3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdycpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJHJvdy5hdHRyKCdpZCcpIHx8ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uSWQgJiYgIXRoaXMuc3RhdHVzQ2FjaGVbZXh0ZW5zaW9uSWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIG5vdCBpbiBjYWNoZSwgYWRkIHRvIGxpc3RcbiAgICAgICAgICAgICAgICBuZXdFeHRlbnNpb25zLnB1c2goZXh0ZW5zaW9uSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIGhhdmUgbmV3IGV4dGVuc2lvbnMsIHJlcXVlc3QgdGhlaXIgc3RhdHVzZXNcbiAgICAgICAgaWYgKG5ld0V4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgZm9yIG5ldyBleHRlbnNpb25zXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnNBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXNlcyh7IHNpbXBsaWZpZWQ6IHRydWUgfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWVyZ2UgbmV3IHN0YXR1c2VzIGludG8gY2FjaGVcbiAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5zdGF0dXNDYWNoZSwgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBseSBzdGF0dXNlcyB0byB2aXNpYmxlIHJvd3NcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlTdGF0dXNlc1RvVmlzaWJsZVJvd3MoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY29sb3IgZm9yIHN0YXR1cyB2YWx1ZVxuICAgICAqL1xuICAgIGdldENvbG9yRm9yU3RhdHVzKHN0YXR1cykge1xuICAgICAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnQXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZWVuJztcbiAgICAgICAgICAgIGNhc2UgJ1VuYXZhaWxhYmxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgY2FzZSAnRGlzYWJsZWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgc2ltcGxlIHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgKi9cbiAgICBzaG93VXBkYXRlTm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycsIGR1cmF0aW9uID0gMzAwMCkge1xuICAgICAgICBpZiAoIXRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgfHwgIXRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRpbmRpY2F0b3IgPSB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yO1xuICAgICAgICBjb25zdCAkc3RhdHVzTWVzc2FnZSA9ICRpbmRpY2F0b3IuZmluZCgnLnN0YXR1cy1tZXNzYWdlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2xhc3NlcyBmb3Igc3R5bGluZ1xuICAgICAgICAkaW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBpbmZvIHN1Y2Nlc3MgZXJyb3Igd2FybmluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModHlwZSk7XG4gICAgICAgIFxuICAgICAgICAkc3RhdHVzTWVzc2FnZS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCBkdXJhdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBtYW51YWxseSBkaXNtaXNzXG4gICAgICAgICRpbmRpY2F0b3Iub2ZmKCdjbGljay5kaXNtaXNzJykub24oJ2NsaWNrLmRpc21pc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIHN0YXR1cyB1cGRhdGVcbiAgICAgKi9cbiAgICByZXF1ZXN0U3RhdHVzVXBkYXRlKCkge1xuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyB2aWEgRXh0ZW5zaW9uc0FQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXNlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBSRVNUIEFQSSBjYWxsXG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXBieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0U3RhdHVzZXNgLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnZ2V0U3RhdHVzZXMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7fVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY2FjaGVkIHJvdyBlbGVtZW50IGZvciBleHRlbnNpb25cbiAgICAgKi9cbiAgICBnZXRDYWNoZWRSb3coZXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KGV4dGVuc2lvbklkKTtcbiAgICAgICAgaWYgKCEkcm93IHx8ICEkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke2V4dGVuc2lvbklkfSwgdHJbZGF0YS12YWx1ZT1cIiR7ZXh0ZW5zaW9uSWR9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGV4dGVuc2lvbklkLCAkcm93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJHJvdztcbiAgICB9XG59O1xuXG4vLyBTaW1wbGUgaW5pdGlhbGl6YXRpb24gd2l0aG91dCBleHRyYSBVSSBlbGVtZW50c1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIC8vIEFkZCBkb3VibGUtY2xpY2sgaGFuZGxlcnMgZm9yIHN0YXR1cyBjZWxscyB0byBuYXZpZ2F0ZSB0byBleHRlbnNpb24gbW9kaWZ5XG4gICAgJChkb2N1bWVudCkub24oJ2RibGNsaWNrJywgJy5leHRlbnNpb24tc3RhdHVzIC51aS5sYWJlbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKSB8fCAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICBjb25zdCBkYXRhYmFzZUlkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF0YWJhc2VJZCkge1xuICAgICAgICAgICAgLy8gTmF2aWdhdGUgdG8gZXh0ZW5zaW9uIG1vZGlmeSBwYWdlIGZvciBkZXRhaWxlZCBzdGF0dXNcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2RhdGFiYXNlSWR9YDtcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cbi8vIERvbid0IGF1dG8taW5pdGlhbGl6ZSB0aGUgbW9uaXRvciBoZXJlIC0gbGV0IGV4dGVuc2lvbnMtaW5kZXguanMgaGFuZGxlIGl0XG4vLyBUaGlzIGFsbG93cyBmb3IgcHJvcGVyIHNlcXVlbmNpbmcgd2l0aCBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LkV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciA9IEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvcjsiXX0=