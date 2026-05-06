"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * TooltipBuilder - Utility class for building and managing tooltips
 * 
 * Provides methods for:
 * - Building HTML content for tooltips
 * - Initializing Semantic UI popup tooltips
 * - Handling various tooltip data structures
 * 
 * @module TooltipBuilder
 */
var TooltipBuilder = {
  /**
   * Build HTML content for tooltip popup
   * 
   * @param {Object} tooltipData - Configuration object for tooltip content
   * @param {string} tooltipData.header - Tooltip header text
   * @param {string} tooltipData.description - Tooltip description text
   * @param {Array} tooltipData.list - Main list of items (strings or objects with term/definition)
   * @param {Array} tooltipData.list2-list10 - Additional lists
   * @param {Object} tooltipData.warning - Warning message with header and text
   * @param {Array} tooltipData.examples - Code examples
   * @param {string} tooltipData.examplesHeader - Header for examples section
   * @param {string} tooltipData.note - Additional note text
   * @returns {string} HTML string for tooltip content
   */
  buildContent: function buildContent(tooltipData) {
    if (!tooltipData) return '';
    var html = ''; // Add header if exists

    if (tooltipData.header) {
      html += "<div class=\"header\">".concat(tooltipData.header, "</div>");
    } // Add description if exists


    if (tooltipData.description) {
      html += "<p>".concat(tooltipData.description, "</p>");
    } // Helper function to build list HTML


    var buildList = function buildList(list) {
      var listHtml = '<ul style="margin: 0.5em 0; padding-left: 1.5em;">';
      list.forEach(function (item) {
        if (typeof item === 'string') {
          // Simple list item
          listHtml += "<li>".concat(item, "</li>");
        } else if (item.definition === null) {
          // Section header
          listHtml += "</ul><p><strong>".concat(item.term, "</strong></p><ul style=\"margin: 0.5em 0; padding-left: 1.5em;\">");
        } else {
          // Term with definition
          listHtml += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
        }
      });
      listHtml += '</ul>';
      return listHtml;
    }; // Add main list if exists


    if (tooltipData.list && tooltipData.list.length > 0) {
      html += buildList(tooltipData.list);
    } // Add additional lists (list2 through list10)


    for (var i = 2; i <= 10; i++) {
      var listKey = "list".concat(i);

      if (tooltipData[listKey] && tooltipData[listKey].length > 0) {
        html += buildList(tooltipData[listKey]);
      }
    } // Add warning if exists


    if (tooltipData.warning) {
      html += '<div class="ui warning message" style="margin: 0.5em 0;">';

      if (tooltipData.warning.header) {
        html += "<div class=\"header\">".concat(tooltipData.warning.header, "</div>");
      }

      if (tooltipData.warning.text) {
        html += "<p>".concat(tooltipData.warning.text, "</p>");
      }

      html += '</div>';
    } // Add examples if exist


    if (tooltipData.examples && tooltipData.examples.length > 0) {
      if (tooltipData.examplesHeader) {
        html += "<p><strong>".concat(tooltipData.examplesHeader, ":</strong></p>");
      }

      html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
      html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
      tooltipData.examples.forEach(function (line, index) {
        if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
          // Section header
          if (index > 0) html += '\n';
          html += "<span style=\"color: #0084b4; font-weight: bold;\">".concat(line, "</span>");
        } else if (line.includes('=')) {
          // Parameter line
          var _line$split = line.split('=', 2),
              _line$split2 = _slicedToArray(_line$split, 2),
              param = _line$split2[0],
              value = _line$split2[1];

          html += "\n<span style=\"color: #7a3e9d;\">".concat(param, "</span>=<span style=\"color: #cf4a4c;\">").concat(value, "</span>");
        } else {
          // Regular line
          html += line ? "\n".concat(line) : '';
        }
      });
      html += '</pre>';
      html += '</div>';
    } // Add note if exists


    if (tooltipData.note) {
      html += "<p><em>".concat(tooltipData.note, "</em></p>");
    }

    return html;
  },

  /**
   * Initialize tooltips for form fields
   * 
   * @param {Object} tooltipConfigs - Configuration object with field names as keys and tooltip data as values
   * @param {Object} options - Additional options for popup initialization
   * @param {string} options.selector - jQuery selector for tooltip icons (default: '.field-info-icon')
   * @param {string} options.position - Popup position (default: 'top right')
   * @param {boolean} options.hoverable - Whether popup stays open on hover (default: true)
   * @param {number} options.showDelay - Delay before showing popup (default: 300)
   * @param {number} options.hideDelay - Delay before hiding popup (default: 100)
   * @param {string} options.variation - Popup variation (default: 'flowing')
   */
  initialize: function initialize(tooltipConfigs) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var defaults = {
      selector: '.field-info-icon',
      position: 'top right',
      hoverable: true,
      showDelay: 300,
      hideDelay: 100,
      variation: 'flowing'
    };
    var settings = Object.assign({}, defaults, options); // Initialize popup for each icon

    $(settings.selector).each(function (index, element) {
      var $icon = $(element);
      var fieldName = $icon.data('field');
      var tooltipData = tooltipConfigs[fieldName];

      if (tooltipData) {
        var content = typeof tooltipData === 'string' ? tooltipData : _this.buildContent(tooltipData);
        $icon.popup({
          html: content,
          position: settings.position,
          hoverable: settings.hoverable,
          delay: {
            show: settings.showDelay,
            hide: settings.hideDelay
          },
          variation: settings.variation,
          className: {
            popup: 'ui popup field-info-popup'
          },
          on: 'manual' // Manual control for better handling inside labels

        }); // Add click handler for manual popup control

        $icon.off('click.popup-trigger').on('click.popup-trigger', function (e) {
          // Stop propagation to prevent label from triggering checkbox
          e.stopPropagation();
          e.preventDefault(); // Show the popup

          $(this).popup('toggle');
        });
      }
    }); // Note: Click prevention is handled individually for each icon in the loop above
  },

  /**
   * Destroy all tooltips with the given selector
   * 
   * @param {string} selector - jQuery selector for tooltip icons
   */
  destroy: function destroy() {
    var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.field-info-icon';
    $(selector).popup('destroy');
  },

  /**
   * Hide all tooltips with the given selector
   * 
   * @param {string} selector - jQuery selector for tooltip icons
   */
  hide: function hide() {
    var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.field-info-icon';
    $(selector).popup('hide');
  },

  /**
   * Update tooltip content for a specific field
   *
   * @param {string} fieldName - Field name to update
   * @param {Object|string} tooltipData - New tooltip data or HTML content
   * @param {string} selector - jQuery selector for finding the field icon
   */
  update: function update(fieldName, tooltipData) {
    var selector = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '.field-info-icon';
    var $icon = $("".concat(selector, "[data-field=\"").concat(fieldName, "\"]"));

    if ($icon.length) {
      var content = typeof tooltipData === 'string' ? tooltipData : this.buildContent(tooltipData); // Destroy existing popup

      $icon.popup('destroy'); // Create new popup with updated content

      $icon.popup({
        html: content,
        position: 'top right',
        hoverable: true,
        delay: {
          show: 300,
          hide: 100
        },
        variation: 'flowing',
        className: {
          popup: 'ui popup field-info-popup'
        },
        on: 'manual'
      }); // Add click handler for manual popup control

      $icon.off('click.popup-trigger').on('click.popup-trigger', function (e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).popup('toggle');
      });
    }
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TooltipBuilder;
} // Initialize global click prevention for all tooltip icons
// This will work for dynamically added elements too


$(document).ready(function () {
  // Use event delegation for all current and future tooltip icon elements
  // Supports multiple icon classes: field-info-icon, special-checkbox-info, service-info-icon
  var tooltipIconSelector = '.field-info-icon, .special-checkbox-info, .service-info-icon';
  $(document).off('click.global-tooltip').on('click.global-tooltip', tooltipIconSelector, function (e) {
    var $label = $(this).closest('label');

    if ($label.length > 0) {
      // Stop propagation to prevent label from toggling checkbox
      e.stopPropagation();
      e.preventDefault();
    }
  });
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1Rvb2x0aXBCdWlsZGVyLmpzIl0sIm5hbWVzIjpbIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwidG9vbHRpcERhdGEiLCJodG1sIiwiaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJidWlsZExpc3QiLCJsaXN0IiwibGlzdEh0bWwiLCJmb3JFYWNoIiwiaXRlbSIsImRlZmluaXRpb24iLCJ0ZXJtIiwibGVuZ3RoIiwiaSIsImxpc3RLZXkiLCJ3YXJuaW5nIiwidGV4dCIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJsaW5lIiwiaW5kZXgiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJzcGxpdCIsInBhcmFtIiwidmFsdWUiLCJub3RlIiwiaW5pdGlhbGl6ZSIsInRvb2x0aXBDb25maWdzIiwib3B0aW9ucyIsImRlZmF1bHRzIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInNob3dEZWxheSIsImhpZGVEZWxheSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwiJCIsImVhY2giLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwiY29udGVudCIsInBvcHVwIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNsYXNzTmFtZSIsIm9uIiwib2ZmIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiZGVzdHJveSIsInVwZGF0ZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJkb2N1bWVudCIsInJlYWR5IiwidG9vbHRpcEljb25TZWxlY3RvciIsIiRsYWJlbCIsImNsb3Nlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEs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SUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQi9ELGNBQWpCO0FBQ0gsQyxDQUVEO0FBQ0E7OztBQUNBMkMsQ0FBQyxDQUFDcUIsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjtBQUNBO0FBQ0EsTUFBTUMsbUJBQW1CLEdBQUcsOERBQTVCO0FBRUF2QixFQUFBQSxDQUFDLENBQUNxQixRQUFELENBQUQsQ0FBWVIsR0FBWixDQUFnQixzQkFBaEIsRUFBd0NELEVBQXhDLENBQTJDLHNCQUEzQyxFQUFtRVcsbUJBQW5FLEVBQXdGLFVBQVNULENBQVQsRUFBWTtBQUNoRyxRQUFNVSxNQUFNLEdBQUd4QixDQUFDLENBQUMsSUFBRCxDQUFELENBQVF5QixPQUFSLENBQWdCLE9BQWhCLENBQWY7O0FBQ0EsUUFBSUQsTUFBTSxDQUFDdEQsTUFBUCxHQUFnQixDQUFwQixFQUF1QjtBQUNuQjtBQUNBNEMsTUFBQUEsQ0FBQyxDQUFDQyxlQUFGO0FBQ0FELE1BQUFBLENBQUMsQ0FBQ0UsY0FBRjtBQUNIO0FBQ0osR0FQRDtBQVFILENBYkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqL1xuXG4vKipcbiAqIFRvb2x0aXBCdWlsZGVyIC0gVXRpbGl0eSBjbGFzcyBmb3IgYnVpbGRpbmcgYW5kIG1hbmFnaW5nIHRvb2x0aXBzXG4gKiBcbiAqIFByb3ZpZGVzIG1ldGhvZHMgZm9yOlxuICogLSBCdWlsZGluZyBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzXG4gKiAtIEluaXRpYWxpemluZyBTZW1hbnRpYyBVSSBwb3B1cCB0b29sdGlwc1xuICogLSBIYW5kbGluZyB2YXJpb3VzIHRvb2x0aXAgZGF0YSBzdHJ1Y3R1cmVzXG4gKiBcbiAqIEBtb2R1bGUgVG9vbHRpcEJ1aWxkZXJcbiAqL1xuY29uc3QgVG9vbHRpcEJ1aWxkZXIgPSB7XG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b29sdGlwRGF0YS5oZWFkZXIgLSBUb29sdGlwIGhlYWRlciB0ZXh0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uIC0gVG9vbHRpcCBkZXNjcmlwdGlvbiB0ZXh0XG4gICAgICogQHBhcmFtIHtBcnJheX0gdG9vbHRpcERhdGEubGlzdCAtIE1haW4gbGlzdCBvZiBpdGVtcyAoc3RyaW5ncyBvciBvYmplY3RzIHdpdGggdGVybS9kZWZpbml0aW9uKVxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHRvb2x0aXBEYXRhLmxpc3QyLWxpc3QxMCAtIEFkZGl0aW9uYWwgbGlzdHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEud2FybmluZyAtIFdhcm5pbmcgbWVzc2FnZSB3aXRoIGhlYWRlciBhbmQgdGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHRvb2x0aXBEYXRhLmV4YW1wbGVzIC0gQ29kZSBleGFtcGxlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlciAtIEhlYWRlciBmb3IgZXhhbXBsZXMgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b29sdGlwRGF0YS5ub3RlIC0gQWRkaXRpb25hbCBub3RlIHRleHRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICghdG9vbHRpcERhdGEpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhlbHBlciBmdW5jdGlvbiB0byBidWlsZCBsaXN0IEhUTUxcbiAgICAgICAgY29uc3QgYnVpbGRMaXN0ID0gKGxpc3QpID0+IHtcbiAgICAgICAgICAgIGxldCBsaXN0SHRtbCA9ICc8dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGxlIGxpc3QgaXRlbVxuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsaXN0SHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgcmV0dXJuIGxpc3RIdG1sO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG1haW4gbGlzdCBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmxpc3QgJiYgdG9vbHRpcERhdGEubGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IGJ1aWxkTGlzdCh0b29sdGlwRGF0YS5saXN0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyIHRocm91Z2ggbGlzdDEwKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0S2V5ID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YVtsaXN0S2V5XSAmJiB0b29sdGlwRGF0YVtsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGFbbGlzdEtleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDtcIj4nO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXMgJiYgdG9vbHRpcERhdGEuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtOyBsaW5lLWhlaWdodDogMS40ZW07XCI+JztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdG9vbHRpcERhdGEuZXhhbXBsZXMuZm9yRWFjaCgobGluZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnWycpICYmIGxpbmUudHJpbSgpLmVuZHNXaXRoKCddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzAwODRiNDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobGluZS5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBhcmFtZXRlciBsaW5lXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFtwYXJhbSwgdmFsdWVdID0gbGluZS5zcGxpdCgnPScsIDIpO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGBcXG48c3BhbiBzdHlsZT1cImNvbG9yOiAjN2EzZTlkO1wiPiR7cGFyYW19PC9zcGFuPj08c3BhbiBzdHlsZT1cImNvbG9yOiAjY2Y0YTRjO1wiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVndWxhciBsaW5lXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSA/IGBcXG4ke2xpbmV9YCA6ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHt0b29sdGlwRGF0YS5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcENvbmZpZ3MgLSBDb25maWd1cmF0aW9uIG9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIEFkZGl0aW9uYWwgb3B0aW9ucyBmb3IgcG9wdXAgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5zZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgdG9vbHRpcCBpY29ucyAoZGVmYXVsdDogJy5maWVsZC1pbmZvLWljb24nKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnBvc2l0aW9uIC0gUG9wdXAgcG9zaXRpb24gKGRlZmF1bHQ6ICd0b3AgcmlnaHQnKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5ob3ZlcmFibGUgLSBXaGV0aGVyIHBvcHVwIHN0YXlzIG9wZW4gb24gaG92ZXIgKGRlZmF1bHQ6IHRydWUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuc2hvd0RlbGF5IC0gRGVsYXkgYmVmb3JlIHNob3dpbmcgcG9wdXAgKGRlZmF1bHQ6IDMwMClcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5oaWRlRGVsYXkgLSBEZWxheSBiZWZvcmUgaGlkaW5nIHBvcHVwIChkZWZhdWx0OiAxMDApXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMudmFyaWF0aW9uIC0gUG9wdXAgdmFyaWF0aW9uIChkZWZhdWx0OiAnZmxvd2luZycpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0IGRlZmF1bHRzID0ge1xuICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgIHNob3dEZWxheTogMzAwLFxuICAgICAgICAgICAgaGlkZURlbGF5OiAxMDAsXG4gICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGVhY2ggaWNvblxuICAgICAgICAkKHNldHRpbmdzLnNlbGVjdG9yKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHR5cGVvZiB0b29sdGlwRGF0YSA9PT0gJ3N0cmluZycgP1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwRGF0YSA6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcblxuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHNldHRpbmdzLnBvc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHNldHRpbmdzLmhvdmVyYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IHNldHRpbmdzLnNob3dEZWxheSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IHNldHRpbmdzLmhpZGVEZWxheVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246IHNldHRpbmdzLnZhcmlhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3B1cDogJ3VpIHBvcHVwIGZpZWxkLWluZm8tcG9wdXAnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyAgLy8gTWFudWFsIGNvbnRyb2wgZm9yIGJldHRlciBoYW5kbGluZyBpbnNpZGUgbGFiZWxzXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciBmb3IgbWFudWFsIHBvcHVwIGNvbnRyb2xcbiAgICAgICAgICAgICAgICAkaWNvbi5vZmYoJ2NsaWNrLnBvcHVwLXRyaWdnZXInKS5vbignY2xpY2sucG9wdXAtdHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcCBwcm9wYWdhdGlvbiB0byBwcmV2ZW50IGxhYmVsIGZyb20gdHJpZ2dlcmluZyBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5wb3B1cCgndG9nZ2xlJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vdGU6IENsaWNrIHByZXZlbnRpb24gaXMgaGFuZGxlZCBpbmRpdmlkdWFsbHkgZm9yIGVhY2ggaWNvbiBpbiB0aGUgbG9vcCBhYm92ZVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgdG9vbHRpcHMgd2l0aCB0aGUgZ2l2ZW4gc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBkZXN0cm95KHNlbGVjdG9yID0gJy5maWVsZC1pbmZvLWljb24nKSB7XG4gICAgICAgICQoc2VsZWN0b3IpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGFsbCB0b29sdGlwcyB3aXRoIHRoZSBnaXZlbiBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgdG9vbHRpcCBpY29uc1xuICAgICAqL1xuICAgIGhpZGUoc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2hpZGUnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0b29sdGlwIGNvbnRlbnQgZm9yIGEgc3BlY2lmaWMgZmllbGRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgZmluZGluZyB0aGUgZmllbGQgaWNvblxuICAgICAqL1xuICAgIHVwZGF0ZShmaWVsZE5hbWUsIHRvb2x0aXBEYXRhLCBzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICBjb25zdCAkaWNvbiA9ICQoYCR7c2VsZWN0b3J9W2RhdGEtZmllbGQ9XCIke2ZpZWxkTmFtZX1cIl1gKTtcblxuICAgICAgICBpZiAoJGljb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdHlwZW9mIHRvb2x0aXBEYXRhID09PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICAgICAgdG9vbHRpcERhdGEgOlxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcblxuICAgICAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBwb3B1cFxuICAgICAgICAgICAgJGljb24ucG9wdXAoJ2Rlc3Ryb3knKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBwb3B1cCB3aXRoIHVwZGF0ZWQgY29udGVudFxuICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZycsXG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgIHBvcHVwOiAndWkgcG9wdXAgZmllbGQtaW5mby1wb3B1cCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJ1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBjbGljayBoYW5kbGVyIGZvciBtYW51YWwgcG9wdXAgY29udHJvbFxuICAgICAgICAgICAgJGljb24ub2ZmKCdjbGljay5wb3B1cC10cmlnZ2VyJykub24oJ2NsaWNrLnBvcHVwLXRyaWdnZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5wb3B1cCgndG9nZ2xlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cblxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBUb29sdGlwQnVpbGRlcjtcbn1cblxuLy8gSW5pdGlhbGl6ZSBnbG9iYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgYWxsIHRvb2x0aXAgaWNvbnNcbi8vIFRoaXMgd2lsbCB3b3JrIGZvciBkeW5hbWljYWxseSBhZGRlZCBlbGVtZW50cyB0b29cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgYWxsIGN1cnJlbnQgYW5kIGZ1dHVyZSB0b29sdGlwIGljb24gZWxlbWVudHNcbiAgICAvLyBTdXBwb3J0cyBtdWx0aXBsZSBpY29uIGNsYXNzZXM6IGZpZWxkLWluZm8taWNvbiwgc3BlY2lhbC1jaGVja2JveC1pbmZvLCBzZXJ2aWNlLWluZm8taWNvblxuICAgIGNvbnN0IHRvb2x0aXBJY29uU2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbiwgLnNwZWNpYWwtY2hlY2tib3gtaW5mbywgLnNlcnZpY2UtaW5mby1pY29uJztcblxuICAgICQoZG9jdW1lbnQpLm9mZignY2xpY2suZ2xvYmFsLXRvb2x0aXAnKS5vbignY2xpY2suZ2xvYmFsLXRvb2x0aXAnLCB0b29sdGlwSWNvblNlbGVjdG9yLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcykuY2xvc2VzdCgnbGFiZWwnKTtcbiAgICAgICAgaWYgKCRsYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBTdG9wIHByb3BhZ2F0aW9uIHRvIHByZXZlbnQgbGFiZWwgZnJvbSB0b2dnbGluZyBjaGVja2JveFxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuICAgIH0pO1xufSk7Il19