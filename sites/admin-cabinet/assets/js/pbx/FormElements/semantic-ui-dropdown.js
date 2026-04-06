"use strict";

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

/* global $, UserMessage, globalTranslate */

/**
 * SemanticUIDropdownComponent - Simplified dropdown component (V3.0)
 * 
 * Lightweight wrapper around native Fomantic UI dropdown with API support.
 * No complex state management - uses native Fomantic UI apiSettings.
 * 
 * Usage:
 * SemanticUIDropdownComponent.init('#my-dropdown', {
 *     apiUrl: '/api/extensions/getForSelect',
 *     onChange: (value) => { // handle selection
 *     }
 * });
 */
var SemanticUIDropdownComponent = {
  /**
   * Initialize dropdown with native Fomantic UI (SIMPLIFIED)
   * @param {string|jQuery} selector - Dropdown selector
   * @param {object} config - Configuration options
   * @returns {jQuery|null} Initialized dropdown element
   */
  init: function init(selector) {
    var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var $dropdown = $(selector);

    if (!$dropdown.length) {
      console.error("Dropdown not found: ".concat(selector));
      return null;
    } // Build native Fomantic UI settings


    var settings = {
      onChange: config.onChange || function () {},
      onShow: config.onShow || function () {}
    }; // Add API settings if provided

    if (config.apiUrl) {
      settings.apiSettings = {
        url: config.apiUrl,
        cache: config.cache || false,
        // Fresh data by default
        onResponse: config.onResponse || function (response) {
          // Default response processing for MikoPBX API format
          if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
            return {
              success: true,
              results: response.data.map(function (item) {
                return {
                  value: item.value,
                  text: item.represent || item.name || item.text
                };
              })
            };
          } // Return error format if API failed


          return {
            success: false,
            results: []
          };
        }
      };
    } // Initialize native Fomantic UI dropdown


    $dropdown.dropdown(settings);
    return $dropdown;
  },

  /**
   * Simple helper methods (native Fomantic UI wrappers)
   */
  setValue: function setValue(selector, value) {
    $(selector).dropdown('set selected', value);
  },
  getValue: function getValue(selector) {
    return $(selector).dropdown('get value');
  },
  clear: function clear(selector) {
    $(selector).dropdown('clear');
  },
  refresh: function refresh(selector) {
    $(selector).dropdown('refresh');
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SemanticUIDropdownComponent;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc2VtYW50aWMtdWktZHJvcGRvd24uanMiXSwibmFtZXMiOlsiU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50IiwiaW5pdCIsInNlbGVjdG9yIiwiY29uZmlnIiwiJGRyb3Bkb3duIiwiJCIsImxlbmd0aCIsImNvbnNvbGUiLCJlcnJvciIsInNldHRpbmdzIiwib25DaGFuZ2UiLCJvblNob3ciLCJhcGlVcmwiLCJhcGlTZXR0aW5ncyIsInVybCIsImNhY2hlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicmVzdWx0Iiwic3VjY2VzcyIsImRhdGEiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHRzIiwibWFwIiwiaXRlbSIsInZhbHVlIiwidGV4dCIsInJlcHJlc2VudCIsIm5hbWUiLCJkcm9wZG93biIsInNldFZhbHVlIiwiZ2V0VmFsdWUiLCJjbGVhciIsInJlZnJlc2giLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSwyQkFBMkIsR0FBRztBQUVoQztBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsSUFSZ0MsZ0JBUTNCQyxRQVIyQixFQVFKO0FBQUEsUUFBYkMsTUFBYSx1RUFBSixFQUFJO0FBQ3hCLFFBQU1DLFNBQVMsR0FBR0MsQ0FBQyxDQUFDSCxRQUFELENBQW5COztBQUNBLFFBQUksQ0FBQ0UsU0FBUyxDQUFDRSxNQUFmLEVBQXVCO0FBQ25CQyxNQUFBQSxPQUFPLENBQUNDLEtBQVIsK0JBQXFDTixRQUFyQztBQUNBLGFBQU8sSUFBUDtBQUNILEtBTHVCLENBT3hCOzs7QUFDQSxRQUFNTyxRQUFRLEdBQUc7QUFDYkMsTUFBQUEsUUFBUSxFQUFFUCxNQUFNLENBQUNPLFFBQVAsSUFBbUIsWUFBVyxDQUFFLENBRDdCO0FBRWJDLE1BQUFBLE1BQU0sRUFBRVIsTUFBTSxDQUFDUSxNQUFQLElBQWlCLFlBQVcsQ0FBRTtBQUZ6QixLQUFqQixDQVJ3QixDQWF4Qjs7QUFDQSxRQUFJUixNQUFNLENBQUNTLE1BQVgsRUFBbUI7QUFDZkgsTUFBQUEsUUFBUSxDQUFDSSxXQUFULEdBQXVCO0FBQ25CQyxRQUFBQSxHQUFHLEVBQUVYLE1BQU0sQ0FBQ1MsTUFETztBQUVuQkcsUUFBQUEsS0FBSyxFQUFFWixNQUFNLENBQUNZLEtBQVAsSUFBZ0IsS0FGSjtBQUVZO0FBQy9CQyxRQUFBQSxVQUFVLEVBQUViLE1BQU0sQ0FBQ2EsVUFBUCxJQUFxQixVQUFTQyxRQUFULEVBQW1CO0FBQ2hEO0FBQ0EsY0FBSSxDQUFDQSxRQUFRLENBQUNDLE1BQVQsSUFBbUJELFFBQVEsQ0FBQ0UsT0FBN0IsS0FBeUNGLFFBQVEsQ0FBQ0csSUFBbEQsSUFBMERDLEtBQUssQ0FBQ0MsT0FBTixDQUFjTCxRQUFRLENBQUNHLElBQXZCLENBQTlELEVBQTRGO0FBQ3hGLG1CQUFPO0FBQ0hELGNBQUFBLE9BQU8sRUFBRSxJQUROO0FBRUhJLGNBQUFBLE9BQU8sRUFBRU4sUUFBUSxDQUFDRyxJQUFULENBQWNJLEdBQWQsQ0FBa0IsVUFBQUMsSUFBSTtBQUFBLHVCQUFLO0FBQ2hDQyxrQkFBQUEsS0FBSyxFQUFFRCxJQUFJLENBQUNDLEtBRG9CO0FBRWhDQyxrQkFBQUEsSUFBSSxFQUFFRixJQUFJLENBQUNHLFNBQUwsSUFBa0JILElBQUksQ0FBQ0ksSUFBdkIsSUFBK0JKLElBQUksQ0FBQ0U7QUFGVixpQkFBTDtBQUFBLGVBQXRCO0FBRk4sYUFBUDtBQU9ILFdBVitDLENBV2hEOzs7QUFDQSxpQkFBTztBQUNIUixZQUFBQSxPQUFPLEVBQUUsS0FETjtBQUVISSxZQUFBQSxPQUFPLEVBQUU7QUFGTixXQUFQO0FBSUg7QUFuQmtCLE9BQXZCO0FBcUJILEtBcEN1QixDQXNDeEI7OztBQUNBbkIsSUFBQUEsU0FBUyxDQUFDMEIsUUFBVixDQUFtQnJCLFFBQW5CO0FBRUEsV0FBT0wsU0FBUDtBQUNILEdBbEQrQjs7QUFvRGhDO0FBQ0o7QUFDQTtBQUVJMkIsRUFBQUEsUUF4RGdDLG9CQXdEdkI3QixRQXhEdUIsRUF3RGJ3QixLQXhEYSxFQXdETjtBQUN0QnJCLElBQUFBLENBQUMsQ0FBQ0gsUUFBRCxDQUFELENBQVk0QixRQUFaLENBQXFCLGNBQXJCLEVBQXFDSixLQUFyQztBQUNILEdBMUQrQjtBQTREaENNLEVBQUFBLFFBNURnQyxvQkE0RHZCOUIsUUE1RHVCLEVBNERiO0FBQ2YsV0FBT0csQ0FBQyxDQUFDSCxRQUFELENBQUQsQ0FBWTRCLFFBQVosQ0FBcUIsV0FBckIsQ0FBUDtBQUNILEdBOUQrQjtBQWdFaENHLEVBQUFBLEtBaEVnQyxpQkFnRTFCL0IsUUFoRTBCLEVBZ0VoQjtBQUNaRyxJQUFBQSxDQUFDLENBQUNILFFBQUQsQ0FBRCxDQUFZNEIsUUFBWixDQUFxQixPQUFyQjtBQUNILEdBbEUrQjtBQW9FaENJLEVBQUFBLE9BcEVnQyxtQkFvRXhCaEMsUUFwRXdCLEVBb0VkO0FBQ2RHLElBQUFBLENBQUMsQ0FBQ0gsUUFBRCxDQUFELENBQVk0QixRQUFaLENBQXFCLFNBQXJCO0FBQ0g7QUF0RStCLENBQXBDLEMsQ0F5RUE7O0FBQ0EsSUFBSSxPQUFPSyxNQUFQLEtBQWtCLFdBQWxCLElBQWlDQSxNQUFNLENBQUNDLE9BQTVDLEVBQXFEO0FBQ2pERCxFQUFBQSxNQUFNLENBQUNDLE9BQVAsR0FBaUJwQywyQkFBakI7QUFDSCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBVc2VyTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50IC0gU2ltcGxpZmllZCBkcm9wZG93biBjb21wb25lbnQgKFYzLjApXG4gKiBcbiAqIExpZ2h0d2VpZ2h0IHdyYXBwZXIgYXJvdW5kIG5hdGl2ZSBGb21hbnRpYyBVSSBkcm9wZG93biB3aXRoIEFQSSBzdXBwb3J0LlxuICogTm8gY29tcGxleCBzdGF0ZSBtYW5hZ2VtZW50IC0gdXNlcyBuYXRpdmUgRm9tYW50aWMgVUkgYXBpU2V0dGluZ3MuXG4gKiBcbiAqIFVzYWdlOlxuICogU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50LmluaXQoJyNteS1kcm9wZG93bicsIHtcbiAqICAgICBhcGlVcmw6ICcvYXBpL2V4dGVuc2lvbnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7IC8vIGhhbmRsZSBzZWxlY3Rpb25cbiAqICAgICB9XG4gKiB9KTtcbiAqL1xuY29uc3QgU2VtYW50aWNVSURyb3Bkb3duQ29tcG9uZW50ID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBuYXRpdmUgRm9tYW50aWMgVUkgKFNJTVBMSUZJRUQpXG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBzZWxlY3RvciAtIERyb3Bkb3duIHNlbGVjdG9yXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtqUXVlcnl8bnVsbH0gSW5pdGlhbGl6ZWQgZHJvcGRvd24gZWxlbWVudFxuICAgICAqL1xuICAgIGluaXQoc2VsZWN0b3IsIGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYERyb3Bkb3duIG5vdCBmb3VuZDogJHtzZWxlY3Rvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBuYXRpdmUgRm9tYW50aWMgVUkgc2V0dGluZ3NcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBvbkNoYW5nZTogY29uZmlnLm9uQ2hhbmdlIHx8IGZ1bmN0aW9uKCkge30sXG4gICAgICAgICAgICBvblNob3c6IGNvbmZpZy5vblNob3cgfHwgZnVuY3Rpb24oKSB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFQSSBzZXR0aW5ncyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoY29uZmlnLmFwaVVybCkge1xuICAgICAgICAgICAgc2V0dGluZ3MuYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICAgICAgdXJsOiBjb25maWcuYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgfHwgZmFsc2UsICAvLyBGcmVzaCBkYXRhIGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiBjb25maWcub25SZXNwb25zZSB8fCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZWZhdWx0IHJlc3BvbnNlIHByb2Nlc3NpbmcgZm9yIE1pa29QQlggQVBJIGZvcm1hdFxuICAgICAgICAgICAgICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiByZXNwb25zZS5kYXRhLm1hcChpdGVtID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHVybiBlcnJvciBmb3JtYXQgaWYgQVBJIGZhaWxlZFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gJGRyb3Bkb3duO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2ltcGxlIGhlbHBlciBtZXRob2RzIChuYXRpdmUgRm9tYW50aWMgVUkgd3JhcHBlcnMpXG4gICAgICovXG4gICAgXG4gICAgc2V0VmFsdWUoc2VsZWN0b3IsIHZhbHVlKSB7XG4gICAgICAgICQoc2VsZWN0b3IpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgfSxcbiAgICBcbiAgICBnZXRWYWx1ZShzZWxlY3Rvcikge1xuICAgICAgICByZXR1cm4gJChzZWxlY3RvcikuZHJvcGRvd24oJ2dldCB2YWx1ZScpO1xuICAgIH0sXG4gICAgXG4gICAgY2xlYXIoc2VsZWN0b3IpIHtcbiAgICAgICAgJChzZWxlY3RvcikuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgfSxcbiAgICBcbiAgICByZWZyZXNoKHNlbGVjdG9yKSB7XG4gICAgICAgICQoc2VsZWN0b3IpLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBTZW1hbnRpY1VJRHJvcGRvd25Db21wb25lbnQ7XG59Il19