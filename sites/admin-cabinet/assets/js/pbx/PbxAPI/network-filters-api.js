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

/* global globalRootUrl, globalTranslate, PbxApi, PbxApiClient, $ */

/**
 * NetworkFiltersAPI - REST API v3 client for network filters management
 *
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
 * @class NetworkFiltersAPI
 */
var NetworkFiltersAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/network-filters',
  customMethods: {
    getForSelect: ':getForSelect'
  }
}); // Add method aliases to NetworkFiltersAPI

Object.assign(NetworkFiltersAPI, {
  /**
   * Get all network filters for dropdown select
   * Returns filters with 'value' and 'represent' fields
   *
   * @param {Function} callback - Callback function that receives data array or false on error
   */
  getNetworksForSelect: function getNetworksForSelect(callback) {
    var params = {
      categories: ['SIP', 'IAX', 'AMI', 'API']
    };
    return this.callCustomMethod('getForSelect', params, function (response) {
      if (response && response.result === true && response.data) {
        callback(response.data);
      } else {
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
   * @param {boolean} includeLocalhost - Include localhost for AMI/API categories
   */
  getForSelect: function getForSelect(callback) {
    var categories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['SIP'];
    var includeLocalhost = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var params = {
      categories: categories
    }; // Add includeLocalhost flag for AMI/API categories

    if (includeLocalhost && (categories.includes('AMI') || categories.includes('API'))) {
      params.includeLocalhost = true;
    }

    return this.callCustomMethod('getForSelect', params, function (response) {
      if (response && response.result === true && response.data) {
        callback(response.data);
      } else {
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
        var noneText = globalTranslate.ex_NoNetworkFilter;
        $select.empty().append("<option value=\"none\"><i class=\"globe icon\"></i> ".concat(noneText, "</option>"));
        $select.val('none');
        $dropdown.dropdown('refresh');
        $dropdown.dropdown('set selected', 'none');
      }
    }, categories);
    return $dropdown;
  }
}); // Export as part of window object for use in other modules

window.NetworkFiltersAPI = NetworkFiltersAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbmV0d29yay1maWx0ZXJzLWFwaS5qcyJdLCJuYW1lcyI6WyJOZXR3b3JrRmlsdGVyc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldEZvclNlbGVjdCIsIk9iamVjdCIsImFzc2lnbiIsImdldE5ldHdvcmtzRm9yU2VsZWN0IiwiY2FsbGJhY2siLCJwYXJhbXMiLCJjYXRlZ29yaWVzIiwiY2FsbEN1c3RvbU1ldGhvZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsImluY2x1ZGVMb2NhbGhvc3QiLCJpbmNsdWRlcyIsImluaXRpYWxpemVEcm9wZG93biIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRzZWxlY3QiLCIkIiwibGVuZ3RoIiwiY3VycmVudFZhbHVlIiwicHJvdmlkZXJUeXBlIiwiZHJvcGRvd24iLCJmb3JjZVNlbGVjdGlvbiIsIm9uQ2hhbmdlIiwidmFsdWUiLCIkZHJvcGRvd24iLCJwYXJlbnQiLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwiQXJyYXkiLCJpc0FycmF5IiwiZW1wdHkiLCJmb3JFYWNoIiwiZmlsdGVyIiwiYXBwZW5kIiwicmVwcmVzZW50IiwidmFsIiwiZmluZCIsIm5vbmVUZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfTm9OZXR3b3JrRmlsdGVyIiwid2luZG93Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ3ZDQyxFQUFBQSxRQUFRLEVBQUUsaUNBRDZCO0FBRXZDQyxFQUFBQSxh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QUEsU0FBUyxDQUFDSixRQUFWLENBQW1CLFNBQW5CO0FBQ0FJLFFBQUFBLFNBQVMsQ0FBQ0osUUFBVixDQUFtQixjQUFuQixFQUFtQyxNQUFuQztBQUNIO0FBQ0osS0E1QkQsRUE0QkdmLFVBNUJIO0FBOEJBLFdBQU9tQixTQUFQO0FBQ0g7QUFqSDRCLENBQWpDLEUsQ0FxSEE7O0FBQ0FnQixNQUFNLENBQUM3QyxpQkFBUCxHQUEyQkEsaUJBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBQYnhBcGlDbGllbnQsICQgKi9cblxuLyoqXG4gKiBOZXR3b3JrRmlsdGVyc0FQSSAtIFJFU1QgQVBJIHYzIGNsaWVudCBmb3IgbmV0d29yayBmaWx0ZXJzIG1hbmFnZW1lbnRcbiAqXG4gKiBQcm92aWRlcyBtZXRob2RzIHRvIGZldGNoIG5ldHdvcmsgZmlsdGVyIGRhdGEgZm9yIGRyb3Bkb3ducy5cbiAqXG4gKiBBUEkgcmVzcG9uc2UgZm9ybWF0OlxuICoge1xuICogICByZXN1bHQ6IHRydWUsXG4gKiAgIGRhdGE6IFtcbiAqICAgICB7IHZhbHVlOiAnbm9uZScsIHJlcHJlc2VudDogJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gQWxsb3cgZnJvbSBhbnkgYWRkcmVzcycgfSxcbiAqICAgICB7IHZhbHVlOiAnMTIzJywgcmVwcmVzZW50OiAnPGkgY2xhc3M9XCJmaWx0ZXIgaWNvblwiPjwvaT4gT2ZmaWNlIE5ldHdvcmsgKDE5Mi4xNjguMS4wLzI0KScgfVxuICogICBdXG4gKiB9XG4gKlxuICogQGNsYXNzIE5ldHdvcmtGaWx0ZXJzQVBJXG4gKi9cbmNvbnN0IE5ldHdvcmtGaWx0ZXJzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldEZvclNlbGVjdDogJzpnZXRGb3JTZWxlY3QnXG4gICAgfVxufSk7XG5cbi8vIEFkZCBtZXRob2QgYWxpYXNlcyB0byBOZXR3b3JrRmlsdGVyc0FQSVxuT2JqZWN0LmFzc2lnbihOZXR3b3JrRmlsdGVyc0FQSSwge1xuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBuZXR3b3JrIGZpbHRlcnMgZm9yIGRyb3Bkb3duIHNlbGVjdFxuICAgICAqIFJldHVybnMgZmlsdGVycyB3aXRoICd2YWx1ZScgYW5kICdyZXByZXNlbnQnIGZpZWxkc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIGRhdGEgYXJyYXkgb3IgZmFsc2Ugb24gZXJyb3JcbiAgICAgKi9cbiAgICBnZXROZXR3b3Jrc0ZvclNlbGVjdChjYWxsYmFjaykge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBbJ1NJUCcsICdJQVgnLCAnQU1JJywgJ0FQSSddXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0Rm9yU2VsZWN0JywgcGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbmV0d29yayBmaWx0ZXJzIGZvciBkcm9wZG93biBzZWxlY3QgZmlsdGVyZWQgYnkgY2F0ZWdvcmllc1xuICAgICAqIFJldHVybnMgZmlsdGVycyB3aXRoICd2YWx1ZScgYW5kICdyZXByZXNlbnQnIGZpZWxkc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IHJlY2VpdmVzIGRhdGEgYXJyYXkgb3IgZmFsc2Ugb24gZXJyb3JcbiAgICAgKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gY2F0ZWdvcmllcyAtIEZpbHRlciBjYXRlZ29yaWVzOiAnU0lQJywgJ0lBWCcsICdBTUknLCAnQVBJJyAoZGVmYXVsdDogWydTSVAnXSlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGluY2x1ZGVMb2NhbGhvc3QgLSBJbmNsdWRlIGxvY2FsaG9zdCBmb3IgQU1JL0FQSSBjYXRlZ29yaWVzXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KGNhbGxiYWNrLCBjYXRlZ29yaWVzID0gWydTSVAnXSwgaW5jbHVkZUxvY2FsaG9zdCA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXNcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgaW5jbHVkZUxvY2FsaG9zdCBmbGFnIGZvciBBTUkvQVBJIGNhdGVnb3JpZXNcbiAgICAgICAgaWYgKGluY2x1ZGVMb2NhbGhvc3QgJiYgKGNhdGVnb3JpZXMuaW5jbHVkZXMoJ0FNSScpIHx8IGNhdGVnb3JpZXMuaW5jbHVkZXMoJ0FQSScpKSkge1xuICAgICAgICAgICAgcGFyYW1zLmluY2x1ZGVMb2NhbGhvc3QgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0Rm9yU2VsZWN0JywgcGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93blxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBOZXR3b3JrRmlsdGVyU2VsZWN0b3IgbW9kdWxlIGluc3RlYWQgZm9yIGJldHRlciBmdW5jdGlvbmFsaXR5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxzdHJpbmd9IHNlbGVjdG9yIC0gRHJvcGRvd24gc2VsZWN0b3Igb3IgalF1ZXJ5IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmN1cnJlbnRWYWx1ZSAtIEN1cnJlbnQgc2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5wcm92aWRlclR5cGUgLSBQcm92aWRlciB0eXBlICgnU0lQJyBvciAnSUFYJylcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLm9uQ2hhbmdlIC0gT24gY2hhbmdlIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2pRdWVyeX0gSW5pdGlhbGl6ZWQgZHJvcGRvd24gZWxlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRzZWxlY3QgPSB0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnID8gJChzZWxlY3RvcikgOiBzZWxlY3RvcjtcbiAgICAgICAgaWYgKCEkc2VsZWN0IHx8ICRzZWxlY3QubGVuZ3RoID09PSAwKSByZXR1cm4gJHNlbGVjdDtcblxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBvcHRpb25zLmN1cnJlbnRWYWx1ZSB8fCAnbm9uZSc7XG4gICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBvcHRpb25zLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcgPyBbJ0lBWCddIDogWydTSVAnXTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIGZpcnN0XG4gICAgICAgICRzZWxlY3QuZHJvcGRvd24oe1xuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9uQ2hhbmdlKSBvcHRpb25zLm9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSB3cmFwcGVyIGVsZW1lbnQgY3JlYXRlZCBieSBGb21hbnRpYyBVSVxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkc2VsZWN0LnBhcmVudCgnLnVpLmRyb3Bkb3duJyk7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIG9uIHdyYXBwZXJcbiAgICAgICAgJGRyb3Bkb3duLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gTG9hZCBkYXRhIGFuZCBwb3B1bGF0ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmdldEZvclNlbGVjdCgoZGF0YSkgPT4ge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGUgZnJvbSB3cmFwcGVyXG4gICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKGRhdGEgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGFuZCBwb3B1bGF0ZSBvcHRpb25zXG4gICAgICAgICAgICAgICAgJHNlbGVjdC5lbXB0eSgpO1xuICAgICAgICAgICAgICAgIGRhdGEuZm9yRWFjaChmaWx0ZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgJ3JlcHJlc2VudCcgZmllbGQgZnJvbSBuZXcgQVBJIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgICAgICAkc2VsZWN0LmFwcGVuZChgPG9wdGlvbiB2YWx1ZT1cIiR7ZmlsdGVyLnZhbHVlfVwiPiR7ZmlsdGVyLnJlcHJlc2VudH08L29wdGlvbj5gKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBjdXJyZW50IHZhbHVlIGFuZCByZWZyZXNoIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgJHNlbGVjdC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBpZiBpdCBleGlzdHMgaW4gb3B0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUgJiYgJHNlbGVjdC5maW5kKGBvcHRpb25bdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIl1gKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgXCJub25lXCIgb3B0aW9uXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9uZVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfTm9OZXR3b3JrRmlsdGVyO1xuICAgICAgICAgICAgICAgICRzZWxlY3QuZW1wdHkoKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9XCJub25lXCI+PGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiAke25vbmVUZXh0fTwvb3B0aW9uPmApO1xuICAgICAgICAgICAgICAgICRzZWxlY3QudmFsKCdub25lJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCAnbm9uZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBjYXRlZ29yaWVzKTtcblxuICAgICAgICByZXR1cm4gJGRyb3Bkb3duO1xuICAgIH1cblxufSk7XG5cbi8vIEV4cG9ydCBhcyBwYXJ0IG9mIHdpbmRvdyBvYmplY3QgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuTmV0d29ya0ZpbHRlcnNBUEkgPSBOZXR3b3JrRmlsdGVyc0FQSTsiXX0=