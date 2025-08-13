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
 * 
 * @module NetworkFiltersAPI
 */
var NetworkFiltersAPI = {
  /**
   * Get all network filters for dropdown select (simplified)
   * 
   * @param {Function} callback - Callback function
   */
  getNetworksForSelect: function getNetworksForSelect(callback) {
    var url = "".concat(globalRootUrl, "pbxcore/api/v2/network-filters/getNetworksForSelect");
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
   * Get network filters for dropdown select
   * 
   * @param {Function} callback - Callback function
   * @param {Array|string} categories - Filter categories (default: ['SIP'])
   */
  getForSelect: function getForSelect(callback) {
    var categories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['SIP'];
    var url = "".concat(globalRootUrl, "pbxcore/api/v2/network-filters/getForSelect");
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
   * Get network filters allowed for providers
   * 
   * @param {Function} callback - Callback function
   * @param {Array|string} categories - Filter categories (default: ['SIP'])
   */
  getAllowedForProviders: function getAllowedForProviders(callback) {
    var categories = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['SIP'];
    var url = "/pbxcore/api/v2/network-filters/getAllowedForProviders";
    $.api({
      url: url,
      on: 'now',
      method: 'POST',
      data: {
        categories: Array.isArray(categories) ? categories : [categories]
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
   * Get dropdown settings for Semantic UI dropdown (simplified)
   * 
   * @param {Function} onChange - On change callback
   * @returns {Object} Dropdown settings
   */
  getDropdownSettings: function getDropdownSettings() {
    var onChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: "".concat(globalRootUrl, "pbxcore/api/v2/network-filters/getNetworksForSelect"),
        cache: true,
        throttle: 400,
        successTest: function successTest(response) {
          return response && response.result === true;
        },
        onResponse: function onResponse(response) {
          if (!response || !response.data) {
            return {
              success: false,
              results: []
            };
          }

          var results = response.data.map(function (filter) {
            return {
              value: filter.value,
              name: filter.name,
              text: filter.text
            };
          });
          return {
            success: true,
            results: results
          };
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: false,
      saveRemoteData: true,
      forceSelection: false,
      direction: 'downward',
      hideDividers: 'empty',
      onChange: onChange
    };
  },

  /**
   * Initialize network filter dropdown with simplified logic
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

    this.getAllowedForProviders(function (data) {
      // Remove loading state from wrapper
      $dropdown.removeClass('loading');

      if (data && Array.isArray(data)) {
        // Clear and populate options
        $select.empty();
        data.forEach(function (filter) {
          $select.append("<option value=\"".concat(filter.value, "\">").concat(filter.text || filter.name, "</option>"));
        }); // Set current value and refresh dropdown

        $select.val(currentValue);
        $dropdown.dropdown('refresh'); // Set selected value if it exists in options

        if (currentValue && $select.find("option[value=\"".concat(currentValue, "\"]")).length > 0) {
          $dropdown.dropdown('set selected', currentValue);
        }
      } else {
        // Fallback to default "none" option
        var noneText = globalTranslate.ex_NoNetworkFilter || 'None';
        $select.empty().append("<option value=\"none\">".concat(noneText, "</option>"));
        $select.val('none');
        $dropdown.dropdown('refresh');
        $dropdown.dropdown('set selected', 'none');
      }
    }, categories);
    return $dropdown;
  }
}; // Export as part of window object for use in other modules

window.NetworkFiltersAPI = NetworkFiltersAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbmV0d29ya0ZpbHRlcnNBUEkuanMiXSwibmFtZXMiOlsiTmV0d29ya0ZpbHRlcnNBUEkiLCJnZXROZXR3b3Jrc0ZvclNlbGVjdCIsImNhbGxiYWNrIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIiQiLCJhcGkiLCJvbiIsIm1ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJkYXRhIiwib25GYWlsdXJlIiwib25FcnJvciIsImdldEZvclNlbGVjdCIsImNhdGVnb3JpZXMiLCJnZXRBbGxvd2VkRm9yUHJvdmlkZXJzIiwiQXJyYXkiLCJpc0FycmF5IiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJjYWNoZSIsInRocm90dGxlIiwicmVzdWx0Iiwib25SZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwibWFwIiwiZmlsdGVyIiwidmFsdWUiLCJuYW1lIiwidGV4dCIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImZvcmNlU2VsZWN0aW9uIiwiZGlyZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJHNlbGVjdCIsImxlbmd0aCIsImN1cnJlbnRWYWx1ZSIsInByb3ZpZGVyVHlwZSIsImRyb3Bkb3duIiwiJGRyb3Bkb3duIiwicGFyZW50IiwiYWRkQ2xhc3MiLCJyZW1vdmVDbGFzcyIsImVtcHR5IiwiZm9yRWFjaCIsImFwcGVuZCIsInZhbCIsImZpbmQiLCJub25lVGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X05vTmV0d29ya0ZpbHRlciIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFuQztBQUNIO0FBQ0osS0EzQkQsRUEyQkdoQyxVQTNCSDtBQTZCQSxXQUFPaUMsU0FBUDtBQUNIO0FBak1xQixDQUExQixDLENBcU1BOztBQUNBWSxNQUFNLENBQUM5RCxpQkFBUCxHQUEyQkEsaUJBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSAqL1xuXG4vKipcbiAqIE5ldHdvcmtGaWx0ZXJzQVBJIG1vZHVsZSBmb3Igd29ya2luZyB3aXRoIG5ldHdvcmsgZmlsdGVycy5cbiAqIFxuICogQG1vZHVsZSBOZXR3b3JrRmlsdGVyc0FQSVxuICovXG5jb25zdCBOZXR3b3JrRmlsdGVyc0FQSSA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIG5ldHdvcmsgZmlsdGVycyBmb3IgZHJvcGRvd24gc2VsZWN0IChzaW1wbGlmaWVkKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXROZXR3b3Jrc0ZvclNlbGVjdChjYWxsYmFjaykge1xuICAgICAgICBjb25zdCB1cmwgPSBgJHtnbG9iYWxSb290VXJsfXBieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXROZXR3b3Jrc0ZvclNlbGVjdGA7XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBuZXR3b3JrIGZpbHRlcnMgZm9yIGRyb3Bkb3duIHNlbGVjdFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gY2F0ZWdvcmllcyAtIEZpbHRlciBjYXRlZ29yaWVzIChkZWZhdWx0OiBbJ1NJUCddKVxuICAgICAqL1xuICAgIGdldEZvclNlbGVjdChjYWxsYmFjaywgY2F0ZWdvcmllcyA9IFsnU0lQJ10pIHtcbiAgICAgICAgY29uc3QgdXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0YDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbmV0d29yayBmaWx0ZXJzIGFsbG93ZWQgZm9yIHByb3ZpZGVyc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiBAcGFyYW0ge0FycmF5fHN0cmluZ30gY2F0ZWdvcmllcyAtIEZpbHRlciBjYXRlZ29yaWVzIChkZWZhdWx0OiBbJ1NJUCddKVxuICAgICAqL1xuICAgIGdldEFsbG93ZWRGb3JQcm92aWRlcnMoY2FsbGJhY2ssIGNhdGVnb3JpZXMgPSBbJ1NJUCddKSB7XG4gICAgICAgIGNvbnN0IHVybCA9IGAvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEFsbG93ZWRGb3JQcm92aWRlcnNgO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBBcnJheS5pc0FycmF5KGNhdGVnb3JpZXMpID8gY2F0ZWdvcmllcyA6IFtjYXRlZ29yaWVzXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBTZW1hbnRpYyBVSSBkcm9wZG93biAoc2ltcGxpZmllZClcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkNoYW5nZSAtIE9uIGNoYW5nZSBjYWxsYmFja1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IERyb3Bkb3duIHNldHRpbmdzXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5ncyhvbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXBieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXROZXR3b3Jrc0ZvclNlbGVjdGAsXG4gICAgICAgICAgICAgICAgY2FjaGU6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0gcmVzcG9uc2UuZGF0YS5tYXAoZmlsdGVyID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZmlsdGVyLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZmlsdGVyLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBmaWx0ZXIudGV4dFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBvbkNoYW5nZVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIHNpbXBsaWZpZWQgbG9naWNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2pRdWVyeXxzdHJpbmd9IHNlbGVjdG9yIC0gRHJvcGRvd24gc2VsZWN0b3Igb3IgalF1ZXJ5IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIENvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmN1cnJlbnRWYWx1ZSAtIEN1cnJlbnQgc2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5wcm92aWRlclR5cGUgLSBQcm92aWRlciB0eXBlICgnU0lQJyBvciAnSUFYJylcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLm9uQ2hhbmdlIC0gT24gY2hhbmdlIGNhbGxiYWNrXG4gICAgICogQHJldHVybnMge2pRdWVyeX0gSW5pdGlhbGl6ZWQgZHJvcGRvd24gZWxlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRzZWxlY3QgPSB0eXBlb2Ygc2VsZWN0b3IgPT09ICdzdHJpbmcnID8gJChzZWxlY3RvcikgOiBzZWxlY3RvcjtcbiAgICAgICAgaWYgKCEkc2VsZWN0IHx8ICRzZWxlY3QubGVuZ3RoID09PSAwKSByZXR1cm4gJHNlbGVjdDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IG9wdGlvbnMuY3VycmVudFZhbHVlIHx8ICdub25lJztcbiAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IG9wdGlvbnMucHJvdmlkZXJUeXBlID09PSAnSUFYJyA/IFsnSUFYJ10gOiBbJ1NJUCddO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biBmaXJzdFxuICAgICAgICAkc2VsZWN0LmRyb3Bkb3duKHtcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5vbkNoYW5nZSkgb3B0aW9ucy5vbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSB3cmFwcGVyIGVsZW1lbnQgY3JlYXRlZCBieSBGb21hbnRpYyBVSVxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkc2VsZWN0LnBhcmVudCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgb24gd3JhcHBlclxuICAgICAgICAkZHJvcGRvd24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBhbmQgcG9wdWxhdGUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5nZXRBbGxvd2VkRm9yUHJvdmlkZXJzKChkYXRhKSA9PiB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZSBmcm9tIHdyYXBwZXJcbiAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIG9wdGlvbnNcbiAgICAgICAgICAgICAgICAkc2VsZWN0LmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgZGF0YS5mb3JFYWNoKGZpbHRlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRzZWxlY3QuYXBwZW5kKGA8b3B0aW9uIHZhbHVlPVwiJHtmaWx0ZXIudmFsdWV9XCI+JHtmaWx0ZXIudGV4dCB8fCBmaWx0ZXIubmFtZX08L29wdGlvbj5gKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgY3VycmVudCB2YWx1ZSBhbmQgcmVmcmVzaCBkcm9wZG93blxuICAgICAgICAgICAgICAgICRzZWxlY3QudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGlmIGl0IGV4aXN0cyBpbiBvcHRpb25zXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAkc2VsZWN0LmZpbmQoYG9wdGlvblt2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiXWApLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gZGVmYXVsdCBcIm5vbmVcIiBvcHRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBub25lVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5leF9Ob05ldHdvcmtGaWx0ZXIgfHwgJ05vbmUnO1xuICAgICAgICAgICAgICAgICRzZWxlY3QuZW1wdHkoKS5hcHBlbmQoYDxvcHRpb24gdmFsdWU9XCJub25lXCI+JHtub25lVGV4dH08L29wdGlvbj5gKTtcbiAgICAgICAgICAgICAgICAkc2VsZWN0LnZhbCgnbm9uZScpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgJ25vbmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgY2F0ZWdvcmllcyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gJGRyb3Bkb3duO1xuICAgIH0sXG4gICAgXG59O1xuXG4vLyBFeHBvcnQgYXMgcGFydCBvZiB3aW5kb3cgb2JqZWN0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93Lk5ldHdvcmtGaWx0ZXJzQVBJID0gTmV0d29ya0ZpbHRlcnNBUEk7Il19