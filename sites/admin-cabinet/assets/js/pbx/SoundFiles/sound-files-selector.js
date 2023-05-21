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
   * Initializes the sound files selector.
   */
  initialize: function initialize() {
    window.addEventListener('ConfigDataChanged', SoundFilesSelector.cbOnDataChanged);
  },

  /**
   * Callback function for data change event.
   * Clears the session storage cache.
   */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("".concat(globalRootUrl, "sound-files/getSoundFiles/custom"));
  },

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
      saveRemoteData: true,
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
      saveRemoteData: true,
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
}; // When the document is ready, initialize the sound files selector

$(document).ready(function () {
  SoundFilesSelector.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJvbkNoYW5nZSIsInZhbHVlIiwicGFyc2VJbnQiLCIkIiwiZHJvcGRvd24iLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGtCQUFrQixHQUFHO0FBRXZCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQUx1Qix3QkFLVjtBQUNUQyxJQUFBQSxNQUFNLENBQUNDLGdCQUFQLENBQXdCLG1CQUF4QixFQUE2Q0gsa0JBQWtCLENBQUNJLGVBQWhFO0FBQ0gsR0FQc0I7O0FBU3ZCO0FBQ0o7QUFDQTtBQUNBO0FB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QUFBLGlCQUFpQixDQUFDRSxPQUFsQixDQUEwQkMsSUFBMUIsQ0FBK0I7QUFDM0JDLFVBQUFBLElBQUksRUFBRUcsSUFBSSxDQUFDSCxJQURnQjtBQUUzQmhCLFVBQUFBLEtBQUssRUFBRW1CLElBQUksQ0FBQ25CO0FBRmUsU0FBL0I7QUFJSCxPQUxEO0FBTUg7O0FBQ0QsV0FBT1ksaUJBQVA7QUFDSDtBQXhHc0IsQ0FBM0IsQyxDQTJHQTs7QUFDQVYsQ0FBQyxDQUFDa0IsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJDLEVBQUFBLGtCQUFrQixDQUFDQyxVQUFuQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGEgc291bmQgZmlsZXMgc2VsZWN0b3IuXG4gKlxuICogQG1vZHVsZSBTb3VuZEZpbGVzU2VsZWN0b3JcbiAqL1xuY29uc3QgU291bmRGaWxlc1NlbGVjdG9yID0ge1xuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNvdW5kIGZpbGVzIHNlbGVjdG9yLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIFNvdW5kRmlsZXNTZWxlY3Rvci5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZGF0YSBjaGFuZ2UgZXZlbnQuXG4gICAgICogQ2xlYXJzIHRoZSBzZXNzaW9uIHN0b3JhZ2UgY2FjaGUuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICBzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZ2V0U291bmRGaWxlcy9jdXN0b21gKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBkcm9wZG93biBzZXR0aW5ncyB3aXRoIGFuIGVtcHR5IGZpZWxkIGZvciBzb3VuZCBmaWxlcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIG9uY2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2dldFNvdW5kRmlsZXMvY3VzdG9tYCxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBTb3VuZEZpbGVzU2VsZWN0b3IuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSAkKHRoaXMpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIHRoZSBkcm9wZG93biBzZXR0aW5ncyB3aXRob3V0IGFuIGVtcHR5IGZpZWxkIGZvciBzb3VuZCBmaWxlcy5cbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYk9uQ2hhbmdlIC0gVGhlIG9uY2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gVGhlIGRyb3Bkb3duIHNldHRpbmdzLlxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2dldFNvdW5kRmlsZXMvY3VzdG9tYCxcbiAgICAgICAgICAgICAgICAvLyBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgLy8gdGhyb3R0bGU6IDQwMCxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBTb3VuZEZpbGVzU2VsZWN0b3IuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm1hdHMgdGhlIGRyb3Bkb3duIG1lbnUgc3RydWN0dXJlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gYWRkRW1wdHkgLSBJbmRpY2F0ZXMgaWYgYW4gZW1wdHkgZmllbGQgc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSByZXN1bHRzLlxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IC0gVGhlIGZvcm1hdHRlZCByZXNwb25zZS5cbiAgICAgKi9cbiAgICBmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG4gICAgICAgIGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGFkZEVtcHR5KSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgIG5hbWU6ICctJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogLTFcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgICQuZWFjaChyZXNwb25zZS5yZXN1bHRzLCAoaW5kZXgsIGl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICBmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkUmVzcG9uc2U7XG4gICAgfSxcbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHNvdW5kIGZpbGVzIHNlbGVjdG9yXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemUoKTtcbn0pO1xuIl19