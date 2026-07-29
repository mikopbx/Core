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
const ModulesAPI = new PbxApiClient({
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
ModulesAPI.getAvailable = function(callback) {
    this.callCustomMethod('getAvailableModules', (response, success) => {
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
ModulesAPI.installFromRepo = function(params, callback) {
    const requestData = {
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
ModulesAPI.installFromPackage = function(params, callback) {
    const requestData = {
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
ModulesAPI.enableModule = function(params, callback) {
    const requestData = {
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
ModulesAPI.disableModule = function(params, callback) {
    const requestData = {
        asyncChannelId: params.channelId, // Will be auto-extracted to header by PbxApiClient
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
ModulesAPI.uninstallModule = function(params, callback) {
    const requestData = {
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
ModulesAPI.getModuleInfo = function(params, callback) {
    this.callCustomMethod('getModuleInfo', {}, (response, success) => {
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
ModulesAPI.updateAll = function(params, callback) {
    const requestData = {
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
ModulesAPI.getOperations = function(params, callback) {
    const requestData = {};
    if (params.moduleUniqueId) {
        requestData.moduleUniqueId = params.moduleUniqueId;
    }
    if (params.limit) {
        requestData.limit = params.limit;
    }
    this.callCustomMethod('getOperations', requestData, (response, success) => {
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
ModulesAPI.getOperationStatus = function(params, callback) {
    const requestData = {};
    if (params.operationId) {
        requestData.operationId = params.operationId;
    }
    this.callCustomMethod('getOperationStatus', requestData, (response, success) => {
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
ModulesAPI.createOperationWatchdog = function(options) {
    const settings = {
        silenceMs: 15000,
        pollIntervalMs: 5000,
        maxStallMs: 180000,
        onTerminal: () => {},
        onStalled: () => {},
        ...options,
    };

    // Mirrors idPattern of the modules REST route: tracking ids that do not
    // match it (upload fileIds) cannot be used as a resource id in the URL.
    const RESOURCE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

    // A terminal record younger than this at baseline time may already be the
    // result of the operation being started — do not use it as the baseline.
    const FRESH_TERMINAL_SEC = 10;

    const state = {
        timer: null,
        epoch: 0,
        uniqid: '',
        operationId: '',
        baselineOperationId: '',
        baselineResolved: false,
        lastActivityAt: 0,
        lastProgress: -1,
        lastHeartbeatAt: 0,
        pollBusy: false,
    };

    const stop = () => {
        if (state.timer !== null) {
            clearInterval(state.timer);
            state.timer = null;
        }
        state.epoch += 1; // invalidate every in-flight callback
    };

    const finishTerminal = (data) => {
        stop();
        settings.onTerminal(data);
    };

    const checkStall = () => {
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
    const isOurTerminal = (data) => {
        if (data.operationId && data.operationId === state.operationId) {
            return true;
        }
        return state.baselineResolved && data.operationId !== state.baselineOperationId;
    };

    const handleStatus = (epoch, data, success) => {
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
        }
        // Active operation
        if (data.operationId && data.operationId !== state.baselineOperationId) {
            state.operationId = data.operationId;
        }
        // Server-side liveness: a moving heartbeat or progress counts as
        // activity; a record flagged stale is presumed dead and must NOT
        // postpone the stall verdict.
        const moved = data.heartbeatAt !== state.lastHeartbeatAt || data.progress !== state.lastProgress;
        state.lastHeartbeatAt = data.heartbeatAt;
        state.lastProgress = data.progress;
        if (moved && data.stale !== true) {
            state.lastActivityAt = Date.now();
        }
        checkStall();
    };

    const resolveBaseline = () => {
        if (!RESOURCE_ID_PATTERN.test(state.uniqid)) {
            // No resource id to query: rely on operationId capture from nchan
            state.baselineResolved = true;
            return;
        }
        const epoch = state.epoch;
        ModulesAPI.getOperationStatus({ uniqid: state.uniqid }, (data, success) => {
            if (epoch !== state.epoch || state.baselineResolved) {
                return;
            }
            if (!success || !data) {
                return; // retried from tick() until it succeeds
            }
            if (data.terminal === true && data.operationId) {
                const ageSec = Math.floor(Date.now() / 1000) - (data.finishedAt || 0);
                // A just-finished record may already be our own result (fast
                // enable completed before this request landed) — leave the
                // baseline empty so such a record is accepted as ours.
                state.baselineOperationId = ageSec > FRESH_TERMINAL_SEC ? data.operationId : '';
            }
            state.baselineResolved = true;
        });
    };

    const poll = () => {
        if (state.pollBusy) {
            return;
        }
        state.pollBusy = true;
        const epoch = state.epoch;
        if (RESOURCE_ID_PATTERN.test(state.uniqid)) {
            ModulesAPI.getOperationStatus(
                { uniqid: state.uniqid, operationId: state.operationId },
                (data, success) => handleStatus(epoch, data, success)
            );
        } else {
            // Upload fileId flow: query the collection and match by the
            // operationId captured from nchan messages.
            ModulesAPI.getOperations({}, (data, success) => {
                if (!success || !data) {
                    handleStatus(epoch, null, false);
                    return;
                }
                const all = (data.active || []).concat(data.recent || []);
                let match = null;
                if (state.operationId) {
                    match = all.find(op => op.operationId === state.operationId) || null;
                } else {
                    match = (data.active || []).find(op => op.stale !== true) || null;
                }
                handleStatus(epoch, match || { state: 'none' }, true);
            });
        }
    };

    const tick = () => {
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
        start(uniqid) {
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
        notifyEvent(response) {
            if (!response) {
                return;
            }
            const sameOperation = response.operationId !== undefined
                && response.operationId === state.operationId;
            const sameModule = response.moduleUniqueId !== undefined
                && response.moduleUniqueId === state.uniqid;
            if (!sameOperation && !sameModule) {
                return;
            }
            state.lastActivityAt = Date.now();
            if (state.operationId === '' && response.operationId) {
                state.operationId = response.operationId;
            }
        },

        stop,

        isRunning() {
            return state.timer !== null;
        },
    };
};

// Export for use in other modules
window.ModulesAPI = ModulesAPI;
