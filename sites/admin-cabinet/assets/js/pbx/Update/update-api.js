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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwicGJ4UmVsb2FkQWxsTW9kdWxlc1VybCIsInBieFVybCIsInBieFJlbG9hZERpYWxwbGFuVXJsIiwiZ2V0TW9kdWxlc1VwZGF0ZXMiLCJjYlN1Y2Nlc3MiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJMSUNFTlNFIiwiZ2xvYmFsUEJYTGljZW5zZSIsIlBCWFZFUiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiTEFOR1VBR0UiLCJnbG9iYWxXZWJBZG1pbkxhbmd1YWdlIiwiJCIsImFwaSIsInVybCIsIm9uIiwibWV0aG9kIiwiZGF0YSIsInN1Y2Nlc3NUZXN0IiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJPYmplY3QiLCJrZXlzIiwibGVuZ3RoIiwicmVzdWx0Iiwib25TdWNjZXNzIiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJwYXJhbXMiLCJjYkZhaWx1cmUiLCJSRUxFQVNFSUQiLCJyZWxlYXNlSWQiLCJvbkZhaWx1cmUiLCJ0cnlQYXJzZUpTT04iLCJqc29uU3RyaW5nIiwibyIsIkpTT04iLCJwYXJzZSIsImUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFNBQVMsR0FBRztBQUNqQkMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLFNBQVosNkJBRFU7QUFFakJDLEVBQUFBLHNCQUFzQixZQUFLRixNQUFNLENBQUNHLE1BQVosc0NBRkw7QUFFNEQ7QUFDN0VDLEVBQUFBLG9CQUFvQixZQUFLSixNQUFNLENBQUNHLE1BQVosb0NBSEg7QUFHd0Q7O0FBR3pFOzs7O0FBSUFFLEVBQUFBLGlCQVZpQjtBQUFBLCtCQVVDQyxTQVZELEVBVVk7QUFDNUIsVUFBTUMsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsU0FEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQkMsUUFBQUEsTUFBTSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FIVztBQUluQkMsUUFBQUEsUUFBUSxFQUFFQztBQUpTLE9BQXBCO0FBTUFDLE1BQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRWxCLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMa0IsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsUUFBQUEsSUFBSSxFQUFFZCxXQUpEO0FBS0xlLFFBQUFBLFdBTEs7QUFBQSwrQkFLT0MsUUFMUCxFQUtpQjtBQUNyQjtBQUNBLG1CQUFPQSxRQUFRLEtBQUtDLFNBQWIsSUFDSEMsTUFBTSxDQUFDQyxJQUFQLENBQVlILFFBQVosRUFBc0JJLE1BQXRCLEdBQStCLENBRDVCLElBRUhKLFFBQVEsQ0FBQ0ssTUFBVCxLQUFvQixTQUZ4QjtBQUdBOztBQVZJO0FBQUE7QUFXTEMsUUFBQUEsU0FBUyxFQUFFdkI7QUFYTixPQUFOO0FBYUE7O0FBOUJnQjtBQUFBO0FBZ0NqQndCLEVBQUFBLG9CQWhDaUI7QUFBQSxrQ0FnQ0lDLE1BaENKLEVBZ0NZekIsU0FoQ1osRUFnQ3VCMEIsU0FoQ3ZCLEVBZ0NrQztBQUNsRCxVQUFNekIsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsZUFEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQnVCLFFBQUFBLFNBQVMsRUFBRUYsTUFBTSxDQUFDRztBQUhDLE9BQXBCO0FBS0FsQixNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLEVBQUVsQixNQUFNLENBQUNDLFNBRFA7QUFFTGtCLFFBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLFFBQUFBLE1BQU0sRUFBRSxNQUhIO0FBSUxDLFFBQUFBLElBQUksRUFBRWQsV0FKRDtBQUtMZSxRQUFBQSxXQUxLO0FBQUEsK0JBS09DLFFBTFAsRUFLaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLQyxTQUFiLElBQ0hDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSCxRQUFaLEVBQXNCSSxNQUF0QixHQUErQixDQUQ1QixJQUVISixRQUFRLENBQUNLLE1BQVQsS0FBb0IsU0FGeEI7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBWEs7QUFBQSw2QkFXS04sUUFYTCxFQVdlO0FBQ25CakIsWUFBQUEsU0FBUyxDQUFDeUIsTUFBRCxFQUFTUixRQUFULENBQVQ7QUFDQTs7QUFiSTtBQUFBO0FBY0xZLFFBQUFBLFNBZEs7QUFBQSwrQkFjTztBQUNYSCxZQUFBQSxTQUFTLENBQUNELE1BQUQsQ0FBVDtBQUNBOztBQWhCSTtBQUFBO0FBQUEsT0FBTjtBQWtCQTs7QUF4RGdCO0FBQUE7O0FBeURqQjs7Ozs7QUFLQUssRUFBQUEsWUE5RGlCO0FBQUEsMEJBOERKQyxVQTlESSxFQThEUTtBQUN4QixVQUFJO0FBQ0gsWUFBTUMsQ0FBQyxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV0gsVUFBWCxDQUFWLENBREcsQ0FHSDtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxZQUFJQyxDQUFDLElBQUksUUFBT0EsQ0FBUCxNQUFhLFFBQXRCLEVBQWdDO0FBQy9CLGlCQUFPQSxDQUFQO0FBQ0E7QUFDRCxPQVZELENBVUUsT0FBT0csQ0FBUCxFQUFVLENBQ1g7QUFDQTs7QUFDRCxhQUFPLEtBQVA7QUFDQTs7QUE3RWdCO0FBQUE7QUFBQSxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBnbG9iYWxXZWJBZG1pbkxhbmd1YWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxQQlhWZXJzaW9uICovXG5cbmNvbnN0IFVwZGF0ZUFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnVwZGF0ZVVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhSZWxvYWRBbGxNb2R1bGVzVXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9wYngvcmVsb2FkQWxsTW9kdWxlc2AsIC8vINCg0LXRgdGC0LDRgNGCINCy0YHQtdGFINC80L7QtNGD0LvQtdC5INCQ0KLQoVxuXHRwYnhSZWxvYWREaWFscGxhblVybDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvcGJ4L3JlbG9hZERpYWxwbGFuYCwgLy8g0JfQsNC/0YPRgdC6INCz0LXQvdC10YDQsNGC0L7RgNCwIGRpYWxwbGFuLCDQv9C10YDQtdC30LDQv9GD0YHQuiBkaWFscGxhbiDQvdCwINCQ0KLQoS5cblxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/RgNCw0YjQuNCy0LDQtdGCINC90LAg0YHQsNC50YLQtSDQvdC+0LLRi9C1INCy0LXRgNGB0LjQuCDQvNC+0LTRg9C70LXQuSBQQlhcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRnZXRNb2R1bGVzVXBkYXRlcyhjYlN1Y2Nlc3MpIHtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdNT0RVTEVTJyxcblx0XHRcdExJQ0VOU0U6IGdsb2JhbFBCWExpY2Vuc2UsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsV2ViQWRtaW5MYW5ndWFnZSxcblx0XHR9O1xuXHRcdCQuYXBpKHtcblx0XHRcdHVybDogQ29uZmlnLnVwZGF0ZVVybCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YTogcmVxdWVzdERhdGEsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDBcblx0XHRcdFx0XHQmJiByZXNwb25zZS5yZXN1bHQgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3M6IGNiU3VjY2Vzcyxcblx0XHR9KTtcblx0fSxcblxuXHRHZXRNb2R1bGVJbnN0YWxsTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnTU9EVUxFR0VUTElOSycsXG5cdFx0XHRMSUNFTlNFOiBnbG9iYWxQQlhMaWNlbnNlLFxuXHRcdFx0UkVMRUFTRUlEOiBwYXJhbXMucmVsZWFzZUlkLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBDb25maWcudXBkYXRlVXJsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gJ1NVQ0NFU1MnO1xuXHRcdFx0fSxcblx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRjYlN1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSk7XG5cdFx0XHR9LFxuXHRcdFx0b25GYWlsdXJlKCkge1xuXHRcdFx0XHRjYkZhaWx1cmUocGFyYW1zKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9GA0L7QstC10YDQutCwINC+0YLQstC10YLQsCDQvdCwIEpTT05cblx0ICogQHBhcmFtIGpzb25TdHJpbmdcblx0ICogQHJldHVybnMge2Jvb2xlYW58YW55fVxuXHQgKi9cblx0dHJ5UGFyc2VKU09OKGpzb25TdHJpbmcpIHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgbyA9IEpTT04ucGFyc2UoanNvblN0cmluZyk7XG5cblx0XHRcdC8vIEhhbmRsZSBub24tZXhjZXB0aW9uLXRocm93aW5nIGNhc2VzOlxuXHRcdFx0Ly8gTmVpdGhlciBKU09OLnBhcnNlKGZhbHNlKSBvciBKU09OLnBhcnNlKDEyMzQpIHRocm93IGVycm9ycywgaGVuY2UgdGhlIHR5cGUtY2hlY2tpbmcsXG5cdFx0XHQvLyBidXQuLi4gSlNPTi5wYXJzZShudWxsKSByZXR1cm5zIG51bGwsIGFuZCB0eXBlb2YgbnVsbCA9PT0gXCJvYmplY3RcIixcblx0XHRcdC8vIHNvIHdlIG11c3QgY2hlY2sgZm9yIHRoYXQsIHRvby4gVGhhbmtmdWxseSwgbnVsbCBpcyBmYWxzZXksIHNvIHRoaXMgc3VmZmljZXM6XG5cdFx0XHRpZiAobyAmJiB0eXBlb2YgbyA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0cmV0dXJuIG87XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Ly9cblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9LFxufTsiXX0=