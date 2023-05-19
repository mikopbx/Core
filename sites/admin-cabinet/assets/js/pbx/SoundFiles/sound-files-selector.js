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
var SoundFilesSelector = {
  initialize: function initialize() {
    window.addEventListener('ConfigDataChanged', SoundFilesSelector.cbOnDataChanged);
  },

  /**
   * We will drop all caches if data changes
   */
  cbOnDataChanged: function cbOnDataChanged() {
    sessionStorage.removeItem("".concat(globalRootUrl, "sound-files/getSoundFiles/custom"));
  },

  /**
   * Makes dropdown menu for soundFiles with empty field
   * @param cbOnChange - on change callback function
   * @returns  dropdown settings
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
   * Makes dropdown menu for soundFiles without empty field
   * @param cbOnChange - on change callback function
   * @returns  dropdown settings
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
   * Makes formatted menu structure
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
$(document).ready(function () {
  SoundFilesSelector.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJvbkNoYW5nZSIsInZhbHVlIiwicGFyc2VJbnQiLCIkIiwiZHJvcGRvd24iLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxrQkFBa0IsR0FBRztBQUUxQkMsRUFBQUEsVUFGMEIsd0JBRWI7QUFDWkMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixtQkFBeEIsRUFBNkNILGtCQUFrQixDQUFDSSxlQUFoRTtBQUNBLEdBSnlCOztBQUsxQjtBQUNEO0FBQ0E7QUFDQ0EsRUFBQUEsZUFSMEIsNkJBUVI7QUFDakJDLElBQUFBLGNBQWMsQ0FBQ0Ms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LEVBQUVHLElBQUksQ0FBQ0gsSUFEbUI7QUFFOUJoQixVQUFBQSxLQUFLLEVBQUVtQixJQUFJLENBQUNuQjtBQUZrQixTQUEvQjtBQUlBLE9BTEQ7QUFNQTs7QUFDRCxXQUFPWSxpQkFBUDtBQUNBO0FBNUZ5QixDQUEzQjtBQWdHQVYsQ0FBQyxDQUFDa0IsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnJDLEVBQUFBLGtCQUFrQixDQUFDQyxVQUFuQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuY29uc3QgU291bmRGaWxlc1NlbGVjdG9yID0ge1xuXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgU291bmRGaWxlc1NlbGVjdG9yLmNiT25EYXRhQ2hhbmdlZCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBXZSB3aWxsIGRyb3AgYWxsIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXNcblx0ICovXG5cdGNiT25EYXRhQ2hhbmdlZCgpIHtcblx0XHRzZXNzaW9uU3RvcmFnZS5yZW1vdmVJdGVtKGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZ2V0U291bmRGaWxlcy9jdXN0b21gKTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGRyb3Bkb3duIG1lbnUgZm9yIHNvdW5kRmlsZXMgd2l0aCBlbXB0eSBmaWVsZFxuXHQgKiBAcGFyYW0gY2JPbkNoYW5nZSAtIG9uIGNoYW5nZSBjYWxsYmFjayBmdW5jdGlvblxuXHQgKiBAcmV0dXJucyAgZHJvcGRvd24gc2V0dGluZ3Ncblx0ICovXG5cdGdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoY2JPbkNoYW5nZSA9IG51bGwpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0YXBpU2V0dGluZ3M6IHtcblx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2dldFNvdW5kRmlsZXMvY3VzdG9tYCxcblx0XHRcdFx0Ly8gY2FjaGU6IGZhbHNlLFxuXHRcdFx0XHQvLyB0aHJvdHRsZTogNDAwLFxuXHRcdFx0XHRvblJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFNvdW5kRmlsZXNTZWxlY3Rvci5mb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIHRydWUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChwYXJzZUludCh2YWx1ZSwgMTApID09PSAtMSkgJCh0aGlzKS5kcm9wZG93bignY2xlYXInKTtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcblxuXHRcdH07XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBzb3VuZEZpbGVzIHdpdGhvdXQgZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9nZXRTb3VuZEZpbGVzL2N1c3RvbWAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBTb3VuZEZpbGVzU2VsZWN0b3IuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBmYWxzZSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdFx0aWdub3JlQ2FzZTogdHJ1ZSxcblx0XHRcdGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuXHRcdFx0ZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0Zm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuXHRcdFx0Ly8gZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuXHRcdFx0aGlkZURpdmlkZXJzOiAnZW1wdHknLFxuXHRcdFx0b25DaGFuZ2UodmFsdWUpIHtcblx0XHRcdFx0aWYgKGNiT25DaGFuZ2UgIT09IG51bGwpIGNiT25DaGFuZ2UodmFsdWUpO1xuXHRcdFx0fSxcblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZm9ybWF0dGVkIG1lbnUgc3RydWN0dXJlXG5cdCAqL1xuXHRmb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UsIGFkZEVtcHR5KSB7XG5cdFx0Y29uc3QgZm9ybWF0dGVkUmVzcG9uc2UgPSB7XG5cdFx0XHRzdWNjZXNzOiBmYWxzZSxcblx0XHRcdHJlc3VsdHM6IFtdLFxuXHRcdH07XG5cdFx0aWYgKGFkZEVtcHR5KSB7XG5cdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5yZXN1bHRzLnB1c2goe1xuXHRcdFx0XHRuYW1lOiAnLScsXG5cdFx0XHRcdHZhbHVlOiAtMVxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3BvbnNlKSB7XG5cdFx0XHRmb3JtYXR0ZWRSZXNwb25zZS5zdWNjZXNzID0gdHJ1ZTtcblx0XHRcdCQuZWFjaChyZXNwb25zZS5yZXN1bHRzLCAoaW5kZXgsIGl0ZW0pID0+IHtcblx0XHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0XHRuYW1lOiBpdGVtLm5hbWUsXG5cdFx0XHRcdFx0dmFsdWU6IGl0ZW0udmFsdWVcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIGZvcm1hdHRlZFJlc3BvbnNlO1xuXHR9LFxufVxuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0U291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemUoKTtcbn0pO1xuIl19