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
        // Security preset slider tooltip — concrete per-level values now live
        // in the metric panel under the slider, so we only keep the high-level
        // context (what the slider does + the operator warning) here.
        securityPreset: {
          header: globalTranslate.f2b_SecurityPresetTooltip_header,
          description: globalTranslate.f2b_SecurityPresetTooltip_desc,
          note: globalTranslate.f2b_SecurityPresetTooltip_note
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsInNlY3VyaXR5UHJlc2V0IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZjJiX1NlY3VyaXR5UHJlc2V0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfZGVzYyIsIm5vdGUiLCJmMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX25vdGUiLCJ3aGl0ZWxpc3QiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9oZWFkZXIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9mb3JtYXRfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrIiwibGlzdDIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMSIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8zIiwiZXhhbXBsZXMiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMiLCJzcGxpdCIsIndhcm5pbmciLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF93YXJuaW5nIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfbm90ZSIsIiQiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJkYXRhIiwidG9vbHRpcERhdGEiLCJjb250ZW50IiwiYnVpbGRGYWxsYmFja0NvbnRlbnQiLCJwb3B1cCIsImh0bWwiLCJkZWxheSIsInNob3ciLCJoaWRlIiwiYnVpbGRMaXN0IiwibGlzdEh0bWwiLCJmb3JFYWNoIiwiaXRlbSIsImkiLCJsaXN0S2V5IiwibGVuZ3RoIiwiZXhhbXBsZXNIZWFkZXIiLCJsaW5lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLHNCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSxvQ0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLHFFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7V0FDSSxzQkFBb0I7QUFDaEIsVUFBSTtBQUNBLFlBQU1DLGNBQWMsR0FBRyxLQUFLQyx3QkFBTCxFQUF2QixDQURBLENBR0E7O0FBQ0EsWUFBSSxPQUFPQyxjQUFQLEtBQTBCLFdBQTlCLEVBQTJDO0FBQ3ZDQSxV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LENBQUNaLE9BQVosQ0FBb0JFLElBQTlCLFNBQUo7QUFDSDs7QUFDRGMsUUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxPQWpEb0MsQ0FtRHJDOzs7QUFDQSxVQUFJSixXQUFXLENBQUNmLFFBQVosSUFBd0JlLFdBQVcsQ0FBQ2YsUUFBWixDQUFxQjZCLE1BQXJCLEdBQThCLENBQTFELEVBQTZEO0FBQ3pELFlBQUlkLFdBQVcsQ0FBQ2UsY0FBaEIsRUFBZ0M7QUFDNUJYLFVBQUFBLElBQUkseUJBQWtCSixXQUFXLENBQUNlLGNBQTlCLG1CQUFKO0FBQ0g7O0FBQ0RYLFFBQUFBLElBQUksSUFBSSw2REFBUjtBQUNBQSxRQUFBQSxJQUFJLElBQUksNENBQVI7QUFDQUosUUFBQUEsV0FBVyxDQUFDZixRQUFaLENBQXFCeUIsT0FBckIsQ0FBNkIsVUFBQU0sSUFBSSxFQUFJO0FBQ2pDWixVQUFBQSxJQUFJLElBQUlZLElBQUksR0FBRyxJQUFmO0FBQ0gsU0FGRDtBQUdBWixRQUFBQSxJQUFJLElBQUksY0FBUjtBQUNILE9BOURvQyxDQWdFckM7OztBQUNBLFVBQUlKLFdBQVcsQ0FBQ25DLElBQWhCLEVBQXNCO0FBQ2xCdUMsUUFBQUEsSUFBSSxxQkFBY0osV0FBVyxDQUFDbkMsSUFBMUIsY0FBSjtBQUNIOztBQUVELGFBQU91QyxJQUFQO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgLSBNYW5hZ2VzIHRvb2x0aXBzIGZvciBGYWlsMkJhbiBmb3JtIGZpZWxkc1xuICpcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgRmFpbDJCYW4gc2V0dGluZ3MgZmllbGRzLFxuICogaGVscGluZyB1c2VycyB1bmRlcnN0YW5kIGludHJ1c2lvbiBwcmV2ZW50aW9uIHBhcmFtZXRlcnMgYW5kIHdoaXRlbGlzdCBjb25maWd1cmF0aW9uLlxuICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBzeXN0ZW0gZm9yIGNvbnNpc3RlbnQgdG9vbHRpcCByZW5kZXJpbmcuXG4gKlxuICogQGNsYXNzIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgRmFpbDJCYW5Ub29sdGlwTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICogUHJpdmF0ZSBjb25zdHJ1Y3RvciB0byBwcmV2ZW50IGluc3RhbnRpYXRpb25cbiAgICAgKiBUaGlzIGNsYXNzIHVzZXMgc3RhdGljIG1ldGhvZHMgZm9yIHV0aWxpdHkgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWwyQmFuVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCB0b29sdGlwcyBmb3IgdGhlIEZhaWwyQmFuIGZvcm1cbiAgICAgKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIGZvciBjb25zaXN0ZW50IGJlaGF2aW9yXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHRoaXMuZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBUb29sdGlwQnVpbGRlciB0byBpbml0aWFsaXplIGFsbCB0b29sdGlwc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdG9yOiAnLmZpZWxkLWluZm8taWNvbicsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBkaXJlY3QgaW1wbGVtZW50YXRpb24gaWYgVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignVG9vbHRpcEJ1aWxkZXIgbm90IGF2YWlsYWJsZSwgdXNpbmcgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24nKTtcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBGYWlsMkJhbiB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIEZhaWwyQmFuIGZpZWxkc1xuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIGZpZWxkIG5hbWVzIGFzIGtleXMgYW5kIHRvb2x0aXAgZGF0YSBhcyB2YWx1ZXNcbiAgICAgKi9cbiAgICBzdGF0aWMgZ2V0VG9vbHRpcENvbmZpZ3VyYXRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gU2VjdXJpdHkgcHJlc2V0IHNsaWRlciB0b29sdGlwIOKAlCBjb25jcmV0ZSBwZXItbGV2ZWwgdmFsdWVzIG5vdyBsaXZlXG4gICAgICAgICAgICAvLyBpbiB0aGUgbWV0cmljIHBhbmVsIHVuZGVyIHRoZSBzbGlkZXIsIHNvIHdlIG9ubHkga2VlcCB0aGUgaGlnaC1sZXZlbFxuICAgICAgICAgICAgLy8gY29udGV4dCAod2hhdCB0aGUgc2xpZGVyIGRvZXMgKyB0aGUgb3BlcmF0b3Igd2FybmluZykgaGVyZS5cbiAgICAgICAgICAgIHNlY3VyaXR5UHJlc2V0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1NlY3VyaXR5UHJlc2V0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gV2hpdGVsaXN0IGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIHdoaXRlbGlzdDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMgP1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfY29uZmlnX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAnIyBPZmZpY2UgbmV0d29yaycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMTkyLjE2OC4xLjAvMjQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnIyBWUE4gc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxMC44LjAuMScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIFBhcnRuZXIgSVAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzIwMy4wLjExMy40NSdcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBDb25maWdzIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpIHtcbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCB0b29sdGlwIGNvbnRlbnQgbWFudWFsbHlcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IHRoaXMuYnVpbGRGYWxsYmFja0NvbnRlbnQodG9vbHRpcERhdGEpO1xuXG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB0b29sdGlwIGNvbnRlbnQgZm9yIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkRmFsbGJhY2tDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICghdG9vbHRpcERhdGEpIHJldHVybiAnJztcblxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIC8vIEFkZCBoZWFkZXJcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb25cbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGxpc3RzXG4gICAgICAgIGNvbnN0IGJ1aWxkTGlzdCA9IChsaXN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgbGlzdEh0bWwgPSAnPHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGlzdEh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIHJldHVybiBsaXN0SHRtbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgYWxsIGxpc3RzXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBpID09PSAxID8gJ2xpc3QnIDogYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YVtsaXN0S2V5XSAmJiB0b29sdGlwRGF0YVtsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGFbbGlzdEtleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmdcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDtcIj4nO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZXhhbXBsZXNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzICYmIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHt0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTtcIj4nO1xuICAgICAgICAgICAgdG9vbHRpcERhdGEuZXhhbXBsZXMuZm9yRWFjaChsaW5lID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgKyAnXFxuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBub3RlXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHt0b29sdGlwRGF0YS5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG59Il19