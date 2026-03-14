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
          }, globalTranslate.f2b_WhitelistTooltip_example_single_ip, globalTranslate.f2b_WhitelistTooltip_example_subnet, globalTranslate.f2b_WhitelistTooltip_example_local_network, globalTranslate.f2b_WhitelistTooltip_example_private_network],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsIm1heHJldHJ5IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZjJiX01heFJldHJ5VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJkZWZpbml0aW9uIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzMiLCJmMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfNSIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8xMCIsIndhcm5pbmciLCJmMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwidGV4dCIsImYyYl9NYXhSZXRyeVRvb2x0aXBfd2FybmluZyIsIm5vdGUiLCJmMmJfTWF4UmV0cnlUb29sdGlwX25vdGUiLCJ3aGl0ZWxpc3QiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2hlYWRlciIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrIiwibGlzdDIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zIiwiZXhhbXBsZXMiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMiLCJzcGxpdCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGUiLCJiYW50aW1lIiwiZjJiX0JhblRpbWVUb29sdGlwX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0JhblRpbWVUb29sdGlwX2R1cmF0aW9uX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF8xaG91ciIsImYyYl9CYW5UaW1lVG9vbHRpcF8yNGhvdXJzIiwiZjJiX0JhblRpbWVUb29sdGlwXzdkYXlzIiwiZjJiX0JhblRpbWVUb29sdGlwX25vdGUiLCJmaW5kdGltZSIsImYyYl9GaW5kVGltZVRvb2x0aXBfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF93aW5kb3dfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF8xMG1pbiIsImYyYl9GaW5kVGltZVRvb2x0aXBfMzBtaW4iLCJmMmJfRmluZFRpbWVUb29sdGlwXzFob3VyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF8zaG91cnMiLCJmMmJfRmluZFRpbWVUb29sdGlwX25vdGUiLCJQQlhGaXJld2FsbE1heFJlcVNlYyIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9kZXNjIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ob3dfaXRfd29ya3MiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZXNfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV8xMCIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzEwMCIsImYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAwIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV91bmxpbWl0ZWQiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvc19oZWFkZXIiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzEiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzIiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzMiLCJmMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF93YXJuaW5nIiwiZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ub3RlIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZEZhbGxiYWNrQ29udGVudCIsInBvcHVwIiwiaHRtbCIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJidWlsZExpc3QiLCJsaXN0SHRtbCIsImZvckVhY2giLCJpdGVtIiwiaSIsImxpc3RLZXkiLCJsZW5ndGgiLCJleGFtcGxlc0hlYWRlciIsImxpbmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsc0I7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLG9DQUFjO0FBQUE7O0FBQ1YsVUFBTSxJQUFJQyxLQUFKLENBQVUscUVBQVYsQ0FBTjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLHNCQUFvQjtBQUNoQixVQUFJO0FBQ0EsWUFBTUMsY0FBYyxHQUFHLEtBQUtDLHdCQUFMLEVBQXZCLENBREEsQ0FHQTs7QUFDQSxZQUFJLE9BQU9DLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQkgsY0FBMUIsRUFBMEM7QUFDdENJLFlBQUFBLFFBQVEsRUFBRSxrQkFENEI7QUFFdENDLFlBQUFBLFFBQVEsRUFBRSxXQUY0QjtBQUd0Q0MsWUFBQUEsU0FBUyxFQUFFLElBSDJCO0FBSXRDQyxZQUFBQSxTQUFTLEVBQUU7QUFKMkIsV0FBMUM7QUFNSCxTQVBELE1BT087QUFDSDtBQUNBQyxVQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSw2REFBYjtBQUNBLGVBQUtDLGtCQUFMLENBQXdCVixjQUF4QjtBQUNIO0FBQ0osT0FoQkQsQ0FnQkUsT0FBT1csS0FBUCxFQUFjO0FBQ1pILFFBQUFBLE9B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Q3pELFlBQUlkLFdBQVcsQ0FBQ2UsY0FBaEIsRUFBZ0M7QUFDNUJYLFVBQUFBLElBQUkseUJBQWtCSixXQUFXLENBQUNlLGNBQTlCLG1CQUFKO0FBQ0g7O0FBQ0RYLFFBQUFBLElBQUksSUFBSSw2REFBUjtBQUNBQSxRQUFBQSxJQUFJLElBQUksNENBQVI7QUFDQUosUUFBQUEsV0FBVyxDQUFDaEQsUUFBWixDQUFxQjBELE9BQXJCLENBQTZCLFVBQUFNLElBQUksRUFBSTtBQUNqQ1osVUFBQUEsSUFBSSxJQUFJWSxJQUFJLEdBQUcsSUFBZjtBQUNILFNBRkQ7QUFHQVosUUFBQUEsSUFBSSxJQUFJLGNBQVI7QUFDSCxPQTlEb0MsQ0FnRXJDOzs7QUFDQSxVQUFJSixXQUFXLENBQUNqRSxJQUFoQixFQUFzQjtBQUNsQnFFLFFBQUFBLElBQUkscUJBQWNKLFdBQVcsQ0FBQ2pFLElBQTFCLGNBQUo7QUFDSDs7QUFFRCxhQUFPcUUsSUFBUDtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIC0gTWFuYWdlcyB0b29sdGlwcyBmb3IgRmFpbDJCYW4gZm9ybSBmaWVsZHNcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIEZhaWwyQmFuIHNldHRpbmdzIGZpZWxkcyxcbiAqIGhlbHBpbmcgdXNlcnMgdW5kZXJzdGFuZCBpbnRydXNpb24gcHJldmVudGlvbiBwYXJhbWV0ZXJzIGFuZCB3aGl0ZWxpc3QgY29uZmlndXJhdGlvbi5cbiAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgc3lzdGVtIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICpcbiAqIEBjbGFzcyBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHMgZm9yIHRoZSBGYWlsMkJhbiBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpO1xuXG4gICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1Rvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGUsIHVzaW5nIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgRmFpbDJCYW4gdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBGYWlsMkJhbiBmaWVsZHNcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCBmaWVsZCBuYW1lcyBhcyBrZXlzIGFuZCB0b29sdGlwIGRhdGEgYXMgdmFsdWVzXG4gICAgICovXG4gICAgc3RhdGljIGdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC8vIE1heCByZXRyeSBmaWVsZCB0b29sdGlwXG4gICAgICAgICAgICBtYXhyZXRyeToge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfaG93X2l0X3dvcmtzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfNSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8xMFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZjJiX01heFJldHJ5VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBXaGl0ZWxpc3QgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgd2hpdGVsaXN0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9mb3JtYXRfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3NpbmdsZV9pcCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfc3VibmV0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9sb2NhbF9uZXR3b3JrLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9wcml2YXRlX25ldHdvcmtcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2NvbmZpZ19leGFtcGxlcyA/XG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMuc3BsaXQoJ3wnKSA6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIE9mZmljZSBuZXR3b3JrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxOTIuMTY4LjEuMC8yNCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIFZQTiBzZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzEwLjguMC4xJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyMgUGFydG5lciBJUCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMjAzLjAuMTEzLjQ1J1xuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF93YXJuaW5nXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gQmFuIHRpbWUgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgYmFudGltZToge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfZHVyYXRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwXzFob3VyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwXzI0aG91cnMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfN2RheXNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gRmluZCB0aW1lIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIGZpbmR0aW1lOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF93aW5kb3dfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF8xMG1pbixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfMzBtaW4sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwXzFob3VyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX0ZpbmRUaW1lVG9vbHRpcF8zaG91cnNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFBCWEZpcmV3YWxsTWF4UmVxU2VjIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIFBCWEZpcmV3YWxsTWF4UmVxU2VjOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF9ob3dfaXRfd29ya3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX2hvd19pdF93b3Jrc19kZXNjLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV8xMCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3ZhbHVlXzEwMCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfdmFsdWVfMzAwLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF92YWx1ZV91bmxpbWl0ZWRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxpc3QyOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfUEJYRmlyZXdhbGxNYXhSZXFTZWNUb29sdGlwX3NjZW5hcmlvXzNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1BCWEZpcmV3YWxsTWF4UmVxU2VjVG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9QQlhGaXJld2FsbE1heFJlcVNlY1Rvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcENvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgY29udGVudCBtYW51YWxseVxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gdGhpcy5idWlsZEZhbGxiYWNrQ29udGVudCh0b29sdGlwRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRvb2x0aXAgY29udGVudCBmb3IgZmFsbGJhY2sgaW1wbGVtZW50YXRpb25cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRGYWxsYmFja0NvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKCF0b29sdGlwRGF0YSkgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlclxuICAgICAgICBpZiAodG9vbHRpcERhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvblxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbGlzdHNcbiAgICAgICAgY29uc3QgYnVpbGRMaXN0ID0gKGxpc3QpID0+IHtcbiAgICAgICAgICAgIGxldCBsaXN0SHRtbCA9ICc8dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaXN0SHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgcmV0dXJuIGxpc3RIdG1sO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBhbGwgbGlzdHNcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGkgPT09IDEgPyAnbGlzdCcgOiBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhW2xpc3RLZXldICYmIHRvb2x0aXBEYXRhW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGJ1aWxkTGlzdCh0b29sdGlwRGF0YVtsaXN0S2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgd2FybmluZ1xuICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwO1wiPic7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBleGFtcGxlc1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXMgJiYgdG9vbHRpcERhdGEuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4O1wiPic7XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtO1wiPic7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5leGFtcGxlcy5mb3JFYWNoKGxpbmUgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSArICdcXG4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGVcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke3Rvb2x0aXBEYXRhLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbn0iXX0=