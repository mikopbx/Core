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
 * AsteriskRestUserTooltipManager - Manages tooltips for ARI user form fields
 * 
 * This class provides tooltip configurations for ARI settings fields,
 * helping users understand Stasis applications and connection details.
 * Uses the unified TooltipBuilder system for consistent tooltip rendering.
 * 
 * @class AsteriskRestUserTooltipManager
 */
var AsteriskRestUserTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function AsteriskRestUserTooltipManager() {
    _classCallCheck(this, AsteriskRestUserTooltipManager);

    throw new Error('AsteriskRestUserTooltipManager is a static class and cannot be instantiated');
  }
  /**
   * Initialize all tooltips for the ARI user form
   * Uses the unified TooltipBuilder for consistent behavior
   * 
   * @static
   * @param {string} serverIP - Server IP address for connection examples
   */


  _createClass(AsteriskRestUserTooltipManager, null, [{
    key: "initialize",
    value: function initialize() {
      var serverIP = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      try {
        var tooltipConfigs = this.getTooltipConfigurations(serverIP); // Use TooltipBuilder to initialize all tooltips

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
        console.error('Failed to initialize ARI user tooltips:', error);
      }
    }
    /**
     * Get all tooltip configurations for ARI user fields
     * 
     * @static
     * @param {string} serverIP - Server IP address for connection examples
     * @returns {Object} Object with field names as keys and tooltip data as values
     */

  }, {
    key: "getTooltipConfigurations",
    value: function getTooltipConfigurations() {
      var serverIP = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
      return {
        // Applications field tooltip
        applications: {
          header: globalTranslate.ari_ApplicationsTooltip_header,
          description: globalTranslate.ari_ApplicationsTooltip_desc,
          list: [{
            term: globalTranslate.ari_ApplicationsTooltip_usage_header,
            definition: null
          }, globalTranslate.ari_ApplicationsTooltip_usage_desc, {
            term: globalTranslate.ari_ApplicationsTooltip_common_header,
            definition: null
          }, {
            term: 'ari-app',
            definition: globalTranslate.ari_ApplicationsTooltip_common_ari_app
          }, {
            term: 'stasis',
            definition: globalTranslate.ari_ApplicationsTooltip_common_stasis
          }, {
            term: 'external-media',
            definition: globalTranslate.ari_ApplicationsTooltip_common_external_media
          }, {
            term: 'bridge-app',
            definition: globalTranslate.ari_ApplicationsTooltip_common_bridge_app
          }, {
            term: 'channel-spy',
            definition: globalTranslate.ari_ApplicationsTooltip_common_channel_spy
          }],
          warning: {
            header: globalTranslate.ari_ApplicationsTooltip_warning_header,
            text: globalTranslate.ari_ApplicationsTooltip_warning
          },
          note: ''
        },
        // Connection info tooltip
        connection_info: {
          header: globalTranslate.ari_ConnectionInfoTooltip_header,
          description: globalTranslate.ari_ConnectionInfoTooltip_desc,
          list: [{
            term: globalTranslate.ari_ConnectionInfoTooltip_websocket_header,
            definition: null
          }, {
            term: globalTranslate.ari_ConnectionInfoTooltip_websocket_url,
            definition: "ws://".concat(serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder, ":8088/ari/events?app=[application]&subscribe=all")
          }, {
            term: globalTranslate.ari_ConnectionInfoTooltip_websocket_secure,
            definition: "wss://".concat(serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder, ":8089/ari/events?app=[application]&subscribe=all")
          }],
          list2: [{
            term: globalTranslate.ari_ConnectionInfoTooltip_rest_header,
            definition: null
          }, {
            term: globalTranslate.ari_ConnectionInfoTooltip_rest_url,
            definition: "http://".concat(serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder, ":8088/ari/")
          }, {
            term: globalTranslate.ari_ConnectionInfoTooltip_rest_secure,
            definition: "https://".concat(serverIP || globalTranslate.ari_ConnectionInfoTooltip_server_placeholder, ":8089/ari/")
          }],
          list3: [{
            term: globalTranslate.ari_ConnectionInfoTooltip_auth_header,
            definition: null
          }, globalTranslate.ari_ConnectionInfoTooltip_auth_desc],
          examples: globalTranslate.ari_ConnectionInfoTooltip_examples ? globalTranslate.ari_ConnectionInfoTooltip_examples.split('|') : [],
          examplesHeader: globalTranslate.ari_ConnectionInfoTooltip_examples_header,
          note: globalTranslate.ari_ConnectionInfoTooltip_note
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

  return AsteriskRestUserTooltipManager;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza1Jlc3RVc2Vycy9hc3Rlcmlzay1yZXN0LXVzZXItdG9vbHRpcC1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbIkFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlciIsIkVycm9yIiwic2VydmVySVAiLCJ0b29sdGlwQ29uZmlncyIsImdldFRvb2x0aXBDb25maWd1cmF0aW9ucyIsIlRvb2x0aXBCdWlsZGVyIiwiaW5pdGlhbGl6ZSIsInNlbGVjdG9yIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJ2YXJpYXRpb24iLCJjb25zb2xlIiwid2FybiIsImluaXRpYWxpemVGYWxsYmFjayIsImVycm9yIiwiYXBwbGljYXRpb25zIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYXJpX0FwcGxpY2F0aW9uc1Rvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF9kZXNjIiwibGlzdCIsInRlcm0iLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF91c2FnZV9oZWFkZXIiLCJkZWZpbml0aW9uIiwiYXJpX0FwcGxpY2F0aW9uc1Rvb2x0aXBfdXNhZ2VfZGVzYyIsImFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2NvbW1vbl9oZWFkZXIiLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF9jb21tb25fYXJpX2FwcCIsImFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2NvbW1vbl9zdGFzaXMiLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF9jb21tb25fZXh0ZXJuYWxfbWVkaWEiLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF9jb21tb25fYnJpZGdlX2FwcCIsImFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2NvbW1vbl9jaGFubmVsX3NweSIsIndhcm5pbmciLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJhcmlfQXBwbGljYXRpb25zVG9vbHRpcF93YXJuaW5nIiwibm90ZSIsImNvbm5lY3Rpb25faW5mbyIsImFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfaGVhZGVyIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9kZXNjIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF93ZWJzb2NrZXRfaGVhZGVyIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF93ZWJzb2NrZXRfdXJsIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9zZXJ2ZXJfcGxhY2Vob2xkZXIiLCJhcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3dlYnNvY2tldF9zZWN1cmUiLCJsaXN0MiIsImFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfcmVzdF9oZWFkZXIiLCJhcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3Jlc3RfdXJsIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9yZXN0X3NlY3VyZSIsImxpc3QzIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9hdXRoX2hlYWRlciIsImFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfYXV0aF9kZXNjIiwiZXhhbXBsZXMiLCJhcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX2V4YW1wbGVzIiwic3BsaXQiLCJleGFtcGxlc0hlYWRlciIsImFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyIiwiYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9ub3RlIiwiJCIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImRhdGEiLCJ0b29sdGlwRGF0YSIsImNvbnRlbnQiLCJidWlsZEZhbGxiYWNrQ29udGVudCIsInBvcHVwIiwiaHRtbCIsImRlbGF5Iiwic2hvdyIsImhpZGUiLCJidWlsZExpc3QiLCJsaXN0SHRtbCIsImZvckVhY2giLCJpdGVtIiwiaSIsImxpc3RLZXkiLCJsZW5ndGgiLCJsaW5lIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLDhCO0FBQ0Y7QUFDSjtBQUNBO0FBQ0E7QUFDSSw0Q0FBYztBQUFBOztBQUNWLFVBQU0sSUFBSUMsS0FBSixDQUFVLDZFQUFWLENBQU47QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLHNCQUFpQztBQUFBLFVBQWZDLFFBQWUsdUVBQUosRUFBSTs7QUFDN0IsVUFBSTtBQUNBLFlBQU1DLGNBQWMsR0FBRyxLQUFLQyx3QkFBTCxDQUE4QkYsUUFBOUIsQ0FBdkIsQ0FEQSxDQUdBOztBQUNBLFlBQUksT0FBT0csY0FBUCxLQUEwQixXQUE5QixFQUEyQztBQUN2Q0EsVUFBQUEsY0FBYyxDQUFDQyxVQUFmLENBQTBCSCxjQUExQixFQUEwQztBQUN0Q0ksWUFBQUEsUUFBUSxFQUFFLGtCQUQ0QjtBQUV0Q0MsWUFBQUEsUUFBUSxFQUFFLFdBRjRCO0FBR3RDQyxZQUFBQSxTQUFTLEVBQUUsSUFIMkI7QUFJdENDLFlBQUFBLFNBQVMsRUFBRTtBQUoyQixXQUExQztBQU1ILFNBUEQsTUFPTztBQUNIO0FBQ0FDLFVBQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLDZEQUFiO0FBQ0EsZUFBS0Msa0JBQUwsQ0FBd0JWLGNBQXhCO0FBQ0g7QUFDSixPQWhCRCxDQWdCRSxPQUFPVyxLQUFQLEVBQWM7QUFDWkgsUUFBQUEsT0FBTyxDQUFDRyxLQUFSLENBQWMseUNBQWQsRUFBeURBLEtBQXpEO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O1dBQ0ksb0NBQStDO0FBQUEsVUFBZlosUUFBZSx1RUFBSixFQUFJO0FBQzNDLGFBQU87QUFDSDtBQUNBYSxRQUFBQSxZQUFZLEVBQUU7QUFDVkMsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDLDhCQURkO0FBRVZDLFVBQUFBLFdBQVcsRUFBRUYsZUFBZSxDQUFDRyw0QkFGbkI7QUFHVkMsVUFBQUEsSUFBSSxFQUFFLENBQ0Y7QUFDSUMsWUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNNLG9DQUQxQjtBQUVJQyxZQUFBQSxVQUFVLEVBQUU7QUFGaEIsV0FERSxFQUtGUCxlQUFlLENBQUNRLGtDQUxkLEVBTUY7QUFDSUgsWUFBQUEsSUFBSSxFQUFFTCxlQUFlLENBQUNTLHFDQUQxQjtBQUVJRixZQUFBQSxVQUFVLEVBQUU7QUFGaEIsV0FORSxFQVVGO0FBQ0lGLFlBQUFBLElBQUksRUFBRSxTQURWO0FBRUlFLFlBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDVTtBQUZoQyxXQVZFLEVBY0Y7QUFDSUwsWUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUUsWUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNXO0FBRmhDLFdBZEUsRUFrQkY7QUFDSU4sWUFBQUEsSUFBSSxFQUFFLGdCQURWO0FBRUlFLFlBQUFBLFVBQVUsRUFBRVAsZUFBZSxDQUFDWTtBQUZoQyxXQWxCRSxFQXNCRjtBQUNJUCxZQUFBQSxJQUFJLEVBQUUsWUFEVjtBQUVJRSxZQUFBQSxVQUFVLEVBQUVQLGVBQWUsQ0FBQ2E7QUFGaEMsV0F0QkUsRUEwQkY7QUFDSVIsWUFBQUEsSUFBSSxFQUFFLGFBRFY7QUFFSUUsWUFBQUEsVUFBVSxFQUFFUCxlQUFlLENBQUNjO0FBRmhDLFdBMUJFLENBSEk7QUFrQ1ZDLFVBQUFBLE9BQU8sRUFBRTtBQUNMaEIsWUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNnQixzQ0FEbkI7QUFFTEMsWUFBQUEsSUFBSSxFQUFFakIsZUFBZSxDQUFDa0I7QUFGakIsV0FsQ0M7QUFzQ1ZDLFVBQUFBLElBQUksRUFBRTtBQXRDSSxTQUZYO0FBMkNIO0FBQ0FDLFFBQUFBLGVBQWUsRUFBRTtBQUNickIsVUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNxQixnQ0FEWDtBQUVibkIsVUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNzQiw4QkFGaEI7QUFHYmxCLFVBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0lDLFlBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDdUIsMENBRDFCO0FBRUloQixZQUFBQSxVQUFVLEVBQUU7QUFGaEIsV0FERSxFQUtGO0FBQ0lGLFlBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDd0IsdUNBRDFCO0FBRUlqQixZQUFBQSxVQUFVLGlCQUFVdEIsUUFBUSxJQUFJZSxlQUFlLENBQUN5Qiw0Q0FBdEM7QUFGZCxXQUxFLEVBU0Y7QUFDSXBCLFlBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDMEIsMENBRDFCO0FBRUluQixZQUFBQSxVQUFVLGtCQUFXdEIsUUFBUSxJQUFJZSxlQUFlLENBQUN5Qiw0Q0FBdkM7QUFGZCxXQVRFLENBSE87QUFpQmJFLFVBQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0l0QixZQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzRCLHFDQUQxQjtBQUVJckIsWUFBQUEsVUFBVSxFQUFFO0FBRmhCLFdBREcsRUFLSDtBQUNJRixZQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzZCLGtDQUQxQjtBQUVJdEIsWUFBQUEsVUFBVSxtQkFBWXRCLFFBQVEsSUFBSWUsZUFBZSxDQUFDeUIsNENBQXhDO0FBRmQsV0FMRyxFQVNIO0FBQ0lwQixZQUFBQSxJQUFJLEVBQUVMLGVBQWUsQ0FBQzhCLHFDQUQxQjtBQUVJdkIsWUFBQUEsVUFBVSxvQkFBYXRCLFFBQVEsSUFBSWUsZUFBZSxDQUFDeUIsNENBQXpDO0FBRmQsV0FURyxDQWpCTTtBQStCYk0sVUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSTFCLFlBQUFBLElBQUksRUFBRUwsZUFBZSxDQUFDZ0MscUNBRDFCO0FBRUl6QixZQUFBQSxVQUFVLEVBQUU7QUFGaEIsV0FERyxFQUtIUCxlQUFlLENBQUNpQyxtQ0FMYixDQS9CTTtBQXNDYkMsVUFBQUEsUUFBUSxFQUFFbEMsZUFBZSxDQUFDbUMsa0NBQWhCLEdBQ05uQyxlQUFlLENBQUNtQyxrQ0FBaEIsQ0FBbURDLEtBQW5ELENBQXlELEdBQXpELENBRE0sR0FDMEQsRUF2Q3ZEO0FBd0NiQyxVQUFBQSxjQUFjLEVBQUVyQyxlQUFlLENBQUNzQyx5Q0F4Q25CO0FBeUNibkIsVUFBQUEsSUFBSSxFQUFFbkIsZUFBZSxDQUFDdUM7QUF6Q1Q7QUE1Q2QsT0FBUDtBQXdGSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDRCQUEwQnJELGNBQTFCLEVBQTBDO0FBQUE7O0FBQ3RDc0QsTUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JDLElBQXRCLENBQTJCLFVBQUNDLEtBQUQsRUFBUUMsT0FBUixFQUFvQjtBQUMzQyxZQUFNQyxLQUFLLEdBQUdKLENBQUMsQ0FBQ0csT0FBRCxDQUFmO0FBQ0EsWUFBTUUsU0FBUyxHQUFHRCxLQUFLLENBQUNFLElBQU4sQ0FBVyxPQUFYLENBQWxCO0FBQ0EsWUFBTUMsV0FBVyxHQUFHN0QsY0FBYyxDQUFDMkQsU0FBRCxDQUFsQzs7QUFFQSxZQUFJRSxXQUFKLEVBQWlCO0FBQ2I7QUFDQSxjQUFJQyxPQUFPLEdBQUcsS0FBSSxDQUFDQyxvQkFBTCxDQUEwQkYsV0FBMUIsQ0FBZDs7QUFFQUgsVUFBQUEsS0FBSyxDQUFDTSxLQUFOLENBQVk7QUFDUkMsWUFBQUEsSUFBSSxFQUFFSCxPQURFO0FBRVJ6RCxZQUFBQSxRQUFRLEVBQUUsV0FGRjtBQUdSQyxZQUFBQSxTQUFTLEVBQUUsSUFISDtBQUlSNEQsWUFBQUEsS0FBSyxFQUFFO0FBQ0hDLGNBQUFBLElBQUksRUFBRSxHQURIO0FBRUhDLGNBQUFBLElBQUksRUFBRTtBQUZILGFBSkM7QUFRUjdELFlBQUFBLFNBQVMsRUFBRTtBQVJILFdBQVo7QUFVSDtBQUNKLE9BcEJEO0FBcUJIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw4QkFBNEJzRCxXQUE1QixFQUF5QztBQUNyQyxVQUFJLENBQUNBLFdBQUwsRUFBa0IsT0FBTyxFQUFQO0FBRWxCLFVBQUlJLElBQUksR0FBRyxFQUFYLENBSHFDLENBS3JDOztBQUNBLFVBQUlKLFdBQVcsQ0FBQ2hELE1BQWhCLEVBQXdCO0FBQ3BCb0QsUUFBQUEsSUFBSSxvQ0FBMkJKLFdBQVcsQ0FBQ2hELE1BQXZDLFdBQUo7QUFDSCxPQVJvQyxDQVVyQzs7O0FBQ0EsVUFBSWdELFdBQVcsQ0FBQzdDLFdBQWhCLEVBQTZCO0FBQ3pCaUQsUUFBQUEsSUFBSSxpQkFBVUosV0FBVyxDQUFDN0MsV0FBdEIsU0FBSjtBQUNILE9BYm9DLENBZXJDOzs7QUFDQSxVQUFNcUQsU0FBUyxHQUFHLFNBQVpBLFNBQVksQ0FBQ25ELElBQUQsRUFBVTtBQUN4QixZQUFJb0QsUUFBUSxHQUFHLG9EQUFmO0FBQ0FwRCxRQUFBQSxJQUFJLENBQUNxRCxPQUFMLENBQWEsVUFBQUMsSUFBSSxFQUFJO0FBQ2pCLGNBQUksT0FBT0EsSUFBUCxLQUFnQixRQUFwQixFQUE4QjtBQUMxQkYsWUFBQUEsUUFBUSxrQkFBV0UsSUFBWCxVQUFSO0FBQ0gsV0FGRCxNQUVPLElBQUlBLElBQUksQ0FBQ25ELFVBQUwsS0FBb0IsSUFBeEIsRUFBOEI7QUFDakNpRCxZQUFBQSxRQUFRLDhCQUF1QkUsSUFBSSxDQUFDckQsSUFBNUIsc0VBQVI7QUFDSCxXQUZNLE1BRUE7QUFDSG1ELFlBQUFBLFFBQVEsMEJBQW1CRSxJQUFJLENBQUNyRCxJQUF4Qix3QkFBMENxRCxJQUFJLENBQUNuRCxVQUEvQyxVQUFSO0FBQ0g7QUFDSixTQVJEO0FBU0FpRCxRQUFBQSxRQUFRLElBQUksT0FBWjtBQUNBLGVBQU9BLFFBQVA7QUFDSCxPQWJELENBaEJxQyxDQStCckM7OztBQUNBLFdBQUssSUFBSUcsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsSUFBSSxFQUFyQixFQUF5QkEsQ0FBQyxFQUExQixFQUE4QjtBQUMxQixZQUFNQyxPQUFPLEdBQUdELENBQUMsS0FBSyxDQUFOLEdBQVUsTUFBVixpQkFBMEJBLENBQTFCLENBQWhCOztBQUNBLFlBQUlaLFdBQVcsQ0FBQ2EsT0FBRCxDQUFYLElBQXdCYixXQUFXLENBQUNhLE9BQUQsQ0FBWCxDQUFxQkMsTUFBckIsR0FBOEIsQ0FBMUQsRUFBNkQ7QUFDekRWLFVBQUFBLElBQUksSUFBSUksU0FBUyxDQUFDUixXQUFXLENBQUNhLE9BQUQsQ0FBWixDQUFqQjtBQUNIO0FBQ0osT0FyQ29DLENBdUNyQzs7O0FBQ0EsVUFBSWIsV0FBVyxDQUFDaEMsT0FBaEIsRUFBeUI7QUFDckJvQyxRQUFBQSxJQUFJLElBQUksMkRBQVI7O0FBQ0EsWUFBSUosV0FBVyxDQUFDaEMsT0FBWixDQUFvQmhCLE1BQXhCLEVBQWdDO0FBQzVCb0QsVUFBQUEsSUFBSSxvQ0FBMkJKLFdBQVcsQ0FBQ2hDLE9BQVosQ0FBb0JoQixNQUEvQyxXQUFKO0FBQ0g7O0FBQ0QsWUFBSWdELFdBQVcsQ0FBQ2hDLE9BQVosQ0FBb0JFLElBQXhCLEVBQThCO0FBQzFCa0MsVUFBQUEsSUFBSSxpQkFBVUosV0FBVyxDQUFDaEMsT0FBWixDQUFvQkUsSUFBOUIsU0FBSjtBQUNIOztBQUNEa0MsUUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxPQWpEb0MsQ0FtRHJDOzs7QUFDQSxVQUFJSixXQUFXLENBQUNiLFFBQVosSUFBd0JhLFdBQVcsQ0FBQ2IsUUFBWixDQUFxQjJCLE1BQXJCLEdBQThCLENBQTFELEVBQTZEO0FBQ3pELFlBQUlkLFdBQVcsQ0FBQ1YsY0FBaEIsRUFBZ0M7QUFDNUJjLFVBQUFBLElBQUkseUJBQWtCSixXQUFXLENBQUNWLGNBQTlCLG1CQUFKO0FBQ0g7O0FBQ0RjLFFBQUFBLElBQUksSUFBSSw2REFBUjtBQUNBQSxRQUFBQSxJQUFJLElBQUksNENBQVI7QUFDQUosUUFBQUEsV0FBVyxDQUFDYixRQUFaLENBQXFCdUIsT0FBckIsQ0FBNkIsVUFBQUssSUFBSSxFQUFJO0FBQ2pDWCxVQUFBQSxJQUFJLElBQUlXLElBQUksR0FBRyxJQUFmO0FBQ0gsU0FGRDtBQUdBWCxRQUFBQSxJQUFJLElBQUksY0FBUjtBQUNILE9BOURvQyxDQWdFckM7OztBQUNBLFVBQUlKLFdBQVcsQ0FBQzVCLElBQWhCLEVBQXNCO0FBQ2xCZ0MsUUFBQUEsSUFBSSxxQkFBY0osV0FBVyxDQUFDNUIsSUFBMUIsY0FBSjtBQUNIOztBQUVELGFBQU9nQyxJQUFQO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciAqL1xuXG4vKipcbiAqIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlciAtIE1hbmFnZXMgdG9vbHRpcHMgZm9yIEFSSSB1c2VyIGZvcm0gZmllbGRzXG4gKiBcbiAqIFRoaXMgY2xhc3MgcHJvdmlkZXMgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgQVJJIHNldHRpbmdzIGZpZWxkcyxcbiAqIGhlbHBpbmcgdXNlcnMgdW5kZXJzdGFuZCBTdGFzaXMgYXBwbGljYXRpb25zIGFuZCBjb25uZWN0aW9uIGRldGFpbHMuXG4gKiBVc2VzIHRoZSB1bmlmaWVkIFRvb2x0aXBCdWlsZGVyIHN5c3RlbSBmb3IgY29uc2lzdGVudCB0b29sdGlwIHJlbmRlcmluZy5cbiAqIFxuICogQGNsYXNzIEFzdGVyaXNrUmVzdFVzZXJUb29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3Rlcmlza1Jlc3RVc2VyVG9vbHRpcE1hbmFnZXIgaXMgYSBzdGF0aWMgY2xhc3MgYW5kIGNhbm5vdCBiZSBpbnN0YW50aWF0ZWQnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHMgZm9yIHRoZSBBUkkgdXNlciBmb3JtXG4gICAgICogVXNlcyB0aGUgdW5pZmllZCBUb29sdGlwQnVpbGRlciBmb3IgY29uc2lzdGVudCBiZWhhdmlvclxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc2VydmVySVAgLSBTZXJ2ZXIgSVAgYWRkcmVzcyBmb3IgY29ubmVjdGlvbiBleGFtcGxlc1xuICAgICAqL1xuICAgIHN0YXRpYyBpbml0aWFsaXplKHNlcnZlcklQID0gJycpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5nZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoc2VydmVySVApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgVG9vbHRpcEJ1aWxkZXIgdG8gaW5pdGlhbGl6ZSBhbGwgdG9vbHRpcHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaW5pdGlhbGl6ZSh0b29sdGlwQ29uZmlncywge1xuICAgICAgICAgICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGlyZWN0IGltcGxlbWVudGF0aW9uIGlmIFRvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1Rvb2x0aXBCdWlsZGVyIG5vdCBhdmFpbGFibGUsIHVzaW5nIGZhbGxiYWNrIGltcGxlbWVudGF0aW9uJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRmFsbGJhY2sodG9vbHRpcENvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGluaXRpYWxpemUgQVJJIHVzZXIgdG9vbHRpcHM6JywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgQVJJIHVzZXIgZmllbGRzXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2ZXJJUCAtIFNlcnZlciBJUCBhZGRyZXNzIGZvciBjb25uZWN0aW9uIGV4YW1wbGVzXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggZmllbGQgbmFtZXMgYXMga2V5cyBhbmQgdG9vbHRpcCBkYXRhIGFzIHZhbHVlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRUb29sdGlwQ29uZmlndXJhdGlvbnMoc2VydmVySVAgPSAnJykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgLy8gQXBwbGljYXRpb25zIGZpZWxkIHRvb2x0aXBcbiAgICAgICAgICAgIGFwcGxpY2F0aW9uczoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYXJpX0FwcGxpY2F0aW9uc1Rvb2x0aXBfdXNhZ2VfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuYXJpX0FwcGxpY2F0aW9uc1Rvb2x0aXBfdXNhZ2VfZGVzYyxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2NvbW1vbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdhcmktYXBwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQXBwbGljYXRpb25zVG9vbHRpcF9jb21tb25fYXJpX2FwcFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnc3Rhc2lzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQXBwbGljYXRpb25zVG9vbHRpcF9jb21tb25fc3Rhc2lzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdleHRlcm5hbC1tZWRpYScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuYXJpX0FwcGxpY2F0aW9uc1Rvb2x0aXBfY29tbW9uX2V4dGVybmFsX21lZGlhXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06ICdicmlkZ2UtYXBwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQXBwbGljYXRpb25zVG9vbHRpcF9jb21tb25fYnJpZGdlX2FwcFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiAnY2hhbm5lbC1zcHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX2NvbW1vbl9jaGFubmVsX3NweVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9BcHBsaWNhdGlvbnNUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYXJpX0FwcGxpY2F0aW9uc1Rvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbm90ZTogJydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbm5lY3Rpb24gaW5mbyB0b29sdGlwXG4gICAgICAgICAgICBjb25uZWN0aW9uX2luZm86IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3dlYnNvY2tldF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3dlYnNvY2tldF91cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBgd3M6Ly8ke3NlcnZlcklQIHx8IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3NlcnZlcl9wbGFjZWhvbGRlcn06ODA4OC9hcmkvZXZlbnRzP2FwcD1bYXBwbGljYXRpb25dJnN1YnNjcmliZT1hbGxgXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3dlYnNvY2tldF9zZWN1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBgd3NzOi8vJHtzZXJ2ZXJJUCB8fCBnbG9iYWxUcmFuc2xhdGUuYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9zZXJ2ZXJfcGxhY2Vob2xkZXJ9OjgwODkvYXJpL2V2ZW50cz9hcHA9W2FwcGxpY2F0aW9uXSZzdWJzY3JpYmU9YWxsYFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBsaXN0MjogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9yZXN0X2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfcmVzdF91cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBgaHR0cDovLyR7c2VydmVySVAgfHwgZ2xvYmFsVHJhbnNsYXRlLmFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfc2VydmVyX3BsYWNlaG9sZGVyfTo4MDg4L2FyaS9gXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX3Jlc3Rfc2VjdXJlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogYGh0dHBzOi8vJHtzZXJ2ZXJJUCB8fCBnbG9iYWxUcmFuc2xhdGUuYXJpX0Nvbm5lY3Rpb25JbmZvVG9vbHRpcF9zZXJ2ZXJfcGxhY2Vob2xkZXJ9OjgwODkvYXJpL2BcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbGlzdDM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfYXV0aF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX2F1dGhfZGVzY1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX2V4YW1wbGVzID8gXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX2V4YW1wbGVzLnNwbGl0KCd8JykgOiBbXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFyaV9Db25uZWN0aW9uSW5mb1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5hcmlfQ29ubmVjdGlvbkluZm9Ub29sdGlwX25vdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24gaWYgVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcENvbmZpZ3MgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgc3RhdGljIGluaXRpYWxpemVGYWxsYmFjayh0b29sdGlwQ29uZmlncykge1xuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHRvb2x0aXAgY29udGVudCBtYW51YWxseVxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gdGhpcy5idWlsZEZhbGxiYWNrQ29udGVudCh0b29sdGlwRGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgdG9vbHRpcCBjb250ZW50IGZvciBmYWxsYmFjayBpbXBsZW1lbnRhdGlvblxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBcbiAgICAgKi9cbiAgICBzdGF0aWMgYnVpbGRGYWxsYmFja0NvbnRlbnQodG9vbHRpcERhdGEpIHtcbiAgICAgICAgaWYgKCF0b29sdGlwRGF0YSkgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXJcbiAgICAgICAgaWYgKHRvb2x0aXBEYXRhLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7dG9vbHRpcERhdGEuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvblxuICAgICAgICBpZiAodG9vbHRpcERhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEuZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBsaXN0c1xuICAgICAgICBjb25zdCBidWlsZExpc3QgPSAobGlzdCkgPT4ge1xuICAgICAgICAgICAgbGV0IGxpc3RIdG1sID0gJzx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj4nO1xuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgbGlzdEh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8L3VsPjxwPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PC9wPjx1bCBzdHlsZT1cIm1hcmdpbjogMC41ZW0gMDsgcGFkZGluZy1sZWZ0OiAxLjVlbTtcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RIdG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxpc3RIdG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICByZXR1cm4gbGlzdEh0bWw7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWxsIGxpc3RzXG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBpID09PSAxID8gJ2xpc3QnIDogYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmICh0b29sdGlwRGF0YVtsaXN0S2V5XSAmJiB0b29sdGlwRGF0YVtsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBidWlsZExpc3QodG9vbHRpcERhdGFbbGlzdEtleV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZ1xuICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiIHN0eWxlPVwibWFyZ2luOiAwLjVlbSAwO1wiPic7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHt0b29sdGlwRGF0YS53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvb2x0aXBEYXRhLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7dG9vbHRpcERhdGEud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGV4YW1wbGVzXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5leGFtcGxlcyAmJiB0b29sdGlwRGF0YS5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAodG9vbHRpcERhdGEuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD48c3Ryb25nPiR7dG9vbHRpcERhdGEuZXhhbXBsZXNIZWFkZXJ9Ojwvc3Ryb25nPjwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICNmOGY4Zjg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxwcmUgc3R5bGU9XCJtYXJnaW46IDA7IGZvbnQtc2l6ZTogMC45ZW07XCI+JztcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmV4YW1wbGVzLmZvckVhY2gobGluZSA9PiB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBsaW5lICsgJ1xcbic7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPjwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlXG4gICAgICAgIGlmICh0b29sdGlwRGF0YS5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD48ZW0+JHt0b29sdGlwRGF0YS5ub3RlfTwvZW0+PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH1cbn0iXX0=