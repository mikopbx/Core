"use strict";

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
 * Fail2BanTooltipManager - Manages tooltips for Fail2Ban form fields
 *
 * This class provides tooltip configurations for Fail2Ban settings fields,
 * helping users understand intrusion prevention parameters and whitelist configuration.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 *
 * @class Fail2BanTooltipManager
 */
var Fail2BanTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function Fail2BanTooltipManager() {
    _classCallCheck(this, Fail2BanTooltipManager);

    throw new Error('Fail2BanTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the Fail2Ban form
   * Uses the unified TooltipBuilder for consistent behavior
   *
   * @static
   */


  _createClass(Fail2BanTooltipManager, null, [{
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
        console.error('Failed to initialize Fail2Ban tooltips:', error);
      }
    }
    /**
     * Get all tooltip configurations for Fail2Ban fields
     *
     * @static
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      return {
        // Max retry field tooltip
        maxretry: {
          header: globalTranslate.f2b_MaxRetryTooltip_header,
          description: globalTranslate.f2b_MaxRetryTooltip_desc,
          list: [{
            term: globalTranslate.f2b_MaxRetryTooltip_how_it_works,
            definition: null
          }, globalTranslate.f2b_MaxRetryTooltip_how_it_works_desc, {
            term: globalTranslate.f2b_MaxRetryTooltip_examples_header,
            definition: null
          }, {
            term: '3',
            definition: globalTranslate.f2b_MaxRetryTooltip_example_3
          }, {
            term: '5',
            definition: globalTranslate.f2b_MaxRetryTooltip_example_5
          }, {
            term: '10',
            definition: globalTranslate.f2b_MaxRetryTooltip_example_10
          }],
          warning: {
            header: globalTranslate.f2b_MaxRetryTooltip_warning_header,
            text: globalTranslate.f2b_MaxRetryTooltip_warning
          },
          note: globalTranslate.f2b_MaxRetryTooltip_note
        },
        // Whitelist field tooltip
        whitelist: {
          header: globalTranslate.f2b_WhitelistTooltip_header,
          description: globalTranslate.f2b_WhitelistTooltip_desc,
          list: [{
            term: globalTranslate.f2b_WhitelistTooltip_format_header,
            definition: null
          }, globalTranslate.f2b_WhitelistTooltip_format_desc, {
            term: globalTranslate.f2b_WhitelistTooltip_examples_header,
            definition: null
          }, {
            term: '192.168.1.100',
            definition: globalTranslate.f2b_WhitelistTooltip_example_single_ip
          }, {
            term: '10.0.0.0/8',
            definition: globalTranslate.f2b_WhitelistTooltip_example_subnet
          }, {
            term: '192.168.1.0/24',
            definition: globalTranslate.f2b_WhitelistTooltip_example_local_network
          }, {
            term: '172.16.0.0/12',
            definition: globalTranslate.f2b_WhitelistTooltip_example_private_network
          }],
          list2: [{
            term: globalTranslate.f2b_WhitelistTooltip_recommendations_header,
            definition: null
          }, globalTranslate.f2b_WhitelistTooltip_recommendation_1, globalTranslate.f2b_WhitelistTooltip_recommendation_2, globalTranslate.f2b_WhitelistTooltip_recommendation_3],
          examples: globalTranslate.f2b_WhitelistTooltip_config_examples ? globalTranslate.f2b_WhitelistTooltip_config_examples.split('|') : ['# Office network', '192.168.1.0/24', '', '# VPN server', '10.8.0.1', '', '# Partner IP', '203.0.113.45'],
          warning: {
            header: globalTranslate.f2b_WhitelistTooltip_warning_header,
            text: globalTranslate.f2b_WhitelistTooltip_warning
          },
          note: globalTranslate.f2b_WhitelistTooltip_note
        },
        // Ban time field tooltip
        bantime: {
          header: globalTranslate.f2b_BanTimeTooltip_header,
          description: globalTranslate.f2b_BanTimeTooltip_desc,
          list: [{
            term: globalTranslate.f2b_BanTimeTooltip_duration_header,
            definition: null
          }, {
            term: '3600',
            definition: globalTranslate.f2b_BanTimeTooltip_1hour
          }, {
            term: '86400',
            definition: globalTranslate.f2b_BanTimeTooltip_24hours
          }, {
            term: '604800',
            definition: globalTranslate.f2b_BanTimeTooltip_7days
          }],
          note: globalTranslate.f2b_BanTimeTooltip_note
        },
        // Find time field tooltip
        findtime: {
          header: globalTranslate.f2b_FindTimeTooltip_header,
          description: globalTranslate.f2b_FindTimeTooltip_desc,
          list: [{
            term: globalTranslate.f2b_FindTimeTooltip_window_header,
            definition: null
          }, {
            term: '600',
            definition: globalTranslate.f2b_FindTimeTooltip_10min
          }, {
            term: '1800',
            definition: globalTranslate.f2b_FindTimeTooltip_30min
          }, {
            term: '3600',
            definition: globalTranslate.f2b_FindTimeTooltip_1hour
          }],
          note: globalTranslate.f2b_FindTimeTooltip_note
        },
        // PBXFirewallMaxReqSec field tooltip
        PBXFirewallMaxReqSec: {
          header: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_header,
          description: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_desc,
          list: [{
            term: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_how_it_works,
            definition: null
          }, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_how_it_works_desc, {
            term: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_values_header,
            definition: null
          }, {
            term: '10 req/s',
            definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_10
          }, {
            term: '30 req/s',
            definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_30
          }, {
            term: '100 req/s',
            definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_100
          }, {
            term: '300 req/s',
            definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_300
          }, {
            term: '∞',
            definition: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_unlimited
          }],
          list2: [{
            term: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenarios_header,
            definition: null
          }, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenario_1, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenario_2, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_scenario_3],
          warning: {
            header: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_warning_header,
            text: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_warning
          },
          note: globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_note
        }
      };
    }
    /**
     * Fallback implementation if TooltipBuilder is not available
     *
     * @static
     * @param {Object} tooltipConfigs - Tooltip configurations
     */

  }, {
    key: "initializeFallback",
    value: function initializeFallback(tooltipConfigs) {
      var _this = this;

      $('.field-info-icon').each(function (index, element) {
        var $icon = $(element);
        var fieldName = $icon.data('field');
        var tooltipData = tooltipConfigs[fieldName];

        if (tooltipData) {
          // Build tooltip content manually
          var content = _this.buildFallbackContent(tooltipData);

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
     * Build tooltip content for fallback implementation
     *
     * @static
     * @param {Object} tooltipData - Tooltip data
     * @returns {string} HTML content for tooltip
     */

  }, {
    key: "buildFallbackContent",
    value: function buildFallbackContent(tooltipData) {
      if (!tooltipData) return '';
      var html = ''; // Add header

      if (tooltipData.header) {
        html += "<div class=\"header\">".concat(tooltipData.header, "</div>");
      } // Add description


      if (tooltipData.description) {
        html += "<p>".concat(tooltipData.description, "</p>");
      } // Add lists


      var buildList = function buildList(list) {
        var listHtml = '<ul style="margin: 0.5em 0; padding-left: 1.5em;">';
        list.forEach(function (item) {
          if (typeof item === 'string') {
            listHtml += "<li>".concat(item, "</li>");
          } else if (item.definition === null) {
            listHtml += "</ul><p><strong>".concat(item.term, "</strong></p><ul style=\"margin: 0.5em 0; padding-left: 1.5em;\">");
          } else {
            listHtml += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        listHtml += '</ul>';
        return listHtml;
      }; // Add all lists


      for (var i = 1; i <= 10; i++) {
        var listKey = i === 1 ? 'list' : "list".concat(i);

        if (tooltipData[listKey] && tooltipData[listKey].length > 0) {
          html += buildList(tooltipData[listKey]);
        }
      } // Add warning


      if (tooltipData.warning) {
        html += '<div class="ui warning message" style="margin: 0.5em 0;">';

        if (tooltipData.warning.header) {
          html += "<div class=\"header\">".concat(tooltipData.warning.header, "</div>");
        }

        if (tooltipData.warning.text) {
          html += "<p>".concat(tooltipData.warning.text, "</p>");
        }

        html += '</div>';
      } // Add examples


      if (tooltipData.examples && tooltipData.examples.length > 0) {
        if (tooltipData.examplesHeader) {
          html += "<p><strong>".concat(tooltipData.examplesHeader, ":</strong></p>");
        }

        html += '<div class="ui segment" style="background-color: #f8f8f8;">';
        html += '<pre style="margin: 0; font-size: 0.9em;">';
        tooltipData.examples.forEach(function (line) {
          html += line + '\n';
        });
        html += '</pre></div>';
      } // Add note


      if (tooltipData.note) {
        html += "<p><em>".concat(tooltipData.note, "</em></p>");
      }

      return html;
    }
  }]);

  return Fail2BanTooltipManager;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsIm1heHJldHJ5IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZjJiX01heFJldHJ5VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJkZWZpbml0aW9uIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzMiLCJmMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfNSIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8xMCIsIndhcm5pbmciLCJmMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwidGV4dCIsImYyYl9NYXhSZXRyeVRvb2x0aXBfd2FybmluZyIsIm5vdGUiLCJmMmJfTWF4UmV0cnlUb29sdGlwX25vdGUiLCJ3aGl0ZWxpc3QiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2hlYWRlciIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrIiwibGlzdDIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zIiwiZXhhbXBsZXMiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMiLCJzcGxpdCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGUiLCJiYW50aW1lIiwiZjJiX0JhblRpbWVUb29sdGlwX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0JhblRpbWVUb29sdGlwX2R1cmF0aW9uX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF8xaG91ciIsImYyYl9CYW5UaW1lVG9vbHRpcF8yNGhvdXJzIiwiZjJiX0JhblRpbWVUb29sdGlwXzdkYXlzIiwiZjJiX0JhblRpbWVUb29sdGlwX25vdGUiLCJmaW5kdGltZSIsImYyYl9GaW5kVGltZVRvb2x0aXBfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF93aW5kb3dfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF8xMG1pbiIsImYyYl9GaW5kVGltZVRvb2x0aXBfMzBtaW4iLCJmMmJfRmluZFRpbWVUb29sdGlwXzFob3VyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF9ub3RlIiwiUEJYRmlyZXdhbGxNYXhSZXFTZWMiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hlYWRlciIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfZGVzYyIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfaG93X2l0X3dvcmtzIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVzX2hlYWRlciIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMTAiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzMwIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV8xMDAiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzMwMCIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfdW5saW1pdGVkIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9zY2VuYXJpb3NfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9zY2VuYXJpb18xIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9zY2VuYXJpb18yIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9zY2VuYXJpb18zIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfd2FybmluZyIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfbm90ZSIsIiQiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwidG9vbHRpcERhdGEiLCJjb250ZW50IiwiYnVpbGRGYWxsYmFja0NvbnRlbnQiLCJwb3B1cCIsImh0bWwiLCJkZWxheSIsInNob3ciLCJoaWRlIiwiYnVpbGRMaXN0IiwibGlzdEh0bWwiLCJmb3JFYWNoIiwiaXRlbSIsImkiLCJsaXN0S2V5IiwibGVuZ3RoIiwiZXhhbXBsZXNIZWFkZXIiLCJsaW5lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLHNCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSxvQ0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLHFFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7V0FDSSxzQkFBb0I7QUFDaEIsVUFBSTtBQUNBLFlBQU1DLGNBQWMsR0FBRyxLQUFLQyx3QkFBTCxFQUF2QixDQURBLENBR0E7O0FBQ0EsWUFBSSxPQUFPQyxjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQSxVQUFBQSxjQUFjLENBQUNDLFVBQWYsQ0FBMEJILGNBQTFCLEVBQTBDO0FBQ3RDSSxZQUFBQSxRQUFRLEVBQUUsa0JBRDRCO0FBRXRDQyxZQUFBQSxRQUFRLEVBQUUsV0FGNEI7QUFHdENDLFlBQUFBLFNBQVMsRUFBRSxJQUgyQjtBQUl0Q0MsWUFBQUEsU0FBUyxFQUFFO0FBSjJCLFdBQTFDO0FBTUgsU0FQRCxNQU9PO0FBQ0g7QUFDQUMsVUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsNkRBQWI7QUFDQSxlQUFLQyxrQkFBTCxDQUF3QlYsY0FBeEI7QUFDSDtBQUNKLE9BaEJELENBZ0JFLE9BQU9XLEtBQVAsRUFBYztBQUNaSCxRQUFBQSxPQUFPLENBQUNHLEtBQVIsQ0FBYyx5Q0FBZCxFQUF5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LENBQXFCNkQsTUFBckIsR0FBOEIsQ0FBMUQsRUFBNkQ7QUFDekQsWUFBSWQsV0FBVyxDQUFDZSxjQUFoQixFQUFnQztBQUM1QlgsVUFBQUEsSUFBSSx5QkFBa0JKLFdBQVcsQ0FBQ2UsY0FBOUIsbUJBQUo7QUFDSDs7QUFDRFgsUUFBQUEsSUFBSSxJQUFJLDZEQUFSO0FBQ0FBLFFBQUFBLElBQUksSUFBSSw0Q0FBUjtBQUNBSixRQUFBQSxXQUFXLENBQUMvQyxRQUFaLENBQXFCeUQsT0FBckIsQ0FBNkIsVUFBQU0sSUFBSSxFQUFJO0FBQ2pDWixVQUFBQSxJQUFJLElBQUlZLElBQUksR0FBRyxJQUFmO0FBQ0gsU0FGRDtBQUdBWixRQUFBQSxJQUFJLElBQUksY0FBUjtBQUNILE9BOURvQyxDQWdFckM7OztBQUNBLFVBQUlKLFdBQVcsQ0FBQ2hFLElBQWhCLEVBQXNCO0FBQ2xCb0UsUUFBQUEsSUFBSSxxQkFBY0osV0FBVyxDQUFDaEUsSUFBMUIsY0FBSjtBQUNIOztBQUVELGFBQU9vRSxJQUFQO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBGYWlsMkJhbiBmb3JtIGZpZWxkc1xuICpcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgRmFpbDJCYW4gc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIGludHJ1c2lvbiBwcmV2ZW50aW9uIHBhcmFtZXRlcnMgYW5kIHdoaXRlbGlzdCBjb25maWd1cmF0aW9uLlxuICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBzeXN0ZW0gZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCByZW5kZXJpbmcuXG4gKlxuICogQGNsYXNzIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIEZhaWwyQmFuIGZvcm1cbiAgICAgKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IGJlaGF2aW9yXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIGFsbCB0b29sdGlwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBkaXJlY3QgaW1wbGVtZW50YXRpb24gaWYgVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZSwgdXNpbmcgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24nKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBGYWlsMkJhbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIEZhaWwyQmFuIGZpZWxkc1xuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gTWF4IHJldHJ5IGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIG1heHJldHJ5OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICczJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfM1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnNScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzEwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfMTBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBXaGl0ZWxpc3QgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgd2hpdGVsaXN0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9mb3JtYXRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICcxOTIuMTY4LjEuMTAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3NpbmdsZV9pcFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTAuMC4wLjAvOCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zdWJuZXRcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzE5Mi4xNjguMS4wLzI0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX2xvY2FsX25ldHdvcmtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzE3Mi4xNi4wLjAvMTInLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2NvbmZpZ19leGFtcGxlcyA/XG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMuc3BsaXQoJ3wnKSA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIE9mZmljZSBuZXR3b3JrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxOTIuMTY4LjEuMC8yNCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIFZQTiBzZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzEwLjguMC4xJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyMgUGFydG5lciBJUCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMjAzLjAuMTEzLjQ1J1xuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gQmFuIHRpbWUgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgYmFudGltZToge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfZHVyYXRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMzYwMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwXzFob3VyXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICc4NjQwMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwXzI0aG91cnNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzYwNDgwMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwXzdkYXlzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gRmluZCB0aW1lIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIGZpbmR0aW1lOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF93aW5kb3dfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnNjAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwXzEwbWluXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICcxODAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwXzMwbWluXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICczNjAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwXzFob3VyXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFBCWEZpcmV3YWxsTWF4UmVxU2VjIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTAgcmVxL3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMTBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzMwIHJlcS9zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzMwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICcxMDAgcmVxL3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICczMDAgcmVxL3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICfiiJ4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfdW5saW1pdGVkXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcENvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgY29udGVudCBtYW51YWxseVxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gdGhpcy5idWlsZEZhbGxiYWNrQ29udGVudCh0b29sdGlwRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRvb2x0aXAgY29udGVudCBmb3IgZmFsbGJhY2sgaW1wbGVtZW50YXRpb25cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRGYWxsYmFja0NvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKCF0b29sdGlwRGF0YSkgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlclxuICAgICAgICBpZiAodG9vbHRpcERhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvblxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbGlzdHNcbiAgICAgICAgY29uc3QgYnVpbGRMaXN0ID0gKGxpc3QpID0+IHtcbiAgICAgICAgICAgIGxldCBsaXN0SHRtbCA9ICc8dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaXN0SHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgcmV0dXJuIGxpc3RIdG1sO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBhbGwgbGlzdHNcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGkgPT09IDEgPyAnbGlzdCcgOiBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhW2xpc3RLZXldICYmIHRvb2x0aXBEYXRhW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGJ1aWxkTGlzdCh0b29sdGlwRGF0YVtsaXN0S2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgd2FybmluZ1xuICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwO1wiPic7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBleGFtcGxlc1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXMgJiYgdG9vbHRpcERhdGEuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4O1wiPic7XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtO1wiPic7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5leGFtcGxlcy5mb3JFYWNoKGxpbmUgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSArICdcXG4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGVcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke3Rvb2x0aXBEYXRhLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbn0iXX0=