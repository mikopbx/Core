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
          examples: ['[endpoint]', 'device_state_busy_at=2', 'max_audio_streams=1', 'direct_media=no', 'trust_id_inbound=yes', 'force_rport=yes', 'rewrite_contact=yes', 'rtp_timeout=180', 'rtp_timeout_hold=900', 'rtp_keepalive=60', 'set_var = LEGACY_CP1251=1 ; For old Panasonic,Eltex,Welltech,AddPac', '', '', '[aor]', 'max_contacts=3', 'remove_existing=yes', 'remove_unavailable=yes', 'qualify_frequency=30', 'qualify_timeout=3', '', '', '[auth]', 'auth_type=userpass'],
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
          }, {
            term: globalTranslate.ex_SipManualattributesTooltip_list_set_var,
            definition: globalTranslate.ex_SipManualattributesTooltip_list_set_var_desc
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImluaXRpYWxpemVGYWxsYmFjayIsImVycm9yIiwibW9iaWxlX2RpYWxzdHJpbmciLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2hlYWRlciIsImRlZmluaXRpb24iLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXRfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXJfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkX2Rlc2MiLCJsaXN0MiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMiLCJzcGxpdCIsIm5vdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9ub3RlIiwic2lwX2R0bWZtb2RlIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2hlYWRlciIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9yZmM0NzMzX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8iLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm9fZGVzYyIsInNpcF90cmFuc3BvcnQiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfZGVzYyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3AiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3Rsc19kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwibGlzdDMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5Iiwic2lwX25ldHdvcmtmaWx0ZXJpZCIsImV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfaGVhZGVyIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9kZXNjIiwid2FybmluZyIsImV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nIiwic2lwX21hbnVhbGF0dHJpYnV0ZXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0cyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV9leGlzdGluZyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYSIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGlyZWN0X21lZGlhX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3Jld3JpdGVfY29udGFjdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmV3cml0ZV9jb250YWN0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeV9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfdGltZW91dCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV90aW1lb3V0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV91bmF2YWlsYWJsZSIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX3VuYXZhaWxhYmxlX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3NldF92YXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3NldF92YXJfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX25vdGUiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJjb25maWdzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNvbmZpZyIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJsZW5ndGgiLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiYnVpbGRDb2RlRXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsImxpbmUiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJwYXJhbSIsInZhbHVlIiwidXBkYXRlIiwiY29uc29sZSIsImRlc3Ryb3kiLCJtb2R1bGUiLCJleHBvcnRz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QWM7QUFDWnlJLFFBQUFBLE9BQU8sQ0FBQ3pJLEtBQVIsK0NBQXFEeUcsU0FBckQsU0FBb0V6RyxLQUFwRTtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSxtQkFBOEM7QUFBQSxVQUEvQkwsUUFBK0IsdUVBQXBCLGtCQUFvQjs7QUFDMUMsVUFBSTtBQUNBLFlBQUksT0FBT0YsY0FBUCxLQUEwQixXQUE5QixFQUEyQztBQUN2Q0EsVUFBQUEsY0FBYyxDQUFDaUosT0FBZixDQUF1Qi9JLFFBQXZCO0FBQ0gsU0FGRCxNQUVPO0FBQ0h5RyxVQUFBQSxDQUFDLENBQUN6RyxRQUFELENBQUQsQ0FBWW1ILEtBQVosQ0FBa0IsU0FBbEI7QUFDSDtBQUNKLE9BTkQsQ0FNRSxPQUFPOUcsS0FBUCxFQUFjO0FBQ1p5SSxRQUFBQSxPQUFPLENBQUN6SSxLQUFSLENBQWMsdUNBQWQsRUFBdURBLEtBQXZEO0FBQ0g7QUFDSjs7OztLQUdMOzs7QUFDQSxJQUFJLE9BQU8ySSxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJ2Six1QkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBFeHRlbnNpb24gZm9ybSBmaWVsZHNcbiAqIFxuICogVGhpcyBjbGFzcyBwcm92aWRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBleHRlbnNpb24gc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIGFkdmFuY2VkIFNJUCBzZXR0aW5ncyBhbmQgdGhlaXIgaW1wbGljYXRpb25zLlxuICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBzeXN0ZW0gZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCByZW5kZXJpbmcuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBTSVAgc2V0dGluZ3NcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyXG4gKiAtIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIGZvciBjb21wYXRpYmlsaXR5XG4gKiAtIFN1cHBvcnQgZm9yIGNvbXBsZXggdG9vbHRpcHMgd2l0aCBleGFtcGxlcyBhbmQgd2FybmluZ3NcbiAqIFxuICogQGNsYXNzIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3MgdXNlcyBzdGF0aWMgbWV0aG9kcyBmb3IgdXRpbGl0eSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHMgZm9yIHRoZSBleHRlbnNpb24gZm9ybVxuICAgICAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIGFsbCB0b29sdGlwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBkaXJlY3QgaW1wbGVtZW50YXRpb24gaWYgVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZhbGxiYWNrKHRvb2x0aXBDb25maWdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIEZhaWxlZCB0byBpbml0aWFsaXplIGV4dGVuc2lvbiB0b29sdGlwc1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZXh0ZW5zaW9uIGZpZWxkc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCBmaWVsZCBuYW1lcyBhcyBrZXlzIGFuZCB0b29sdGlwIGRhdGEgYXMgdmFsdWVzXG4gICAgICovXG4gICAgc3RhdGljIGdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC8vIE1vYmlsZSBkaWFsIHN0cmluZyB0b29sdGlwXG4gICAgICAgICAgICBtb2JpbGVfZGlhbHN0cmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9wcm92aWRlcl9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzID8gXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcy5zcGxpdCgnfCcpIDogW10sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNJUCBEVE1GIG1vZGUgdG9vbHRpcFxuICAgICAgICAgICAgc2lwX2R0bWZtb2RlOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG8sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmJhbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mb19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9yZmM0NzMzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0b19pbmZvLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mb19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTSVAgdHJhbnNwb3J0IHRvb2x0aXBcbiAgICAgICAgICAgIHNpcF90cmFuc3BvcnQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3Byb3RvY29sc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3RscyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3Rsc19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgdG9vbHRpcFxuICAgICAgICAgICAgc2lwX25ldHdvcmtmaWx0ZXJpZDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hbnVhbCBhdHRyaWJ1dGVzIHRvb2x0aXAgd2l0aCBjb2RlIGV4YW1wbGVzXG4gICAgICAgICAgICBzaXBfbWFudWFsYXR0cmlidXRlczoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdbZW5kcG9pbnRdJyxcbiAgICAgICAgICAgICAgICAgICAgJ2RldmljZV9zdGF0ZV9idXN5X2F0PTInLFxuICAgICAgICAgICAgICAgICAgICAnbWF4X2F1ZGlvX3N0cmVhbXM9MScsXG4gICAgICAgICAgICAgICAgICAgICdkaXJlY3RfbWVkaWE9bm8nLFxuICAgICAgICAgICAgICAgICAgICAndHJ1c3RfaWRfaW5ib3VuZD15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAnZm9yY2VfcnBvcnQ9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3Jld3JpdGVfY29udGFjdD15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncnRwX3RpbWVvdXQ9MTgwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3J0cF90aW1lb3V0X2hvbGQ9OTAwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3J0cF9rZWVwYWxpdmU9NjAnLFxuICAgICAgICAgICAgICAgICAgICAnc2V0X3ZhciA9IExFR0FDWV9DUDEyNTE9MSA7IEZvciBvbGQgUGFuYXNvbmljLEVsdGV4LFdlbGx0ZWNoLEFkZFBhYycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgJ21heF9jb250YWN0cz0zJyxcbiAgICAgICAgICAgICAgICAgICAgJ3JlbW92ZV9leGlzdGluZz15ZXMnLFxuICAgICAgICAgICAgICAgICAgICAncmVtb3ZlX3VuYXZhaWxhYmxlPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdxdWFsaWZ5X2ZyZXF1ZW5jeT0zMCcsXG4gICAgICAgICAgICAgICAgICAgICdxdWFsaWZ5X3RpbWVvdXQ9MycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgJ1thdXRoXScsXG4gICAgICAgICAgICAgICAgICAgICdhdXRoX3R5cGU9dXNlcnBhc3MnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfY29tbW9uX3BhcmFtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfY29udGFjdHNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfZXhpc3RpbmdfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0X2hvbGRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWEsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kaXJlY3RfbWVkaWFfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF90cnVzdF9pZF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfdHJ1c3RfaWRfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZXdyaXRlX2NvbnRhY3RfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX2tlZXBhbGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF9rZWVwYWxpdmVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X3RpbWVvdXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9yZW1vdmVfdW5hdmFpbGFibGVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9zZXRfdmFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3Rfc2V0X3Zhcl9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbiB3aGVuIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlncyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgb2JqZWN0XG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVGYWxsYmFjayhjb25maWdzKSB7XG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0gY29uZmlnc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkgd2hlbiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgaWYgKCFjb25maWcpIHJldHVybiAnJztcbiAgICAgICAgXG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVhZGVyIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbiBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBsaXN0IGl0ZW1zIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCkge1xuICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWcubGlzdCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0MiwgbGlzdDMsIGV0Yy4pXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3ROYW1lID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmIChjb25maWdbbGlzdE5hbWVdICYmIGNvbmZpZ1tsaXN0TmFtZV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgPSB0aGlzLmFkZExpc3RUb0NvbnRlbnQoaHRtbCwgY29uZmlnW2xpc3ROYW1lXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gdGhpcy5idWlsZFdhcm5pbmdTZWN0aW9uKGNvbmZpZy53YXJuaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGNvZGUgZXhhbXBsZXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkQ29kZUV4YW1wbGVzKGNvbmZpZy5leGFtcGxlcywgY29uZmlnLmV4YW1wbGVzSGVhZGVyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBsaXN0IGl0ZW1zIHRvIHRvb2x0aXAgY29udGVudCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGh0bWwgLSBDdXJyZW50IEhUTUwgY29udGVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl8T2JqZWN0fSBsaXN0IC0gTGlzdCBvZiBpdGVtcyB0byBhZGRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIFVwZGF0ZWQgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIGFkZExpc3RUb0NvbnRlbnQoaHRtbCwgbGlzdCkge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShsaXN0KSAmJiBsaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bD5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgbGlzdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMobGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHt0ZXJtfTo8L3N0cm9uZz4gJHtkZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgd2FybmluZyBzZWN0aW9uIGZvciB0b29sdGlwIChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gd2FybmluZyAtIFdhcm5pbmcgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHdhcm5pbmcgc2VjdGlvblxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFdhcm5pbmdTZWN0aW9uKHdhcm5pbmcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHNtYWxsIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgaWYgKHdhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT4gYDtcbiAgICAgICAgICAgIGh0bWwgKz0gd2FybmluZy5oZWFkZXI7XG4gICAgICAgICAgICBodG1sICs9IGA8L2Rpdj5gO1xuICAgICAgICB9XG4gICAgICAgIGh0bWwgKz0gd2FybmluZy50ZXh0O1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29kZSBleGFtcGxlcyBzZWN0aW9uIChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBleGFtcGxlcyAtIEFycmF5IG9mIGNvZGUgZXhhbXBsZSBsaW5lc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXIgLSBPcHRpb25hbCBoZWFkZXIgZm9yIGV4YW1wbGVzIHNlY3Rpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciBjb2RlIGV4YW1wbGVzXG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkQ29kZUV4YW1wbGVzKGV4YW1wbGVzLCBoZWFkZXIpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIGlmIChoZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHtoZWFkZXJ9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtOyBsaW5lLWhlaWdodDogMS40ZW07XCI+JztcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgd2l0aCBzeW50YXggaGlnaGxpZ2h0aW5nIGZvciBzZWN0aW9uc1xuICAgICAgICBleGFtcGxlcy5mb3JFYWNoKChsaW5lLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ1snKSAmJiBsaW5lLnRyaW0oKS5lbmRzV2l0aCgnXScpKSB7XG4gICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPiAwKSBodG1sICs9ICdcXG4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobGluZS5pbmNsdWRlcygnPScpKSB7XG4gICAgICAgICAgICAgICAgLy8gUGFyYW1ldGVyIGxpbmVcbiAgICAgICAgICAgICAgICBjb25zdCBbcGFyYW0sIHZhbHVlXSA9IGxpbmUuc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgICAgICAgICBodG1sICs9IGBcXG48c3BhbiBzdHlsZT1cImNvbG9yOiAjN2EzZTlkO1wiPiR7cGFyYW19PC9zcGFuPj08c3BhbiBzdHlsZT1cImNvbG9yOiAjY2Y0YTRjO1wiPiR7dmFsdWV9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgbGluZVxuICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSA/IGBcXG4ke2xpbmV9YCA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzwvcHJlPic7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHNwZWNpZmljIHRvb2x0aXAgY29udGVudCBkeW5hbWljYWxseVxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSB0byB1cGRhdGVcbiAgICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IHRvb2x0aXBEYXRhIC0gTmV3IHRvb2x0aXAgZGF0YSBvciBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgdXBkYXRlVG9vbHRpcChmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLnVwZGF0ZShmaWVsZE5hbWUsIHRvb2x0aXBEYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZSBmb3IgdXBkYXRpbmcgdG9vbHRpcCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSB0b29sdGlwIGZvciBmaWVsZCAnJHtmaWVsZE5hbWV9JzpgLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCBleHRlbnNpb24gdG9vbHRpcHNcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IFtzZWxlY3Rvcj0nLmZpZWxkLWluZm8taWNvbiddIC0galF1ZXJ5IHNlbGVjdG9yIGZvciB0b29sdGlwIGljb25zXG4gICAgICovXG4gICAgc3RhdGljIGRlc3Ryb3koc2VsZWN0b3IgPSAnLmZpZWxkLWluZm8taWNvbicpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuZGVzdHJveShzZWxlY3Rvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoc2VsZWN0b3IpLnBvcHVwKCdkZXN0cm95Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVzdHJveSBleHRlbnNpb24gdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBleHRlbnNpb24tbW9kaWZ5LmpzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyO1xufSJdfQ==