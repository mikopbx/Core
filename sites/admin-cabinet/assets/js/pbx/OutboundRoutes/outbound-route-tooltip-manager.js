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
 * OutboundRouteTooltipManager - Manages tooltips for Outbound Route form fields
 *
 * This class provides tooltip configurations for outbound route settings fields,
 * helping users understand routing patterns, number manipulation, and provider selection.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * Features:
 * - Tooltip configurations for routing patterns
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples, warnings and limitations
 *
 * @class OutboundRouteTooltipManager
 */
var OutboundRouteTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function OutboundRouteTooltipManager() {
    _classCallCheck(this, OutboundRouteTooltipManager);

    throw new Error('OutboundRouteTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the outbound route form
   * Uses the unified TooltipBuilder for consistent behavior
   *
   * @static
   */


  _createClass(OutboundRouteTooltipManager, null, [{
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
      } catch (error) {// Failed to initialize outbound route tooltips
      }
    }
    /**
     * Get all tooltip configurations for outbound route fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        // Number begins with pattern tooltip
        numberbeginswith: {
          header: globalTranslate.or_numberbeginswith_tooltip_header,
          description: globalTranslate.or_numberbeginswith_tooltip_desc,
          list: [{
            term: globalTranslate.or_numberbeginswith_tooltip_patterns_header,
            definition: null
          }, globalTranslate.or_numberbeginswith_tooltip_pattern1, globalTranslate.or_numberbeginswith_tooltip_pattern2, globalTranslate.or_numberbeginswith_tooltip_pattern3, globalTranslate.or_numberbeginswith_tooltip_pattern4, globalTranslate.or_numberbeginswith_tooltip_pattern5, globalTranslate.or_numberbeginswith_tooltip_pattern6, globalTranslate.or_numberbeginswith_tooltip_pattern7],
          list2: [{
            term: globalTranslate.or_numberbeginswith_tooltip_advanced_header,
            definition: null
          }, globalTranslate.or_numberbeginswith_tooltip_advanced1, globalTranslate.or_numberbeginswith_tooltip_advanced2, globalTranslate.or_numberbeginswith_tooltip_advanced3],
          list3: [{
            term: globalTranslate.or_numberbeginswith_tooltip_limitations_header,
            definition: null
          }, globalTranslate.or_numberbeginswith_tooltip_limitation1, globalTranslate.or_numberbeginswith_tooltip_limitation2, globalTranslate.or_numberbeginswith_tooltip_limitation3],
          warning: {
            text: globalTranslate.or_numberbeginswith_tooltip_warning
          },
          note: globalTranslate.or_numberbeginswith_tooltip_note
        },
        // Rest numbers tooltip
        restnumbers: {
          header: globalTranslate.or_restnumbers_tooltip_header,
          description: globalTranslate.or_restnumbers_tooltip_desc,
          list: [{
            term: globalTranslate.or_restnumbers_tooltip_values_header,
            definition: null
          }, globalTranslate.or_restnumbers_tooltip_value1, globalTranslate.or_restnumbers_tooltip_value2, globalTranslate.or_restnumbers_tooltip_value3],
          list2: [{
            term: globalTranslate.or_restnumbers_tooltip_examples_header,
            definition: null
          }, globalTranslate.or_restnumbers_tooltip_example1, globalTranslate.or_restnumbers_tooltip_example2, globalTranslate.or_restnumbers_tooltip_example3, globalTranslate.or_restnumbers_tooltip_example4, globalTranslate.or_restnumbers_tooltip_example5, globalTranslate.or_restnumbers_tooltip_example6],
          list3: [{
            term: globalTranslate.or_restnumbers_tooltip_limitations_header,
            definition: null
          }, globalTranslate.or_restnumbers_tooltip_limitation1, globalTranslate.or_restnumbers_tooltip_limitation2, globalTranslate.or_restnumbers_tooltip_limitation3],
          note: globalTranslate.or_restnumbers_tooltip_note
        },
        // Trim from begin tooltip
        trimfrombegin: {
          header: globalTranslate.or_trimfrombegin_tooltip_header,
          description: globalTranslate.or_trimfrombegin_tooltip_desc,
          list: [{
            term: globalTranslate.or_trimfrombegin_tooltip_why_header,
            definition: null
          }, globalTranslate.or_trimfrombegin_tooltip_why1, globalTranslate.or_trimfrombegin_tooltip_why2, globalTranslate.or_trimfrombegin_tooltip_why3],
          list2: [{
            term: globalTranslate.or_trimfrombegin_tooltip_examples_header,
            definition: null
          }, globalTranslate.or_trimfrombegin_tooltip_example1, globalTranslate.or_trimfrombegin_tooltip_example2, globalTranslate.or_trimfrombegin_tooltip_example3, globalTranslate.or_trimfrombegin_tooltip_example4],
          list3: [{
            term: globalTranslate.or_trimfrombegin_tooltip_limitation_header,
            definition: null
          }, globalTranslate.or_trimfrombegin_tooltip_limitation1, globalTranslate.or_trimfrombegin_tooltip_limitation2],
          note: globalTranslate.or_trimfrombegin_tooltip_note
        },
        // Prepend tooltip
        prepend: {
          header: globalTranslate.or_prepend_tooltip_header,
          description: globalTranslate.or_prepend_tooltip_desc,
          list: [{
            term: globalTranslate.or_prepend_tooltip_usage_header,
            definition: null
          }, globalTranslate.or_prepend_tooltip_usage1, globalTranslate.or_prepend_tooltip_usage2, globalTranslate.or_prepend_tooltip_usage3],
          list2: [{
            term: globalTranslate.or_prepend_tooltip_examples_header,
            definition: null
          }, globalTranslate.or_prepend_tooltip_example1, globalTranslate.or_prepend_tooltip_example2, globalTranslate.or_prepend_tooltip_example3],
          list3: [{
            term: globalTranslate.or_prepend_tooltip_limitations_header,
            definition: null
          }, globalTranslate.or_prepend_tooltip_limitation1, globalTranslate.or_prepend_tooltip_limitation2, globalTranslate.or_prepend_tooltip_limitation3],
          note: globalTranslate.or_prepend_tooltip_note
        },
        // Provider tooltip
        provider: {
          header: globalTranslate.or_provider_tooltip_header,
          description: globalTranslate.or_provider_tooltip_desc,
          list: [{
            term: globalTranslate.or_provider_tooltip_important_header,
            definition: null
          }, globalTranslate.or_provider_tooltip_important1, globalTranslate.or_provider_tooltip_important2, globalTranslate.or_provider_tooltip_important3],
          list2: [{
            term: globalTranslate.or_provider_tooltip_priority_header,
            definition: null
          }, globalTranslate.or_provider_tooltip_priority1, globalTranslate.or_provider_tooltip_priority2, globalTranslate.or_provider_tooltip_priority3],
          note: globalTranslate.or_provider_tooltip_note
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
     * Destroy all outbound route tooltips
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
        console.error('Failed to destroy outbound route tooltips:', error);
      }
    }
  }]);

  return OutboundRouteTooltipManager;
}(); // Export for use in outbound-route-modify.js


if (typeof module !== 'undefined' && module.exports) {
  module.exports = OutboundRouteTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRib3VuZFJvdXRlcy9vdXRib3VuZC1yb3V0ZS10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiT3V0Ym91bmRSb3V0ZVRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJ0b29sdGlwQ29uZmlncyIsImdldFRvb2x0aXBDb25maWd1cmF0aW9ucyIsIlRvb2x0aXBCdWlsZGVyIiwiaW5pdGlhbGl6ZSIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsIm51bWJlcmJlZ2luc3dpdGgiLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3BhdHRlcm5zX2hlYWRlciIsImRlZmluaXRpb24iLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjciLCJsaXN0MiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZF9oZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQxIiwib3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMiIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDMiLCJsaXN0MyIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjEiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjIiLCJvcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJ3YXJuaW5nIiwidGV4dCIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF93YXJuaW5nIiwibm90ZSIsIm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9ub3RlIiwicmVzdG51bWJlcnMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZGVzYyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUxIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMyIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMSIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUzIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNCIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTUiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU2Iiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24xIiwib3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uMiIsIm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjMiLCJvcl9yZXN0bnVtYmVyc190b29sdGlwX25vdGUiLCJ0cmltZnJvbWJlZ2luIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2hlYWRlciIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF9kZXNjIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSIsIm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTMiLCJvcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0Iiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGUiLCJwcmVwZW5kIiwib3JfcHJlcGVuZF90b29sdGlwX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF9kZXNjIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlX2hlYWRlciIsIm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UyIiwib3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMyIsIm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTEiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTIiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfZXhhbXBsZTMiLCJvcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbnNfaGVhZGVyIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24xIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24yIiwib3JfcHJlcGVuZF90b29sdGlwX2xpbWl0YXRpb24zIiwib3JfcHJlcGVuZF90b29sdGlwX25vdGUiLCJwcm92aWRlciIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfaGVhZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9kZXNjIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnRfaGVhZGVyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQxIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9pbXBvcnRhbnQzIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eV9oZWFkZXIiLCJvcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5MSIsIm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkyIiwib3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTMiLCJvcl9wcm92aWRlcl90b29sdGlwX25vdGUiLCJjb25maWdzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNvbmZpZyIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJsZW5ndGgiLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsIml0ZW0iLCJPYmplY3QiLCJlbnRyaWVzIiwidXBkYXRlIiwiY29uc29sZSIsImRlc3Ryb3kiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7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LE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjNJLDJCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBPdXRib3VuZFJvdXRlVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBPdXRib3VuZCBSb3V0ZSBmb3JtIGZpZWxkc1xuICpcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3Igb3V0Ym91bmQgcm91dGUgc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIHJvdXRpbmcgcGF0dGVybnMsIG51bWJlciBtYW5pcHVsYXRpb24sIGFuZCBwcm92aWRlciBzZWxlY3Rpb24uXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqXG4gKiBGZWF0dXJlczpcbiAqIC0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3Igcm91dGluZyBwYXR0ZXJuc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzLCB3YXJuaW5ncyBhbmQgbGltaXRhdGlvbnNcbiAqXG4gKiBAY2xhc3MgT3V0Ym91bmRSb3V0ZVRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIE91dGJvdW5kUm91dGVUb29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ091dGJvdW5kUm91dGVUb29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIHRvb2x0aXBzIGZvciB0aGUgb3V0Ym91bmQgcm91dGUgZm9ybVxuICAgICAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcblxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGluaXRpYWxpemUgb3V0Ym91bmQgcm91dGUgdG9vbHRpcHNcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3Igb3V0Ym91bmQgcm91dGUgZmllbGRzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvLyBOdW1iZXIgYmVnaW5zIHdpdGggcGF0dGVybiB0b29sdGlwXG4gICAgICAgICAgICBudW1iZXJiZWdpbnN3aXRoOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9wYXR0ZXJuc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjUsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjYsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfcGF0dGVybjdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2FkdmFuY2VkMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9hZHZhbmNlZDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfYWR2YW5jZWQzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX251bWJlcmJlZ2luc3dpdGhfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUub3JfbnVtYmVyYmVnaW5zd2l0aF90b29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9udW1iZXJiZWdpbnN3aXRoX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gUmVzdCBudW1iZXJzIHRvb2x0aXBcbiAgICAgICAgICAgIHJlc3RudW1iZXJzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF92YWx1ZTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX3ZhbHVlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfdmFsdWUzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2V4YW1wbGU0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9leGFtcGxlNSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfZXhhbXBsZTZcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbGltaXRhdGlvbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9yZXN0bnVtYmVyc190b29sdGlwX2xpbWl0YXRpb24yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcmVzdG51bWJlcnNfdG9vbHRpcF9saW1pdGF0aW9uM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Jlc3RudW1iZXJzX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gVHJpbSBmcm9tIGJlZ2luIHRvb2x0aXBcbiAgICAgICAgICAgIHRyaW1mcm9tYmVnaW46IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfd2h5MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3RyaW1mcm9tYmVnaW5fdG9vbHRpcF93aHkyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX3doeTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl90cmltZnJvbWJlZ2luX3Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGUzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2V4YW1wbGU0XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX2xpbWl0YXRpb24yXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUub3JfdHJpbWZyb21iZWdpbl90b29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFByZXBlbmQgdG9vbHRpcFxuICAgICAgICAgICAgcHJlcGVuZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX3VzYWdlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF91c2FnZTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfdXNhZ2UzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUub3JfcHJlcGVuZF90b29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9leGFtcGxlM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLm9yX3ByZXBlbmRfdG9vbHRpcF9saW1pdGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbGltaXRhdGlvbjNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcmVwZW5kX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gUHJvdmlkZXIgdG9vbHRpcFxuICAgICAgICAgICAgcHJvdmlkZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX2ltcG9ydGFudDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfcHJpb3JpdHkxLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUub3JfcHJvdmlkZXJfdG9vbHRpcF9wcmlvcml0eTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5vcl9wcm92aWRlcl90b29sdGlwX3ByaW9yaXR5M1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLm9yX3Byb3ZpZGVyX3Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIG9iamVjdFxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2soY29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IGNvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBsaXN0IGl0ZW1zIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWcubGlzdCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZ1tsaXN0TmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBsaXN0IGl0ZW1zIHRvIHRvb2x0aXAgY29udGVudCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICpcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHdhcm5pbmcgLSBXYXJuaW5nIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB3YXJuaW5nIHNlY3Rpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRXYXJuaW5nU2VjdGlvbih3YXJuaW5nKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgIGlmICh3YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+IGA7XG4gICAgICAgICAgICBodG1sICs9IHdhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IHdhcm5pbmcudGV4dDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudCBkeW5hbWljYWxseVxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVUb29sdGlwKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlIGZvciB1cGRhdGluZyB0b29sdGlwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIG91dGJvdW5kIHJvdXRlIHRvb2x0aXBzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzZWxlY3Rvcj0nLmZpZWxkLWluZm8taWNvbiddIC0galF1ZXJ5IHNlbGVjdG9yIGZvciB0b29sdGlwIGljb25zXG4gICAgICovXG4gICAgc3RhdGljIGRlc3Ryb3koc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuZGVzdHJveShzZWxlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVzdHJveSBvdXRib3VuZCByb3V0ZSB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG91dGJvdW5kLXJvdXRlLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBPdXRib3VuZFJvdXRlVG9vbHRpcE1hbmFnZXI7XG59XG4iXX0=