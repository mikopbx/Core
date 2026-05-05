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
          examples: ['[endpoint]', 'device_state_busy_at=2', 'max_audio_streams=1', 'direct_media=no', 'trust_id_inbound=yes', 'force_rport=yes', 'rewrite_contact=yes', 'rtp_timeout=180', 'rtp_timeout_hold=900', 'rtp_keepalive=60', 'set_var=LEGACY_CP1251=1', '', '', '[aor]', 'max_contacts=3', 'remove_existing=yes', 'remove_unavailable=yes', 'qualify_frequency=30', 'qualify_timeout=3', '', '', '[auth]', 'auth_type=userpass'],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInRvb2x0aXBDb25maWdzIiwiZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zIiwiVG9vbHRpcEJ1aWxkZXIiLCJpbml0aWFsaXplIiwic2VsZWN0b3IiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsInZhcmlhdGlvbiIsImluaXRpYWxpemVGYWxsYmFjayIsImVycm9yIiwibW9iaWxlX2RpYWxzdHJpbmciLCJoZWFkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2Rlc2MiLCJsaXN0IiwidGVybSIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2hlYWRlciIsImRlZmluaXRpb24iLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXRfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX3Byb3ZpZGVyIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXJfZGVzYyIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2ZvcndhcmQiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkX2Rlc2MiLCJsaXN0MiIsImV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImV4YW1wbGVzIiwiZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMiLCJzcGxpdCIsIm5vdGUiLCJleF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9ub3RlIiwic2lwX2R0bWZtb2RlIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2hlYWRlciIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfYXV0byIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZCIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZF9kZXNjIiwiZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5mbyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm9fZGVzYyIsImV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X3JmYzQ3MzMiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9yZmM0NzMzX2Rlc2MiLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm8iLCJleF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm9fZGVzYyIsInNpcF90cmFuc3BvcnQiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfZGVzYyIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfcHJvdG9jb2xzX2hlYWRlciIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcCIsImV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHAiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3AiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3RjcF9kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3Rsc19kZXNjIiwiZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwibGlzdDMiLCJleF9TaXBUcmFuc3BvcnRUb29sdGlwX3JlY19jb21wYXRpYmlsaXR5Iiwic2lwX2FjY2VwdE11bHRpcGxlQ2FsbHMiLCJleF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9oZWFkZXIiLCJleF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9kZXNjIiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb2ZmIiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb2ZmX2Rlc2MiLCJleF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9vbiIsImV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX29uX2Rlc2MiLCJ3YXJuaW5nIiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfd2FybmluZyIsImV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX25vdGUiLCJzaXBfbmV0d29ya2ZpbHRlcmlkIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2Rlc2MiLCJleF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZXhfU2lwTmV0d29ya2ZpbHRlcmlkVG9vbHRpcF93YXJuaW5nIiwic2lwX21hbnVhbGF0dHJpYnV0ZXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZm9ybWF0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGV2aWNlX3N0YXRlX2J1c3lfYXRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXMiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9hdWRpb19zdHJlYW1zX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0cyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2NvbnRhY3RzX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV9leGlzdGluZyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX2V4aXN0aW5nX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYSIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZGlyZWN0X21lZGlhX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmRfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnQiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2ZvcmNlX3Jwb3J0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3Jld3JpdGVfY29udGFjdCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmV3cml0ZV9jb250YWN0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5IiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9xdWFsaWZ5X2ZyZXF1ZW5jeV9kZXNjIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlIiwiZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfdGltZW91dCIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV90aW1lb3V0X2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV91bmF2YWlsYWJsZSIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcmVtb3ZlX3VuYXZhaWxhYmxlX2Rlc2MiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3NldF92YXIiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3NldF92YXJfZGVzYyIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX25vdGUiLCJleF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmciLCJjb25maWdzIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImNvbmZpZyIsImFkZExpc3RUb0NvbnRlbnQiLCJpIiwibGlzdE5hbWUiLCJsZW5ndGgiLCJidWlsZFdhcm5pbmdTZWN0aW9uIiwiYnVpbGRDb2RlRXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpdGVtIiwiT2JqZWN0IiwiZW50cmllcyIsImxpbmUiLCJ0cmltIiwic3RhcnRzV2l0aCIsImVuZHNXaXRoIiwiaW5jbHVkZXMiLCJwYXJhbSIsInZhbHVlIiwidXBkYXRlIiwiY29uc29sZSIsImRlc3Ryb3kiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsdUI7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLHFDQUFjO0FBQUE7O0FBQ1YsVUFBTSxJQUFJQyxLQUFKLENBQVUsc0VBQVYsQ0FBTjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLHNCQUFvQjtBQUNoQixVQUFJO0FBQ0EsWUFBTUMsY0FBYyxHQUFHLEtBQUtDLHdCQUFMLEVBQXZCLENBREEsQ0FHQTs7QUFDQSxZQUFJLE9BQU9DLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQkgsY0FBMUIsRUFBMEM7QUFDdENJLFlBQUFBLFFBQVEsRUFBRSxrQkFENEI7QUFFdEND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QUNuSixLQUFSLCtDQUFxRG1ILFNBQXJELFNBQW9FbkgsS0FBcEU7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksbUJBQThDO0FBQUEsVUFBL0JMLFFBQStCLHVFQUFwQixrQkFBb0I7O0FBQzFDLFVBQUk7QUFDQSxZQUFJLE9BQU9GLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQzJKLE9BQWYsQ0FBdUJ6SixRQUF2QjtBQUNILFNBRkQsTUFFTztBQUNIbUgsVUFBQUEsQ0FBQyxDQUFDbkgsUUFBRCxDQUFELENBQVk2SCxLQUFaLENBQWtCLFNBQWxCO0FBQ0g7QUFDSixPQU5ELENBTUUsT0FBT3hILEtBQVAsRUFBYztBQUNabUosUUFBQUEsT0FBTyxDQUFDbkosS0FBUixDQUFjLHVDQUFkLEVBQXVEQSxLQUF2RDtBQUNIO0FBQ0o7Ozs7S0FHTDs7O0FBQ0EsSUFBSSxPQUFPcUosTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCakssdUJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEV4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIC0gTWFuYWdlcyB0b29sdGlwcyBmb3IgRXh0ZW5zaW9uIGZvcm0gZmllbGRzXG4gKiBcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZXh0ZW5zaW9uIHNldHRpbmdzIGZpZWxkcyxcbiAqIGhlbHBpbmcgdXNlcnMgdW5kZXJzdGFuZCBhZHZhbmNlZCBTSVAgc2V0dGluZ3MgYW5kIHRoZWlyIGltcGxpY2F0aW9ucy5cbiAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgc3lzdGVtIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgU0lQIHNldHRpbmdzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdW5pZmllZCBUb29sdGlwQnVpbGRlclxuICogLSBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbiBmb3IgY29tcGF0aWJpbGl0eVxuICogLSBTdXBwb3J0IGZvciBjb21wbGV4IHRvb2x0aXBzIHdpdGggZXhhbXBsZXMgYW5kIHdhcm5pbmdzXG4gKiBcbiAqIEBjbGFzcyBFeHRlbnNpb25Ub29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBFeHRlbnNpb25Ub29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V4dGVuc2lvblRvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIHRvb2x0aXBzIGZvciB0aGUgZXh0ZW5zaW9uIGZvcm1cbiAgICAgKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IGJlaGF2aW9yXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBGYWlsZWQgdG8gaW5pdGlhbGl6ZSBleHRlbnNpb24gdG9vbHRpcHNcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGV4dGVuc2lvbiBmaWVsZHNcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvLyBNb2JpbGUgZGlhbCBzdHJpbmcgdG9vbHRpcFxuICAgICAgICAgICAgbW9iaWxlX2RpYWxzdHJpbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX3VzYWdlX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfcHJvdmlkZXJfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfdXNhZ2VfZm9yd2FyZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF91c2FnZV9mb3J3YXJkX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X01vYmlsZURpYWxzdHJpbmdUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9leGFtcGxlcyA/IFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfTW9iaWxlRGlhbHN0cmluZ1Rvb2x0aXBfZXhhbXBsZXMuc3BsaXQoJ3wnKSA6IFtdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5leF9Nb2JpbGVEaWFsc3RyaW5nVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTSVAgRFRNRiBtb2RlIHRvb2x0aXBcbiAgICAgICAgICAgIHNpcF9kdG1mbW9kZToge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9fZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfaW5iYW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luYmFuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9pbmZvLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2luZm9fZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwRHRtZm1vZGVUb29sdGlwX2xpc3RfcmZjNDczMyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9yZmM0NzMzX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcER0bWZtb2RlVG9vbHRpcF9saXN0X2F1dG9faW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBEdG1mbW9kZVRvb2x0aXBfbGlzdF9hdXRvX2luZm9fZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU0lQIHRyYW5zcG9ydCB0b29sdGlwXG4gICAgICAgICAgICBzaXBfdHJhbnNwb3J0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9wcm90b2NvbHNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfdGNwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcFRyYW5zcG9ydFRvb2x0aXBfdWRwX3RjcF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBUcmFuc3BvcnRUb29sdGlwX3VkcCwgXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF91ZHBfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3AsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90Y3BfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF90bHNfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MzogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwVHJhbnNwb3J0VG9vbHRpcF9yZWNfY29tcGF0aWJpbGl0eVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFjY2VwdCBtdWx0aXBsZSBjYWxscyB0b29sdGlwICgzQ1gtc3R5bGUgY2FsbCB3YWl0aW5nKVxuICAgICAgICAgICAgc2lwX2FjY2VwdE11bHRpcGxlQ2FsbHM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX29mZixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9BY2NlcHRNdWx0aXBsZUNhbGxzVG9vbHRpcF9vZmZfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfb25fZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZXhfQWNjZXB0TXVsdGlwbGVDYWxsc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmV4X0FjY2VwdE11bHRpcGxlQ2FsbHNUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIHRvb2x0aXBcbiAgICAgICAgICAgIHNpcF9uZXR3b3JrZmlsdGVyaWQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE5ldHdvcmtmaWx0ZXJpZFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBOZXR3b3JrZmlsdGVyaWRUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYW51YWwgYXR0cmlidXRlcyB0b29sdGlwIHdpdGggY29kZSBleGFtcGxlc1xuICAgICAgICAgICAgc2lwX21hbnVhbGF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnW2VuZHBvaW50XScsXG4gICAgICAgICAgICAgICAgICAgICdkZXZpY2Vfc3RhdGVfYnVzeV9hdD0yJyxcbiAgICAgICAgICAgICAgICAgICAgJ21heF9hdWRpb19zdHJlYW1zPTEnLFxuICAgICAgICAgICAgICAgICAgICAnZGlyZWN0X21lZGlhPW5vJyxcbiAgICAgICAgICAgICAgICAgICAgJ3RydXN0X2lkX2luYm91bmQ9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZvcmNlX3Jwb3J0PXllcycsXG4gICAgICAgICAgICAgICAgICAgICdyZXdyaXRlX2NvbnRhY3Q9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3J0cF90aW1lb3V0PTE4MCcsXG4gICAgICAgICAgICAgICAgICAgICdydHBfdGltZW91dF9ob2xkPTkwMCcsXG4gICAgICAgICAgICAgICAgICAgICdydHBfa2VlcGFsaXZlPTYwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3NldF92YXI9TEVHQUNZX0NQMTI1MT0xJyxcbiAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnW2Fvcl0nLFxuICAgICAgICAgICAgICAgICAgICAnbWF4X2NvbnRhY3RzPTMnLFxuICAgICAgICAgICAgICAgICAgICAncmVtb3ZlX2V4aXN0aW5nPXllcycsXG4gICAgICAgICAgICAgICAgICAgICdyZW1vdmVfdW5hdmFpbGFibGU9eWVzJyxcbiAgICAgICAgICAgICAgICAgICAgJ3F1YWxpZnlfZnJlcXVlbmN5PTMwJyxcbiAgICAgICAgICAgICAgICAgICAgJ3F1YWxpZnlfdGltZW91dD0zJyxcbiAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAnW2F1dGhdJyxcbiAgICAgICAgICAgICAgICAgICAgJ2F1dGhfdHlwZT11c2VycGFzcydcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9jb21tb25fcGFyYW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9kZXZpY2Vfc3RhdGVfYnVzeV9hdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RldmljZV9zdGF0ZV9idXN5X2F0X2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfbWF4X2F1ZGlvX3N0cmVhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9tYXhfYXVkaW9fc3RyZWFtc19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X21heF9jb250YWN0c19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV9leGlzdGluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV9leGlzdGluZ19kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3J0cF90aW1lb3V0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfdGltZW91dF9ob2xkLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX3RpbWVvdXRfaG9sZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X2RpcmVjdF9tZWRpYV9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3RydXN0X2lkX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF90cnVzdF9pZF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfZm9yY2VfcnBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9mb3JjZV9ycG9ydF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3Jld3JpdGVfY29udGFjdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3Jld3JpdGVfY29udGFjdF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfZnJlcXVlbmN5LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcXVhbGlmeV9mcmVxdWVuY3lfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9ydHBfa2VlcGFsaXZlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX2xpc3RfcnRwX2tlZXBhbGl2ZV9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3F1YWxpZnlfdGltZW91dF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV91bmF2YWlsYWJsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3JlbW92ZV91bmF2YWlsYWJsZV9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF9saXN0X3NldF92YXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2lwTWFudWFsYXR0cmlidXRlc1Rvb2x0aXBfbGlzdF9zZXRfdmFyX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX25vdGUsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5leF9TaXBNYW51YWxhdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmV4X1NpcE1hbnVhbGF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIHdoZW4gVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWdzIC0gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBvYmplY3RcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZUZhbGxiYWNrKGNvbmZpZ3MpIHtcbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSBjb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cCAoZmFsbGJhY2sgaW1wbGVtZW50YXRpb24pXG4gICAgICogVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSB3aGVuIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBodG1sID0gdGhpcy5hZGRMaXN0VG9Db250ZW50KGh0bWwsIGNvbmZpZy5saXN0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLCBsaXN0MywgZXRjLilcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdE5hbWUgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0TmFtZV0gJiYgY29uZmlnW2xpc3ROYW1lXS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCA9IHRoaXMuYWRkTGlzdFRvQ29udGVudChodG1sLCBjb25maWdbbGlzdE5hbWVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHdhcm5pbmcgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSB0aGlzLmJ1aWxkV2FybmluZ1NlY3Rpb24oY29uZmlnLndhcm5pbmcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9IHRoaXMuYnVpbGRDb2RlRXhhbXBsZXMoY29uZmlnLmV4YW1wbGVzLCBjb25maWcuZXhhbXBsZXNIZWFkZXIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgbm90ZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkIGxpc3QgaXRlbXMgdG8gdG9vbHRpcCBjb250ZW50IChmYWxsYmFjayBpbXBsZW1lbnRhdGlvbilcbiAgICAgKiBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaHRtbCAtIEN1cnJlbnQgSFRNTCBjb250ZW50XG4gICAgICogQHBhcmFtIHtBcnJheXxPYmplY3R9IGxpc3QgLSBMaXN0IG9mIGl0ZW1zIHRvIGFkZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVXBkYXRlZCBIVE1MIGNvbnRlbnRcbiAgICAgKi9cbiAgICBzdGF0aWMgYWRkTGlzdFRvQ29udGVudChodG1sLCBsaXN0KSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3QpICYmIGxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGVhZGVyIGl0ZW0gd2l0aG91dCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBsaXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gT2xkIGZvcm1hdCAtIG9iamVjdCB3aXRoIGtleS12YWx1ZSBwYWlyc1xuICAgICAgICAgICAgaHRtbCArPSAnPHVsPic7XG4gICAgICAgICAgICBPYmplY3QuZW50cmllcyhsaXN0KS5mb3JFYWNoKChbdGVybSwgZGVmaW5pdGlvbl0pID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke3Rlcm19Ojwvc3Ryb25nPiAke2RlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCB3YXJuaW5nIHNlY3Rpb24gZm9yIHRvb2x0aXAgKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB3YXJuaW5nIC0gV2FybmluZyBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gLSBIVE1MIHN0cmluZyBmb3Igd2FybmluZyBzZWN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkV2FybmluZ1NlY3Rpb24od2FybmluZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICBpZiAod2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgaHRtbCArPSB3YXJuaW5nLmhlYWRlcjtcbiAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgaHRtbCArPSB3YXJuaW5nLnRleHQ7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBjb2RlIGV4YW1wbGVzIHNlY3Rpb24gKGZhbGxiYWNrIGltcGxlbWVudGF0aW9uKVxuICAgICAqIFxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IGV4YW1wbGVzIC0gQXJyYXkgb2YgY29kZSBleGFtcGxlIGxpbmVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIE9wdGlvbmFsIGhlYWRlciBmb3IgZXhhbXBsZXMgc2VjdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gSFRNTCBzdHJpbmcgZm9yIGNvZGUgZXhhbXBsZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRDb2RlRXhhbXBsZXMoZXhhbXBsZXMsIGhlYWRlcikge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgaWYgKGhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4OyBib3JkZXI6IDFweCBzb2xpZCAjZTBlMGUwO1wiPic7XG4gICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07IGxpbmUtaGVpZ2h0OiAxLjRlbTtcIj4nO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBleGFtcGxlcyB3aXRoIHN5bnRheCBoaWdobGlnaHRpbmcgZm9yIHNlY3Rpb25zXG4gICAgICAgIGV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAobGluZS50cmltKCkuc3RhcnRzV2l0aCgnWycpICYmIGxpbmUudHJpbSgpLmVuZHNXaXRoKCddJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHNwYW4gc3R5bGU9XCJjb2xvcjogIzAwODRiNDsgZm9udC13ZWlnaHQ6IGJvbGQ7XCI+JHtsaW5lfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChsaW5lLmluY2x1ZGVzKCc9JykpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgIGNvbnN0IFtwYXJhbSwgdmFsdWVdID0gbGluZS5zcGxpdCgnPScsIDIpO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYFxcbjxzcGFuIHN0eWxlPVwiY29sb3I6ICM3YTNlOWQ7XCI+JHtwYXJhbX08L3NwYW4+PTxzcGFuIHN0eWxlPVwiY29sb3I6ICNjZjRhNGM7XCI+JHt2YWx1ZX08L3NwYW4+YDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVndWxhciBsaW5lXG4gICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lID8gYFxcbiR7bGluZX1gIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgc3BlY2lmaWMgdG9vbHRpcCBjb250ZW50IGR5bmFtaWNhbGx5XG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIHRvIHVwZGF0ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fHN0cmluZ30gdG9vbHRpcERhdGEgLSBOZXcgdG9vbHRpcCBkYXRhIG9yIEhUTUwgY29udGVudFxuICAgICAqL1xuICAgIHN0YXRpYyB1cGRhdGVUb29sdGlwKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlIGZvciB1cGRhdGluZyB0b29sdGlwJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIHRvb2x0aXAgZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgYWxsIGV4dGVuc2lvbiB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5kZXN0cm95KHNlbGVjdG9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChzZWxlY3RvcikucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZXN0cm95IGV4dGVuc2lvbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIGV4dGVuc2lvbi1tb2RpZnkuanNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRXh0ZW5zaW9uVG9vbHRpcE1hbmFnZXI7XG59Il19