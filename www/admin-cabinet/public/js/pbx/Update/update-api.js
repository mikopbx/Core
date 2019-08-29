"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
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
        PBXVER: globalPBXVersion,
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
//# sourceMappingURL=update-api.js.map