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
            return response !== undefined && Object.keys(response).length > 0 && response.result === true;
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
            return response !== undefined && Object.keys(response).length > 0 && response.result === true;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwicGJ4UmVsb2FkQWxsTW9kdWxlc1VybCIsInBieFVybCIsInBieFJlbG9hZERpYWxwbGFuVXJsIiwiZ2V0TW9kdWxlc1VwZGF0ZXMiLCJjYlN1Y2Nlc3MiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJMSUNFTlNFIiwiZ2xvYmFsUEJYTGljZW5zZSIsIlBCWFZFUiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiTEFOR1VBR0UiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwiJCIsImFwaSIsInVybCIsIm9uIiwibWV0aG9kIiwiZGF0YSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0Iiwib25TdWNjZXNzIiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJwYXJhbXMiLCJjYkZhaWx1cmUiLCJSRUxFQVNFSUQiLCJyZWxlYXNlSWQiLCJvbkZhaWx1cmUiLCJ0cnlQYXJzZUpTT04iLCJqc29uU3RyaW5nIiwibyIsIkpTT04iLCJwYXJzZSIsImUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFNBQVMsR0FBRztBQUNqQkMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLFNBQVosNkJBRFU7QUFFakJDLEVBQUFBLHNCQUFzQixZQUFLRixNQUFNLENBQUNHLE1BQVosc0NBRkw7QUFFNEQ7QUFDN0VDLEVBQUFBLG9CQUFvQixZQUFLSixNQUFNLENBQUNHLE1BQVosb0NBSEg7QUFHd0Q7O0FBR3pFOzs7O0FBSUFFLEVBQUFBLGlCQVZpQjtBQUFBLCtCQVVDQyxTQVZELEVBVVk7QUFDNUIsVUFBTUMsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsU0FEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQkMsUUFBQUEsTUFBTSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FIVztBQUluQkMsUUFBQUEsUUFBUSxFQUFFQztBQUpTLE9BQXBCO0FBTUFDLE1BQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRWxCLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMa0IsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsUUFBQUEsSUFBSSxFQUFFZCxXQUpEO0FBS0xlLFFBQUFBLFdBTEs7QUFBQSwrQkFLT0MsUUFMUCxFQUtpQjtBQUNyQjtBQUNBLG1CQUFPQSxRQUFRLEtBQUtDLFNBQWIsSUFDSEMsTUFBTSxDQUFDQyxJQUFQLENBQVlILFFBQVosRUFBc0JJLE1BQXRCLEdBQStCLENBRDVCLElBRUhKLFFBQVEsQ0FBQ0ssTUFBVCxLQUFvQixJQUZ4QjtBQUdBOztBQVZJO0FBQUE7QUFXTEMsUUFBQUEsU0FBUyxFQUFFdkI7QUFYTixPQUFOO0FBYUE7O0FBOUJnQjtBQUFBO0FBZ0NqQndCLEVBQUFBLG9CQWhDaUI7QUFBQSxrQ0FnQ0lDLE1BaENKLEVBZ0NZekIsU0FoQ1osRUFnQ3VCMEIsU0FoQ3ZCLEVBZ0NrQztBQUNsRCxVQUFNekIsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsZUFEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQnVCLFFBQUFBLFNBQVMsRUFBRUYsTUFBTSxDQUFDRztBQUhDLE9BQXBCO0FBS0FsQixNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVsQixNQUFNLENBQUNDLFNBRFA7QUFFTGtCLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLFFBQUFBLElBQUksRUFBRWQsV0FKRDtBQUtMZSxRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsSUFGeEI7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBWEs7QUFBQSw2QkFXS04sUUFYTCxFQVdlO0FBQ25CakIsWUFBQUEsU0FBUyxDQUFDeUIsTUFBRCxFQUFTUixRQUFULENBQVQ7QUFDQTs7QUFiSTtBQUFBO0FBY0xZLFFBQUFBLFNBZEs7QUFBQSwrQkFjTztBQUNYSCxZQUFBQSxTQUFTLENBQUNELE1BQUQsQ0FBVDtBQUNBOztBQWhCSTtBQUFBO0FBQUEsT0FBTjtBQWtCQTs7QUF4RGdCO0FBQUE7O0FBeURqQjs7Ozs7QUFLQUssRUFBQUEsWUE5RGlCO0FBQUEsMEJBOERKQyxVQTlESSxFQThEUTtBQUN4QixVQUFJO0FBQ0gsWUFBTUMsQ0FBQyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsVUFBWCxDQUFWLENBREcsQ0FHSDtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxZQUFJQyxDQUFDLElBQUksUUFBT0EsQ0FBUCxNQUFhLFFBQXRCLEVBQWdDO0FBQy9CLGlCQUFPQSxDQUFQO0FBQ0E7QUFDRCxPQVZELENBVUUsT0FBT0csQ0FBUCxFQUFVLENBQ1g7QUFDQTs7QUFDRCxhQUFPLEtBQVA7QUFDQTs7QUE3RWdCO0FBQUE7QUFBQSxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxQQlhWZXJzaW9uICovXG5cbmNvbnN0IFVwZGF0ZUFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnVwZGF0ZVVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhSZWxvYWRBbGxNb2R1bGVzVXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9wYngvcmVsb2FkQWxsTW9kdWxlc2AsIC8vINCg0LXRgdGC0LDRgNGCINCy0YHQtdGFINC80L7QtNGD0LvQtdC5INCQ0KLQoVxuXHRwYnhSZWxvYWREaWFscGxhblVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvcGJ4L3JlbG9hZERpYWxwbGFuYCwgLy8g0JfQsNC/0YPRgdC6INCz0LXQvdC10YDQsNGC0L7RgNCwIGRpYWxwbGFuLCDQv9C10YDQtdC30LDQv9GD0YHQuiBkaWFscGxhbiDQvdCwINCQ0KLQoS5cblxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/RgNCw0YjQuNCy0LDQtdGCINC90LAg0YHQsNC50YLQtSDQvdC+0LLRi9C1INCy0LXRgNGB0LjQuCDQvNC+0LTRg9C70LXQuSBQQlhcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRnZXRNb2R1bGVzVXBkYXRlcyhjYlN1Y2Nlc3MpIHtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdNT0RVTEVTJyxcblx0XHRcdExJQ0VOU0U6IGdsb2JhbFBCWExpY2Vuc2UsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogQ29uZmlnLnVwZGF0ZVVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzOiBjYlN1Y2Nlc3MsXG5cdFx0fSk7XG5cdH0sXG5cblx0R2V0TW9kdWxlSW5zdGFsbExpbmsocGFyYW1zLCBjYlN1Y2Nlc3MsIGNiRmFpbHVyZSkge1xuXHRcdGNvbnN0IHJlcXVlc3REYXRhID0ge1xuXHRcdFx0VFlQRTogJ01PRFVMRUdFVExJTksnLFxuXHRcdFx0TElDRU5TRTogZ2xvYmFsUEJYTGljZW5zZSxcblx0XHRcdFJFTEVBU0VJRDogcGFyYW1zLnJlbGVhc2VJZCxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogQ29uZmlnLnVwZGF0ZVVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNiRmFpbHVyZShwYXJhbXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvL1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG59OyJdfQ==