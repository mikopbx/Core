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
 * IvrMenuTooltipManager - Manages tooltips for IVR Menu form fields
 *
 * This class provides tooltip configurations for IVR menu settings fields,
 * helping users understand menu behavior, timeout settings, and audio message options.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * Features:
 * - Tooltip configurations for IVR menu settings
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and recommendations
 *
 * @class IvrMenuTooltipManager
 */
var IvrMenuTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function IvrMenuTooltipManager() {
    _classCallCheck(this, IvrMenuTooltipManager);

    throw new Error('IvrMenuTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the IVR menu form
   * Uses the unified TooltipBuilder for consistent behavior
   *
   * @static
   */


  _createClass(IvrMenuTooltipManager, null, [{
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
      } catch (error) {// Failed to initialize IVR menu tooltips
      }
    }
    /**
     * Get all tooltip configurations for IVR menu fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        // Number of repeat tooltip
        number_of_repeat: {
          header: globalTranslate.iv_NumberOfRepeatTooltip_header,
          description: globalTranslate.iv_NumberOfRepeatTooltip_desc,
          note: globalTranslate.iv_NumberOfRepeatTooltip_note
        },
        // Timeout tooltip
        timeout: {
          header: globalTranslate.iv_TimeoutTooltip_header,
          description: globalTranslate.iv_TimeoutTooltip_desc,
          list: [globalTranslate.iv_TimeoutTooltip_list1, globalTranslate.iv_TimeoutTooltip_list2, globalTranslate.iv_TimeoutTooltip_list3],
          note: globalTranslate.iv_TimeoutTooltip_note
        },
        // Timeout extension tooltip
        timeout_extension: {
          header: globalTranslate.iv_TimeoutExtensionTooltip_header,
          description: globalTranslate.iv_TimeoutExtensionTooltip_desc,
          list: [globalTranslate.iv_TimeoutExtensionTooltip_list1, globalTranslate.iv_TimeoutExtensionTooltip_list2, globalTranslate.iv_TimeoutExtensionTooltip_list3],
          note: globalTranslate.iv_TimeoutExtensionTooltip_note
        },
        // Allow enter any internal extension tooltip
        allow_enter_any_internal_extension: {
          header: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_header,
          description: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_desc,
          list: [{
            term: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list_header,
            definition: null
          }, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list1, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list2, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list3, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list4],
          note: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_note
        },
        // Extension tooltip
        extension: {
          header: globalTranslate.iv_ExtensionTooltip_header,
          description: globalTranslate.iv_ExtensionTooltip_desc,
          note: globalTranslate.iv_ExtensionTooltip_note
        },
        // Audio message tooltip
        audio_message_id: {
          header: globalTranslate.iv_AudioMessageIdTooltip_header,
          description: globalTranslate.iv_AudioMessageIdTooltip_desc,
          list: [{
            term: globalTranslate.iv_AudioMessageIdTooltip_content_header,
            definition: null
          }, globalTranslate.iv_AudioMessageIdTooltip_content1, globalTranslate.iv_AudioMessageIdTooltip_content2, globalTranslate.iv_AudioMessageIdTooltip_content3],
          list2: [{
            term: globalTranslate.iv_AudioMessageIdTooltip_recommendations_header,
            definition: null
          }, globalTranslate.iv_AudioMessageIdTooltip_rec1, globalTranslate.iv_AudioMessageIdTooltip_rec2, globalTranslate.iv_AudioMessageIdTooltip_rec3],
          note: globalTranslate.iv_AudioMessageIdTooltip_note
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
     * Destroy all IVR menu tooltips
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
        console.error('Failed to destroy IVR menu tooltips:', error);
      }
    }
  }]);

  return IvrMenuTooltipManager;
}(); // Export for use in ivrmenu-modify.js


if (typeof module !== 'undefined' && module.exports) {
  module.exports = IvrMenuTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtdG9vbHRpcC1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbIkl2ck1lbnVUb29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiaW5pdGlhbGl6ZUZhbGxiYWNrIiwiZXJyb3IiLCJudW1iZXJfb2ZfcmVwZWF0IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2Rlc2MiLCJub3RlIiwiaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX25vdGUiLCJ0aW1lb3V0IiwiaXZfVGltZW91dFRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dFRvb2x0aXBfZGVzYyIsImxpc3QiLCJpdl9UaW1lb3V0VG9vbHRpcF9saXN0MSIsIml2X1RpbWVvdXRUb29sdGlwX2xpc3QyIiwiaXZfVGltZW91dFRvb2x0aXBfbGlzdDMiLCJpdl9UaW1lb3V0VG9vbHRpcF9ub3RlIiwidGltZW91dF9leHRlbnNpb24iLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9kZXNjIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDEiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MiIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QzIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbm90ZSIsImFsbG93X2VudGVyX2FueV9pbnRlcm5hbF9leHRlbnNpb24iLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2hlYWRlciIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfZGVzYyIsInRlcm0iLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3RfaGVhZGVyIiwiZGVmaW5pdGlvbiIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDEiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QyIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MyIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDQiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX25vdGUiLCJleHRlbnNpb24iLCJpdl9FeHRlbnNpb25Ub29sdGlwX2hlYWRlciIsIml2X0V4dGVuc2lvblRvb2x0aXBfZGVzYyIsIml2X0V4dGVuc2lvblRvb2x0aXBfbm90ZSIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfaGVhZGVyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX2Rlc2MiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudF9oZWFkZXIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDEiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDIiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDMiLCJsaXN0MiIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlYzEiLCJpdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjMiIsIml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMzIiwiaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX25vdGUiLCJjb25maWdzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNvbmZpZyIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJsZW5ndGgiLCJ3YXJuaW5nIiwiYnVpbGRXYXJuaW5nU2VjdGlvbiIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsInRleHQiLCJ1cGRhdGUiLCJjb25zb2xlIiwiZGVzdHJveSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxxQjtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksbUNBQWM7QUFBQTs7QUFDVixVQUFNLElBQUlDLEtBQUosQ0FBVSxvRUFBVixDQUFOO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O1dBQ0ksc0JBQW9CO0FBQ2hCLFVBQUk7QUFDQSxZQUFNQyxjQUFjLEdBQUcsS0FBS0Msd0JBQUwsRUFBdkIsQ0FEQSxDQUdBOztBQUNBLFlBQUksT0FBT0MsY0FBUCxLQUEwQixXQUE5QixFQUEyQztBQUN2Q0EsVUFBQUEsY0FBYyxDQUFDQyxVQUFmLENBQTBCSCxjQUExQixFQUEwQztBQUN0Q0ksWUFBQUEsUUFBUSxFQUFFLGtCQUQ0QjtBQUV0Q0MsWUFBQUEsUUFBUSxFQUFFLFdBRjRCO0FBR3RDQyxZQUFBQSxTQUFT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MkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQzJGLE9BQWYsQ0FBdUJ6RixRQUF2QjtBQUNILFNBRkQsTUFFTztBQUNIMEQsVUFBQUEsQ0FBQyxDQUFDMUQsUUFBRCxDQUFELENBQVlvRSxLQUFaLENBQWtCLFNBQWxCO0FBQ0g7QUFDSixPQU5ELENBTUUsT0FBTy9ELEtBQVAsRUFBYztBQUNabUYsUUFBQUEsT0FBTyxDQUFDbkYsS0FBUixDQUFjLHNDQUFkLEVBQXNEQSxLQUF0RDtBQUNIO0FBQ0o7Ozs7S0FHTDs7O0FBQ0EsSUFBSSxPQUFPcUYsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCakcscUJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEl2ck1lbnVUb29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIElWUiBNZW51IGZvcm0gZmllbGRzXG4gKlxuICogVGhpcyBjbGFzcyBwcm92aWRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBJVlIgbWVudSBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgbWVudSBiZWhhdmlvciwgdGltZW91dCBzZXR0aW5ncywgYW5kIGF1ZGlvIG1lc3NhZ2Ugb3B0aW9ucy5cbiAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgc3lzdGVtIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICpcbiAqIEZlYXR1cmVzOlxuICogLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBJVlIgbWVudSBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzIGFuZCByZWNvbW1lbmRhdGlvbnNcbiAqXG4gKiBAY2xhc3MgSXZyTWVudVRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIEl2ck1lbnVUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0l2ck1lbnVUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIHRvb2x0aXBzIGZvciB0aGUgSVZSIG1lbnUgZm9ybVxuICAgICAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcblxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGluaXRpYWxpemUgSVZSIG1lbnUgdG9vbHRpcHNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgSVZSIG1lbnUgZmllbGRzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvLyBOdW1iZXIgb2YgcmVwZWF0IHRvb2x0aXBcbiAgICAgICAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBUaW1lb3V0IHRvb2x0aXBcbiAgICAgICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2xpc3QxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9saXN0M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFRpbWVvdXQgZXh0ZW5zaW9uIHRvb2x0aXBcbiAgICAgICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBBbGxvdyBlbnRlciBhbnkgaW50ZXJuYWwgZXh0ZW5zaW9uIHRvb2x0aXBcbiAgICAgICAgICAgIGFsbG93X2VudGVyX2FueV9pbnRlcm5hbF9leHRlbnNpb246IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3RfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0NFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIHRvb2x0aXBcbiAgICAgICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X0V4dGVuc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfRXh0ZW5zaW9uVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIEF1ZGlvIG1lc3NhZ2UgdG9vbHRpcFxuICAgICAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfY29udGVudDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9yZWMxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQXVkaW9NZXNzYWdlSWRUb29sdGlwX3JlYzIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BdWRpb01lc3NhZ2VJZFRvb2x0aXBfcmVjM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X0F1ZGlvTWVzc2FnZUlkVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlncyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgb2JqZWN0XG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVGYWxsYmFjayhjb25maWdzKSB7XG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0gY29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aGVuIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGlmICghY29uZmlnKSByZXR1cm4gJyc7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZy5saXN0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiwgbGlzdDMsIGV0Yy4pXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3ROYW1lID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmIChjb25maWdbbGlzdE5hbWVdICYmIGNvbmZpZ1tsaXN0TmFtZV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgPSB0aGlzLmFkZExpc3RUb0NvbnRlbnQoaHRtbCwgY29uZmlnW2xpc3ROYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRXYXJuaW5nU2VjdGlvbihjb25maWcud2FybmluZyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkIGxpc3QgaXRlbXMgdG8gdG9vbHRpcCBjb250ZW50IChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sIC0gQ3VycmVudCBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gbGlzdCAtIExpc3Qgb2YgaXRlbXMgdG8gYWRkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBVcGRhdGVkIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBhZGRMaXN0VG9Db250ZW50KGh0bWwsIGxpc3QpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdCkgJiYgbGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzXG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGxpc3QpLmZvckVhY2goKFt0ZXJtLCBkZWZpbml0aW9uXSkgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHdhcm5pbmcgc2VjdGlvbiBmb3IgdG9vbHRpcCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gd2FybmluZyAtIFdhcm5pbmcgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHdhcm5pbmcgc2VjdGlvblxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFdhcm5pbmdTZWN0aW9uKHdhcm5pbmcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgaWYgKHdhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gYDtcbiAgICAgICAgICAgIGh0bWwgKz0gd2FybmluZy5oZWFkZXI7XG4gICAgICAgICAgICBodG1sICs9IGA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gd2FybmluZy50ZXh0O1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3BlY2lmaWMgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgdG8gdXBkYXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R8c3RyaW5nfSB0b29sdGlwRGF0YSAtIE5ldyB0b29sdGlwIGRhdGEgb3IgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIHVwZGF0ZVRvb2x0aXAoZmllbGROYW1lLCB0b29sdGlwRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci51cGRhdGUoZmllbGROYW1lLCB0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUgZm9yIHVwZGF0aW5nIHRvb2x0aXAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbHRpcCBmb3IgZmllbGQgJyR7ZmllbGROYW1lfSc6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgSVZSIG1lbnUgdG9vbHRpcHNcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IElWUiBtZW51IHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gaXZybWVudS1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gSXZyTWVudVRvb2x0aXBNYW5hZ2VyO1xufVxuIl19