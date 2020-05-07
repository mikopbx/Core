"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global Config, globalWebAdminLanguage, globalPBXLicense, globalPBXVersion */
var UpdateApi = {
  pbxPing: "".concat(Config.updateUrl, "/pbxcore/api/system/ping"),
  pbxReloadAllModulesUrl: "".concat(Config.pbxUrl, "/pbxcore/api/pbx/reloadAllModules"),
  // Рестарт всех модулей АТС
  pbxReloadDialplanUrl: "".concat(Config.pbxUrl, "/pbxcore/api/pbx/reloadDialplan"),
  // Запуск генератора dialplan, перезапуск dialplan на АТС.

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
            return response !== undefined && Object.keys(response).length > 0 && response.result.toUpperCase() === 'SUCCESS';
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
            return response !== undefined && Object.keys(response).length > 0 && response.result.toUpperCase() === 'SUCCESS';
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
  }(),

  /**
   * Проверка ответа на JSON
   * @param jsonString
   * @returns {boolean|any}
   */
  tryParseJSON: function () {
    function tryParseJSON(jsonString) {
      try {
        var o = JSON.parse(jsonString); // Handle non-exception-throwing cases:
        // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
        // but... JSON.parse(null) returns null, and typeof null === "object",
        // so we must check for that, too. Thankfully, null is falsey, so this suffices:

        if (o && _typeof(o) === 'object') {
          return o;
        }
      } catch (e) {//
      }

      return false;
    }

    return tryParseJSON;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwicGJ4UmVsb2FkQWxsTW9kdWxlc1VybCIsInBieFVybCIsInBieFJlbG9hZERpYWxwbGFuVXJsIiwiZ2V0TW9kdWxlc1VwZGF0ZXMiLCJjYlN1Y2Nlc3MiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJMSUNFTlNFIiwiZ2xvYmFsUEJYTGljZW5zZSIsIlBCWFZFUiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiTEFOR1VBR0UiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwiJCIsImFwaSIsInVybCIsIm9uIiwibWV0aG9kIiwiZGF0YSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0IiwidG9VcHBlckNhc2UiLCJvblN1Y2Nlc3MiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsInBhcmFtcyIsImNiRmFpbHVyZSIsIlJFTEVBU0VJRCIsInJlbGVhc2VJZCIsIm9uRmFpbHVyZSIsInRyeVBhcnNlSlNPTiIsImpzb25TdHJpbmciLCJvIiwiSlNPTiIsInBhcnNlIiwiZSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsU0FBUyxHQUFHO0FBQ2pCQyxFQUFBQSxPQUFPLFlBQUtDLE1BQU0sQ0FBQ0MsU0FBWiw2QkFEVTtBQUVqQkMsRUFBQUEsc0JBQXNCLFlBQUtGLE1BQU0sQ0FBQ0csTUFBWixzQ0FGTDtBQUU0RDtBQUM3RUMsRUFBQUEsb0JBQW9CLFlBQUtKLE1BQU0sQ0FBQ0csTUFBWixvQ0FISDtBQUd3RDs7QUFHekU7Ozs7QUFJQUUsRUFBQUEsaUJBVmlCO0FBQUEsK0JBVUNDLFNBVkQsRUFVWTtBQUM1QixVQUFNQyxXQUFXLEdBQUc7QUFDbkJDLFFBQUFBLElBQUksRUFBRSxTQURhO0FBRW5CQyxRQUFBQSxPQUFPLEVBQUVDLGdCQUZVO0FBR25CQyxRQUFBQSxNQUFNLEVBQUVDLGdCQUFnQixDQUFDQyxPQUFqQixDQUF5QixPQUF6QixFQUFrQyxFQUFsQyxDQUhXO0FBSW5CQyxRQUFBQSxRQUFRLEVBQUVDO0FBSlMsT0FBcEI7QUFNQUMsTUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxFQUFFbEIsTUFBTSxDQUFDQyxTQURQO0FBRUxrQixRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxRQUFBQSxJQUFJLEVBQUVkLFdBSkQ7QUFLTGUsUUFBQUEsV0FMSztBQUFBLCtCQUtPQyxRQUxQLEVBS2lCO0FBQ3JCO0FBQ0EsbUJBQU9BLFFBQVEsS0FBS0MsU0FBYixJQUNIQyxNQUFNLENBQUNDLElBQVAsQ0FBWUgsUUFBWixFQUFzQkksTUFBdEIsR0FBK0IsQ0FENUIsSUFFSEosUUFBUSxDQUFDSyxNQUFULENBQWdCQyxXQUFoQixPQUFrQyxTQUZ0QztBQUdBOztBQVZJO0FBQUE7QUFXTEMsUUFBQUEsU0FBUyxFQUFFeEI7QUFYTixPQUFOO0FBYUE7O0FBOUJnQjtBQUFBO0FBZ0NqQnlCLEVBQUFBLG9CQWhDaUI7QUFBQSxrQ0FnQ0lDLE1BaENKLEVBZ0NZMUIsU0FoQ1osRUFnQ3VCMkIsU0FoQ3ZCLEVBZ0NrQztBQUNsRCxVQUFNMUIsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsZUFEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQndCLFFBQUFBLFNBQVMsRUFBRUYsTUFBTSxDQUFDRztBQUhDLE9BQXBCO0FBS0FuQixNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVsQixNQUFNLENBQUNDLFNBRFA7QUFFTGtCLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLFFBQUFBLElBQUksRUFBRWQsV0FKRDtBQUtMZSxRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsQ0FBZ0JDLFdBQWhCLE9BQWtDLFNBRnRDO0FBR0E7O0FBVkk7QUFBQTtBQVdMQyxRQUFBQSxTQVhLO0FBQUEsNkJBV0tQLFFBWEwsRUFXZTtBQUNuQmpCLFlBQUFBLFNBQVMsQ0FBQzBCLE1BQUQsRUFBU1QsUUFBVCxDQUFUO0FBQ0E7O0FBYkk7QUFBQTtBQWNMYSxRQUFBQSxTQWRLO0FBQUEsK0JBY087QUFDWEgsWUFBQUEsU0FBUyxDQUFDRCxNQUFELENBQVQ7QUFDQTs7QUFoQkk7QUFBQTtBQUFBLE9BQU47QUFrQkE7O0FBeERnQjtBQUFBOztBQXlEakI7Ozs7O0FBS0FLLEVBQUFBLFlBOURpQjtBQUFBLDBCQThESkMsVUE5REksRUE4RFE7QUFDeEIsVUFBSTtBQUNILFlBQU1DLENBQUMsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdILFVBQVgsQ0FBVixDQURHLENBR0g7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsWUFBSUMsQ0FBQyxJQUFJLFFBQU9BLENBQVAsTUFBYSxRQUF0QixFQUFnQztBQUMvQixpQkFBT0EsQ0FBUDtBQUNBO0FBQ0QsT0FWRCxDQVVFLE9BQU9HLENBQVAsRUFBVSxDQUNYO0FBQ0E7O0FBQ0QsYUFBTyxLQUFQO0FBQ0E7O0FBN0VnQjtBQUFBO0FBQUEsQ0FBbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsUEJYVmVyc2lvbiAqL1xuXG5jb25zdCBVcGRhdGVBcGkgPSB7XG5cdHBieFBpbmc6IGAke0NvbmZpZy51cGRhdGVVcmx9L3BieGNvcmUvYXBpL3N5c3RlbS9waW5nYCxcblx0cGJ4UmVsb2FkQWxsTW9kdWxlc1VybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvcGJ4L3JlbG9hZEFsbE1vZHVsZXNgLCAvLyDQoNC10YHRgtCw0YDRgiDQstGB0LXRhSDQvNC+0LTRg9C70LXQuSDQkNCi0KFcblx0cGJ4UmVsb2FkRGlhbHBsYW5Vcmw6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL3BieC9yZWxvYWREaWFscGxhbmAsIC8vINCX0LDQv9GD0YHQuiDQs9C10L3QtdGA0LDRgtC+0YDQsCBkaWFscGxhbiwg0L/QtdGA0LXQt9Cw0L/Rg9GB0LogZGlhbHBsYW4g0L3QsCDQkNCi0KEuXG5cblxuXHQvKipcblx0ICog0JfQsNC/0YDQsNGI0LjQstCw0LXRgiDQvdCwINGB0LDQudGC0LUg0L3QvtCy0YvQtSDQstC10YDRgdC40Lgg0LzQvtC00YPQu9C10LkgUEJYXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0Z2V0TW9kdWxlc1VwZGF0ZXMoY2JTdWNjZXNzKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnTU9EVUxFUycsXG5cdFx0XHRMSUNFTlNFOiBnbG9iYWxQQlhMaWNlbnNlLFxuXHRcdFx0UEJYVkVSOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXHRcdFx0TEFOR1VBR0U6IGdsb2JhbFdlYkFkbWluTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IENvbmZpZy51cGRhdGVVcmwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0LnRvVXBwZXJDYXNlKCkgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3M6IGNiU3VjY2Vzcyxcblx0XHR9KTtcblx0fSxcblxuXHRHZXRNb2R1bGVJbnN0YWxsTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnTU9EVUxFR0VUTElOSycsXG5cdFx0XHRMSUNFTlNFOiBnbG9iYWxQQlhMaWNlbnNlLFxuXHRcdFx0UkVMRUFTRUlEOiBwYXJhbXMucmVsZWFzZUlkLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBDb25maWcudXBkYXRlVXJsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdC50b1VwcGVyQ2FzZSgpID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNiRmFpbHVyZShwYXJhbXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvL1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG59OyJdfQ==