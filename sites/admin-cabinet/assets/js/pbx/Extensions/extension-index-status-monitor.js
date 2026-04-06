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
  isInitialLoadComplete: false,
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

    // Don't make duplicate request during initial load
    // The initial request is handled by extensions-index.js:requestInitialStatus()
    if (!this.isInitialLoadComplete) {
      return;
    }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1pbmRleC1zdGF0dXMtbW9uaXRvci5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJjaGFubmVsSWQiLCJpc0luaXRpYWxpemVkIiwiaXNJbml0aWFsTG9hZENvbXBsZXRlIiwibGFzdFVwZGF0ZVRpbWUiLCJzdGF0dXNDYWNoZSIsIiRzdGF0dXNDZWxscyIsIiRsYXN0VXBkYXRlSW5kaWNhdG9yIiwiY2FjaGVkUm93cyIsIk1hcCIsImNhY2hlZFN0YXR1c0NlbGxzIiwiaW5pdGlhbGl6ZSIsImNhY2hlRWxlbWVudHMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIiwic2V0VGltZW91dCIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwibm93IiwiZm9yRWFjaCIsImNoYW5nZSIsInVwZGF0ZUV4dGVuc2lvblN0YXR1cyIsImNoYW5nZUNvdW50IiwiZXhfT25lRXh0ZW5zaW9uU3RhdHVzQ2hhbmdlZCIsImV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIiwicmVwbGFjZSIsInNob3dVcGRhdGVOb3RpZmljYXRpb24iLCJzdGF0dXNlcyIsInVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzIiwiZXJyb3JNc2ciLCJlcnJvciIsImV4X1N0YXR1c0NoZWNrRmFpbGVkIiwiZXh0ZW5zaW9uIiwidHlwZSIsInN0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlSWNvbiIsInN0YXRlVGV4dCIsInN0YXRlRGVzY3JpcHRpb24iLCJzdGF0ZUR1cmF0aW9uIiwiZGV2aWNlQ291bnQiLCJhdmFpbGFibGVEZXZpY2VzIiwiZGV2aWNlcyIsImV4dGVuc2lvbklkIiwiZ2V0IiwicHJldmlvdXNTdGF0ZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwidHJhbnNpdGlvbiIsIk9iamVjdCIsImtleXMiLCJleHRlbnNpb25EYXRhIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCJhcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cyIsImNhY2hlZFN0YXR1cyIsInJlcXVlc3RTdGF0dXNlc0Zvck5ld0V4dGVuc2lvbnMiLCJuZXdFeHRlbnNpb25zIiwicHVzaCIsIlNpcEFQSSIsImdldFN0YXR1c2VzIiwic2ltcGxpZmllZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiYXNzaWduIiwiZHVyYXRpb24iLCIkaW5kaWNhdG9yIiwiJHN0YXR1c01lc3NhZ2UiLCJjbGVhclRpbWVvdXQiLCJub3RpZmljYXRpb25UaW1lb3V0Iiwib2ZmIiwib24iLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiYWN0aW9uIiwib25TdWNjZXNzIiwiZ2V0Q2FjaGVkUm93IiwiZG9jdW1lbnQiLCJyZWFkeSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsImNsb3Nlc3QiLCJkYXRhYmFzZUlkIiwid2lu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QUFxQ0EsMkJBQXJDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXZlbnRCdXMsIFNpcEFQSSAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBJbmRleCBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxlIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvcmluZyBmb3IgZXh0ZW5zaW9ucyBpbmRleCBwYWdlOlxuICogLSBTaG93cyBiYXNpYyBvbmxpbmUvb2ZmbGluZS91bmtub3duIHN0YXR1cyBpbmRpY2F0b3JzXG4gKiAtIFJlYWwtdGltZSBzdGF0dXMgdXBkYXRlcyB2aWEgRXZlbnRCdXNcbiAqIC0gQmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgKG5vIGhhcmRjb2RlZCBzdGF0ZSBtYXBwaW5nKVxuICogLSBEZXRhaWxlZCBzdGF0dXMgbW9uaXRvcmluZyBpcyBoYW5kbGVkIGluIGV4dGVuc2lvbi1tb2RpZnktc3RhdHVzLW1vbml0b3IuanNcbiAqL1xuY29uc3QgRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yID0ge1xuICAgIGNoYW5uZWxJZDogJ2V4dGVuc2lvbi1zdGF0dXMnLFxuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuICAgIGlzSW5pdGlhbExvYWRDb21wbGV0ZTogZmFsc2UsXG4gICAgbGFzdFVwZGF0ZVRpbWU6IDAsXG4gICAgc3RhdHVzQ2FjaGU6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzXG4gICAgICovXG4gICAgJHN0YXR1c0NlbGxzOiBudWxsLFxuICAgICRsYXN0VXBkYXRlSW5kaWNhdG9yOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIERPTSBjYWNoZSBmb3IgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXG4gICAgICovXG4gICAgY2FjaGVkUm93czogbmV3IE1hcCgpLFxuICAgIGNhY2hlZFN0YXR1c0NlbGxzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHN0YXR1cyBtb25pdG9yIHdpdGggZW5oYW5jZWQgZmVhdHVyZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50cyBmb3IgcGVyZm9ybWFuY2VcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgc2ltcGxlIHN0YXR1cyBpbmRpY2F0b3JcbiAgICAgICAgdGhpcy5jcmVhdGVTdGF0dXNJbmRpY2F0b3IoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBFdmVudEJ1cyBjaGFubmVsIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAgICB0aGlzLnN1YnNjcmliZVRvRXZlbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrc1xuICAgICAgICB0aGlzLnNldHVwSGVhbHRoQ2hlY2tzKCk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZUVsZW1lbnRzKCkge1xuICAgICAgICB0aGlzLiRzdGF0dXNDZWxscyA9ICQoJy5leHRlbnNpb24tc3RhdHVzLCAuZXh0ZW5zaW9uLXN0YXR1cy1jZWxsJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBleHRlbnNpb24gcm93cyBmb3IgcXVpY2sgYWNjZXNzXG4gICAgICAgICQoJ3RyLmV4dGVuc2lvbi1yb3csIHRyW2lkXScpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJHJvdy5hdHRyKCdpZCcpIHx8ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRSb3dzLnNldChpZCwgJHJvdyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5leHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChpZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgc2ltcGxlIHN0YXR1cyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBjcmVhdGVTdGF0dXNJbmRpY2F0b3IoKSB7XG4gICAgICAgIGlmICgkKCcjZXh0ZW5zaW9uLXN0YXR1cy1pbmRpY2F0b3InKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGluZGljYXRvciA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwiZXh0ZW5zaW9uLXN0YXR1cy1pbmRpY2F0b3JcIiBjbGFzcz1cInVpIG1pbmkgbWVzc2FnZSBoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJzeW5jIGFsdGVybmF0ZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzdGF0dXMtbWVzc2FnZVwiPjwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJCgnLnVpLmNvbnRhaW5lci5zZWdtZW50JykucHJlcGVuZChpbmRpY2F0b3IpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgPSAkKCcjZXh0ZW5zaW9uLXN0YXR1cy1pbmRpY2F0b3InKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFN1YnNjcmliZSB0byBFdmVudEJ1cyBmb3IgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICAgKi9cbiAgICBzdWJzY3JpYmVUb0V2ZW50cygpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBFdmVudEJ1cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSgnZXh0ZW5zaW9uLXN0YXR1cycsIChtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBFdmVudEJ1cyBub3QgYXZhaWxhYmxlLCBleHRlbnNpb24gc3RhdHVzIG1vbml0b3Igd2lsbCB3b3JrIHdpdGhvdXQgcmVhbC10aW1lIHVwZGF0ZXNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldHVwIHBlcmlvZGljIGhlYWx0aCBjaGVja3MgYW5kIGNhY2hlIG1haW50ZW5hbmNlXG4gICAgICovXG4gICAgc2V0dXBIZWFsdGhDaGVja3MoKSB7XG4gICAgICAgIC8vIFJlZnJlc2ggY2FjaGUgZXZlcnkgMzAgc2Vjb25kcyB0byBoYW5kbGUgZHluYW1pYyBjb250ZW50XG4gICAgICAgIHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVmcmVzaENhY2hlKCk7XG4gICAgICAgIH0sIDMwMDAwKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIHVwZGF0ZSBldmVyeSAyIG1pbnV0ZXMgYXMgZmFsbGJhY2tcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0U3RhdHVzVXBkYXRlKCk7XG4gICAgICAgIH0sIDEyMDAwMCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGNhY2hlZCBET00gZWxlbWVudHNcbiAgICAgKi9cbiAgICByZWZyZXNoQ2FjaGUoKSB7XG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVkUm93cy5jbGVhcigpO1xuICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmNsZWFyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWJ1aWxkIGNhY2hlXG4gICAgICAgIHRoaXMuY2FjaGVFbGVtZW50cygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBoYW5kbGVFdmVudEJ1c01lc3NhZ2UobWVzc2FnZSkge1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXZlbnRCdXMgbm93IHNlbmRzIGRhdGEgZGlyZWN0bHkgd2l0aG91dCBkb3VibGUgbmVzdGluZ1xuICAgICAgICBjb25zdCBldmVudCA9IG1lc3NhZ2UuZXZlbnQ7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBtZXNzYWdlO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFldmVudCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGV2ZW50KSB7XG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY2hlY2snOlxuICAgICAgICAgICAgICAgIHRoaXMuc2hvd0NoZWNraW5nSW5kaWNhdG9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX3VwZGF0ZSc6XG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19lcnJvcic6XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTdGF0dXNFcnJvcihkYXRhKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gVW5rbm93biBldmVudCB0eXBlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgY2hlY2tpbmcgaW5kaWNhdG9yXG4gICAgICovXG4gICAgc2hvd0NoZWNraW5nSW5kaWNhdG9yKGRhdGEpIHtcbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gZXJyb3Igc3VjY2VzcycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ2luZm8nKTtcbiAgICAgICAgICAgIFxuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmZpbmQoJy5jb250ZW50JylcbiAgICAgICAgICAgIC50ZXh0KGRhdGEubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfQ2hlY2tpbmdFeHRlbnNpb25TdGF0dXNlcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlIGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCAzMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3Mgc3RhdHVzIHVwZGF0ZSB3aXRoIGNoYW5nZXNcbiAgICAgKi9cbiAgICBwcm9jZXNzU3RhdHVzVXBkYXRlKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhLmNoYW5nZXMgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5jaGFuZ2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBkYXRhLnRpbWVzdGFtcCB8fCBEYXRlLm5vdygpIC8gMTAwMDtcbiAgICAgICAgdGhpcy5sYXN0VXBkYXRlVGltZSA9IHRpbWVzdGFtcDtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBjaGFuZ2VcbiAgICAgICAgZGF0YS5jaGFuZ2VzLmZvckVhY2goY2hhbmdlID0+IHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRXh0ZW5zaW9uU3RhdHVzKGNoYW5nZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyB1cGRhdGUgbm90aWZpY2F0aW9uXG4gICAgICAgIGNvbnN0IGNoYW5nZUNvdW50ID0gZGF0YS5jaGFuZ2VzLmxlbmd0aDtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGNoYW5nZUNvdW50ID09PSAxXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5leF9PbmVFeHRlbnNpb25TdGF0dXNDaGFuZ2VkXG4gICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5leF9NdWx0aXBsZUV4dGVuc2lvblN0YXR1c2VzQ2hhbmdlZC5yZXBsYWNlKCclcycsIGNoYW5nZUNvdW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgJ3N1Y2Nlc3MnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29tcGxldGUgc3RhdHVzIGRhdGFcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29tcGxldGVTdGF0dXMoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBleHRlbnNpb24gc3RhdHVzZXMgb24gdGhlIHBhZ2UgKHRoaXMgd2lsbCBhbHNvIHVwZGF0ZSBjYWNoZSlcbiAgICAgICAgdGhpcy51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhkYXRhLnN0YXR1c2VzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBzdGF0dXMgZXJyb3JcbiAgICAgKi9cbiAgICBoYW5kbGVTdGF0dXNFcnJvcihkYXRhKSB7XG4gICAgICAgIGNvbnN0IGVycm9yTXNnID0gZGF0YS5lcnJvciB8fCBnbG9iYWxUcmFuc2xhdGUuZXhfU3RhdHVzQ2hlY2tGYWlsZWQ7XG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihlcnJvck1zZywgJ2Vycm9yJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc2luZ2xlIGV4dGVuc2lvbiBzdGF0dXMgdXNpbmcgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVFeHRlbnNpb25TdGF0dXMoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHsgXG4gICAgICAgICAgICBleHRlbnNpb24sXG4gICAgICAgICAgICB0eXBlLCBcbiAgICAgICAgICAgIHN0YXRlLFxuICAgICAgICAgICAgc3RhdGVDb2xvciwgXG4gICAgICAgICAgICBzdGF0ZUljb24sIFxuICAgICAgICAgICAgc3RhdGVUZXh0LCBcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgZGV2aWNlQ291bnQsXG4gICAgICAgICAgICBhdmFpbGFibGVEZXZpY2VzLFxuICAgICAgICAgICAgZGV2aWNlc1xuICAgICAgICB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSBleHRlbnNpb247XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgY2FjaGVkIGVsZW1lbnRzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KGV4dGVuc2lvbklkKTtcbiAgICAgICAgaWYgKCEkcm93KSB7XG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgc2VsZWN0b3JzIGZvciBleHRlbnNpb24gcm93c1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke2V4dGVuc2lvbklkfSwgdHJbZGF0YS12YWx1ZT1cIiR7ZXh0ZW5zaW9uSWR9XCJdLCB0ci5leHRlbnNpb24tcm93W2lkPVwiJHtleHRlbnNpb25JZH1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGV4dGVuc2lvbklkLCAkcm93KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBSb3cgbm90IGZvdW5kXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGxldCAkc3RhdHVzQ2VsbCA9IHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuZ2V0KGV4dGVuc2lvbklkKTtcbiAgICAgICAgaWYgKCEkc3RhdHVzQ2VsbCkge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5leHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KGV4dGVuc2lvbklkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gU3RhdHVzIGNlbGwgbm90IGZvdW5kXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByZXZpb3VzU3RhdGUgPSAkc3RhdHVzQ2VsbC5kYXRhKCdwcmV2LXN0YXRlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgYmFja2VuZC1wcm92aWRlZCBkaXNwbGF5IHByb3BlcnRpZXMgZGlyZWN0bHkgZm9yIHNpbXBsZSBzdGF0dXNcbiAgICAgICAgaWYgKHN0YXRlQ29sb3IpIHtcbiAgICAgICAgICAgIC8vIFNpbXBsZSBzdGF0dXMgaW5kaWNhdG9yIHdpdGhvdXQgZGV0YWlsZWQgdG9vbHRpcHNcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpICR7c3RhdGVDb2xvcn0gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBcbiAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIlxuICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJFeHRlbnNpb24gJHtleHRlbnNpb25JZH06ICR7c3RhdGVUZXh0IHx8IHN0YXRlfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIERPTVxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHN0YXR1c0h0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFuaW1hdGUgaWYgc3RhdGUgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c1N0YXRlICYmIHByZXZpb3VzU3RhdGUgIT09IHN0YXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLnRyYW5zaXRpb24oJ3B1bHNlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN0b3JlIGN1cnJlbnQgc3RhdGUgZm9yIGZ1dHVyZSBjb21wYXJpc29uXG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScsIHN0YXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYWxsIGV4dGVuc2lvbiBzdGF0dXNlcyB3aXRoIHNpbXBsZSBkaXNwbGF5XG4gICAgICovXG4gICAgdXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMoc3RhdHVzZXMpIHtcbiAgICAgICAgaWYgKCFzdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2FjaGUgZmlyc3RcbiAgICAgICAgdGhpcy5zdGF0dXNDYWNoZSA9IHN0YXR1c2VzO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGV4dGVuc2lvbiBzdGF0dXNcbiAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXMpLmZvckVhY2goZXh0ZW5zaW9uSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uRGF0YSA9IHN0YXR1c2VzW2V4dGVuc2lvbklkXTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25EYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGVDb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoZXh0ZW5zaW9uRGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRXh0ZW5zaW9uU3RhdHVzKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IGV4dGVuc2lvbkRhdGEuc3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZUNvbG9yOiBzdGF0ZUNvbG9yXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQXBwbHkgY2FjaGVkIHN0YXR1c2VzIHRvIGFsbCB2aXNpYmxlIHJvd3NcbiAgICAgKi9cbiAgICBhcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cygpIHtcbiAgICAgICAgaWYgKCF0aGlzLnN0YXR1c0NhY2hlIHx8IE9iamVjdC5rZXlzKHRoaXMuc3RhdHVzQ2FjaGUpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFsbCB2aXNpYmxlIGV4dGVuc2lvbiByb3dzXG4gICAgICAgICQoJ3RyLmV4dGVuc2lvbi1yb3cnKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICRyb3cuYXR0cignaWQnKSB8fCAkcm93LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbklkICYmIHRoaXMuc3RhdHVzQ2FjaGVbZXh0ZW5zaW9uSWRdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FjaGVkU3RhdHVzID0gdGhpcy5zdGF0dXNDYWNoZVtleHRlbnNpb25JZF07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGVDb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoY2FjaGVkU3RhdHVzLnN0YXR1cyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHN0YXR1c0NlbGwgPSAkcm93LmZpbmQoJy5leHRlbnNpb24tc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCAmJiAkc3RhdHVzQ2VsbC5maW5kKCcuY2lyY3VsYXIubGFiZWwnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBhcHBseSBpZiBzdGF0dXMgbm90IGFscmVhZHkgc2V0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJFeHRlbnNpb24gJHtleHRlbnNpb25JZH06ICR7Y2FjaGVkU3RhdHVzLnN0YXR1c31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHN0YXR1c0h0bWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IHN0YXR1c2VzIG9ubHkgZm9yIGV4dGVuc2lvbnMgbm90IGluIGNhY2hlXG4gICAgICovXG4gICAgcmVxdWVzdFN0YXR1c2VzRm9yTmV3RXh0ZW5zaW9ucygpIHtcbiAgICAgICAgLy8gRG9uJ3QgbWFrZSBkdXBsaWNhdGUgcmVxdWVzdCBkdXJpbmcgaW5pdGlhbCBsb2FkXG4gICAgICAgIC8vIFRoZSBpbml0aWFsIHJlcXVlc3QgaXMgaGFuZGxlZCBieSBleHRlbnNpb25zLWluZGV4LmpzOnJlcXVlc3RJbml0aWFsU3RhdHVzKClcbiAgICAgICAgaWYgKCF0aGlzLmlzSW5pdGlhbExvYWRDb21wbGV0ZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbmV3RXh0ZW5zaW9ucyA9IFtdO1xuXG4gICAgICAgIC8vIEZpbmQgYWxsIHZpc2libGUgZXh0ZW5zaW9uIHJvd3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdycpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJHJvdy5hdHRyKCdpZCcpIHx8ICRyb3cuYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uSWQgJiYgIXRoaXMuc3RhdHVzQ2FjaGVbZXh0ZW5zaW9uSWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIG5vdCBpbiBjYWNoZSwgYWRkIHRvIGxpc3RcbiAgICAgICAgICAgICAgICBuZXdFeHRlbnNpb25zLnB1c2goZXh0ZW5zaW9uSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJZiB3ZSBoYXZlIG5ldyBleHRlbnNpb25zLCByZXF1ZXN0IHRoZWlyIHN0YXR1c2VzXG4gICAgICAgIGlmIChuZXdFeHRlbnNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIGZvciBuZXcgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBTaXBBUEkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgU2lwQVBJLmdldFN0YXR1c2VzKHsgc2ltcGxpZmllZDogdHJ1ZSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNZXJnZSBuZXcgc3RhdHVzZXMgaW50byBjYWNoZVxuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnN0YXR1c0NhY2hlLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGx5IHN0YXR1c2VzIHRvIHZpc2libGUgcm93c1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseVN0YXR1c2VzVG9WaXNpYmxlUm93cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjb2xvciBmb3Igc3RhdHVzIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q29sb3JGb3JTdGF0dXMoc3RhdHVzKSB7XG4gICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlICdBdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JlZW4nO1xuICAgICAgICAgICAgY2FzZSAnVW5hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiAnZ3JleSc7XG4gICAgICAgICAgICBjYXNlICdEaXNhYmxlZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBzaW1wbGUgdXBkYXRlIG5vdGlmaWNhdGlvblxuICAgICAqL1xuICAgIHNob3dVcGRhdGVOb3RpZmljYXRpb24obWVzc2FnZSwgdHlwZSA9ICdpbmZvJywgZHVyYXRpb24gPSAzMDAwKSB7XG4gICAgICAgIGlmICghdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciB8fCAhdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGluZGljYXRvciA9IHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3I7XG4gICAgICAgIGNvbnN0ICRzdGF0dXNNZXNzYWdlID0gJGluZGljYXRvci5maW5kKCcuc3RhdHVzLW1lc3NhZ2UnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBjbGFzc2VzIGZvciBzdHlsaW5nXG4gICAgICAgICRpbmRpY2F0b3JcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuIGluZm8gc3VjY2VzcyBlcnJvciB3YXJuaW5nJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0eXBlKTtcbiAgICAgICAgXG4gICAgICAgICRzdGF0dXNNZXNzYWdlLnRleHQobWVzc2FnZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGVcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMubm90aWZpY2F0aW9uVGltZW91dCk7XG4gICAgICAgIHRoaXMubm90aWZpY2F0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgJGluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIGR1cmF0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIHRvIG1hbnVhbGx5IGRpc21pc3NcbiAgICAgICAgJGluZGljYXRvci5vZmYoJ2NsaWNrLmRpc21pc3MnKS5vbignY2xpY2suZGlzbWlzcycsICgpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICAgICAgJGluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVxdWVzdCBpbW1lZGlhdGUgc3RhdHVzIHVwZGF0ZVxuICAgICAqL1xuICAgIHJlcXVlc3RTdGF0dXNVcGRhdGUoKSB7XG4gICAgICAgIC8vIFJlcXVlc3Qgc3RhdHVzIHZpYSBTaXBBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgU2lwQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgU2lwQVBJLmdldFN0YXR1c2VzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IFJFU1QgQVBJIGNhbGxcbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9cGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRTdGF0dXNlc2AsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdnZXRTdGF0dXNlcycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHt9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjYWNoZWQgcm93IGVsZW1lbnQgZm9yIGV4dGVuc2lvblxuICAgICAqL1xuICAgIGdldENhY2hlZFJvdyhleHRlbnNpb25JZCkge1xuICAgICAgICBsZXQgJHJvdyA9IHRoaXMuY2FjaGVkUm93cy5nZXQoZXh0ZW5zaW9uSWQpO1xuICAgICAgICBpZiAoISRyb3cgfHwgISRyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICAkcm93ID0gJChgIyR7ZXh0ZW5zaW9uSWR9LCB0cltkYXRhLXZhbHVlPVwiJHtleHRlbnNpb25JZH1cIl1gKTtcbiAgICAgICAgICAgIGlmICgkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoZXh0ZW5zaW9uSWQsICRyb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkcm93O1xuICAgIH1cbn07XG5cbi8vIFNpbXBsZSBpbml0aWFsaXphdGlvbiB3aXRob3V0IGV4dHJhIFVJIGVsZW1lbnRzXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgLy8gQWRkIGRvdWJsZS1jbGljayBoYW5kbGVycyBmb3Igc3RhdHVzIGNlbGxzIHRvIG5hdmlnYXRlIHRvIGV4dGVuc2lvbiBtb2RpZnlcbiAgICAkKGRvY3VtZW50KS5vbignZGJsY2xpY2snLCAnLmV4dGVuc2lvbi1zdGF0dXMgLnVpLmxhYmVsJywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBleHRlbnNpb25JZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpIHx8ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGRhdGFiYXNlSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1leHRlbnNpb24taWQnKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChkYXRhYmFzZUlkKSB7XG4gICAgICAgICAgICAvLyBOYXZpZ2F0ZSB0byBleHRlbnNpb24gbW9kaWZ5IHBhZ2UgZm9yIGRldGFpbGVkIHN0YXR1c1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7ZGF0YWJhc2VJZH1gO1xuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuLy8gRG9uJ3QgYXV0by1pbml0aWFsaXplIHRoZSBtb25pdG9yIGhlcmUgLSBsZXQgZXh0ZW5zaW9ucy1pbmRleC5qcyBoYW5kbGUgaXRcbi8vIFRoaXMgYWxsb3dzIGZvciBwcm9wZXIgc2VxdWVuY2luZyB3aXRoIERhdGFUYWJsZSBpbml0aWFsaXphdGlvblxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yID0gRXh0ZW5zaW9uSW5kZXhTdGF0dXNNb25pdG9yOyJdfQ==