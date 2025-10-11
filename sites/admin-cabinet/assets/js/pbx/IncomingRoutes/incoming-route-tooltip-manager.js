"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global globalTranslate, TooltipBuilder */

/**
 * IncomingRouteTooltipManager - Manages tooltips for Incoming Route form fields
 *
 * This class provides tooltip configurations for incoming route settings fields,
 * helping users understand routing rules, number matching patterns, and call handling.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * Features:
 * - Tooltip configurations for routing rules
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and priorities
 *
 * @class IncomingRouteTooltipManager
 */
var IncomingRouteTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function IncomingRouteTooltipManager() {
    _classCallCheck(this, IncomingRouteTooltipManager);

    throw new Error('IncomingRouteTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the incoming route form
   * Uses the unified TooltipBuilder for consistent behavior
   *
   * @static
   */


  _createClass(IncomingRouteTooltipManager, null, [{
    key: "initialize",
    value: function initialize() {
      try {
        var tooltipConfigs = this.getTooltipConfigurations(); // Use TooltipBuilder to initialize all tooltips

        if (typeof TooltipBuilder !== 'undefined') {
          TooltipBuilder.initialize(tooltipConfigs, {
            selector: '.field-info-icon',
            position: 'top right',
            hoverable: true,
            variation: 'flowing'
          });
        } else {
          // Fallback to direct implementation if TooltipBuilder not available
          this.initializeFallback(tooltipConfigs);
        }
      } catch (error) {// Failed to initialize incoming route tooltips
      }
    }
    /**
     * Get all tooltip configurations for incoming route fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        // Provider tooltip
        provider: {
          header: globalTranslate.ir_provider_tooltip_header,
          description: globalTranslate.ir_provider_tooltip_desc,
          list: [globalTranslate.ir_provider_tooltip_item1, globalTranslate.ir_provider_tooltip_item2, {
            term: globalTranslate.ir_provider_tooltip_priority_header,
            definition: null
          }, globalTranslate.ir_provider_tooltip_priority1, globalTranslate.ir_provider_tooltip_priority2],
          note: globalTranslate.ir_provider_tooltip_example
        },
        // Number matching tooltip
        number: {
          header: globalTranslate.ir_number_tooltip_header,
          description: globalTranslate.ir_number_tooltip_desc,
          list: [{
            term: globalTranslate.ir_number_tooltip_types_header,
            definition: null
          }, globalTranslate.ir_number_tooltip_type1, globalTranslate.ir_number_tooltip_type2, globalTranslate.ir_number_tooltip_type3, globalTranslate.ir_number_tooltip_type4, {
            term: globalTranslate.ir_number_tooltip_masks_header,
            definition: null
          }, globalTranslate.ir_number_tooltip_mask1, globalTranslate.ir_number_tooltip_mask2, globalTranslate.ir_number_tooltip_mask3, globalTranslate.ir_number_tooltip_mask4, globalTranslate.ir_number_tooltip_mask5],
          list2: [{
            term: globalTranslate.ir_number_tooltip_priority_header,
            definition: null
          }, globalTranslate.ir_number_tooltip_priority1, globalTranslate.ir_number_tooltip_priority2, globalTranslate.ir_number_tooltip_priority3, globalTranslate.ir_number_tooltip_priority4],
          note: globalTranslate.ir_number_tooltip_note
        },
        // Audio message tooltip
        audio_message_id: {
          header: globalTranslate.ir_audio_message_id_tooltip_header,
          description: globalTranslate.ir_audio_message_id_tooltip_desc,
          list: [{
            term: globalTranslate.ir_audio_message_id_tooltip_when_header,
            definition: null
          }, globalTranslate.ir_audio_message_id_tooltip_when1, globalTranslate.ir_audio_message_id_tooltip_when2, globalTranslate.ir_audio_message_id_tooltip_when3],
          list2: [{
            term: globalTranslate.ir_audio_message_id_tooltip_targets_header,
            definition: null
          }, globalTranslate.ir_audio_message_id_tooltip_target1, globalTranslate.ir_audio_message_id_tooltip_target2, globalTranslate.ir_audio_message_id_tooltip_target3, globalTranslate.ir_audio_message_id_tooltip_target4],
          list3: [{
            term: globalTranslate.ir_audio_message_id_tooltip_examples_header,
            definition: null
          }, globalTranslate.ir_audio_message_id_tooltip_example1, globalTranslate.ir_audio_message_id_tooltip_example2, globalTranslate.ir_audio_message_id_tooltip_example3]
        },
        // Timeout tooltip
        timeout: {
          header: globalTranslate.ir_timeout_tooltip_header,
          description: globalTranslate.ir_timeout_tooltip_desc,
          list: [{
            term: globalTranslate.ir_timeout_tooltip_behavior_header,
            definition: null
          }, globalTranslate.ir_timeout_tooltip_behavior1, globalTranslate.ir_timeout_tooltip_behavior2, globalTranslate.ir_timeout_tooltip_behavior3, globalTranslate.ir_timeout_tooltip_behavior4],
          list2: [{
            term: globalTranslate.ir_timeout_tooltip_values_header,
            definition: null
          }, globalTranslate.ir_timeout_tooltip_value1, globalTranslate.ir_timeout_tooltip_value2, globalTranslate.ir_timeout_tooltip_value3],
          list3: [{
            term: globalTranslate.ir_timeout_tooltip_chain_header,
            definition: null
          }, globalTranslate.ir_timeout_tooltip_chain1, globalTranslate.ir_timeout_tooltip_chain2, globalTranslate.ir_timeout_tooltip_chain3]
        }
      };
    }
    /**
     * Fallback implementation when TooltipBuilder is not available
     *
     * @private
     * @static
     * @param {Object} configs - Tooltip configurations object
     */

  }, {
    key: "initializeFallback",
    value: function initializeFallback(configs) {
      var _this = this;

      $('.field-info-icon').each(function (index, element) {
        var $icon = $(element);
        var fieldName = $icon.data('field');
        var tooltipData = configs[fieldName];

        if (tooltipData) {
          var content = _this.buildTooltipContent(tooltipData);

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
      });
    }
    /**
     * Build HTML content for tooltip popup (fallback implementation)
     * This method is kept for backward compatibility when TooltipBuilder is not available
     *
     * @private
     * @static
     * @param {Object} config - Configuration object for tooltip content
     * @returns {string} - HTML string for tooltip content
     */

  }, {
    key: "buildTooltipContent",
    value: function buildTooltipContent(config) {
      if (!config) return '';
      var html = ''; // Add header if exists

      if (config.header) {
        html += "<div class=\"header\"><strong>".concat(config.header, "</strong></div>");
        html += '<div class="ui divider"></div>';
      } // Add description if exists


      if (config.description) {
        html += "<p>".concat(config.description, "</p>");
      } // Add list items if exist


      if (config.list) {
        html = this.addListToContent(html, config.list);
      } // Add additional lists (list2, list3, etc.)


      for (var i = 2; i <= 10; i++) {
        var listName = "list".concat(i);

        if (config[listName] && config[listName].length > 0) {
          html = this.addListToContent(html, config[listName]);
        }
      } // Add warning if exists


      if (config.warning) {
        html += this.buildWarningSection(config.warning);
      } // Add note if exists


      if (config.note) {
        html += "<p><em>".concat(config.note, "</em></p>");
      }

      return html;
    }
    /**
     * Add list items to tooltip content (fallback implementation)
     *
     * @private
     * @static
     * @param {string} html - Current HTML content
     * @param {Array|Object} list - List of items to add
     * @returns {string} - Updated HTML content
     */

  }, {
    key: "addListToContent",
    value: function addListToContent(html, list) {
      if (Array.isArray(list) && list.length > 0) {
        html += '<ul>';
        list.forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          } else if (item.term && item.definition === null) {
            // Header item without definition
            html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
          } else if (item.term && item.definition) {
            html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        html += '</ul>';
      } else if (_typeof(list) === 'object') {
        // Old format - object with key-value pairs
        html += '<ul>';
        Object.entries(list).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              term = _ref2[0],
              definition = _ref2[1];

          html += "<li><strong>".concat(term, ":</strong> ").concat(definition, "</li>");
        });
        html += '</ul>';
      }

      return html;
    }
    /**
     * Build warning section for tooltip (fallback implementation)
     *
     * @private
     * @static
     * @param {Object} warning - Warning configuration
     * @returns {string} - HTML string for warning section
     */

  }, {
    key: "buildWarningSection",
    value: function buildWarningSection(warning) {
      var html = '<div class="ui small orange message">';

      if (warning.header) {
        html += "<div class=\"header\">";
        html += "<i class=\"exclamation triangle icon\"></i> ";
        html += warning.header;
        html += "</div>";
      }

      html += warning.text;
      html += '</div>';
      return html;
    }
    /**
     * Update specific tooltip content dynamically
     *
     * @static
     * @param {string} fieldName - Field name to update
     * @param {Object|string} tooltipData - New tooltip data or HTML content
     */

  }, {
    key: "updateTooltip",
    value: function updateTooltip(fieldName, tooltipData) {
      try {
        if (typeof TooltipBuilder !== 'undefined') {
          TooltipBuilder.update(fieldName, tooltipData);
        } else {
          console.error('TooltipBuilder is not available for updating tooltip');
        }
      } catch (error) {
        console.error("Failed to update tooltip for field '".concat(fieldName, "':"), error);
      }
    }
    /**
     * Destroy all incoming route tooltips
     *
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */

  }, {
    key: "destroy",
    value: function destroy() {
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.field-info-icon';

      try {
        if (typeof TooltipBuilder !== 'undefined') {
          TooltipBuilder.destroy(selector);
        } else {
          $(selector).popup('destroy');
        }
      } catch (error) {
        console.error('Failed to destroy incoming route tooltips:', error);
      }
    }
  }]);

  return IncomingRouteTooltipManager;
}(); // Export for use in incoming-route-modify.js


if (typeof module !== 'undefined' && module.exports) {
  module.exports = IncomingRouteTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiSW5jb21pbmdSb3V0ZVRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJ0b29sdGlwQ29uZmlncyIsImdldFRvb2x0aXBDb25maWd1cmF0aW9ucyIsIlRvb2x0aXBCdWlsZGVyIiwiaW5pdGlhbGl6ZSIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsInByb3ZpZGVyIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyIsImxpc3QiLCJpcl9wcm92aWRlcl90b29sdGlwX2l0ZW0xIiwiaXJfcHJvdmlkZXJfdG9vbHRpcF9pdGVtMiIsInRlcm0iLCJpcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsImRlZmluaXRpb24iLCJpcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwibm90ZSIsImlyX3Byb3ZpZGVyX3Rvb2x0aXBfZXhhbXBsZSIsIm51bWJlciIsImlyX251bWJlcl90b29sdGlwX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX2Rlc2MiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlc19oZWFkZXIiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlMSIsImlyX251bWJlcl90b29sdGlwX3R5cGUyIiwiaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTMiLCJpcl9udW1iZXJfdG9vbHRpcF90eXBlNCIsImlyX251bWJlcl90b29sdGlwX21hc2tzX2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX21hc2sxIiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazIiLCJpcl9udW1iZXJfdG9vbHRpcF9tYXNrMyIsImlyX251bWJlcl90b29sdGlwX21hc2s0IiwiaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazUiLCJsaXN0MiIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlciIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MSIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MiIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5MyIsImlyX251bWJlcl90b29sdGlwX3ByaW9yaXR5NCIsImlyX251bWJlcl90b29sdGlwX25vdGUiLCJhdWRpb19tZXNzYWdlX2lkIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2hlYWRlciIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9kZXNjIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW5faGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4xIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4yIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4zIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldHNfaGVhZGVyIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MiIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQzIiwiaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDQiLCJsaXN0MyIsImlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTEiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTIiLCJpcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZTMiLCJ0aW1lb3V0IiwiaXJfdGltZW91dF90b29sdGlwX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IyIiwiaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjQiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsImlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTEiLCJpcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUyIiwiaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMyIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbl9oZWFkZXIiLCJpcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4xIiwiaXJfdGltZW91dF90b29sdGlwX2NoYWluMiIsImlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjMiLCJjb25maWdzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNvbmZpZyIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJsZW5ndGgiLCJ3YXJuaW5nIiwiYnVpbGRXYXJuaW5nU2VjdGlvbiIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsInRleHQiLCJ1cGRhdGUiLCJjb25zb2xlIiwiZGVzdHJveSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVB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VUFBQUEsY0FBYyxDQUFDNEcsTUFBZixDQUFzQnhCLFNBQXRCLEVBQWlDRSxXQUFqQztBQUNILFNBRkQsTUFFTztBQUNIdUIsVUFBQUEsT0FBTyxDQUFDdEcsS0FBUixDQUFjLHNEQUFkO0FBQ0g7QUFDSixPQU5ELENBTUUsT0FBT0EsS0FBUCxFQUFjO0FBQ1pzRyxRQUFBQSxPQUFPLENBQUN0RyxLQUFSLCtDQUFxRDZFLFNBQXJELFNBQW9FN0UsS0FBcEU7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksbUJBQThDO0FBQUEsVUFBL0JMLFFBQStCLHVFQUFwQixrQkFBb0I7O0FBQzFDLFVBQUk7QUFDQSxZQUFJLE9BQU9GLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQzhHLE9BQWYsQ0FBdUI1RyxRQUF2QjtBQUNILFNBRkQsTUFFTztBQUNINkUsVUFBQUEsQ0FBQyxDQUFDN0UsUUFBRCxDQUFELENBQVl1RixLQUFaLENBQWtCLFNBQWxCO0FBQ0g7QUFDSixPQU5ELENBTUUsT0FBT2xGLEtBQVAsRUFBYztBQUNac0csUUFBQUEsT0FBTyxDQUFDdEcsS0FBUixDQUFjLDRDQUFkLEVBQTREQSxLQUE1RDtBQUNIO0FBQ0o7Ozs7S0FHTDs7O0FBQ0EsSUFBSSxPQUFPd0csTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCcEgsMkJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEluY29taW5nUm91dGVUb29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEluY29taW5nIFJvdXRlIGZvcm0gZmllbGRzXG4gKlxuICogVGhpcyBjbGFzcyBwcm92aWRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBpbmNvbWluZyByb3V0ZSBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgcm91dGluZyBydWxlcywgbnVtYmVyIG1hdGNoaW5nIHBhdHRlcm5zLCBhbmQgY2FsbCBoYW5kbGluZy5cbiAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgc3lzdGVtIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICpcbiAqIEZlYXR1cmVzOlxuICogLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciByb3V0aW5nIHJ1bGVzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdW5pZmllZCBUb29sdGlwQnVpbGRlclxuICogLSBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbiBmb3IgY29tcGF0aWJpbGl0eVxuICogLSBTdXBwb3J0IGZvciBjb21wbGV4IHRvb2x0aXBzIHdpdGggZXhhbXBsZXMgYW5kIHByaW9yaXRpZXNcbiAqXG4gKiBAY2xhc3MgSW5jb21pbmdSb3V0ZVRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIEluY29taW5nUm91dGVUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0luY29taW5nUm91dGVUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIHRvb2x0aXBzIGZvciB0aGUgaW5jb21pbmcgcm91dGUgZm9ybVxuICAgICAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcblxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGluaXRpYWxpemUgaW5jb21pbmcgcm91dGUgdG9vbHRpcHNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgaW5jb21pbmcgcm91dGUgZmllbGRzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvLyBQcm92aWRlciB0b29sdGlwXG4gICAgICAgICAgICBwcm92aWRlcjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXJfcHJvdmlkZXJfdG9vbHRpcF9leGFtcGxlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBOdW1iZXIgbWF0Y2hpbmcgdG9vbHRpcFxuICAgICAgICAgICAgbnVtYmVyOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX3R5cGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfdHlwZTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF90eXBlNCxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2tzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2sxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9tYXNrMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX251bWJlcl90b29sdGlwX21hc2s0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfbnVtYmVyX3Rvb2x0aXBfbWFzazVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9wcmlvcml0eTRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9udW1iZXJfdG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBBdWRpbyBtZXNzYWdlIHRvb2x0aXBcbiAgICAgICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW5faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3doZW4zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldHNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfdGFyZ2V0MixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX2F1ZGlvX21lc3NhZ2VfaWRfdG9vbHRpcF90YXJnZXQzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX3RhcmdldDRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl9hdWRpb19tZXNzYWdlX2lkX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfYXVkaW9fbWVzc2FnZV9pZF90b29sdGlwX2V4YW1wbGUzXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gVGltZW91dCB0b29sdGlwXG4gICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3IxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2JlaGF2aW9yMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9iZWhhdmlvcjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfYmVoYXZpb3I0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfdmFsdWUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX3ZhbHVlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF92YWx1ZTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW5faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXJfdGltZW91dF90b29sdGlwX2NoYWluMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlyX3RpbWVvdXRfdG9vbHRpcF9jaGFpbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pcl90aW1lb3V0X3Rvb2x0aXBfY2hhaW4zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIG9iamVjdFxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2soY29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IGNvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBsaXN0IGl0ZW1zIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWcubGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZ1tsaXN0TmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBsaXN0IGl0ZW1zIHRvIHRvb2x0aXAgY29udGVudCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHdhcm5pbmcgLSBXYXJuaW5nIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB3YXJuaW5nIHNlY3Rpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRXYXJuaW5nU2VjdGlvbih3YXJuaW5nKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgIGlmICh3YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+IGA7XG4gICAgICAgICAgICBodG1sICs9IHdhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IHdhcm5pbmcudGV4dDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudCBkeW5hbWljYWxseVxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVUb29sdGlwKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlIGZvciB1cGRhdGluZyB0b29sdGlwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGluY29taW5nIHJvdXRlIHRvb2x0aXBzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzZWxlY3Rvcj0nLmZpZWxkLWluZm8taWNvbiddIC0galF1ZXJ5IHNlbGVjdG9yIGZvciB0b29sdGlwIGljb25zXG4gICAgICovXG4gICAgc3RhdGljIGRlc3Ryb3koc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuZGVzdHJveShzZWxlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVzdHJveSBpbmNvbWluZyByb3V0ZSB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGluY29taW5nLXJvdXRlLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBJbmNvbWluZ1JvdXRlVG9vbHRpcE1hbmFnZXI7XG59XG4iXX0=