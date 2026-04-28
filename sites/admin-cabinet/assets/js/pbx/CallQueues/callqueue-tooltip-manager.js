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
 * CallQueueTooltipManager - Manages tooltips for Call Queue form fields
 *
 * This class provides tooltip configurations for call queue settings fields,
 * helping users understand queue behavior parameters and their implications.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * Features:
 * - Tooltip configurations for queue settings
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and recommendations
 *
 * @class CallQueueTooltipManager
 */
var CallQueueTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function CallQueueTooltipManager() {
    _classCallCheck(this, CallQueueTooltipManager);

    throw new Error('CallQueueTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the call queue form
   * Uses the unified TooltipBuilder for consistent behavior
   *
   * @static
   */


  _createClass(CallQueueTooltipManager, null, [{
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
      } catch (error) {// Failed to initialize call queue tooltips
      }
    }
    /**
     * Get all tooltip configurations for call queue fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        // Caller ID prefix tooltip
        callerid_prefix: {
          header: globalTranslate.cq_CallerIDPrefixTooltip_header,
          description: globalTranslate.cq_CallerIDPrefixTooltip_desc,
          list: [{
            term: globalTranslate.cq_CallerIDPrefixTooltip_purposes,
            definition: null
          }, globalTranslate.cq_CallerIDPrefixTooltip_purpose_identify, globalTranslate.cq_CallerIDPrefixTooltip_purpose_priority, globalTranslate.cq_CallerIDPrefixTooltip_purpose_stats],
          list2: [{
            term: globalTranslate.cq_CallerIDPrefixTooltip_how_it_works,
            definition: null
          }, globalTranslate.cq_CallerIDPrefixTooltip_example],
          list3: [{
            term: globalTranslate.cq_CallerIDPrefixTooltip_examples_header,
            definition: null
          }, globalTranslate.cq_CallerIDPrefixTooltip_examples],
          note: globalTranslate.cq_CallerIDPrefixTooltip_note
        },
        // Seconds to ring each member tooltip
        seconds_to_ring_each_member: {
          header: globalTranslate.cq_SecondsToRingEachMemberTooltip_header,
          description: globalTranslate.cq_SecondsToRingEachMemberTooltip_desc,
          list: [{
            term: globalTranslate.cq_SecondsToRingEachMemberTooltip_strategies_header,
            definition: null
          }, "".concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_linear, " - ").concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_desc), "".concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall, " - ").concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall_desc), "".concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_progressive, " - ").concat(globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_progressive_desc)],
          list2: [{
            term: globalTranslate.cq_SecondsToRingEachMemberTooltip_recommendations_header,
            definition: null
          }, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_short, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_medium, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_long],
          note: globalTranslate.cq_SecondsToRingEachMemberTooltip_note
        },
        // Seconds for wrapup tooltip
        seconds_for_wrapup: {
          header: globalTranslate.cq_SecondsForWrapupTooltip_header,
          description: globalTranslate.cq_SecondsForWrapupTooltip_desc,
          list: [{
            term: globalTranslate.cq_SecondsForWrapupTooltip_purposes_header,
            definition: null
          }, globalTranslate.cq_SecondsForWrapupTooltip_purpose_notes, globalTranslate.cq_SecondsForWrapupTooltip_purpose_crm, globalTranslate.cq_SecondsForWrapupTooltip_purpose_prepare, globalTranslate.cq_SecondsForWrapupTooltip_purpose_break],
          list2: [{
            term: globalTranslate.cq_SecondsForWrapupTooltip_recommendations_header,
            definition: null
          }, globalTranslate.cq_SecondsForWrapupTooltip_rec_none, globalTranslate.cq_SecondsForWrapupTooltip_rec_short, globalTranslate.cq_SecondsForWrapupTooltip_rec_medium, globalTranslate.cq_SecondsForWrapupTooltip_rec_long],
          note: globalTranslate.cq_SecondsForWrapupTooltip_note
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
     * Destroy all call queue tooltips
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
        console.error('Failed to destroy call queue tooltips:', error);
      }
    }
  }]);

  return CallQueueTooltipManager;
}(); // Export for use in callqueue-modify.js


if (typeof module !== 'undefined' && module.exports) {
  module.exports = CallQueueTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImluaXRpYWxpemVGYWxsYmFjayIsImVycm9yIiwiY2FsbGVyaWRfcHJlZml4IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlcyIsImRlZmluaXRpb24iLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5IiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHMiLCJsaXN0MiIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZSIsImxpc3QzIiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlcyIsIm5vdGUiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfbm90ZSIsInNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9zdHJhdGVnaWVzX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbCIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX3Byb2dyZXNzaXZlIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcl9wcm9ncmVzc2l2ZV9kZXNjIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0IiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0iLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZSIsInNlY29uZHNfZm9yX3dyYXB1cCIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2Rlc2MiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0iLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0IiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZSIsImNvbmZpZ3MiLCIkIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsIiRpY29uIiwiZmllbGROYW1lIiwiZGF0YSIsInRvb2x0aXBEYXRhIiwiY29udGVudCIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJwb3B1cCIsImh0bWwiLCJkZWxheSIsInNob3ciLCJoaWRlIiwiY29uZmlnIiwiYWRkTGlzdFRvQ29udGVudCIsImkiLCJsaXN0TmFtZSIsImxlbmd0aCIsIndhcm5pbmciLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsIml0ZW0iLCJPYmplY3QiLCJlbnRyaWVzIiwidGV4dCIsInVwZGF0ZSIsImNvbnNvbGUiLCJkZXN0cm95IiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLHVCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSxxQ0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLHNFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNB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Q3dGLE1BQWYsQ0FBc0J4QixTQUF0QixFQUFpQ0UsV0FBakM7QUFDSCxTQUZELE1BRU87QUFDSHVCLFVBQUFBLE9BQU8sQ0FBQ2xGLEtBQVIsQ0FBYyxzREFBZDtBQUNIO0FBQ0osT0FORCxDQU1FLE9BQU9BLEtBQVAsRUFBYztBQUNaa0YsUUFBQUEsT0FBTyxDQUFDbEYsS0FBUiwrQ0FBcUR5RCxTQUFyRCxTQUFvRXpELEtBQXBFO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLG1CQUE4QztBQUFBLFVBQS9CTCxRQUErQix1RUFBcEIsa0JBQW9COztBQUMxQyxVQUFJO0FBQ0EsWUFBSSxPQUFPRixjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQSxVQUFBQSxjQUFjLENBQUMwRixPQUFmLENBQXVCeEYsUUFBdkI7QUFDSCxTQUZELE1BRU87QUFDSHlELFVBQUFBLENBQUMsQ0FBQ3pELFFBQUQsQ0FBRCxDQUFZbUUsS0FBWixDQUFrQixTQUFsQjtBQUNIO0FBQ0osT0FORCxDQU1FLE9BQU85RCxLQUFQLEVBQWM7QUFDWmtGLFFBQUFBLE9BQU8sQ0FBQ2xGLEtBQVIsQ0FBYyx3Q0FBZCxFQUF3REEsS0FBeEQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBT29GLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQmhHLHVCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBDYWxsUXVldWVUb29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIENhbGwgUXVldWUgZm9ybSBmaWVsZHNcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGNhbGwgcXVldWUgc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIHF1ZXVlIGJlaGF2aW9yIHBhcmFtZXRlcnMgYW5kIHRoZWlyIGltcGxpY2F0aW9ucy5cbiAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgc3lzdGVtIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICpcbiAqIEZlYXR1cmVzOlxuICogLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBxdWV1ZSBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzIGFuZCByZWNvbW1lbmRhdGlvbnNcbiAqXG4gKiBAY2xhc3MgQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgQ2FsbFF1ZXVlVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYWxsUXVldWVUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIHRvb2x0aXBzIGZvciB0aGUgY2FsbCBxdWV1ZSBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpO1xuXG4gICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBGYWlsZWQgdG8gaW5pdGlhbGl6ZSBjYWxsIHF1ZXVlIHRvb2x0aXBzXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGNhbGwgcXVldWUgZmllbGRzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvLyBDYWxsZXIgSUQgcHJlZml4IHRvb2x0aXBcbiAgICAgICAgICAgIGNhbGxlcmlkX3ByZWZpeDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9pZGVudGlmeSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3ByaW9yaXR5LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2Vfc3RhdHNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2V4YW1wbGVzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFNlY29uZHMgdG8gcmluZyBlYWNoIG1lbWJlciB0b29sdGlwXG4gICAgICAgICAgICBzZWNvbmRzX3RvX3JpbmdfZWFjaF9tZW1iZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3N0cmF0ZWdpZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcn0gLSAke2dsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2N9YCxcbiAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsfSAtICR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsX2Rlc2N9YCxcbiAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXJfcHJvZ3Jlc3NpdmV9IC0gJHtnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX2xpbmVhcl9wcm9ncmVzc2l2ZV9kZXNjfWBcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfc2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX21lZGl1bSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbG9uZ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBTZWNvbmRzIGZvciB3cmFwdXAgdG9vbHRpcFxuICAgICAgICAgICAgc2Vjb25kc19mb3Jfd3JhcHVwOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3Nlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX25vdGVzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9jcm0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX3ByZXBhcmUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2JyZWFrXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19ub25lLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX21lZGl1bSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19sb25nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIG9iamVjdFxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2soY29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IGNvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBsaXN0IGl0ZW1zIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWcubGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZ1tsaXN0TmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBsaXN0IGl0ZW1zIHRvIHRvb2x0aXAgY29udGVudCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHdhcm5pbmcgLSBXYXJuaW5nIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB3YXJuaW5nIHNlY3Rpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRXYXJuaW5nU2VjdGlvbih3YXJuaW5nKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgIGlmICh3YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+IGA7XG4gICAgICAgICAgICBodG1sICs9IHdhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IHdhcm5pbmcudGV4dDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudCBkeW5hbWljYWxseVxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVUb29sdGlwKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlIGZvciB1cGRhdGluZyB0b29sdGlwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGNhbGwgcXVldWUgdG9vbHRpcHNcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGNhbGwgcXVldWUgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBjYWxscXVldWUtbW9kaWZ5LmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IENhbGxRdWV1ZVRvb2x0aXBNYW5hZ2VyO1xufVxuIl19