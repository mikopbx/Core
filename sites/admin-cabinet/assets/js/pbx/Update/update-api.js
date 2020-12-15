"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
  getModulesUpdates: function () {
    function getModulesUpdates(cbSuccess) {
      var requestData = {
        TYPE: 'MODULES',
        LICENSE: globalPBXLicense,
        PBXVER: globalPBXVersion.replace(/-dev/i, ''),
        LANGUAGE: globalWebAdminLanguage
      };
      $.api({
        url: Config.updateUrl,
        on: 'now',
        method: 'POST',
        data: requestData,
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.result === 'SUCCESS';
          }

          return successTest;
        }(),
        onSuccess: cbSuccess
      });
    }

    return getModulesUpdates;
  }(),

  /**
   * Asks for installation link
   * @param params
   * @param cbSuccess
   * @param cbFailure
   * @returns {boolean}
   * @constructor
   */
  GetModuleInstallLink: function () {
    function GetModuleInstallLink(params, cbSuccess, cbFailure) {
      var requestData = {
        TYPE: 'MODULEGETLINK',
        LICENSE: globalPBXLicense,
        RELEASEID: params.releaseId
      };
      $.api({
        url: Config.updateUrl,
        on: 'now',
        method: 'POST',
        data: requestData,
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.result === 'SUCCESS';
          }

          return successTest;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            cbSuccess(params, response);
          }

          return onSuccess;
        }(),
        onFailure: function () {
          function onFailure() {
            cbFailure(params);
          }

          return onFailure;
        }()
      });
    }

    return GetModuleInstallLink;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJnZXRNb2R1bGVzVXBkYXRlcyIsImNiU3VjY2VzcyIsInJlcXVlc3REYXRhIiwiVFlQRSIsIkxJQ0VOU0UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiUEJYVkVSIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJvblN1Y2Nlc3MiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsInBhcmFtcyIsImNiRmFpbHVyZSIsIlJFTEVBU0VJRCIsInJlbGVhc2VJZCIsIm9uRmFpbHVyZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBOztBQUVBO0FBQWtDLElBQU1BLFNBQVMsR0FBRztBQUNuRDs7OztBQUlBQyxFQUFBQSxpQkFMbUQ7QUFBQSwrQkFLakNDLFNBTGlDLEVBS3RCO0FBQzVCLFVBQU1DLFdBQVcsR0FBRztBQUNuQkMsUUFBQUEsSUFBSSxFQUFFLFNBRGE7QUFFbkJDLFFBQUFBLE9BQU8sRUFBRUMsZ0JBRlU7QUFHbkJDLFFBQUFBLE1BQU0sRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBSFc7QUFJbkJDLFFBQUFBLFFBQVEsRUFBRUM7QUFKUyxPQUFwQjtBQU1BQyxNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMQyxRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxRQUFBQSxJQUFJLEVBQUVoQixXQUpEO0FBS0xpQixRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBQVMsRUFBRXpCO0FBWE4sT0FBTjtBQWFBOztBQXpCa0Q7QUFBQTs7QUEwQm5EOzs7Ozs7OztBQVFBMEIsRUFBQUEsb0JBbENtRDtBQUFBLGtDQWtDOUJDLE1BbEM4QixFQWtDdEIzQixTQWxDc0IsRUFrQ1g0QixTQWxDVyxFQWtDQTtBQUNsRCxVQUFNM0IsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsZUFEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQnlCLFFBQUFBLFNBQVMsRUFBRUYsTUFBTSxDQUFDRztBQUhDLE9BQXBCO0FBS0FwQixNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMQyxRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxRQUFBQSxJQUFJLEVBQUVoQixXQUpEO0FBS0xpQixRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBWEs7QUFBQSw2QkFXS04sUUFYTCxFQVdlO0FBQ25CbkIsWUFBQUEsU0FBUyxDQUFDMkIsTUFBRCxFQUFTUixRQUFULENBQVQ7QUFDQTs7QUFiSTtBQUFBO0FBY0xZLFFBQUFBLFNBZEs7QUFBQSwrQkFjTztBQUNYSCxZQUFBQSxTQUFTLENBQUNELE1BQUQsQ0FBVDtBQUNBOztBQWhCSTtBQUFBO0FBQUEsT0FBTjtBQWtCQTs7QUExRGtEO0FBQUE7QUFBQSxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxQQlhWZXJzaW9uICovXG5cbi8qKiBAc2NydXRpbml6ZXIgaWdub3JlLXVudXNlZCAqLyBjb25zdCBVcGRhdGVBcGkgPSB7XG5cdC8qKlxuXHQgKiBBc2tzIGZvciBhdmFpbGFibGUgbW9kdWxlcyB2ZXJzaW9uc1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICovXG5cdGdldE1vZHVsZXNVcGRhdGVzKGNiU3VjY2Vzcykge1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ01PRFVMRVMnLFxuXHRcdFx0TElDRU5TRTogZ2xvYmFsUEJYTGljZW5zZSxcblx0XHRcdFBCWFZFUjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblx0XHRcdExBTkdVQUdFOiBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBDb25maWcudXBkYXRlVXJsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzczogY2JTdWNjZXNzLFxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogQXNrcyBmb3IgaW5zdGFsbGF0aW9uIGxpbmtcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gY2JTdWNjZXNzXG5cdCAqIEBwYXJhbSBjYkZhaWx1cmVcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKi9cblx0R2V0TW9kdWxlSW5zdGFsbExpbmsocGFyYW1zLCBjYlN1Y2Nlc3MsIGNiRmFpbHVyZSkge1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ01PRFVMRUdFVExJTksnLFxuXHRcdFx0TElDRU5TRTogZ2xvYmFsUEJYTGljZW5zZSxcblx0XHRcdFJFTEVBU0VJRDogcGFyYW1zLnJlbGVhc2VJZCxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogQ29uZmlnLnVwZGF0ZVVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2JTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2JGYWlsdXJlKHBhcmFtcyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxufTsiXX0=