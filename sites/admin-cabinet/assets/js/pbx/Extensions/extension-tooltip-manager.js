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
 * ExtensionTooltipManager - Manages tooltips for Extension form fields
 * 
 * This class provides tooltip configurations for extension settings fields,
 * helping users understand advanced SIP settings and their implications.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 * 
 * Features:
 * - Tooltip configurations for SIP settings
 * - Integration with unified TooltipBuilder
 * - Fallback implementation for compatibility
 * - Support for complex tooltips with examples and warnings
 * 
 * @class ExtensionTooltipManager
 */
var ExtensionTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function ExtensionTooltipManager() {
    _classCallCheck(this, ExtensionTooltipManager);

    throw new Error('ExtensionTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the extension form
   * Uses the unified TooltipBuilder for consistent behavior
   * 
   * @static
   */


  _createClass(ExtensionTooltipManager, null, [{
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
          console.warn('TooltipBuilder not available, using fallback implementation');
          this.initializeFallback(tooltipConfigs);
        }
      } catch (error) {
        console.error('Failed to initialize extension tooltips:', error);
      }
    }
    /**
     * Get all tooltip configurations for extension fields
     * 
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        // Mobile dial string tooltip
        mobile_dialstring: {
          header: globalTranslate.ex_MobileDialstringTooltip_header,
          description: globalTranslate.ex_MobileDialstringTooltip_desc,
          list: [{
            term: globalTranslate.ex_MobileDialstringTooltip_usage_header,
            definition: null
          }, {
            term: globalTranslate.ex_MobileDialstringTooltip_usage_format,
            definition: globalTranslate.ex_MobileDialstringTooltip_usage_format_desc
          }, {
            term: globalTranslate.ex_MobileDialstringTooltip_usage_provider,
            definition: globalTranslate.ex_MobileDialstringTooltip_usage_provider_desc
          }, {
            term: globalTranslate.ex_MobileDialstringTooltip_usage_forward,
            definition: globalTranslate.ex_MobileDialstringTooltip_usage_forward_desc
          }],
          list2: [{
            term: globalTranslate.ex_MobileDialstringTooltip_examples_header,
            definition: null
          }],
          examples: globalTranslate.ex_MobileDialstringTooltip_examples ? globalTranslate.ex_MobileDialstringTooltip_examples.split('|') : [],
          note: globalTranslate.ex_MobileDialstringTooltip_note
        },
        // SIP DTMF mode tooltip
        sip_dtmfmode: {
          header: globalTranslate.ex_SipDtmfmodeTooltip_header,
          description: globalTranslate.ex_SipDtmfmodeTooltip_desc,
          list: [{
            term: globalTranslate.ex_SipDtmfmodeTooltip_list_auto,
            definition: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_desc
          }, {
            term: globalTranslate.ex_SipDtmfmodeTooltip_list_inband,
            definition: globalTranslate.ex_SipDtmfmodeTooltip_list_inband_desc
          }, {
            term: globalTranslate.ex_SipDtmfmodeTooltip_list_info,
            definition: globalTranslate.ex_SipDtmfmodeTooltip_list_info_desc
          }, {
            term: globalTranslate.ex_SipDtmfmodeTooltip_list_rfc4733,
            definition: globalTranslate.ex_SipDtmfmodeTooltip_list_rfc4733_desc
          }, {
            term: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_info,
            definition: globalTranslate.ex_SipDtmfmodeTooltip_list_auto_info_desc
          }]
        },
        // SIP transport tooltip
        sip_transport: {
          header: globalTranslate.ex_SipTransportTooltip_header,
          description: globalTranslate.ex_SipTransportTooltip_desc,
          list: [{
            term: globalTranslate.ex_SipTransportTooltip_protocols_header,
            definition: null
          }, {
            term: globalTranslate.ex_SipTransportTooltip_udp_tcp,
            definition: globalTranslate.ex_SipTransportTooltip_udp_tcp_desc
          }, {
            term: globalTranslate.ex_SipTransportTooltip_udp,
            definition: globalTranslate.ex_SipTransportTooltip_udp_desc
          }, {
            term: globalTranslate.ex_SipTransportTooltip_tcp,
            definition: globalTranslate.ex_SipTransportTooltip_tcp_desc
          }, {
            term: globalTranslate.ex_SipTransportTooltip_tls,
            definition: globalTranslate.ex_SipTransportTooltip_tls_desc
          }],
          list2: [{
            term: globalTranslate.ex_SipTransportTooltip_recommendations_header,
            definition: null
          }],
          list3: [globalTranslate.ex_SipTransportTooltip_rec_compatibility]
        },
        // Network filter tooltip
        sip_networkfilterid: {
          header: globalTranslate.ex_SipNetworkfilteridTooltip_header,
          description: globalTranslate.ex_SipNetworkfilteridTooltip_desc,
          warning: {
            header: globalTranslate.ex_SipNetworkfilteridTooltip_warning_header,
            text: globalTranslate.ex_SipNetworkfilteridTooltip_warning
          }
        },
        // Manual attributes tooltip with code examples
        sip_manualattributes: {
          header: globalTranslate.ex_SipManualattributesTooltip_header,
          description: globalTranslate.ex_SipManualattributesTooltip_desc,
          list: [{
            term: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing_desc
          }],
          warning: {
            header: globalTranslate.ex_SipManualattributesTooltip_warning_header,
            text: globalTranslate.ex_SipManualattributesTooltip_warning
          }
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
      } // Add code examples if exist


      if (config.examples && config.examples.length > 0) {
        html += this.buildCodeExamples(config.examples, config.examplesHeader);
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
     * Build code examples section (fallback implementation)
     * 
     * @private
     * @static
     * @param {Array} examples - Array of code example lines
     * @param {string} header - Optional header for examples section
     * @returns {string} - HTML string for code examples
     */

  }, {
    key: "buildCodeExamples",
    value: function buildCodeExamples(examples, header) {
      var html = '';

      if (header) {
        html += "<p><strong>".concat(header, ":</strong></p>");
      }

      html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
      html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">'; // Process examples with syntax highlighting for sections

      examples.forEach(function (line, index) {
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
     * Destroy all extension tooltips
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
        console.error('Failed to destroy extension tooltips:', error);
      }
    }
  }]);

  return ExtensionTooltipManager;
}(); // Export for use in extension-modify.js


if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImNvbnNvbGUiLCJ3YXJuIiwiaW5pdGlhbGl6ZUZhbGxiYWNrIiwiZXJyb3IiLCJtb2JpbGVfZGlhbHN0cmluZyIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdF9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXIiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcl9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmRfZGVzYyIsImxpc3QyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcyIsInNwbGl0Iiwibm90ZSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX25vdGUiLCJzaXBfZHRtZm1vZGUiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mb19kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczMyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzNfZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mb19kZXNjIiwic2lwX3RyYW5zcG9ydCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RscyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHkiLCJzaXBfbmV0d29ya2ZpbHRlcmlkIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmciLCJzaXBfbWFudWFsYXR0cmlidXRlcyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtcyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXNfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHNfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZyIsImNvbmZpZ3MiLCIkIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsIiRpY29uIiwiZmllbGROYW1lIiwiZGF0YSIsInRvb2x0aXBEYXRhIiwiY29udGVudCIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJwb3B1cCIsImh0bWwiLCJkZWxheSIsInNob3ciLCJoaWRlIiwiY29uZmlnIiwiYWRkTGlzdFRvQ29udGVudCIsImkiLCJsaXN0TmFtZSIsImxlbmd0aCIsImJ1aWxkV2FybmluZ1NlY3Rpb24iLCJidWlsZENvZGVFeGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwiQXJyYXkiLCJpc0FycmF5IiwiZm9yRWFjaCIsIml0ZW0iLCJPYmplY3QiLCJlbnRyaWVzIiwibGluZSIsInRyaW0iLCJzdGFydHNXaXRoIiwiZW5kc1dpdGgiLCJpbmNsdWRlcyIsInBhcmFtIiwidmFsdWUiLCJ1cGRhdGUiLCJkZXN0cm95IiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLHVCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSxxQ0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLHNFQUFWLENB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TztBQUNIdkYsVUFBQUEsT0FBTyxDQUFDRyxLQUFSLENBQWMsc0RBQWQ7QUFDSDtBQUNKLE9BTkQsQ0FNRSxPQUFPQSxLQUFQLEVBQWM7QUFDWkgsUUFBQUEsT0FBTyxDQUFDRyxLQUFSLCtDQUFxRGtGLFNBQXJELFNBQW9FbEYsS0FBcEU7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksbUJBQThDO0FBQUEsVUFBL0JQLFFBQStCLHVFQUFwQixrQkFBb0I7O0FBQzFDLFVBQUk7QUFDQSxZQUFJLE9BQU9GLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQzJILE9BQWYsQ0FBdUJ6SCxRQUF2QjtBQUNILFNBRkQsTUFFTztBQUNIb0YsVUFBQUEsQ0FBQyxDQUFDcEYsUUFBRCxDQUFELENBQVk4RixLQUFaLENBQWtCLFNBQWxCO0FBQ0g7QUFDSixPQU5ELENBTUUsT0FBT3ZGLEtBQVAsRUFBYztBQUNaSCxRQUFBQSxPQUFPLENBQUNHLEtBQVIsQ0FBYyx1Q0FBZCxFQUF1REEsS0FBdkQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBT21ILE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQmpJLHVCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEV4dGVuc2lvbiBmb3JtIGZpZWxkc1xuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGV4dGVuc2lvbiBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgYWR2YW5jZWQgU0lQIHNldHRpbmdzIGFuZCB0aGVpciBpbXBsaWNhdGlvbnMuXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIFNJUCBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzIGFuZCB3YXJuaW5nc1xuICogXG4gKiBAY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlLCB1c2luZyBmYWxsYmFjayBpbXBsZW1lbnRhdGlvbicpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZhbGxiYWNrKHRvb2x0aXBDb25maWdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGV4dGVuc2lvbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBleHRlbnNpb24gZmllbGRzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gTW9iaWxlIGRpYWwgc3RyaW5nIHRvb2x0aXBcbiAgICAgICAgICAgIG1vYmlsZV9kaWFsc3RyaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMgPyBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQIERUTUYgbW9kZSB0b29sdGlwXG4gICAgICAgICAgICBzaXBfZHRtZm1vZGU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUCB0cmFuc3BvcnQgdG9vbHRpcFxuICAgICAgICAgICAgc2lwX3RyYW5zcG9ydDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB0b29sdGlwXG4gICAgICAgICAgICBzaXBfbmV0d29ya2ZpbHRlcmlkOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCB3aXRoIGNvZGUgZXhhbXBsZXNcbiAgICAgICAgICAgIHNpcF9tYW51YWxhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWdzIC0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBvYmplY3RcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZUZhbGxiYWNrKGNvbmZpZ3MpIHtcbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSBjb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aGVuIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZy5saXN0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLCBsaXN0MywgZXRjLilcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdE5hbWUgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0TmFtZV0gJiYgY29uZmlnW2xpc3ROYW1lXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWdbbGlzdE5hbWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRDb2RlRXhhbXBsZXMoY29uZmlnLmV4YW1wbGVzLCBjb25maWcuZXhhbXBsZXNIZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGxpc3QgaXRlbXMgdG8gdG9vbHRpcCBjb250ZW50IChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB3YXJuaW5nIC0gV2FybmluZyBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3Igd2FybmluZyBzZWN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkV2FybmluZ1NlY3Rpb24od2FybmluZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICBpZiAod2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgaHRtbCArPSB3YXJuaW5nLmhlYWRlcjtcbiAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSB3YXJuaW5nLnRleHQ7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlIGV4YW1wbGVzIHNlY3Rpb24gKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGV4YW1wbGVzIC0gQXJyYXkgb2YgY29kZSBleGFtcGxlIGxpbmVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIE9wdGlvbmFsIGhlYWRlciBmb3IgZXhhbXBsZXMgc2VjdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIGNvZGUgZXhhbXBsZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRDb2RlRXhhbXBsZXMoZXhhbXBsZXMsIGhlYWRlcikge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07IGxpbmUtaGVpZ2h0OiAxLjRlbTtcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBleGFtcGxlcyB3aXRoIHN5bnRheCBoaWdobGlnaHRpbmcgZm9yIHNlY3Rpb25zXG4gICAgICAgIGV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnWycpICYmIGxpbmUudHJpbSgpLmVuZHNXaXRoKCddJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzAwODRiNDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsaW5lLmluY2x1ZGVzKCc9JykpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgIGNvbnN0IFtwYXJhbSwgdmFsdWVdID0gbGluZS5zcGxpdCgnPScsIDIpO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxcbjxzcGFuIHN0eWxlPVwiY29sb3I6ICM3YTNlOWQ7XCI+JHtwYXJhbX08L3NwYW4+PTxzcGFuIHN0eWxlPVwiY29sb3I6ICNjZjRhNGM7XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVndWxhciBsaW5lXG4gICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lID8gYFxcbiR7bGluZX1gIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3BlY2lmaWMgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVUb29sdGlwKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlIGZvciB1cGRhdGluZyB0b29sdGlwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGV4dGVuc2lvbiB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGV4dGVuc2lvbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXI7XG59Il19