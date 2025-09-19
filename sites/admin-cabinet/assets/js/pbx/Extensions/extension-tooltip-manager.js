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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImNvbnNvbGUiLCJ3YXJuIiwiaW5pdGlhbGl6ZUZhbGxiYWNrIiwiZXJyb3IiLCJtb2JpbGVfZGlhbHN0cmluZyIsImhlYWRlciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdF9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXIiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcl9kZXNjIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZCIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmRfZGVzYyIsImxpc3QyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZXhhbXBsZXMiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcyIsInNwbGl0Iiwibm90ZSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX25vdGUiLCJzaXBfZHRtZm1vZGUiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mb19kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczMyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzNfZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mb19kZXNjIiwic2lwX3RyYW5zcG9ydCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RscyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2MiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIiLCJsaXN0MyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHkiLCJzaXBfbmV0d29ya2ZpbHRlcmlkIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmciLCJzaXBfbWFudWFsYXR0cmlidXRlcyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2NvbW1vbl9wYXJhbXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtcyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXNfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHNfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGlyZWN0X21lZGlhIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWFfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfdHJ1c3RfaWRfaW5ib3VuZCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfdHJ1c3RfaWRfaW5ib3VuZF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9mb3JjZV9ycG9ydCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmV3cml0ZV9jb250YWN0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3RfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV9mcmVxdWVuY3kiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF9rZWVwYWxpdmUiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF9rZWVwYWxpdmVfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV90aW1lb3V0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX3VuYXZhaWxhYmxlIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGVfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX25vdGUiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJjb25maWdzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNvbmZpZyIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJsZW5ndGgiLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiYnVpbGRDb2RlRXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsImxpbmUiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJwYXJhbSIsInZhbHVlIiwidXBkYXRlIiwiZGVzdHJveSIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QThDO0FBQUEsVUFBL0JQLFFBQStCLHVFQUFwQixrQkFBb0I7O0FBQzFDLFVBQUk7QUFDQSxZQUFJLE9BQU9GLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQ2dKLE9BQWYsQ0FBdUI5SSxRQUF2QjtBQUNILFNBRkQsTUFFTztBQUNIeUcsVUFBQUEsQ0FBQyxDQUFDekcsUUFBRCxDQUFELENBQVltSCxLQUFaLENBQWtCLFNBQWxCO0FBQ0g7QUFDSixPQU5ELENBTUUsT0FBTzVHLEtBQVAsRUFBYztBQUNaSCxRQUFBQSxPQUFPLENBQUNHLEtBQVIsQ0FBYyx1Q0FBZCxFQUF1REEsS0FBdkQ7QUFDSDtBQUNKOzs7O0tBR0w7OztBQUNBLElBQUksT0FBT3dJLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnRKLHVCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEV4dGVuc2lvbiBmb3JtIGZpZWxkc1xuICogXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGV4dGVuc2lvbiBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgYWR2YW5jZWQgU0lQIHNldHRpbmdzIGFuZCB0aGVpciBpbXBsaWNhdGlvbnMuXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIFNJUCBzZXR0aW5nc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXJcbiAqIC0gRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gZm9yIGNvbXBhdGliaWxpdHlcbiAqIC0gU3VwcG9ydCBmb3IgY29tcGxleCB0b29sdGlwcyB3aXRoIGV4YW1wbGVzIGFuZCB3YXJuaW5nc1xuICogXG4gKiBAY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHRlbnNpb25Ub29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIGV4dGVuc2lvbiBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlLCB1c2luZyBmYWxsYmFjayBpbXBsZW1lbnRhdGlvbicpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZhbGxiYWNrKHRvb2x0aXBDb25maWdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIGV4dGVuc2lvbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBleHRlbnNpb24gZmllbGRzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gTW9iaWxlIGRpYWwgc3RyaW5nIHRvb2x0aXBcbiAgICAgICAgICAgIG1vYmlsZV9kaWFsc3RyaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMgPyBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQIERUTUYgbW9kZSB0b29sdGlwXG4gICAgICAgICAgICBzaXBfZHRtZm1vZGU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczM19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19pbmZvX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUCB0cmFuc3BvcnQgdG9vbHRpcFxuICAgICAgICAgICAgc2lwX3RyYW5zcG9ydDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdGxzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcmVjX2NvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB0b29sdGlwXG4gICAgICAgICAgICBzaXBfbmV0d29ya2ZpbHRlcmlkOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFudWFsIGF0dHJpYnV0ZXMgdG9vbHRpcCB3aXRoIGNvZGUgZXhhbXBsZXNcbiAgICAgICAgICAgIHNpcF9tYW51YWxhdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ1tlbmRwb2ludF0nLFxuICAgICAgICAgICAgICAgICAgICAnZGV2aWNlX3N0YXRlX2J1c3lfYXQ9MicsXG4gICAgICAgICAgICAgICAgICAgICdtYXhfYXVkaW9fc3RyZWFtcz0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RpcmVjdF9tZWRpYT1ubycsXG4gICAgICAgICAgICAgICAgICAgICd0cnVzdF9pZF9pbmJvdW5kPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdmb3JjZV9ycG9ydD15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncmV3cml0ZV9jb250YWN0PXllcycsXG4gICAgICAgICAgICAgICAgICAgICdydHBfdGltZW91dD0xODAnLFxuICAgICAgICAgICAgICAgICAgICAncnRwX3RpbWVvdXRfaG9sZD05MDAnLFxuICAgICAgICAgICAgICAgICAgICAncnRwX2tlZXBhbGl2ZT02MCcsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgJ21heF9jb250YWN0cz0zJyxcbiAgICAgICAgICAgICAgICAgICAgJ3JlbW92ZV9leGlzdGluZz15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncmVtb3ZlX3VuYXZhaWxhYmxlPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXF1ZW5jeT0zMCcsXG4gICAgICAgICAgICAgICAgICAgICdxdWFsaWZ5X3RpbWVvdXQ9MycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thdXRoXScsXG4gICAgICAgICAgICAgICAgICAgICdhdXRoX3R5cGU9dXNlcnBhc3MnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWEsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWFfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF90cnVzdF9pZF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfdHJ1c3RfaWRfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3RfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX2tlZXBhbGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF9rZWVwYWxpdmVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIG9iamVjdFxuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2soY29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IGNvbmZpZ3NbZmllbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwIChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBUaGlzIG1ldGhvZCBpcyBrZXB0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5IHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgdG9vbHRpcCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGlmICghY29uZmlnKSByZXR1cm4gJyc7XG4gICAgICAgIFxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlYWRlciBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGRpdmlkZXJcIj48L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb24gaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbGlzdCBpdGVtcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QpIHtcbiAgICAgICAgICAgIGh0bWwgPSB0aGlzLmFkZExpc3RUb0NvbnRlbnQoaHRtbCwgY29uZmlnLmxpc3QpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZ1tsaXN0TmFtZV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRXYXJuaW5nU2VjdGlvbihjb25maWcud2FybmluZyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjb2RlIGV4YW1wbGVzIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5idWlsZENvZGVFeGFtcGxlcyhjb25maWcuZXhhbXBsZXMsIGNvbmZpZy5leGFtcGxlc0hlYWRlcik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGQgbGlzdCBpdGVtcyB0byB0b29sdGlwIGNvbnRlbnQgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBodG1sIC0gQ3VycmVudCBIVE1MIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gbGlzdCAtIExpc3Qgb2YgaXRlbXMgdG8gYWRkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBVcGRhdGVkIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBhZGRMaXN0VG9Db250ZW50KGh0bWwsIGxpc3QpIHtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdCkgJiYgbGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIZWFkZXIgaXRlbSB3aXRob3V0IGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBPbGQgZm9ybWF0IC0gb2JqZWN0IHdpdGgga2V5LXZhbHVlIHBhaXJzXG4gICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKGxpc3QpLmZvckVhY2goKFt0ZXJtLCBkZWZpbml0aW9uXSkgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHdhcm5pbmcgc2VjdGlvbiBmb3IgdG9vbHRpcCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHdhcm5pbmcgLSBXYXJuaW5nIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB3YXJuaW5nIHNlY3Rpb25cbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRXYXJuaW5nU2VjdGlvbih3YXJuaW5nKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgIGlmICh3YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+IGA7XG4gICAgICAgICAgICBodG1sICs9IHdhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgaHRtbCArPSBgPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBodG1sICs9IHdhcm5pbmcudGV4dDtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGNvZGUgZXhhbXBsZXMgc2VjdGlvbiAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtBcnJheX0gZXhhbXBsZXMgLSBBcnJheSBvZiBjb2RlIGV4YW1wbGUgbGluZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyIC0gT3B0aW9uYWwgaGVhZGVyIGZvciBleGFtcGxlcyBzZWN0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3IgY29kZSBleGFtcGxlc1xuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZENvZGVFeGFtcGxlcyhleGFtcGxlcywgaGVhZGVyKSB7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48c3Ryb25nPiR7aGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7IGJvcmRlcjogMXB4IHNvbGlkICNlMGUwZTA7XCI+JztcbiAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGV4YW1wbGVzIHdpdGggc3ludGF4IGhpZ2hsaWdodGluZyBmb3Igc2VjdGlvbnNcbiAgICAgICAgZXhhbXBsZXMuZm9yRWFjaCgobGluZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChsaW5lLnRyaW0oKS5zdGFydHNXaXRoKCdbJykgJiYgbGluZS50cmltKCkuZW5kc1dpdGgoJ10nKSkge1xuICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID4gMCkgaHRtbCArPSAnXFxuJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8c3BhbiBzdHlsZT1cImNvbG9yOiAjMDA4NGI0OyBmb250LXdlaWdodDogYm9sZDtcIj4ke2xpbmV9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgIC8vIFBhcmFtZXRlciBsaW5lXG4gICAgICAgICAgICAgICAgY29uc3QgW3BhcmFtLCB2YWx1ZV0gPSBsaW5lLnNwbGl0KCc9JywgMik7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZWd1bGFyIGxpbmVcbiAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8L3ByZT4nO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzcGVjaWZpYyB0b29sdGlwIGNvbnRlbnQgZHluYW1pY2FsbHlcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgdG8gdXBkYXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R8c3RyaW5nfSB0b29sdGlwRGF0YSAtIE5ldyB0b29sdGlwIGRhdGEgb3IgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIHVwZGF0ZVRvb2x0aXAoZmllbGROYW1lLCB0b29sdGlwRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci51cGRhdGUoZmllbGROYW1lLCB0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUgZm9yIHVwZGF0aW5nIHRvb2x0aXAnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgdG9vbHRpcCBmb3IgZmllbGQgJyR7ZmllbGROYW1lfSc6YCwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBhbGwgZXh0ZW5zaW9uIHRvb2x0aXBzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBbc2VsZWN0b3I9Jy5maWVsZC1pbmZvLWljb24nXSAtIGpRdWVyeSBzZWxlY3RvciBmb3IgdG9vbHRpcCBpY29uc1xuICAgICAqL1xuICAgIHN0YXRpYyBkZXN0cm95KHNlbGVjdG9yID0gJy5maWVsZC1pbmZvLWljb24nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmRlc3Ryb3koc2VsZWN0b3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKHNlbGVjdG9yKS5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlc3Ryb3kgZXh0ZW5zaW9uIHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gZXh0ZW5zaW9uLW1vZGlmeS5qc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25Ub29sdGlwTWFuYWdlcjtcbn0iXX0=