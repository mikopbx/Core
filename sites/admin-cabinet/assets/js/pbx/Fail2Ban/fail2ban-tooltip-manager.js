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
        // Security preset slider tooltip
        securityPreset: {
          header: globalTranslate.f2b_SecurityPresetTooltip_header,
          description: globalTranslate.f2b_SecurityPresetTooltip_desc,
          list: [{
            term: globalTranslate.f2b_SecurityPresetTooltip_levels_header,
            definition: null
          }, globalTranslate.f2b_SecurityPresetTooltip_level_weak, globalTranslate.f2b_SecurityPresetTooltip_level_normal, globalTranslate.f2b_SecurityPresetTooltip_level_enhanced, globalTranslate.f2b_SecurityPresetTooltip_level_paranoid],
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GYWlsMkJhbi9mYWlsMmJhbi10b29sdGlwLW1hbmFnZXIuanMiXSwibmFtZXMiOlsiRmFpbDJCYW5Ub29sdGlwTWFuYWdlciIsIkVycm9yIiwidG9vbHRpcENvbmZpZ3MiLCJnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMiLCJUb29sdGlwQnVpbGRlciIsImluaXRpYWxpemUiLCJzZWxlY3RvciIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwidmFyaWF0aW9uIiwiY29uc29sZSIsIndhcm4iLCJpbml0aWFsaXplRmFsbGJhY2siLCJlcnJvciIsInNlY3VyaXR5UHJlc2V0IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZjJiX1NlY3VyaXR5UHJlc2V0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsImYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfZGVzYyIsImxpc3QiLCJ0ZXJtIiwiZjJiX1NlY3VyaXR5UHJlc2V0VG9vbHRpcF9sZXZlbHNfaGVhZGVyIiwiZGVmaW5pdGlvbiIsImYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfbGV2ZWxfd2VhayIsImYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfbGV2ZWxfbm9ybWFsIiwiZjJiX1NlY3VyaXR5UHJlc2V0VG9vbHRpcF9sZXZlbF9lbmhhbmNlZCIsImYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfbGV2ZWxfcGFyYW5vaWQiLCJub3RlIiwiZjJiX1NlY3VyaXR5UHJlc2V0VG9vbHRpcF9ub3RlIiwid2hpdGVsaXN0IiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfaGVhZGVyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZGVzYyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9oZWFkZXIiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9mb3JtYXRfZGVzYyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVzX2hlYWRlciIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfc2luZ2xlX2lwIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zdWJuZXQiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX2xvY2FsX25ldHdvcmsiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3ByaXZhdGVfbmV0d29yayIsImxpc3QyIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzEiLCJmMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8yIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fMyIsImV4YW1wbGVzIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfY29uZmlnX2V4YW1wbGVzIiwic3BsaXQiLCJ3YXJuaW5nIiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZ19oZWFkZXIiLCJ0ZXh0IiwiZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZyIsImYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGUiLCIkIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsIiRpY29uIiwiZmllbGROYW1lIiwiZGF0YSIsInRvb2x0aXBEYXRhIiwiY29udGVudCIsImJ1aWxkRmFsbGJhY2tDb250ZW50IiwicG9wdXAiLCJodG1sIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsImJ1aWxkTGlzdCIsImxpc3RIdG1sIiwiZm9yRWFjaCIsIml0ZW0iLCJpIiwibGlzdEtleSIsImxlbmd0aCIsImV4YW1wbGVzSGVhZGVyIiwibGluZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxzQjtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ks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QyxJQUFoQixFQUFzQjtBQUNsQm9DLFFBQUFBLElBQUkscUJBQWNKLFdBQVcsQ0FBQ2hDLElBQTFCLGNBQUo7QUFDSDs7QUFFRCxhQUFPb0MsSUFBUDtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIC0gTWFuYWdlcyB0b29sdGlwcyBmb3IgRmFpbDJCYW4gZm9ybSBmaWVsZHNcbiAqXG4gKiBUaGlzIGNsYXNzIHByb3ZpZGVzIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIEZhaWwyQmFuIHNldHRpbmdzIGZpZWxkcyxcbiAqIGhlbHBpbmcgdXNlcnMgdW5kZXJzdGFuZCBpbnRydXNpb24gcHJldmVudGlvbiBwYXJhbWV0ZXJzIGFuZCB3aGl0ZWxpc3QgY29uZmlndXJhdGlvbi5cbiAqIFVzZXMgdGhlIHVuaWZpZWQgVG9vbHRpcEJ1aWxkZXIgc3lzdGVtIGZvciBjb25zaXN0ZW50IHRvb2x0aXAgcmVuZGVyaW5nLlxuICpcbiAqIEBjbGFzcyBGYWlsMkJhblRvb2x0aXBNYW5hZ2VyXG4gKi9cbmNsYXNzIEZhaWwyQmFuVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsMkJhblRvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHMgZm9yIHRoZSBGYWlsMkJhbiBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqXG4gICAgICogQHN0YXRpY1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpO1xuXG4gICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1Rvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGUsIHVzaW5nIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgRmFpbDJCYW4gdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCB0b29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBGYWlsMkJhbiBmaWVsZHNcbiAgICAgKlxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCBmaWVsZCBuYW1lcyBhcyBrZXlzIGFuZCB0b29sdGlwIGRhdGEgYXMgdmFsdWVzXG4gICAgICovXG4gICAgc3RhdGljIGdldFRvb2x0aXBDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC8vIFNlY3VyaXR5IHByZXNldCBzbGlkZXIgdG9vbHRpcFxuICAgICAgICAgICAgc2VjdXJpdHlQcmVzZXQ6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX2xldmVsc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX2xldmVsX3dlYWssXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX2xldmVsX25vcm1hbCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfbGV2ZWxfZW5oYW5jZWQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfU2VjdXJpdHlQcmVzZXRUb29sdGlwX2xldmVsX3BhcmFub2lkLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9TZWN1cml0eVByZXNldFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gV2hpdGVsaXN0IGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIHdoaXRlbGlzdDoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZm9ybWF0X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2Zvcm1hdF9kZXNjLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfZXhhbXBsZV9zaW5nbGVfaXAsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9leGFtcGxlX3N1Ym5ldCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfbG9jYWxfbmV0d29yayxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX2V4YW1wbGVfcHJpdmF0ZV9uZXR3b3JrXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3JlY29tbWVuZGF0aW9uXzEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9yZWNvbW1lbmRhdGlvbl8yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfcmVjb21tZW5kYXRpb25fM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IGdsb2JhbFRyYW5zbGF0ZS5mMmJfV2hpdGVsaXN0VG9vbHRpcF9jb25maWdfZXhhbXBsZXMgP1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfY29uZmlnX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAnIyBPZmZpY2UgbmV0d29yaycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMTkyLjE2OC4xLjAvMjQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnIyBWUE4gc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxMC44LjAuMScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcjIFBhcnRuZXIgSVAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJzIwMy4wLjExMy40NSdcbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZjJiX1doaXRlbGlzdFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmYyYl9XaGl0ZWxpc3RUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbiBpZiBUb29sdGlwQnVpbGRlciBpcyBub3QgYXZhaWxhYmxlXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBDb25maWdzIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpIHtcbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCB0b29sdGlwIGNvbnRlbnQgbWFudWFsbHlcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IHRoaXMuYnVpbGRGYWxsYmFja0NvbnRlbnQodG9vbHRpcERhdGEpO1xuXG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB0b29sdGlwIGNvbnRlbnQgZm9yIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uXG4gICAgICpcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICovXG4gICAgc3RhdGljIGJ1aWxkRmFsbGJhY2tDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIGlmICghdG9vbHRpcERhdGEpIHJldHVybiAnJztcblxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIC8vIEFkZCBoZWFkZXJcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb25cbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGxpc3RzXG4gICAgICAgIGNvbnN0IGJ1aWxkTGlzdCA9IChsaXN0KSA9PiB7XG4gICAgICAgICAgICBsZXQgbGlzdEh0bWwgPSAnPHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPic7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBsaXN0SHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwOyBwYWRkaW5nLWxlZnQ6IDEuNWVtO1wiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbGlzdEh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIHJldHVybiBsaXN0SHRtbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgYWxsIGxpc3RzXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBpID09PSAxID8gJ2xpc3QnIDogYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YVtsaXN0S2V5XSAmJiB0b29sdGlwRGF0YVtsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGFbbGlzdEtleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHdhcm5pbmdcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDtcIj4nO1xuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke3Rvb2x0aXBEYXRhLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgZXhhbXBsZXNcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmV4YW1wbGVzICYmIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPjxzdHJvbmc+JHt0b29sdGlwRGF0YS5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTtcIj4nO1xuICAgICAgICAgICAgdG9vbHRpcERhdGEuZXhhbXBsZXMuZm9yRWFjaChsaW5lID0+IHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgKyAnXFxuJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBub3RlXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHt0b29sdGlwRGF0YS5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG59Il19