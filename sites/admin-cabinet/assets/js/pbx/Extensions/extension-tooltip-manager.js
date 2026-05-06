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
          this.initializeFallback(tooltipConfigs);
        }
      } catch (error) {// Failed to initialize extension tooltips
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
        // Accept multiple calls tooltip (3CX-style call waiting)
        sip_acceptMultipleCalls: {
          header: globalTranslate.ex_AcceptMultipleCallsTooltip_header,
          description: globalTranslate.ex_AcceptMultipleCallsTooltip_desc,
          list: [{
            term: globalTranslate.ex_AcceptMultipleCallsTooltip_off,
            definition: globalTranslate.ex_AcceptMultipleCallsTooltip_off_desc
          }, {
            term: globalTranslate.ex_AcceptMultipleCallsTooltip_on,
            definition: globalTranslate.ex_AcceptMultipleCallsTooltip_on_desc
          }],
          warning: {
            header: globalTranslate.ex_AcceptMultipleCallsTooltip_warning_header,
            text: globalTranslate.ex_AcceptMultipleCallsTooltip_warning
          },
          note: globalTranslate.ex_AcceptMultipleCallsTooltip_note
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
            term: globalTranslate.ex_SipManualattributesTooltip_format,
            definition: globalTranslate.ex_SipManualattributesTooltip_format_desc
          }],
          list2: [{
            term: globalTranslate.ex_SipManualattributesTooltip_examples_header,
            definition: null
          }],
          examples: ['[endpoint]', 'device_state_busy_at=2', 'max_audio_streams=1', 'direct_media=no', 'force_rport=yes', 'rewrite_contact=yes', 'rtp_timeout=180', '', '[aor]', 'max_contacts=3', 'qualify_frequency=30', '', '[auth]', 'auth_type=userpass'],
          list3: [{
            term: globalTranslate.ex_SipManualattributesTooltip_common_params,
            definition: null
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_device_state_busy_at_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_max_audio_streams_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_max_contacts_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_direct_media,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_direct_media_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_force_rport,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_force_rport_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rewrite_contact,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rewrite_contact_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_qualify_frequency,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_qualify_frequency_desc
          }],
          note: globalTranslate.ex_SipManualattributesTooltip_note,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImluaXRpYWxpemVGYWxsYmFjayIsImVycm9yIiwibW9iaWxlX2RpYWxzdHJpbmciLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2hlYWRlciIsImRlZmluaXRpb24iLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXRfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXJfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkX2Rlc2MiLCJsaXN0MiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMiLCJzcGxpdCIsIm5vdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9ub3RlIiwic2lwX2R0bWZtb2RlIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2hlYWRlciIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9yZmM0NzMzX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8iLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm9fZGVzYyIsInNpcF90cmFuc3BvcnQiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfZGVzYyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3AiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3Rsc19kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwibGlzdDMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5Iiwic2lwX2FjY2VwdE11bHRpcGxlQ2FsbHMiLCJleF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9oZWFkZXIiLCJleF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9kZXNjIiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb2ZmIiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb2ZmX2Rlc2MiLCJleF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9vbiIsImV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX29uX2Rlc2MiLCJ3YXJuaW5nIiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfd2FybmluZyIsImV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX25vdGUiLCJzaXBfbmV0d29ya2ZpbHRlcmlkIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nIiwic2lwX21hbnVhbGF0dHJpYnV0ZXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0cyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWEiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYV9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9mb3JjZV9ycG9ydCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmV3cml0ZV9jb250YWN0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3RfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV9mcmVxdWVuY3kiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9ub3RlIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIiwiY29uZmlncyIsIiQiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwidG9vbHRpcERhdGEiLCJjb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInBvcHVwIiwiaHRtbCIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJjb25maWciLCJhZGRMaXN0VG9Db250ZW50IiwiaSIsImxpc3ROYW1lIiwibGVuZ3RoIiwiYnVpbGRXYXJuaW5nU2VjdGlvbiIsImJ1aWxkQ29kZUV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJBcnJheSIsImlzQXJyYXkiLCJmb3JFYWNoIiwiaXRlbSIsIk9iamVjdCIsImVudHJpZXMiLCJsaW5lIiwidHJpbSIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwicGFyYW0iLCJ2YWx1ZSIsInVwZGF0ZSIsImNvbnNvbGUiLCJkZXN0cm95IiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLHVCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSxxQ0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLHNFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7V0FDSSxzQkFBb0I7QUFDaEIsVUFBSTtBQUNBLFlBQU1DLGNBQWMsR0FBRyxLQUFLQyx3QkFBTCxFQUF2QixD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QixFQUFnQ0UsV0FBaEMsRUFBNkM7QUFDekMsVUFBSTtBQUNBLFlBQUksT0FBTzlHLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQzJJLE1BQWYsQ0FBc0IvQixTQUF0QixFQUFpQ0UsV0FBakM7QUFDSCxTQUZELE1BRU87QUFDSDhCLFVBQUFBLE9BQU8sQ0FBQ3JJLEtBQVIsQ0FBYyxzREFBZDtBQUNIO0FBQ0osT0FORCxDQU1FLE9BQU9BLEtBQVAsRUFBYztBQUNacUksUUFBQUEsT0FBTyxDQUFDckksS0FBUiwrQ0FBcURxRyxTQUFyRCxTQUFvRXJHLEtBQXBFO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLG1CQUE4QztBQUFBLFVBQS9CTCxRQUErQix1RUFBcEIsa0JBQW9COztBQUMxQyxVQUFJO0FBQ0EsWUFBSSxPQUFPRixjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQSxVQUFBQSxjQUFjLENBQUM2SSxPQUFmLENBQXVCM0ksUUFBdkI7QUFDSCxTQUZELE1BRU87QUFDSHFHLFVBQUFBLENBQUMsQ0FBQ3JHLFFBQUQsQ0FBRCxDQUFZK0csS0FBWixDQUFrQixTQUFsQjtBQUNIO0FBQ0osT0FORCxDQU1FLE9BQU8xRyxLQUFQLEVBQWM7QUFDWnFJLFFBQUFBLE9BQU8sQ0FBQ3JJLEtBQVIsQ0FBYyx1Q0FBZCxFQUF1REEsS0FBdkQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBT3VJLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQm5KLHVCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEV4dGVuc2lvbiBmb3JtIGZpZWxkc1xuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGV4dGVuc2lvbiBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgYWR2YW5jZWQgU0lQIHNldHRpbmdzIGFuZCB0aGVpciBpbXBsaWNhdGlvbnMuXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIFNJUCBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzIGFuZCB3YXJuaW5nc1xuICogXG4gKiBAY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGluaXRpYWxpemUgZXh0ZW5zaW9uIHRvb2x0aXBzXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBleHRlbnNpb24gZmllbGRzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gTW9iaWxlIGRpYWwgc3RyaW5nIHRvb2x0aXBcbiAgICAgICAgICAgIG1vYmlsZV9kaWFsc3RyaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMgPyBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQIERUTUYgbW9kZSB0b29sdGlwXG4gICAgICAgICAgICBzaXBfZHRtZm1vZGU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUCB0cmFuc3BvcnQgdG9vbHRpcFxuICAgICAgICAgICAgc2lwX3RyYW5zcG9ydDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBY2NlcHQgbXVsdGlwbGUgY2FsbHMgdG9vbHRpcCAoM0NYLXN0eWxlIGNhbGwgd2FpdGluZylcbiAgICAgICAgICAgIHNpcF9hY2NlcHRNdWx0aXBsZUNhbGxzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9vZmYsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb2ZmX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX29uLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX29uX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB0b29sdGlwXG4gICAgICAgICAgICBzaXBfbmV0d29ya2ZpbHRlcmlkOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCB3aXRoIGNvZGUgZXhhbXBsZXNcbiAgICAgICAgICAgIHNpcF9tYW51YWxhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ1tlbmRwb2ludF0nLFxuICAgICAgICAgICAgICAgICAgICAnZGV2aWNlX3N0YXRlX2J1c3lfYXQ9MicsXG4gICAgICAgICAgICAgICAgICAgICdtYXhfYXVkaW9fc3RyZWFtcz0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgICAgICdmb3JjZV9ycG9ydD15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncmV3cml0ZV9jb250YWN0PXllcycsXG4gICAgICAgICAgICAgICAgICAgICdydHBfdGltZW91dD0xODAnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgJ21heF9jb250YWN0cz0zJyxcbiAgICAgICAgICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcXVlbmN5PTMwJyxcbiAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICdbYXV0aF0nLFxuICAgICAgICAgICAgICAgICAgICAnYXV0aF90eXBlPXVzZXJwYXNzJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYV9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3RfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX25vdGUsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWdzIC0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBvYmplY3RcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZUZhbGxiYWNrKGNvbmZpZ3MpIHtcbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSBjb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aGVuIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZy5saXN0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLCBsaXN0MywgZXRjLilcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdE5hbWUgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0TmFtZV0gJiYgY29uZmlnW2xpc3ROYW1lXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWdbbGlzdE5hbWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRDb2RlRXhhbXBsZXMoY29uZmlnLmV4YW1wbGVzLCBjb25maWcuZXhhbXBsZXNIZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGxpc3QgaXRlbXMgdG8gdG9vbHRpcCBjb250ZW50IChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB3YXJuaW5nIC0gV2FybmluZyBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3Igd2FybmluZyBzZWN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkV2FybmluZ1NlY3Rpb24od2FybmluZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICBpZiAod2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgaHRtbCArPSB3YXJuaW5nLmhlYWRlcjtcbiAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSB3YXJuaW5nLnRleHQ7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlIGV4YW1wbGVzIHNlY3Rpb24gKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGV4YW1wbGVzIC0gQXJyYXkgb2YgY29kZSBleGFtcGxlIGxpbmVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIE9wdGlvbmFsIGhlYWRlciBmb3IgZXhhbXBsZXMgc2VjdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIGNvZGUgZXhhbXBsZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRDb2RlRXhhbXBsZXMoZXhhbXBsZXMsIGhlYWRlcikge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07IGxpbmUtaGVpZ2h0OiAxLjRlbTtcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBleGFtcGxlcyB3aXRoIHN5bnRheCBoaWdobGlnaHRpbmcgZm9yIHNlY3Rpb25zXG4gICAgICAgIGV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnWycpICYmIGxpbmUudHJpbSgpLmVuZHNXaXRoKCddJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzAwODRiNDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsaW5lLmluY2x1ZGVzKCc9JykpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgIGNvbnN0IFtwYXJhbSwgdmFsdWVdID0gbGluZS5zcGxpdCgnPScsIDIpO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxcbjxzcGFuIHN0eWxlPVwiY29sb3I6ICM3YTNlOWQ7XCI+JHtwYXJhbX08L3NwYW4+PTxzcGFuIHN0eWxlPVwiY29sb3I6ICNjZjRhNGM7XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVndWxhciBsaW5lXG4gICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lID8gYFxcbiR7bGluZX1gIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3BlY2lmaWMgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVUb29sdGlwKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlIGZvciB1cGRhdGluZyB0b29sdGlwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGV4dGVuc2lvbiB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGV4dGVuc2lvbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXI7XG59Il19