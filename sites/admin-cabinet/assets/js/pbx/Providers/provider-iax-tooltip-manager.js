"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

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

/* global globalTranslate, TooltipBuilder, i18n, ProviderTooltipManager */

/**
 * ProviderIaxTooltipManager - Specialized tooltip management for IAX providers
 * 
 * This class extends the base ProviderTooltipManager to provide IAX-specific
 * tooltip configurations. It combines common provider tooltips with IAX-specific
 * field tooltips for comprehensive form guidance.
 * 
 * Features:
 * - Inherits common provider tooltip functionality
 * - IAX-specific tooltip configurations (port, manual attributes, etc.)
 * - Integration with existing TooltipBuilder
 * - Consistent error handling and validation
 * 
 * @class ProviderIaxTooltipManager
 * @extends ProviderTooltipManager
 */
var ProviderIaxTooltipManager = /*#__PURE__*/function (_ProviderTooltipManag) {
  _inherits(ProviderIaxTooltipManager, _ProviderTooltipManag);

  var _super = _createSuper(ProviderIaxTooltipManager);

  /**
   * Private constructor to prevent instantiation
   * This class uses static methods for utility functionality
   */
  function ProviderIaxTooltipManager() {
    var _this;

    _classCallCheck(this, ProviderIaxTooltipManager);

    _this = _super.call(this);
    throw new Error('ProviderIaxTooltipManager is a static class and cannot be instantiated');
    return _this;
  }
  /**
   * Get IAX-specific tooltip configurations
   * 
   * This method implements the abstract method from ProviderTooltipManager
   * and provides all IAX-specific tooltip configurations.
   * 
   * @static
   * @returns {Object} IAX-specific tooltip configurations
   */


  _createClass(ProviderIaxTooltipManager, null, [{
    key: "getProviderSpecificConfigurations",
    value: function getProviderSpecificConfigurations() {
      return {
        provider_host: {
          header: globalTranslate.iax_ProviderHostTooltip_header,
          description: globalTranslate.iax_ProviderHostTooltip_desc,
          list: [globalTranslate.iax_ProviderHostTooltip_format_ip, globalTranslate.iax_ProviderHostTooltip_format_domain, globalTranslate.iax_ProviderHostTooltip_outbound_use, globalTranslate.iax_ProviderHostTooltip_none_use],
          note: globalTranslate.iax_ProviderHostTooltip_note
        },
        iax_port: {
          header: globalTranslate.iax_PortTooltip_header,
          description: globalTranslate.iax_PortTooltip_desc,
          list: [globalTranslate.iax_PortTooltip_default, globalTranslate.iax_PortTooltip_info],
          note: globalTranslate.iax_PortTooltip_note
        },
        manual_attributes: {
          header: i18n('iax_ManualAttributesTooltip_header'),
          description: i18n('iax_ManualAttributesTooltip_desc'),
          list: [{
            term: i18n('iax_ManualAttributesTooltip_format'),
            definition: null
          }],
          examplesHeader: i18n('iax_ManualAttributesTooltip_examples_header'),
          examples: ['language = ru', 'codecpriority = host', 'trunktimestamps = yes', 'trunk = yes'],
          warning: {
            header: i18n('iax_ManualAttributesTooltip_warning_header'),
            text: i18n('iax_ManualAttributesTooltip_warning')
          }
        }
      };
    }
  }]);

  return ProviderIaxTooltipManager;
}(ProviderTooltipManager); // Export for use in other modules


if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderIaxTooltipManager;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LXRvb2x0aXAtbWFuYWdlci5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyIiwiRXJyb3IiLCJwcm92aWRlcl9ob3N0IiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwibGlzdCIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4iLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX3VzZSIsIm5vdGUiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlIiwiaWF4X3BvcnQiLCJpYXhfUG9ydFRvb2x0aXBfaGVhZGVyIiwiaWF4X1BvcnRUb29sdGlwX2Rlc2MiLCJpYXhfUG9ydFRvb2x0aXBfZGVmYXVsdCIsImlheF9Qb3J0VG9vbHRpcF9pbmZvIiwiaWF4X1BvcnRUb29sdGlwX25vdGUiLCJtYW51YWxfYXR0cmlidXRlcyIsImkxOG4iLCJ0ZXJtIiwiZGVmaW5pdGlvbiIsImV4YW1wbGVzSGVhZGVyIiwiZXhhbXBsZXMiLCJ3YXJuaW5nIiwidGV4dCIsIlByb3ZpZGVyVG9vbHRpcE1hbmFnZXIiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLHlCOzs7OztBQUNGO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksdUNBQWM7QUFBQTs7QUFBQTs7QUFDVjtBQUNBLFVBQU0sSUFBSUMsS0FBSixDQUFVLHdFQUFWLENBQU47QUFGVTtBQUdiO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztXQUNJLDZDQUEyQztBQUN2QyxhQUFPO0FBQ0hDLFFBQUFBLGFBQWEsRUFBRTtBQUNYQyxVQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0MsOEJBRGI7QUFFWEMsVUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNHLDRCQUZsQjtBQUdYQyxVQUFBQSxJQUFJLEVBQUUsQ0FDRkosZUFBZSxDQUFDSyxpQ0FEZCxFQUVGTCxlQUFlLENBQUNNLHFDQUZkLEVBR0ZOLGVBQWUsQ0FBQ08sb0NBSGQsRUFJRlAsZUFBZSxDQUFDUSxnQ0FKZCxDQUhLO0FBU1hDLFVBQUFBLElBQUksRUFBRVQsZUFBZSxDQUFDVTtBQVRYLFNBRFo7QUFhSEMsUUFBQUEsUUFBUSxFQUFFO0FBQ05aLFVBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDWSxzQkFEbEI7QUFFTlYsVUFBQUEsV0FBVyxFQUFFRixlQUFlLENBQUNhLG9CQUZ2QjtBQUdOVCxVQUFBQSxJQUFJLEVBQUUsQ0FDRkosZUFBZSxDQUFDYyx1QkFEZCxFQUVGZCxlQUFlLENBQUNlLG9CQUZkLENBSEE7QUFPTk4sVUFBQUEsSUFBSSxFQUFFVCxlQUFlLENBQUNnQjtBQVBoQixTQWJQO0FBdUJIQyxRQUFBQSxpQkFBaUIsRUFBRTtBQUNmbEIsVUFBQUEsTUFBTSxFQUFFbUIsSUFBSSxDQUFDLG9DQUFELENBREc7QUFFZmhCLFVBQUFBLFdBQVcsRUFBRWdCLElBQUksQ0FBQyxrQ0FBRCxDQUZGO0FBR2ZkLFVBQUFBLElBQUksRUFBRSxDQUNGO0FBQ0llLFlBQUFBLElBQUksRUFBRUQsSUFBSSxDQUFDLG9DQUFELENBRGQ7QUFFSUUsWUFBQUEsVUFBVSxFQUFFO0FBRmhCLFdBREUsQ0FIUztBQVNmQyxVQUFBQSxjQUFjLEVBQUVILElBQUksQ0FBQyw2Q0FBRCxDQVRMO0FBVWZJLFVBQUFBLFFBQVEsRUFBRSxDQUNOLGVBRE0sRUFFTixzQkFGTSxFQUdOLHVCQUhNLEVBSU4sYUFKTSxDQVZLO0FBZ0JmQyxVQUFBQSxPQUFPLEVBQUU7QUFDTHhCLFlBQUFBLE1BQU0sRUFBRW1CLElBQUksQ0FBQyw0Q0FBRCxDQURQO0FBRUxNLFlBQUFBLElBQUksRUFBRU4sSUFBSSxDQUFDLHFDQUFEO0FBRkw7QUFoQk07QUF2QmhCLE9BQVA7QUE2Q0g7Ozs7RUFqRW1DTyxzQixHQXVFeEM7OztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCL0IseUJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBUb29sdGlwQnVpbGRlciwgaTE4biwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciAqL1xuXG4vKipcbiAqIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIgLSBTcGVjaWFsaXplZCB0b29sdGlwIG1hbmFnZW1lbnQgZm9yIElBWCBwcm92aWRlcnNcbiAqIFxuICogVGhpcyBjbGFzcyBleHRlbmRzIHRoZSBiYXNlIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIgdG8gcHJvdmlkZSBJQVgtc3BlY2lmaWNcbiAqIHRvb2x0aXAgY29uZmlndXJhdGlvbnMuIEl0IGNvbWJpbmVzIGNvbW1vbiBwcm92aWRlciB0b29sdGlwcyB3aXRoIElBWC1zcGVjaWZpY1xuICogZmllbGQgdG9vbHRpcHMgZm9yIGNvbXByZWhlbnNpdmUgZm9ybSBndWlkYW5jZS5cbiAqIFxuICogRmVhdHVyZXM6XG4gKiAtIEluaGVyaXRzIGNvbW1vbiBwcm92aWRlciB0b29sdGlwIGZ1bmN0aW9uYWxpdHlcbiAqIC0gSUFYLXNwZWNpZmljIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgKHBvcnQsIG1hbnVhbCBhdHRyaWJ1dGVzLCBldGMuKVxuICogLSBJbnRlZ3JhdGlvbiB3aXRoIGV4aXN0aW5nIFRvb2x0aXBCdWlsZGVyXG4gKiAtIENvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmcgYW5kIHZhbGlkYXRpb25cbiAqIFxuICogQGNsYXNzIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXJcbiAqIEBleHRlbmRzIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXJcbiAqL1xuY2xhc3MgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciBleHRlbmRzIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIge1xuICAgIC8qKlxuICAgICAqIFByaXZhdGUgY29uc3RydWN0b3IgdG8gcHJldmVudCBpbnN0YW50aWF0aW9uXG4gICAgICogVGhpcyBjbGFzcyB1c2VzIHN0YXRpYyBtZXRob2RzIGZvciB1dGlsaXR5IGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyIGlzIGEgc3RhdGljIGNsYXNzIGFuZCBjYW5ub3QgYmUgaW5zdGFudGlhdGVkJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IElBWC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICogXG4gICAgICogVGhpcyBtZXRob2QgaW1wbGVtZW50cyB0aGUgYWJzdHJhY3QgbWV0aG9kIGZyb20gUHJvdmlkZXJUb29sdGlwTWFuYWdlclxuICAgICAqIGFuZCBwcm92aWRlcyBhbGwgSUFYLXNwZWNpZmljIHRvb2x0aXAgY29uZmlndXJhdGlvbnMuXG4gICAgICogXG4gICAgICogQHN0YXRpY1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IElBWC1zcGVjaWZpYyB0b29sdGlwIGNvbmZpZ3VyYXRpb25zXG4gICAgICovXG4gICAgc3RhdGljIGdldFByb3ZpZGVyU3BlY2lmaWNDb25maWd1cmF0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHByb3ZpZGVyX2hvc3Q6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9vdXRib3VuZF91c2UsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX3VzZVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGlheF9wb3J0OiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2luZm9cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbWFudWFsX2F0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXInKSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MnKSxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9leGFtcGxlc19oZWFkZXInKSxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnbGFuZ3VhZ2UgPSBydScsXG4gICAgICAgICAgICAgICAgICAgICdjb2RlY3ByaW9yaXR5ID0gaG9zdCcsXG4gICAgICAgICAgICAgICAgICAgICd0cnVua3RpbWVzdGFtcHMgPSB5ZXMnLFxuICAgICAgICAgICAgICAgICAgICAndHJ1bmsgPSB5ZXMnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyJyksXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF93YXJuaW5nJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG5cblxufVxuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXI7XG59Il19