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
 * Extension Status Monitor
 * Simple extension status monitoring for index page:
 * - Shows basic online/offline/unknown status indicators
 * - Real-time status updates via EventBus
 * - Backend-provided display properties (no hardcoded state mapping)
 * - Detailed status monitoring is handled in extension modify form
 */
var ExtensionStatusMonitor = {
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
   * No hardcoded state mapping - backend provides all display properties
   */
  updateExtensionStatus: function updateExtensionStatus(change) {
    var extension = change.extension,
        extension_number = change.extension_number,
        type = change.type,
        state = change.state,
        new_state = change.new_state,
        old_state = change.old_state,
        stateColor = change.stateColor,
        stateIcon = change.stateIcon,
        stateText = change.stateText,
        stateDescription = change.stateDescription,
        stateDuration = change.stateDuration,
        deviceCount = change.deviceCount,
        availableDevices = change.availableDevices,
        devices = change.devices; // Use extension or extension_number as identifier

    var extensionId = extension || extension_number; // Use cached elements for better performance

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
    } // Use current state or fallback to new_state for compatibility


    var currentState = state || new_state;
    var previousState = $statusCell.data('prev-state'); // Use backend-provided display properties directly for simple status

    if (stateColor) {
      // Simple status indicator without detailed tooltips
      var statusHtml = "\n                <div class=\"ui ".concat(stateColor, " empty circular label\" \n                     style=\"width: 1px;height: 1px;\"\n                     title=\"Extension ").concat(extensionId, ": ").concat(stateText || currentState, "\">\n                </div>\n            "); // Update DOM

      requestAnimationFrame(function () {
        $statusCell.html(statusHtml); // Animate if state changed

        if (previousState && previousState !== currentState) {
          $statusCell.transition('pulse');
        } // Store current state for future comparison


        $statusCell.data('prev-state', currentState);
      });
    } else {
      // Fallback for backward compatibility - use simple state-based display
      this.updateExtensionStatusLegacy(change);
    }
  },

  /**
   * Legacy status update method for backward compatibility
   */
  updateExtensionStatusLegacy: function updateExtensionStatusLegacy(change) {
    var extension = change.extension,
        extension_number = change.extension_number,
        new_state = change.new_state,
        old_state = change.old_state;
    var extensionId = extension || extension_number;
    var $row = $("#".concat(extensionId, ", tr[data-value=\"").concat(extensionId, "\"]"));
    if ($row.length === 0) return;
    var $statusCell = $row.find('.extension-status');
    if ($statusCell.length === 0) return; // Clear any existing content

    $statusCell.html(''); // Simple status indicators

    var green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
    var grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
    var yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';
    var red = '<div class="ui red empty circular label" style="width: 1px;height: 1px;"></div>'; // Basic state mapping for backward compatibility

    var normalizedState = (new_state || '').toUpperCase();

    switch (normalizedState) {
      case 'OK':
      case 'AVAILABLE':
        $statusCell.html(green);
        break;

      case 'BUSY':
      case 'RINGING':
        $statusCell.html(yellow);
        break;

      case 'UNAVAILABLE':
      case 'UNREACHABLE':
        $statusCell.html(red);
        break;

      default:
        $statusCell.html(grey);
        break;
    } // Add animation for change


    if (old_state !== new_state) {
      $statusCell.transition('pulse');
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
        _this6.updateExtensionStatus({
          extension: extensionId,
          extension_number: extensionId,
          // For compatibility
          type: 'extension',
          state: extensionData.state,
          new_state: extensionData.state,
          // For backward compatibility
          old_state: extensionData.state,
          // No animation for bulk update
          stateColor: extensionData.stateColor,
          stateText: extensionData.stateText,
          stateDescription: extensionData.stateDescription
        });
      }
    });
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

window.ExtensionStatusMonitor = ExtensionStatusMonitor;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi1zdGF0dXMtbW9uaXRvci5qcyJdLCJuYW1lcyI6WyJFeHRlbnNpb25TdGF0dXNNb25pdG9yIiwiY2hhbm5lbElkIiwiaXNJbml0aWFsaXplZCIsImxhc3RVcGRhdGVUaW1lIiwic3RhdHVzQ2FjaGUiLCIkc3RhdHVzQ2VsbHMiLCIkbGFzdFVwZGF0ZUluZGljYXRvciIsImNhY2hlZFJvd3MiLCJNYXAiLCJjYWNoZWRTdGF0dXNDZWxscyIsImluaXRpYWxpemUiLCJjYWNoZUVsZW1lbnRzIiwiY3JlYXRlU3RhdHVzSW5kaWNhdG9yIiwic3Vic2NyaWJlVG9FdmVudHMiLCJzZXR1cEhlYWx0aENoZWNrcyIsIiQiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJHJvdyIsImlkIiwiYXR0ciIsInNldCIsIiRzdGF0dXNDZWxsIiwiZmluZCIsImxlbmd0aCIsImluZGljYXRvciIsInByZXBlbmQiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsIm1lc3NhZ2UiLCJoYW5kbGVFdmVudEJ1c01lc3NhZ2UiLCJzZXRJbnRlcnZhbCIsInJlZnJlc2hDYWNoZSIsInJlcXVlc3RTdGF0dXNVcGRhdGUiLCJjbGVhciIsImV2ZW50IiwiZGF0YSIsInNob3dDaGVja2luZ0luZGljYXRvciIsInByb2Nlc3NTdGF0dXNVcGRhdGUiLCJwcm9jZXNzQ29tcGxldGVTdGF0dXMiLCJoYW5kbGVTdGF0dXNFcnJvciIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfQ2hlY2tpbmdFeHRlbnNpb25TdGF0dXNlcyIsInNldFRpbWVvdXQiLCJjaGFuZ2VzIiwiQXJyYXkiLCJpc0FycmF5IiwidGltZXN0YW1wIiwiRGF0ZSIsIm5vdyIsImZvckVhY2giLCJjaGFuZ2UiLCJ1cGRhdGVFeHRlbnNpb25TdGF0dXMiLCJjaGFuZ2VDb3VudCIsImV4X09uZUV4dGVuc2lvblN0YXR1c0NoYW5nZWQiLCJleF9NdWx0aXBsZUV4dGVuc2lvblN0YXR1c2VzQ2hhbmdlZCIsInJlcGxhY2UiLCJzaG93VXBkYXRlTm90aWZpY2F0aW9uIiwic3RhdHVzZXMiLCJ1cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyIsImVycm9yTXNnIiwiZXJyb3IiLCJleF9TdGF0dXNDaGVja0ZhaWxlZCIsImV4dGVuc2lvbiIsImV4dGVuc2lvbl9udW1iZXIiLCJ0eXBlIiwic3RhdGUiLCJuZXdfc3RhdGUiLCJvbGRfc3RhdGUiLCJzdGF0ZUNvbG9yIiwic3RhdGVJY29uIiwic3RhdGVUZXh0Iiwic3RhdGVEZXNjcmlwdGlvbiIsInN0YXRlRHVyYXRpb24iLCJkZXZpY2VDb3VudCIsImF2YWlsYWJsZURldmljZXMiLCJkZXZpY2VzIiwiZXh0ZW5zaW9uSWQiLCJnZXQiLCJjdXJyZW50U3RhdGUiLCJwcmV2aW91c1N0YXRlIiwic3RhdHVzSHRtbCIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImh0bWwiLCJ0cmFuc2l0aW9uIiwidXBkYXRlRXh0ZW5zaW9uU3RhdHVzTGVnYWN5IiwiZ3JlZW4iLCJncmV5IiwieWVsbG93IiwicmVkIiwibm9ybWFsaXplZFN0YXRlIiwidG9VcHBlckNhc2UiLCJPYmplY3QiLCJrZXlzIiwiZXh0ZW5zaW9uRGF0YSIsImR1cmF0aW9uIiwiJGluZGljYXRvciIsIiRzdGF0dXNNZXNzYWdlIiwiY2xlYXJUaW1lb3V0Iiwibm90aWZpY2F0aW9uVGltZW91dCIsIm9mZiIsIm9uIiwiRXh0ZW5zaW9uc0FQSSIsImdldFN0YXR1c2VzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiYWN0aW9uIiwib25TdWNjZXNzIiwiZ2V0Q2FjaGVkUm93IiwiZG9jdW1lbnQiLCJyZWFkeSIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsImNsb3Nlc3QiLCJkYXRhYmFzZUlkIiwid2luZG93IiwibG9jYXRpb24iLCJocmVmIl0sIm1hcHBp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O0FBQ2IsYUFBS2xCLFVBQUwsQ0FBZ0JlLEdBQWhCLENBQW9CMkQsV0FBcEIsRUFBaUM5RCxJQUFqQztBQUNIO0FBQ0o7O0FBQ0QsV0FBT0EsSUFBUDtBQUNIO0FBdmMwQixDQUEvQixDLENBMGNBOztBQUNBSixDQUFDLENBQUNzRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCO0FBQ0F2RyxFQUFBQSxDQUFDLENBQUNzRyxRQUFELENBQUQsQ0FBWVosRUFBWixDQUFlLFVBQWYsRUFBMkIsNkJBQTNCLEVBQTBELFVBQVNjLENBQVQsRUFBWTtBQUNsRUEsSUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FELElBQUFBLENBQUMsQ0FBQ0UsZUFBRjtBQUVBLFFBQU14QyxXQUFXLEdBQUdsRSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVEyRyxPQUFSLENBQWdCLElBQWhCLEVBQXNCckcsSUFBdEIsQ0FBMkIsSUFBM0IsS0FBb0NOLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTJHLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0JyRyxJQUF0QixDQUEyQixZQUEzQixDQUF4RDtBQUNBLFFBQU1zRyxVQUFVLEdBQUc1RyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVEyRyxPQUFSLENBQWdCLElBQWhCLEVBQXNCckcsSUFBdEIsQ0FBMkIsbUJBQTNCLENBQW5COztBQUVBLFFBQUlzRyxVQUFKLEVBQWdCO0FBQ1o7QUFDQUMsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxJQUFoQixhQUEwQmQsYUFBMUIsK0JBQTREVyxVQUE1RDtBQUNIO0FBQ0osR0FYRDtBQVlILENBZEQsRSxDQWdCQTtBQUNBO0FBRUE7O0FBQ0FDLE1BQU0sQ0FBQzVILHNCQUFQLEdBQWdDQSxzQkFBaEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBFdmVudEJ1cywgRXh0ZW5zaW9uc0FQSSAqL1xuXG4vKipcbiAqIEV4dGVuc2lvbiBTdGF0dXMgTW9uaXRvclxuICogU2ltcGxlIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvcmluZyBmb3IgaW5kZXggcGFnZTpcbiAqIC0gU2hvd3MgYmFzaWMgb25saW5lL29mZmxpbmUvdW5rbm93biBzdGF0dXMgaW5kaWNhdG9yc1xuICogLSBSZWFsLXRpbWUgc3RhdHVzIHVwZGF0ZXMgdmlhIEV2ZW50QnVzXG4gKiAtIEJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzIChubyBoYXJkY29kZWQgc3RhdGUgbWFwcGluZylcbiAqIC0gRGV0YWlsZWQgc3RhdHVzIG1vbml0b3JpbmcgaXMgaGFuZGxlZCBpbiBleHRlbnNpb24gbW9kaWZ5IGZvcm1cbiAqL1xuY29uc3QgRXh0ZW5zaW9uU3RhdHVzTW9uaXRvciA9IHtcbiAgICBjaGFubmVsSWQ6ICdleHRlbnNpb24tc3RhdHVzJyxcbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcbiAgICBsYXN0VXBkYXRlVGltZTogMCxcbiAgICBzdGF0dXNDYWNoZToge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHNcbiAgICAgKi9cbiAgICAkc3RhdHVzQ2VsbHM6IG51bGwsXG4gICAgJGxhc3RVcGRhdGVJbmRpY2F0b3I6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRE9NIGNhY2hlIGZvciBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb25cbiAgICAgKi9cbiAgICBjYWNoZWRSb3dzOiBuZXcgTWFwKCksXG4gICAgY2FjaGVkU3RhdHVzQ2VsbHM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBleHRlbnNpb24gc3RhdHVzIG1vbml0b3Igd2l0aCBlbmhhbmNlZCBmZWF0dXJlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmICh0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FjaGUgRE9NIGVsZW1lbnRzIGZvciBwZXJmb3JtYW5jZVxuICAgICAgICB0aGlzLmNhY2hlRWxlbWVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAgICB0aGlzLmNyZWF0ZVN0YXR1c0luZGljYXRvcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGNoYW5uZWwgZm9yIHJlYWwtdGltZSB1cGRhdGVzXG4gICAgICAgIHRoaXMuc3Vic2NyaWJlVG9FdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB1cCBwZXJpb2RpYyBoZWFsdGggY2hlY2tzXG4gICAgICAgIHRoaXMuc2V0dXBIZWFsdGhDaGVja3MoKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWNoZSBET00gZWxlbWVudHMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxuICAgICAqL1xuICAgIGNhY2hlRWxlbWVudHMoKSB7XG4gICAgICAgIHRoaXMuJHN0YXR1c0NlbGxzID0gJCgnLmV4dGVuc2lvbi1zdGF0dXMsIC5leHRlbnNpb24tc3RhdHVzLWNlbGwnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIGV4dGVuc2lvbiByb3dzIGZvciBxdWljayBhY2Nlc3NcbiAgICAgICAgJCgndHIuZXh0ZW5zaW9uLXJvdywgdHJbaWRdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkcm93LmF0dHIoJ2lkJykgfHwgJHJvdy5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGlkLCAkcm93KTtcbiAgICAgICAgICAgICAgICBjb25zdCAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuc2V0KGlkLCAkc3RhdHVzQ2VsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzaW1wbGUgc3RhdHVzIGluZGljYXRvclxuICAgICAqL1xuICAgIGNyZWF0ZVN0YXR1c0luZGljYXRvcigpIHtcbiAgICAgICAgaWYgKCQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc3QgaW5kaWNhdG9yID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJleHRlbnNpb24tc3RhdHVzLWluZGljYXRvclwiIGNsYXNzPVwidWkgbWluaSBtZXNzYWdlIGhpZGRlblwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInN5bmMgYWx0ZXJuYXRlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy1tZXNzYWdlXCI+PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcudWkuY29udGFpbmVyLnNlZ21lbnQnKS5wcmVwZW5kKGluZGljYXRvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvciA9ICQoJyNleHRlbnNpb24tc3RhdHVzLWluZGljYXRvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGZvciByZWFsLXRpbWUgdXBkYXRlc1xuICAgICAqL1xuICAgIHN1YnNjcmliZVRvRXZlbnRzKCkge1xuICAgICAgICBpZiAodHlwZW9mIEV2ZW50QnVzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKCdleHRlbnNpb24tc3RhdHVzJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIEV2ZW50QnVzIG5vdCBhdmFpbGFibGUsIGV4dGVuc2lvbiBzdGF0dXMgbW9uaXRvciB3aWxsIHdvcmsgd2l0aG91dCByZWFsLXRpbWUgdXBkYXRlc1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0dXAgcGVyaW9kaWMgaGVhbHRoIGNoZWNrcyBhbmQgY2FjaGUgbWFpbnRlbmFuY2VcbiAgICAgKi9cbiAgICBzZXR1cEhlYWx0aENoZWNrcygpIHtcbiAgICAgICAgLy8gUmVmcmVzaCBjYWNoZSBldmVyeSAzMCBzZWNvbmRzIHRvIGhhbmRsZSBkeW5hbWljIGNvbnRlbnRcbiAgICAgICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZWZyZXNoQ2FjaGUoKTtcbiAgICAgICAgfSwgMzAwMDApO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVxdWVzdCBzdGF0dXMgdXBkYXRlIGV2ZXJ5IDIgbWludXRlcyBhcyBmYWxsYmFja1xuICAgICAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RTdGF0dXNVcGRhdGUoKTtcbiAgICAgICAgfSwgMTIwMDAwKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggY2FjaGVkIERPTSBlbGVtZW50c1xuICAgICAqL1xuICAgIHJlZnJlc2hDYWNoZSgpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZWRSb3dzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuY2FjaGVkU3RhdHVzQ2VsbHMuY2xlYXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlYnVpbGQgY2FjaGVcbiAgICAgICAgdGhpcy5jYWNoZUVsZW1lbnRzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgRXZlbnRCdXMgbWVzc2FnZVxuICAgICAqL1xuICAgIGhhbmRsZUV2ZW50QnVzTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFdmVudEJ1cyBtZXNzYWdlIGNhbiBoYXZlIGV2ZW50IGF0IHRvcCBsZXZlbCBvciBpbiBkYXRhXG4gICAgICAgIGxldCBldmVudCwgZGF0YTtcbiAgICAgICAgaWYgKG1lc3NhZ2UuZXZlbnQpIHtcbiAgICAgICAgICAgIC8vIEV2ZW50IGF0IHRvcCBsZXZlbFxuICAgICAgICAgICAgZXZlbnQgPSBtZXNzYWdlLmV2ZW50O1xuICAgICAgICAgICAgZGF0YSA9IG1lc3NhZ2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmRhdGEgJiYgbWVzc2FnZS5kYXRhLmV2ZW50KSB7XG4gICAgICAgICAgICAvLyBFdmVudCBpbiBkYXRhXG4gICAgICAgICAgICBldmVudCA9IG1lc3NhZ2UuZGF0YS5ldmVudDtcbiAgICAgICAgICAgIGRhdGEgPSBtZXNzYWdlLmRhdGEuZGF0YSB8fCBtZXNzYWdlLmRhdGE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoZXZlbnQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N0YXR1c19jaGVjayc6XG4gICAgICAgICAgICAgICAgdGhpcy5zaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfdXBkYXRlJzpcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBjYXNlICdzdGF0dXNfY29tcGxldGUnOlxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc0NvbXBsZXRlU3RhdHVzKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgY2FzZSAnc3RhdHVzX2Vycm9yJzpcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBVbmtub3duIGV2ZW50IHR5cGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBjaGVja2luZyBpbmRpY2F0b3JcbiAgICAgKi9cbiAgICBzaG93Q2hlY2tpbmdJbmRpY2F0b3IoZGF0YSkge1xuICAgICAgICB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBlcnJvciBzdWNjZXNzJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnaW5mbycpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IuZmluZCgnLmNvbnRlbnQnKVxuICAgICAgICAgICAgLnRleHQoZGF0YS5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9DaGVja2luZ0V4dGVuc2lvblN0YXR1c2VzIHx8ICdDaGVja2luZyBleHRlbnNpb24gc3RhdHVzZXMuLi4nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBBdXRvLWhpZGUgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy4kbGFzdFVwZGF0ZUluZGljYXRvci5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIH0sIDMwMDApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBzdGF0dXMgdXBkYXRlIHdpdGggY2hhbmdlc1xuICAgICAqL1xuICAgIHByb2Nlc3NTdGF0dXNVcGRhdGUoZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEuY2hhbmdlcyB8fCAhQXJyYXkuaXNBcnJheShkYXRhLmNoYW5nZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IGRhdGEudGltZXN0YW1wIHx8IERhdGUubm93KCkgLyAxMDAwO1xuICAgICAgICB0aGlzLmxhc3RVcGRhdGVUaW1lID0gdGltZXN0YW1wO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNoYW5nZVxuICAgICAgICBkYXRhLmNoYW5nZXMuZm9yRWFjaChjaGFuZ2UgPT4ge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXMoY2hhbmdlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgICAgY29uc3QgY2hhbmdlQ291bnQgPSBkYXRhLmNoYW5nZXMubGVuZ3RoO1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gY2hhbmdlQ291bnQgPT09IDEgXG4gICAgICAgICAgICA/IGdsb2JhbFRyYW5zbGF0ZS5leF9PbmVFeHRlbnNpb25TdGF0dXNDaGFuZ2VkIHx8ICdPbmUgZXh0ZW5zaW9uIHN0YXR1cyBjaGFuZ2VkJ1xuICAgICAgICAgICAgOiAoZ2xvYmFsVHJhbnNsYXRlLmV4X011bHRpcGxlRXh0ZW5zaW9uU3RhdHVzZXNDaGFuZ2VkIHx8ICdNdWx0aXBsZSBleHRlbnNpb24gc3RhdHVzZXMgY2hhbmdlZCcpLnJlcGxhY2UoJyVzJywgY2hhbmdlQ291bnQpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMuc2hvd1VwZGF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBjb21wbGV0ZSBzdGF0dXMgZGF0YVxuICAgICAqL1xuICAgIHByb2Nlc3NDb21wbGV0ZVN0YXR1cyhkYXRhKSB7XG4gICAgICAgIGlmICghZGF0YS5zdGF0dXNlcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2FjaGVcbiAgICAgICAgdGhpcy5zdGF0dXNDYWNoZSA9IGRhdGEuc3RhdHVzZXM7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIGV4dGVuc2lvbiBzdGF0dXNlcyBvbiB0aGUgcGFnZVxuICAgICAgICB0aGlzLnVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKGRhdGEuc3RhdHVzZXMpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHN0YXR1cyBlcnJvclxuICAgICAqL1xuICAgIGhhbmRsZVN0YXR1c0Vycm9yKGRhdGEpIHtcbiAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leF9TdGF0dXNDaGVja0ZhaWxlZCB8fCAnRXh0ZW5zaW9uIHN0YXR1cyBjaGVjayBmYWlsZWQnO1xuICAgICAgICB0aGlzLnNob3dVcGRhdGVOb3RpZmljYXRpb24oZXJyb3JNc2csICdlcnJvcicpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNpbmdsZSBleHRlbnNpb24gc3RhdHVzIHVzaW5nIGJhY2tlbmQtcHJvdmlkZWQgZGlzcGxheSBwcm9wZXJ0aWVzXG4gICAgICogTm8gaGFyZGNvZGVkIHN0YXRlIG1hcHBpbmcgLSBiYWNrZW5kIHByb3ZpZGVzIGFsbCBkaXNwbGF5IHByb3BlcnRpZXNcbiAgICAgKi9cbiAgICB1cGRhdGVFeHRlbnNpb25TdGF0dXMoY2hhbmdlKSB7XG4gICAgICAgIGNvbnN0IHsgXG4gICAgICAgICAgICBleHRlbnNpb24sIFxuICAgICAgICAgICAgZXh0ZW5zaW9uX251bWJlcixcbiAgICAgICAgICAgIHR5cGUsIFxuICAgICAgICAgICAgc3RhdGUsXG4gICAgICAgICAgICBuZXdfc3RhdGUsIFxuICAgICAgICAgICAgb2xkX3N0YXRlLFxuICAgICAgICAgICAgc3RhdGVDb2xvciwgXG4gICAgICAgICAgICBzdGF0ZUljb24sIFxuICAgICAgICAgICAgc3RhdGVUZXh0LCBcbiAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb24sXG4gICAgICAgICAgICBzdGF0ZUR1cmF0aW9uLFxuICAgICAgICAgICAgZGV2aWNlQ291bnQsXG4gICAgICAgICAgICBhdmFpbGFibGVEZXZpY2VzLFxuICAgICAgICAgICAgZGV2aWNlc1xuICAgICAgICB9ID0gY2hhbmdlO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGV4dGVuc2lvbiBvciBleHRlbnNpb25fbnVtYmVyIGFzIGlkZW50aWZpZXJcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSBleHRlbnNpb24gfHwgZXh0ZW5zaW9uX251bWJlcjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBjYWNoZWQgZWxlbWVudHMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgJHJvdyA9IHRoaXMuY2FjaGVkUm93cy5nZXQoZXh0ZW5zaW9uSWQpO1xuICAgICAgICBpZiAoISRyb3cpIHtcbiAgICAgICAgICAgIC8vIFRyeSBtdWx0aXBsZSBzZWxlY3RvcnMgZm9yIGV4dGVuc2lvbiByb3dzXG4gICAgICAgICAgICAkcm93ID0gJChgIyR7ZXh0ZW5zaW9uSWR9LCB0cltkYXRhLXZhbHVlPVwiJHtleHRlbnNpb25JZH1cIl0sIHRyLmV4dGVuc2lvbi1yb3dbaWQ9XCIke2V4dGVuc2lvbklkfVwiXWApO1xuICAgICAgICAgICAgaWYgKCRyb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMuY2FjaGVkUm93cy5zZXQoZXh0ZW5zaW9uSWQsICRyb3cpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIFJvdyBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbGV0ICRzdGF0dXNDZWxsID0gdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5nZXQoZXh0ZW5zaW9uSWQpO1xuICAgICAgICBpZiAoISRzdGF0dXNDZWxsKSB7XG4gICAgICAgICAgICAkc3RhdHVzQ2VsbCA9ICRyb3cuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKTtcbiAgICAgICAgICAgIGlmICgkc3RhdHVzQ2VsbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jYWNoZWRTdGF0dXNDZWxscy5zZXQoZXh0ZW5zaW9uSWQsICRzdGF0dXNDZWxsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBTdGF0dXMgY2VsbCBub3QgZm91bmRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlIGN1cnJlbnQgc3RhdGUgb3IgZmFsbGJhY2sgdG8gbmV3X3N0YXRlIGZvciBjb21wYXRpYmlsaXR5XG4gICAgICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IHN0YXRlIHx8IG5ld19zdGF0ZTtcbiAgICAgICAgY29uc3QgcHJldmlvdXNTdGF0ZSA9ICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBiYWNrZW5kLXByb3ZpZGVkIGRpc3BsYXkgcHJvcGVydGllcyBkaXJlY3RseSBmb3Igc2ltcGxlIHN0YXR1c1xuICAgICAgICBpZiAoc3RhdGVDb2xvcikge1xuICAgICAgICAgICAgLy8gU2ltcGxlIHN0YXR1cyBpbmRpY2F0b3Igd2l0aG91dCBkZXRhaWxlZCB0b29sdGlwc1xuICAgICAgICAgICAgY29uc3Qgc3RhdHVzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgJHtzdGF0ZUNvbG9yfSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIFxuICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiXG4gICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIkV4dGVuc2lvbiAke2V4dGVuc2lvbklkfTogJHtzdGF0ZVRleHQgfHwgY3VycmVudFN0YXRlfVwiPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIERPTVxuICAgICAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKHN0YXR1c0h0bWwpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFuaW1hdGUgaWYgc3RhdGUgY2hhbmdlZFxuICAgICAgICAgICAgICAgIGlmIChwcmV2aW91c1N0YXRlICYmIHByZXZpb3VzU3RhdGUgIT09IGN1cnJlbnRTdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC50cmFuc2l0aW9uKCdwdWxzZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBjdXJyZW50IHN0YXRlIGZvciBmdXR1cmUgY29tcGFyaXNvblxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmRhdGEoJ3ByZXYtc3RhdGUnLCBjdXJyZW50U3RhdGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSAtIHVzZSBzaW1wbGUgc3RhdGUtYmFzZWQgZGlzcGxheVxuICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXNMZWdhY3koY2hhbmdlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTGVnYWN5IHN0YXR1cyB1cGRhdGUgbWV0aG9kIGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlRXh0ZW5zaW9uU3RhdHVzTGVnYWN5KGNoYW5nZSkge1xuICAgICAgICBjb25zdCB7IGV4dGVuc2lvbiwgZXh0ZW5zaW9uX251bWJlciwgbmV3X3N0YXRlLCBvbGRfc3RhdGUgfSA9IGNoYW5nZTtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSBleHRlbnNpb24gfHwgZXh0ZW5zaW9uX251bWJlcjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHtleHRlbnNpb25JZH0sIHRyW2RhdGEtdmFsdWU9XCIke2V4dGVuc2lvbklkfVwiXWApO1xuICAgICAgICBpZiAoJHJvdy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRzdGF0dXNDZWxsID0gJHJvdy5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpO1xuICAgICAgICBpZiAoJHN0YXR1c0NlbGwubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKCcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNpbXBsZSBzdGF0dXMgaW5kaWNhdG9yc1xuICAgICAgICBjb25zdCBncmVlbiA9ICc8ZGl2IGNsYXNzPVwidWkgZ3JlZW4gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+JztcbiAgICAgICAgY29uc3QgZ3JleSA9ICc8ZGl2IGNsYXNzPVwidWkgZ3JleSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuICAgICAgICBjb25zdCB5ZWxsb3cgPSAnPGRpdiBjbGFzcz1cInVpIHllbGxvdyBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuICAgICAgICBjb25zdCByZWQgPSAnPGRpdiBjbGFzcz1cInVpIHJlZCBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gQmFzaWMgc3RhdGUgbWFwcGluZyBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgICAgICBjb25zdCBub3JtYWxpemVkU3RhdGUgPSAobmV3X3N0YXRlIHx8ICcnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBzd2l0Y2ggKG5vcm1hbGl6ZWRTdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAnT0snOlxuICAgICAgICAgICAgY2FzZSAnQVZBSUxBQkxFJzpcbiAgICAgICAgICAgICAgICAkc3RhdHVzQ2VsbC5odG1sKGdyZWVuKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ0JVU1knOlxuICAgICAgICAgICAgY2FzZSAnUklOR0lORyc6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbCh5ZWxsb3cpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnVU5BVkFJTEFCTEUnOlxuICAgICAgICAgICAgY2FzZSAnVU5SRUFDSEFCTEUnOlxuICAgICAgICAgICAgICAgICRzdGF0dXNDZWxsLmh0bWwocmVkKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgJHN0YXR1c0NlbGwuaHRtbChncmV5KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFuaW1hdGlvbiBmb3IgY2hhbmdlXG4gICAgICAgIGlmIChvbGRfc3RhdGUgIT09IG5ld19zdGF0ZSkge1xuICAgICAgICAgICAgJHN0YXR1c0NlbGwudHJhbnNpdGlvbigncHVsc2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGFsbCBleHRlbnNpb24gc3RhdHVzZXMgd2l0aCBzaW1wbGUgZGlzcGxheVxuICAgICAqL1xuICAgIHVwZGF0ZUFsbEV4dGVuc2lvblN0YXR1c2VzKHN0YXR1c2VzKSB7XG4gICAgICAgIGlmICghc3RhdHVzZXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGV4dGVuc2lvbiBzdGF0dXNcbiAgICAgICAgT2JqZWN0LmtleXMoc3RhdHVzZXMpLmZvckVhY2goZXh0ZW5zaW9uSWQgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uRGF0YSA9IHN0YXR1c2VzW2V4dGVuc2lvbklkXTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25EYXRhKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVFeHRlbnNpb25TdGF0dXMoe1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGV4dGVuc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25fbnVtYmVyOiBleHRlbnNpb25JZCwgLy8gRm9yIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlOiBleHRlbnNpb25EYXRhLnN0YXRlLFxuICAgICAgICAgICAgICAgICAgICBuZXdfc3RhdGU6IGV4dGVuc2lvbkRhdGEuc3RhdGUsIC8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgICAgICAgIG9sZF9zdGF0ZTogZXh0ZW5zaW9uRGF0YS5zdGF0ZSwgLy8gTm8gYW5pbWF0aW9uIGZvciBidWxrIHVwZGF0ZVxuICAgICAgICAgICAgICAgICAgICBzdGF0ZUNvbG9yOiBleHRlbnNpb25EYXRhLnN0YXRlQ29sb3IsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlVGV4dDogZXh0ZW5zaW9uRGF0YS5zdGF0ZVRleHQsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlRGVzY3JpcHRpb246IGV4dGVuc2lvbkRhdGEuc3RhdGVEZXNjcmlwdGlvblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgc2ltcGxlIHVwZGF0ZSBub3RpZmljYXRpb25cbiAgICAgKi9cbiAgICBzaG93VXBkYXRlTm90aWZpY2F0aW9uKG1lc3NhZ2UsIHR5cGUgPSAnaW5mbycsIGR1cmF0aW9uID0gMzAwMCkge1xuICAgICAgICBpZiAoIXRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IgfHwgIXRoaXMuJGxhc3RVcGRhdGVJbmRpY2F0b3IubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRpbmRpY2F0b3IgPSB0aGlzLiRsYXN0VXBkYXRlSW5kaWNhdG9yO1xuICAgICAgICBjb25zdCAkc3RhdHVzTWVzc2FnZSA9ICRpbmRpY2F0b3IuZmluZCgnLnN0YXR1cy1tZXNzYWdlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY2xhc3NlcyBmb3Igc3R5bGluZ1xuICAgICAgICAkaW5kaWNhdG9yXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBpbmZvIHN1Y2Nlc3MgZXJyb3Igd2FybmluZycpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModHlwZSk7XG4gICAgICAgIFxuICAgICAgICAkc3RhdHVzTWVzc2FnZS50ZXh0KG1lc3NhZ2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1oaWRlXG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQpO1xuICAgICAgICB0aGlzLm5vdGlmaWNhdGlvblRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9LCBkdXJhdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciB0byBtYW51YWxseSBkaXNtaXNzXG4gICAgICAgICRpbmRpY2F0b3Iub2ZmKCdjbGljay5kaXNtaXNzJykub24oJ2NsaWNrLmRpc21pc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5ub3RpZmljYXRpb25UaW1lb3V0KTtcbiAgICAgICAgICAgICRpbmRpY2F0b3IuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlcXVlc3QgaW1tZWRpYXRlIHN0YXR1cyB1cGRhdGVcbiAgICAgKi9cbiAgICByZXF1ZXN0U3RhdHVzVXBkYXRlKCkge1xuICAgICAgICAvLyBSZXF1ZXN0IHN0YXR1cyB2aWEgRXh0ZW5zaW9uc0FQSSBpZiBhdmFpbGFibGVcbiAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zQVBJICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgRXh0ZW5zaW9uc0FQSS5nZXRTdGF0dXNlcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBSRVNUIEFQSSBjYWxsXG4gICAgICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXBieGNvcmUvYXBpL2V4dGVuc2lvbnMvZ2V0U3RhdHVzZXNgLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnZ2V0U3RhdHVzZXMnLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7fVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVBbGxFeHRlbnNpb25TdGF0dXNlcyhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY2FjaGVkIHJvdyBlbGVtZW50IGZvciBleHRlbnNpb25cbiAgICAgKi9cbiAgICBnZXRDYWNoZWRSb3coZXh0ZW5zaW9uSWQpIHtcbiAgICAgICAgbGV0ICRyb3cgPSB0aGlzLmNhY2hlZFJvd3MuZ2V0KGV4dGVuc2lvbklkKTtcbiAgICAgICAgaWYgKCEkcm93IHx8ICEkcm93Lmxlbmd0aCkge1xuICAgICAgICAgICAgJHJvdyA9ICQoYCMke2V4dGVuc2lvbklkfSwgdHJbZGF0YS12YWx1ZT1cIiR7ZXh0ZW5zaW9uSWR9XCJdYCk7XG4gICAgICAgICAgICBpZiAoJHJvdy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhY2hlZFJvd3Muc2V0KGV4dGVuc2lvbklkLCAkcm93KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJHJvdztcbiAgICB9XG59O1xuXG4vLyBTaW1wbGUgaW5pdGlhbGl6YXRpb24gd2l0aG91dCBleHRyYSBVSSBlbGVtZW50c1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIC8vIEFkZCBkb3VibGUtY2xpY2sgaGFuZGxlcnMgZm9yIHN0YXR1cyBjZWxscyB0byBuYXZpZ2F0ZSB0byBleHRlbnNpb24gbW9kaWZ5XG4gICAgJChkb2N1bWVudCkub24oJ2RibGNsaWNrJywgJy5leHRlbnNpb24tc3RhdHVzIC51aS5sYWJlbCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9uSWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKSB8fCAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICBjb25zdCBkYXRhYmFzZUlkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtZXh0ZW5zaW9uLWlkJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoZGF0YWJhc2VJZCkge1xuICAgICAgICAgICAgLy8gTmF2aWdhdGUgdG8gZXh0ZW5zaW9uIG1vZGlmeSBwYWdlIGZvciBkZXRhaWxlZCBzdGF0dXNcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL21vZGlmeS8ke2RhdGFiYXNlSWR9YDtcbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cbi8vIERvbid0IGF1dG8taW5pdGlhbGl6ZSB0aGUgbW9uaXRvciBoZXJlIC0gbGV0IGV4dGVuc2lvbnMtaW5kZXguanMgaGFuZGxlIGl0XG4vLyBUaGlzIGFsbG93cyBmb3IgcHJvcGVyIHNlcXVlbmNpbmcgd2l0aCBEYXRhVGFibGUgaW5pdGlhbGl6YXRpb25cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93LkV4dGVuc2lvblN0YXR1c01vbml0b3IgPSBFeHRlbnNpb25TdGF0dXNNb25pdG9yOyJdfQ==