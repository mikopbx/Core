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
    var url = "/pbxcore/api/v2/network-filters/getNetworksForSelect";
    $.api({
      url: url,
      on: 'now',
      method: 'GET',
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
    var url = "/pbxcore/api/v2/network-filters/getForSelect";
    $.api({
      url: url,
      on: 'now',
      method: 'GET',
      data: {
        categories: categories
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbmV0d29ya0ZpbHRlcnNBUEkuanMiXSwibmFtZXMiOlsiTmV0d29ya0ZpbHRlcnNBUEkiLCJnZXROZXR3b3Jrc0ZvclNlbGVjdCIsImNhbGxiYWNrIiwidXJsIiwiJCIsImFwaSIsIm9uIiwibWV0aG9kIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsImRhdGEiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwiZ2V0Rm9yU2VsZWN0IiwiY2F0ZWdvcmllcyIsImluaXRpYWxpemVEcm9wZG93biIsInNlbGVjdG9yIiwib3B0aW9ucyIsIiRzZWxlY3QiLCJsZW5ndGgiLCJjdXJyZW50VmFsdWUiLCJwcm92aWRlclR5cGUiLCJkcm9wZG93biIsImZvcmNlU2VsZWN0aW9uIiwib25DaGFuZ2UiLCJ2YWx1ZSIsIiRkcm9wZG93biIsInBhcmVudCIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJBcnJheSIsImlzQXJyYXkiLCJlbXB0eSIsImZvckVhY2giLCJmaWx0ZXIiLCJhcHBlbmQiLCJyZXByZXNlbnQiLCJ2YWwiLCJmaW5kIiwibm9uZVRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9Ob05ldHdvcmtGaWx0ZXIiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxpQkFBaUIsR0FBRztBQUV0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBUnNCLGdDQVFEQyxRQVJDLEVBUVM7QUFDM0IsUUFBTUMsR0FBRyx5REFBVDtBQUVBQyxJQUFBQSxDQUFDLENBQUND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QTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSAqL1xuXG4vKipcbiAqIE5ldHdvcmtGaWx0ZXJzQVBJIG1vZHVsZSBmb3Igd29ya2luZyB3aXRoIG5ldHdvcmsgZmlsdGVycy5cbiAqIFByb3ZpZGVzIG1ldGhvZHMgdG8gZmV0Y2ggbmV0d29yayBmaWx0ZXIgZGF0YSBmb3IgZHJvcGRvd25zLlxuICogXG4gKiBBUEkgcmVzcG9uc2UgZm9ybWF0OlxuICoge1xuICogICByZXN1bHQ6IHRydWUsXG4gKiAgIGRhdGE6IFtcbiAqICAgICB7IHZhbHVlOiAnbm9uZScsIHJlcHJlc2VudDogJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gQWxsb3cgZnJvbSBhbnkgYWRkcmVzcycgfSxcbiAqICAgICB7IHZhbHVlOiAnMTIzJywgcmVwcmVzZW50OiAnPGkgY2xhc3M9XCJmaWx0ZXIgaWNvblwiPjwvaT4gT2ZmaWNlIE5ldHdvcmsgKDE5Mi4xNjguMS4wLzI0KScgfVxuICogICBdXG4gKiB9XG4gKiBcbiAqIEBtb2R1bGUgTmV0d29ya0ZpbHRlcnNBUElcbiAqL1xuY29uc3QgTmV0d29ya0ZpbHRlcnNBUEkgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBuZXR3b3JrIGZpbHRlcnMgZm9yIGRyb3Bkb3duIHNlbGVjdFxuICAgICAqIFJldHVybnMgZmlsdGVycyB3aXRoICd2YWx1ZScgYW5kICdyZXByZXNlbnQnIGZpZWxkc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyBkYXRhIGFycmF5IG9yIGZhbHNlIG9uIGVycm9yXG4gICAgICovXG4gICAgZ2V0TmV0d29ya3NGb3JTZWxlY3QoY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgdXJsID0gYC9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0TmV0d29ya3NGb3JTZWxlY3RgO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbmV0d29yayBmaWx0ZXJzIGZvciBkcm9wZG93biBzZWxlY3QgZmlsdGVyZWQgYnkgY2F0ZWdvcmllc1xuICAgICAqIFJldHVybnMgZmlsdGVycyB3aXRoICd2YWx1ZScgYW5kICdyZXByZXNlbnQnIGZpZWxkc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyBkYXRhIGFycmF5IG9yIGZhbHNlIG9uIGVycm9yXG4gICAgICogQHBhcmFtIHtBcnJheXxzdHJpbmd9IGNhdGVnb3JpZXMgLSBGaWx0ZXIgY2F0ZWdvcmllczogJ1NJUCcsICdJQVgnLCAnQU1JJywgJ0FQSScgKGRlZmF1bHQ6IFsnU0lQJ10pXG4gICAgICovXG4gICAgZ2V0Rm9yU2VsZWN0KGNhbGxiYWNrLCBjYXRlZ29yaWVzID0gWydTSVAnXSkge1xuICAgICAgICBjb25zdCB1cmwgPSBgL3BieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXRGb3JTZWxlY3RgO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd25cbiAgICAgKiBAZGVwcmVjYXRlZCBVc2UgTmV0d29ya0ZpbHRlclNlbGVjdG9yIG1vZHVsZSBpbnN0ZWFkIGZvciBiZXR0ZXIgZnVuY3Rpb25hbGl0eVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fHN0cmluZ30gc2VsZWN0b3IgLSBEcm9wZG93biBzZWxlY3RvciBvciBqUXVlcnkgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuY3VycmVudFZhbHVlIC0gQ3VycmVudCBzZWxlY3RlZCB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLnByb3ZpZGVyVHlwZSAtIFByb3ZpZGVyIHR5cGUgKCdTSVAnIG9yICdJQVgnKVxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMub25DaGFuZ2UgLSBPbiBjaGFuZ2UgY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJucyB7alF1ZXJ5fSBJbml0aWFsaXplZCBkcm9wZG93biBlbGVtZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKHNlbGVjdG9yLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgY29uc3QgJHNlbGVjdCA9IHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgPyAkKHNlbGVjdG9yKSA6IHNlbGVjdG9yO1xuICAgICAgICBpZiAoISRzZWxlY3QgfHwgJHNlbGVjdC5sZW5ndGggPT09IDApIHJldHVybiAkc2VsZWN0O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gb3B0aW9ucy5jdXJyZW50VmFsdWUgfHwgJ25vbmUnO1xuICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gb3B0aW9ucy5wcm92aWRlclR5cGUgPT09ICdJQVgnID8gWydJQVgnXSA6IFsnU0lQJ107XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIGZpcnN0XG4gICAgICAgICRzZWxlY3QuZHJvcGRvd24oe1xuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm9uQ2hhbmdlKSBvcHRpb25zLm9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgdGhlIHdyYXBwZXIgZWxlbWVudCBjcmVhdGVkIGJ5IEZvbWFudGljIFVJXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICRzZWxlY3QucGFyZW50KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBvbiB3cmFwcGVyXG4gICAgICAgICRkcm9wZG93bi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBkYXRhIGFuZCBwb3B1bGF0ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmdldEZvclNlbGVjdCgoZGF0YSkgPT4ge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGUgZnJvbSB3cmFwcGVyXG4gICAgICAgICAgICAkZHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGRhdGEgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGFuZCBwb3B1bGF0ZSBvcHRpb25zXG4gICAgICAgICAgICAgICAgJHNlbGVjdC5lbXB0eSgpO1xuICAgICAgICAgICAgICAgIGRhdGEuZm9yRWFjaChmaWx0ZXIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgJ3JlcHJlc2VudCcgZmllbGQgZnJvbSBuZXcgQVBJIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgICAgICAkc2VsZWN0LmFwcGVuZChgPG9wdGlvbiB2YWx1ZT1cIiR7ZmlsdGVyLnZhbHVlfVwiPiR7ZmlsdGVyLnJlcHJlc2VudH08L29wdGlvbj5gKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgY3VycmVudCB2YWx1ZSBhbmQgcmVmcmVzaCBkcm9wZG93blxuICAgICAgICAgICAgICAgICRzZWxlY3QudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGlmIGl0IGV4aXN0cyBpbiBvcHRpb25zXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAkc2VsZWN0LmZpbmQoYG9wdGlvblt2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiXWApLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGVmYXVsdCBcIm5vbmVcIiBvcHRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBub25lVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9Ob05ldHdvcmtGaWx0ZXIgfHwgJ0Nvbm5lY3Rpb25zIGZyb20gYW55IGFkZHJlc3NlcyBhcmUgYWxsb3dlZCc7XG4gICAgICAgICAgICAgICAgJHNlbGVjdC5lbXB0eSgpLmFwcGVuZChgPG9wdGlvbiB2YWx1ZT1cIm5vbmVcIj48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7bm9uZVRleHR9PC9vcHRpb24+YCk7XG4gICAgICAgICAgICAgICAgJHNlbGVjdC52YWwoJ25vbmUnKTtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICdub25lJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGNhdGVnb3JpZXMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuICRkcm9wZG93bjtcbiAgICB9LFxuICAgIFxufTtcblxuLy8gRXhwb3J0IGFzIHBhcnQgb2Ygd2luZG93IG9iamVjdCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5OZXR3b3JrRmlsdGVyc0FQSSA9IE5ldHdvcmtGaWx0ZXJzQVBJOyJdfQ==