"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2021 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwic2Vzc2lvblN0b3JhZ2UiLCJyZW1vdmVJdGVtIiwiZ2xvYmFsUm9vdFVybCIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJjYk9uQ2hhbmdlIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJmb3JtYXREcm9wZG93blJlc3VsdHMiLCJvbkNoYW5nZSIsInZhbHVlIiwicGFyc2VJbnQiLCIkIiwiZHJvcGRvd24iLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJmb3JjZVNlbGVjdGlvbiIsImhpZGVEaXZpZGVycyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJhZGRFbXB0eSIsImZvcm1hdHRlZFJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwdXNoIiwibmFtZSIsImVhY2giLCJpbmRleCIsIml0ZW0iLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFFQSxJQUFNQSxrQkFBa0IsR0FBRztBQUUxQkMsRUFBQUEsVUFGMEIsd0JBRWI7QUFDWkMsSUFBQUEsTUFBTSxDQUFDQyxnQkFBUCxDQUF3QixtQkFBeEIsRUFBNkNILGtCQUFrQixDQUFDSSxlQUFoRTtBQUNBLEdBSnlCOztBQUsxQjtBQUNEO0FBQ0E7QUFDQ0EsRUFBQUEsZUFSMEIsNkJBUVI7QUFDakJDLElBQUFBLGNBQWMsQ0FBQ0Ms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LEVBQUVHLElBQUksQ0FBQ0gsSUFEbUI7QUFFOUJoQixVQUFBQSxLQUFLLEVBQUVtQixJQUFJLENBQUNuQjtBQUZrQixTQUEvQjtBQUlBLE9BTEQ7QUFNQTs7QUFDRCxXQUFPWSxpQkFBUDtBQUNBO0FBNUZ5QixDQUEzQjtBQWdHQVYsQ0FBQyxDQUFDa0IsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnJDLEVBQUFBLGtCQUFrQixDQUFDQyxVQUFuQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjEgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIHNlc3Npb25TdG9yYWdlICovXG5cbmNvbnN0IFNvdW5kRmlsZXNTZWxlY3RvciA9IHtcblxuXHRpbml0aWFsaXplKCkge1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIFNvdW5kRmlsZXNTZWxlY3Rvci5jYk9uRGF0YUNoYW5nZWQpO1xuXHR9LFxuXHQvKipcblx0ICogV2Ugd2lsbCBkcm9wIGFsbCBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzXG5cdCAqL1xuXHRjYk9uRGF0YUNoYW5nZWQoKSB7XG5cdFx0c2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2dldFNvdW5kRmlsZXMvY3VzdG9tYCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBNYWtlcyBkcm9wZG93biBtZW51IGZvciBzb3VuZEZpbGVzIHdpdGggZW1wdHkgZmllbGRcblx0ICogQHBhcmFtIGNiT25DaGFuZ2UgLSBvbiBjaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb25cblx0ICogQHJldHVybnMgIGRyb3Bkb3duIHNldHRpbmdzXG5cdCAqL1xuXHRnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KGNiT25DaGFuZ2UgPSBudWxsKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGFwaVNldHRpbmdzOiB7XG5cdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9nZXRTb3VuZEZpbGVzL2N1c3RvbWAsXG5cdFx0XHRcdC8vIGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0Ly8gdGhyb3R0bGU6IDQwMCxcblx0XHRcdFx0b25SZXNwb25zZShyZXNwb25zZSkge1xuXHRcdFx0XHRcdHJldHVybiBTb3VuZEZpbGVzU2VsZWN0b3IuZm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCB0cnVlKTtcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRvbkNoYW5nZSh2YWx1ZSkge1xuXHRcdFx0XHRpZiAocGFyc2VJbnQodmFsdWUsIDEwKSA9PT0gLTEpICQodGhpcykuZHJvcGRvd24oJ2NsZWFyJyk7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0XHRpZ25vcmVDYXNlOiB0cnVlLFxuXHRcdFx0ZnVsbFRleHRTZWFyY2g6IHRydWUsXG5cdFx0XHRmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXHRcdFx0c2F2ZVJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG5cdFx0XHQvLyBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG5cdFx0XHRoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG5cblx0XHR9O1xuXHR9LFxuXHQvKipcblx0ICogTWFrZXMgZHJvcGRvd24gbWVudSBmb3Igc291bmRGaWxlcyB3aXRob3V0IGVtcHR5IGZpZWxkXG5cdCAqIEBwYXJhbSBjYk9uQ2hhbmdlIC0gb24gY2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uXG5cdCAqIEByZXR1cm5zICBkcm9wZG93biBzZXR0aW5nc1xuXHQgKi9cblx0Z2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eShjYk9uQ2hhbmdlID0gbnVsbCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRhcGlTZXR0aW5nczoge1xuXHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZ2V0U291bmRGaWxlcy9jdXN0b21gLFxuXHRcdFx0XHQvLyBjYWNoZTogZmFsc2UsXG5cdFx0XHRcdC8vIHRocm90dGxlOiA0MDAsXG5cdFx0XHRcdG9uUmVzcG9uc2UocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRyZXR1cm4gU291bmRGaWxlc1NlbGVjdG9yLmZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSwgZmFsc2UpO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdGlnbm9yZUNhc2U6IHRydWUsXG5cdFx0XHRmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcblx0XHRcdGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cdFx0XHRzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcblx0XHRcdGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcblx0XHRcdC8vIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcblx0XHRcdGhpZGVEaXZpZGVyczogJ2VtcHR5Jyxcblx0XHRcdG9uQ2hhbmdlKHZhbHVlKSB7XG5cdFx0XHRcdGlmIChjYk9uQ2hhbmdlICE9PSBudWxsKSBjYk9uQ2hhbmdlKHZhbHVlKTtcblx0XHRcdH0sXG5cdFx0fTtcblx0fSxcblx0LyoqXG5cdCAqIE1ha2VzIGZvcm1hdHRlZCBtZW51IHN0cnVjdHVyZVxuXHQgKi9cblx0Zm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlLCBhZGRFbXB0eSkge1xuXHRcdGNvbnN0IGZvcm1hdHRlZFJlc3BvbnNlID0ge1xuXHRcdFx0c3VjY2VzczogZmFsc2UsXG5cdFx0XHRyZXN1bHRzOiBbXSxcblx0XHR9O1xuXHRcdGlmIChhZGRFbXB0eSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2UucmVzdWx0cy5wdXNoKHtcblx0XHRcdFx0bmFtZTogJy0nLFxuXHRcdFx0XHR2YWx1ZTogLTFcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmIChyZXNwb25zZSkge1xuXHRcdFx0Zm9ybWF0dGVkUmVzcG9uc2Uuc3VjY2VzcyA9IHRydWU7XG5cdFx0XHQkLmVhY2gocmVzcG9uc2UucmVzdWx0cywgKGluZGV4LCBpdGVtKSA9PiB7XG5cdFx0XHRcdGZvcm1hdHRlZFJlc3BvbnNlLnJlc3VsdHMucHVzaCh7XG5cdFx0XHRcdFx0bmFtZTogaXRlbS5uYW1lLFxuXHRcdFx0XHRcdHZhbHVlOiBpdGVtLnZhbHVlXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiBmb3JtYXR0ZWRSZXNwb25zZTtcblx0fSxcbn1cblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdFNvdW5kRmlsZXNTZWxlY3Rvci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==