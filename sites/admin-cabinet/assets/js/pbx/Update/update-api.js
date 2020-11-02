"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global Config, globalWebAdminLanguage, globalPBXLicense, globalPBXVersion */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJnZXRNb2R1bGVzVXBkYXRlcyIsImNiU3VjY2VzcyIsInJlcXVlc3REYXRhIiwiVFlQRSIsIkxJQ0VOU0UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiUEJYVkVSIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJvblN1Y2Nlc3MiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsInBhcmFtcyIsImNiRmFpbHVyZSIsIlJFTEVBU0VJRCIsInJlbGVhc2VJZCIsIm9uRmFpbHVyZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFNBQVMsR0FBRztBQUNqQjs7OztBQUlBQyxFQUFBQSxpQkFMaUI7QUFBQSwrQkFLQ0MsU0FMRCxFQUtZO0FBQzVCLFVBQU1DLFdBQVcsR0FBRztBQUNuQkMsUUFBQUEsSUFBSSxFQUFFLFNBRGE7QUFFbkJDLFFBQUFBLE9BQU8sRUFBRUMsZ0JBRlU7QUFHbkJDLFFBQUFBLE1BQU0sRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBSFc7QUFJbkJDLFFBQUFBLFFBQVEsRUFBRUM7QUFKUyxPQUFwQjtBQU1BQyxNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMQyxRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxRQUFBQSxJQUFJLEVBQUVoQixXQUpEO0FBS0xpQixRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBQVMsRUFBRXpCO0FBWE4sT0FBTjtBQWFBOztBQXpCZ0I7QUFBQTs7QUEwQmpCOzs7Ozs7OztBQVFBMEIsRUFBQUEsb0JBbENpQjtBQUFBLGtDQWtDSUMsTUFsQ0osRUFrQ1kzQixTQWxDWixFQWtDdUI0QixTQWxDdkIsRUFrQ2tDO0FBQ2xELFVBQU0zQixXQUFXLEdBQUc7QUFDbkJDLFFBQUFBLElBQUksRUFBRSxlQURhO0FBRW5CQyxRQUFBQSxPQUFPLEVBQUVDLGdCQUZVO0FBR25CeUIsUUFBQUEsU0FBUyxFQUFFRixNQUFNLENBQUNHO0FBSEMsT0FBcEI7QUFLQXBCLE1BQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRUMsTUFBTSxDQUFDQyxTQURQO0FBRUxDLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLFFBQUFBLElBQUksRUFBRWhCLFdBSkQ7QUFLTGlCLFFBQUFBLFdBTEs7QUFBQSwrQkFLT0MsUUFMUCxFQUtpQjtBQUNyQjtBQUNBLG1CQUFPQSxRQUFRLEtBQUtDLFNBQWIsSUFDSEMsTUFBTSxDQUFDQyxJQUFQLENBQVlILFFBQVosRUFBc0JJLE1BQXRCLEdBQStCLENBRDVCLElBRUhKLFFBQVEsQ0FBQ0ssTUFBVCxLQUFvQixTQUZ4QjtBQUdBOztBQVZJO0FBQUE7QUFXTEMsUUFBQUEsU0FYSztBQUFBLDZCQVdLTixRQVhMLEVBV2U7QUFDbkJuQixZQUFBQSxTQUFTLENBQUMyQixNQUFELEVBQVNSLFFBQVQsQ0FBVDtBQUNBOztBQWJJO0FBQUE7QUFjTFksUUFBQUEsU0FkSztBQUFBLCtCQWNPO0FBQ1hILFlBQUFBLFNBQVMsQ0FBQ0QsTUFBRCxDQUFUO0FBQ0E7O0FBaEJJO0FBQUE7QUFBQSxPQUFOO0FBa0JBOztBQTFEZ0I7QUFBQTtBQUFBLENBQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsIGdsb2JhbFBCWExpY2Vuc2UsIGdsb2JhbFBCWFZlcnNpb24gKi9cblxuY29uc3QgVXBkYXRlQXBpID0ge1xuXHQvKipcblx0ICogQXNrcyBmb3IgYXZhaWxhYmxlIG1vZHVsZXMgdmVyc2lvbnNcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRnZXRNb2R1bGVzVXBkYXRlcyhjYlN1Y2Nlc3MpIHtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdNT0RVTEVTJyxcblx0XHRcdExJQ0VOU0U6IGdsb2JhbFBCWExpY2Vuc2UsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogQ29uZmlnLnVwZGF0ZVVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3M6IGNiU3VjY2Vzcyxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEFza3MgZm9yIGluc3RhbGxhdGlvbiBsaW5rXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNiU3VjY2Vzc1xuXHQgKiBAcGFyYW0gY2JGYWlsdXJlXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKiBAY29uc3RydWN0b3Jcblx0ICovXG5cdEdldE1vZHVsZUluc3RhbGxMaW5rKHBhcmFtcywgY2JTdWNjZXNzLCBjYkZhaWx1cmUpIHtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdNT0RVTEVHRVRMSU5LJyxcblx0XHRcdExJQ0VOU0U6IGdsb2JhbFBCWExpY2Vuc2UsXG5cdFx0XHRSRUxFQVNFSUQ6IHBhcmFtcy5yZWxlYXNlSWQsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IENvbmZpZy51cGRhdGVVcmwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNiRmFpbHVyZShwYXJhbXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcbn07Il19