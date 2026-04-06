"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
 * ProviderTooltipManager - Base class for provider tooltip management
 * 
 * This abstract base class provides common functionality for managing tooltips
 * in provider configuration forms. It defines the interface and shared methods
 * that all provider-specific tooltip managers should implement.
 * 
 * Features:
 * - Abstract base class pattern
 * - Common tooltip configurations shared across providers
 * - Standardized tooltip management interface
 * - Integration with existing TooltipBuilder
 * - Extensible architecture for provider-specific implementations
 * 
 * @abstract
 * @class ProviderTooltipManager
 */
var ProviderTooltipManager = /*#__PURE__*/function () {
  /**
   * Private constructor to prevent instantiation
   * This class serves as an abstract base and should be extended
   */
  function ProviderTooltipManager() {
    _classCallCheck(this, ProviderTooltipManager);

    if ((this instanceof ProviderTooltipManager ? this.constructor : void 0) === ProviderTooltipManager) {
      throw new Error('ProviderTooltipManager is an abstract class and cannot be instantiated directly');
    }
  }
  /**
   * Get common tooltip configurations shared between all provider types
   * 
   * These are the tooltips that apply to all provider types (SIP, IAX, etc.)
   * 
   * @static
   * @returns {Object} Common tooltip configurations
   */


  _createClass(ProviderTooltipManager, null, [{
    key: "getCommonTooltipConfigurations",
    value: function getCommonTooltipConfigurations() {
      return {
        registration_type: {
          header: globalTranslate.pr_RegistrationTypeTooltip_header,
          list: [{
            term: globalTranslate.pr_RegistrationTypeTooltip_outbound,
            definition: globalTranslate.pr_RegistrationTypeTooltip_outbound_desc
          }, {
            term: globalTranslate.pr_RegistrationTypeTooltip_inbound,
            definition: globalTranslate.pr_RegistrationTypeTooltip_inbound_desc
          }, {
            term: globalTranslate.pr_RegistrationTypeTooltip_none,
            definition: globalTranslate.pr_RegistrationTypeTooltip_none_desc
          }]
        },
        network_filter: {
          header: globalTranslate.pr_NetworkFilterTooltip_header,
          description: globalTranslate.pr_NetworkFilterTooltip_desc,
          list: [{
            term: globalTranslate.pr_NetworkFilterTooltip_inbound,
            definition: globalTranslate.pr_NetworkFilterTooltip_inbound_desc
          }, {
            term: globalTranslate.pr_NetworkFilterTooltip_outbound,
            definition: globalTranslate.pr_NetworkFilterTooltip_outbound_desc
          }, {
            term: globalTranslate.pr_NetworkFilterTooltip_none,
            definition: globalTranslate.pr_NetworkFilterTooltip_none_desc
          }]
        }
      };
    }
    /**
     * Get provider-specific tooltip configurations
     *
     * This method should be implemented by subclasses to provide tooltips
     * that are specific to their provider type.
     *
     * @abstract
     * @static
     * @returns {Object} Provider-specific tooltip configurations
     * @throws {Error} Must be implemented by subclasses
     */

  }, {
    key: "getProviderSpecificConfigurations",
    value: function getProviderSpecificConfigurations() {
      throw new Error('getProviderSpecificConfigurations() must be implemented by subclasses');
    }
    /**
     * Build complete tooltip configurations by merging common and provider-specific configurations
     * 
     * This method combines the common tooltip configurations with provider-specific ones,
     * allowing for override and extension of tooltip data.
     * 
     * @static
     * @returns {Object} Complete tooltip configurations
     */

  }, {
    key: "buildTooltipConfigurations",
    value: function buildTooltipConfigurations() {
      var commonConfigs = this.getCommonTooltipConfigurations();
      var providerSpecificConfigs = this.getProviderSpecificConfigurations(); // Merge configurations, provider-specific configs override common ones

      return _objectSpread(_objectSpread({}, commonConfigs), providerSpecificConfigs);
    }
    /**
     * Initialize all provider tooltips
     * 
     * This method builds the complete tooltip configurations and delegates
     * to TooltipBuilder for the actual popup initialization.
     * 
     * @static
     */

  }, {
    key: "initialize",
    value: function initialize() {
      try {
        var tooltipConfigs = this.buildTooltipConfigurations();

        if (typeof TooltipBuilder === 'undefined') {
          throw new Error('TooltipBuilder is not available');
        }

        TooltipBuilder.initialize(tooltipConfigs);
      } catch (error) {
        console.error('Failed to initialize provider tooltips:', error);
      }
    }
    /**
     * Update specific tooltip content
     * 
     * @static
     * @param {string} fieldName - Field name to update
     * @param {Object|string} tooltipData - New tooltip data or HTML content
     */

  }, {
    key: "updateTooltip",
    value: function updateTooltip(fieldName, tooltipData) {
      try {
        if (typeof TooltipBuilder === 'undefined') {
          throw new Error('TooltipBuilder is not available');
        }

        TooltipBuilder.update(fieldName, tooltipData);
      } catch (error) {
        console.error("Failed to update tooltip for field '".concat(fieldName, "':"), error);
      }
    }
    /**
     * Destroy all provider tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */

  }, {
    key: "destroy",
    value: function destroy() {
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.field-info-icon';

      try {
        if (typeof TooltipBuilder === 'undefined') {
          throw new Error('TooltipBuilder is not available');
        }

        TooltipBuilder.destroy(selector);
      } catch (error) {
        console.error('Failed to destroy provider tooltips:', error);
      }
    }
    /**
     * Hide all provider tooltips
     * 
     * @static
     * @param {string} [selector='.field-info-icon'] - jQuery selector for tooltip icons
     */

  }, {
    key: "hide",
    value: function hide() {
      var selector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '.field-info-icon';

      try {
        if (typeof TooltipBuilder === 'undefined') {
          throw new Error('TooltipBuilder is not available');
        }

        TooltipBuilder.hide(selector);
      } catch (error) {
        console.error('Failed to hide provider tooltips:', error);
      }
    }
    /**
     * Get tooltip configuration for a specific field
     * 
     * @static
     * @param {string} fieldName - Name of the field
     * @returns {Object|null} Tooltip configuration or null if not found
     */

  }, {
    key: "getTooltipConfiguration",
    value: function getTooltipConfiguration(fieldName) {
      try {
        var tooltipConfigs = this.buildTooltipConfigurations();
        return tooltipConfigs[fieldName] || null;
      } catch (error) {
        console.error("Failed to get tooltip configuration for field '".concat(fieldName, "':"), error);
        return null;
      }
    }
    /**
     * Check if tooltip builder is available
     * 
     * @static
     * @returns {boolean} True if TooltipBuilder is available
     */

  }, {
    key: "isTooltipBuilderAvailable",
    value: function isTooltipBuilderAvailable() {
      return typeof TooltipBuilder !== 'undefined' && TooltipBuilder.initialize && typeof TooltipBuilder.initialize === 'function';
    }
    /**
     * Validate tooltip configuration structure
     * 
     * @static
     * @param {Object} config - Tooltip configuration to validate
     * @returns {boolean} True if configuration is valid
     */

  }, {
    key: "validateTooltipConfiguration",
    value: function validateTooltipConfiguration(config) {
      if (!config || _typeof(config) !== 'object') {
        return false;
      } // Check for required structure - at minimum should have header or description


      return config.header || config.description || config.list || config.examples;
    }
  }]);

  return ProviderTooltipManager;
}(); // Export for use in other modules


if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItdG9vbHRpcC1tYW5hZ2VyLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyVG9vbHRpcE1hbmFnZXIiLCJFcnJvciIsInJlZ2lzdHJhdGlvbl90eXBlIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyIiwibGlzdCIsInRlcm0iLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCIsImRlZmluaXRpb24iLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwicHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzYyIsInByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUiLCJwcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lX2Rlc2MiLCJuZXR3b3JrX2ZpbHRlciIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfZGVzYyIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZCIsInByX05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2MiLCJwcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lIiwicHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZV9kZXNjIiwiY29tbW9uQ29uZmlncyIsImdldENvbW1vblRvb2x0aXBDb25maWd1cmF0aW9ucyIsInByb3ZpZGVyU3BlY2lmaWNDb25maWdzIiwiZ2V0UHJvdmlkZXJTcGVjaWZpY0NvbmZpZ3VyYXRpb25zIiwidG9vbHRpcENvbmZpZ3MiLCJidWlsZFRvb2x0aXBDb25maWd1cmF0aW9ucyIsIlRvb2x0aXBCdWlsZGVyIiwiaW5pdGlhbGl6ZSIsImVycm9yIiwiY29uc29sZSIsImZpZWxkTmFtZSIsInRvb2x0aXBEYXRhIiwidXBkYXRlIiwic2VsZWN0b3IiLCJkZXN0cm95IiwiaGlkZSIsImNvbmZpZyIsImV4YW1wbGVzIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxzQjtBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksb0NBQWM7QUFBQTs7QUFDVixRQUFJLHlFQUFlQSxzQkFBbkIsRUFBMkM7QUFDdkMsWUFBTSxJQUFJQyxLQUFKLENBQVUsaUZBQVYsQ0FBTjtBQUNIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLDBDQUF3QztBQUNwQyxhQUFPO0FBQ0hDLFFBQUFBLGlCQUFpQixFQUFFO0FBQ2ZDLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQyxpQ0FEVDtBQUVmQyxVQUFBQSxJQUFJLEVBQUUsQ0FDRjtBQUNJQyxZQUFBQSxJQUFJLEVBQUVILGVBQWUsQ0FBQ0ksbUNBRDFCO0FBRUlDLFlBQUFBLFVBQVUsRUFBRUwsZUFBZSxDQUFDTTtBQUZoQyxXQURFLEVBS0Y7QUFDSUgsWUFBQUEsSUFBSSxFQUFFSCxlQUFlLENBQUNPLGtDQUQxQjtBQUVJRixZQUFBQSxVQUFVLEVBQUVMLGVBQWUsQ0FBQ1E7QUFGaEMsV0FMRSxFQVNGO0FBQ0lMLFlBQUFBLElBQUksRUFBRUgsZUFBZSxDQUFDUywrQkFEMUI7QUFFSUosWUFBQUEs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QU0sQ0FBQ0MsUUFBcEU7QUFDSDs7OztLQUdMOzs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjVDLHNCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFRyYW5zbGF0ZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIC0gQmFzZSBjbGFzcyBmb3IgcHJvdmlkZXIgdG9vbHRpcCBtYW5hZ2VtZW50XG4gKiBcbiAqIFRoaXMgYWJzdHJhY3QgYmFzZSBjbGFzcyBwcm92aWRlcyBjb21tb24gZnVuY3Rpb25hbGl0eSBmb3IgbWFuYWdpbmcgdG9vbHRpcHNcbiAqIGluIHByb3ZpZGVyIGNvbmZpZ3VyYXRpb24gZm9ybXMuIEl0IGRlZmluZXMgdGhlIGludGVyZmFjZSBhbmQgc2hhcmVkIG1ldGhvZHNcbiAqIHRoYXQgYWxsIHByb3ZpZGVyLXNwZWNpZmljIHRvb2x0aXAgbWFuYWdlcnMgc2hvdWxkIGltcGxlbWVudC5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIEFic3RyYWN0IGJhc2UgY2xhc3MgcGF0dGVyblxuICogLSBDb21tb24gdG9vbHRpcCBjb25maWd1cmF0aW9ucyBzaGFyZWQgYWNyb3NzIHByb3ZpZGVyc1xuICogLSBTdGFuZGFyZGl6ZWQgdG9vbHRpcCBtYW5hZ2VtZW50IGludGVyZmFjZVxuICogLSBJbnRlZ3JhdGlvbiB3aXRoIGV4aXN0aW5nIFRvb2x0aXBCdWlsZGVyXG4gKiAtIEV4dGVuc2libGUgYXJjaGl0ZWN0dXJlIGZvciBwcm92aWRlci1zcGVjaWZpYyBpbXBsZW1lbnRhdGlvbnNcbiAqIFxuICogQGFic3RyYWN0XG4gKiBAY2xhc3MgUHJvdmlkZXJUb29sdGlwTWFuYWdlclxuICovXG5jbGFzcyBQcm92aWRlclRvb2x0aXBNYW5hZ2VyIHtcbiAgICAvKipcbiAgICAgKiBQcml2YXRlIGNvbnN0cnVjdG9yIHRvIHByZXZlbnQgaW5zdGFudGlhdGlvblxuICAgICAqIFRoaXMgY2xhc3Mgc2VydmVzIGFzIGFuIGFic3RyYWN0IGJhc2UgYW5kIHNob3VsZCBiZSBleHRlbmRlZFxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBpZiAobmV3LnRhcmdldCA9PT0gUHJvdmlkZXJUb29sdGlwTWFuYWdlcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm92aWRlclRvb2x0aXBNYW5hZ2VyIGlzIGFuIGFic3RyYWN0IGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkIGRpcmVjdGx5Jyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgY29tbW9uIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgc2hhcmVkIGJldHdlZW4gYWxsIHByb3ZpZGVyIHR5cGVzXG4gICAgICogXG4gICAgICogVGhlc2UgYXJlIHRoZSB0b29sdGlwcyB0aGF0IGFwcGx5IHRvIGFsbCBwcm92aWRlciB0eXBlcyAoU0lQLCBJQVgsIGV0Yy4pXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IENvbW1vbiB0b29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgc3RhdGljIGdldENvbW1vblRvb2x0aXBDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlZ2lzdHJhdGlvbl90eXBlOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbmV0d29ya19maWx0ZXI6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUucHJfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCBwcm92aWRlci1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NlcyB0byBwcm92aWRlIHRvb2x0aXBzXG4gICAgICogdGhhdCBhcmUgc3BlY2lmaWMgdG8gdGhlaXIgcHJvdmlkZXIgdHlwZS5cbiAgICAgKlxuICAgICAqIEBhYnN0cmFjdFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBQcm92aWRlci1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICogQHRocm93cyB7RXJyb3J9IE11c3QgYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3Nlc1xuICAgICAqL1xuICAgIHN0YXRpYyBnZXRQcm92aWRlclNwZWNpZmljQ29uZmlndXJhdGlvbnMoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZ2V0UHJvdmlkZXJTcGVjaWZpY0NvbmZpZ3VyYXRpb25zKCkgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc2VzJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgY29tcGxldGUgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBieSBtZXJnaW5nIGNvbW1vbiBhbmQgcHJvdmlkZXItc3BlY2lmaWMgY29uZmlndXJhdGlvbnNcbiAgICAgKiBcbiAgICAgKiBUaGlzIG1ldGhvZCBjb21iaW5lcyB0aGUgY29tbW9uIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgd2l0aCBwcm92aWRlci1zcGVjaWZpYyBvbmVzLFxuICAgICAqIGFsbG93aW5nIGZvciBvdmVycmlkZSBhbmQgZXh0ZW5zaW9uIG9mIHRvb2x0aXAgZGF0YS5cbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHJldHVybnMge09iamVjdH0gQ29tcGxldGUgdG9vbHRpcCBjb25maWd1cmF0aW9uc1xuICAgICAqL1xuICAgIHN0YXRpYyBidWlsZFRvb2x0aXBDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgY29uc3QgY29tbW9uQ29uZmlncyA9IHRoaXMuZ2V0Q29tbW9uVG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVyU3BlY2lmaWNDb25maWdzID0gdGhpcy5nZXRQcm92aWRlclNwZWNpZmljQ29uZmlndXJhdGlvbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIGNvbmZpZ3VyYXRpb25zLCBwcm92aWRlci1zcGVjaWZpYyBjb25maWdzIG92ZXJyaWRlIGNvbW1vbiBvbmVzXG4gICAgICAgIHJldHVybiB7IC4uLmNvbW1vbkNvbmZpZ3MsIC4uLnByb3ZpZGVyU3BlY2lmaWNDb25maWdzIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhbGwgcHJvdmlkZXIgdG9vbHRpcHNcbiAgICAgKiBcbiAgICAgKiBUaGlzIG1ldGhvZCBidWlsZHMgdGhlIGNvbXBsZXRlIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgYW5kIGRlbGVnYXRlc1xuICAgICAqIHRvIFRvb2x0aXBCdWlsZGVyIGZvciB0aGUgYWN0dWFsIHBvcHVwIGluaXRpYWxpemF0aW9uLlxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKi9cbiAgICBzdGF0aWMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0gdGhpcy5idWlsZFRvb2x0aXBDb25maWd1cmF0aW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRvb2x0aXBCdWlsZGVyID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVG9vbHRpcEJ1aWxkZXIgaXMgbm90IGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIHByb3ZpZGVyIHRvb2x0aXBzOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBzcGVjaWZpYyB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBcbiAgICAgKiBAc3RhdGljXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgdG8gdXBkYXRlXG4gICAgICogQHBhcmFtIHtPYmplY3R8c3RyaW5nfSB0b29sdGlwRGF0YSAtIE5ldyB0b29sdGlwIGRhdGEgb3IgSFRNTCBjb250ZW50XG4gICAgICovXG4gICAgc3RhdGljIHVwZGF0ZVRvb2x0aXAoZmllbGROYW1lLCB0b29sdGlwRGF0YSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIudXBkYXRlKGZpZWxkTmFtZSwgdG9vbHRpcERhdGEpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSB0b29sdGlwIGZvciBmaWVsZCAnJHtmaWVsZE5hbWV9JzpgLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGFsbCBwcm92aWRlciB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgZGVzdHJveShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuZGVzdHJveShzZWxlY3Rvcik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVzdHJveSBwcm92aWRlciB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBIaWRlIGFsbCBwcm92aWRlciB0b29sdGlwc1xuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yPScuZmllbGQtaW5mby1pY29uJ10gLSBqUXVlcnkgc2VsZWN0b3IgZm9yIHRvb2x0aXAgaWNvbnNcbiAgICAgKi9cbiAgICBzdGF0aWMgaGlkZShzZWxlY3RvciA9ICcuZmllbGQtaW5mby1pY29uJykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUb29sdGlwQnVpbGRlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgVG9vbHRpcEJ1aWxkZXIuaGlkZShzZWxlY3Rvcik7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaGlkZSBwcm92aWRlciB0b29sdGlwczonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdG9vbHRpcCBjb25maWd1cmF0aW9uIGZvciBhIHNwZWNpZmljIGZpZWxkXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBOYW1lIG9mIHRoZSBmaWVsZFxuICAgICAqIEByZXR1cm5zIHtPYmplY3R8bnVsbH0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9yIG51bGwgaWYgbm90IGZvdW5kXG4gICAgICovXG4gICAgc3RhdGljIGdldFRvb2x0aXBDb25maWd1cmF0aW9uKGZpZWxkTmFtZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB0aGlzLmJ1aWxkVG9vbHRpcENvbmZpZ3VyYXRpb25zKCk7XG4gICAgICAgICAgICByZXR1cm4gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXSB8fCBudWxsO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGdldCB0b29sdGlwIGNvbmZpZ3VyYXRpb24gZm9yIGZpZWxkICcke2ZpZWxkTmFtZX0nOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdG9vbHRpcCBidWlsZGVyIGlzIGF2YWlsYWJsZVxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBUb29sdGlwQnVpbGRlciBpcyBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBzdGF0aWMgaXNUb29sdGlwQnVpbGRlckF2YWlsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiBUb29sdGlwQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcgJiYgXG4gICAgICAgICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplICYmIFxuICAgICAgICAgICAgICAgdHlwZW9mIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUgPT09ICdmdW5jdGlvbic7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGUgdG9vbHRpcCBjb25maWd1cmF0aW9uIHN0cnVjdHVyZVxuICAgICAqIFxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIHRvIHZhbGlkYXRlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgY29uZmlndXJhdGlvbiBpcyB2YWxpZFxuICAgICAqL1xuICAgIHN0YXRpYyB2YWxpZGF0ZVRvb2x0aXBDb25maWd1cmF0aW9uKGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZyB8fCB0eXBlb2YgY29uZmlnICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJlcXVpcmVkIHN0cnVjdHVyZSAtIGF0IG1pbmltdW0gc2hvdWxkIGhhdmUgaGVhZGVyIG9yIGRlc2NyaXB0aW9uXG4gICAgICAgIHJldHVybiBjb25maWcuaGVhZGVyIHx8IGNvbmZpZy5kZXNjcmlwdGlvbiB8fCBjb25maWcubGlzdCB8fCBjb25maWcuZXhhbXBsZXM7XG4gICAgfVxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb3ZpZGVyVG9vbHRpcE1hbmFnZXI7XG59Il19