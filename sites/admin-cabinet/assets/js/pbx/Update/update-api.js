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
   * Запрашивает на сайте новые версии модулей PBX
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJnZXRNb2R1bGVzVXBkYXRlcyIsImNiU3VjY2VzcyIsInJlcXVlc3REYXRhIiwiVFlQRSIsIkxJQ0VOU0UiLCJnbG9iYWxQQlhMaWNlbnNlIiwiUEJYVkVSIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJMQU5HVUFHRSIsImdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UiLCIkIiwiYXBpIiwidXJsIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwib24iLCJtZXRob2QiLCJkYXRhIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJyZXN1bHQiLCJvblN1Y2Nlc3MiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsInBhcmFtcyIsImNiRmFpbHVyZSIsIlJFTEVBU0VJRCIsInJlbGVhc2VJZCIsIm9uRmFpbHVyZSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUNBLElBQU1BLFNBQVMsR0FBRztBQUNqQjs7OztBQUlBQyxFQUFBQSxpQkFMaUI7QUFBQSwrQkFLQ0MsU0FMRCxFQUtZO0FBQzVCLFVBQU1DLFdBQVcsR0FBRztBQUNuQkMsUUFBQUEsSUFBSSxFQUFFLFNBRGE7QUFFbkJDLFFBQUFBLE9BQU8sRUFBRUMsZ0JBRlU7QUFHbkJDLFFBQUFBLE1BQU0sRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBSFc7QUFJbkJDLFFBQUFBLFFBQVEsRUFBRUM7QUFKUyxPQUFwQjtBQU1BQyxNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVDLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMQyxRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxRQUFBQSxJQUFJLEVBQUVoQixXQUpEO0FBS0xpQixRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBQVMsRUFBRXpCO0FBWE4sT0FBTjtBQWFBOztBQXpCZ0I7QUFBQTtBQTJCakIwQixFQUFBQSxvQkEzQmlCO0FBQUEsa0NBMkJJQyxNQTNCSixFQTJCWTNCLFNBM0JaLEVBMkJ1QjRCLFNBM0J2QixFQTJCa0M7QUFDbEQsVUFBTTNCLFdBQVcsR0FBRztBQUNuQkMsUUFBQUEsSUFBSSxFQUFFLGVBRGE7QUFFbkJDLFFBQUFBLE9BQU8sRUFBRUMsZ0JBRlU7QUFHbkJ5QixRQUFBQSxTQUFTLEVBQUVGLE1BQU0sQ0FBQ0c7QUFIQyxPQUFwQjtBQUtBcEIsTUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxFQUFFQyxNQUFNLENBQUNDLFNBRFA7QUFFTEMsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsUUFBQUEsSUFBSSxFQUFFaEIsV0FKRDtBQUtMaUIsUUFBQUEsV0FMSztBQUFBLCtCQUtPQyxRQUxQLEVBS2lCO0FBQ3JCO0FBQ0EsbUJBQU9BLFFBQVEsS0FBS0MsU0FBYixJQUNIQyxNQUFNLENBQUNDLElBQVAsQ0FBWUgsUUFBWixFQUFzQkksTUFBdEIsR0FBK0IsQ0FENUIsSUFFSEosUUFBUSxDQUFDSyxNQUFULEtBQW9CLFNBRnhCO0FBR0E7O0FBVkk7QUFBQTtBQVdMQyxRQUFBQSxTQVhLO0FBQUEsNkJBV0tOLFFBWEwsRUFXZTtBQUNuQm5CLFlBQUFBLFNBQVMsQ0FBQzJCLE1BQUQsRUFBU1IsUUFBVCxDQUFUO0FBQ0E7O0FBYkk7QUFBQTtBQWNMWSxRQUFBQSxTQWRLO0FBQUEsK0JBY087QUFDWEgsWUFBQUEsU0FBUyxDQUFDRCxNQUFELENBQVQ7QUFDQTs7QUFoQkk7QUFBQTtBQUFBLE9BQU47QUFrQkE7O0FBbkRnQjtBQUFBO0FBQUEsQ0FBbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsUEJYVmVyc2lvbiAqL1xuY29uc3QgVXBkYXRlQXBpID0ge1xuXHQvKipcblx0ICog0JfQsNC/0YDQsNGI0LjQstCw0LXRgiDQvdCwINGB0LDQudGC0LUg0L3QvtCy0YvQtSDQstC10YDRgdC40Lgg0LzQvtC00YPQu9C10LkgUEJYXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0Z2V0TW9kdWxlc1VwZGF0ZXMoY2JTdWNjZXNzKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnTU9EVUxFUycsXG5cdFx0XHRMSUNFTlNFOiBnbG9iYWxQQlhMaWNlbnNlLFxuXHRcdFx0UEJYVkVSOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXHRcdFx0TEFOR1VBR0U6IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IENvbmZpZy51cGRhdGVVcmwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0ID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzOiBjYlN1Y2Nlc3MsXG5cdFx0fSk7XG5cdH0sXG5cblx0R2V0TW9kdWxlSW5zdGFsbExpbmsocGFyYW1zLCBjYlN1Y2Nlc3MsIGNiRmFpbHVyZSkge1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ01PRFVMRUdFVExJTksnLFxuXHRcdFx0TElDRU5TRTogZ2xvYmFsUEJYTGljZW5zZSxcblx0XHRcdFJFTEVBU0VJRDogcGFyYW1zLnJlbGVhc2VJZCxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogQ29uZmlnLnVwZGF0ZVVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0Y2JTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpO1xuXHRcdFx0fSxcblx0XHRcdG9uRmFpbHVyZSgpIHtcblx0XHRcdFx0Y2JGYWlsdXJlKHBhcmFtcyk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9LFxufTsiXX0=