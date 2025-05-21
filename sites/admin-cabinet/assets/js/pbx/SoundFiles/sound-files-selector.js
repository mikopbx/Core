"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, sessionStorage */

/**
 * Represents a sound files selector.
 *
 * @module SoundFilesSelector
 */
var SoundFilesSelector = {
  /**
   * Retrieves the dropdown settings with an empty field for sound files.
   * @param {function} cbOnChange - The onchange callback function.
   * @returns {object} - The dropdown settings.
   */
  getDropdownSettingsWithEmpty: function getDropdownSettingsWithEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: "".concat(globalRootUrl, "sound-files/getSoundFiles/custom"),
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return SoundFilesSelector.formatDropdownResults(response, true);
        }
      },
      onChange: function onChange(value) {
        if (parseInt(value, 10) === -1) $(this).dropdown('clear');
        if (cbOnChange !== null) cbOnChange(value);
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
      forceSelection: false,
      // direction: 'downward',
      hideDividers: 'empty'
    };
  },

  /**
   * Retrieves the dropdown settings without an empty field for sound files.
   * @param {function} cbOnChange - The onchange callback function.
   * @returns {object} - The dropdown settings.
   */
  getDropdownSettingsWithoutEmpty: function getDropdownSettingsWithoutEmpty() {
    var cbOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    return {
      apiSettings: {
        url: "".concat(globalRootUrl, "sound-files/getSoundFiles/custom"),
        // cache: false,
        // throttle: 400,
        onResponse: function onResponse(response) {
          return SoundFilesSelector.formatDropdownResults(response, false);
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: false,
      forceSelection: false,
      // direction: 'downward',
      hideDividers: 'empty',
      onChange: function onChange(value) {
        if (cbOnChange !== null) cbOnChange(value);
      }
    };
  },

  /**
   * Formats the dropdown menu structure.
   * @param {object} response - The response data.
   * @param {boolean} addEmpty - Indicates if an empty field should be added to the results.
   * @returns {object} - The formatted response.
   */
  formatDropdownResults: function formatDropdownResults(response, addEmpty) {
    var formattedResponse = {
      success: false,
      results: []
    };

    if (addEmpty) {
      formattedResponse.results.push({
        name: '-',
        value: -1
      });
    }

    if (response) {
      formattedResponse.success = true;
      $.each(response.results, function (index, item) {
        formattedResponse.results.push({
          name: item.name,
          value: item.value
        });
      });
    }

    return formattedResponse;
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlNvdW5kRmlsZXNTZWxlY3RvciIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwiZm9ybWF0RHJvcGRvd25SZXN1bHRzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInBhcnNlSW50IiwiJCIsImRyb3Bkb3duIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsInNhdmVSZW1vdGVEYXRhIiwiZm9yY2VTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiYWRkRW1wdHkiLCJmb3JtYXR0ZWRSZXNwb25zZSIsInN1Y2Nlc3MiLCJyZXN1bHRzIiwicHVzaCIsIm5hbWUiLCJlYWNoIiwiaW5kZXgiLCJpdGVtIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGtCQUFrQixHQUFHO0FBRXZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsNEJBUHVCLDBDQU95QjtBQUFBLFFBQW5CQyxVQUFtQix1RUFBTixJQUFNO0FBQzVDLFdBQU87QUFDSEMsTUFBQUEsV0FBVyxFQUFFO0FBQ1RDLFFBQUFBLEdBQUcsWUFBS0MsYUFBTCxxQ0FETTtBQUVUO0FBQ0E7QUFDQUMsUUFBQUEsVUFKUyxzQkFJRUMsUUFKRixFQUlZO0FBQ2pCLGlCQUFPUCxrQkFBa0IsQ0FBQ1EscUJBQW5CLENBQXlDRCxRQUF6QyxFQUFtRCxJQUFuRCxDQUFQO0FBQ0g7QUFOUSxPQURWO0FBU0hFLE1BQUFBLFFBVEcsb0JBU01DLEtBVE4sRUFTYTtBQUNaLFlBQUlDLFFBQVEsQ0FBQ0QsS0FBRCxFQUFRLEVBQVIsQ0FBUixLQUF3QixDQUFDLENBQTdCLEVBQWdDRSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFDLFFBQVIsQ0FBaUIsT0FBakI7QUFDaEMsWUFBSVgsVUFBVSxLQUFLLElBQW5CLEVBQXlCQSxVQUFVLENBQUNRLEtBQUQsQ0FBVjtBQUM1QixPQVpFO0FBYUhJLE1BQUFBLFVBQVUsRUFBRSxJQWJUO0FBY0hDLE1BQUFBLGNBQWMsRUFBRSxJQWRiO0FBZUhDLE1BQUFBLGdCQUFnQixFQUFFLElBZmY7QUFnQkhDLE1BQUFBLGNBQWMsRUFBRSxLQWhCYjtBQWlCSEMsTUFBQUEsY0FBYyxFQUFFLEtBakJiO0FBa0JIO0FBQ0FDLE1BQUFBLFlBQVksRUFBRTtBQW5CWCxLQUFQO0FBc0JILEdBOUJzQjs7QUFnQ3ZCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsK0JBckN1Qiw2Q0FxQzRCO0FBQUEsUUFBbkJsQixVQUFtQix1RUFBTixJQUFNO0FBQy9DLFdBQU87QUFDSEMsTUFBQUEsV0FBVyxFQUFFO0FBQ1RDLFFBQUFBLEdBQUcsWUFBS0MsYUFBTCxxQ0FETTtBQUVUO0FBQ0E7QUFDQUMsUUFBQUEsVUFKUyxzQkFJRUMsUUFKRixFQUlZO0FBQ2pCLGlCQUFPUCxrQkFBa0IsQ0FBQ1EscUJBQW5CLENBQXlDRCxRQUF6QyxFQUFtRCxLQUFuRCxDQUFQO0FBQ0g7QUFOUSxPQURWO0FBU0hPLE1BQUFBLFVBQVUsRUFBRSxJQVRUO0FBVUhDLE1BQUFBLGNBQWMsRUFBRSxJQVZiO0FBV0hDLE1BQUFBLGdCQUFnQixFQUFFLElBWGY7QUFZSEMsTUFBQUEsY0FBYyxFQUFFLEtBWmI7QUFhSEMsTUFBQUEsY0FBYyxFQUFFLEtBYmI7QUFjSDtBQUNBQyxNQUFBQSxZQUFZLEVBQUUsT0FmWDtBQWdCSFYsTUFBQUEsUUFoQkcsb0JBZ0JNQyxLQWhCTixFQWdCYTtBQUNaLFlBQUlSLFVBQVUsS0FBSyxJQUFuQixFQUF5QkEsVUFBVSxDQUFDUSxLQUFELENBQVY7QUFDNUI7QUFsQkUsS0FBUDtBQW9CSCxHQTFEc0I7O0FBNkR2QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUYsRUFBQUEscUJBbkV1QixpQ0FtRURELFFBbkVDLEVBbUVTYyxRQW5FVCxFQW1FbUI7QUFDdEMsUUFBTUMsaUJBQWlCLEdBQUc7QUFDdEJDLE1BQUFBLE9BQU8sRUFBRSxLQURhO0FBRXRCQyxNQUFBQSxPQUFPLEVBQUU7QUFGYSxLQUExQjs7QUFJQSxRQUFJSCxRQUFKLEVBQWM7QUFDVkMsTUFBQUEsaUJBQWlCLENBQUNFLE9BQWxCLENBQTBCQyxJQUExQixDQUErQjtBQUMzQkMsUUFBQUEsSUFBSSxFQUFFLEdBRHFCO0FBRTNCaEIsUUFBQUEsS0FBSyxFQUFFLENBQUM7QUFGbUIsT0FBL0I7QUFJSDs7QUFFRCxRQUFJSCxRQUFKLEVBQWM7QUFDVmUsTUFBQUEsaUJBQWlCLENBQUNDLE9BQWxCLEdBQTRCLElBQTVCO0FBQ0FYLE1BQUFBLENBQUMsQ0FBQ2UsSUFBRixDQUFPcEIsUUFBUSxDQUFDaUIsT0FBaEIsRUFBeUIsVUFBQ0ksS0FBRCxFQUFRQyxJQUFSLEVBQWlCO0FBQ3RDUCxRQUFBQSxpQkFBaUIsQ0FBQ0UsT0FBbEIsQ0FBMEJDLElBQTFCLENBQStCO0FBQzNCQyxVQUFBQSxJQUFJLEVBQUVHLElBQUksQ0FBQ0gsSUFEZ0I7QUFFM0JoQixVQUFBQSxLQUFLLEVBQUVtQixJQUFJLENBQUNuQjtBQUZlLFNBQS9CO0FBSUgsT0FMRDtBQU1IOztBQUNELFdBQU9ZLGlCQUFQO0FBQ0g7QUF6RnNCLENBQTNCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjEgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBhIHNvdW5kIGZpbGVzIHNlbGVjdG9yLlxuICpcbiAqIEBtb2R1bGUgU291bmRGaWxlc1NlbGVjdG9yXG4gKi9cbmNvbnN0IFNvdW5kRmlsZXNTZWxlY3RvciA9IHtcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgZHJvcGRvd24gc2V0dGluZ3Mgd2l0aCBhbiBlbXB0eSBmaWVsZCBmb3Igc291bmQgZmlsZXMuXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2JPbkNoYW5nZSAtIFRoZSBvbmNoYW5nZSBjYWxsYmFjayBmdW5jdGlvbi5cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSAtIFRoZSBkcm9wZG93biBzZXR0aW5ncy5cbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9nZXRTb3VuZEZpbGVzL2N1c3RvbWAsXG4gICAgICAgICAgICAgICAgLy8gY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIC8vIHRocm90dGxlOiA0MDAsXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gU291bmRGaWxlc1NlbGVjdG9yLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBpZiAoY2JPbkNoYW5nZSAhPT0gbnVsbCkgY2JPbkNoYW5nZSh2YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcblxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZXMgdGhlIGRyb3Bkb3duIHNldHRpbmdzIHdpdGhvdXQgYW4gZW1wdHkgZmllbGQgZm9yIHNvdW5kIGZpbGVzLlxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiT25DaGFuZ2UgLSBUaGUgb25jaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb24uXG4gICAgICogQHJldHVybnMge29iamVjdH0gLSBUaGUgZHJvcGRvd24gc2V0dGluZ3MuXG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZ2V0U291bmRGaWxlcy9jdXN0b21gLFxuICAgICAgICAgICAgICAgIC8vIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAvLyB0aHJvdHRsZTogNDAwLFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFNvdW5kRmlsZXNTZWxlY3Rvci5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIG1lbnUgc3RydWN0dXJlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkRW1wdHkgLSBJbmRpY2F0ZXMgaWYgYW4gZW1wdHkgZmllbGQgc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSByZXN1bHRzLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gVGhlIGZvcm1hdHRlZCByZXNwb25zZS5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6ICctJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogLTFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5yZXN1bHRzLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcbn0iXX0=