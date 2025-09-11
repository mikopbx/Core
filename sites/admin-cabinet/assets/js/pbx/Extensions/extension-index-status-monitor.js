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
    } // Update cache


    this.statusCache = data.statuses; // Update all extension statuses on the page

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
    } // Process each extension status


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
    var _this7 = this;

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
      clearTimeout(_this7.notificationTimeout);
      $indicator.addClass('hidden');
    });
  },

  /**
   * Request immediate status update
   */
  requestStatusUpdate: function requestStatusUpdate() {
    var _this8 = this;

    // Request status via ExtensionsAPI if available
    if (typeof ExtensionsAPI !== 'undefined') {
      ExtensionsAPI.getStatuses(function (response) {
        if (response && response.result && response.data) {
          _this8.updateAllExtensionStatuses(response.data);
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
            _this8.updateAllExtensionStatuses(response.data);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1pbmRleC1zdGF0dXMtbW9uaXRvci5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IiLCJjaGFubmVsSWQiLCJpc0luaXRpYWxpemVkIiwibGFzdFVwZGF0ZVRpbWUiLCJzdGF0dXNDYWNoZSIsIiRzdGF0dXNDZWxscyIsIiRsYXN0VXBkYXRlSW5kaWNhdG9yIiwiY2FjaGVkUm93cyIsIk1hcCIsImNhY2hlZFN0YXR1c0NlbGxzIiwiaW5pdGlhbGl6ZSIsImNhY2hlRWxlbWVudHMiLCJjcmVhdGVTdGF0dXNJbmRpY2F0b3IiLCJzdWJzY3JpYmVUb0V2ZW50cyIsInNldHVwSGVhbHRoQ2hlY2tzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkcm93IiwiaWQiLCJhdHRyIiwic2V0IiwiJHN0YXR1c0NlbGwiLCJmaW5kIiwibGVuZ3RoIiwiaW5kaWNhdG9yIiwicHJlcGVuZCIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwibWVzc2FnZSIsImhhbmRsZUV2ZW50QnVzTWVzc2FnZSIsInNldEludGVydmFsIiwicmVmcmVzaENhY2hlIiwicmVxdWVzdFN0YXR1c1VwZGF0ZSIsImNsZWFyIiwiZXZlbnQiLCJkYXRhIiwic2hvd0NoZWNraW5nSW5kaWNhdG9yIiwicHJvY2Vzc1N0YXR1c1VwZGF0ZSIsInByb2Nlc3NDb21wbGV0ZVN0YXR1cyIsImhhbmRsZVN0YXR1c0Vycm9yIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIiwic2V0VGltZW91dCIsImNoYW5nZXMiLCJBcnJheSIsImlzQXJyYXkiLCJ0aW1lc3RhbXAiLCJEYXRlIiwibm93IiwiZm9yRWFjaCIsImNoYW5nZSIsInVwZGF0ZUV4dGVuc2lvblN0YXR1cyIsImNoYW5nZUNvdW50IiwiZXhfT25lRXh0ZW5zaW9uU3RhdHVzQ2hhbmdlZCIsImV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIiwicmVwbGFjZSIsInNob3dVcGRhdGVOb3RpZmljYXRpb24iLCJzdGF0dXNlcyIsInVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzIiwiZXJyb3JNc2ciLCJlcnJvciIsImV4X1N0YXR1c0NoZWNrRmFpbGVkIiwiZXh0ZW5zaW9uIiwidHlwZSIsInN0YXRlIiwic3RhdGVDb2xvciIsInN0YXRlSWNvbiIsInN0YXRlVGV4dCIsInN0YXRlRGVzY3JpcHRpb24iLCJzdGF0ZUR1cmF0aW9uIiwiZGV2aWNlQ291bnQiLCJhdmFpbGFibGVEZXZpY2VzIiwiZGV2aWNlcyIsImV4dGVuc2lvbklkIiwiZ2V0IiwicHJldmlvdXNTdGF0ZSIsInN0YXR1c0h0bWwiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJodG1sIiwidHJhbnNpdGlvbiIsIk9iamVjdCIsImtleXMiLCJleHRlbnNpb25EYXRhIiwiZ2V0Q29sb3JGb3JTdGF0dXMiLCJzdGF0dXMiLCJkdXJhdGlvbiIsIiRpbmRpY2F0b3IiLCIkc3RhdHVzTWVzc2FnZSIsImNsZWFyVGltZW91dCIsIm5vdGlmaWNhdGlvblRpbWVvdXQiLCJvZmYiLCJvbiIsIkV4dGVuc2lvbnNBUEkiLCJnZXRTdGF0dXNlcyIsInJlc3BvbnNlIiwicmVzdWx0IiwiYXBpIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm1ldGhvZCIsImFjdGlvbiIsIm9uU3VjY2VzcyIsImdldENhY2hlZFJvdyIsImRvY3VtZW50IiwicmVhZHkiLCJlIiwicHJldmVudERlZmF1bHQiLCJzdG9wUHJvcGFnYXRpb24iLCJjbG9zZXN0IiwiZGF0YWJhc2VJZCIsIndpbmRvdyIsImxvY2F0aW9uIiwiaHJlZiJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7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QUksQ0FBQ00sTUFBVCxFQUFpQjtBQUNiLGFBQUtsQixVQUFMLENBQWdCZSxHQUFoQixDQUFvQndELFdBQXBCLEVBQWlDM0QsSUFBakM7QUFDSDtBQUNKOztBQUNELFdBQU9BLElBQVA7QUFDSDtBQXBaK0IsQ0FBcEMsQyxDQXVaQTs7QUFDQUosQ0FBQyxDQUFDNkYsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjtBQUNBOUYsRUFBQUEsQ0FBQyxDQUFDNkYsUUFBRCxDQUFELENBQVlaLEVBQVosQ0FBZSxVQUFmLEVBQTJCLDZCQUEzQixFQUEwRCxVQUFTYyxDQUFULEVBQVk7QUFDbEVBLElBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBRCxJQUFBQSxDQUFDLENBQUNFLGVBQUY7QUFFQSxRQUFNbEMsV0FBVyxHQUFHL0QsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRa0csT0FBUixDQUFnQixJQUFoQixFQUFzQjVGLElBQXRCLENBQTJCLElBQTNCLEtBQW9DTixDQUFDLENBQUMsSUFBRCxDQUFELENBQVFrRyxPQUFSLENBQWdCLElBQWhCLEVBQXNCNUYsSUFBdEIsQ0FBMkIsWUFBM0IsQ0FBeEQ7QUFDQSxRQUFNNkYsVUFBVSxHQUFHbkcsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRa0csT0FBUixDQUFnQixJQUFoQixFQUFzQjVGLElBQXRCLENBQTJCLG1CQUEzQixDQUFuQjs7QUFFQSxRQUFJNkYsVUFBSixFQUFnQjtBQUNaO0FBQ0FDLE1BQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsSUFBaEIsYUFBMEJkLGFBQTFCLCtCQUE0RFcsVUFBNUQ7QUFDSDtBQUNKLEdBWEQ7QUFZSCxDQWRELEUsQ0FnQkE7QUFDQTtBQUVBOztBQUNBQyxNQUFNLENBQUNuSCwyQkFBUCxHQUFxQ0EsMkJBQXJDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXZlbnRCdXMsIEV4dGVuc2lvbnNBUEkgKi9cblxuLyoqXG4gKiBFeHRlbnNpb24gSW5kZXggU3RhdHVzIE1vbml0b3JcbiAqIFNpbXBsZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3JpbmcgZm9yIGV4dGVuc2lvbnMgaW5kZXggcGFnZTpcbiAqIC0gU2hvd3MgYmFzaWMgb25saW5lL29mZmxpbmUvdW5rbm93biBzdGF0dXMgaW5kaWNhdG9yc1xuICogLSBSZWFsLXRpbWUgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRGV0YWlsZWQgc3RhdHVzIG1vbml0b3JpbmcgaXMgaGFuZGxlZCBpbiBleHRlbnNpb24tbW9kaWZ5LXN0YXR1cy1tb25pdG9yLmpzXG4gKi9cbmNvbnN0IEV4dGVuc2lvbkluZGV4U3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdleHRlbnNpb24tc3RhdHVzJyxcbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBsYXN0VXBkYXRlVGltZTogMCxcbiAgICBzdGF0dXNDYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHNcbiAgICAgKi9cbiAgICAkc3RhdHVzQ2VsbHM6IG51bGwsXG4gICAgJGxhc3RVcGRhdGVJbmRpY2F0b3I6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRE9NIGNhY2hlIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZWRSb3dzOiBuZXcgTWFwKCksXG4gICAgY2FjaGVkU3RhdHVzQ2VsbHM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3Igd2l0aCBlbmhhbmNlZCBmZWF0dXJlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLmV4dGVuc2lvbi1zdGF0dXMsIC5leHRlbnNpb24tc3RhdHVzLWNlbGwnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIGV4dGVuc2lvbiByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkcm93LmF0dHIoJ2lkJykgfHwgJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGlkLCAkcm93KTtcbiAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KGlkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZVN0YXR1c0luZGljYXRvcigpIHtcbiAgICAgICAgaWYgKCQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJleHRlbnNpb24tc3RhdHVzLWluZGljYXRvclwiIGNsYXNzPVwidWkgbWluaSBtZXNzYWdlIGhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy1tZXNzYWdlXCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5wcmVwZW5kKGluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciA9ICQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdCBhdmFpbGFibGUsIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvciB3aWxsIHdvcmsgd2l0aG91dCByZWFsLXRpbWUgdXBkYXRlc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrcyBhbmQgY2FjaGUgbWFpbnRlbmFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEhlYWx0aENoZWNrcygpIHtcbiAgICAgICAgLy8gUmVmcmVzaCBjYWNoZSBldmVyeSAzMCBzZWNvbmRzIHRvIGhhbmRsZSBkeW5hbWljIGNvbnRlbnRcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoQ2FjaGUoKTtcbiAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdXBkYXRlIGV2ZXJ5IDIgbWludXRlcyBhcyBmYWxsYmFja1xuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgfSwgMTIwMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggY2FjaGVkIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIHJlZnJlc2hDYWNoZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZWRSb3dzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuY2xlYXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBub3cgc2VuZHMgZGF0YSBkaXJlY3RseSB3aXRob3V0IGRvdWJsZSBuZXN0aW5nXG4gICAgICAgIGNvbnN0IGV2ZW50ID0gbWVzc2FnZS5ldmVudDtcbiAgICAgICAgY29uc3QgZGF0YSA9IG1lc3NhZ2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jaGVjayc6XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBjaGVja2luZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBzaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSkge1xuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBlcnJvciBzdWNjZXNzJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnaW5mbycpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuZmluZCgnLmNvbnRlbnQnKVxuICAgICAgICAgICAgLnRleHQoZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIHx8ICdDaGVja2luZyBleHRlbnNpb24gc3RhdHVzZXMuLi4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wIHx8IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gdGltZXN0YW1wO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoYW5nZVxuICAgICAgICBkYXRhLmNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXMoY2hhbmdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgICAgY29uc3QgY2hhbmdlQ291bnQgPSBkYXRhLmNoYW5nZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gY2hhbmdlQ291bnQgPT09IDEgXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5leF9PbmVFeHRlbnNpb25TdGF0dXNDaGFuZ2VkIHx8ICdPbmUgZXh0ZW5zaW9uIHN0YXR1cyBjaGFuZ2VkJ1xuICAgICAgICAgICAgOiAoZ2xvYmFsVHJhbnNsYXRlLmV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIHx8ICdNdWx0aXBsZSBleHRlbnNpb24gc3RhdHVzZXMgY2hhbmdlZCcpLnJlcGxhY2UoJyVzJywgY2hhbmdlQ291bnQpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2FjaGVcbiAgICAgICAgdGhpcy5zdGF0dXNDYWNoZSA9IGRhdGEuc3RhdHVzZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIGV4dGVuc2lvbiBzdGF0dXNlcyBvbiB0aGUgcGFnZVxuICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKGRhdGEuc3RhdHVzZXMpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN0YXR1cyBlcnJvclxuICAgICAqL1xuICAgIGhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9TdGF0dXNDaGVja0ZhaWxlZCB8fCAnRXh0ZW5zaW9uIHN0YXR1cyBjaGVjayBmYWlsZWQnO1xuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNc2csICdlcnJvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNpbmdsZSBleHRlbnNpb24gc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICovXG4gICAgdXBkYXRlRXh0ZW5zaW9uU3RhdHVzKGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IFxuICAgICAgICAgICAgZXh0ZW5zaW9uLFxuICAgICAgICAgICAgdHlwZSwgXG4gICAgICAgICAgICBzdGF0ZSxcbiAgICAgICAgICAgIHN0YXRlQ29sb3IsIFxuICAgICAgICAgICAgc3RhdGVJY29uLCBcbiAgICAgICAgICAgIHN0YXRlVGV4dCwgXG4gICAgICAgICAgICBzdGF0ZURlc2NyaXB0aW9uLFxuICAgICAgICAgICAgc3RhdGVEdXJhdGlvbixcbiAgICAgICAgICAgIGRldmljZUNvdW50LFxuICAgICAgICAgICAgYXZhaWxhYmxlRGV2aWNlcyxcbiAgICAgICAgICAgIGRldmljZXNcbiAgICAgICAgfSA9IGNoYW5nZTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gZXh0ZW5zaW9uO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGNhY2hlZCBlbGVtZW50cyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChleHRlbnNpb25JZCk7XG4gICAgICAgIGlmICghJHJvdykge1xuICAgICAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHNlbGVjdG9ycyBmb3IgZXh0ZW5zaW9uIHJvd3NcbiAgICAgICAgICAgICRyb3cgPSAkKGAjJHtleHRlbnNpb25JZH0sIHRyW2RhdGEtdmFsdWU9XCIke2V4dGVuc2lvbklkfVwiXSwgdHIuZXh0ZW5zaW9uLXJvd1tpZD1cIiR7ZXh0ZW5zaW9uSWR9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRSb3dzLnNldChleHRlbnNpb25JZCwgJHJvdyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybjsgLy8gUm93IG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBsZXQgJHN0YXR1c0NlbGwgPSB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLmdldChleHRlbnNpb25JZCk7XG4gICAgICAgIGlmICghJHN0YXR1c0NlbGwpIHtcbiAgICAgICAgICAgICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICAgICAgaWYgKCRzdGF0dXNDZWxsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFN0YXR1c0NlbGxzLnNldChleHRlbnNpb25JZCwgJHN0YXR1c0NlbGwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFN0YXR1cyBjZWxsIG5vdCBmb3VuZFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcmV2aW91c1N0YXRlID0gJHN0YXR1c0NlbGwuZGF0YSgncHJldi1zdGF0ZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIGRpcmVjdGx5IGZvciBzaW1wbGUgc3RhdHVzXG4gICAgICAgIGlmIChzdGF0ZUNvbG9yKSB7XG4gICAgICAgICAgICAvLyBTaW1wbGUgc3RhdHVzIGluZGljYXRvciB3aXRob3V0IGRldGFpbGVkIHRvb2x0aXBzXG4gICAgICAgICAgICBjb25zdCBzdGF0dXNIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSAke3N0YXRlQ29sb3J9IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgXG4gICAgICAgICAgICAgICAgICAgICBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCJcbiAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwiRXh0ZW5zaW9uICR7ZXh0ZW5zaW9uSWR9OiAke3N0YXRlVGV4dCB8fCBzdGF0ZX1cIj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBET01cbiAgICAgICAgICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChzdGF0dXNIdG1sKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBbmltYXRlIGlmIHN0YXRlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICBpZiAocHJldmlvdXNTdGF0ZSAmJiBwcmV2aW91c1N0YXRlICE9PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjdXJyZW50IHN0YXRlIGZvciBmdXR1cmUgY29tcGFyaXNvblxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnLCBzdGF0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBleHRlbnNpb24gc3RhdHVzZXMgd2l0aCBzaW1wbGUgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHN0YXR1c2VzKSB7XG4gICAgICAgIGlmICghc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGV4dGVuc2lvbiBzdGF0dXNcbiAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXMpLmZvckVhY2goZXh0ZW5zaW9uSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uRGF0YSA9IHN0YXR1c2VzW2V4dGVuc2lvbklkXTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25EYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdGVDb2xvciA9IHRoaXMuZ2V0Q29sb3JGb3JTdGF0dXMoZXh0ZW5zaW9uRGF0YS5zdGF0dXMpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlRXh0ZW5zaW9uU3RhdHVzKHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25JZCxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGU6IGV4dGVuc2lvbkRhdGEuc3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZUNvbG9yOiBzdGF0ZUNvbG9yXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGNvbG9yIGZvciBzdGF0dXMgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDb2xvckZvclN0YXR1cyhzdGF0dXMpIHtcbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ0F2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmVlbic7XG4gICAgICAgICAgICBjYXNlICdVbmF2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuICdncmV5JztcbiAgICAgICAgICAgIGNhc2UgJ0Rpc2FibGVkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2dyZXknO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHNpbXBsZSB1cGRhdGUgbm90aWZpY2F0aW9uXG4gICAgICovXG4gICAgc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCB0eXBlID0gJ2luZm8nLCBkdXJhdGlvbiA9IDMwMDApIHtcbiAgICAgICAgaWYgKCF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yIHx8ICF0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaW5kaWNhdG9yID0gdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvcjtcbiAgICAgICAgY29uc3QgJHN0YXR1c01lc3NhZ2UgPSAkaW5kaWNhdG9yLmZpbmQoJy5zdGF0dXMtbWVzc2FnZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGNsYXNzZXMgZm9yIHN0eWxpbmdcbiAgICAgICAgJGluZGljYXRvclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4gaW5mbyBzdWNjZXNzIGVycm9yIHdhcm5pbmcnKVxuICAgICAgICAgICAgLmFkZENsYXNzKHR5cGUpO1xuICAgICAgICBcbiAgICAgICAgJHN0YXR1c01lc3NhZ2UudGV4dChtZXNzYWdlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8taGlkZVxuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgdGhpcy5ub3RpZmljYXRpb25UaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAkaW5kaWNhdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSwgZHVyYXRpb24pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gbWFudWFsbHkgZGlzbWlzc1xuICAgICAgICAkaW5kaWNhdG9yLm9mZignY2xpY2suZGlzbWlzcycpLm9uKCdjbGljay5kaXNtaXNzJywgKCkgPT4ge1xuICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMubm90aWZpY2F0aW9uVGltZW91dCk7XG4gICAgICAgICAgICAkaW5kaWNhdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXF1ZXN0IGltbWVkaWF0ZSBzdGF0dXMgdXBkYXRlXG4gICAgICovXG4gICAgcmVxdWVzdFN0YXR1c1VwZGF0ZSgpIHtcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdmlhIEV4dGVuc2lvbnNBUEkgaWYgYXZhaWxhYmxlXG4gICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9uc0FQSSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuZ2V0U3RhdHVzZXMoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBkaXJlY3QgUkVTVCBBUEkgY2FsbFxuICAgICAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1wYnhjb3JlL2FwaS9leHRlbnNpb25zL2dldFN0YXR1c2VzYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ2dldFN0YXR1c2VzJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge31cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlQWxsRXh0ZW5zaW9uU3RhdHVzZXMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGNhY2hlZCByb3cgZWxlbWVudCBmb3IgZXh0ZW5zaW9uXG4gICAgICovXG4gICAgZ2V0Q2FjaGVkUm93KGV4dGVuc2lvbklkKSB7XG4gICAgICAgIGxldCAkcm93ID0gdGhpcy5jYWNoZWRSb3dzLmdldChleHRlbnNpb25JZCk7XG4gICAgICAgIGlmICghJHJvdyB8fCAhJHJvdy5sZW5ndGgpIHtcbiAgICAgICAgICAgICRyb3cgPSAkKGAjJHtleHRlbnNpb25JZH0sIHRyW2RhdGEtdmFsdWU9XCIke2V4dGVuc2lvbklkfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRyb3cubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRSb3dzLnNldChleHRlbnNpb25JZCwgJHJvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRyb3c7XG4gICAgfVxufTtcblxuLy8gU2ltcGxlIGluaXRpYWxpemF0aW9uIHdpdGhvdXQgZXh0cmEgVUkgZWxlbWVudHNcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICAvLyBBZGQgZG91YmxlLWNsaWNrIGhhbmRsZXJzIGZvciBzdGF0dXMgY2VsbHMgdG8gbmF2aWdhdGUgdG8gZXh0ZW5zaW9uIG1vZGlmeVxuICAgICQoZG9jdW1lbnQpLm9uKCdkYmxjbGljaycsICcuZXh0ZW5zaW9uLXN0YXR1cyAudWkubGFiZWwnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbklkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJykgfHwgJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgY29uc3QgZGF0YWJhc2VJZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWV4dGVuc2lvbi1pZCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGRhdGFiYXNlSWQpIHtcbiAgICAgICAgICAgIC8vIE5hdmlnYXRlIHRvIGV4dGVuc2lvbiBtb2RpZnkgcGFnZSBmb3IgZGV0YWlsZWQgc3RhdHVzXG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtkYXRhYmFzZUlkfWA7XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG4vLyBEb24ndCBhdXRvLWluaXRpYWxpemUgdGhlIG1vbml0b3IgaGVyZSAtIGxldCBleHRlbnNpb25zLWluZGV4LmpzIGhhbmRsZSBpdFxuLy8gVGhpcyBhbGxvd3MgZm9yIHByb3BlciBzZXF1ZW5jaW5nIHdpdGggRGF0YVRhYmxlIGluaXRpYWxpemF0aW9uXG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5FeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3IgPSBFeHRlbnNpb25JbmRleFN0YXR1c01vbml0b3I7Il19