"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global Config, PbxApi, PbxApiClient */

/**
 * ModulesAPI - Modern v3 API client for module management operations
 *
 * Uses unified PbxApiClient for standard RESTful operations following Google API Design Guide patterns.
 * All custom methods follow the :methodName convention with automatic async channel header support.
 *
 * Standard CRUD operations available via PbxApiClient:
 * - getList(params, callback) - GET /pbxcore/api/v3/modules
 * - getRecord(id, callback) - GET /pbxcore/api/v3/modules/{id}
 * - saveRecord(data, callback) - POST/PUT /pbxcore/api/v3/modules[/{id}]
 * - deleteRecord(id, callback) - DELETE /pbxcore/api/v3/modules/{id}
 *
 * Custom methods (Google API Design Guide):
 * - getAvailable(callback) - GET /pbxcore/api/v3/modules:getAvailableModules
 * - getModuleInfo(params, callback) - GET /pbxcore/api/v3/modules/{id}:getModuleInfo
 * - installFromRepo(params, callback) - POST /pbxcore/api/v3/modules/{id}:installFromRepo
 * - installFromPackage(params, callback) - POST /pbxcore/api/v3/modules:installFromPackage
 * - enableModule(params, callback) - POST /pbxcore/api/v3/modules/{id}:enable
 * - disableModule(params, callback) - POST /pbxcore/api/v3/modules/{id}:disable
 * - uninstallModule(params, callback) - POST /pbxcore/api/v3/modules/{id}:uninstall
 * - updateAll(params, callback) - POST /pbxcore/api/v3/modules:updateAll
 *
 * @class ModulesAPI
 */
var ModulesAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/modules',
  customMethods: {
    getDefault: ':getDefault',
    getAvailableModules: ':getAvailableModules',
    getModuleInfo: ':getModuleInfo',
    getModuleLink: ':getModuleLink',
    installFromRepo: ':installFromRepo',
    installFromPackage: ':installFromPackage',
    enable: ':enable',
    disable: ':disable',
    uninstall: ':uninstall',
    updateAll: ':updateAll',
    startDownload: ':startDownload',
    getDownloadStatus: ':getDownloadStatus',
    getMetadataFromPackage: ':getMetadataFromPackage',
    getInstallationStatus: ':getInstallationStatus',
    getOperations: ':getOperations',
    getOperationStatus: ':getOperationStatus'
  }
});
/**
 * Retrieves available modules from MIKO repository
 * @param {function} callback - Callback function (response, success)
 */

ModulesAPI.getAvailable = function (callback) {
  this.callCustomMethod('getAvailableModules', function (response, success) {
    if (success && response.data) {
      callback(response.data, true);
    } else {
      callback(response, false);
    }
  }, undefined, 'GET');
};
/**
 * Installs a new module from a repository
 * @param {object} params - Installation parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} params.releaseId - Release ID to install
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */


ModulesAPI.installFromRepo = function (params, callback) {
  var requestData = {
    releaseId: params.releaseId || 0,
    asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient

  };
  this.callCustomMethod('installFromRepo', requestData, callback, 'POST', params.uniqid);
};
/**
 * Installs a new module from an uploaded zip archive
 * @param {object} params - Installation parameters
 * @param {string} params.filePath - Path to uploaded zip file
 * @param {string} params.fileId - File upload ID
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */


ModulesAPI.installFromPackage = function (params, callback) {
  var requestData = {
    filePath: params.filePath,
    fileId: params.fileId,
    asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient

  };
  this.callCustomMethod('installFromPackage', requestData, callback, 'POST');
};
/**
 * Enables an extension module
 * @param {object} params - Enable parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} [callback] - Optional callback function (response, success)
 */


ModulesAPI.enableModule = function (params, callback) {
  var requestData = {
    asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient

  };
  this.callCustomMethod('enable', requestData, callback, 'POST', params.uniqid);
};
/**
 * Disables an extension module
 * @param {object} params - Disable parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {string} [params.reason] - Disable reason
 * @param {string} [params.reasonText] - Disable reason text
 * @param {function} [callback] - Optional callback function (response, success)
 */


ModulesAPI.disableModule = function (params, callback) {
  var requestData = {
    asyncChannelId: params.channelId,
    // Will be auto-extracted to header by PbxApiClient
    reason: params.reason || '',
    reasonText: params.reasonText || ''
  };
  this.callCustomMethod('disable', requestData, callback, 'POST', params.uniqid);
};
/**
 * Uninstalls an extension module
 * @param {object} params - Uninstall parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {boolean} [params.keepSettings=false] - Keep module settings
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */


ModulesAPI.uninstallModule = function (params, callback) {
  var requestData = {
    keepSettings: params.keepSettings || false,
    asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient

  };
  this.callCustomMethod('uninstall', requestData, callback, 'POST', params.uniqid);
};
/**
 * Retrieves module information from the repository
 * @param {object} params - Module info parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {function} callback - Callback function (data, success)
 */


ModulesAPI.getModuleInfo = function (params, callback) {
  this.callCustomMethod('getModuleInfo', {}, function (response, success) {
    if (success && response.data) {
      callback(response.data, true);
    } else {
      callback(response, false);
    }
  }, 'GET', params.uniqid);
};
/**
 * Updates all installed modules
 * @param {object} params - Update parameters
 * @param {array} params.modulesForUpdate - Array of module IDs to update
 * @param {string} params.channelId - Async channel ID (auto-added to header)
 * @param {function} callback - Callback function (response, success)
 */


ModulesAPI.updateAll = function (params, callback) {
  var requestData = {
    modulesForUpdate: params.modulesForUpdate,
    asyncChannelId: params.channelId // Will be auto-extracted to header by PbxApiClient

  };
  this.callCustomMethod('updateAll', requestData, callback, 'POST');
};
/**
 * Retrieves module operations journal: active operations plus recent history.
 * Used to restore progress bars and button locks after a page reload.
 * @param {object} params - Query parameters
 * @param {string} [params.moduleUniqueId] - Filter by module unique ID
 * @param {number} [params.limit] - History size limit
 * @param {function} callback - Callback function (data, success)
 */


ModulesAPI.getOperations = function (params, callback) {
  var requestData = {};

  if (params.moduleUniqueId) {
    requestData.moduleUniqueId = params.moduleUniqueId;
  }

  if (params.limit) {
    requestData.limit = params.limit;
  }

  this.callCustomMethod('getOperations', requestData, function (response, success) {
    if (success && response.data) {
      callback(response.data, true);
    } else {
      callback(response, false);
    }
  }, 'GET');
};
/**
 * Retrieves the status of the current or last operation for a module.
 * Polling fallback when nchan progress messages are lost.
 * @param {object} params - Query parameters
 * @param {string} params.uniqid - Module unique ID
 * @param {string} [params.operationId] - Specific operation ID
 * @param {function} callback - Callback function (data, success)
 */


ModulesAPI.getOperationStatus = function (params, callback) {
  var requestData = {};

  if (params.operationId) {
    requestData.operationId = params.operationId;
  }

  this.callCustomMethod('getOperationStatus', requestData, function (response, success) {
    if (success && response.data) {
      callback(response.data, true);
    } else {
      callback(response, false);
    }
  }, 'GET', params.uniqid);
};
/**
 * Creates a watchdog for a long-running module operation.
 *
 * Primary progress transport is nchan (EventBus); the watchdog is the fallback:
 * while events keep arriving it stays silent, but after `silenceMs` without a
 * single event it starts polling the operations journal every `pollIntervalMs`
 * and fires `onTerminal` when the journal reaches a terminal state — so a lost
 * WebSocket message can no longer freeze the UI forever. `onStalled` fires
 * when there is no activity from any source for `maxStallMs`.
 *
 * The baseline trick: right after start() the current journal record is read;
 * a terminal record seen at that moment belongs to a PREVIOUS operation and
 * its operationId becomes the baseline. Only a terminal record with a
 * different operationId is treated as the result of the new operation.
 *
 * @param {object} options
 * @param {function} options.onTerminal - Called once with the journal record when the operation finishes
 * @param {function} options.onStalled - Called once when no activity happens for maxStallMs
 * @param {number} [options.silenceMs=15000] - Event silence before polling starts
 * @param {number} [options.pollIntervalMs=5000] - Poll period
 * @param {number} [options.maxStallMs=180000] - No-activity limit before onStalled
 * @returns {{start: function, notifyEvent: function, stop: function, isRunning: function}}
 */


ModulesAPI.createOperationWatchdog = function (options) {
  var settings = _objectSpread({
    silenceMs: 15000,
    pollIntervalMs: 5000,
    maxStallMs: 180000,
    onTerminal: function onTerminal() {},
    onStalled: function onStalled() {}
  }, options); // Mirrors idPattern of the modules REST route: tracking ids that do not
  // match it (upload fileIds) cannot be used as a resource id in the URL.


  var RESOURCE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/; // A terminal record younger than this at baseline time may already be the
  // result of the operation being started — do not use it as the baseline.

  var FRESH_TERMINAL_SEC = 10;
  var state = {
    timer: null,
    epoch: 0,
    uniqid: '',
    operationId: '',
    baselineOperationId: '',
    baselineResolved: false,
    lastActivityAt: 0,
    lastProgress: -1,
    lastHeartbeatAt: 0,
    pollBusy: false
  };

  var stop = function stop() {
    if (state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }

    state.epoch += 1; // invalidate every in-flight callback
  };

  var finishTerminal = function finishTerminal(data) {
    stop();
    settings.onTerminal(data);
  };

  var checkStall = function checkStall() {
    if (Date.now() - state.lastActivityAt > settings.maxStallMs) {
      stop();
      settings.onStalled();
    }
  };
  /**
   * Decides whether a terminal journal record is the result of OUR operation.
   * Accepted when its operationId was captured from nchan messages, or when
   * the baseline is resolved and the record differs from it.
   */


  var isOurTerminal = function isOurTerminal(data) {
    if (data.operationId && data.operationId === state.operationId) {
      return true;
    }

    return state.baselineResolved && data.operationId !== state.baselineOperationId;
  };

  var handleStatus = function handleStatus(epoch, data, success) {
    if (epoch !== state.epoch) {
      return; // response of a previous watch or arrived after stop()
    }

    state.pollBusy = false;

    if (!success || !data || !data.state || data.state === 'none') {
      checkStall();
      return;
    }

    if (data.terminal === true) {
      if (isOurTerminal(data)) {
        finishTerminal(data);
      } else {
        // Previous operation's record — ours is not visible yet
        checkStall();
      }

      return;
    } // Active operation


    if (data.operationId && data.operationId !== state.baselineOperationId) {
      state.operationId = data.operationId;
    } // Server-side liveness: a moving heartbeat or progress counts as
    // activity; a record flagged stale is presumed dead and must NOT
    // postpone the stall verdict.


    var moved = data.heartbeatAt !== state.lastHeartbeatAt || data.progress !== state.lastProgress;
    state.lastHeartbeatAt = data.heartbeatAt;
    state.lastProgress = data.progress;

    if (moved && data.stale !== true) {
      state.lastActivityAt = Date.now();
    }

    checkStall();
  };

  var resolveBaseline = function resolveBaseline() {
    if (!RESOURCE_ID_PATTERN.test(state.uniqid)) {
      // No resource id to query: rely on operationId capture from nchan
      state.baselineResolved = true;
      return;
    }

    var epoch = state.epoch;
    ModulesAPI.getOperationStatus({
      uniqid: state.uniqid
    }, function (data, success) {
      if (epoch !== state.epoch || state.baselineResolved) {
        return;
      }

      if (!success || !data) {
        return; // retried from tick() until it succeeds
      }

      if (data.terminal === true && data.operationId) {
        var ageSec = Math.floor(Date.now() / 1000) - (data.finishedAt || 0); // A just-finished record may already be our own result (fast
        // enable completed before this request landed) — leave the
        // baseline empty so such a record is accepted as ours.

        state.baselineOperationId = ageSec > FRESH_TERMINAL_SEC ? data.operationId : '';
      }

      state.baselineResolved = true;
    });
  };

  var poll = function poll() {
    if (state.pollBusy) {
      return;
    }

    state.pollBusy = true;
    var epoch = state.epoch;

    if (RESOURCE_ID_PATTERN.test(state.uniqid)) {
      ModulesAPI.getOperationStatus({
        uniqid: state.uniqid,
        operationId: state.operationId
      }, function (data, success) {
        return handleStatus(epoch, data, success);
      });
    } else {
      // Upload fileId flow: query the collection and match by the
      // operationId captured from nchan messages.
      ModulesAPI.getOperations({}, function (data, success) {
        if (!success || !data) {
          handleStatus(epoch, null, false);
          return;
        }

        var all = (data.active || []).concat(data.recent || []);
        var match = null;

        if (state.operationId) {
          match = all.find(function (op) {
            return op.operationId === state.operationId;
          }) || null;
        } else {
          match = (data.active || []).find(function (op) {
            return op.stale !== true;
          }) || null;
        }

        handleStatus(epoch, match || {
          state: 'none'
        }, true);
      });
    }
  };

  var tick = function tick() {
    if (!state.baselineResolved) {
      resolveBaseline(); // keep retrying after a failed first attempt
    }

    if (Date.now() - state.lastActivityAt < settings.silenceMs) {
      return; // events are flowing, no need to poll
    }

    poll();
  };

  return {
    /**
     * Starts watching an operation for the given module (or upload fileId).
     * @param {string} uniqid
     */
    start: function start(uniqid) {
      stop();
      state.uniqid = uniqid || '';
      state.operationId = '';
      state.baselineOperationId = '';
      state.baselineResolved = false;
      state.lastActivityAt = Date.now();
      state.lastProgress = -1;
      state.lastHeartbeatAt = 0;
      state.pollBusy = false;
      resolveBaseline();
      state.timer = setInterval(tick, settings.pollIntervalMs);
    },

    /**
     * Marks nchan activity and captures the operationId of OUR operation.
     * Events of other operations flowing through the shared channel are
     * ignored: they must neither postpone polling nor re-key the watch.
     * @param {object} response - The EventBus message
     */
    notifyEvent: function notifyEvent(response) {
      if (!response) {
        return;
      }

      var sameOperation = response.operationId !== undefined && response.operationId === state.operationId;
      var sameModule = response.moduleUniqueId !== undefined && response.moduleUniqueId === state.uniqid;

      if (!sameOperation && !sameModule) {
        return;
      }

      state.lastActivityAt = Date.now();

      if (state.operationId === '' && response.operationId) {
        state.operationId = response.operationId;
      }
    },
    stop: stop,
    isRunning: function isRunning() {
      return state.timer !== null;
    }
  };
}; // Export for use in other modules


window.ModulesAPI = ModulesAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbW9kdWxlcy1hcGkuanMiXSwibmFtZXMiOlsiTW9kdWxlc0FQSSIsIlBieEFwaUNsaWVudCIsImVuZHBvaW50IiwiY3VzdG9tTWV0aG9kcyIsImdldERlZmF1bHQiLCJnZXRBdmFpbGFibGVNb2R1bGVzIiwiZ2V0TW9kdWxlSW5mbyIsImdldE1vZHVsZUxpbmsiLCJpbnN0YWxsRnJvbVJlcG8iLCJpbnN0YWxsRnJvbVBhY2thZ2UiLCJlbmFibGUiLCJkaXNhYmxlIiwidW5pbnN0YWxsIiwidXBkYXRlQWxsIiwic3RhcnREb3dubG9hZCIsImdldERvd25sb2FkU3RhdHVzIiwiZ2V0TWV0YWRhdGFGcm9tUGFja2FnZSIsImdldEluc3RhbGxhdGlvblN0YXR1cyIsImdldE9wZXJhdGlvbnMiLCJnZXRPcGVyYXRpb25TdGF0dXMiLCJnZXRBdmFpbGFibGUiLCJjYWxsYmFjayIsImNhbGxDdXN0b21NZXRob2QiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJkYXRhIiwidW5kZWZpbmVkIiwicGFyYW1zIiwicmVxdWVzdERhdGEiLCJyZWxlYXNlSWQiLCJhc3luY0NoYW5uZWxJZCIsImNoYW5uZWxJZCIsInVuaXFpZCIsImZpbGVQYXRoIiwiZmlsZUlkIiwiZW5hYmxlTW9kdWxlIiwiZGlzYWJsZU1vZHVsZSIsInJlYXNvbiIsInJlYXNvblRleHQiLCJ1bmluc3RhbGxNb2R1bGUiLCJrZWVwU2V0dGluZ3MiLCJtb2R1bGVzRm9yVXBkYXRlIiwibW9kdWxlVW5pcXVlSWQiLCJsaW1pdCIsIm9wZXJhdGlvbklkIiwiY3JlYXRlT3BlcmF0aW9uV2F0Y2hkb2ciLCJvcHRpb25zIiwic2V0dGluZ3MiLCJzaWxlbmNlTXMiLCJwb2xsSW50ZXJ2YWxNcyIsIm1heFN0YWxsTXMiLCJvblRlcm1pbmFsIiwib25TdGFsbGVkIiwiUkVTT1VSQ0VfSURfUEFUVEVSTiIsIkZSRVNIX1RFUk1JTkFMX1NFQyIsInN0YXRlIiwidGltZXIiLCJlcG9jaCIsImJhc2VsaW5lT3BlcmF0aW9uSWQiLCJiYXNlbGluZVJlc29sdmVkIiwibGFzdEFjdGl2aXR5QXQiLCJsYXN0UHJvZ3Jlc3MiLCJsYXN0SGVhcnRiZWF0QXQiLCJwb2xsQnVzeSIsInN0b3AiLCJjbGVhckludGVydmFsIiwiZmluaXNoVGVybWluYWwiLCJjaGVja1N0YWxsIiwiRGF0ZSIsIm5vdyIsImlzT3VyVGVybWluYWwiLCJoYW5kbGVTdGF0dXMiLCJ0ZXJtaW5hbCIsIm1vdmVkIiwiaGVhcnRiZWF0QXQiLCJwcm9ncmVzcyIsInN0YWxlIiwicmVzb2x2ZUJhc2VsaW5lIiwidGVzdCIsImFnZVNlYyIsIk1hdGgiLCJmbG9vciIsImZpbmlzaGVkQXQiLCJwb2xsIiwiYWxsIiwiYWN0aXZlIiwiY29uY2F0IiwicmVjZW50IiwibWF0Y2giLCJmaW5kIiwib3AiLCJ0aWNrIiwic3RhcnQiLCJzZXRJbnRlcnZhbCIsIm5vdGlmeUV2ZW50Iiwic2FtZU9wZXJhdGlvbiIsInNhbWVNb2R1bGUiLCJpc1J1bm5pbmciLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUcsSUFBSUMsWUFBSixDQUFpQjtBQUNoQ0MsRUFBQUEsUUFBUSxFQUFFLHlCQURzQjtBQUVoQ0MsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFVBQVUsRUFBRSxhQUREO0FBRVhDLElBQUFBLG1CQUFtQixFQUFFLHNCQUZWO0FBR1hDLElBQUFBLGFBQWEsRUFBRSxnQkFISjtBQUlYQyxJQUFBQSxhQUFhLEVBQUUsZ0JBSko7QUFLWEMsSUFBQUEsZUFBZSxFQUFFLGtCQUxOO0FBTVhDLElBQUFBLGtCQUFrQixFQUFFLHFCQU5UO0FBT1hDLElBQUFBLE1BQU0sRUFBRSxTQVBHO0FBUVhDLElBQUFBLE9BQU8sRUFBRSxVQVJFO0FBU1hDLElBQUFBLFNBQVMsRUFBRSxZQVRBO0FBVVhDLElBQUFBLFNBQVMsRUFBRSxZQVZBO0FBV1hDLElBQUFBLGFBQWEsRUFBRSxnQkFYSjtBQVlYQyxJQUFBQSxpQkFBaUIsRUFBRSxvQkFaUjtBQWFYQyxJQUFBQSxzQkFBc0IsRUFBRSx5QkFiYjtBQWNYQyxJQUFBQSxxQkFBcUIsRUFBRSx3QkFkWjtBQWVYQyxJQUFBQSxhQUFhLEVBQUUsZ0JBZko7QUFnQlhDLElBQUFBLGtCQUFrQixFQUFFO0FBaEJUO0FBRmlCLENBQWpCLENBQW5CO0FBc0JBO0FBQ0E7QUFDQTtBQUNBOztBQUNBbkIsVUFBVSxDQUFDb0IsWUFBWCxHQUEwQixVQUFTQyxRQUFULEVBQW1CO0FBQ3pDLE9BQUtDLGdCQUFMLENBQXNCLHFCQUF0QixFQUE2QyxVQUFDQyxRQUFELEVBQVdDLE9BQVgsRUFBdUI7QUFDaEUsUUFBSUEsT0FBTyxJQUFJRCxRQUFRLENBQUNFLElBQXhCLEVBQThCO0FBQzFCSixNQUFBQSxRQUFRLENBQUNFLFFBQVEsQ0FBQ0UsSUFBVixFQUFnQixJQUFoQixDQUFSO0FBQ0gsS0FGRCxNQUVPO0FBQ0hKLE1BQUFBLFFBQVEsQ0FBQ0UsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNIO0FBQ0osR0FORCxFQU1HRyxTQU5ILEVBTWMsS0FOZDtBQU9ILENBUkQ7QUFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFCLFVBQVUsQ0FBQ1EsZUFBWCxHQUE2QixVQUFTbUIsTUFBVCxFQUFpQk4sUUFBakIsRUFBMkI7QUFDcEQsTUFBTU8sV0FBVyxHQUFHO0FBQ2hCQyxJQUFBQSxTQUFTLEVBQUVGLE1BQU0sQ0FBQ0UsU0FBUCxJQUFvQixDQURmO0FBRWhCQyxJQUFBQSxjQUFjLEVBQUVILE1BQU0sQ0FBQ0ksU0FGUCxDQUVpQjs7QUFGakIsR0FBcEI7QUFLQSxPQUFLVCxnQkFBTCxDQUFzQixpQkFBdEIsRUFBeUNNLFdBQXpDLEVBQXNEUCxRQUF0RCxFQUFnRSxNQUFoRSxFQUF3RU0sTUFBTSxDQUFDSyxNQUEvRTtBQUNILENBUEQ7QUFTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWhDLFVBQVUsQ0FBQ1Msa0JBQVgsR0FBZ0MsVUFBU2tCLE1BQVQsRUFBaUJOLFFBQWpCLEVBQTJCO0FBQ3ZELE1BQU1PLFdBQVcsR0FBRztBQUNoQkssSUFBQUEsUUFBUSxFQUFFTixNQUFNLENBQUNNLFFBREQ7QUFFaEJDLElBQUFBLE1BQU0sRUFBRVAsTUFBTSxDQUFDTyxNQUZDO0FBR2hCSixJQUFBQSxjQUFjLEVBQUVILE1BQU0sQ0FBQ0ksU0FIUCxDQUdpQjs7QUFIakIsR0FBcEI7QUFNQSxPQUFLVCxnQkFBTCxDQUFzQixvQkFBdEIsRUFBNENNLFdBQTVDLEVBQXlEUCxRQUF6RCxFQUFtRSxNQUFuRTtBQUNILENBUkQ7QUFVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FyQixVQUFVLENBQUNtQyxZQUFYLEdBQTBCLFVBQVNSLE1BQVQsRUFBaUJOLFFBQWpCLEVBQTJCO0FBQ2pELE1BQU1PLFdBQVcsR0FBRztBQUNoQkUsSUFBQUEsY0FBYyxFQUFFSCxNQUFNLENBQUNJLFNBRFAsQ0FDaUI7O0FBRGpCLEdBQXBCO0FBSUEsT0FBS1QsZ0JBQUwsQ0FBc0IsUUFBdEIsRUFBZ0NNLFdBQWhDLEVBQTZDUCxRQUE3QyxFQUF1RCxNQUF2RCxFQUErRE0sTUFBTSxDQUFDSyxNQUF0RTtBQUNILENBTkQ7QUFRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBaEMsVUFBVSxDQUFDb0MsYUFBWCxHQUEyQixVQUFTVCxNQUFULEVBQWlCTixRQUFqQixFQUEyQjtBQUNsRCxNQUFNTyxXQUFXLEdBQUc7QUFDaEJFLElBQUFBLGNBQWMsRUFBRUgsTUFBTSxDQUFDSSxTQURQO0FBQ2tCO0FBQ2xDTSxJQUFBQSxNQUFNLEVBQUVWLE1BQU0sQ0FBQ1UsTUFBUCxJQUFpQixFQUZUO0FBR2hCQyxJQUFBQSxVQUFVLEVBQUVYLE1BQU0sQ0FBQ1csVUFBUCxJQUFxQjtBQUhqQixHQUFwQjtBQU1BLE9BQUtoQixnQkFBTCxDQUFzQixTQUF0QixFQUFpQ00sV0FBakMsRUFBOENQLFFBQTlDLEVBQXdELE1BQXhELEVBQWdFTSxNQUFNLENBQUNLLE1BQXZFO0FBQ0gsQ0FSRDtBQVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBaEMsVUFBVSxDQUFDdUMsZUFBWCxHQUE2QixVQUFTWixNQUFULEVBQWlCTixRQUFqQixFQUEyQjtBQUNwRCxNQUFNTyxXQUFXLEdBQUc7QUFDaEJZLElBQUFBLFlBQVksRUFBRWIsTUFBTSxDQUFDYSxZQUFQLElBQXVCLEtBRHJCO0FBRWhCVixJQUFBQSxjQUFjLEVBQUVILE1BQU0sQ0FBQ0ksU0FGUCxDQUVpQjs7QUFGakIsR0FBcEI7QUFLQSxPQUFLVCxnQkFBTCxDQUFzQixXQUF0QixFQUFtQ00sV0FBbkMsRUFBZ0RQLFFBQWhELEVBQTBELE1BQTFELEVBQWtFTSxNQUFNLENBQUNLLE1BQXpFO0FBQ0gsQ0FQRDtBQVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0FoQyxVQUFVLENBQUNNLGFBQVgsR0FBMkIsVUFBU3FCLE1BQVQsRUFBaUJOLFFBQWpCLEVBQTJCO0FBQ2xELE9BQUtDLGdCQUFMLENBQXNCLGVBQXRCLEVBQXVDLEVBQXZDLEVBQTJDLFVBQUNDLFFBQUQsRUFBV0MsT0FBWCxFQUF1QjtBQUM5RCxRQUFJQSxPQUFPLElBQUlELFFBQVEsQ0FBQ0UsSUFBeEIsRUFBOEI7QUFDMUJKLE1BQUFBLFFBQVEsQ0FBQ0UsUUFBUSxDQUFDRSxJQUFWLEVBQWdCLElBQWhCLENBQVI7QUFDSCxLQUZELE1BRU87QUFDSEosTUFBQUEsUUFBUSxDQUFDRSxRQUFELEVBQVcsS0FBWCxDQUFSO0FBQ0g7QUFDSixHQU5ELEVBTUcsS0FOSCxFQU1VSSxNQUFNLENBQUNLLE1BTmpCO0FBT0gsQ0FSRDtBQVVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWhDLFVBQVUsQ0FBQ2EsU0FBWCxHQUF1QixVQUFTYyxNQUFULEVBQWlCTixRQUFqQixFQUEyQjtBQUM5QyxNQUFNTyxXQUFXLEdBQUc7QUFDaEJhLElBQUFBLGdCQUFnQixFQUFFZCxNQUFNLENBQUNjLGdCQURUO0FBRWhCWCxJQUFBQSxjQUFjLEVBQUVILE1BQU0sQ0FBQ0ksU0FGUCxDQUVpQjs7QUFGakIsR0FBcEI7QUFLQSxPQUFLVCxnQkFBTCxDQUFzQixXQUF0QixFQUFtQ00sV0FBbkMsRUFBZ0RQLFFBQWhELEVBQTBELE1BQTFEO0FBQ0gsQ0FQRDtBQVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBckIsVUFBVSxDQUFDa0IsYUFBWCxHQUEyQixVQUFTUyxNQUFULEVBQWlCTixRQUFqQixFQUEyQjtBQUNsRCxNQUFNTyxXQUFXLEdBQUcsRUFBcEI7O0FBQ0EsTUFBSUQsTUFBTSxDQUFDZSxjQUFYLEVBQTJCO0FBQ3ZCZCxJQUFBQSxXQUFXLENBQUNjLGNBQVosR0FBNkJmLE1BQU0sQ0FBQ2UsY0FBcEM7QUFDSDs7QUFDRCxNQUFJZixNQUFNLENBQUNnQixLQUFYLEVBQWtCO0FBQ2RmLElBQUFBLFdBQVcsQ0FBQ2UsS0FBWixHQUFvQmhCLE1BQU0sQ0FBQ2dCLEtBQTNCO0FBQ0g7O0FBQ0QsT0FBS3JCLGdCQUFMLENBQXNCLGVBQXRCLEVBQXVDTSxXQUF2QyxFQUFvRCxVQUFDTCxRQUFELEVBQVdDLE9BQVgsRUFBdUI7QUFDdkUsUUFBSUEsT0FBTyxJQUFJRCxRQUFRLENBQUNFLElBQXhCLEVBQThCO0FBQzFCSixNQUFBQSxRQUFRLENBQUNFLFFBQVEsQ0FBQ0UsSUFBVixFQUFnQixJQUFoQixDQUFSO0FBQ0gsS0FGRCxNQUVPO0FBQ0hKLE1BQUFBLFFBQVEsQ0FBQ0UsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNIO0FBQ0osR0FORCxFQU1HLEtBTkg7QUFPSCxDQWZEO0FBaUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBdkIsVUFBVSxDQUFDbUIsa0JBQVgsR0FBZ0MsVUFBU1EsTUFBVCxFQUFpQk4sUUFBakIsRUFBMkI7QUFDdkQsTUFBTU8sV0FBVyxHQUFHLEVBQXBCOztBQUNBLE1BQUlELE1BQU0sQ0FBQ2lCLFdBQVgsRUFBd0I7QUFDcEJoQixJQUFBQSxXQUFXLENBQUNnQixXQUFaLEdBQTBCakIsTUFBTSxDQUFDaUIsV0FBakM7QUFDSDs7QUFDRCxPQUFLdEIsZ0JBQUwsQ0FBc0Isb0JBQXRCLEVBQTRDTSxXQUE1QyxFQUF5RCxVQUFDTCxRQUFELEVBQVdDLE9BQVgsRUFBdUI7QUFDNUUsUUFBSUEsT0FBTyxJQUFJRCxRQUFRLENBQUNFLElBQXhCLEVBQThCO0FBQzFCSixNQUFBQSxRQUFRLENBQUNFLFFBQVEsQ0FBQ0UsSUFBVixFQUFnQixJQUFoQixDQUFSO0FBQ0gsS0FGRCxNQUVPO0FBQ0hKLE1BQUFBLFFBQVEsQ0FBQ0UsUUFBRCxFQUFXLEtBQVgsQ0FBUjtBQUNIO0FBQ0osR0FORCxFQU1HLEtBTkgsRUFNVUksTUFBTSxDQUFDSyxNQU5qQjtBQU9ILENBWkQ7QUFjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQWhDLFVBQVUsQ0FBQzZDLHVCQUFYLEdBQXFDLFVBQVNDLE9BQVQsRUFBa0I7QUFDbkQsTUFBTUMsUUFBUTtBQUNWQyxJQUFBQSxTQUFTLEVBQUUsS0FERDtBQUVWQyxJQUFBQSxjQUFjLEVBQUUsSUFGTjtBQUdWQyxJQUFBQSxVQUFVLEVBQUUsTUFIRjtBQUlWQyxJQUFBQSxVQUFVLEVBQUUsc0JBQU0sQ0FBRSxDQUpWO0FBS1ZDLElBQUFBLFNBQVMsRUFBRSxxQkFBTSxDQUFFO0FBTFQsS0FNUE4sT0FOTyxDQUFkLENBRG1ELENBVW5EO0FBQ0E7OztBQUNBLE1BQU1PLG1CQUFtQixHQUFHLHdCQUE1QixDQVptRCxDQWNuRDtBQUNBOztBQUNBLE1BQU1DLGtCQUFrQixHQUFHLEVBQTNCO0FBRUEsTUFBTUMsS0FBSyxHQUFHO0FBQ1ZDLElBQUFBLEtBQUssRUFBRSxJQURHO0FBRVZDLElBQUFBLEtBQUssRUFBRSxDQUZHO0FBR1Z6QixJQUFBQSxNQUFNLEVBQUUsRUFIRTtBQUlWWSxJQUFBQSxXQUFXLEVBQUUsRUFKSDtBQUtWYyxJQUFBQSxtQkFBbUIsRUFBRSxFQUxYO0FBTVZDLElBQUFBLGdCQUFnQixFQUFFLEtBTlI7QUFPVkMsSUFBQUEsY0FBYyxFQUFFLENBUE47QUFRVkMsSUFBQUEsWUFBWSxFQUFFLENBQUMsQ0FSTDtBQVNWQyxJQUFBQSxlQUFlLEVBQUUsQ0FUUDtBQVVWQyxJQUFBQSxRQUFRLEVBQUU7QUFWQSxHQUFkOztBQWFBLE1BQU1DLElBQUksR0FBRyxTQUFQQSxJQUFPLEdBQU07QUFDZixRQUFJVCxLQUFLLENBQUNDLEtBQU4sS0FBZ0IsSUFBcEIsRUFBMEI7QUFDdEJTLE1BQUFBLGFBQWEsQ0FBQ1YsS0FBSyxDQUFDQyxLQUFQLENBQWI7QUFDQUQsTUFBQUEsS0FBSyxDQUFDQyxLQUFOLEdBQWMsSUFBZDtBQUNIOztBQUNERCxJQUFBQSxLQUFLLENBQUNFLEtBQU4sSUFBZSxDQUFmLENBTGUsQ0FLRztBQUNyQixHQU5EOztBQVFBLE1BQU1TLGNBQWMsR0FBRyxTQUFqQkEsY0FBaUIsQ0FBQ3pDLElBQUQsRUFBVTtBQUM3QnVDLElBQUFBLElBQUk7QUFDSmpCLElBQUFBLFFBQVEsQ0FBQ0ksVUFBVCxDQUFvQjFCLElBQXBCO0FBQ0gsR0FIRDs7QUFLQSxNQUFNMEMsVUFBVSxHQUFHLFNBQWJBLFVBQWEsR0FBTTtBQUNyQixRQUFJQyxJQUFJLENBQUNDLEdBQUwsS0FBYWQsS0FBSyxDQUFDSyxjQUFuQixHQUFvQ2IsUUFBUSxDQUFDRyxVQUFqRCxFQUE2RDtBQUN6RGMsTUFBQUEsSUFBSTtBQUNKakIsTUFBQUEsUUFBUSxDQUFDSyxTQUFUO0FBQ0g7QUFDSixHQUxEO0FBT0E7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0ksTUFBTWtCLGFBQWEsR0FBRyxTQUFoQkEsYUFBZ0IsQ0FBQzdDLElBQUQsRUFBVTtBQUM1QixRQUFJQSxJQUFJLENBQUNtQixXQUFMLElBQW9CbkIsSUFBSSxDQUFDbUIsV0FBTCxLQUFxQlcsS0FBSyxDQUFDWCxXQUFuRCxFQUFnRTtBQUM1RCxhQUFPLElBQVA7QUFDSDs7QUFDRCxXQUFPVyxLQUFLLENBQUNJLGdCQUFOLElBQTBCbEMsSUFBSSxDQUFDbUIsV0FBTCxLQUFxQlcsS0FBSyxDQUFDRyxtQkFBNUQ7QUFDSCxHQUxEOztBQU9BLE1BQU1hLFlBQVksR0FBRyxTQUFmQSxZQUFlLENBQUNkLEtBQUQsRUFBUWhDLElBQVIsRUFBY0QsT0FBZCxFQUEwQjtBQUMzQyxRQUFJaUMsS0FBSyxLQUFLRixLQUFLLENBQUNFLEtBQXBCLEVBQTJCO0FBQ3ZCLGFBRHVCLENBQ2Y7QUFDWDs7QUFDREYsSUFBQUEsS0FBSyxDQUFDUSxRQUFOLEdBQWlCLEtBQWpCOztBQUNBLFFBQUksQ0FBQ3ZDLE9BQUQsSUFBWSxDQUFDQyxJQUFiLElBQXFCLENBQUNBLElBQUksQ0FBQzhCLEtBQTNCLElBQW9DOUIsSUFBSSxDQUFDOEIsS0FBTCxLQUFlLE1BQXZELEVBQStEO0FBQzNEWSxNQUFBQSxVQUFVO0FBQ1Y7QUFDSDs7QUFDRCxRQUFJMUMsSUFBSSxDQUFDK0MsUUFBTCxLQUFrQixJQUF0QixFQUE0QjtBQUN4QixVQUFJRixhQUFhLENBQUM3QyxJQUFELENBQWpCLEVBQXlCO0FBQ3JCeUMsUUFBQUEsY0FBYyxDQUFDekMsSUFBRCxDQUFkO0FBQ0gsT0FGRCxNQUVPO0FBQ0g7QUFDQTBDLFFBQUFBLFVBQVU7QUFDYjs7QUFDRDtBQUNILEtBakIwQyxDQWtCM0M7OztBQUNBLFFBQUkxQyxJQUFJLENBQUNtQixXQUFMLElBQW9CbkIsSUFBSSxDQUFDbUIsV0FBTCxLQUFxQlcsS0FBSyxDQUFDRyxtQkFBbkQsRUFBd0U7QUFDcEVILE1BQUFBLEtBQUssQ0FBQ1gsV0FBTixHQUFvQm5CLElBQUksQ0FBQ21CLFdBQXpCO0FBQ0gsS0FyQjBDLENBc0IzQztBQUNBO0FBQ0E7OztBQUNBLFFBQU02QixLQUFLLEdBQUdoRCxJQUFJLENBQUNpRCxXQUFMLEtBQXFCbkIsS0FBSyxDQUFDTyxlQUEzQixJQUE4Q3JDLElBQUksQ0FBQ2tELFFBQUwsS0FBa0JwQixLQUFLLENBQUNNLFlBQXBGO0FBQ0FOLElBQUFBLEtBQUssQ0FBQ08sZUFBTixHQUF3QnJDLElBQUksQ0FBQ2lELFdBQTdCO0FBQ0FuQixJQUFBQSxLQUFLLENBQUNNLFlBQU4sR0FBcUJwQyxJQUFJLENBQUNrRCxRQUExQjs7QUFDQSxRQUFJRixLQUFLLElBQUloRCxJQUFJLENBQUNtRCxLQUFMLEtBQWUsSUFBNUIsRUFBa0M7QUFDOUJyQixNQUFBQSxLQUFLLENBQUNLLGNBQU4sR0FBdUJRLElBQUksQ0FBQ0MsR0FBTCxFQUF2QjtBQUNIOztBQUNERixJQUFBQSxVQUFVO0FBQ2IsR0FoQ0Q7O0FBa0NBLE1BQU1VLGVBQWUsR0FBRyxTQUFsQkEsZUFBa0IsR0FBTTtBQUMxQixRQUFJLENBQUN4QixtQkFBbUIsQ0FBQ3lCLElBQXBCLENBQXlCdkIsS0FBSyxDQUFDdkIsTUFBL0IsQ0FBTCxFQUE2QztBQUN6QztBQUNBdUIsTUFBQUEsS0FBSyxDQUFDSSxnQkFBTixHQUF5QixJQUF6QjtBQUNBO0FBQ0g7O0FBQ0QsUUFBTUYsS0FBSyxHQUFHRixLQUFLLENBQUNFLEtBQXBCO0FBQ0F6RCxJQUFBQSxVQUFVLENBQUNtQixrQkFBWCxDQUE4QjtBQUFFYSxNQUFBQSxNQUFNLEVBQUV1QixLQUFLLENBQUN2QjtBQUFoQixLQUE5QixFQUF3RCxVQUFDUCxJQUFELEVBQU9ELE9BQVAsRUFBbUI7QUFDdkUsVUFBSWlDLEtBQUssS0FBS0YsS0FBSyxDQUFDRSxLQUFoQixJQUF5QkYsS0FBSyxDQUFDSSxnQkFBbkMsRUFBcUQ7QUFDakQ7QUFDSDs7QUFDRCxVQUFJLENBQUNuQyxPQUFELElBQVksQ0FBQ0MsSUFBakIsRUFBdUI7QUFDbkIsZUFEbUIsQ0FDWDtBQUNYOztBQUNELFVBQUlBLElBQUksQ0FBQytDLFFBQUwsS0FBa0IsSUFBbEIsSUFBMEIvQyxJQUFJLENBQUNtQixXQUFuQyxFQUFnRDtBQUM1QyxZQUFNbUMsTUFBTSxHQUFHQyxJQUFJLENBQUNDLEtBQUwsQ0FBV2IsSUFBSSxDQUFDQyxHQUFMLEtBQWEsSUFBeEIsS0FBaUM1QyxJQUFJLENBQUN5RCxVQUFMLElBQW1CLENBQXBELENBQWYsQ0FENEMsQ0FFNUM7QUFDQTtBQUNBOztBQUNBM0IsUUFBQUEsS0FBSyxDQUFDRyxtQkFBTixHQUE0QnFCLE1BQU0sR0FBR3pCLGtCQUFULEdBQThCN0IsSUFBSSxDQUFDbUIsV0FBbkMsR0FBaUQsRUFBN0U7QUFDSDs7QUFDRFcsTUFBQUEsS0FBSyxDQUFDSSxnQkFBTixHQUF5QixJQUF6QjtBQUNILEtBZkQ7QUFnQkgsR0F2QkQ7O0FBeUJBLE1BQU13QixJQUFJLEdBQUcsU0FBUEEsSUFBTyxHQUFNO0FBQ2YsUUFBSTVCLEtBQUssQ0FBQ1EsUUFBVixFQUFvQjtBQUNoQjtBQUNIOztBQUNEUixJQUFBQSxLQUFLLENBQUNRLFFBQU4sR0FBaUIsSUFBakI7QUFDQSxRQUFNTixLQUFLLEdBQUdGLEtBQUssQ0FBQ0UsS0FBcEI7O0FBQ0EsUUFBSUosbUJBQW1CLENBQUN5QixJQUFwQixDQUF5QnZCLEtBQUssQ0FBQ3ZCLE1BQS9CLENBQUosRUFBNEM7QUFDeENoQyxNQUFBQSxVQUFVLENBQUNtQixrQkFBWCxDQUNJO0FBQUVhLFFBQUFBLE1BQU0sRUFBRXVCLEtBQUssQ0FBQ3ZCLE1BQWhCO0FBQXdCWSxRQUFBQSxXQUFXLEVBQUVXLEtBQUssQ0FBQ1g7QUFBM0MsT0FESixFQUVJLFVBQUNuQixJQUFELEVBQU9ELE9BQVA7QUFBQSxlQUFtQitDLFlBQVksQ0FBQ2QsS0FBRCxFQUFRaEMsSUFBUixFQUFjRCxPQUFkLENBQS9CO0FBQUEsT0FGSjtBQUlILEtBTEQsTUFLTztBQUNIO0FBQ0E7QUFDQXhCLE1BQUFBLFVBQVUsQ0FBQ2tCLGFBQVgsQ0FBeUIsRUFBekIsRUFBNkIsVUFBQ08sSUFBRCxFQUFPRCxPQUFQLEVBQW1CO0FBQzVDLFlBQUksQ0FBQ0EsT0FBRCxJQUFZLENBQUNDLElBQWpCLEVBQXVCO0FBQ25COEMsVUFBQUEsWUFBWSxDQUFDZCxLQUFELEVBQVEsSUFBUixFQUFjLEtBQWQsQ0FBWjtBQUNBO0FBQ0g7O0FBQ0QsWUFBTTJCLEdBQUcsR0FBRyxDQUFDM0QsSUFBSSxDQUFDNEQsTUFBTCxJQUFlLEVBQWhCLEVBQW9CQyxNQUFwQixDQUEyQjdELElBQUksQ0FBQzhELE1BQUwsSUFBZSxFQUExQyxDQUFaO0FBQ0EsWUFBSUMsS0FBSyxHQUFHLElBQVo7O0FBQ0EsWUFBSWpDLEtBQUssQ0FBQ1gsV0FBVixFQUF1QjtBQUNuQjRDLFVBQUFBLEtBQUssR0FBR0osR0FBRyxDQUFDSyxJQUFKLENBQVMsVUFBQUMsRUFBRTtBQUFBLG1CQUFJQSxFQUFFLENBQUM5QyxXQUFILEtBQW1CVyxLQUFLLENBQUNYLFdBQTdCO0FBQUEsV0FBWCxLQUF3RCxJQUFoRTtBQUNILFNBRkQsTUFFTztBQUNINEMsVUFBQUEsS0FBSyxHQUFHLENBQUMvRCxJQUFJLENBQUM0RCxNQUFMLElBQWUsRUFBaEIsRUFBb0JJLElBQXBCLENBQXlCLFVBQUFDLEVBQUU7QUFBQSxtQkFBSUEsRUFBRSxDQUFDZCxLQUFILEtBQWEsSUFBakI7QUFBQSxXQUEzQixLQUFxRCxJQUE3RDtBQUNIOztBQUNETCxRQUFBQSxZQUFZLENBQUNkLEtBQUQsRUFBUStCLEtBQUssSUFBSTtBQUFFakMsVUFBQUEsS0FBSyxFQUFFO0FBQVQsU0FBakIsRUFBb0MsSUFBcEMsQ0FBWjtBQUNILE9BYkQ7QUFjSDtBQUNKLEdBN0JEOztBQStCQSxNQUFNb0MsSUFBSSxHQUFHLFNBQVBBLElBQU8sR0FBTTtBQUNmLFFBQUksQ0FBQ3BDLEtBQUssQ0FBQ0ksZ0JBQVgsRUFBNkI7QUFDekJrQixNQUFBQSxlQUFlLEdBRFUsQ0FDTjtBQUN0Qjs7QUFDRCxRQUFJVCxJQUFJLENBQUNDLEdBQUwsS0FBYWQsS0FBSyxDQUFDSyxjQUFuQixHQUFvQ2IsUUFBUSxDQUFDQyxTQUFqRCxFQUE0RDtBQUN4RCxhQUR3RCxDQUNoRDtBQUNYOztBQUNEbUMsSUFBQUEsSUFBSTtBQUNQLEdBUkQ7O0FBVUEsU0FBTztBQUNIO0FBQ1I7QUFDQTtBQUNBO0FBQ1FTLElBQUFBLEtBTEcsaUJBS0c1RCxNQUxILEVBS1c7QUFDVmdDLE1BQUFBLElBQUk7QUFDSlQsTUFBQUEsS0FBSyxDQUFDdkIsTUFBTixHQUFlQSxNQUFNLElBQUksRUFBekI7QUFDQXVCLE1BQUFBLEtBQUssQ0FBQ1gsV0FBTixHQUFvQixFQUFwQjtBQUNBVyxNQUFBQSxLQUFLLENBQUNHLG1CQUFOLEdBQTRCLEVBQTVCO0FBQ0FILE1BQUFBLEtBQUssQ0FBQ0ksZ0JBQU4sR0FBeUIsS0FBekI7QUFDQUosTUFBQUEsS0FBSyxDQUFDSyxjQUFOLEdBQXVCUSxJQUFJLENBQUNDLEdBQUwsRUFBdkI7QUFDQWQsTUFBQUEsS0FBSyxDQUFDTSxZQUFOLEdBQXFCLENBQUMsQ0FBdEI7QUFDQU4sTUFBQUEsS0FBSyxDQUFDTyxlQUFOLEdBQXdCLENBQXhCO0FBQ0FQLE1BQUFBLEtBQUssQ0FBQ1EsUUFBTixHQUFpQixLQUFqQjtBQUNBYyxNQUFBQSxlQUFlO0FBQ2Z0QixNQUFBQSxLQUFLLENBQUNDLEtBQU4sR0FBY3FDLFdBQVcsQ0FBQ0YsSUFBRCxFQUFPNUMsUUFBUSxDQUFDRSxjQUFoQixDQUF6QjtBQUNILEtBakJFOztBQW1CSDtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDUTZDLElBQUFBLFdBekJHLHVCQXlCU3ZFLFFBekJULEVBeUJtQjtBQUNsQixVQUFJLENBQUNBLFFBQUwsRUFBZTtBQUNYO0FBQ0g7O0FBQ0QsVUFBTXdFLGFBQWEsR0FBR3hFLFFBQVEsQ0FBQ3FCLFdBQVQsS0FBeUJsQixTQUF6QixJQUNmSCxRQUFRLENBQUNxQixXQUFULEtBQXlCVyxLQUFLLENBQUNYLFdBRHRDO0FBRUEsVUFBTW9ELFVBQVUsR0FBR3pFLFFBQVEsQ0FBQ21CLGNBQVQsS0FBNEJoQixTQUE1QixJQUNaSCxRQUFRLENBQUNtQixjQUFULEtBQTRCYSxLQUFLLENBQUN2QixNQUR6Qzs7QUFFQSxVQUFJLENBQUMrRCxhQUFELElBQWtCLENBQUNDLFVBQXZCLEVBQW1DO0FBQy9CO0FBQ0g7O0FBQ0R6QyxNQUFBQSxLQUFLLENBQUNLLGNBQU4sR0FBdUJRLElBQUksQ0FBQ0MsR0FBTCxFQUF2Qjs7QUFDQSxVQUFJZCxLQUFLLENBQUNYLFdBQU4sS0FBc0IsRUFBdEIsSUFBNEJyQixRQUFRLENBQUNxQixXQUF6QyxFQUFzRDtBQUNsRFcsUUFBQUEsS0FBSyxDQUFDWCxXQUFOLEdBQW9CckIsUUFBUSxDQUFDcUIsV0FBN0I7QUFDSDtBQUNKLEtBeENFO0FBMENIb0IsSUFBQUEsSUFBSSxFQUFKQSxJQTFDRztBQTRDSGlDLElBQUFBLFNBNUNHLHVCQTRDUztBQUNSLGFBQU8xQyxLQUFLLENBQUNDLEtBQU4sS0FBZ0IsSUFBdkI7QUFDSDtBQTlDRSxHQUFQO0FBZ0RILENBbk5ELEMsQ0FxTkE7OztBQUNBMEMsTUFBTSxDQUFDbEcsVUFBUCxHQUFvQkEsVUFBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksIFBieEFwaUNsaWVudCAqL1xuXG4vKipcbiAqIE1vZHVsZXNBUEkgLSBNb2Rlcm4gdjMgQVBJIGNsaWVudCBmb3IgbW9kdWxlIG1hbmFnZW1lbnQgb3BlcmF0aW9uc1xuICpcbiAqIFVzZXMgdW5pZmllZCBQYnhBcGlDbGllbnQgZm9yIHN0YW5kYXJkIFJFU1RmdWwgb3BlcmF0aW9ucyBmb2xsb3dpbmcgR29vZ2xlIEFQSSBEZXNpZ24gR3VpZGUgcGF0dGVybnMuXG4gKiBBbGwgY3VzdG9tIG1ldGhvZHMgZm9sbG93IHRoZSA6bWV0aG9kTmFtZSBjb252ZW50aW9uIHdpdGggYXV0b21hdGljIGFzeW5jIGNoYW5uZWwgaGVhZGVyIHN1cHBvcnQuXG4gKlxuICogU3RhbmRhcmQgQ1JVRCBvcGVyYXRpb25zIGF2YWlsYWJsZSB2aWEgUGJ4QXBpQ2xpZW50OlxuICogLSBnZXRMaXN0KHBhcmFtcywgY2FsbGJhY2spIC0gR0VUIC9wYnhjb3JlL2FwaS92My9tb2R1bGVzXG4gKiAtIGdldFJlY29yZChpZCwgY2FsbGJhY2spIC0gR0VUIC9wYnhjb3JlL2FwaS92My9tb2R1bGVzL3tpZH1cbiAqIC0gc2F2ZVJlY29yZChkYXRhLCBjYWxsYmFjaykgLSBQT1NUL1BVVCAvcGJ4Y29yZS9hcGkvdjMvbW9kdWxlc1sve2lkfV1cbiAqIC0gZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykgLSBERUxFVEUgL3BieGNvcmUvYXBpL3YzL21vZHVsZXMve2lkfVxuICpcbiAqIEN1c3RvbSBtZXRob2RzIChHb29nbGUgQVBJIERlc2lnbiBHdWlkZSk6XG4gKiAtIGdldEF2YWlsYWJsZShjYWxsYmFjaykgLSBHRVQgL3BieGNvcmUvYXBpL3YzL21vZHVsZXM6Z2V0QXZhaWxhYmxlTW9kdWxlc1xuICogLSBnZXRNb2R1bGVJbmZvKHBhcmFtcywgY2FsbGJhY2spIC0gR0VUIC9wYnhjb3JlL2FwaS92My9tb2R1bGVzL3tpZH06Z2V0TW9kdWxlSW5mb1xuICogLSBpbnN0YWxsRnJvbVJlcG8ocGFyYW1zLCBjYWxsYmFjaykgLSBQT1NUIC9wYnhjb3JlL2FwaS92My9tb2R1bGVzL3tpZH06aW5zdGFsbEZyb21SZXBvXG4gKiAtIGluc3RhbGxGcm9tUGFja2FnZShwYXJhbXMsIGNhbGxiYWNrKSAtIFBPU1QgL3BieGNvcmUvYXBpL3YzL21vZHVsZXM6aW5zdGFsbEZyb21QYWNrYWdlXG4gKiAtIGVuYWJsZU1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSAtIFBPU1QgL3BieGNvcmUvYXBpL3YzL21vZHVsZXMve2lkfTplbmFibGVcbiAqIC0gZGlzYWJsZU1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSAtIFBPU1QgL3BieGNvcmUvYXBpL3YzL21vZHVsZXMve2lkfTpkaXNhYmxlXG4gKiAtIHVuaW5zdGFsbE1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSAtIFBPU1QgL3BieGNvcmUvYXBpL3YzL21vZHVsZXMve2lkfTp1bmluc3RhbGxcbiAqIC0gdXBkYXRlQWxsKHBhcmFtcywgY2FsbGJhY2spIC0gUE9TVCAvcGJ4Y29yZS9hcGkvdjMvbW9kdWxlczp1cGRhdGVBbGxcbiAqXG4gKiBAY2xhc3MgTW9kdWxlc0FQSVxuICovXG5jb25zdCBNb2R1bGVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvbW9kdWxlcycsXG4gICAgY3VzdG9tTWV0aG9kczoge1xuICAgICAgICBnZXREZWZhdWx0OiAnOmdldERlZmF1bHQnLFxuICAgICAgICBnZXRBdmFpbGFibGVNb2R1bGVzOiAnOmdldEF2YWlsYWJsZU1vZHVsZXMnLFxuICAgICAgICBnZXRNb2R1bGVJbmZvOiAnOmdldE1vZHVsZUluZm8nLFxuICAgICAgICBnZXRNb2R1bGVMaW5rOiAnOmdldE1vZHVsZUxpbmsnLFxuICAgICAgICBpbnN0YWxsRnJvbVJlcG86ICc6aW5zdGFsbEZyb21SZXBvJyxcbiAgICAgICAgaW5zdGFsbEZyb21QYWNrYWdlOiAnOmluc3RhbGxGcm9tUGFja2FnZScsXG4gICAgICAgIGVuYWJsZTogJzplbmFibGUnLFxuICAgICAgICBkaXNhYmxlOiAnOmRpc2FibGUnLFxuICAgICAgICB1bmluc3RhbGw6ICc6dW5pbnN0YWxsJyxcbiAgICAgICAgdXBkYXRlQWxsOiAnOnVwZGF0ZUFsbCcsXG4gICAgICAgIHN0YXJ0RG93bmxvYWQ6ICc6c3RhcnREb3dubG9hZCcsXG4gICAgICAgIGdldERvd25sb2FkU3RhdHVzOiAnOmdldERvd25sb2FkU3RhdHVzJyxcbiAgICAgICAgZ2V0TWV0YWRhdGFGcm9tUGFja2FnZTogJzpnZXRNZXRhZGF0YUZyb21QYWNrYWdlJyxcbiAgICAgICAgZ2V0SW5zdGFsbGF0aW9uU3RhdHVzOiAnOmdldEluc3RhbGxhdGlvblN0YXR1cycsXG4gICAgICAgIGdldE9wZXJhdGlvbnM6ICc6Z2V0T3BlcmF0aW9ucycsXG4gICAgICAgIGdldE9wZXJhdGlvblN0YXR1czogJzpnZXRPcGVyYXRpb25TdGF0dXMnXG4gICAgfVxufSk7XG5cbi8qKlxuICogUmV0cmlldmVzIGF2YWlsYWJsZSBtb2R1bGVzIGZyb20gTUlLTyByZXBvc2l0b3J5XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIChyZXNwb25zZSwgc3VjY2VzcylcbiAqL1xuTW9kdWxlc0FQSS5nZXRBdmFpbGFibGUgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZ2V0QXZhaWxhYmxlTW9kdWxlcycsIChyZXNwb25zZSwgc3VjY2VzcykgPT4ge1xuICAgICAgICBpZiAoc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCB1bmRlZmluZWQsICdHRVQnKTtcbn07XG5cbi8qKlxuICogSW5zdGFsbHMgYSBuZXcgbW9kdWxlIGZyb20gYSByZXBvc2l0b3J5XG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gSW5zdGFsbGF0aW9uIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gTW9kdWxlIHVuaXF1ZSBJRFxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5yZWxlYXNlSWQgLSBSZWxlYXNlIElEIHRvIGluc3RhbGxcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuY2hhbm5lbElkIC0gQXN5bmMgY2hhbm5lbCBJRCAoYXV0by1hZGRlZCB0byBoZWFkZXIpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIChyZXNwb25zZSwgc3VjY2VzcylcbiAqL1xuTW9kdWxlc0FQSS5pbnN0YWxsRnJvbVJlcG8gPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdERhdGEgPSB7XG4gICAgICAgIHJlbGVhc2VJZDogcGFyYW1zLnJlbGVhc2VJZCB8fCAwLFxuICAgICAgICBhc3luY0NoYW5uZWxJZDogcGFyYW1zLmNoYW5uZWxJZCAvLyBXaWxsIGJlIGF1dG8tZXh0cmFjdGVkIHRvIGhlYWRlciBieSBQYnhBcGlDbGllbnRcbiAgICB9O1xuXG4gICAgdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdpbnN0YWxsRnJvbVJlcG8nLCByZXF1ZXN0RGF0YSwgY2FsbGJhY2ssICdQT1NUJywgcGFyYW1zLnVuaXFpZCk7XG59O1xuXG4vKipcbiAqIEluc3RhbGxzIGEgbmV3IG1vZHVsZSBmcm9tIGFuIHVwbG9hZGVkIHppcCBhcmNoaXZlXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gSW5zdGFsbGF0aW9uIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuZmlsZVBhdGggLSBQYXRoIHRvIHVwbG9hZGVkIHppcCBmaWxlXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmZpbGVJZCAtIEZpbGUgdXBsb2FkIElEXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmNoYW5uZWxJZCAtIEFzeW5jIGNoYW5uZWwgSUQgKGF1dG8tYWRkZWQgdG8gaGVhZGVyKVxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiAocmVzcG9uc2UsIHN1Y2Nlc3MpXG4gKi9cbk1vZHVsZXNBUEkuaW5zdGFsbEZyb21QYWNrYWdlID0gZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IHJlcXVlc3REYXRhID0ge1xuICAgICAgICBmaWxlUGF0aDogcGFyYW1zLmZpbGVQYXRoLFxuICAgICAgICBmaWxlSWQ6IHBhcmFtcy5maWxlSWQsXG4gICAgICAgIGFzeW5jQ2hhbm5lbElkOiBwYXJhbXMuY2hhbm5lbElkIC8vIFdpbGwgYmUgYXV0by1leHRyYWN0ZWQgdG8gaGVhZGVyIGJ5IFBieEFwaUNsaWVudFxuICAgIH07XG5cbiAgICB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2luc3RhbGxGcm9tUGFja2FnZScsIHJlcXVlc3REYXRhLCBjYWxsYmFjaywgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogRW5hYmxlcyBhbiBleHRlbnNpb24gbW9kdWxlXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gRW5hYmxlIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gTW9kdWxlIHVuaXF1ZSBJRFxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5jaGFubmVsSWQgLSBBc3luYyBjaGFubmVsIElEIChhdXRvLWFkZGVkIHRvIGhlYWRlcilcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBPcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbiAocmVzcG9uc2UsIHN1Y2Nlc3MpXG4gKi9cbk1vZHVsZXNBUEkuZW5hYmxlTW9kdWxlID0gZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IHJlcXVlc3REYXRhID0ge1xuICAgICAgICBhc3luY0NoYW5uZWxJZDogcGFyYW1zLmNoYW5uZWxJZCAvLyBXaWxsIGJlIGF1dG8tZXh0cmFjdGVkIHRvIGhlYWRlciBieSBQYnhBcGlDbGllbnRcbiAgICB9O1xuXG4gICAgdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdlbmFibGUnLCByZXF1ZXN0RGF0YSwgY2FsbGJhY2ssICdQT1NUJywgcGFyYW1zLnVuaXFpZCk7XG59O1xuXG4vKipcbiAqIERpc2FibGVzIGFuIGV4dGVuc2lvbiBtb2R1bGVcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBEaXNhYmxlIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gTW9kdWxlIHVuaXF1ZSBJRFxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5jaGFubmVsSWQgLSBBc3luYyBjaGFubmVsIElEIChhdXRvLWFkZGVkIHRvIGhlYWRlcilcbiAqIEBwYXJhbSB7c3RyaW5nfSBbcGFyYW1zLnJlYXNvbl0gLSBEaXNhYmxlIHJlYXNvblxuICogQHBhcmFtIHtzdHJpbmd9IFtwYXJhbXMucmVhc29uVGV4dF0gLSBEaXNhYmxlIHJlYXNvbiB0ZXh0XG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIC0gT3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gKHJlc3BvbnNlLCBzdWNjZXNzKVxuICovXG5Nb2R1bGVzQVBJLmRpc2FibGVNb2R1bGUgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdERhdGEgPSB7XG4gICAgICAgIGFzeW5jQ2hhbm5lbElkOiBwYXJhbXMuY2hhbm5lbElkLCAvLyBXaWxsIGJlIGF1dG8tZXh0cmFjdGVkIHRvIGhlYWRlciBieSBQYnhBcGlDbGllbnRcbiAgICAgICAgcmVhc29uOiBwYXJhbXMucmVhc29uIHx8ICcnLFxuICAgICAgICByZWFzb25UZXh0OiBwYXJhbXMucmVhc29uVGV4dCB8fCAnJ1xuICAgIH07XG5cbiAgICB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2Rpc2FibGUnLCByZXF1ZXN0RGF0YSwgY2FsbGJhY2ssICdQT1NUJywgcGFyYW1zLnVuaXFpZCk7XG59O1xuXG4vKipcbiAqIFVuaW5zdGFsbHMgYW4gZXh0ZW5zaW9uIG1vZHVsZVxuICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFVuaW5zdGFsbCBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3BhcmFtcy5rZWVwU2V0dGluZ3M9ZmFsc2VdIC0gS2VlcCBtb2R1bGUgc2V0dGluZ3NcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuY2hhbm5lbElkIC0gQXN5bmMgY2hhbm5lbCBJRCAoYXV0by1hZGRlZCB0byBoZWFkZXIpXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIChyZXNwb25zZSwgc3VjY2VzcylcbiAqL1xuTW9kdWxlc0FQSS51bmluc3RhbGxNb2R1bGUgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdERhdGEgPSB7XG4gICAgICAgIGtlZXBTZXR0aW5nczogcGFyYW1zLmtlZXBTZXR0aW5ncyB8fCBmYWxzZSxcbiAgICAgICAgYXN5bmNDaGFubmVsSWQ6IHBhcmFtcy5jaGFubmVsSWQgLy8gV2lsbCBiZSBhdXRvLWV4dHJhY3RlZCB0byBoZWFkZXIgYnkgUGJ4QXBpQ2xpZW50XG4gICAgfTtcblxuICAgIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgndW5pbnN0YWxsJywgcmVxdWVzdERhdGEsIGNhbGxiYWNrLCAnUE9TVCcsIHBhcmFtcy51bmlxaWQpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgbW9kdWxlIGluZm9ybWF0aW9uIGZyb20gdGhlIHJlcG9zaXRvcnlcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBNb2R1bGUgaW5mbyBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gKGRhdGEsIHN1Y2Nlc3MpXG4gKi9cbk1vZHVsZXNBUEkuZ2V0TW9kdWxlSW5mbyA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldE1vZHVsZUluZm8nLCB7fSwgKHJlc3BvbnNlLCBzdWNjZXNzKSA9PiB7XG4gICAgICAgIGlmIChzdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sICdHRVQnLCBwYXJhbXMudW5pcWlkKTtcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBVcGRhdGUgcGFyYW1ldGVyc1xuICogQHBhcmFtIHthcnJheX0gcGFyYW1zLm1vZHVsZXNGb3JVcGRhdGUgLSBBcnJheSBvZiBtb2R1bGUgSURzIHRvIHVwZGF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5jaGFubmVsSWQgLSBBc3luYyBjaGFubmVsIElEIChhdXRvLWFkZGVkIHRvIGhlYWRlcilcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gKHJlc3BvbnNlLCBzdWNjZXNzKVxuICovXG5Nb2R1bGVzQVBJLnVwZGF0ZUFsbCA9IGZ1bmN0aW9uKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICBjb25zdCByZXF1ZXN0RGF0YSA9IHtcbiAgICAgICAgbW9kdWxlc0ZvclVwZGF0ZTogcGFyYW1zLm1vZHVsZXNGb3JVcGRhdGUsXG4gICAgICAgIGFzeW5jQ2hhbm5lbElkOiBwYXJhbXMuY2hhbm5lbElkIC8vIFdpbGwgYmUgYXV0by1leHRyYWN0ZWQgdG8gaGVhZGVyIGJ5IFBieEFwaUNsaWVudFxuICAgIH07XG5cbiAgICB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ3VwZGF0ZUFsbCcsIHJlcXVlc3REYXRhLCBjYWxsYmFjaywgJ1BPU1QnKTtcbn07XG5cbi8qKlxuICogUmV0cmlldmVzIG1vZHVsZSBvcGVyYXRpb25zIGpvdXJuYWw6IGFjdGl2ZSBvcGVyYXRpb25zIHBsdXMgcmVjZW50IGhpc3RvcnkuXG4gKiBVc2VkIHRvIHJlc3RvcmUgcHJvZ3Jlc3MgYmFycyBhbmQgYnV0dG9uIGxvY2tzIGFmdGVyIGEgcGFnZSByZWxvYWQuXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gUXVlcnkgcGFyYW1ldGVyc1xuICogQHBhcmFtIHtzdHJpbmd9IFtwYXJhbXMubW9kdWxlVW5pcXVlSWRdIC0gRmlsdGVyIGJ5IG1vZHVsZSB1bmlxdWUgSURcbiAqIEBwYXJhbSB7bnVtYmVyfSBbcGFyYW1zLmxpbWl0XSAtIEhpc3Rvcnkgc2l6ZSBsaW1pdFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcylcbiAqL1xuTW9kdWxlc0FQSS5nZXRPcGVyYXRpb25zID0gZnVuY3Rpb24ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgIGNvbnN0IHJlcXVlc3REYXRhID0ge307XG4gICAgaWYgKHBhcmFtcy5tb2R1bGVVbmlxdWVJZCkge1xuICAgICAgICByZXF1ZXN0RGF0YS5tb2R1bGVVbmlxdWVJZCA9IHBhcmFtcy5tb2R1bGVVbmlxdWVJZDtcbiAgICB9XG4gICAgaWYgKHBhcmFtcy5saW1pdCkge1xuICAgICAgICByZXF1ZXN0RGF0YS5saW1pdCA9IHBhcmFtcy5saW1pdDtcbiAgICB9XG4gICAgdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXRPcGVyYXRpb25zJywgcmVxdWVzdERhdGEsIChyZXNwb25zZSwgc3VjY2VzcykgPT4ge1xuICAgICAgICBpZiAoc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LCAnR0VUJyk7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgc3RhdHVzIG9mIHRoZSBjdXJyZW50IG9yIGxhc3Qgb3BlcmF0aW9uIGZvciBhIG1vZHVsZS5cbiAqIFBvbGxpbmcgZmFsbGJhY2sgd2hlbiBuY2hhbiBwcm9ncmVzcyBtZXNzYWdlcyBhcmUgbG9zdC5cbiAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAqIEBwYXJhbSB7c3RyaW5nfSBbcGFyYW1zLm9wZXJhdGlvbklkXSAtIFNwZWNpZmljIG9wZXJhdGlvbiBJRFxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiAoZGF0YSwgc3VjY2VzcylcbiAqL1xuTW9kdWxlc0FQSS5nZXRPcGVyYXRpb25TdGF0dXMgPSBmdW5jdGlvbihwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdERhdGEgPSB7fTtcbiAgICBpZiAocGFyYW1zLm9wZXJhdGlvbklkKSB7XG4gICAgICAgIHJlcXVlc3REYXRhLm9wZXJhdGlvbklkID0gcGFyYW1zLm9wZXJhdGlvbklkO1xuICAgIH1cbiAgICB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2dldE9wZXJhdGlvblN0YXR1cycsIHJlcXVlc3REYXRhLCAocmVzcG9uc2UsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgaWYgKHN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSwgJ0dFVCcsIHBhcmFtcy51bmlxaWQpO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgd2F0Y2hkb2cgZm9yIGEgbG9uZy1ydW5uaW5nIG1vZHVsZSBvcGVyYXRpb24uXG4gKlxuICogUHJpbWFyeSBwcm9ncmVzcyB0cmFuc3BvcnQgaXMgbmNoYW4gKEV2ZW50QnVzKTsgdGhlIHdhdGNoZG9nIGlzIHRoZSBmYWxsYmFjazpcbiAqIHdoaWxlIGV2ZW50cyBrZWVwIGFycml2aW5nIGl0IHN0YXlzIHNpbGVudCwgYnV0IGFmdGVyIGBzaWxlbmNlTXNgIHdpdGhvdXQgYVxuICogc2luZ2xlIGV2ZW50IGl0IHN0YXJ0cyBwb2xsaW5nIHRoZSBvcGVyYXRpb25zIGpvdXJuYWwgZXZlcnkgYHBvbGxJbnRlcnZhbE1zYFxuICogYW5kIGZpcmVzIGBvblRlcm1pbmFsYCB3aGVuIHRoZSBqb3VybmFsIHJlYWNoZXMgYSB0ZXJtaW5hbCBzdGF0ZSDigJQgc28gYSBsb3N0XG4gKiBXZWJTb2NrZXQgbWVzc2FnZSBjYW4gbm8gbG9uZ2VyIGZyZWV6ZSB0aGUgVUkgZm9yZXZlci4gYG9uU3RhbGxlZGAgZmlyZXNcbiAqIHdoZW4gdGhlcmUgaXMgbm8gYWN0aXZpdHkgZnJvbSBhbnkgc291cmNlIGZvciBgbWF4U3RhbGxNc2AuXG4gKlxuICogVGhlIGJhc2VsaW5lIHRyaWNrOiByaWdodCBhZnRlciBzdGFydCgpIHRoZSBjdXJyZW50IGpvdXJuYWwgcmVjb3JkIGlzIHJlYWQ7XG4gKiBhIHRlcm1pbmFsIHJlY29yZCBzZWVuIGF0IHRoYXQgbW9tZW50IGJlbG9uZ3MgdG8gYSBQUkVWSU9VUyBvcGVyYXRpb24gYW5kXG4gKiBpdHMgb3BlcmF0aW9uSWQgYmVjb21lcyB0aGUgYmFzZWxpbmUuIE9ubHkgYSB0ZXJtaW5hbCByZWNvcmQgd2l0aCBhXG4gKiBkaWZmZXJlbnQgb3BlcmF0aW9uSWQgaXMgdHJlYXRlZCBhcyB0aGUgcmVzdWx0IG9mIHRoZSBuZXcgb3BlcmF0aW9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBvcHRpb25zLm9uVGVybWluYWwgLSBDYWxsZWQgb25jZSB3aXRoIHRoZSBqb3VybmFsIHJlY29yZCB3aGVuIHRoZSBvcGVyYXRpb24gZmluaXNoZXNcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IG9wdGlvbnMub25TdGFsbGVkIC0gQ2FsbGVkIG9uY2Ugd2hlbiBubyBhY3Rpdml0eSBoYXBwZW5zIGZvciBtYXhTdGFsbE1zXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMuc2lsZW5jZU1zPTE1MDAwXSAtIEV2ZW50IHNpbGVuY2UgYmVmb3JlIHBvbGxpbmcgc3RhcnRzXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMucG9sbEludGVydmFsTXM9NTAwMF0gLSBQb2xsIHBlcmlvZFxuICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFN0YWxsTXM9MTgwMDAwXSAtIE5vLWFjdGl2aXR5IGxpbWl0IGJlZm9yZSBvblN0YWxsZWRcbiAqIEByZXR1cm5zIHt7c3RhcnQ6IGZ1bmN0aW9uLCBub3RpZnlFdmVudDogZnVuY3Rpb24sIHN0b3A6IGZ1bmN0aW9uLCBpc1J1bm5pbmc6IGZ1bmN0aW9ufX1cbiAqL1xuTW9kdWxlc0FQSS5jcmVhdGVPcGVyYXRpb25XYXRjaGRvZyA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgc2lsZW5jZU1zOiAxNTAwMCxcbiAgICAgICAgcG9sbEludGVydmFsTXM6IDUwMDAsXG4gICAgICAgIG1heFN0YWxsTXM6IDE4MDAwMCxcbiAgICAgICAgb25UZXJtaW5hbDogKCkgPT4ge30sXG4gICAgICAgIG9uU3RhbGxlZDogKCkgPT4ge30sXG4gICAgICAgIC4uLm9wdGlvbnMsXG4gICAgfTtcblxuICAgIC8vIE1pcnJvcnMgaWRQYXR0ZXJuIG9mIHRoZSBtb2R1bGVzIFJFU1Qgcm91dGU6IHRyYWNraW5nIGlkcyB0aGF0IGRvIG5vdFxuICAgIC8vIG1hdGNoIGl0ICh1cGxvYWQgZmlsZUlkcykgY2Fubm90IGJlIHVzZWQgYXMgYSByZXNvdXJjZSBpZCBpbiB0aGUgVVJMLlxuICAgIGNvbnN0IFJFU09VUkNFX0lEX1BBVFRFUk4gPSAvXltBLVphLXpdW0EtWmEtejAtOV0qJC87XG5cbiAgICAvLyBBIHRlcm1pbmFsIHJlY29yZCB5b3VuZ2VyIHRoYW4gdGhpcyBhdCBiYXNlbGluZSB0aW1lIG1heSBhbHJlYWR5IGJlIHRoZVxuICAgIC8vIHJlc3VsdCBvZiB0aGUgb3BlcmF0aW9uIGJlaW5nIHN0YXJ0ZWQg4oCUIGRvIG5vdCB1c2UgaXQgYXMgdGhlIGJhc2VsaW5lLlxuICAgIGNvbnN0IEZSRVNIX1RFUk1JTkFMX1NFQyA9IDEwO1xuXG4gICAgY29uc3Qgc3RhdGUgPSB7XG4gICAgICAgIHRpbWVyOiBudWxsLFxuICAgICAgICBlcG9jaDogMCxcbiAgICAgICAgdW5pcWlkOiAnJyxcbiAgICAgICAgb3BlcmF0aW9uSWQ6ICcnLFxuICAgICAgICBiYXNlbGluZU9wZXJhdGlvbklkOiAnJyxcbiAgICAgICAgYmFzZWxpbmVSZXNvbHZlZDogZmFsc2UsXG4gICAgICAgIGxhc3RBY3Rpdml0eUF0OiAwLFxuICAgICAgICBsYXN0UHJvZ3Jlc3M6IC0xLFxuICAgICAgICBsYXN0SGVhcnRiZWF0QXQ6IDAsXG4gICAgICAgIHBvbGxCdXN5OiBmYWxzZSxcbiAgICB9O1xuXG4gICAgY29uc3Qgc3RvcCA9ICgpID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnRpbWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHN0YXRlLnRpbWVyKTtcbiAgICAgICAgICAgIHN0YXRlLnRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5lcG9jaCArPSAxOyAvLyBpbnZhbGlkYXRlIGV2ZXJ5IGluLWZsaWdodCBjYWxsYmFja1xuICAgIH07XG5cbiAgICBjb25zdCBmaW5pc2hUZXJtaW5hbCA9IChkYXRhKSA9PiB7XG4gICAgICAgIHN0b3AoKTtcbiAgICAgICAgc2V0dGluZ3Mub25UZXJtaW5hbChkYXRhKTtcbiAgICB9O1xuXG4gICAgY29uc3QgY2hlY2tTdGFsbCA9ICgpID0+IHtcbiAgICAgICAgaWYgKERhdGUubm93KCkgLSBzdGF0ZS5sYXN0QWN0aXZpdHlBdCA+IHNldHRpbmdzLm1heFN0YWxsTXMpIHtcbiAgICAgICAgICAgIHN0b3AoKTtcbiAgICAgICAgICAgIHNldHRpbmdzLm9uU3RhbGxlZCgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIERlY2lkZXMgd2hldGhlciBhIHRlcm1pbmFsIGpvdXJuYWwgcmVjb3JkIGlzIHRoZSByZXN1bHQgb2YgT1VSIG9wZXJhdGlvbi5cbiAgICAgKiBBY2NlcHRlZCB3aGVuIGl0cyBvcGVyYXRpb25JZCB3YXMgY2FwdHVyZWQgZnJvbSBuY2hhbiBtZXNzYWdlcywgb3Igd2hlblxuICAgICAqIHRoZSBiYXNlbGluZSBpcyByZXNvbHZlZCBhbmQgdGhlIHJlY29yZCBkaWZmZXJzIGZyb20gaXQuXG4gICAgICovXG4gICAgY29uc3QgaXNPdXJUZXJtaW5hbCA9IChkYXRhKSA9PiB7XG4gICAgICAgIGlmIChkYXRhLm9wZXJhdGlvbklkICYmIGRhdGEub3BlcmF0aW9uSWQgPT09IHN0YXRlLm9wZXJhdGlvbklkKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGUuYmFzZWxpbmVSZXNvbHZlZCAmJiBkYXRhLm9wZXJhdGlvbklkICE9PSBzdGF0ZS5iYXNlbGluZU9wZXJhdGlvbklkO1xuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVTdGF0dXMgPSAoZXBvY2gsIGRhdGEsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgaWYgKGVwb2NoICE9PSBzdGF0ZS5lcG9jaCkge1xuICAgICAgICAgICAgcmV0dXJuOyAvLyByZXNwb25zZSBvZiBhIHByZXZpb3VzIHdhdGNoIG9yIGFycml2ZWQgYWZ0ZXIgc3RvcCgpXG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUucG9sbEJ1c3kgPSBmYWxzZTtcbiAgICAgICAgaWYgKCFzdWNjZXNzIHx8ICFkYXRhIHx8ICFkYXRhLnN0YXRlIHx8IGRhdGEuc3RhdGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgY2hlY2tTdGFsbCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnRlcm1pbmFsID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoaXNPdXJUZXJtaW5hbChkYXRhKSkge1xuICAgICAgICAgICAgICAgIGZpbmlzaFRlcm1pbmFsKGRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBQcmV2aW91cyBvcGVyYXRpb24ncyByZWNvcmQg4oCUIG91cnMgaXMgbm90IHZpc2libGUgeWV0XG4gICAgICAgICAgICAgICAgY2hlY2tTdGFsbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFjdGl2ZSBvcGVyYXRpb25cbiAgICAgICAgaWYgKGRhdGEub3BlcmF0aW9uSWQgJiYgZGF0YS5vcGVyYXRpb25JZCAhPT0gc3RhdGUuYmFzZWxpbmVPcGVyYXRpb25JZCkge1xuICAgICAgICAgICAgc3RhdGUub3BlcmF0aW9uSWQgPSBkYXRhLm9wZXJhdGlvbklkO1xuICAgICAgICB9XG4gICAgICAgIC8vIFNlcnZlci1zaWRlIGxpdmVuZXNzOiBhIG1vdmluZyBoZWFydGJlYXQgb3IgcHJvZ3Jlc3MgY291bnRzIGFzXG4gICAgICAgIC8vIGFjdGl2aXR5OyBhIHJlY29yZCBmbGFnZ2VkIHN0YWxlIGlzIHByZXN1bWVkIGRlYWQgYW5kIG11c3QgTk9UXG4gICAgICAgIC8vIHBvc3Rwb25lIHRoZSBzdGFsbCB2ZXJkaWN0LlxuICAgICAgICBjb25zdCBtb3ZlZCA9IGRhdGEuaGVhcnRiZWF0QXQgIT09IHN0YXRlLmxhc3RIZWFydGJlYXRBdCB8fCBkYXRhLnByb2dyZXNzICE9PSBzdGF0ZS5sYXN0UHJvZ3Jlc3M7XG4gICAgICAgIHN0YXRlLmxhc3RIZWFydGJlYXRBdCA9IGRhdGEuaGVhcnRiZWF0QXQ7XG4gICAgICAgIHN0YXRlLmxhc3RQcm9ncmVzcyA9IGRhdGEucHJvZ3Jlc3M7XG4gICAgICAgIGlmIChtb3ZlZCAmJiBkYXRhLnN0YWxlICE9PSB0cnVlKSB7XG4gICAgICAgICAgICBzdGF0ZS5sYXN0QWN0aXZpdHlBdCA9IERhdGUubm93KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2hlY2tTdGFsbCgpO1xuICAgIH07XG5cbiAgICBjb25zdCByZXNvbHZlQmFzZWxpbmUgPSAoKSA9PiB7XG4gICAgICAgIGlmICghUkVTT1VSQ0VfSURfUEFUVEVSTi50ZXN0KHN0YXRlLnVuaXFpZCkpIHtcbiAgICAgICAgICAgIC8vIE5vIHJlc291cmNlIGlkIHRvIHF1ZXJ5OiByZWx5IG9uIG9wZXJhdGlvbklkIGNhcHR1cmUgZnJvbSBuY2hhblxuICAgICAgICAgICAgc3RhdGUuYmFzZWxpbmVSZXNvbHZlZCA9IHRydWU7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZXBvY2ggPSBzdGF0ZS5lcG9jaDtcbiAgICAgICAgTW9kdWxlc0FQSS5nZXRPcGVyYXRpb25TdGF0dXMoeyB1bmlxaWQ6IHN0YXRlLnVuaXFpZCB9LCAoZGF0YSwgc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgaWYgKGVwb2NoICE9PSBzdGF0ZS5lcG9jaCB8fCBzdGF0ZS5iYXNlbGluZVJlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdWNjZXNzIHx8ICFkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyByZXRyaWVkIGZyb20gdGljaygpIHVudGlsIGl0IHN1Y2NlZWRzXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS50ZXJtaW5hbCA9PT0gdHJ1ZSAmJiBkYXRhLm9wZXJhdGlvbklkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWdlU2VjID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkgLSAoZGF0YS5maW5pc2hlZEF0IHx8IDApO1xuICAgICAgICAgICAgICAgIC8vIEEganVzdC1maW5pc2hlZCByZWNvcmQgbWF5IGFscmVhZHkgYmUgb3VyIG93biByZXN1bHQgKGZhc3RcbiAgICAgICAgICAgICAgICAvLyBlbmFibGUgY29tcGxldGVkIGJlZm9yZSB0aGlzIHJlcXVlc3QgbGFuZGVkKSDigJQgbGVhdmUgdGhlXG4gICAgICAgICAgICAgICAgLy8gYmFzZWxpbmUgZW1wdHkgc28gc3VjaCBhIHJlY29yZCBpcyBhY2NlcHRlZCBhcyBvdXJzLlxuICAgICAgICAgICAgICAgIHN0YXRlLmJhc2VsaW5lT3BlcmF0aW9uSWQgPSBhZ2VTZWMgPiBGUkVTSF9URVJNSU5BTF9TRUMgPyBkYXRhLm9wZXJhdGlvbklkIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5iYXNlbGluZVJlc29sdmVkID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHBvbGwgPSAoKSA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5wb2xsQnVzeSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLnBvbGxCdXN5ID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgZXBvY2ggPSBzdGF0ZS5lcG9jaDtcbiAgICAgICAgaWYgKFJFU09VUkNFX0lEX1BBVFRFUk4udGVzdChzdGF0ZS51bmlxaWQpKSB7XG4gICAgICAgICAgICBNb2R1bGVzQVBJLmdldE9wZXJhdGlvblN0YXR1cyhcbiAgICAgICAgICAgICAgICB7IHVuaXFpZDogc3RhdGUudW5pcWlkLCBvcGVyYXRpb25JZDogc3RhdGUub3BlcmF0aW9uSWQgfSxcbiAgICAgICAgICAgICAgICAoZGF0YSwgc3VjY2VzcykgPT4gaGFuZGxlU3RhdHVzKGVwb2NoLCBkYXRhLCBzdWNjZXNzKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFVwbG9hZCBmaWxlSWQgZmxvdzogcXVlcnkgdGhlIGNvbGxlY3Rpb24gYW5kIG1hdGNoIGJ5IHRoZVxuICAgICAgICAgICAgLy8gb3BlcmF0aW9uSWQgY2FwdHVyZWQgZnJvbSBuY2hhbiBtZXNzYWdlcy5cbiAgICAgICAgICAgIE1vZHVsZXNBUEkuZ2V0T3BlcmF0aW9ucyh7fSwgKGRhdGEsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgIWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlU3RhdHVzKGVwb2NoLCBudWxsLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgYWxsID0gKGRhdGEuYWN0aXZlIHx8IFtdKS5jb25jYXQoZGF0YS5yZWNlbnQgfHwgW10pO1xuICAgICAgICAgICAgICAgIGxldCBtYXRjaCA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLm9wZXJhdGlvbklkKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoID0gYWxsLmZpbmQob3AgPT4gb3Aub3BlcmF0aW9uSWQgPT09IHN0YXRlLm9wZXJhdGlvbklkKSB8fCBudWxsO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoID0gKGRhdGEuYWN0aXZlIHx8IFtdKS5maW5kKG9wID0+IG9wLnN0YWxlICE9PSB0cnVlKSB8fCBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBoYW5kbGVTdGF0dXMoZXBvY2gsIG1hdGNoIHx8IHsgc3RhdGU6ICdub25lJyB9LCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICAgIGlmICghc3RhdGUuYmFzZWxpbmVSZXNvbHZlZCkge1xuICAgICAgICAgICAgcmVzb2x2ZUJhc2VsaW5lKCk7IC8vIGtlZXAgcmV0cnlpbmcgYWZ0ZXIgYSBmYWlsZWQgZmlyc3QgYXR0ZW1wdFxuICAgICAgICB9XG4gICAgICAgIGlmIChEYXRlLm5vdygpIC0gc3RhdGUubGFzdEFjdGl2aXR5QXQgPCBzZXR0aW5ncy5zaWxlbmNlTXMpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gZXZlbnRzIGFyZSBmbG93aW5nLCBubyBuZWVkIHRvIHBvbGxcbiAgICAgICAgfVxuICAgICAgICBwb2xsKCk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBTdGFydHMgd2F0Y2hpbmcgYW4gb3BlcmF0aW9uIGZvciB0aGUgZ2l2ZW4gbW9kdWxlIChvciB1cGxvYWQgZmlsZUlkKS5cbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHVuaXFpZFxuICAgICAgICAgKi9cbiAgICAgICAgc3RhcnQodW5pcWlkKSB7XG4gICAgICAgICAgICBzdG9wKCk7XG4gICAgICAgICAgICBzdGF0ZS51bmlxaWQgPSB1bmlxaWQgfHwgJyc7XG4gICAgICAgICAgICBzdGF0ZS5vcGVyYXRpb25JZCA9ICcnO1xuICAgICAgICAgICAgc3RhdGUuYmFzZWxpbmVPcGVyYXRpb25JZCA9ICcnO1xuICAgICAgICAgICAgc3RhdGUuYmFzZWxpbmVSZXNvbHZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgc3RhdGUubGFzdEFjdGl2aXR5QXQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgc3RhdGUubGFzdFByb2dyZXNzID0gLTE7XG4gICAgICAgICAgICBzdGF0ZS5sYXN0SGVhcnRiZWF0QXQgPSAwO1xuICAgICAgICAgICAgc3RhdGUucG9sbEJ1c3kgPSBmYWxzZTtcbiAgICAgICAgICAgIHJlc29sdmVCYXNlbGluZSgpO1xuICAgICAgICAgICAgc3RhdGUudGltZXIgPSBzZXRJbnRlcnZhbCh0aWNrLCBzZXR0aW5ncy5wb2xsSW50ZXJ2YWxNcyk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE1hcmtzIG5jaGFuIGFjdGl2aXR5IGFuZCBjYXB0dXJlcyB0aGUgb3BlcmF0aW9uSWQgb2YgT1VSIG9wZXJhdGlvbi5cbiAgICAgICAgICogRXZlbnRzIG9mIG90aGVyIG9wZXJhdGlvbnMgZmxvd2luZyB0aHJvdWdoIHRoZSBzaGFyZWQgY2hhbm5lbCBhcmVcbiAgICAgICAgICogaWdub3JlZDogdGhleSBtdXN0IG5laXRoZXIgcG9zdHBvbmUgcG9sbGluZyBub3IgcmUta2V5IHRoZSB3YXRjaC5cbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIEV2ZW50QnVzIG1lc3NhZ2VcbiAgICAgICAgICovXG4gICAgICAgIG5vdGlmeUV2ZW50KHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgc2FtZU9wZXJhdGlvbiA9IHJlc3BvbnNlLm9wZXJhdGlvbklkICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAmJiByZXNwb25zZS5vcGVyYXRpb25JZCA9PT0gc3RhdGUub3BlcmF0aW9uSWQ7XG4gICAgICAgICAgICBjb25zdCBzYW1lTW9kdWxlID0gcmVzcG9uc2UubW9kdWxlVW5pcXVlSWQgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICYmIHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkID09PSBzdGF0ZS51bmlxaWQ7XG4gICAgICAgICAgICBpZiAoIXNhbWVPcGVyYXRpb24gJiYgIXNhbWVNb2R1bGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdGF0ZS5sYXN0QWN0aXZpdHlBdCA9IERhdGUubm93KCk7XG4gICAgICAgICAgICBpZiAoc3RhdGUub3BlcmF0aW9uSWQgPT09ICcnICYmIHJlc3BvbnNlLm9wZXJhdGlvbklkKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUub3BlcmF0aW9uSWQgPSByZXNwb25zZS5vcGVyYXRpb25JZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBzdG9wLFxuXG4gICAgICAgIGlzUnVubmluZygpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS50aW1lciAhPT0gbnVsbDtcbiAgICAgICAgfSxcbiAgICB9O1xufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xud2luZG93Lk1vZHVsZXNBUEkgPSBNb2R1bGVzQVBJO1xuIl19