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
          variation: settings.variation
        });
      }
    });
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
        variation: 'flowing'
      });
    }
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TooltipBuilder;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1Rvb2x0aXBCdWlsZGVyLmpzIl0sIm5hbWVzIjpbIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwidG9vbHRpcERhdGEiLCJodG1sIiwiaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJidWlsZExpc3QiLCJsaXN0IiwibGlzdEh0bWwiLCJmb3JFYWNoIiwiaXRlbSIsImRlZmluaXRpb24iLCJ0ZXJtIiwibGVuZ3RoIiwiaSIsImxpc3RLZXkiLCJ3YXJuaW5nIiwidGV4dCIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJsaW5lIiwiaW5kZXgiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJzcGxpdCIsInBhcmFtIiwidmFsdWUiLCJub3RlIiwiaW5pdGlhbGl6ZSIsInRvb2x0aXBDb25maWdzIiwib3B0aW9ucyIsImRlZmF1bHRzIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInNob3dEZWxheSIsImhpZGVEZWxheSIsInZhcmlhdGlvbiIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwiJCIsImVhY2giLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwiY29udGVudCIsInBvcHVwIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImRlc3Ryb3kiLCJ1cGRhdGUiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUNuQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBZm1CLHdCQWVOQyxXQWZNLEVBZU87QUFDdEIs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LEdBREg7QUFFSEMsVUFBQUEsSUFBSSxFQUFFO0FBRkgsU0FKQztBQVFSZCxRQUFBQSxTQUFTLEVBQUU7QUFSSCxPQUFaO0FBVUg7QUFDSjtBQWhOa0IsQ0FBdkIsQyxDQW1OQTs7QUFDQSxJQUFJLE9BQU9pQixNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJ6RCxjQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKi9cblxuLyoqXG4gKiBUb29sdGlwQnVpbGRlciAtIFV0aWxpdHkgY2xhc3MgZm9yIGJ1aWxkaW5nIGFuZCBtYW5hZ2luZyB0b29sdGlwc1xuICogXG4gKiBQcm92aWRlcyBtZXRob2RzIGZvcjpcbiAqIC0gQnVpbGRpbmcgSFRNTCBjb250ZW50IGZvciB0b29sdGlwc1xuICogLSBJbml0aWFsaXppbmcgU2VtYW50aWMgVUkgcG9wdXAgdG9vbHRpcHNcbiAqIC0gSGFuZGxpbmcgdmFyaW91cyB0b29sdGlwIGRhdGEgc3RydWN0dXJlc1xuICogXG4gKiBAbW9kdWxlIFRvb2x0aXBCdWlsZGVyXG4gKi9cbmNvbnN0IFRvb2x0aXBCdWlsZGVyID0ge1xuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9vbHRpcERhdGEuaGVhZGVyIC0gVG9vbHRpcCBoZWFkZXIgdGV4dFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b29sdGlwRGF0YS5kZXNjcmlwdGlvbiAtIFRvb2x0aXAgZGVzY3JpcHRpb24gdGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IHRvb2x0aXBEYXRhLmxpc3QgLSBNYWluIGxpc3Qgb2YgaXRlbXMgKHN0cmluZ3Mgb3Igb2JqZWN0cyB3aXRoIHRlcm0vZGVmaW5pdGlvbilcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB0b29sdGlwRGF0YS5saXN0Mi1saXN0MTAgLSBBZGRpdGlvbmFsIGxpc3RzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhLndhcm5pbmcgLSBXYXJuaW5nIG1lc3NhZ2Ugd2l0aCBoZWFkZXIgYW5kIHRleHRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSB0b29sdGlwRGF0YS5leGFtcGxlcyAtIENvZGUgZXhhbXBsZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9vbHRpcERhdGEuZXhhbXBsZXNIZWFkZXIgLSBIZWFkZXIgZm9yIGV4YW1wbGVzIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG9vbHRpcERhdGEubm90ZSAtIEFkZGl0aW9uYWwgbm90ZSB0ZXh0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICBpZiAoIXRvb2x0aXBEYXRhKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gYnVpbGQgbGlzdCBIVE1MXG4gICAgICAgIGNvbnN0IGJ1aWxkTGlzdCA9IChsaXN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgbGlzdEh0bWwgPSAnPHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbXBsZSBsaXN0IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRlcm0gd2l0aCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGlzdEh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIHJldHVybiBsaXN0SHRtbDtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtYWluIGxpc3QgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5saXN0ICYmIHRvb2x0aXBEYXRhLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGEubGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiB0aHJvdWdoIGxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGFbbGlzdEtleV0gJiYgdG9vbHRpcERhdGFbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYnVpbGRMaXN0KHRvb2x0aXBEYXRhW2xpc3RLZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7XCI+JztcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3Rvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZXhhbXBsZXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzICYmIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHt0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ1snKSAmJiBsaW5lLnRyaW0oKS5lbmRzV2l0aCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFyYW0sIHZhbHVlXSA9IGxpbmUuc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAodG9vbHRpcERhdGEubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7dG9vbHRpcERhdGEubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBDb25maWdzIC0gQ29uZmlndXJhdGlvbiBvYmplY3Qgd2l0aCBmaWVsZCBuYW1lcyBhcyBrZXlzIGFuZCB0b29sdGlwIGRhdGEgYXMgdmFsdWVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgZm9yIHBvcHVwIGluaXRpYWxpemF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnMgKGRlZmF1bHQ6ICcuZmllbGQtaW5mby1pY29uJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5wb3NpdGlvbiAtIFBvcHVwIHBvc2l0aW9uIChkZWZhdWx0OiAndG9wIHJpZ2h0JylcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuaG92ZXJhYmxlIC0gV2hldGhlciBwb3B1cCBzdGF5cyBvcGVuIG9uIGhvdmVyIChkZWZhdWx0OiB0cnVlKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLnNob3dEZWxheSAtIERlbGF5IGJlZm9yZSBzaG93aW5nIHBvcHVwIChkZWZhdWx0OiAzMDApXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMuaGlkZURlbGF5IC0gRGVsYXkgYmVmb3JlIGhpZGluZyBwb3B1cCAoZGVmYXVsdDogMTAwKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnZhcmlhdGlvbiAtIFBvcHVwIHZhcmlhdGlvbiAoZGVmYXVsdDogJ2Zsb3dpbmcnKVxuICAgICAqL1xuICAgIGluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCBkZWZhdWx0cyA9IHtcbiAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICBzaG93RGVsYXk6IDMwMCxcbiAgICAgICAgICAgIGhpZGVEZWxheTogMTAwLFxuICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgZWFjaCBpY29uXG4gICAgICAgICQoc2V0dGluZ3Muc2VsZWN0b3IpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdHlwZW9mIHRvb2x0aXBEYXRhID09PSAnc3RyaW5nJyA/IFxuICAgICAgICAgICAgICAgICAgICB0b29sdGlwRGF0YSA6IFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogc2V0dGluZ3MucG9zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogc2V0dGluZ3MuaG92ZXJhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogc2V0dGluZ3Muc2hvd0RlbGF5LFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogc2V0dGluZ3MuaGlkZURlbGF5XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogc2V0dGluZ3MudmFyaWF0aW9uXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgdG9vbHRpcHMgd2l0aCB0aGUgZ2l2ZW4gc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBkZXN0cm95KHNlbGVjdG9yID0gJy5maWVsZC1pbmZvLWljb24nKSB7XG4gICAgICAgICQoc2VsZWN0b3IpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGFsbCB0b29sdGlwcyB3aXRoIHRoZSBnaXZlbiBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBmb3IgdG9vbHRpcCBpY29uc1xuICAgICAqL1xuICAgIGhpZGUoc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2hpZGUnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0b29sdGlwIGNvbnRlbnQgZm9yIGEgc3BlY2lmaWMgZmllbGRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSB0byB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IHRvb2x0aXBEYXRhIC0gTmV3IHRvb2x0aXAgZGF0YSBvciBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3IgZm9yIGZpbmRpbmcgdGhlIGZpZWxkIGljb25cbiAgICAgKi9cbiAgICB1cGRhdGUoZmllbGROYW1lLCB0b29sdGlwRGF0YSwgc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKGAke3NlbGVjdG9yfVtkYXRhLWZpZWxkPVwiJHtmaWVsZE5hbWV9XCJdYCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGljb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdHlwZW9mIHRvb2x0aXBEYXRhID09PSAnc3RyaW5nJyA/IFxuICAgICAgICAgICAgICAgIHRvb2x0aXBEYXRhIDogXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIHBvcHVwXG4gICAgICAgICAgICAkaWNvbi5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgbmV3IHBvcHVwIHdpdGggdXBkYXRlZCBjb250ZW50XG4gICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFRvb2x0aXBCdWlsZGVyO1xufSJdfQ==