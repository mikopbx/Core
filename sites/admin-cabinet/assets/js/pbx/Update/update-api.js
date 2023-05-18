"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJnZXRNb2R1bGVzVXBkYXRlcyIsImNiU3VjY2VzcyIsInJlcXVlc3REYXRhIiwiUEJYVkVSIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJvblN1Y2Nlc3MiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsInBhcmFtcyIsImNiRmFpbHVyZSIsIkxJQ0VOU0UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiUkVMRUFTRUlEIiwicmVsZWFzZUlkIiwib25GYWlsdXJlIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFBa0MsSUFBTUEsU0FBUyxHQUFHO0FBQ25EO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NDLEVBQUFBLGlCQUxtRCw2QkFLakNDLFNBTGlDLEVBS3RCO0FBQzVCLFFBQU1DLFdBQVcsR0FBRztBQUNuQkMsTUFBQUEsTUFBTSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FEVztBQUVuQkMsTUFBQUEsUUFBUSxFQUFFQztBQUZTLEtBQXBCO0FBSUFDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLE1BQUFBLEdBQUcsWUFBS0MsTUFBTSxDQUFDQyxTQUFaLHdCQURFO0FBRUxDLE1BQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLE1BQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLE1BQUFBLElBQUksRUFBRWIsV0FKRDtBQUtMYyxNQUFBQSxXQUxLLHVCQUtPQyxRQUxQLEVBS2lCO0FBQ3JCO0FBQ0EsZUFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQSxPQVZJO0FBV0xDLE1BQUFBLFNBQVMsRUFBRXRCO0FBWE4sS0FBTjtBQWFBLEdBdkJrRDs7QUF3Qm5EO0FBQ0Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQ3VCLEVBQUFBLG9CQWhDbUQsZ0NBZ0M5QkMsTUFoQzhCLEVBZ0N0QnhCLFNBaENzQixFQWdDWHlCLFNBaENXLEVBZ0NBO0FBQ2xELFFBQU14QixXQUFXLEdBQUc7QUFDbkJ5QixNQUFBQSxPQUFPLEVBQUVDLGdCQURVO0FBRW5CQyxNQUFBQSxTQUFTLEVBQUVKLE1BQU0sQ0FBQ0s7QUFGQyxLQUFwQjtBQUlBdEIsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsTUFBQUEsR0FBRyxZQUFLQyxNQUFNLENBQUNDLFNBQVosa0JBREU7QUFFTEMsTUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsTUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsTUFBQUEsSUFBSSxFQUFFYixXQUpEO0FBS0xjLE1BQUFBLFdBTEssdUJBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxlQUFPQSxRQUFRLEtBQUtDLFNBQWIsSUFDSEMsTUFBTSxDQUFDQyxJQUFQLENBQVlILFFBQVosRUFBc0JJLE1BQXRCLEdBQStCLENBRDVCLElBRUhKLFFBQVEsQ0FBQ0ssTUFBVCxLQUFvQixTQUZ4QjtBQUdBLE9BVkk7QUFXTEMsTUFBQUEsU0FYSyxxQkFXS04sUUFYTCxFQVdlO0FBQ25CaEIsUUFBQUEsU0FBUyxDQUFDd0IsTUFBRCxFQUFTUixRQUFULENBQVQ7QUFDQSxPQWJJO0FBY0xjLE1BQUFBLFNBZEssdUJBY087QUFDWEwsUUFBQUEsU0FBUyxDQUFDRCxNQUFELENBQVQ7QUFDQTtBQWhCSSxLQUFOO0FBa0JBO0FBdkRrRCxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxQQlhWZXJzaW9uICovXG5cbi8qKiBAc2NydXRpbml6ZXIgaWdub3JlLXVudXNlZCAqLyBjb25zdCBVcGRhdGVBcGkgPSB7XG5cdC8qKlxuXHQgKiBBc2tzIGZvciBhdmFpbGFibGUgbW9kdWxlcyB2ZXJzaW9uc1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdGdldE1vZHVsZXNVcGRhdGVzKGNiU3VjY2Vzcykge1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0UEJYVkVSOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXHRcdFx0TEFOR1VBR0U6IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke0NvbmZpZy51cGRhdGVVcmx9Z2V0QXZhaWxhYmxlTW9kdWxlc2AsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzOiBjYlN1Y2Nlc3MsXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBBc2tzIGZvciBpbnN0YWxsYXRpb24gbGlua1xuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSBjYlN1Y2Nlc3Ncblx0ICogQHBhcmFtIGNiRmFpbHVyZVxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICogQGNvbnN0cnVjdG9yXG5cdCAqL1xuXHRHZXRNb2R1bGVJbnN0YWxsTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRMSUNFTlNFOiBnbG9iYWxQQlhMaWNlbnNlLFxuXHRcdFx0UkVMRUFTRUlEOiBwYXJhbXMucmVsZWFzZUlkLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtDb25maWcudXBkYXRlVXJsfWdldE1vZHVsZUxpbmtgLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYlN1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYkZhaWx1cmUocGFyYW1zKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG59OyJdfQ==