"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global Config, globalWebAdminLanguage, globalPBXLicense, globalPBXVersion */

/** @scrutinizer ignore-unused */
var UpdateApi = {
  /**
   * Asks for available modules versions
   * @returns {boolean}
   */
  getModulesUpdates: function getModulesUpdates(cbSuccess) {
    var requestData = {
      PBXVER: globalPBXVersion.replace(/-dev/i, ''),
      LANGUAGE: globalWebAdminLanguage
    };
    $.api({
      url: "".concat(Config.updateUrl, "getAvailableModules"),
      on: 'now',
      method: 'POST',
      data: requestData,
      successTest: function successTest(response) {
        // test whether a JSON response is valid
        return response !== undefined && Object.keys(response).length > 0 && response.result === 'SUCCESS';
      },
      onSuccess: cbSuccess
    });
  },

  /**
   * Asks for installation link
   * @param params
   * @param cbSuccess
   * @param cbFailure
   * @returns {boolean}
   * @constructor
   */
  GetModuleInstallLink: function GetModuleInstallLink(params, cbSuccess, cbFailure) {
    var requestData = {
      LICENSE: globalPBXLicense,
      RELEASEID: params.releaseId
    };
    $.api({
      url: "".concat(Config.updateUrl, "getModuleLink"),
      on: 'now',
      method: 'POST',
      data: requestData,
      successTest: function successTest(response) {
        // test whether a JSON response is valid
        return response !== undefined && Object.keys(response).length > 0 && response.result === 'SUCCESS';
      },
      onSuccess: function onSuccess(response) {
        cbSuccess(params, response);
      },
      onFailure: function onFailure() {
        cbFailure(params);
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJnZXRNb2R1bGVzVXBkYXRlcyIsImNiU3VjY2VzcyIsInJlcXVlc3REYXRhIiwiUEJYVkVSIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJvblN1Y2Nlc3MiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsInBhcmFtcyIsImNiRmFpbHVyZSIsIkxJQ0VOU0UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiUkVMRUFTRUlEIiwicmVsZWFzZUlkIiwib25GYWlsdXJlIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFBa0MsSUFBTUEsU0FBUyxHQUFHO0FBQ25EO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NDLEVBQUFBLGlCQUxtRCw2QkFLakNDLFNBTGlDLEVBS3RCO0FBQzVCLFFBQU1DLFdBQVcsR0FBRztBQUNuQkMsTUFBQUEsTUFBTSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FEVztBQUVuQkMsTUFBQUEsUUFBUSxFQUFFQztBQUZTLEtBQXBCO0FBSUFDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLE1BQUFBLEdBQUcsWUFBS0MsTUFBTSxDQUFDQyxTQUFaLHdCQURFO0FBRUxDLE1BQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLE1BQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLE1BQUFBLElBQUksRUFBRWIsV0FKRDtBQUtMYyxNQUFBQSxXQUxLLHVCQUtPQyxRQUxQLEVBS2lCO0FBQ3JCO0FBQ0EsZUFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQSxPQVZJO0FBV0xDLE1BQUFBLFNBQVMsRUFBRXRCO0FBWE4sS0FBTjtBQWFBLEdBdkJrRDs7QUF3Qm5EO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQ3VCLEVBQUFBLG9CQWhDbUQsZ0NBZ0M5QkMsTUFoQzhCLEVBZ0N0QnhCLFNBaENzQixFQWdDWHlCLFNBaENXLEVBZ0NBO0FBQ2xELFFBQU14QixXQUFXLEdBQUc7QUFDbkJ5QixNQUFBQSxPQUFPLEVBQUVDLGdCQURVO0FBRW5CQyxNQUFBQSxTQUFTLEVBQUVKLE1BQU0sQ0FBQ0s7QUFGQyxLQUFwQjtBQUlBdEIsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsTUFBQUEsR0FBRyxZQUFLQyxNQUFNLENBQUNDLFNBQVosa0JBREU7QUFFTEMsTUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsTUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsTUFBQUEsSUFBSSxFQUFFYixXQUpEO0FBS0xjLE1BQUFBLFdBTEssdUJBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxlQUFPQSxRQUFRLEtBQUtDLFNBQWIsSUFDSEMsTUFBTSxDQUFDQyxJQUFQLENBQVlILFFBQVosRUFBc0JJLE1BQXRCLEdBQStCLENBRDVCLElBRUhKLFFBQVEsQ0FBQ0ssTUFBVCxLQUFvQixTQUZ4QjtBQUdBLE9BVkk7QUFXTEMsTUFBQUEsU0FYSyxxQkFXS04sUUFYTCxFQVdlO0FBQ25CaEIsUUFBQUEsU0FBUyxDQUFDd0IsTUFBRCxFQUFTUixRQUFULENBQVQ7QUFDQSxPQWJJO0FBY0xjLE1BQUFBLFNBZEssdUJBY087QUFDWEwsUUFBQUEsU0FBUyxDQUFDRCxNQUFELENBQVQ7QUFDQTtBQWhCSSxLQUFOO0FBa0JBO0FBdkRrRCxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIGdsb2JhbFBCWExpY2Vuc2UsIGdsb2JhbFBCWFZlcnNpb24gKi9cblxuLyoqIEBzY3J1dGluaXplciBpZ25vcmUtdW51c2VkICovIGNvbnN0IFVwZGF0ZUFwaSA9IHtcblx0LyoqXG5cdCAqIEFza3MgZm9yIGF2YWlsYWJsZSBtb2R1bGVzIHZlcnNpb25zXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0Z2V0TW9kdWxlc1VwZGF0ZXMoY2JTdWNjZXNzKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogYCR7Q29uZmlnLnVwZGF0ZVVybH1nZXRBdmFpbGFibGVNb2R1bGVzYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3M6IGNiU3VjY2Vzcyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEFza3MgZm9yIGluc3RhbGxhdGlvbiBsaW5rXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNiU3VjY2Vzc1xuXHQgKiBAcGFyYW0gY2JGYWlsdXJlXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKiBAY29uc3RydWN0b3Jcblx0ICovXG5cdEdldE1vZHVsZUluc3RhbGxMaW5rKHBhcmFtcywgY2JTdWNjZXNzLCBjYkZhaWx1cmUpIHtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdExJQ0VOU0U6IGdsb2JhbFBCWExpY2Vuc2UsXG5cdFx0XHRSRUxFQVNFSUQ6IHBhcmFtcy5yZWxlYXNlSWQsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke0NvbmZpZy51cGRhdGVVcmx9Z2V0TW9kdWxlTGlua2AsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNiRmFpbHVyZShwYXJhbXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcbn07Il19