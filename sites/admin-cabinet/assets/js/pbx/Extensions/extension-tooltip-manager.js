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
          examples: ['[endpoint]', 'device_state_busy_at=2', 'max_audio_streams=1', 'direct_media=no', 'trust_id_inbound=yes', 'force_rport=yes', 'rewrite_contact=yes', 'rtp_timeout=180', 'rtp_timeout_hold=900', 'rtp_keepalive=60', '', '', '[aor]', 'max_contacts=3', 'remove_existing=yes', 'remove_unavailable=yes', 'qualify_frequency=30', 'qualify_timeout=3', '', '', '[auth]', 'auth_type=userpass'],
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
            term: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_remove_existing_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_timeout_hold_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_direct_media,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_direct_media_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_trust_id_inbound,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_trust_id_inbound_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_force_rport,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_force_rport_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rewrite_contact,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rewrite_contact_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_qualify_frequency,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_qualify_frequency_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_rtp_keepalive,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_rtp_keepalive_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_qualify_timeout,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_qualify_timeout_desc
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_remove_unavailable,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_remove_unavailable_desc
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImluaXRpYWxpemVGYWxsYmFjayIsImVycm9yIiwibW9iaWxlX2RpYWxzdHJpbmciLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2hlYWRlciIsImRlZmluaXRpb24iLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXRfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXJfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkX2Rlc2MiLCJsaXN0MiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMiLCJzcGxpdCIsIm5vdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9ub3RlIiwic2lwX2R0bWZtb2RlIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2hlYWRlciIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9yZmM0NzMzX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8iLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm9fZGVzYyIsInNpcF90cmFuc3BvcnQiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfZGVzYyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3AiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3Rsc19kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwibGlzdDMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5Iiwic2lwX25ldHdvcmtmaWx0ZXJpZCIsImV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9kZXNjIiwid2FybmluZyIsImV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nIiwic2lwX21hbnVhbGF0dHJpYnV0ZXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0cyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV9leGlzdGluZyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYSIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGlyZWN0X21lZGlhX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3Jld3JpdGVfY29udGFjdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmV3cml0ZV9jb250YWN0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeV9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfdGltZW91dCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV90aW1lb3V0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV91bmF2YWlsYWJsZSIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX3VuYXZhaWxhYmxlX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9ub3RlIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nIiwiY29uZmlncyIsIiQiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwidG9vbHRpcERhdGEiLCJjb250ZW50IiwiYnVpbGRUb29sdGlwQ29udGVudCIsInBvcHVwIiwiaHRtbCIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJjb25maWciLCJhZGRMaXN0VG9Db250ZW50IiwiaSIsImxpc3ROYW1lIiwibGVuZ3RoIiwiYnVpbGRXYXJuaW5nU2VjdGlvbiIsImJ1aWxkQ29kZUV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJBcnJheSIsImlzQXJyYXkiLCJmb3JFYWNoIiwiaXRlbSIsIk9iamVjdCIsImVudHJpZXMiLCJsaW5lIiwidHJpbSIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwicGFyYW0iLCJ2YWx1ZSIsInVwZGF0ZSIsImNvbnNvbGUiLCJkZXN0cm95IiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QSxVQUFBQSxjQUFjLENBQUMrSSxPQUFmLENBQXVCN0ksUUFBdkI7QUFDSCxTQUZELE1BRU87QUFDSHVHLFVBQUFBLENBQUMsQ0FBQ3ZHLFFBQUQsQ0FBRCxDQUFZaUgsS0FBWixDQUFrQixTQUFsQjtBQUNIO0FBQ0osT0FORCxDQU1FLE9BQU81RyxLQUFQLEVBQWM7QUFDWnVJLFFBQUFBLE9BQU8sQ0FBQ3ZJLEtBQVIsQ0FBYyx1Q0FBZCxFQUF1REEsS0FBdkQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBT3lJLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnJKLHVCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEV4dGVuc2lvbiBmb3JtIGZpZWxkc1xuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGV4dGVuc2lvbiBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgYWR2YW5jZWQgU0lQIHNldHRpbmdzIGFuZCB0aGVpciBpbXBsaWNhdGlvbnMuXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIFNJUCBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzIGFuZCB3YXJuaW5nc1xuICogXG4gKiBAY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gRmFpbGVkIHRvIGluaXRpYWxpemUgZXh0ZW5zaW9uIHRvb2x0aXBzXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBleHRlbnNpb24gZmllbGRzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gTW9iaWxlIGRpYWwgc3RyaW5nIHRvb2x0aXBcbiAgICAgICAgICAgIG1vYmlsZV9kaWFsc3RyaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMgPyBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQIERUTUYgbW9kZSB0b29sdGlwXG4gICAgICAgICAgICBzaXBfZHRtZm1vZGU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUCB0cmFuc3BvcnQgdG9vbHRpcFxuICAgICAgICAgICAgc2lwX3RyYW5zcG9ydDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB0b29sdGlwXG4gICAgICAgICAgICBzaXBfbmV0d29ya2ZpbHRlcmlkOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCB3aXRoIGNvZGUgZXhhbXBsZXNcbiAgICAgICAgICAgIHNpcF9tYW51YWxhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ1tlbmRwb2ludF0nLFxuICAgICAgICAgICAgICAgICAgICAnZGV2aWNlX3N0YXRlX2J1c3lfYXQ9MicsXG4gICAgICAgICAgICAgICAgICAgICdtYXhfYXVkaW9fc3RyZWFtcz0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgICAgICd0cnVzdF9pZF9pbmJvdW5kPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdmb3JjZV9ycG9ydD15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncmV3cml0ZV9jb250YWN0PXllcycsXG4gICAgICAgICAgICAgICAgICAgICdydHBfdGltZW91dD0xODAnLFxuICAgICAgICAgICAgICAgICAgICAncnRwX3RpbWVvdXRfaG9sZD05MDAnLFxuICAgICAgICAgICAgICAgICAgICAncnRwX2tlZXBhbGl2ZT02MCcsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgJ21heF9jb250YWN0cz0zJyxcbiAgICAgICAgICAgICAgICAgICAgJ3JlbW92ZV9leGlzdGluZz15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncmVtb3ZlX3VuYXZhaWxhYmxlPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXF1ZW5jeT0zMCcsXG4gICAgICAgICAgICAgICAgICAgICdxdWFsaWZ5X3RpbWVvdXQ9MycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thdXRoXScsXG4gICAgICAgICAgICAgICAgICAgICdhdXRoX3R5cGU9dXNlcnBhc3MnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWEsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWFfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF90cnVzdF9pZF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfdHJ1c3RfaWRfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3RfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX2tlZXBhbGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF9rZWVwYWxpdmVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIG9iamVjdFxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2soY29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IGNvbmZpZ3NbZmllbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwIChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBrZXB0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGlmICghY29uZmlnKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbGlzdCBpdGVtcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QpIHtcbiAgICAgICAgICAgIGh0bWwgPSB0aGlzLmFkZExpc3RUb0NvbnRlbnQoaHRtbCwgY29uZmlnLmxpc3QpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZ1tsaXN0TmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRXYXJuaW5nU2VjdGlvbihjb25maWcud2FybmluZyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2RlIGV4YW1wbGVzIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5idWlsZENvZGVFeGFtcGxlcyhjb25maWcuZXhhbXBsZXMsIGNvbmZpZy5leGFtcGxlc0hlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgbGlzdCBpdGVtcyB0byB0b29sdGlwIGNvbnRlbnQgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sIC0gQ3VycmVudCBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gbGlzdCAtIExpc3Qgb2YgaXRlbXMgdG8gYWRkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBVcGRhdGVkIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBhZGRMaXN0VG9Db250ZW50KGh0bWwsIGxpc3QpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdCkgJiYgbGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzXG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGxpc3QpLmZvckVhY2goKFt0ZXJtLCBkZWZpbml0aW9uXSkgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHdhcm5pbmcgc2VjdGlvbiBmb3IgdG9vbHRpcCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHdhcm5pbmcgLSBXYXJuaW5nIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB3YXJuaW5nIHNlY3Rpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRXYXJuaW5nU2VjdGlvbih3YXJuaW5nKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgIGlmICh3YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+IGA7XG4gICAgICAgICAgICBodG1sICs9IHdhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IHdhcm5pbmcudGV4dDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvZGUgZXhhbXBsZXMgc2VjdGlvbiAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtBcnJheX0gZXhhbXBsZXMgLSBBcnJheSBvZiBjb2RlIGV4YW1wbGUgbGluZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyIC0gT3B0aW9uYWwgaGVhZGVyIGZvciBleGFtcGxlcyBzZWN0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgY29kZSBleGFtcGxlc1xuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZENvZGVFeGFtcGxlcyhleGFtcGxlcywgaGVhZGVyKSB7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48c3Ryb25nPiR7aGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7IGJvcmRlcjogMXB4IHNvbGlkICNlMGUwZTA7XCI+JztcbiAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGV4YW1wbGVzIHdpdGggc3ludGF4IGhpZ2hsaWdodGluZyBmb3Igc2VjdGlvbnNcbiAgICAgICAgZXhhbXBsZXMuZm9yRWFjaCgobGluZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCdbJykgJiYgbGluZS50cmltKCkuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMDA4NGI0OyBmb250LXdlaWdodDogYm9sZDtcIj4ke2xpbmV9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgIC8vIFBhcmFtZXRlciBsaW5lXG4gICAgICAgICAgICAgICAgY29uc3QgW3BhcmFtLCB2YWx1ZV0gPSBsaW5lLnNwbGl0KCc9JywgMik7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGxpbmVcbiAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L3ByZT4nO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzcGVjaWZpYyB0b29sdGlwIGNvbnRlbnQgZHluYW1pY2FsbHlcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgdG8gdXBkYXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R8c3RyaW5nfSB0b29sdGlwRGF0YSAtIE5ldyB0b29sdGlwIGRhdGEgb3IgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIHVwZGF0ZVRvb2x0aXAoZmllbGROYW1lLCB0b29sdGlwRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci51cGRhdGUoZmllbGROYW1lLCB0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUgZm9yIHVwZGF0aW5nIHRvb2x0aXAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbHRpcCBmb3IgZmllbGQgJyR7ZmllbGROYW1lfSc6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgZXh0ZW5zaW9uIHRvb2x0aXBzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbc2VsZWN0b3I9Jy5maWVsZC1pbmZvLWljb24nXSAtIGpRdWVyeSBzZWxlY3RvciBmb3IgdG9vbHRpcCBpY29uc1xuICAgICAqL1xuICAgIHN0YXRpYyBkZXN0cm95KHNlbGVjdG9yID0gJy5maWVsZC1pbmZvLWljb24nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmRlc3Ryb3koc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlc3Ryb3kgZXh0ZW5zaW9uIHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gZXh0ZW5zaW9uLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25Ub29sdGlwTWFuYWdlcjtcbn0iXX0=