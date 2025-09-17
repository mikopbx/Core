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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsIm1heHJldHJ5IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZjJiX01heFJldHJ5VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJkZWZpbml0aW9uIiwiZjJiX01heFJldHJ5VG9vbHRpcF9ob3dfaXRfd29ya3NfZGVzYyIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX01heFJldHJ5VG9vbHRpcF9leGFtcGxlXzMiLCJmMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfNSIsImYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8xMCIsIndhcm5pbmciLCJmMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwidGV4dCIsImYyYl9NYXhSZXRyeVRvb2x0aXBfd2FybmluZyIsIm5vdGUiLCJmMmJfTWF4UmV0cnlUb29sdGlwX25vdGUiLCJ3aGl0ZWxpc3QiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2hlYWRlciIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrIiwibGlzdDIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zIiwiZXhhbXBsZXMiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMiLCJzcGxpdCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGUiLCJiYW50aW1lIiwiZjJiX0JhblRpbWVUb29sdGlwX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0JhblRpbWVUb29sdGlwX2R1cmF0aW9uX2hlYWRlciIsImYyYl9CYW5UaW1lVG9vbHRpcF8xaG91ciIsImYyYl9CYW5UaW1lVG9vbHRpcF8yNGhvdXJzIiwiZjJiX0JhblRpbWVUb29sdGlwXzdkYXlzIiwiZjJiX0JhblRpbWVUb29sdGlwX25vdGUiLCJmaW5kdGltZSIsImYyYl9GaW5kVGltZVRvb2x0aXBfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF9kZXNjIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF93aW5kb3dfaGVhZGVyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF8xMG1pbiIsImYyYl9GaW5kVGltZVRvb2x0aXBfMzBtaW4iLCJmMmJfRmluZFRpbWVUb29sdGlwXzFob3VyIiwiZjJiX0ZpbmRUaW1lVG9vbHRpcF9ub3RlIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZEZhbGxiYWNrQ29udGVudCIsInBvcHVwIiwiaHRtbCIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJidWlsZExpc3QiLCJsaXN0SHRtbCIsImZvckVhY2giLCJpdGVtIiwiaSIsImxpc3RLZXkiLCJsZW5ndGgiLCJleGFtcGxlc0hlYWRlciIsImxpbmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsc0I7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNJLG9DQUFjO0FBQUE7O0FBQ1YsVUFBTSxJQUFJQyxLQUFKLENBQVUscUVBQVYsQ0FBTjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLHNCQUFvQjtBQUNoQixVQUFJO0FBQ0EsWUFBTUMsY0FBYyxHQUFHLEtBQUtDLHdCQUFMLEVBQXZCLENBREEsQ0FHQTs7QUFDQSxZQUFJLE9BQU9DLGNBQVAsS0FBMEIsV0FBOUIsRUFBMkM7QUFDdkNBLFVBQUFBLGNBQWMsQ0FBQ0MsVUFBZixDQUEwQkgsY0FBMUIsRUFBMEM7QUFDdENJLFlBQUFBLFFBQVEsRUFBRSxrQkFENEI7QUFFdENDLFlBQUFBLFFBQVEsRUFBRSxXQUY0QjtBQUd0Q0MsWUFBQUEsU0FBUyxFQUFFLElBSDJCO0FBSXRDQyxZQUFBQSxTQUFTLEVBQUU7QUFKMkIsV0FBMUM7QUFNSCxTQVBELE1BT087QUFDSDtBQUNBQyxVQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSw2REFBYjtB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QUFBQSxJQUFJLHlCQUFrQkosV0FBVyxDQUFDZSxjQUE5QixtQkFBSjtBQUNIOztBQUNEWCxRQUFBQSxJQUFJLElBQUksNkRBQVI7QUFDQUEsUUFBQUEsSUFBSSxJQUFJLDRDQUFSO0FBQ0FKLFFBQUFBLFdBQVcsQ0FBQzdCLFFBQVosQ0FBcUJ1QyxPQUFyQixDQUE2QixVQUFBTSxJQUFJLEVBQUk7QUFDakNaLFVBQUFBLElBQUksSUFBSVksSUFBSSxHQUFHLElBQWY7QUFDSCxTQUZEO0FBR0FaLFFBQUFBLElBQUksSUFBSSxjQUFSO0FBQ0gsT0E5RG9DLENBZ0VyQzs7O0FBQ0EsVUFBSUosV0FBVyxDQUFDOUMsSUFBaEIsRUFBc0I7QUFDbEJrRCxRQUFBQSxJQUFJLHFCQUFjSixXQUFXLENBQUM5QyxJQUExQixjQUFKO0FBQ0g7O0FBRUQsYUFBT2tELElBQVA7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxUcmFuc2xhdGUsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogRmFpbDJCYW5Ub29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEZhaWwyQmFuIGZvcm0gZmllbGRzXG4gKlxuICogVGhpcyBjbGFzcyBwcm92aWRlcyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBGYWlsMkJhbiBzZXR0aW5ncyBmaWVsZHMsXG4gKiBoZWxwaW5nIHVzZXJzIHVuZGVyc3RhbmQgaW50cnVzaW9uIHByZXZlbnRpb24gcGFyYW1ldGVycyBhbmQgd2hpdGVsaXN0IGNvbmZpZ3VyYXRpb24uXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqXG4gKiBAY2xhc3MgRmFpbDJCYW5Ub29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3MgdXNlcyBzdGF0aWMgbWV0aG9kcyBmb3IgdXRpbGl0eSBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbDJCYW5Ub29sdGlwTWFuYWdlciBpcyBhIHN0YXRpYyBjbGFzcyBhbmQgY2Fubm90IGJlIGluc3RhbnRpYXRlZCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIHRvb2x0aXBzIGZvciB0aGUgRmFpbDJCYW4gZm9ybVxuICAgICAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgZm9yIGNvbnNpc3RlbnQgYmVoYXZpb3JcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKTtcblxuICAgICAgICAgICAgLy8gVXNlIFRvb2x0aXBCdWlsZGVyIHRvIGluaXRpYWxpemUgYWxsIHRvb2x0aXBzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0b3I6ICcuZmllbGQtaW5mby1pY29uJyxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRpcmVjdCBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdUb29sdGlwQnVpbGRlciBub3QgYXZhaWxhYmxlLCB1c2luZyBmYWxsYmFjayBpbXBsZW1lbnRhdGlvbicpO1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZhbGxiYWNrKHRvb2x0aXBDb25maWdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIEZhaWwyQmFuIHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgRmFpbDJCYW4gZmllbGRzXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAvLyBNYXggcmV0cnkgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgbWF4cmV0cnk6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfaG93X2l0X3dvcmtzX2Rlc2MsXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8zXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICc1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX2V4YW1wbGVfNVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfZXhhbXBsZV8xMFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9NYXhSZXRyeVRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfTWF4UmV0cnlUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIFdoaXRlbGlzdCBmaWVsZCB0b29sdGlwXG4gICAgICAgICAgICB3aGl0ZWxpc3Q6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9mb3JtYXRfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVzX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzE5Mi4xNjguMS4xMDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfc2luZ2xlX2lwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICcxMC4wLjAuMC84JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTkyLjE2OC4xLjAvMjQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29ya1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnMTcyLjE2LjAuMC8xMicsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9wcml2YXRlX25ldHdvcmtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDI6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfY29uZmlnX2V4YW1wbGVzID9cbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2NvbmZpZ19leGFtcGxlcy5zcGxpdCgnfCcpIDogW1xuICAgICAgICAgICAgICAgICAgICAgICAgJyMgT2ZmaWNlIG5ldHdvcmsnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzE5Mi4xNjguMS4wLzI0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyMgVlBOIHNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMTAuOC4wLjEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnIyBQYXJ0bmVyIElQJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcyMDMuMC4xMTMuNDUnXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBCYW4gdGltZSBmaWVsZCB0b29sdGlwXG4gICAgICAgICAgICBiYW50aW1lOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX0JhblRpbWVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9kdXJhdGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICczNjAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfMWhvdXJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzg2NDAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfMjRob3Vyc1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnNjA0ODAwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfQmFuVGltZVRvb2x0aXBfN2RheXNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9CYW5UaW1lVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBGaW5kIHRpbWUgZmllbGQgdG9vbHRpcFxuICAgICAgICAgICAgZmluZHRpbWU6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfRmluZFRpbWVUb29sdGlwX3dpbmRvd19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICc2MDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfMTBtaW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzE4MDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfMzBtaW5cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogJzM2MDAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfMWhvdXJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9GaW5kVGltZVRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEZhbGxiYWNrIGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGVcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcENvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgY29udGVudCBtYW51YWxseVxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gdGhpcy5idWlsZEZhbGxiYWNrQ29udGVudCh0b29sdGlwRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRvb2x0aXAgY29udGVudCBmb3IgZmFsbGJhY2sgaW1wbGVtZW50YXRpb25cbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRGYWxsYmFja0NvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKCF0b29sdGlwRGF0YSkgcmV0dXJuICcnO1xuXG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgLy8gQWRkIGhlYWRlclxuICAgICAgICBpZiAodG9vbHRpcERhdGEuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvblxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgbGlzdHNcbiAgICAgICAgY29uc3QgYnVpbGRMaXN0ID0gKGxpc3QpID0+IHtcbiAgICAgICAgICAgIGxldCBsaXN0SHRtbCA9ICc8dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+JztcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWwgc3R5bGU9XCJtYXJnaW46IDAuNWVtIDA7IHBhZGRpbmctbGVmdDogMS41ZW07XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBsaXN0SHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgcmV0dXJuIGxpc3RIdG1sO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBhbGwgbGlzdHNcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGkgPT09IDEgPyAnbGlzdCcgOiBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhW2xpc3RLZXldICYmIHRvb2x0aXBEYXRhW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGJ1aWxkTGlzdCh0b29sdGlwRGF0YVtsaXN0S2V5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgd2FybmluZ1xuICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwO1wiPic7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBleGFtcGxlc1xuICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXMgJiYgdG9vbHRpcERhdGEuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke3Rvb2x0aXBEYXRhLmV4YW1wbGVzSGVhZGVyfTo8L3N0cm9uZz48L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCIgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZjhmOGY4O1wiPic7XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwibWFyZ2luOiAwOyBmb250LXNpemU6IDAuOWVtO1wiPic7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5leGFtcGxlcy5mb3JFYWNoKGxpbmUgPT4ge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gbGluZSArICdcXG4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIG5vdGVcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxlbT4ke3Rvb2x0aXBEYXRhLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbn0iXX0=