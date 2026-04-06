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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1Rvb2x0aXBCdWlsZGVyLmpzIl0sIm5hbWVzIjpbIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwidG9vbHRpcERhdGEiLCJodG1sIiwiaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJidWlsZExpc3QiLCJsaXN0IiwibGlzdEh0bWwiLCJmb3JFYWNoIiwiaXRlbSIsImRlZmluaXRpb24iLCJ0ZXJtIiwibGVuZ3RoIiwiaSIsImxpc3RLZXkiLCJ3YXJuaW5nIiwidGV4dCIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJsaW5lIiwiaW5kZXgiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJzcGxpdCIsInBhcmFtIiwidmFsdWUiLCJub3RlIiwiaW5pdGlhbGl6ZSIsInRvb2x0aXBDb25maWdzIiwib3B0aW9ucyIsImRlZmF1bHRzIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInNob3dEZWxheSIsImhpZGVEZWxheSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwiJCIsImVhY2giLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwiY29udGVudCIsInBvcHVwIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsIm9uIiwib2ZmIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInByZXZlbnREZWZhdWx0IiwiZGVzdHJveSIsInVwZGF0ZSIsIm1vZHVsZSIsImV4cG9ydHMiLCJkb2N1bWVudCIsInJlYWR5IiwidG9vbHRpcEljb25TZWxlY3RvciIsIiRsYWJlbCIsImNsb3Nlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FB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QUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI7QUFDQTtBQUNBLE1BQU1DLG1CQUFtQixHQUFHLDhEQUE1QjtBQUVBdEIsRUFBQUEsQ0FBQyxDQUFDb0IsUUFBRCxDQUFELENBQVlSLEdBQVosQ0FBZ0Isc0JBQWhCLEVBQXdDRCxFQUF4QyxDQUEyQyxzQkFBM0MsRUFBbUVXLG1CQUFuRSxFQUF3RixVQUFTVCxDQUFULEVBQVk7QUFDaEcsUUFBTVUsTUFBTSxHQUFHdkIsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRd0IsT0FBUixDQUFnQixPQUFoQixDQUFmOztBQUNBLFFBQUlELE1BQU0sQ0FBQ3JELE1BQVAsR0FBZ0IsQ0FBcEIsRUFBdUI7QUFDbkI7QUFDQTJDLE1BQUFBLENBQUMsQ0FBQ0MsZUFBRjtBQUNBRCxNQUFBQSxDQUFDLENBQUNFLGNBQUY7QUFDSDtBQUNKLEdBUEQ7QUFRSCxDQWJEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKi9cblxuLyoqXG4gKiBUb29sdGlwQnVpbGRlciAtIFV0aWxpdHkgY2xhc3MgZm9yIGJ1aWxkaW5nIGFuZCBtYW5hZ2luZyB0b29sdGlwc1xuICogXG4gKiBQcm92aWRlcyBtZXRob2RzIGZvcjpcbiAqIC0gQnVpbGRpbmcgSFRNTCBjb250ZW50IGZvciB0b29sdGlwc1xuICogLSBJbml0aWFsaXppbmcgU2VtYW50aWMgVUkgcG9wdXAgdG9vbHRpcHNcbiAqIC0gSGFuZGxpbmcgdmFyaW91cyB0b29sdGlwIGRhdGEgc3RydWN0dXJlc1xuICogXG4gKiBAbW9kdWxlIFRvb2x0aXBCdWlsZGVyXG4gKi9cbmNvbnN0IFRvb2x0aXBCdWlsZGVyID0ge1xuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9vbHRpcERhdGEuaGVhZGVyIC0gVG9vbHRpcCBoZWFkZXIgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b29sdGlwRGF0YS5kZXNjcmlwdGlvbiAtIFRvb2x0aXAgZGVzY3JpcHRpb24gdGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHRvb2x0aXBEYXRhLmxpc3QgLSBNYWluIGxpc3Qgb2YgaXRlbXMgKHN0cmluZ3Mgb3Igb2JqZWN0cyB3aXRoIHRlcm0vZGVmaW5pdGlvbilcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB0b29sdGlwRGF0YS5saXN0Mi1saXN0MTAgLSBBZGRpdGlvbmFsIGxpc3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhLndhcm5pbmcgLSBXYXJuaW5nIG1lc3NhZ2Ugd2l0aCBoZWFkZXIgYW5kIHRleHRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB0b29sdGlwRGF0YS5leGFtcGxlcyAtIENvZGUgZXhhbXBsZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9vbHRpcERhdGEuZXhhbXBsZXNIZWFkZXIgLSBIZWFkZXIgZm9yIGV4YW1wbGVzIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9vbHRpcERhdGEubm90ZSAtIEFkZGl0aW9uYWwgbm90ZSB0ZXh0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICBpZiAoIXRvb2x0aXBEYXRhKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gYnVpbGQgbGlzdCBIVE1MXG4gICAgICAgIGNvbnN0IGJ1aWxkTGlzdCA9IChsaXN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgbGlzdEh0bWwgPSAnPHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBsaXN0IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRlcm0gd2l0aCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGlzdEh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIHJldHVybiBsaXN0SHRtbDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtYWluIGxpc3QgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5saXN0ICYmIHRvb2x0aXBEYXRhLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGEubGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiB0aHJvdWdoIGxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGFbbGlzdEtleV0gJiYgdG9vbHRpcERhdGFbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYnVpbGRMaXN0KHRvb2x0aXBEYXRhW2xpc3RLZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7XCI+JztcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3Rvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZXhhbXBsZXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzICYmIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHt0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ1snKSAmJiBsaW5lLnRyaW0oKS5lbmRzV2l0aCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFyYW0sIHZhbHVlXSA9IGxpbmUuc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7dG9vbHRpcERhdGEubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBDb25maWdzIC0gQ29uZmlndXJhdGlvbiBvYmplY3Qgd2l0aCBmaWVsZCBuYW1lcyBhcyBrZXlzIGFuZCB0b29sdGlwIGRhdGEgYXMgdmFsdWVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHBvcHVwIGluaXRpYWxpemF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnMgKGRlZmF1bHQ6ICcuZmllbGQtaW5mby1pY29uJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5wb3NpdGlvbiAtIFBvcHVwIHBvc2l0aW9uIChkZWZhdWx0OiAndG9wIHJpZ2h0JylcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuaG92ZXJhYmxlIC0gV2hldGhlciBwb3B1cCBzdGF5cyBvcGVuIG9uIGhvdmVyIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnNob3dEZWxheSAtIERlbGF5IGJlZm9yZSBzaG93aW5nIHBvcHVwIChkZWZhdWx0OiAzMDApXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuaGlkZURlbGF5IC0gRGVsYXkgYmVmb3JlIGhpZGluZyBwb3B1cCAoZGVmYXVsdDogMTAwKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnZhcmlhdGlvbiAtIFBvcHVwIHZhcmlhdGlvbiAoZGVmYXVsdDogJ2Zsb3dpbmcnKVxuICAgICAqL1xuICAgIGluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBzaG93RGVsYXk6IDMwMCxcbiAgICAgICAgICAgIGhpZGVEZWxheTogMTAwLFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIGRlZmF1bHRzLCBvcHRpb25zKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBlYWNoIGljb25cbiAgICAgICAgJChzZXR0aW5ncy5zZWxlY3RvcikuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0eXBlb2YgdG9vbHRpcERhdGEgPT09ICdzdHJpbmcnID9cbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcERhdGEgOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBzZXR0aW5ncy5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiBzZXR0aW5ncy5ob3ZlcmFibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiBzZXR0aW5ncy5zaG93RGVsYXksXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiBzZXR0aW5ncy5oaWRlRGVsYXlcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiBzZXR0aW5ncy52YXJpYXRpb24sXG4gICAgICAgICAgICAgICAgICAgIG9uOiAnbWFudWFsJyAgLy8gTWFudWFsIGNvbnRyb2wgZm9yIGJldHRlciBoYW5kbGluZyBpbnNpZGUgbGFiZWxzXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgY2xpY2sgaGFuZGxlciBmb3IgbWFudWFsIHBvcHVwIGNvbnRyb2xcbiAgICAgICAgICAgICAgICAkaWNvbi5vZmYoJ2NsaWNrLnBvcHVwLXRyaWdnZXInKS5vbignY2xpY2sucG9wdXAtdHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcCBwcm9wYWdhdGlvbiB0byBwcmV2ZW50IGxhYmVsIGZyb20gdHJpZ2dlcmluZyBjaGVja2JveFxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgJCh0aGlzKS5wb3B1cCgndG9nZ2xlJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vdGU6IENsaWNrIHByZXZlbnRpb24gaXMgaGFuZGxlZCBpbmRpdmlkdWFsbHkgZm9yIGVhY2ggaWNvbiBpbiB0aGUgbG9vcCBhYm92ZVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgdG9vbHRpcHMgd2l0aCB0aGUgZ2l2ZW4gc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBkZXN0cm95KHNlbGVjdG9yID0gJy5maWVsZC1pbmZvLWljb24nKSB7XG4gICAgICAgICQoc2VsZWN0b3IpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGFsbCB0b29sdGlwcyB3aXRoIHRoZSBnaXZlbiBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgdG9vbHRpcCBpY29uc1xuICAgICAqL1xuICAgIGhpZGUoc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2hpZGUnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0b29sdGlwIGNvbnRlbnQgZm9yIGEgc3BlY2lmaWMgZmllbGRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgZmluZGluZyB0aGUgZmllbGQgaWNvblxuICAgICAqL1xuICAgIHVwZGF0ZShmaWVsZE5hbWUsIHRvb2x0aXBEYXRhLCBzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICBjb25zdCAkaWNvbiA9ICQoYCR7c2VsZWN0b3J9W2RhdGEtZmllbGQ9XCIke2ZpZWxkTmFtZX1cIl1gKTtcblxuICAgICAgICBpZiAoJGljb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdHlwZW9mIHRvb2x0aXBEYXRhID09PSAnc3RyaW5nJyA/XG4gICAgICAgICAgICAgICAgdG9vbHRpcERhdGEgOlxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcblxuICAgICAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBwb3B1cFxuICAgICAgICAgICAgJGljb24ucG9wdXAoJ2Rlc3Ryb3knKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIG5ldyBwb3B1cCB3aXRoIHVwZGF0ZWQgY29udGVudFxuICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZycsXG4gICAgICAgICAgICAgICAgb246ICdtYW51YWwnXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgZm9yIG1hbnVhbCBwb3B1cCBjb250cm9sXG4gICAgICAgICAgICAkaWNvbi5vZmYoJ2NsaWNrLnBvcHVwLXRyaWdnZXInKS5vbignY2xpY2sucG9wdXAtdHJpZ2dlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnBvcHVwKCd0b2dnbGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuXG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRvb2x0aXBCdWlsZGVyO1xufVxuXG4vLyBJbml0aWFsaXplIGdsb2JhbCBjbGljayBwcmV2ZW50aW9uIGZvciBhbGwgdG9vbHRpcCBpY29uc1xuLy8gVGhpcyB3aWxsIHdvcmsgZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGVsZW1lbnRzIHRvb1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBhbGwgY3VycmVudCBhbmQgZnV0dXJlIHRvb2x0aXAgaWNvbiBlbGVtZW50c1xuICAgIC8vIFN1cHBvcnRzIG11bHRpcGxlIGljb24gY2xhc3NlczogZmllbGQtaW5mby1pY29uLCBzcGVjaWFsLWNoZWNrYm94LWluZm8sIHNlcnZpY2UtaW5mby1pY29uXG4gICAgY29uc3QgdG9vbHRpcEljb25TZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uLCAuc3BlY2lhbC1jaGVja2JveC1pbmZvLCAuc2VydmljZS1pbmZvLWljb24nO1xuXG4gICAgJChkb2N1bWVudCkub2ZmKCdjbGljay5nbG9iYWwtdG9vbHRpcCcpLm9uKCdjbGljay5nbG9iYWwtdG9vbHRpcCcsIHRvb2x0aXBJY29uU2VsZWN0b3IsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY29uc3QgJGxhYmVsID0gJCh0aGlzKS5jbG9zZXN0KCdsYWJlbCcpO1xuICAgICAgICBpZiAoJGxhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFN0b3AgcHJvcGFnYXRpb24gdG8gcHJldmVudCBsYWJlbCBmcm9tIHRvZ2dsaW5nIGNoZWNrYm94XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgfSk7XG59KTsiXX0=