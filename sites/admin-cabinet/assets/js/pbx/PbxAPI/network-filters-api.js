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
        var noneText = globalTranslate.ex_NoNetworkFilter;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbmV0d29yay1maWx0ZXJzLWFwaS5qcyJdLCJuYW1lcyI6WyJOZXR3b3JrRmlsdGVyc0FQSSIsImdldE5ldHdvcmtzRm9yU2VsZWN0IiwiY2FsbGJhY2siLCJ1cmwiLCIkIiwiYXBpIiwib24iLCJtZXRob2QiLCJkYXRhIiwiY2F0ZWdvcmllcyIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwiZ2V0Rm9yU2VsZWN0IiwiaW5jbHVkZUxvY2FsaG9zdCIsInBhcmFtcyIsImluY2x1ZGVzIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJHNlbGVjdCIsImxlbmd0aCIsImN1cnJlbnRWYWx1ZSIsInByb3ZpZGVyVHlwZSIsImRyb3Bkb3duIiwiZm9yY2VTZWxlY3Rpb24iLCJvbkNoYW5nZSIsInZhbHVlIiwiJGRyb3Bkb3duIiwicGFyZW50IiwiYWRkQ2xhc3MiLCJyZW1vdmVDbGFzcyIsIkFycmF5IiwiaXNBcnJheSIsImVtcHR5IiwiZm9yRWFjaCIsImZpbHRlciIsImFwcGVuZCIsInJlcHJlc2VudCIsInZhbCIsImZpbmQiLCJub25lVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X05vTmV0d29ya0ZpbHRlciIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBRXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFSc0IsZ0NBUURDLFFBUkMsRUFRUztBQUMz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LE9BaEJELE1BZ0JPO0FBQ0g7QUFDQSxZQUFNbUIsUUFBUSxHQUFHQyxlQUFlLENBQUNDLGtCQUFqQztBQUNBdkIsUUFBQUEsT0FBTyxDQUFDYyxLQUFSLEdBQWdCRyxNQUFoQiwrREFBMEVJLFFBQTFFO0FBQ0FyQixRQUFBQSxPQUFPLENBQUNtQixHQUFSLENBQVksTUFBWjtBQUNBWCxRQUFBQSxTQUFTLENBQUNKLFFBQVYsQ0FBbUIsU0FBbkI7QUFDQUksUUFBQUEsU0FBUyxDQUFDSixRQUFWLENBQW1CLGNBQW5CLEVBQW1DLE1BQW5DO0FBQ0g7QUFDSixLQTVCRCxFQTRCR2xCLFVBNUJIO0FBOEJBLFdBQU9zQixTQUFQO0FBQ0g7QUFwSXFCLENBQTFCLEMsQ0F3SUE7O0FBQ0FnQixNQUFNLENBQUMvQyxpQkFBUCxHQUEyQkEsaUJBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSAqLyBcblxuLyoqXG4gKiBOZXR3b3JrRmlsdGVyc0FQSSBtb2R1bGUgZm9yIHdvcmtpbmcgd2l0aCBuZXR3b3JrIGZpbHRlcnMuXG4gKiBQcm92aWRlcyBtZXRob2RzIHRvIGZldGNoIG5ldHdvcmsgZmlsdGVyIGRhdGEgZm9yIGRyb3Bkb3ducy5cbiAqIFxuICogQVBJIHJlc3BvbnNlIGZvcm1hdDpcbiAqIHtcbiAqICAgcmVzdWx0OiB0cnVlLFxuICogICBkYXRhOiBbXG4gKiAgICAgeyB2YWx1ZTogJ25vbmUnLCByZXByZXNlbnQ6ICc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+IEFsbG93IGZyb20gYW55IGFkZHJlc3MnIH0sXG4gKiAgICAgeyB2YWx1ZTogJzEyMycsIHJlcHJlc2VudDogJzxpIGNsYXNzPVwiZmlsdGVyIGljb25cIj48L2k+IE9mZmljZSBOZXR3b3JrICgxOTIuMTY4LjEuMC8yNCknIH1cbiAqICAgXVxuICogfVxuICogXG4gKiBAbW9kdWxlIE5ldHdvcmtGaWx0ZXJzQVBJXG4gKi9cbmNvbnN0IE5ldHdvcmtGaWx0ZXJzQVBJID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhbGwgbmV0d29yayBmaWx0ZXJzIGZvciBkcm9wZG93biBzZWxlY3RcbiAgICAgKiBSZXR1cm5zIGZpbHRlcnMgd2l0aCAndmFsdWUnIGFuZCAncmVwcmVzZW50JyBmaWVsZHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgZGF0YSBhcnJheSBvciBmYWxzZSBvbiBlcnJvclxuICAgICAqL1xuICAgIGdldE5ldHdvcmtzRm9yU2VsZWN0KGNhbGxiYWNrKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdGA7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgY2F0ZWdvcmllczogWydTSVAnLCAnSUFYJywgJ0FNSScsICdBUEknXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IG5ldHdvcmsgZmlsdGVycyBmb3IgZHJvcGRvd24gc2VsZWN0IGZpbHRlcmVkIGJ5IGNhdGVnb3JpZXNcbiAgICAgKiBSZXR1cm5zIGZpbHRlcnMgd2l0aCAndmFsdWUnIGFuZCAncmVwcmVzZW50JyBmaWVsZHNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgcmVjZWl2ZXMgZGF0YSBhcnJheSBvciBmYWxzZSBvbiBlcnJvclxuICAgICAqIEBwYXJhbSB7QXJyYXl8c3RyaW5nfSBjYXRlZ29yaWVzIC0gRmlsdGVyIGNhdGVnb3JpZXM6ICdTSVAnLCAnSUFYJywgJ0FNSScsICdBUEknIChkZWZhdWx0OiBbJ1NJUCddKVxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdChjYWxsYmFjaywgY2F0ZWdvcmllcyA9IFsnU0lQJ10sIGluY2x1ZGVMb2NhbGhvc3QgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCB1cmwgPSBgL3BieGNvcmUvYXBpL3YzL25ldHdvcmstZmlsdGVyczpnZXRGb3JTZWxlY3RgO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllc1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGluY2x1ZGVMb2NhbGhvc3QgZmxhZyBmb3IgQU1JL0FQSSBjYXRlZ29yaWVzXG4gICAgICAgIGlmIChpbmNsdWRlTG9jYWxob3N0ICYmIChjYXRlZ29yaWVzLmluY2x1ZGVzKCdBTUknKSB8fCBjYXRlZ29yaWVzLmluY2x1ZGVzKCdBUEknKSkpIHtcbiAgICAgICAgICAgIHBhcmFtcy5pbmNsdWRlTG9jYWxob3N0ID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIE5ldHdvcmtGaWx0ZXJTZWxlY3RvciBtb2R1bGUgaW5zdGVhZCBmb3IgYmV0dGVyIGZ1bmN0aW9uYWxpdHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxzdHJpbmd9IHNlbGVjdG9yIC0gRHJvcGRvd24gc2VsZWN0b3Igb3IgalF1ZXJ5IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmN1cnJlbnRWYWx1ZSAtIEN1cnJlbnQgc2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5wcm92aWRlclR5cGUgLSBQcm92aWRlciB0eXBlICgnU0lQJyBvciAnSUFYJylcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLm9uQ2hhbmdlIC0gT24gY2hhbmdlIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2pRdWVyeX0gSW5pdGlhbGl6ZWQgZHJvcGRvd24gZWxlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRzZWxlY3QgPSB0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnID8gJChzZWxlY3RvcikgOiBzZWxlY3RvcjtcbiAgICAgICAgaWYgKCEkc2VsZWN0IHx8ICRzZWxlY3QubGVuZ3RoID09PSAwKSByZXR1cm4gJHNlbGVjdDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IG9wdGlvbnMuY3VycmVudFZhbHVlIHx8ICdub25lJztcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IG9wdGlvbnMucHJvdmlkZXJUeXBlID09PSAnSUFYJyA/IFsnSUFYJ10gOiBbJ1NJUCddO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biBmaXJzdFxuICAgICAgICAkc2VsZWN0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vbkNoYW5nZSkgb3B0aW9ucy5vbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSB3cmFwcGVyIGVsZW1lbnQgY3JlYXRlZCBieSBGb21hbnRpYyBVSVxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkc2VsZWN0LnBhcmVudCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgb24gd3JhcHBlclxuICAgICAgICAkZHJvcGRvd24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBhbmQgcG9wdWxhdGUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5nZXRGb3JTZWxlY3QoKGRhdGEpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlIGZyb20gd3JhcHBlclxuICAgICAgICAgICAgJGRyb3Bkb3duLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkYXRhICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBhbmQgcG9wdWxhdGUgb3B0aW9uc1xuICAgICAgICAgICAgICAgICRzZWxlY3QuZW1wdHkoKTtcbiAgICAgICAgICAgICAgICBkYXRhLmZvckVhY2goZmlsdGVyID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlICdyZXByZXNlbnQnIGZpZWxkIGZyb20gbmV3IEFQSSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICAgICAgJHNlbGVjdC5hcHBlbmQoYDxvcHRpb24gdmFsdWU9XCIke2ZpbHRlci52YWx1ZX1cIj4ke2ZpbHRlci5yZXByZXNlbnR9PC9vcHRpb24+YCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGN1cnJlbnQgdmFsdWUgYW5kIHJlZnJlc2ggZHJvcGRvd25cbiAgICAgICAgICAgICAgICAkc2VsZWN0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBpZiBpdCBleGlzdHMgaW4gb3B0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUgJiYgJHNlbGVjdC5maW5kKGBvcHRpb25bdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIl1gKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGRlZmF1bHQgXCJub25lXCIgb3B0aW9uXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9uZVRleHQgPSBnbG9iYWxUcmFuc2xhdGUuZXhfTm9OZXR3b3JrRmlsdGVyO1xuICAgICAgICAgICAgICAgICRzZWxlY3QuZW1wdHkoKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9XCJub25lXCI+PGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiAke25vbmVUZXh0fTwvb3B0aW9uPmApO1xuICAgICAgICAgICAgICAgICRzZWxlY3QudmFsKCdub25lJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCAnbm9uZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBjYXRlZ29yaWVzKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiAkZHJvcGRvd247XG4gICAgfSxcbiAgICBcbn07XG5cbi8vIEV4cG9ydCBhcyBwYXJ0IG9mIHdpbmRvdyBvYmplY3QgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuTmV0d29ya0ZpbHRlcnNBUEkgPSBOZXR3b3JrRmlsdGVyc0FQSTsiXX0=