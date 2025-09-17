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

/* global globalRootUrl, PbxApi */

/**
 * NetworkFiltersAPI module for working with network filters.
 * Provides methods to fetch network filter data for dropdowns.
 * 
 * API response format:
 * {
 *   result: true,
 *   data: [
 *     { value: 'none', represent: '<i class="globe icon"></i> Allow from any address' },
 *     { value: '123', represent: '<i class="filter icon"></i> Office Network (192.168.1.0/24)' }
 *   ]
 * }
 * 
 * @module NetworkFiltersAPI
 */
var NetworkFiltersAPI = {
  /**
   * Get all network filters for dropdown select
   * Returns filters with 'value' and 'represent' fields
   * 
   * @param {Function} callback - Callback function that receives data array or false on error
   */
  getNetworksForSelect: function getNetworksForSelect(callback) {
    var url = "/pbxcore/api/v3/network-filters:getForSelect";
    $.api({
      url: url,
      on: 'now',
      method: 'GET',
      data: {
        categories: ['SIP', 'IAX', 'AMI', 'API']
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get network filters for dropdown select filtered by categories
   * Returns filters with 'value' and 'represent' fields
   * 
   * @param {Function} callback - Callback function that receives data array or false on error
   * @param {Array|string} categories - Filter categories: 'SIP', 'IAX', 'AMI', 'API' (default: ['SIP'])
   */
  getForSelect: function getForSelect(callback) {
    var categories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['SIP'];
    var includeLocalhost = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var url = "/pbxcore/api/v3/network-filters:getForSelect";
    var params = {
      categories: categories
    }; // Add includeLocalhost flag for AMI/API categories

    if (includeLocalhost && (categories.includes('AMI') || categories.includes('API'))) {
      params.includeLocalhost = true;
    }

    $.api({
      url: url,
      on: 'now',
      method: 'GET',
      data: params,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(false);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Initialize network filter dropdown
   * @deprecated Use NetworkFilterSelector module instead for better functionality
   * 
   * @param {jQuery|string} selector - Dropdown selector or jQuery element
   * @param {Object} options - Configuration options
   * @param {string} options.currentValue - Current selected value
   * @param {string} options.providerType - Provider type ('SIP' or 'IAX')
   * @param {Function} options.onChange - On change callback
   * @returns {jQuery} Initialized dropdown element
   */
  initializeDropdown: function initializeDropdown(selector) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var $select = typeof selector === 'string' ? $(selector) : selector;
    if (!$select || $select.length === 0) return $select;
    var currentValue = options.currentValue || 'none';
    var categories = options.providerType === 'IAX' ? ['IAX'] : ['SIP']; // Initialize Semantic UI dropdown first

    $select.dropdown({
      forceSelection: false,
      onChange: function onChange(value) {
        if (options.onChange) options.onChange(value);
      }
    }); // Get the wrapper element created by Fomantic UI

    var $dropdown = $select.parent('.ui.dropdown'); // Show loading state on wrapper

    $dropdown.addClass('loading'); // Load data and populate dropdown

    this.getForSelect(function (data) {
      // Remove loading state from wrapper
      $dropdown.removeClass('loading');

      if (data && Array.isArray(data)) {
        // Clear and populate options
        $select.empty();
        data.forEach(function (filter) {
          // Use 'represent' field from new API structure
          $select.append("<option value=\"".concat(filter.value, "\">").concat(filter.represent, "</option>"));
        }); // Set current value and refresh dropdown

        $select.val(currentValue);
        $dropdown.dropdown('refresh'); // Set selected value if it exists in options

        if (currentValue && $select.find("option[value=\"".concat(currentValue, "\"]")).length > 0) {
          $dropdown.dropdown('set selected', currentValue);
        }
      } else {
        // Fallback to default "none" option
        var noneText = globalTranslate.ex_NoNetworkFilter || 'Connections from any addresses are allowed';
        $select.empty().append("<option value=\"none\"><i class=\"globe icon\"></i> ".concat(noneText, "</option>"));
        $select.val('none');
        $dropdown.dropdown('refresh');
        $dropdown.dropdown('set selected', 'none');
      }
    }, categories);
    return $dropdown;
  }
}; // Export as part of window object for use in other modules

window.NetworkFiltersAPI = NetworkFiltersAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbmV0d29ya0ZpbHRlcnNBUEkuanMiXSwibmFtZXMiOlsiTmV0d29ya0ZpbHRlcnNBUEkiLCJnZXROZXR3b3Jrc0ZvclNlbGVjdCIsImNhbGxiYWNrIiwidXJsIiwiJCIsImFwaSIsIm9uIiwibWV0aG9kIiwiZGF0YSIsImNhdGVnb3JpZXMiLCJzdWNjZXNzVGVzdCIsIlBieEFwaSIsIm9uU3VjY2VzcyIsInJlc3BvbnNlIiwib25GYWlsdXJlIiwib25FcnJvciIsImdldEZvclNlbGVjdCIsImluY2x1ZGVMb2NhbGhvc3QiLCJwYXJhbXMiLCJpbmNsdWRlcyIsImluaXRpYWxpemVEcm9wZG93biIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRzZWxlY3QiLCJsZW5ndGgiLCJjdXJyZW50VmFsdWUiLCJwcm92aWRlclR5cGUiLCJkcm9wZG93biIsImZvcmNlU2VsZWN0aW9uIiwib25DaGFuZ2UiLCJ2YWx1ZSIsIiRkcm9wZG93biIsInBhcmVudCIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJBcnJheSIsImlzQXJyYXkiLCJlbXB0eSIsImZvckVhY2giLCJmaWx0ZXIiLCJhcHBlbmQiLCJyZXByZXNlbnQiLCJ2YWwiLCJmaW5kIiwibm9uZVRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9Ob05ldHdvcmtGaWx0ZXIiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRztBQUV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBUnNCLGdDQVFEQyxRQVJDLEVBUVM7QUFDM0Is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QWhCRCxNQWdCTztBQUNIO0FBQ0EsWUFBTW1CLFFBQVEsR0FBR0MsZUFBZSxDQUFDQyxrQkFBaEIsSUFBc0MsNENBQXZEO0FBQ0F2QixRQUFBQSxPQUFPLENBQUNjLEtBQVIsR0FBZ0JHLE1BQWhCLCtEQUEwRUksUUFBMUU7QUFDQXJCLFFBQUFBLE9BQU8sQ0FBQ21CLEdBQVIsQ0FBWSxNQUFaO0FBQ0FYLFFBQUFBLFNBQVMsQ0FBQ0osUUFBVixDQUFtQixTQUFuQjtBQUNBSSxRQUFBQSxTQUFTLENBQUNKLFFBQVYsQ0FBbUIsY0FBbkIsRUFBbUMsTUFBbkM7QUFDSDtBQUNKLEtBNUJELEVBNEJHbEIsVUE1Qkg7QUE4QkEsV0FBT3NCLFNBQVA7QUFDSDtBQXBJcUIsQ0FBMUIsQyxDQXdJQTs7QUFDQWdCLE1BQU0sQ0FBQy9DLGlCQUFQLEdBQTJCQSxpQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpICovXG5cbi8qKlxuICogTmV0d29ya0ZpbHRlcnNBUEkgbW9kdWxlIGZvciB3b3JraW5nIHdpdGggbmV0d29yayBmaWx0ZXJzLlxuICogUHJvdmlkZXMgbWV0aG9kcyB0byBmZXRjaCBuZXR3b3JrIGZpbHRlciBkYXRhIGZvciBkcm9wZG93bnMuXG4gKiBcbiAqIEFQSSByZXNwb25zZSBmb3JtYXQ6XG4gKiB7XG4gKiAgIHJlc3VsdDogdHJ1ZSxcbiAqICAgZGF0YTogW1xuICogICAgIHsgdmFsdWU6ICdub25lJywgcmVwcmVzZW50OiAnPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiBBbGxvdyBmcm9tIGFueSBhZGRyZXNzJyB9LFxuICogICAgIHsgdmFsdWU6ICcxMjMnLCByZXByZXNlbnQ6ICc8aSBjbGFzcz1cImZpbHRlciBpY29uXCI+PC9pPiBPZmZpY2UgTmV0d29yayAoMTkyLjE2OC4xLjAvMjQpJyB9XG4gKiAgIF1cbiAqIH1cbiAqIFxuICogQG1vZHVsZSBOZXR3b3JrRmlsdGVyc0FQSVxuICovXG5jb25zdCBOZXR3b3JrRmlsdGVyc0FQSSA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIG5ldHdvcmsgZmlsdGVycyBmb3IgZHJvcGRvd24gc2VsZWN0XG4gICAgICogUmV0dXJucyBmaWx0ZXJzIHdpdGggJ3ZhbHVlJyBhbmQgJ3JlcHJlc2VudCcgZmllbGRzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIGRhdGEgYXJyYXkgb3IgZmFsc2Ugb24gZXJyb3JcbiAgICAgKi9cbiAgICBnZXROZXR3b3Jrc0ZvclNlbGVjdChjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1cmwgPSBgL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3RgO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IFsnU0lQJywgJ0lBWCcsICdBTUknLCAnQVBJJ11cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBuZXR3b3JrIGZpbHRlcnMgZm9yIGRyb3Bkb3duIHNlbGVjdCBmaWx0ZXJlZCBieSBjYXRlZ29yaWVzXG4gICAgICogUmV0dXJucyBmaWx0ZXJzIHdpdGggJ3ZhbHVlJyBhbmQgJ3JlcHJlc2VudCcgZmllbGRzXG4gICAgICogXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIGRhdGEgYXJyYXkgb3IgZmFsc2Ugb24gZXJyb3JcbiAgICAgKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gY2F0ZWdvcmllcyAtIEZpbHRlciBjYXRlZ29yaWVzOiAnU0lQJywgJ0lBWCcsICdBTUknLCAnQVBJJyAoZGVmYXVsdDogWydTSVAnXSlcbiAgICAgKi9cbiAgICBnZXRGb3JTZWxlY3QoY2FsbGJhY2ssIGNhdGVnb3JpZXMgPSBbJ1NJUCddLCBpbmNsdWRlTG9jYWxob3N0ID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgdXJsID0gYC9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXNcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBpbmNsdWRlTG9jYWxob3N0IGZsYWcgZm9yIEFNSS9BUEkgY2F0ZWdvcmllc1xuICAgICAgICBpZiAoaW5jbHVkZUxvY2FsaG9zdCAmJiAoY2F0ZWdvcmllcy5pbmNsdWRlcygnQU1JJykgfHwgY2F0ZWdvcmllcy5pbmNsdWRlcygnQVBJJykpKSB7XG4gICAgICAgICAgICBwYXJhbXMuaW5jbHVkZUxvY2FsaG9zdCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93blxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBOZXR3b3JrRmlsdGVyU2VsZWN0b3IgbW9kdWxlIGluc3RlYWQgZm9yIGJldHRlciBmdW5jdGlvbmFsaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtqUXVlcnl8c3RyaW5nfSBzZWxlY3RvciAtIERyb3Bkb3duIHNlbGVjdG9yIG9yIGpRdWVyeSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5jdXJyZW50VmFsdWUgLSBDdXJyZW50IHNlbGVjdGVkIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMucHJvdmlkZXJUeXBlIC0gUHJvdmlkZXIgdHlwZSAoJ1NJUCcgb3IgJ0lBWCcpXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy5vbkNoYW5nZSAtIE9uIGNoYW5nZSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtqUXVlcnl9IEluaXRpYWxpemVkIGRyb3Bkb3duIGVsZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd24oc2VsZWN0b3IsIG9wdGlvbnMgPSB7fSkge1xuICAgICAgICBjb25zdCAkc2VsZWN0ID0gdHlwZW9mIHNlbGVjdG9yID09PSAnc3RyaW5nJyA/ICQoc2VsZWN0b3IpIDogc2VsZWN0b3I7XG4gICAgICAgIGlmICghJHNlbGVjdCB8fCAkc2VsZWN0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuICRzZWxlY3Q7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBvcHRpb25zLmN1cnJlbnRWYWx1ZSB8fCAnbm9uZSc7XG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBvcHRpb25zLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcgPyBbJ0lBWCddIDogWydTSVAnXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gZmlyc3RcbiAgICAgICAgJHNlbGVjdC5kcm9wZG93bih7XG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMub25DaGFuZ2UpIG9wdGlvbnMub25DaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCB0aGUgd3JhcHBlciBlbGVtZW50IGNyZWF0ZWQgYnkgRm9tYW50aWMgVUlcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJHNlbGVjdC5wYXJlbnQoJy51aS5kcm9wZG93bicpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHdyYXBwZXJcbiAgICAgICAgJGRyb3Bkb3duLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGRhdGEgYW5kIHBvcHVsYXRlIGRyb3Bkb3duXG4gICAgICAgIHRoaXMuZ2V0Rm9yU2VsZWN0KChkYXRhKSA9PiB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZSBmcm9tIHdyYXBwZXJcbiAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIG9wdGlvbnNcbiAgICAgICAgICAgICAgICAkc2VsZWN0LmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgZGF0YS5mb3JFYWNoKGZpbHRlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSAncmVwcmVzZW50JyBmaWVsZCBmcm9tIG5ldyBBUEkgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgICAgICRzZWxlY3QuYXBwZW5kKGA8b3B0aW9uIHZhbHVlPVwiJHtmaWx0ZXIudmFsdWV9XCI+JHtmaWx0ZXIucmVwcmVzZW50fTwvb3B0aW9uPmApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBjdXJyZW50IHZhbHVlIGFuZCByZWZyZXNoIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgJHNlbGVjdC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgdmFsdWUgaWYgaXQgZXhpc3RzIGluIG9wdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICRzZWxlY3QuZmluZChgb3B0aW9uW3ZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCJdYCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byBkZWZhdWx0IFwibm9uZVwiIG9wdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IG5vbmVUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLmV4X05vTmV0d29ya0ZpbHRlciB8fCAnQ29ubmVjdGlvbnMgZnJvbSBhbnkgYWRkcmVzc2VzIGFyZSBhbGxvd2VkJztcbiAgICAgICAgICAgICAgICAkc2VsZWN0LmVtcHR5KCkuYXBwZW5kKGA8b3B0aW9uIHZhbHVlPVwibm9uZVwiPjxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gJHtub25lVGV4dH08L29wdGlvbj5gKTtcbiAgICAgICAgICAgICAgICAkc2VsZWN0LnZhbCgnbm9uZScpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgY2F0ZWdvcmllcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gJGRyb3Bkb3duO1xuICAgIH0sXG4gICAgXG59O1xuXG4vLyBFeHBvcnQgYXMgcGFydCBvZiB3aW5kb3cgb2JqZWN0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93Lk5ldHdvcmtGaWx0ZXJzQVBJID0gTmV0d29ya0ZpbHRlcnNBUEk7Il19