"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global Config, globalPBXLanguage, globalPBXLicense, globalPBXVersion */
var UpdateApi = {
  pbxPing: "".concat(Config.updateUrl, "/pbxcore/api/system/ping"),
  pbxReloadAllModulesUrl: "".concat(Config.pbxUrl, "/pbxcore/api/pbx/reload_all_modules"),
  // Рестарт всех модулей АТС
  pbxReloadDialplanUrl: "".concat(Config.pbxUrl, "/pbxcore/api/pbx/reload_dialplan"),
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
        LANGUAGE: globalPBXLanguage
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLWFwaS5qcyJdLCJuYW1lcyI6WyJVcGRhdGVBcGkiLCJwYnhQaW5nIiwiQ29uZmlnIiwidXBkYXRlVXJsIiwicGJ4UmVsb2FkQWxsTW9kdWxlc1VybCIsInBieFVybCIsInBieFJlbG9hZERpYWxwbGFuVXJsIiwiZ2V0TW9kdWxlc1VwZGF0ZXMiLCJjYlN1Y2Nlc3MiLCJyZXF1ZXN0RGF0YSIsIlRZUEUiLCJMSUNFTlNFIiwiZ2xvYmFsUEJYTGljZW5zZSIsIlBCWFZFUiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiTEFOR1VBR0UiLCJnbG9iYWxQQlhMYW5ndWFnZSIsIiQiLCJhcGkiLCJ1cmwiLCJvbiIsIm1ldGhvZCIsImRhdGEiLCJzdWNjZXNzVGVzdCIsInJlc3BvbnNlIiwidW5kZWZpbmVkIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInJlc3VsdCIsInRvVXBwZXJDYXNlIiwib25TdWNjZXNzIiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJwYXJhbXMiLCJjYkZhaWx1cmUiLCJSRUxFQVNFSUQiLCJyZWxlYXNlSWQiLCJvbkZhaWx1cmUiLCJ0cnlQYXJzZUpTT04iLCJqc29uU3RyaW5nIiwibyIsIkpTT04iLCJwYXJzZSIsImUiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUVBLElBQU1BLFNBQVMsR0FBRztBQUNqQkMsRUFBQUEsT0FBTyxZQUFLQyxNQUFNLENBQUNDLFNBQVosNkJBRFU7QUFFakJDLEVBQUFBLHNCQUFzQixZQUFLRixNQUFNLENBQUNHLE1BQVosd0NBRkw7QUFFOEQ7QUFDL0VDLEVBQUFBLG9CQUFvQixZQUFLSixNQUFNLENBQUNHLE1BQVoscUNBSEg7QUFHeUQ7O0FBRzFFOzs7O0FBSUFFLEVBQUFBLGlCQVZpQjtBQUFBLCtCQVVDQyxTQVZELEVBVVk7QUFDNUIsVUFBTUMsV0FBVyxHQUFHO0FBQ25CQyxRQUFBQSxJQUFJLEVBQUUsU0FEYTtBQUVuQkMsUUFBQUEsT0FBTyxFQUFFQyxnQkFGVTtBQUduQkMsUUFBQUEsTUFBTSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FIVztBQUluQkMsUUFBQUEsUUFBUSxFQUFFQztBQUpTLE9BQXBCO0FBTUFDLE1BQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0xDLFFBQUFBLEdBQUcsRUFBRWxCLE1BQU0sQ0FBQ0MsU0FEUDtBQUVMa0IsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsUUFBQUEsSUFBSSxFQUFFZCxXQUpEO0FBS0xlLFFBQUFBLFdBTEs7QUFBQSwrQkFLT0MsUUFMUCxFQUtpQjtBQUNyQjtBQUNBLG1CQUFPQSxRQUFRLEtBQUtDLFNBQWIsSUFDSEMsTUFBTSxDQUFDQyxJQUFQLENBQVlILFFBQVosRUFBc0JJLE1BQXRCLEdBQStCLENBRDVCLElBRUhKLFFBQVEsQ0FBQ0ssTUFBVCxDQUFnQkMsV0FBaEIsT0FBa0MsU0FGdEM7QUFHQTs7QUFWSTtBQUFBO0FBV0xDLFFBQUFBLFNBQVMsRUFBRXhCO0FBWE4sT0FBTjtBQWFBOztBQTlCZ0I7QUFBQTtBQWdDakJ5QixFQUFBQSxvQkFoQ2lCO0FBQUEsa0NBZ0NJQyxNQWhDSixFQWdDWTFCLFNBaENaLEVBZ0N1QjJCLFNBaEN2QixFQWdDa0M7QUFDbEQsVUFBTTFCLFdBQVcsR0FBRztBQUNuQkMsUUFBQUEsSUFBSSxFQUFFLGVBRGE7QUFFbkJDLFFBQUFBLE9BQU8sRUFBRUMsZ0JBRlU7QUFHbkJ3QixRQUFBQSxTQUFTLEVBQUVGLE1BQU0sQ0FBQ0c7QUFIQyxPQUFwQjtBQUtBbkIsTUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDTEMsUUFBQUEsR0FBRyxFQUFFbEIsTUFBTSxDQUFDQyxTQURQO0FBRUxrQixRQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxRQUFBQSxNQUFNLEVBQUUsTUFISDtBQUlMQyxRQUFBQSxJQUFJLEVBQUVkLFdBSkQ7QUFLTGUsUUFBQUEsV0FMSztBQUFBLCtCQUtPQyxRQUxQLEVBS2lCO0FBQ3JCO0FBQ0EsbUJBQU9BLFFBQVEsS0FBS0MsU0FBYixJQUNIQyxNQUFNLENBQUNDLElBQVAsQ0FBWUgsUUFBWixFQUFzQkksTUFBdEIsR0FBK0IsQ0FENUIsSUFFSEosUUFBUSxDQUFDSyxNQUFULENBQWdCQyxXQUFoQixPQUFrQyxTQUZ0QztBQUdBOztBQVZJO0FBQUE7QUFXTEMsUUFBQUEsU0FYSztBQUFBLDZCQVdLUCxRQVhMLEVBV2U7QUFDbkJqQixZQUFBQSxTQUFTLENBQUMwQixNQUFELEVBQVNULFFBQVQsQ0FBVDtBQUNBOztBQWJJO0FBQUE7QUFjTGEsUUFBQUEsU0FkSztBQUFBLCtCQWNPO0FBQ1hILFlBQUFBLFNBQVMsQ0FBQ0QsTUFBRCxDQUFUO0FBQ0E7O0FBaEJJO0FBQUE7QUFBQSxPQUFOO0FBa0JBOztBQXhEZ0I7QUFBQTs7QUF5RGpCOzs7OztBQUtBSyxFQUFBQSxZQTlEaUI7QUFBQSwwQkE4REpDLFVBOURJLEVBOERRO0FBQ3hCLFVBQUk7QUFDSCxZQUFNQyxDQUFDLEdBQUdDLElBQUksQ0FBQ0MsS0FBTCxDQUFXSCxVQUFYLENBQVYsQ0FERyxDQUdIO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFlBQUlDLENBQUMsSUFBSSxRQUFPQSxDQUFQLE1BQWEsUUFBdEIsRUFBZ0M7QUFDL0IsaUJBQU9BLENBQVA7QUFDQTtBQUNELE9BVkQsQ0FVRSxPQUFPRyxDQUFQLEVBQVUsQ0FDWDtBQUNBOztBQUNELGFBQU8sS0FBUDtBQUNBOztBQTdFZ0I7QUFBQTtBQUFBLENBQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIGdsb2JhbFBCWExhbmd1YWdlLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxQQlhWZXJzaW9uICovXG5cbmNvbnN0IFVwZGF0ZUFwaSA9IHtcblx0cGJ4UGluZzogYCR7Q29uZmlnLnVwZGF0ZVVybH0vcGJ4Y29yZS9hcGkvc3lzdGVtL3BpbmdgLFxuXHRwYnhSZWxvYWRBbGxNb2R1bGVzVXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9wYngvcmVsb2FkX2FsbF9tb2R1bGVzYCwgLy8g0KDQtdGB0YLQsNGA0YIg0LLRgdC10YUg0LzQvtC00YPQu9C10Lkg0JDQotChXG5cdHBieFJlbG9hZERpYWxwbGFuVXJsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9wYngvcmVsb2FkX2RpYWxwbGFuYCwgLy8g0JfQsNC/0YPRgdC6INCz0LXQvdC10YDQsNGC0L7RgNCwIGRpYWxwbGFuLCDQv9C10YDQtdC30LDQv9GD0YHQuiBkaWFscGxhbiDQvdCwINCQ0KLQoS5cblxuXG5cdC8qKlxuXHQgKiDQl9Cw0L/RgNCw0YjQuNCy0LDQtdGCINC90LAg0YHQsNC50YLQtSDQvdC+0LLRi9C1INCy0LXRgNGB0LjQuCDQvNC+0LTRg9C70LXQuSBQQlhcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRnZXRNb2R1bGVzVXBkYXRlcyhjYlN1Y2Nlc3MpIHtcblx0XHRjb25zdCByZXF1ZXN0RGF0YSA9IHtcblx0XHRcdFRZUEU6ICdNT0RVTEVTJyxcblx0XHRcdExJQ0VOU0U6IGdsb2JhbFBCWExpY2Vuc2UsXG5cdFx0XHRQQlhWRVI6IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdFx0XHRMQU5HVUFHRTogZ2xvYmFsUEJYTGFuZ3VhZ2UsXG5cdFx0fTtcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IENvbmZpZy51cGRhdGVVcmwsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRtZXRob2Q6ICdQT1NUJyxcblx0XHRcdGRhdGE6IHJlcXVlc3REYXRhLFxuXHRcdFx0c3VjY2Vzc1Rlc3QocmVzcG9uc2UpIHtcblx0XHRcdFx0Ly8gdGVzdCB3aGV0aGVyIGEgSlNPTiByZXNwb25zZSBpcyB2YWxpZFxuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UgIT09IHVuZGVmaW5lZFxuXHRcdFx0XHRcdCYmIE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPiAwXG5cdFx0XHRcdFx0JiYgcmVzcG9uc2UucmVzdWx0LnRvVXBwZXJDYXNlKCkgPT09ICdTVUNDRVNTJztcblx0XHRcdH0sXG5cdFx0XHRvblN1Y2Nlc3M6IGNiU3VjY2Vzcyxcblx0XHR9KTtcblx0fSxcblxuXHRHZXRNb2R1bGVJbnN0YWxsTGluayhwYXJhbXMsIGNiU3VjY2VzcywgY2JGYWlsdXJlKSB7XG5cdFx0Y29uc3QgcmVxdWVzdERhdGEgPSB7XG5cdFx0XHRUWVBFOiAnTU9EVUxFR0VUTElOSycsXG5cdFx0XHRMSUNFTlNFOiBnbG9iYWxQQlhMaWNlbnNlLFxuXHRcdFx0UkVMRUFTRUlEOiBwYXJhbXMucmVsZWFzZUlkLFxuXHRcdH07XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBDb25maWcudXBkYXRlVXJsLFxuXHRcdFx0b246ICdub3cnLFxuXHRcdFx0bWV0aG9kOiAnUE9TVCcsXG5cdFx0XHRkYXRhOiByZXF1ZXN0RGF0YSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnJlc3VsdC50b1VwcGVyQ2FzZSgpID09PSAnU1VDQ0VTUyc7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGNiU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKTtcblx0XHRcdH0sXG5cdFx0XHRvbkZhaWx1cmUoKSB7XG5cdFx0XHRcdGNiRmFpbHVyZShwYXJhbXMpO1xuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0YDQvtCy0LXRgNC60LAg0L7RgtCy0LXRgtCwINC90LAgSlNPTlxuXHQgKiBAcGFyYW0ganNvblN0cmluZ1xuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbnxhbnl9XG5cdCAqL1xuXHR0cnlQYXJzZUpTT04oanNvblN0cmluZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBvID0gSlNPTi5wYXJzZShqc29uU3RyaW5nKTtcblxuXHRcdFx0Ly8gSGFuZGxlIG5vbi1leGNlcHRpb24tdGhyb3dpbmcgY2FzZXM6XG5cdFx0XHQvLyBOZWl0aGVyIEpTT04ucGFyc2UoZmFsc2UpIG9yIEpTT04ucGFyc2UoMTIzNCkgdGhyb3cgZXJyb3JzLCBoZW5jZSB0aGUgdHlwZS1jaGVja2luZyxcblx0XHRcdC8vIGJ1dC4uLiBKU09OLnBhcnNlKG51bGwpIHJldHVybnMgbnVsbCwgYW5kIHR5cGVvZiBudWxsID09PSBcIm9iamVjdFwiLFxuXHRcdFx0Ly8gc28gd2UgbXVzdCBjaGVjayBmb3IgdGhhdCwgdG9vLiBUaGFua2Z1bGx5LCBudWxsIGlzIGZhbHNleSwgc28gdGhpcyBzdWZmaWNlczpcblx0XHRcdGlmIChvICYmIHR5cGVvZiBvID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvL1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0sXG59OyJdfQ==