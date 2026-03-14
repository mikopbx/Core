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
          }, globalTranslate.f2b_MaxRetryTooltip_example_3, globalTranslate.f2b_MaxRetryTooltip_example_5, globalTranslate.f2b_MaxRetryTooltip_example_10],
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
          }, globalTranslate.f2b_BanTimeTooltip_1hour, globalTranslate.f2b_BanTimeTooltip_24hours, globalTranslate.f2b_BanTimeTooltip_7days],
          note: globalTranslate.f2b_BanTimeTooltip_note
        },
        // Find time field tooltip
        findtime: {
          header: globalTranslate.f2b_FindTimeTooltip_header,
          description: globalTranslate.f2b_FindTimeTooltip_desc,
          list: [{
            term: globalTranslate.f2b_FindTimeTooltip_window_header,
            definition: null
          }, globalTranslate.f2b_FindTimeTooltip_10min, globalTranslate.f2b_FindTimeTooltip_30min, globalTranslate.f2b_FindTimeTooltip_1hour, globalTranslate.f2b_FindTimeTooltip_3hours],
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
          }, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_10, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_30, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_100, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_300, globalTranslate.f2b_PBXFirewallMaxReqSecTooltip_value_unlimited],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsIm1heHJldHJ5IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZjJiX01heFJldHJ5VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJkZWZpbml0aW9uIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzMiLCJmMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfNSIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8xMCIsIndhcm5pbmciLCJmMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwidGV4dCIsImYyYl9NYXhSZXRyeVRvb2x0aXBfd2FybmluZyIsIm5vdGUiLCJmMmJfTWF4UmV0cnlUb29sdGlwX25vdGUiLCJ3aGl0ZWxpc3QiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2hlYWRlciIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrIiwibGlzdDIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zIiwiZXhhbXBsZXMiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMiLCJzcGxpdCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGUiLCJiYW50aW1lIiwiZjJiX0JhblRpbWVUb29sdGlwX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0JhblRpbWVUb29sdGlwX2R1cmF0aW9uX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF8xaG91ciIsImYyYl9CYW5UaW1lVG9vbHRpcF8yNGhvdXJzIiwiZjJiX0JhblRpbWVUb29sdGlwXzdkYXlzIiwiZjJiX0JhblRpbWVUb29sdGlwX25vdGUiLCJmaW5kdGltZSIsImYyYl9GaW5kVGltZVRvb2x0aXBfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF93aW5kb3dfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF8xMG1pbiIsImYyYl9GaW5kVGltZVRvb2x0aXBfMzBtaW4iLCJmMmJfRmluZFRpbWVUb29sdGlwXzFob3VyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF8zaG91cnMiLCJmMmJfRmluZFRpbWVUb29sdGlwX25vdGUiLCJQQlhGaXJld2FsbE1heFJlcVNlYyIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9kZXNjIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ob3dfaXRfd29ya3MiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZXNfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV8xMCIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzEwMCIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAwIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV91bmxpbWl0ZWQiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvc19oZWFkZXIiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzEiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzIiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzMiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF93YXJuaW5nIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ub3RlIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZEZhbGxiYWNrQ29udGVudCIsInBvcHVwIiwiaHRtbCIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJidWlsZExpc3QiLCJsaXN0SHRtbCIsImZvckVhY2giLCJpdGVtIiwiaSIsImxpc3RLZXkiLCJsZW5ndGgiLCJleGFtcGxlc0hlYWRlciIsImxpbmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsc0I7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLG9DQUFjO0FBQUE7O0FBQ1YsVUFBTSxJQUFJQyxLQUFKLENBQVUscUVBQVYsQ0FBTjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLHNCQUFvQjtBQUNoQixVQUFJO0FBQ0EsWUFBTUMsY0FBYyxHQUFHLEtBQUtDLHdCQUFMLEVBQXZCLENBREEsQ0FHQTs7QUFDQSxZQUFJLE9BQU9DLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQkgsY0FBMUIsRUFBMEM7QUFDdENJLFlBQUFBLFFBQVEsRUFBRSxrQkFENEI7QUFFdENDLFlBQUFBLFFBQVEsRUFBRSxXQUY0QjtBQUd0Q0MsWUFBQUEsU0FBUyxFQUFFLElBSDJCO0FBSXRDQyxZQUFBQSxTQUFTLEVBQUU7QUFKMkIsV0FBMUM7QUFNSCxTQVBELE1BT087QUFDSDtBQUNBQyxVQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSw2REFBYjtBQUNBLGVBQUtDLGtCQUFMLENBQXdCVixjQUF4QjtBQUNIO0FBQ0osT0FoQkQsQ0FnQkUsT0FBT1csS0FBUCxFQUFjO0FBQ1pILFFBQUFBLE9B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QUFvQkUsSUFBeEIsRUFBOEI7QUFDMUJ1RSxVQUFBQSxJQUFJLGlCQUFVSixXQUFXLENBQUNyRSxPQUFaLENBQW9CRSxJQUE5QixTQUFKO0FBQ0g7O0FBQ0R1RSxRQUFBQSxJQUFJLElBQUksUUFBUjtBQUNILE9BakRvQyxDQW1EckM7OztBQUNBLFVBQUlKLFdBQVcsQ0FBQ2hELFFBQVosSUFBd0JnRCxXQUFXLENBQUNoRCxRQUFaLENBQXFCOEQsTUFBckIsR0FBOEIsQ0FBMUQsRUFBNkQ7QUFDekQsWUFBSWQsV0FBVyxDQUFDZSxjQUFoQixFQUFnQztBQUM1QlgsVUFBQUEsSUFBSSx5QkFBa0JKLFdBQVcsQ0FBQ2UsY0FBOUIsbUJBQUo7QUFDSDs7QUFDRFgsUUFBQUEsSUFBSSxJQUFJLDZEQUFSO0FBQ0FBLFFBQUFBLElBQUksSUFBSSw0Q0FBUjtBQUNBSixRQUFBQSxXQUFXLENBQUNoRCxRQUFaLENBQXFCMEQsT0FBckIsQ0FBNkIsVUFBQU0sSUFBSSxFQUFJO0FBQ2pDWixVQUFBQSxJQUFJLElBQUlZLElBQUksR0FBRyxJQUFmO0FBQ0gsU0FGRDtBQUdBWixRQUFBQSxJQUFJLElBQUksY0FBUjtBQUNILE9BOURvQyxDQWdFckM7OztBQUNBLFVBQUlKLFdBQVcsQ0FBQ2pFLElBQWhCLEVBQXNCO0FBQ2xCcUUsUUFBQUEsSUFBSSxxQkFBY0osV0FBVyxDQUFDakUsSUFBMUIsY0FBSjtBQUNIOztBQUVELGFBQU9xRSxJQUFQO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBGYWlsMkJhbiBmb3JtIGZpZWxkc1xuICpcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgRmFpbDJCYW4gc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIGludHJ1c2lvbiBwcmV2ZW50aW9uIHBhcmFtZXRlcnMgYW5kIHdoaXRlbGlzdCBjb25maWd1cmF0aW9uLlxuICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBzeXN0ZW0gZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCByZW5kZXJpbmcuXG4gKlxuICogQGNsYXNzIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIEZhaWwyQmFuIGZvcm1cbiAgICAgKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IGJlaGF2aW9yXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIGFsbCB0b29sdGlwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBkaXJlY3QgaW1wbGVtZW50YXRpb24gaWYgVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZSwgdXNpbmcgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24nKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBGYWlsMkJhbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIEZhaWwyQmFuIGZpZWxkc1xuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gTWF4IHJldHJ5IGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIG1heHJldHJ5OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV81LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzEwXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFdoaXRlbGlzdCBmaWVsZCB0b29sdGlwXG4gICAgICAgICAgICB3aGl0ZWxpc3Q6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9mb3JtYXRfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzE5Mi4xNjguMS4xMDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfc2luZ2xlX2lwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICcxMC4wLjAuMC84JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTkyLjE2OC4xLjAvMjQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29ya1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTcyLjE2LjAuMC8xMicsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9wcml2YXRlX25ldHdvcmtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfY29uZmlnX2V4YW1wbGVzID9cbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2NvbmZpZ19leGFtcGxlcy5zcGxpdCgnfCcpIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgJyMgT2ZmaWNlIG5ldHdvcmsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzE5Mi4xNjguMS4wLzI0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyMgVlBOIHNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMTAuOC4wLjEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnIyBQYXJ0bmVyIElQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcyMDMuMC4xMTMuNDUnXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBCYW4gdGltZSBmaWVsZCB0b29sdGlwXG4gICAgICAgICAgICBiYW50aW1lOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9kdXJhdGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfMWhvdXIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfMjRob3VycyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF83ZGF5c1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBGaW5kIHRpbWUgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgZmluZHRpbWU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX3dpbmRvd19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwXzEwbWluLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF8zMG1pbixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfMWhvdXIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwXzNob3Vyc1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gUEJYRmlyZXdhbGxNYXhSZXFTZWMgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgUEJYRmlyZXdhbGxNYXhSZXFTZWM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfaG93X2l0X3dvcmtzX2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzEwLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV8zMCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMTAwLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV8zMDAsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlX3VubGltaXRlZFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfc2NlbmFyaW9zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfc2NlbmFyaW9fMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfc2NlbmFyaW9fMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfc2NlbmFyaW9fM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gaWYgVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwQ29uZmlncyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZUZhbGxiYWNrKHRvb2x0aXBDb25maWdzKSB7XG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBjb250ZW50IG1hbnVhbGx5XG4gICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSB0aGlzLmJ1aWxkRmFsbGJhY2tDb250ZW50KHRvb2x0aXBEYXRhKTtcblxuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgdG9vbHRpcCBjb250ZW50IGZvciBmYWxsYmFjayBpbXBsZW1lbnRhdGlvblxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0b29sdGlwRGF0YSAtIFRvb2x0aXAgZGF0YVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZEZhbGxiYWNrQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICBpZiAoIXRvb2x0aXBEYXRhKSByZXR1cm4gJyc7XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICAvLyBBZGQgaGVhZGVyXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3Rvb2x0aXBEYXRhLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBsaXN0c1xuICAgICAgICBjb25zdCBidWlsZExpc3QgPSAobGlzdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGxpc3RIdG1sID0gJzx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj4nO1xuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxpc3RIdG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICByZXR1cm4gbGlzdEh0bWw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQWRkIGFsbCBsaXN0c1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0S2V5ID0gaSA9PT0gMSA/ICdsaXN0JyA6IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGFbbGlzdEtleV0gJiYgdG9vbHRpcERhdGFbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYnVpbGRMaXN0KHRvb2x0aXBEYXRhW2xpc3RLZXldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7XCI+JztcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke3Rvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHt0b29sdGlwRGF0YS53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGV4YW1wbGVzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlcyAmJiB0b29sdGlwRGF0YS5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD48c3Ryb25nPiR7dG9vbHRpcERhdGEuZXhhbXBsZXNIZWFkZXJ9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07XCI+JztcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmZvckVhY2gobGluZSA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lICsgJ1xcbic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbm90ZVxuICAgICAgICBpZiAodG9vbHRpcERhdGEubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7dG9vbHRpcERhdGEubm90ZX08L2VtPjwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxufSJdfQ==