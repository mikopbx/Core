"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/*
 * Call queues table management module
 *
 * Implements DataTable with Semantic UI following guidelines,
 * comprehensive XSS protection using SecurityUtils, and follows
 * MikoPBX standards for user interface (no success messages).
 */

/* global globalRootUrl, CallQueuesAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, SecurityUtils */
var queueTable = {
  $queuesTable: $('#call-queues-table'),
  dataTable: {},

  /**
   * Initialize the call queues index module
   */
  initialize: function initialize() {
    // Show placeholder until data loads
    queueTable.toggleEmptyPlaceholder(true);
    queueTable.initializeDataTable();
  },

  /**
   * Initialize DataTable with proper Semantic UI integration
   *
   * Following DataTable Semantic UI Guidelines to prevent sizing issues
   * and ensure proper responsive behavior.
   */
  initializeDataTable: function initializeDataTable() {
    queueTable.dataTable = queueTable.$queuesTable.DataTable({
      ajax: {
        url: CallQueuesAPI.endpoints.getList,
        dataSrc: function dataSrc(json) {
          // Manage empty state
          queueTable.toggleEmptyPlaceholder(!json.result || !json.data || json.data.length === 0);
          return json.result ? json.data : [];
        }
      },
      columns: [{
        data: 'represent',
        className: 'collapsing',
        // Without 'ui' prefix as per guidelines
        render: function render(data, type, row) {
          if (type === 'display') {
            // For display, show the represent with hidden searchable content
            var searchableContent = [row.name || '', row.extension || '', row.uniqid || ''].join(' ').toLowerCase();
            return "".concat(data || '—', "<span style=\"display:none;\">").concat(searchableContent, "</span>");
          } // For search and other operations, return plain text


          return [data, row.name, row.extension, row.uniqid].filter(Boolean).join(' ');
        }
      }, {
        data: 'members',
        className: 'hide-on-tablet collapsing',
        render: function render(data, type, row) {
          if (!data || data.length === 0) {
            return '<small>—</small>';
          }

          if (type === 'display') {
            // Get strategy description
            var strategyDesc = queueTable.getStrategyDescription(row.strategy); // SECURITY: Sanitize member representations allowing safe icons

            var membersList = data.map(function (member) {
              return SecurityUtils.sanitizeExtensionsApiContent(member.represent || member.extension);
            }).join('<br>'); // Create searchable content with member extensions and names

            var searchableContent = data.map(function (member) {
              return [member.extension, member.represent || ''].join(' ');
            }).join(' ').toLowerCase();
            return "<div style=\"color: #999; font-size: 0.8em; margin-bottom: 3px;\">".concat(strategyDesc, "</div>\n                                    <small>").concat(membersList, "</small>\n                                    <span style=\"display:none;\">").concat(searchableContent, "</span>");
          } // For search, return plain text with all member info


          return data.map(function (member) {
            return [member.extension, member.represent || ''].filter(Boolean).join(' ');
          }).join(' ');
        }
      }, {
        data: 'description',
        className: 'hide-on-mobile',
        orderable: false,
        render: function render(data, type, row) {
          if (!data || data.trim() === '') return '—'; // SECURITY: Preserve line breaks but escape HTML

          var safeDesc = SecurityUtils.escapeHtml(data);
          var descriptionLines = safeDesc.split('\n').filter(function (line) {
            return line.trim() !== '';
          }); // Calculate available lines based on queue members count

          var membersCount = row.members && row.members.length || 0;
          var maxLines = Math.max(2, Math.min(6, membersCount || 3)); // Min 2 lines, max 6, default 3

          if (descriptionLines.length <= maxLines) {
            // Description fits in available lines - show with preserved formatting
            var formattedDesc = descriptionLines.join('<br>');
            return "<div class=\"description-text\" style=\"line-height: 1.3;\">".concat(formattedDesc, "</div>");
          } else {
            // Description is too long - show truncated with popup
            var visibleLines = descriptionLines.slice(0, maxLines);
            var lastLine = visibleLines[maxLines - 1];
            visibleLines[maxLines - 1] = lastLine + '...';
            var truncatedDesc = visibleLines.join('<br>');
            var fullDesc = descriptionLines.join('\n'); // For popup data-content

            return "<div class=\"description-text truncated popuped\" \n                                         data-content=\"".concat(fullDesc, "\" \n                                         data-position=\"top right\" \n                                         data-variation=\"wide\"\n                                         style=\"cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;\">\n                                ").concat(truncatedDesc, "\n                            </div>");
          }
        }
      }, {
        data: null,
        orderable: false,
        searchable: false,
        className: 'right aligned collapsing',
        // Action buttons column
        render: function render(data, type, row) {
          return "<div class=\"ui tiny basic icon buttons action-buttons\">\n                            <a href=\"".concat(globalRootUrl, "call-queues/modify/").concat(row.uniqid, "\"\n                               class=\"ui button edit popuped\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                                <i class=\"icon edit blue\"></i>\n                            </a>\n                            <a href=\"#\"\n                               data-value=\"").concat(row.uniqid, "\"\n                               class=\"ui button delete two-steps-delete popuped\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                                <i class=\"icon trash red\"></i>\n                            </a>\n                        </div>");
        }
      }],
      order: [[0, 'asc']],
      lengthChange: false,
      paging: false,
      info: true,
      searching: true,
      language: SemanticLocalization.dataTableLocalisation,
      drawCallback: function drawCallback() {
        // Initialize Semantic UI elements after table draw
        queueTable.$queuesTable.find('.popuped').popup({
          position: 'top right',
          variation: 'wide',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          }
        }); // Move Add New button to the correct DataTables grid position (like in IVR Menu)

        var $addButton = $('#add-new-button');
        var $wrapper = $('#call-queues-table_wrapper');
        var $leftColumn = $wrapper.find('.eight.wide.column').first();

        if ($addButton.length && $leftColumn.length) {
          // Move button to the left column of DataTables grid
          $leftColumn.append($addButton);
          $addButton.show();
        } // Initialize double-click editing


        queueTable.initializeDoubleClickEdit();
      }
    }); // Handle deletion using existing DeleteSomething.js integration

    queueTable.$queuesTable.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      var $button = $(this);
      var queueId = $button.attr('data-value'); // Add loading state

      $button.addClass('loading disabled');
      CallQueuesAPI.deleteRecord(queueId, queueTable.cbAfterDeleteRecord);
    });
  },

  /**
   * Handle record deletion response (following MikoPBX standards - no success messages)
   *
   * @param {object|boolean} response API response
   */
  cbAfterDeleteRecord: function cbAfterDeleteRecord(response) {
    if (response.result === true) {
      // Just reload table data - NO success message (following MikoPBX standards)
      queueTable.dataTable.ajax.reload(); // Update related components

      if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
        Extensions.cbOnDataChanged();
      } // NO UserMessage.showSuccess() call - following MikoPBX standards

    } else {
      var _response$messages;

      // Only show error messages
      var errorMessage = ((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || [globalTranslate.cq_ImpossibleToDeleteQueue];
      UserMessage.showMultiString(errorMessage, globalTranslate.cq_DeletionError);
    } // Remove loading state


    $('a.delete').removeClass('loading disabled');
  },

  /**
   * Toggle empty table placeholder visibility
   *
   * @param {boolean} isEmpty Whether the table is empty
   */
  toggleEmptyPlaceholder: function toggleEmptyPlaceholder(isEmpty) {
    if (isEmpty) {
      $('#queue-table-container').hide();
      $('#add-new-button').hide();
      $('#empty-table-placeholder').show();
    } else {
      $('#empty-table-placeholder').hide();
      $('#add-new-button').show();
      $('#queue-table-container').show();
    }
  },

  /**
   * Get human-readable description for queue strategy
   *
   * @param {string} strategy Technical strategy name
   * @returns {string} User-friendly description from translations
   */
  getStrategyDescription: function getStrategyDescription(strategy) {
    var translationKey = "cq_strategy_".concat(strategy, "_short"); // Use globalTranslate with fallback to strategy name

    return globalTranslate[translationKey] || strategy;
  },

  /**
   * Initialize double-click editing
   *
   * IMPORTANT: Exclude action buttons cells to avoid conflicts with DeleteSomething.js
   */
  initializeDoubleClickEdit: function initializeDoubleClickEdit() {
    queueTable.$queuesTable.on('dblclick', 'tbody td:not(.right.aligned)', function () {
      var data = queueTable.dataTable.row(this).data();

      if (data && data.uniqid) {
        window.location.href = "".concat(globalRootUrl, "call-queues/modify/").concat(data.uniqid);
      }
    });
  }
};
/**
 * Initialize on document ready
 */

$(document).ready(function () {
  queueTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZXMtaW5kZXguanMiXSwibmFtZXMiOlsicXVldWVUYWJsZSIsIiRxdWV1ZXNUYWJsZSIsIiQiLCJkYXRhVGFibGUiLCJpbml0aWFsaXplIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJhamF4IiwidXJsIiwiQ2FsbFF1ZXVlc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJkYXRhU3JjIiwianNvbiIsInJlc3VsdCIsImRhdGEiLCJsZW5ndGgiLCJjb2x1bW5zIiwiY2xhc3NOYW1lIiwicmVuZGVyIiwidHlwZSIsInJvdyIsInNlYXJjaGFibGVDb250ZW50IiwibmFtZSIsImV4dGVuc2lvbiIsInVuaXFpZCIsImpvaW4iLCJ0b0xvd2VyQ2FzZSIsImZpbHRlciIsIkJvb2xlYW4iLCJzdHJhdGVneURlc2MiLCJnZXRTdHJhdGVneURlc2NyaXB0aW9uIiwic3RyYXRlZ3kiLCJtZW1iZXJzTGlzdCIsIm1hcCIsIm1lbWJlciIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50IiwicmVwcmVzZW50Iiwib3JkZXJhYmxlIiwidHJpbSIsInNhZmVEZXNjIiwiZXNjYXBlSHRtbCIsImRlc2NyaXB0aW9uTGluZXMiLCJzcGxpdCIsImxpbmUiLCJtZW1iZXJzQ291bnQiLCJtZW1iZXJzIiwibWF4TGluZXMiLCJNYXRoIiwibWF4IiwibWluIiwiZm9ybWF0dGVkRGVzYyIsInZpc2libGVMaW5lcyIsInNsaWNlIiwibGFzdExpbmUiLCJ0cnVuY2F0ZWREZXNjIiwiZnVsbERlc2MiLCJzZWFyY2hhYmxlIiwiZ2xvYmFsUm9vdFVybCIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcERlbGV0ZSIsIm9yZGVyIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiaW5mbyIsInNlYXJjaGluZyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJmaW5kIiwicG9wdXAiLCJwb3NpdGlvbiIsInZhcmlhdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCIkYWRkQnV0dG9uIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwiaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsInF1ZXVlSWQiLCJhdHRyIiwiYWRkQ2xhc3MiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwicmVzcG9uc2UiLCJyZWxvYWQiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImNxX0ltcG9zc2libGVUb0RlbGV0ZVF1ZXVlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJjcV9EZWxldGlvbkVycm9yIiwicmVtb3ZlQ2xhc3MiLCJpc0VtcHR5IiwidHJhbnNsYXRpb25LZXkiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxVQUFVLEdBQUc7QUFDZkMsRUFBQUEsWUFBWSxFQUFFQyxDQUFDLENBQUMsb0JBQUQsQ0FEQTtBQUVmQyxFQUFBQSxTQUFTLEVBQUUsRUFGSTs7QUFJZjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFQZSx3QkFPRjtBQUNUO0FBQ0FKLElBQUFBLFVBQVUsQ0FBQ0ssc0JBQVgsQ0FBa0MsSUFBbEM7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LEdBQXJCLENBQXlCLElBQXpCLEVBQStCTixJQUEvQixFQUFiOztBQUNBLFVBQUlBLElBQUksSUFBSUEsSUFBSSxDQUFDVSxNQUFqQixFQUF5QjtBQUNyQm9GLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsSUFBaEIsYUFBMEJwRCxhQUExQixnQ0FBNkQ1QyxJQUFJLENBQUNVLE1BQWxFO0FBQ0g7QUFDSixLQUxEO0FBTUg7QUFuUWMsQ0FBbkI7QUFzUUE7QUFDQTtBQUNBOztBQUNBeEIsQ0FBQyxDQUFDK0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxILEVBQUFBLFVBQVUsQ0FBQ0ksVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKlxuICogQ2FsbCBxdWV1ZXMgdGFibGUgbWFuYWdlbWVudCBtb2R1bGVcbiAqXG4gKiBJbXBsZW1lbnRzIERhdGFUYWJsZSB3aXRoIFNlbWFudGljIFVJIGZvbGxvd2luZyBndWlkZWxpbmVzLFxuICogY29tcHJlaGVuc2l2ZSBYU1MgcHJvdGVjdGlvbiB1c2luZyBTZWN1cml0eVV0aWxzLCBhbmQgZm9sbG93c1xuICogTWlrb1BCWCBzdGFuZGFyZHMgZm9yIHVzZXIgaW50ZXJmYWNlIChubyBzdWNjZXNzIG1lc3NhZ2VzKS5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgQ2FsbFF1ZXVlc0FQSSwgRXh0ZW5zaW9ucywgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFNlY3VyaXR5VXRpbHMgKi9cblxuY29uc3QgcXVldWVUYWJsZSA9IHtcbiAgICAkcXVldWVzVGFibGU6ICQoJyNjYWxsLXF1ZXVlcy10YWJsZScpLFxuICAgIGRhdGFUYWJsZToge30sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBjYWxsIHF1ZXVlcyBpbmRleCBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBTaG93IHBsYWNlaG9sZGVyIHVudGlsIGRhdGEgbG9hZHNcbiAgICAgICAgcXVldWVUYWJsZS50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuXG4gICAgICAgIHF1ZXVlVGFibGUuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIHByb3BlciBTZW1hbnRpYyBVSSBpbnRlZ3JhdGlvblxuICAgICAqXG4gICAgICogRm9sbG93aW5nIERhdGFUYWJsZSBTZW1hbnRpYyBVSSBHdWlkZWxpbmVzIHRvIHByZXZlbnQgc2l6aW5nIGlzc3Vlc1xuICAgICAqIGFuZCBlbnN1cmUgcHJvcGVyIHJlc3BvbnNpdmUgYmVoYXZpb3IuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgcXVldWVUYWJsZS5kYXRhVGFibGUgPSBxdWV1ZVRhYmxlLiRxdWV1ZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogQ2FsbFF1ZXVlc0FQSS5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiBmdW5jdGlvbihqc29uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hbmFnZSBlbXB0eSBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICBxdWV1ZVRhYmxlLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAhanNvbi5yZXN1bHQgfHwgIWpzb24uZGF0YSB8fCBqc29uLmRhdGEubGVuZ3RoID09PSAwXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBqc29uLnJlc3VsdCA/IGpzb24uZGF0YSA6IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiAncmVwcmVzZW50JyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnY29sbGFwc2luZycsIC8vIFdpdGhvdXQgJ3VpJyBwcmVmaXggYXMgcGVyIGd1aWRlbGluZXNcbiAgICAgICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZGlzcGxheSwgc2hvdyB0aGUgcmVwcmVzZW50IHdpdGggaGlkZGVuIHNlYXJjaGFibGUgY29udGVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaGFibGVDb250ZW50ID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3cubmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LmV4dGVuc2lvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm93LnVuaXFpZCB8fCAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0uam9pbignICcpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke2RhdGEgfHwgJ+KAlCd9PHNwYW4gc3R5bGU9XCJkaXNwbGF5Om5vbmU7XCI+JHtzZWFyY2hhYmxlQ29udGVudH08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzZWFyY2ggYW5kIG90aGVyIG9wZXJhdGlvbnMsIHJldHVybiBwbGFpbiB0ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2RhdGEsIHJvdy5uYW1lLCByb3cuZXh0ZW5zaW9uLCByb3cudW5pcWlkXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6ICdtZW1iZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi10YWJsZXQgY29sbGFwc2luZycsXG4gICAgICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzxzbWFsbD7igJQ8L3NtYWxsPic7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgc3RyYXRlZ3kgZGVzY3JpcHRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJhdGVneURlc2MgPSBxdWV1ZVRhYmxlLmdldFN0cmF0ZWd5RGVzY3JpcHRpb24ocm93LnN0cmF0ZWd5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTRUNVUklUWTogU2FuaXRpemUgbWVtYmVyIHJlcHJlc2VudGF0aW9ucyBhbGxvd2luZyBzYWZlIGljb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWVtYmVyc0xpc3QgPSBkYXRhLm1hcChtZW1iZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KG1lbWJlci5yZXByZXNlbnQgfHwgbWVtYmVyLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbignPGJyPicpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHNlYXJjaGFibGUgY29udGVudCB3aXRoIG1lbWJlciBleHRlbnNpb25zIGFuZCBuYW1lc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaGFibGVDb250ZW50ID0gZGF0YS5tYXAobWVtYmVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFttZW1iZXIuZXh0ZW5zaW9uLCBtZW1iZXIucmVwcmVzZW50IHx8ICcnXS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuam9pbignICcpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgc3R5bGU9XCJjb2xvcjogIzk5OTsgZm9udC1zaXplOiAwLjhlbTsgbWFyZ2luLWJvdHRvbTogM3B4O1wiPiR7c3RyYXRlZ3lEZXNjfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNtYWxsPiR7bWVtYmVyc0xpc3R9PC9zbWFsbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIHN0eWxlPVwiZGlzcGxheTpub25lO1wiPiR7c2VhcmNoYWJsZUNvbnRlbnR9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzZWFyY2gsIHJldHVybiBwbGFpbiB0ZXh0IHdpdGggYWxsIG1lbWJlciBpbmZvXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5tYXAobWVtYmVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gW21lbWJlci5leHRlbnNpb24sIG1lbWJlci5yZXByZXNlbnQgfHwgJyddLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5qb2luKCcgJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiAnaGlkZS1vbi1tb2JpbGUnLFxuICAgICAgICAgICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkYXRhIHx8IGRhdGEudHJpbSgpID09PSAnJykgcmV0dXJuICfigJQnO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTRUNVUklUWTogUHJlc2VydmUgbGluZSBicmVha3MgYnV0IGVzY2FwZSBIVE1MXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGVzYyA9IFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uTGluZXMgPSBzYWZlRGVzYy5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkgIT09ICcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGF2YWlsYWJsZSBsaW5lcyBiYXNlZCBvbiBxdWV1ZSBtZW1iZXJzIGNvdW50XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZW1iZXJzQ291bnQgPSAocm93Lm1lbWJlcnMgJiYgcm93Lm1lbWJlcnMubGVuZ3RoKSB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWF4TGluZXMgPSBNYXRoLm1heCgyLCBNYXRoLm1pbig2LCBtZW1iZXJzQ291bnQgfHwgMykpOyAvLyBNaW4gMiBsaW5lcywgbWF4IDYsIGRlZmF1bHQgM1xuICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25MaW5lcy5sZW5ndGggPD0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBmaXRzIGluIGF2YWlsYWJsZSBsaW5lcyAtIHNob3cgd2l0aCBwcmVzZXJ2ZWQgZm9ybWF0dGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0XCIgc3R5bGU9XCJsaW5lLWhlaWdodDogMS4zO1wiPiR7Zm9ybWF0dGVkRGVzY308L2Rpdj5gO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBpcyB0b28gbG9uZyAtIHNob3cgdHJ1bmNhdGVkIHdpdGggcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2aXNpYmxlTGluZXMgPSBkZXNjcmlwdGlvbkxpbmVzLnNsaWNlKDAsIG1heExpbmVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0TGluZSA9IHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdID0gbGFzdExpbmUgKyAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWREZXNjID0gdmlzaWJsZUxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignXFxuJyk7IC8vIEZvciBwb3B1cCBkYXRhLWNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0IHRydW5jYXRlZCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7ZnVsbERlc2N9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3R5bGU9XCJjdXJzb3I6IGhlbHA7IGJvcmRlci1ib3R0b206IDFweCBkb3R0ZWQgIzk5OTsgbGluZS1oZWlnaHQ6IDEuMztcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHt0cnVuY2F0ZWREZXNjfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogJ3JpZ2h0IGFsaWduZWQgY29sbGFwc2luZycsIC8vIEFjdGlvbiBidXR0b25zIGNvbHVtblxuICAgICAgICAgICAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEsIHR5cGUsIHJvdykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS8ke3Jvdy51bmlxaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cm93LnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBvcmRlcjogW1swLCAnYXNjJ11dLFxuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBpbmZvOiB0cnVlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBlbGVtZW50cyBhZnRlciB0YWJsZSBkcmF3XG4gICAgICAgICAgICAgICAgcXVldWVUYWJsZS4kcXVldWVzVGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnd2lkZScsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNb3ZlIEFkZCBOZXcgYnV0dG9uIHRvIHRoZSBjb3JyZWN0IERhdGFUYWJsZXMgZ3JpZCBwb3NpdGlvbiAobGlrZSBpbiBJVlIgTWVudSlcbiAgICAgICAgICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKCcjY2FsbC1xdWV1ZXMtdGFibGVfd3JhcHBlcicpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoJGFkZEJ1dHRvbi5sZW5ndGggJiYgJGxlZnRDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgYnV0dG9uIHRvIHRoZSBsZWZ0IGNvbHVtbiBvZiBEYXRhVGFibGVzIGdyaWRcbiAgICAgICAgICAgICAgICAgICAgJGxlZnRDb2x1bW4uYXBwZW5kKCRhZGRCdXR0b24pO1xuICAgICAgICAgICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRvdWJsZS1jbGljayBlZGl0aW5nXG4gICAgICAgICAgICAgICAgcXVldWVUYWJsZS5pbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBkZWxldGlvbiB1c2luZyBleGlzdGluZyBEZWxldGVTb21ldGhpbmcuanMgaW50ZWdyYXRpb25cbiAgICAgICAgcXVldWVUYWJsZS4kcXVldWVzVGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXVlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgQ2FsbFF1ZXVlc0FQSS5kZWxldGVSZWNvcmQocXVldWVJZCwgcXVldWVUYWJsZS5jYkFmdGVyRGVsZXRlUmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZWNvcmQgZGVsZXRpb24gcmVzcG9uc2UgKGZvbGxvd2luZyBNaWtvUEJYIHN0YW5kYXJkcyAtIG5vIHN1Y2Nlc3MgbWVzc2FnZXMpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdHxib29sZWFufSByZXNwb25zZSBBUEkgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIEp1c3QgcmVsb2FkIHRhYmxlIGRhdGEgLSBOTyBzdWNjZXNzIG1lc3NhZ2UgKGZvbGxvd2luZyBNaWtvUEJYIHN0YW5kYXJkcylcbiAgICAgICAgICAgIHF1ZXVlVGFibGUuZGF0YVRhYmxlLmFqYXgucmVsb2FkKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZWxhdGVkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBOTyBVc2VyTWVzc2FnZS5zaG93U3VjY2VzcygpIGNhbGwgLSBmb2xsb3dpbmcgTWlrb1BCWCBzdGFuZGFyZHNcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE9ubHkgc2hvdyBlcnJvciBtZXNzYWdlc1xuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8IFtnbG9iYWxUcmFuc2xhdGUuY3FfSW1wb3NzaWJsZVRvRGVsZXRlUXVldWVdO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmNxX0RlbGV0aW9uRXJyb3IpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZW1wdHkgdGFibGUgcGxhY2Vob2xkZXIgdmlzaWJpbGl0eVxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0VtcHR5IFdoZXRoZXIgdGhlIHRhYmxlIGlzIGVtcHR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIGlmIChpc0VtcHR5KSB7XG4gICAgICAgICAgICAkKCcjcXVldWUtdGFibGUtY29udGFpbmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI3F1ZXVlLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgaHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gZm9yIHF1ZXVlIHN0cmF0ZWd5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyYXRlZ3kgVGVjaG5pY2FsIHN0cmF0ZWd5IG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBVc2VyLWZyaWVuZGx5IGRlc2NyaXB0aW9uIGZyb20gdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgZ2V0U3RyYXRlZ3lEZXNjcmlwdGlvbihzdHJhdGVneSkge1xuICAgICAgICBjb25zdCB0cmFuc2xhdGlvbktleSA9IGBjcV9zdHJhdGVneV8ke3N0cmF0ZWd5fV9zaG9ydGA7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgZ2xvYmFsVHJhbnNsYXRlIHdpdGggZmFsbGJhY2sgdG8gc3RyYXRlZ3kgbmFtZVxuICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlW3RyYW5zbGF0aW9uS2V5XSB8fCBzdHJhdGVneTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZWRpdGluZ1xuICAgICAqXG4gICAgICogSU1QT1JUQU5UOiBFeGNsdWRlIGFjdGlvbiBidXR0b25zIGNlbGxzIHRvIGF2b2lkIGNvbmZsaWN0cyB3aXRoIERlbGV0ZVNvbWV0aGluZy5qc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIHF1ZXVlVGFibGUuJHF1ZXVlc1RhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcXVldWVUYWJsZS5kYXRhVGFibGUucm93KHRoaXMpLmRhdGEoKTtcbiAgICAgICAgICAgIGlmIChkYXRhICYmIGRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL21vZGlmeS8ke2RhdGEudW5pcWlkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgcXVldWVUYWJsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19