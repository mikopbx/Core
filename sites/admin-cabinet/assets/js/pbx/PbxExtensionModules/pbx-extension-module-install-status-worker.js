"use strict";

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

/* global globalRootUrl, PbxApi, ModulesAPI, globalTranslate, UserMessage, EventBus */

/**
 * Handles real-time monitoring and updates of module installation statuses.
 * Utilizes server-sent events to receive updates and reflects these changes in the UI,
 * particularly in the progress bar and status messages displayed to the user.
 *
 * @module installStatusLoopWorker
 */
var installStatusLoopWorker = {
  /**
   * The jQuery object representing the progress bar element in the DOM.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $progressBar: null,

  /**
   * The jQuery object for the container of the progress bar.
   * @type {jQuery}
   */
  $progressBarBlock: null,

  /**
   * The jQuery object for the label element associated with the progress bar.
   * @type {jQuery}
   */
  $progressBarLabel: null,

  /**
   * The EventSource object used for receiving real-time updates from the server about module installation statuses.
   * This allows for a push-based mechanism to keep the UI updated with the latest progress information.
   * @type {EventSource}
   */
  eventSource: null,

  /**
   * The identifier for the PUB/SUB channel used to subscribe to installation status updates.
   * This ensures that the client is listening on the correct channel for relevant events.
   */
  channelId: 'install-module',

  /**
   * State of a bulk module update session.
   * @type {Object}
   */
  batchUpdate: {
    active: false,
    batchId: '',
    total: 0,
    completed: new Set(),
    failed: new Set()
  },

  /**
   * Watchdog for a single install/update operation: polls the operations
   * journal when nchan goes silent, so a lost message can no longer freeze
   * the progress bar forever. Created in initialize().
   */
  watchdog: null,

  /**
   * Timestamp of the last batch-related nchan event, driving the batch stall
   * detection in checkBatchAlive().
   */
  batchLastEventAt: 0,

  /**
   * Timer handle of the periodic batch liveness check.
   */
  batchWatchTimer: null,

  /**
   * Initializes the installStatusLoopWorker module by setting up the connection to receive server-sent events.
   */
  initialize: function initialize() {
    installStatusLoopWorker.$progressBar = $('#upload-progress-bar');
    installStatusLoopWorker.$progressBarBlock = $('#upload-progress-bar-block');
    installStatusLoopWorker.$progressBarLabel = $('#upload-progress-bar-label');
    installStatusLoopWorker.watchdog = ModulesAPI.createOperationWatchdog({
      onTerminal: function onTerminal(data) {
        return installStatusLoopWorker.cbWatchdogTerminal(data);
      },
      onStalled: function onStalled() {
        return installStatusLoopWorker.cbWatchdogStalled();
      },
      onProgress: function onProgress(data) {
        return installStatusLoopWorker.cbWatchdogProgress(data);
      }
    });
    EventBus.subscribe(this.channelId, function (data) {
      installStatusLoopWorker.processModuleInstallation(data);
    });
    installStatusLoopWorker.restoreActiveOperations();
  },

  /**
   * Starts the polling fallback for a just-launched install/update.
   * Called by the flows that initiate an operation (repo install, zip upload).
   *
   * @param {string} trackingId - Module unique id (or upload fileId).
   */
  startWatch: function startWatch(trackingId) {
    installStatusLoopWorker.watchdog.start(trackingId);
  },

  /**
   * Restores UI state for operations that are still running on the backend
   * after a page reload: shows the progress bar, locks the action buttons and
   * arms the polling fallback.
   */
  restoreActiveOperations: function restoreActiveOperations() {
    ModulesAPI.getOperations({}, function (data, success) {
      if (!success || !data || !Array.isArray(data.active)) {
        return;
      } // Stale rows belong to crashed operations nobody supervises yet:
      // restoring them would lock the UI with no recovery path. Quick
      // toggle operations (enable/disable) are not worth restoring
      // either — their own watchdog handles the click flow.


      var restorable = data.active.filter(function (op) {
        return op.stale !== true && (op.batchId !== '' || ['install_repo', 'install_package', 'uninstall'].includes(op.operation));
      });

      if (restorable.length === 0) {
        return;
      }

      var op = restorable[0];
      $('a.button').addClass('disabled');

      if (op.batchId) {
        installStatusLoopWorker.batchUpdate.active = true;
        installStatusLoopWorker.batchUpdate.batchId = op.batchId;
        installStatusLoopWorker.batchLastEventAt = Date.now();
        installStatusLoopWorker.armBatchWatch();
        installStatusLoopWorker.updateBatchProgress(Math.max(op.progress, 1));
      } else {
        installStatusLoopWorker.updateProgressBar(op.moduleUniqueId, globalTranslate.ext_InstallationInProgress, Math.max(op.progress, 1));
        installStatusLoopWorker.startWatch(op.moduleUniqueId);
      }
    });
  },

  /**
   * Handles a terminal journal state discovered by polling: the nchan
   * message was lost, but the backend finished the operation.
   *
   * @param {object} data - The journal record from the operations API.
   */
  cbWatchdogTerminal: function cbWatchdogTerminal(data) {
    if (data.state === 'completed') {
      window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
      return;
    }

    installStatusLoopWorker.$progressBarBlock.hide();
    $('tr.table-error-messages').remove();
    $('a.button').removeClass('disabled');
    $('#add-new-button').removeClass('loading');
    var $row = $("tr[data-id=".concat(data.moduleUniqueId, "]"));
    installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, data.errorMessages);
  },

  /**
   * Moves the progress bar by the journal progress: the install pipeline
   * notifies the browser only at stage boundaries. Never moves the bar back —
   * the zip upload already drew its own percent before the pipeline started.
   *
   * @param {object} data - The active journal record from the operations API.
   */
  cbWatchdogProgress: function cbWatchdogProgress(data) {
    var current = installStatusLoopWorker.$progressBar.progress('get percent') || 0;

    if (data.progress <= current) {
      return;
    }

    var headers = {
      Stage_I_UploadModule: globalTranslate.ext_UploadInProgress,
      Stage_IV_DownloadModule: globalTranslate.ext_DownloadInProgress,
      Stage_V_InstallModule: globalTranslate.ext_InstallationInProgress
    };
    installStatusLoopWorker.updateProgressBar(data.moduleUniqueId, headers[data.stage], data.progress);
  },

  /**
   * Handles a stalled operation: no nchan events and no journal progress
   * for several minutes.
   */
  cbWatchdogStalled: function cbWatchdogStalled() {
    installStatusLoopWorker.$progressBarBlock.hide();
    $('a.button').removeClass('disabled');
    $('#add-new-button').removeClass('loading');
    UserMessage.showMultiString(globalTranslate.ext_OperationStalledError || globalTranslate.ext_InstallationError, globalTranslate.ext_InstallationError);
  },

  /**
   * Arms the periodic liveness check of a batch update.
   */
  armBatchWatch: function armBatchWatch() {
    if (installStatusLoopWorker.batchWatchTimer !== null) {
      return;
    }

    installStatusLoopWorker.batchWatchTimer = setInterval(installStatusLoopWorker.checkBatchAlive, 15000);
  },

  /**
   * Disarms the batch liveness check.
   */
  disarmBatchWatch: function disarmBatchWatch() {
    if (installStatusLoopWorker.batchWatchTimer !== null) {
      clearInterval(installStatusLoopWorker.batchWatchTimer);
      installStatusLoopWorker.batchWatchTimer = null;
    }
  },

  /**
   * Checks whether a batch update is still alive: after a minute of nchan
   * silence asks the operations journal, and when no active operation is
   * left the batch is declared dead — the UI is unlocked instead of
   * spinning forever.
   */
  checkBatchAlive: function checkBatchAlive() {
    if (!installStatusLoopWorker.batchUpdate.active) {
      installStatusLoopWorker.disarmBatchWatch();
      return;
    }

    if (Date.now() - installStatusLoopWorker.batchLastEventAt < 60000) {
      return;
    }

    ModulesAPI.getOperations({}, function (data, success) {
      if (!success || !data || !installStatusLoopWorker.batchUpdate.active) {
        return;
      } // With nchan dead from the very start the batchId was never
      // learned from events — pick it up from the journal so the
      // completion check below can match history records.


      if (installStatusLoopWorker.batchUpdate.batchId === '') {
        var seen = (data.active || []).find(function (op) {
          return op.batchId !== '';
        });

        if (seen !== undefined) {
          installStatusLoopWorker.batchUpdate.batchId = seen.batchId;
        }
      } // A stale active row is a crashed operation, not a live one


      var alive = (data.active || []).some(function (op) {
        return op.stale !== true;
      });

      if (alive) {
        return; // something is genuinely running server-side
      }

      installStatusLoopWorker.disarmBatchWatch();
      var trackedBatchId = installStatusLoopWorker.batchUpdate.batchId;
      installStatusLoopWorker.resetBatchUpdate();
      installStatusLoopWorker.$progressBarBlock.hide();
      $('a.button').removeClass('disabled'); // The BatchFinished nchan message may simply have been lost while
      // every module finished fine — check the journal history before
      // declaring the batch dead.

      var batchOps = (data.recent || []).filter(function (op) {
        return trackedBatchId !== '' && op.batchId === trackedBatchId;
      });
      var allCompleted = batchOps.length > 0 && batchOps.every(function (op) {
        return op.state === 'completed';
      });

      if (allCompleted) {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
        return;
      }

      UserMessage.showMultiString(globalTranslate.ext_OperationStalledError || globalTranslate.ext_InstallationError, globalTranslate.ext_InstallationError);
    });
  },

  /**
   * Processes incoming server-sent events related to module installation.
   * Updates the UI based on the current stage of installation, download, upload, or error states.
   *
   * @param {Object} response - The data payload of the server-sent event, containing details about the installation stage and progress.
   */
  processModuleInstallation: function processModuleInstallation(response) {
    installStatusLoopWorker.saveMessage(response);
    installStatusLoopWorker.watchdog.notifyEvent(response);

    if (installStatusLoopWorker.processBatchEvent(response)) {
      return;
    }

    var moduleUniqueId = response.moduleUniqueId;
    var stage = response.stage;
    var stageDetails = response.stageDetails || {};
    var $row = $("tr[data-id=".concat(moduleUniqueId, "]"));

    if (stage === 'Stage_I_GetRelease') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_GetReleaseInProgress, 1);
    } else if (stage === 'Stage_II_CheckLicense') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_CheckLicenseInProgress, 2);
    } else if (stage === 'Stage_III_GetDownloadLink') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_CheckLicenseInProgress, 3);
    } else if (stage === 'Stage_IV_DownloadModule') {
      installStatusLoopWorker.cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails, $row);
    } else if (stage === 'Stage_I_UploadModule') {
      installStatusLoopWorker.cbAfterReceiveNewUploadStatus(moduleUniqueId, stageDetails);
    } else if (stage === 'Stage_V_InstallModule') {
      installStatusLoopWorker.cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails);
    } else if (stage === 'Stage_VI_EnableModule') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 99);
    } else if (stage === 'Stage_VII_FinalStatus') {
      if (response.batchMode === true || response.batchId !== undefined) {
        return;
      }

      installStatusLoopWorker.watchdog.stop();

      if (stageDetails.result === false) {
        installStatusLoopWorker.$progressBarBlock.hide();

        if (stageDetails.messages !== undefined) {
          installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
        } else {
          installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
        }
      } else {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
      }
    }
  },
  saveMessage: function saveMessage(message) {
    // Получаем текущую историю
    var history = JSON.parse(localStorage.getItem('wsModuleInstallationHistory') || '[]'); // Добавляем новое сообщение

    history.push({
      timestamp: new Date().toISOString(),
      message: message
    }); // Ограничиваем размер истории (например, до 100 сообщений)

    if (history.length > 100) {
      history = history.slice(history.length - 100);
    } // Сохраняем обновленную историю


    localStorage.setItem('wsHistory', JSON.stringify(history));
  },

  /**
   * Starts local UI tracking for a batch update.
   * @param {Array<string>} modulesForUpdate
   */
  startBatchUpdate: function startBatchUpdate(modulesForUpdate) {
    installStatusLoopWorker.batchUpdate = {
      active: true,
      batchId: '',
      total: modulesForUpdate.length,
      completed: new Set(),
      failed: new Set()
    };
    installStatusLoopWorker.batchLastEventAt = Date.now();
    installStatusLoopWorker.armBatchWatch();
    installStatusLoopWorker.$progressBarBlock.show();
    installStatusLoopWorker.$progressBar.show();
    installStatusLoopWorker.$progressBarLabel.text(globalTranslate.ext_UpdateAllModulesTitle);
    installStatusLoopWorker.$progressBar.progress({
      percent: 1
    });
  },

  /**
   * Stops local UI tracking for a batch update.
   */
  resetBatchUpdate: function resetBatchUpdate() {
    installStatusLoopWorker.batchUpdate = {
      active: false,
      batchId: '',
      total: 0,
      completed: new Set(),
      failed: new Set()
    };
  },

  /**
   * Process server-side batch update events.
   * @param {Object} response
   * @returns {boolean}
   */
  processBatchEvent: function processBatchEvent(response) {
    if (response.batchMode !== true && response.batchId === undefined) {
      return false;
    }

    installStatusLoopWorker.batchLastEventAt = Date.now();
    var stage = response.stage;
    var stageDetails = response.stageDetails || {};
    var batch = installStatusLoopWorker.batchUpdate;

    if (stage === 'BatchStarted') {
      batch.active = true;
      batch.batchId = response.batchId || '';
      batch.total = stageDetails.total || batch.total;
      installStatusLoopWorker.updateBatchProgress(stageDetails.total > 0 ? 1 : 0);
      return true;
    }

    if (stage === 'BatchModuleStarted') {
      batch.active = true;
      batch.batchId = response.batchId || batch.batchId;
      batch.total = stageDetails.total || batch.total;
      installStatusLoopWorker.updateBatchProgress(installStatusLoopWorker.calculateBatchPercent(stageDetails.current || 1, batch.total));
      return true;
    }

    if (stage === 'BatchModuleCompleted') {
      batch.completed.add(stageDetails.moduleUniqueId || response.moduleUniqueId);
      installStatusLoopWorker.updateBatchProgress(installStatusLoopWorker.calculateBatchPercent(stageDetails.current || batch.completed.size, batch.total));
      return true;
    }

    if (stage === 'BatchModuleFailed') {
      var moduleUniqueId = stageDetails.moduleUniqueId || response.moduleUniqueId;
      batch.failed.add(moduleUniqueId);
      installStatusLoopWorker.updateBatchProgress(installStatusLoopWorker.calculateBatchPercent(stageDetails.current || batch.completed.size + batch.failed.size, batch.total));

      if (stageDetails.messages !== undefined) {
        var $row = $("tr[data-id=".concat(moduleUniqueId, "]"));
        installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
      }

      return true;
    }

    if (stage === 'BatchFinished') {
      // Ignore stragglers from a previous batch (e.g., user re-triggered Update All).
      if (batch.batchId !== '' && response.batchId && response.batchId !== batch.batchId) {
        return true;
      }

      installStatusLoopWorker.disarmBatchWatch();
      installStatusLoopWorker.updateBatchProgress(100);
      installStatusLoopWorker.resetBatchUpdate();

      if (stageDetails.result === false) {
        $('a.button').removeClass('disabled');
        installStatusLoopWorker.$progressBarBlock.hide();
        return true;
      }

      window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
      return true;
    }

    return false;
  },

  /**
   * Calculates aggregate batch progress.
   * @param {number} current
   * @param {number} total
   * @returns {number}
   */
  calculateBatchPercent: function calculateBatchPercent(current, total) {
    if (total <= 0) {
      return 1;
    }

    return Math.min(Math.max(Math.round((current - 1) / total * 100), 1), 99);
  },

  /**
   * Updates the aggregate batch progress bar.
   * @param {number} percent
   */
  updateBatchProgress: function updateBatchProgress(percent) {
    installStatusLoopWorker.$progressBarBlock.show();
    installStatusLoopWorker.$progressBar.show();
    installStatusLoopWorker.$progressBarLabel.text(globalTranslate.ext_UpdateAllModulesTitle);
    installStatusLoopWorker.$progressBar.progress({
      percent: percent
    });
  },

  /**
   * Updates the UI to reflect the progress of a module download.
   * Adjusts the progress bar and status message based on the details provided in the server-sent event.
   *
   * @param {string} moduleUniqueId - The unique identifier of the module being downloaded.
   * @param {Object} stageDetails - Detailed information about the download progress.
   * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
   */
  cbAfterReceiveNewDownloadStatus: function cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails, $row) {
    // Some events (e.g. an error raised before the download started) arrive without `data`
    var data = stageDetails.data || {}; // Check module download status

    if (data.d_status === 'DOWNLOAD_IN_PROGRESS') {
      var downloadProgress = Math.max(Math.round(parseInt(data.d_status_progress, 10) / 2) - 1, 3);
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, downloadProgress);
    } else if (data.d_status === 'DOWNLOAD_COMPLETE') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, 50);
    } else if (stageDetails.result === true && stageDetails.data === undefined) {
      // Install pipeline: bare stage boundary without download details
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 50);
    } else if (data.d_status === 'DOWNLOAD_ERROR') {
      installStatusLoopWorker.$progressBarBlock.hide();

      if (stageDetails.messages !== undefined) {
        installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
      } else {
        installStatusLoopWorker.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
      }
    }
  },

  /**
   * Updates the UI to reflect the progress of a module upload.
   * Adjusts the progress bar and status message based on the details provided in the server-sent event.
   *
   * @param {string} moduleUniqueId - The unique identifier of the module being uploaded.
   * @param {Object} stageDetails - Detailed information about the upload progress.
   */
  cbAfterReceiveNewUploadStatus: function cbAfterReceiveNewUploadStatus(moduleUniqueId, stageDetails) {
    // Some events (e.g. an error raised before the upload started) arrive without `data`
    var data = stageDetails.data || {}; // Check module upload status

    if (data.d_status === 'UPLOAD_IN_PROGRESS') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, 49);
    } else if (data.d_status === 'UPLOAD_COMPLETE') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, 50);
    } else if (stageDetails.result === true && stageDetails.data === undefined) {
      // Install pipeline: bare stage boundary without upload details
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 50);
    }
  },

  /**
   * Handles updates on the installation progress of a module.
   * Updates the progress bar and status message based on the information received in the server-sent event.
   *
   * @param {string} moduleUniqueId - The unique identifier of the module being installed.
   * @param {Object} stageDetails - Detailed information about the installation progress.
   */
  cbAfterReceiveNewInstallationStatus: function cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails) {
    // Some events (e.g. an error raised before the installation started) arrive without `data`
    var data = stageDetails.data || {}; // Check module installation status

    if (data.i_status === 'INSTALLATION_IN_PROGRESS') {
      var installationProgress = Math.round(parseInt(data.i_status_progress, 10) / 2 + 50);
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, installationProgress);
    } else if (data.i_status === 'INSTALLATION_COMPLETE') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 98);
    } else if (stageDetails.result === true && stageDetails.data === undefined) {
      // Install pipeline: bare stage boundary without installation details;
      // the legacy flow sends result:true with data at the START of this stage
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, 98);
    }
  },

  /**
   * Resets the UI elements associated with a module row to their default state.
   * This is typically called after an installation process completes or fails.
   *
   * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
   */
  resetButtonView: function resetButtonView($row) {
    $('a.button').removeClass('disabled');
    $row.find('i.loading').removeClass('spinner loading');
    $row.find('a.download i').addClass('download');
    $row.find('a.update i').addClass('redo');
  },

  /**
   * Displays an error message related to module installation in the UI.
   * This function is called when an installation fails, providing feedback to the user.
   *
   * @param {jQuery} $row - The jQuery object representing the row in the UI associated with the module.
   * @param {string} header - The header text for the error message.
   * @param {Object} messages - Detailed error messages to be displayed.
   */
  showModuleInstallationError: function showModuleInstallationError($row, header) {
    var messages = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

    if (messages === undefined) {
      return;
    }

    if ($row.length === 0) {
      UserMessage.showMultiString(messages, header);
      $('#add-new-button').removeClass('loading');
      return;
    }

    installStatusLoopWorker.resetButtonView($row);

    if (messages.license !== undefined) {
      var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"").concat(Config.keyManagementUrl, "\" target=\"_blank\">").concat(Config.keyManagementSite, "</a>");
      messages.license.push(manageLink);
    }

    var textDescription = UserMessage.convertToText(messages);
    var htmlMessage = "<tr class=\"ui warning table-error-messages\">\n                                        <td colspan=\"5\">\n                                        <div class=\"ui center aligned icon header\">\n                                        <i class=\"exclamation triangle icon\"></i>\n                                          <div class=\"content\">\n                                            ".concat(header, "\n                                          </div>\n                                        </div>\n                                            <p>").concat(textDescription, "</p>\n                                        </div>\n                                        </td>\n                                    </tr>");
    $row.addClass('warning');
    $row.before(htmlMessage);
    $('html, body').animate({
      scrollTop: $row.offset().top
    }, 2000);
  },

  /**
   * Updates the progress bar and status message to reflect the current state of a module installation process.
   * This function is used throughout different stages of installation to provide real-time feedback to the user.
   *
   * @param {string} moduleUniqueId - The unique identifier of the module.
   * @param {string} header - The status message to be displayed above the progress bar.
   * @param {number} [percent=0] - The current progress percentage to be reflected in the progress bar.
   */
  updateProgressBar: function updateProgressBar(moduleUniqueId, header) {
    var percent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    if (moduleUniqueId === undefined || moduleUniqueId === '') {
      return;
    }

    var moduleName = $("tr.new-module-row[data-id=".concat(moduleUniqueId, "]")).data('name');

    if (moduleName === undefined) {
      moduleName = '';
    }

    installStatusLoopWorker.$progressBarBlock.show();
    installStatusLoopWorker.$progressBar.show();

    if (header) {
      var barText = moduleName + ': ' + header;
      installStatusLoopWorker.$progressBarLabel.text(barText);
    }

    if (percent > 0) {
      installStatusLoopWorker.$progressBar.progress({
        percent: percent
      });
    }
  }
}; // Initializes the installStatusLoopWorker module when the DOM is fully loaded.

$(document).ready(function () {
  installStatusLoopWorker.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluc3RhbGwtc3RhdHVzLXdvcmtlci5qcyJdLCJuYW1lcyI6WyJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckJsb2NrIiwiJHByb2dyZXNzQmFyTGFiZWwiLCJldmVudFNvdXJjZSIsImNoYW5uZWxJZCIsImJhdGNoVXBkYXRlIiwiYWN0aXZlIiwiYmF0Y2hJZCIsInRvdGFsIiwiY29tcGxldGVkIiwiU2V0IiwiZmFpbGVkIiwid2F0Y2hkb2ciLCJiYXRjaExhc3RFdmVudEF0IiwiYmF0Y2hXYXRjaFRpbWVyIiwiaW5pdGlhbGl6ZSIsIiQiLCJNb2R1bGVzQVBJIiwiY3JlYXRlT3BlcmF0aW9uV2F0Y2hkb2ciLCJvblRlcm1pbmFsIiwiZGF0YSIsImNiV2F0Y2hkb2dUZXJtaW5hbCIsIm9uU3RhbGxlZCIsImNiV2F0Y2hkb2dTdGFsbGVkIiwib25Qcm9ncmVzcyIsImNiV2F0Y2hkb2dQcm9ncmVzcyIsIkV2ZW50QnVzIiwic3Vic2NyaWJlIiwicHJvY2Vzc01vZHVsZUluc3RhbGxhdGlvbiIsInJlc3RvcmVBY3RpdmVPcGVyYXRpb25zIiwic3RhcnRXYXRjaCIsInRyYWNraW5nSWQiLCJzdGFydCIsImdldE9wZXJhdGlvbnMiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwicmVzdG9yYWJsZSIsImZpbHRlciIsIm9wIiwic3RhbGUiLCJpbmNsdWRlcyIsIm9wZXJhdGlvbiIsImxlbmd0aCIsImFkZENsYXNzIiwiRGF0ZSIsIm5vdyIsImFybUJhdGNoV2F0Y2giLCJ1cGRhdGVCYXRjaFByb2dyZXNzIiwiTWF0aCIsIm1heCIsInByb2dyZXNzIiwidXBkYXRlUHJvZ3Jlc3NCYXIiLCJtb2R1bGVVbmlxdWVJZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9JbnN0YWxsYXRpb25JblByb2dyZXNzIiwic3RhdGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJoaWRlIiwicmVtb3ZlIiwicmVtb3ZlQ2xhc3MiLCIkcm93Iiwic2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yIiwiZXh0X0luc3RhbGxhdGlvbkVycm9yIiwiZXJyb3JNZXNzYWdlcyIsImN1cnJlbnQiLCJoZWFkZXJzIiwiU3RhZ2VfSV9VcGxvYWRNb2R1bGUiLCJleHRfVXBsb2FkSW5Qcm9ncmVzcyIsIlN0YWdlX0lWX0Rvd25sb2FkTW9kdWxlIiwiZXh0X0Rvd25sb2FkSW5Qcm9ncmVzcyIsIlN0YWdlX1ZfSW5zdGFsbE1vZHVsZSIsInN0YWdlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfT3BlcmF0aW9uU3RhbGxlZEVycm9yIiwic2V0SW50ZXJ2YWwiLCJjaGVja0JhdGNoQWxpdmUiLCJkaXNhcm1CYXRjaFdhdGNoIiwiY2xlYXJJbnRlcnZhbCIsInNlZW4iLCJmaW5kIiwidW5kZWZpbmVkIiwiYWxpdmUiLCJzb21lIiwidHJhY2tlZEJhdGNoSWQiLCJyZXNldEJhdGNoVXBkYXRlIiwiYmF0Y2hPcHMiLCJyZWNlbnQiLCJhbGxDb21wbGV0ZWQiLCJldmVyeSIsInJlc3BvbnNlIiwic2F2ZU1lc3NhZ2UiLCJub3RpZnlFdmVudCIsInByb2Nlc3NCYXRjaEV2ZW50Iiwic3RhZ2VEZXRhaWxzIiwiZXh0X0dldFJlbGVhc2VJblByb2dyZXNzIiwiZXh0X0NoZWNrTGljZW5zZUluUHJvZ3Jlc3MiLCJjYkFmdGVyUmVjZWl2ZU5ld0Rvd25sb2FkU3RhdHVzIiwiY2JBZnRlclJlY2VpdmVOZXdVcGxvYWRTdGF0dXMiLCJjYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyIsImJhdGNoTW9kZSIsInN0b3AiLCJyZXN1bHQiLCJtZXNzYWdlcyIsIm1lc3NhZ2UiLCJoaXN0b3J5IiwiSlNPTiIsInBhcnNlIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsInB1c2giLCJ0aW1lc3RhbXAiLCJ0b0lTT1N0cmluZyIsInNsaWNlIiwic2V0SXRlbSIsInN0cmluZ2lmeSIsInN0YXJ0QmF0Y2hVcGRhdGUiLCJtb2R1bGVzRm9yVXBkYXRlIiwic2hvdyIsInRleHQiLCJleHRfVXBkYXRlQWxsTW9kdWxlc1RpdGxlIiwicGVyY2VudCIsImJhdGNoIiwiY2FsY3VsYXRlQmF0Y2hQZXJjZW50IiwiYWRkIiwic2l6ZSIsIm1pbiIsInJvdW5kIiwiZF9zdGF0dXMiLCJkb3dubG9hZFByb2dyZXNzIiwicGFyc2VJbnQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImlfc3RhdHVzIiwiaW5zdGFsbGF0aW9uUHJvZ3Jlc3MiLCJpX3N0YXR1c19wcm9ncmVzcyIsInJlc2V0QnV0dG9uVmlldyIsImhlYWRlciIsImxpY2Vuc2UiLCJtYW5hZ2VMaW5rIiwibGljX01hbmFnZUxpY2Vuc2UiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwia2V5TWFuYWdlbWVudFNpdGUiLCJ0ZXh0RGVzY3JpcHRpb24iLCJjb252ZXJ0VG9UZXh0IiwiaHRtbE1lc3NhZ2UiLCJiZWZvcmUiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwibW9kdWxlTmFtZSIsImJhclRleHQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx1QkFBdUIsR0FBRztBQUM1QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQU5jOztBQVE1QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQVpTOztBQWM1QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQWxCUzs7QUFvQjVCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7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QjtBQUNBNUksTUFBQUEsdUJBQXVCLENBQUNHLGlCQUF4QixDQUEwQ3dILElBQTFDLENBQStDaUMsT0FBL0M7QUFDSDs7QUFDRCxRQUFJL0IsT0FBTyxHQUFDLENBQVosRUFBYztBQUNWN0gsTUFBQUEsdUJBQXVCLENBQUNDLFlBQXhCLENBQXFDbUQsUUFBckMsQ0FBOEM7QUFDMUN5RSxRQUFBQSxPQUFPLEVBQUVBO0FBRGlDLE9BQTlDO0FBR0g7QUFDSjtBQXJuQjJCLENBQWhDLEMsQ0F3bkJBOztBQUNBNUcsQ0FBQyxDQUFDNEksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlKLEVBQUFBLHVCQUF1QixDQUFDZ0IsVUFBeEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgTW9kdWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXZlbnRCdXMgKi9cblxuLyoqXG4gKiBIYW5kbGVzIHJlYWwtdGltZSBtb25pdG9yaW5nIGFuZCB1cGRhdGVzIG9mIG1vZHVsZSBpbnN0YWxsYXRpb24gc3RhdHVzZXMuXG4gKiBVdGlsaXplcyBzZXJ2ZXItc2VudCBldmVudHMgdG8gcmVjZWl2ZSB1cGRhdGVzIGFuZCByZWZsZWN0cyB0aGVzZSBjaGFuZ2VzIGluIHRoZSBVSSxcbiAqIHBhcnRpY3VsYXJseSBpbiB0aGUgcHJvZ3Jlc3MgYmFyIGFuZCBzdGF0dXMgbWVzc2FnZXMgZGlzcGxheWVkIHRvIHRoZSB1c2VyLlxuICpcbiAqIEBtb2R1bGUgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXJcbiAqL1xuY29uc3QgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBwcm9ncmVzcyBiYXIgZWxlbWVudCBpbiB0aGUgRE9NLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY29udGFpbmVyIG9mIHRoZSBwcm9ncmVzcyBiYXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJCbG9jazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbGFiZWwgZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhckxhYmVsOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIEV2ZW50U291cmNlIG9iamVjdCB1c2VkIGZvciByZWNlaXZpbmcgcmVhbC10aW1lIHVwZGF0ZXMgZnJvbSB0aGUgc2VydmVyIGFib3V0IG1vZHVsZSBpbnN0YWxsYXRpb24gc3RhdHVzZXMuXG4gICAgICogVGhpcyBhbGxvd3MgZm9yIGEgcHVzaC1iYXNlZCBtZWNoYW5pc20gdG8ga2VlcCB0aGUgVUkgdXBkYXRlZCB3aXRoIHRoZSBsYXRlc3QgcHJvZ3Jlc3MgaW5mb3JtYXRpb24uXG4gICAgICogQHR5cGUge0V2ZW50U291cmNlfVxuICAgICAqL1xuICAgIGV2ZW50U291cmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGlkZW50aWZpZXIgZm9yIHRoZSBQVUIvU1VCIGNoYW5uZWwgdXNlZCB0byBzdWJzY3JpYmUgdG8gaW5zdGFsbGF0aW9uIHN0YXR1cyB1cGRhdGVzLlxuICAgICAqIFRoaXMgZW5zdXJlcyB0aGF0IHRoZSBjbGllbnQgaXMgbGlzdGVuaW5nIG9uIHRoZSBjb3JyZWN0IGNoYW5uZWwgZm9yIHJlbGV2YW50IGV2ZW50cy5cbiAgICAgKi9cbiAgICBjaGFubmVsSWQ6ICdpbnN0YWxsLW1vZHVsZScsXG5cbiAgICAvKipcbiAgICAgKiBTdGF0ZSBvZiBhIGJ1bGsgbW9kdWxlIHVwZGF0ZSBzZXNzaW9uLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgYmF0Y2hVcGRhdGU6IHtcbiAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgYmF0Y2hJZDogJycsXG4gICAgICAgIHRvdGFsOiAwLFxuICAgICAgICBjb21wbGV0ZWQ6IG5ldyBTZXQoKSxcbiAgICAgICAgZmFpbGVkOiBuZXcgU2V0KCksXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFdhdGNoZG9nIGZvciBhIHNpbmdsZSBpbnN0YWxsL3VwZGF0ZSBvcGVyYXRpb246IHBvbGxzIHRoZSBvcGVyYXRpb25zXG4gICAgICogam91cm5hbCB3aGVuIG5jaGFuIGdvZXMgc2lsZW50LCBzbyBhIGxvc3QgbWVzc2FnZSBjYW4gbm8gbG9uZ2VyIGZyZWV6ZVxuICAgICAqIHRoZSBwcm9ncmVzcyBiYXIgZm9yZXZlci4gQ3JlYXRlZCBpbiBpbml0aWFsaXplKCkuXG4gICAgICovXG4gICAgd2F0Y2hkb2c6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lc3RhbXAgb2YgdGhlIGxhc3QgYmF0Y2gtcmVsYXRlZCBuY2hhbiBldmVudCwgZHJpdmluZyB0aGUgYmF0Y2ggc3RhbGxcbiAgICAgKiBkZXRlY3Rpb24gaW4gY2hlY2tCYXRjaEFsaXZlKCkuXG4gICAgICovXG4gICAgYmF0Y2hMYXN0RXZlbnRBdDogMCxcblxuICAgIC8qKlxuICAgICAqIFRpbWVyIGhhbmRsZSBvZiB0aGUgcGVyaW9kaWMgYmF0Y2ggbGl2ZW5lc3MgY2hlY2suXG4gICAgICovXG4gICAgYmF0Y2hXYXRjaFRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxTdGF0dXNMb29wV29ya2VyIG1vZHVsZSBieSBzZXR0aW5nIHVwIHRoZSBjb25uZWN0aW9uIHRvIHJlY2VpdmUgc2VydmVyLXNlbnQgZXZlbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKXtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyID0gJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2sgPSAkKCcjdXBsb2FkLXByb2dyZXNzLWJhci1ibG9jaycpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbCA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWxhYmVsJyk7XG5cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIud2F0Y2hkb2cgPSBNb2R1bGVzQVBJLmNyZWF0ZU9wZXJhdGlvbldhdGNoZG9nKHtcbiAgICAgICAgICAgIG9uVGVybWluYWw6IGRhdGEgPT4gaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2JXYXRjaGRvZ1Rlcm1pbmFsKGRhdGEpLFxuICAgICAgICAgICAgb25TdGFsbGVkOiAoKSA9PiBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYldhdGNoZG9nU3RhbGxlZCgpLFxuICAgICAgICAgICAgb25Qcm9ncmVzczogZGF0YSA9PiBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYldhdGNoZG9nUHJvZ3Jlc3MoZGF0YSksXG4gICAgICAgIH0pO1xuXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZSh0aGlzLmNoYW5uZWxJZCwgZGF0YSA9PiB7XG4gICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnByb2Nlc3NNb2R1bGVJbnN0YWxsYXRpb24oZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnJlc3RvcmVBY3RpdmVPcGVyYXRpb25zKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyB0aGUgcG9sbGluZyBmYWxsYmFjayBmb3IgYSBqdXN0LWxhdW5jaGVkIGluc3RhbGwvdXBkYXRlLlxuICAgICAqIENhbGxlZCBieSB0aGUgZmxvd3MgdGhhdCBpbml0aWF0ZSBhbiBvcGVyYXRpb24gKHJlcG8gaW5zdGFsbCwgemlwIHVwbG9hZCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHJhY2tpbmdJZCAtIE1vZHVsZSB1bmlxdWUgaWQgKG9yIHVwbG9hZCBmaWxlSWQpLlxuICAgICAqL1xuICAgIHN0YXJ0V2F0Y2godHJhY2tpbmdJZCkge1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci53YXRjaGRvZy5zdGFydCh0cmFja2luZ0lkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZXMgVUkgc3RhdGUgZm9yIG9wZXJhdGlvbnMgdGhhdCBhcmUgc3RpbGwgcnVubmluZyBvbiB0aGUgYmFja2VuZFxuICAgICAqIGFmdGVyIGEgcGFnZSByZWxvYWQ6IHNob3dzIHRoZSBwcm9ncmVzcyBiYXIsIGxvY2tzIHRoZSBhY3Rpb24gYnV0dG9ucyBhbmRcbiAgICAgKiBhcm1zIHRoZSBwb2xsaW5nIGZhbGxiYWNrLlxuICAgICAqL1xuICAgIHJlc3RvcmVBY3RpdmVPcGVyYXRpb25zKCkge1xuICAgICAgICBNb2R1bGVzQVBJLmdldE9wZXJhdGlvbnMoe30sIChkYXRhLCBzdWNjZXNzKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgIWRhdGEgfHwgIUFycmF5LmlzQXJyYXkoZGF0YS5hY3RpdmUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3RhbGUgcm93cyBiZWxvbmcgdG8gY3Jhc2hlZCBvcGVyYXRpb25zIG5vYm9keSBzdXBlcnZpc2VzIHlldDpcbiAgICAgICAgICAgIC8vIHJlc3RvcmluZyB0aGVtIHdvdWxkIGxvY2sgdGhlIFVJIHdpdGggbm8gcmVjb3ZlcnkgcGF0aC4gUXVpY2tcbiAgICAgICAgICAgIC8vIHRvZ2dsZSBvcGVyYXRpb25zIChlbmFibGUvZGlzYWJsZSkgYXJlIG5vdCB3b3J0aCByZXN0b3JpbmdcbiAgICAgICAgICAgIC8vIGVpdGhlciDigJQgdGhlaXIgb3duIHdhdGNoZG9nIGhhbmRsZXMgdGhlIGNsaWNrIGZsb3cuXG4gICAgICAgICAgICBjb25zdCByZXN0b3JhYmxlID0gZGF0YS5hY3RpdmUuZmlsdGVyKFxuICAgICAgICAgICAgICAgIG9wID0+IG9wLnN0YWxlICE9PSB0cnVlXG4gICAgICAgICAgICAgICAgICAgICYmIChvcC5iYXRjaElkICE9PSAnJyB8fCBbJ2luc3RhbGxfcmVwbycsICdpbnN0YWxsX3BhY2thZ2UnLCAndW5pbnN0YWxsJ10uaW5jbHVkZXMob3Aub3BlcmF0aW9uKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAocmVzdG9yYWJsZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBvcCA9IHJlc3RvcmFibGVbMF07XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaWYgKG9wLmJhdGNoSWQpIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZS5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlLmJhdGNoSWQgPSBvcC5iYXRjaElkO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoTGFzdEV2ZW50QXQgPSBEYXRlLm5vdygpO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmFybUJhdGNoV2F0Y2goKTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKE1hdGgubWF4KG9wLnByb2dyZXNzLCAxKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKFxuICAgICAgICAgICAgICAgICAgICBvcC5tb2R1bGVVbmlxdWVJZCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25JblByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBNYXRoLm1heChvcC5wcm9ncmVzcywgMSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnN0YXJ0V2F0Y2gob3AubW9kdWxlVW5pcXVlSWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBhIHRlcm1pbmFsIGpvdXJuYWwgc3RhdGUgZGlzY292ZXJlZCBieSBwb2xsaW5nOiB0aGUgbmNoYW5cbiAgICAgKiBtZXNzYWdlIHdhcyBsb3N0LCBidXQgdGhlIGJhY2tlbmQgZmluaXNoZWQgdGhlIG9wZXJhdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gVGhlIGpvdXJuYWwgcmVjb3JkIGZyb20gdGhlIG9wZXJhdGlvbnMgQVBJLlxuICAgICAqL1xuICAgIGNiV2F0Y2hkb2dUZXJtaW5hbChkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhLnN0YXRlID09PSAnY29tcGxldGVkJykge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJCbG9jay5oaWRlKCk7XG4gICAgICAgICQoJ3RyLnRhYmxlLWVycm9yLW1lc3NhZ2VzJykucmVtb3ZlKCk7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICQoJyNhZGQtbmV3LWJ1dHRvbicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7ZGF0YS5tb2R1bGVVbmlxdWVJZH1dYCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcihcbiAgICAgICAgICAgICRyb3csXG4gICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLFxuICAgICAgICAgICAgZGF0YS5lcnJvck1lc3NhZ2VzXG4gICAgICAgICk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1vdmVzIHRoZSBwcm9ncmVzcyBiYXIgYnkgdGhlIGpvdXJuYWwgcHJvZ3Jlc3M6IHRoZSBpbnN0YWxsIHBpcGVsaW5lXG4gICAgICogbm90aWZpZXMgdGhlIGJyb3dzZXIgb25seSBhdCBzdGFnZSBib3VuZGFyaWVzLiBOZXZlciBtb3ZlcyB0aGUgYmFyIGJhY2sg4oCUXG4gICAgICogdGhlIHppcCB1cGxvYWQgYWxyZWFkeSBkcmV3IGl0cyBvd24gcGVyY2VudCBiZWZvcmUgdGhlIHBpcGVsaW5lIHN0YXJ0ZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFRoZSBhY3RpdmUgam91cm5hbCByZWNvcmQgZnJvbSB0aGUgb3BlcmF0aW9ucyBBUEkuXG4gICAgICovXG4gICAgY2JXYXRjaGRvZ1Byb2dyZXNzKGRhdGEpIHtcbiAgICAgICAgY29uc3QgY3VycmVudCA9IGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5wcm9ncmVzcygnZ2V0IHBlcmNlbnQnKSB8fCAwO1xuICAgICAgICBpZiAoZGF0YS5wcm9ncmVzcyA8PSBjdXJyZW50KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgIFN0YWdlX0lfVXBsb2FkTW9kdWxlOiBnbG9iYWxUcmFuc2xhdGUuZXh0X1VwbG9hZEluUHJvZ3Jlc3MsXG4gICAgICAgICAgICBTdGFnZV9JVl9Eb3dubG9hZE1vZHVsZTogZ2xvYmFsVHJhbnNsYXRlLmV4dF9Eb3dubG9hZEluUHJvZ3Jlc3MsXG4gICAgICAgICAgICBTdGFnZV9WX0luc3RhbGxNb2R1bGU6IGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcyxcbiAgICAgICAgfTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIoZGF0YS5tb2R1bGVVbmlxdWVJZCwgaGVhZGVyc1tkYXRhLnN0YWdlXSwgZGF0YS5wcm9ncmVzcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgYSBzdGFsbGVkIG9wZXJhdGlvbjogbm8gbmNoYW4gZXZlbnRzIGFuZCBubyBqb3VybmFsIHByb2dyZXNzXG4gICAgICogZm9yIHNldmVyYWwgbWludXRlcy5cbiAgICAgKi9cbiAgICBjYldhdGNoZG9nU3RhbGxlZCgpIHtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoXG4gICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXh0X09wZXJhdGlvblN0YWxsZWRFcnJvciB8fCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLFxuICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvclxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcm1zIHRoZSBwZXJpb2RpYyBsaXZlbmVzcyBjaGVjayBvZiBhIGJhdGNoIHVwZGF0ZS5cbiAgICAgKi9cbiAgICBhcm1CYXRjaFdhdGNoKCkge1xuICAgICAgICBpZiAoaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hXYXRjaFRpbWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hXYXRjaFRpbWVyID0gc2V0SW50ZXJ2YWwoXG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jaGVja0JhdGNoQWxpdmUsXG4gICAgICAgICAgICAxNTAwMFxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNhcm1zIHRoZSBiYXRjaCBsaXZlbmVzcyBjaGVjay5cbiAgICAgKi9cbiAgICBkaXNhcm1CYXRjaFdhdGNoKCkge1xuICAgICAgICBpZiAoaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hXYXRjaFRpbWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoV2F0Y2hUaW1lcik7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFdhdGNoVGltZXIgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB3aGV0aGVyIGEgYmF0Y2ggdXBkYXRlIGlzIHN0aWxsIGFsaXZlOiBhZnRlciBhIG1pbnV0ZSBvZiBuY2hhblxuICAgICAqIHNpbGVuY2UgYXNrcyB0aGUgb3BlcmF0aW9ucyBqb3VybmFsLCBhbmQgd2hlbiBubyBhY3RpdmUgb3BlcmF0aW9uIGlzXG4gICAgICogbGVmdCB0aGUgYmF0Y2ggaXMgZGVjbGFyZWQgZGVhZCDigJQgdGhlIFVJIGlzIHVubG9ja2VkIGluc3RlYWQgb2ZcbiAgICAgKiBzcGlubmluZyBmb3JldmVyLlxuICAgICAqL1xuICAgIGNoZWNrQmF0Y2hBbGl2ZSgpIHtcbiAgICAgICAgaWYgKCFpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZS5hY3RpdmUpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmRpc2FybUJhdGNoV2F0Y2goKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoRGF0ZS5ub3coKSAtIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoTGFzdEV2ZW50QXQgPCA2MDAwMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIE1vZHVsZXNBUEkuZ2V0T3BlcmF0aW9ucyh7fSwgKGRhdGEsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgIGlmICghc3VjY2VzcyB8fCAhZGF0YSB8fCAhaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUuYWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gV2l0aCBuY2hhbiBkZWFkIGZyb20gdGhlIHZlcnkgc3RhcnQgdGhlIGJhdGNoSWQgd2FzIG5ldmVyXG4gICAgICAgICAgICAvLyBsZWFybmVkIGZyb20gZXZlbnRzIOKAlCBwaWNrIGl0IHVwIGZyb20gdGhlIGpvdXJuYWwgc28gdGhlXG4gICAgICAgICAgICAvLyBjb21wbGV0aW9uIGNoZWNrIGJlbG93IGNhbiBtYXRjaCBoaXN0b3J5IHJlY29yZHMuXG4gICAgICAgICAgICBpZiAoaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUuYmF0Y2hJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWVuID0gKGRhdGEuYWN0aXZlIHx8IFtdKS5maW5kKG9wID0+IG9wLmJhdGNoSWQgIT09ICcnKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VlbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlLmJhdGNoSWQgPSBzZWVuLmJhdGNoSWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQSBzdGFsZSBhY3RpdmUgcm93IGlzIGEgY3Jhc2hlZCBvcGVyYXRpb24sIG5vdCBhIGxpdmUgb25lXG4gICAgICAgICAgICBjb25zdCBhbGl2ZSA9IChkYXRhLmFjdGl2ZSB8fCBbXSkuc29tZShvcCA9PiBvcC5zdGFsZSAhPT0gdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoYWxpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNvbWV0aGluZyBpcyBnZW51aW5lbHkgcnVubmluZyBzZXJ2ZXItc2lkZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuZGlzYXJtQmF0Y2hXYXRjaCgpO1xuICAgICAgICAgICAgY29uc3QgdHJhY2tlZEJhdGNoSWQgPSBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZS5iYXRjaElkO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucmVzZXRCYXRjaFVwZGF0ZSgpO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIFRoZSBCYXRjaEZpbmlzaGVkIG5jaGFuIG1lc3NhZ2UgbWF5IHNpbXBseSBoYXZlIGJlZW4gbG9zdCB3aGlsZVxuICAgICAgICAgICAgLy8gZXZlcnkgbW9kdWxlIGZpbmlzaGVkIGZpbmUg4oCUIGNoZWNrIHRoZSBqb3VybmFsIGhpc3RvcnkgYmVmb3JlXG4gICAgICAgICAgICAvLyBkZWNsYXJpbmcgdGhlIGJhdGNoIGRlYWQuXG4gICAgICAgICAgICBjb25zdCBiYXRjaE9wcyA9IChkYXRhLnJlY2VudCB8fCBbXSkuZmlsdGVyKFxuICAgICAgICAgICAgICAgIG9wID0+IHRyYWNrZWRCYXRjaElkICE9PSAnJyAmJiBvcC5iYXRjaElkID09PSB0cmFja2VkQmF0Y2hJZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBsZXRlZCA9IGJhdGNoT3BzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAmJiBiYXRjaE9wcy5ldmVyeShvcCA9PiBvcC5zdGF0ZSA9PT0gJ2NvbXBsZXRlZCcpO1xuICAgICAgICAgICAgaWYgKGFsbENvbXBsZXRlZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leHRfT3BlcmF0aW9uU3RhbGxlZEVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvclxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBpbmNvbWluZyBzZXJ2ZXItc2VudCBldmVudHMgcmVsYXRlZCB0byBtb2R1bGUgaW5zdGFsbGF0aW9uLlxuICAgICAqIFVwZGF0ZXMgdGhlIFVJIGJhc2VkIG9uIHRoZSBjdXJyZW50IHN0YWdlIG9mIGluc3RhbGxhdGlvbiwgZG93bmxvYWQsIHVwbG9hZCwgb3IgZXJyb3Igc3RhdGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIGRhdGEgcGF5bG9hZCBvZiB0aGUgc2VydmVyLXNlbnQgZXZlbnQsIGNvbnRhaW5pbmcgZGV0YWlscyBhYm91dCB0aGUgaW5zdGFsbGF0aW9uIHN0YWdlIGFuZCBwcm9ncmVzcy5cbiAgICAgKi9cbiAgICBwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2F2ZU1lc3NhZ2UocmVzcG9uc2UpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci53YXRjaGRvZy5ub3RpZnlFdmVudChyZXNwb25zZSk7XG4gICAgICAgIGlmIChpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5wcm9jZXNzQmF0Y2hFdmVudChyZXNwb25zZSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtb2R1bGVVbmlxdWVJZCA9IHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkO1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHMgfHwge307XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7bW9kdWxlVW5pcXVlSWR9XWApO1xuICAgICAgICBpZiAoc3RhZ2UgPT09J1N0YWdlX0lfR2V0UmVsZWFzZScpe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfR2V0UmVsZWFzZUluUHJvZ3Jlc3MsIDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSUlfQ2hlY2tMaWNlbnNlJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9DaGVja0xpY2Vuc2VJblByb2dyZXNzLCAyKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lJSV9HZXREb3dubG9hZExpbmsnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0NoZWNrTGljZW5zZUluUHJvZ3Jlc3MsIDMpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSVZfRG93bmxvYWRNb2R1bGUnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscywgJHJvdyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9JX1VwbG9hZE1vZHVsZScpe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2JBZnRlclJlY2VpdmVOZXdVcGxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9WX0luc3RhbGxNb2R1bGUnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNiQWZ0ZXJSZWNlaXZlTmV3SW5zdGFsbGF0aW9uU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfVklfRW5hYmxlTW9kdWxlJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25JblByb2dyZXNzLCA5OSk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9WSUlfRmluYWxTdGF0dXMnKXtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5iYXRjaE1vZGUgPT09IHRydWUgfHwgcmVzcG9uc2UuYmF0Y2hJZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIud2F0Y2hkb2cuc3RvcCgpO1xuICAgICAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5yZXN1bHQ9PT1mYWxzZSl7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvciwgc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHNhdmVNZXNzYWdlKG1lc3NhZ2UpIHtcbiAgICAgICAgLy8g0J/QvtC70YPRh9Cw0LXQvCDRgtC10LrRg9GJ0YPRjiDQuNGB0YLQvtGA0LjRjlxuICAgICAgICBsZXQgaGlzdG9yeSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3dzTW9kdWxlSW5zdGFsbGF0aW9uSGlzdG9yeScpIHx8ICdbXScpO1xuICAgICAgICBcbiAgICAgICAgLy8g0JTQvtCx0LDQstC70Y/QtdC8INC90L7QstC+0LUg0YHQvtC+0LHRidC10L3QuNC1XG4gICAgICAgIGhpc3RvcnkucHVzaCh7XG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyDQntCz0YDQsNC90LjRh9C40LLQsNC10Lwg0YDQsNC30LzQtdGAINC40YHRgtC+0YDQuNC4ICjQvdCw0L/RgNC40LzQtdGALCDQtNC+IDEwMCDRgdC+0L7QsdGJ0LXQvdC40LkpXG4gICAgICAgIGlmIChoaXN0b3J5Lmxlbmd0aCA+IDEwMCkge1xuICAgICAgICAgICAgaGlzdG9yeSA9IGhpc3Rvcnkuc2xpY2UoaGlzdG9yeS5sZW5ndGggLSAxMDApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyDQodC+0YXRgNCw0L3Rj9C10Lwg0L7QsdC90L7QstC70LXQvdC90YPRjiDQuNGB0YLQvtGA0LjRjlxuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnd3NIaXN0b3J5JywgSlNPTi5zdHJpbmdpZnkoaGlzdG9yeSkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgbG9jYWwgVUkgdHJhY2tpbmcgZm9yIGEgYmF0Y2ggdXBkYXRlLlxuICAgICAqIEBwYXJhbSB7QXJyYXk8c3RyaW5nPn0gbW9kdWxlc0ZvclVwZGF0ZVxuICAgICAqL1xuICAgIHN0YXJ0QmF0Y2hVcGRhdGUobW9kdWxlc0ZvclVwZGF0ZSkge1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZSA9IHtcbiAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZSxcbiAgICAgICAgICAgIGJhdGNoSWQ6ICcnLFxuICAgICAgICAgICAgdG90YWw6IG1vZHVsZXNGb3JVcGRhdGUubGVuZ3RoLFxuICAgICAgICAgICAgY29tcGxldGVkOiBuZXcgU2V0KCksXG4gICAgICAgICAgICBmYWlsZWQ6IG5ldyBTZXQoKSxcbiAgICAgICAgfTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hMYXN0RXZlbnRBdCA9IERhdGUubm93KCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmFybUJhdGNoV2F0Y2goKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suc2hvdygpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXIuc2hvdygpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlQWxsTW9kdWxlc1RpdGxlKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgIHBlcmNlbnQ6IDEsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdG9wcyBsb2NhbCBVSSB0cmFja2luZyBmb3IgYSBiYXRjaCB1cGRhdGUuXG4gICAgICovXG4gICAgcmVzZXRCYXRjaFVwZGF0ZSgpIHtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICAgICAgYmF0Y2hJZDogJycsXG4gICAgICAgICAgICB0b3RhbDogMCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogbmV3IFNldCgpLFxuICAgICAgICAgICAgZmFpbGVkOiBuZXcgU2V0KCksXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3Mgc2VydmVyLXNpZGUgYmF0Y2ggdXBkYXRlIGV2ZW50cy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2VcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBwcm9jZXNzQmF0Y2hFdmVudChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuYmF0Y2hNb2RlICE9PSB0cnVlICYmIHJlc3BvbnNlLmJhdGNoSWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hMYXN0RXZlbnRBdCA9IERhdGUubm93KCk7XG5cbiAgICAgICAgY29uc3Qgc3RhZ2UgPSByZXNwb25zZS5zdGFnZTtcbiAgICAgICAgY29uc3Qgc3RhZ2VEZXRhaWxzID0gcmVzcG9uc2Uuc3RhZ2VEZXRhaWxzIHx8IHt9O1xuICAgICAgICBjb25zdCBiYXRjaCA9IGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlO1xuXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0JhdGNoU3RhcnRlZCcpIHtcbiAgICAgICAgICAgIGJhdGNoLmFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICBiYXRjaC5iYXRjaElkID0gcmVzcG9uc2UuYmF0Y2hJZCB8fCAnJztcbiAgICAgICAgICAgIGJhdGNoLnRvdGFsID0gc3RhZ2VEZXRhaWxzLnRvdGFsIHx8IGJhdGNoLnRvdGFsO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlQmF0Y2hQcm9ncmVzcyhzdGFnZURldGFpbHMudG90YWwgPiAwID8gMSA6IDApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaE1vZHVsZVN0YXJ0ZWQnKSB7XG4gICAgICAgICAgICBiYXRjaC5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgYmF0Y2guYmF0Y2hJZCA9IHJlc3BvbnNlLmJhdGNoSWQgfHwgYmF0Y2guYmF0Y2hJZDtcbiAgICAgICAgICAgIGJhdGNoLnRvdGFsID0gc3RhZ2VEZXRhaWxzLnRvdGFsIHx8IGJhdGNoLnRvdGFsO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlQmF0Y2hQcm9ncmVzcyhcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYWxjdWxhdGVCYXRjaFBlcmNlbnQoc3RhZ2VEZXRhaWxzLmN1cnJlbnQgfHwgMSwgYmF0Y2gudG90YWwpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaE1vZHVsZUNvbXBsZXRlZCcpIHtcbiAgICAgICAgICAgIGJhdGNoLmNvbXBsZXRlZC5hZGQoc3RhZ2VEZXRhaWxzLm1vZHVsZVVuaXF1ZUlkIHx8IHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3MoXG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2FsY3VsYXRlQmF0Y2hQZXJjZW50KHN0YWdlRGV0YWlscy5jdXJyZW50IHx8IGJhdGNoLmNvbXBsZXRlZC5zaXplLCBiYXRjaC50b3RhbClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0JhdGNoTW9kdWxlRmFpbGVkJykge1xuICAgICAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSBzdGFnZURldGFpbHMubW9kdWxlVW5pcXVlSWQgfHwgcmVzcG9uc2UubW9kdWxlVW5pcXVlSWQ7XG4gICAgICAgICAgICBiYXRjaC5mYWlsZWQuYWRkKG1vZHVsZVVuaXF1ZUlkKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3MoXG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2FsY3VsYXRlQmF0Y2hQZXJjZW50KHN0YWdlRGV0YWlscy5jdXJyZW50IHx8IGJhdGNoLmNvbXBsZXRlZC5zaXplICsgYmF0Y2guZmFpbGVkLnNpemUsIGJhdGNoLnRvdGFsKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLWlkPSR7bW9kdWxlVW5pcXVlSWR9XWApO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcigkcm93LCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLCBzdGFnZURldGFpbHMubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaEZpbmlzaGVkJykge1xuICAgICAgICAgICAgLy8gSWdub3JlIHN0cmFnZ2xlcnMgZnJvbSBhIHByZXZpb3VzIGJhdGNoIChlLmcuLCB1c2VyIHJlLXRyaWdnZXJlZCBVcGRhdGUgQWxsKS5cbiAgICAgICAgICAgIGlmIChiYXRjaC5iYXRjaElkICE9PSAnJyAmJiByZXNwb25zZS5iYXRjaElkICYmIHJlc3BvbnNlLmJhdGNoSWQgIT09IGJhdGNoLmJhdGNoSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmRpc2FybUJhdGNoV2F0Y2goKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3MoMTAwKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnJlc2V0QmF0Y2hVcGRhdGUoKTtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxjdWxhdGVzIGFnZ3JlZ2F0ZSBiYXRjaCBwcm9ncmVzcy5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gY3VycmVudFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB0b3RhbFxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgY2FsY3VsYXRlQmF0Y2hQZXJjZW50KGN1cnJlbnQsIHRvdGFsKSB7XG4gICAgICAgIGlmICh0b3RhbCA8PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgoTWF0aC5yb3VuZCgoY3VycmVudCAtIDEpIC8gdG90YWwgKiAxMDApLCAxKSwgOTkpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBhZ2dyZWdhdGUgYmF0Y2ggcHJvZ3Jlc3MgYmFyLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwZXJjZW50XG4gICAgICovXG4gICAgdXBkYXRlQmF0Y2hQcm9ncmVzcyhwZXJjZW50KSB7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNUaXRsZSk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiBwZXJjZW50LFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgVUkgdG8gcmVmbGVjdCB0aGUgcHJvZ3Jlc3Mgb2YgYSBtb2R1bGUgZG93bmxvYWQuXG4gICAgICogQWRqdXN0cyB0aGUgcHJvZ3Jlc3MgYmFyIGFuZCBzdGF0dXMgbWVzc2FnZSBiYXNlZCBvbiB0aGUgZGV0YWlscyBwcm92aWRlZCBpbiB0aGUgc2VydmVyLXNlbnQgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSWQgLSBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIG1vZHVsZSBiZWluZyBkb3dubG9hZGVkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdGFnZURldGFpbHMgLSBEZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgZG93bmxvYWQgcHJvZ3Jlc3MuXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBUaGUgalF1ZXJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJvdyBpbiB0aGUgVUkgYXNzb2NpYXRlZCB3aXRoIHRoZSBtb2R1bGUuXG4gICAgICovXG4gICAgY2JBZnRlclJlY2VpdmVOZXdEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzLCAkcm93KSB7XG4gICAgICAgIC8vIFNvbWUgZXZlbnRzIChlLmcuIGFuIGVycm9yIHJhaXNlZCBiZWZvcmUgdGhlIGRvd25sb2FkIHN0YXJ0ZWQpIGFycml2ZSB3aXRob3V0IGBkYXRhYFxuICAgICAgICBjb25zdCBkYXRhID0gc3RhZ2VEZXRhaWxzLmRhdGEgfHwge307XG4gICAgICAgIC8vIENoZWNrIG1vZHVsZSBkb3dubG9hZCBzdGF0dXNcbiAgICAgICAgaWYgKGRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkUHJvZ3Jlc3MgPSBNYXRoLm1heChNYXRoLnJvdW5kKHBhcnNlSW50KGRhdGEuZF9zdGF0dXNfcHJvZ3Jlc3MsIDEwKS8yKS0xLCAzKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0Rvd25sb2FkSW5Qcm9ncmVzcywgZG93bmxvYWRQcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfRG93bmxvYWRJblByb2dyZXNzLCA1MCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gdHJ1ZSAmJiBzdGFnZURldGFpbHMuZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBJbnN0YWxsIHBpcGVsaW5lOiBiYXJlIHN0YWdlIGJvdW5kYXJ5IHdpdGhvdXQgZG93bmxvYWQgZGV0YWlsc1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgNTApO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcigkcm93LCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLCBzdGFnZURldGFpbHMubWVzc2FnZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgVUkgdG8gcmVmbGVjdCB0aGUgcHJvZ3Jlc3Mgb2YgYSBtb2R1bGUgdXBsb2FkLlxuICAgICAqIEFkanVzdHMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRldGFpbHMgcHJvdmlkZWQgaW4gdGhlIHNlcnZlci1zZW50IGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkIC0gVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBtb2R1bGUgYmVpbmcgdXBsb2FkZWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHN0YWdlRGV0YWlscyAtIERldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGxvYWQgcHJvZ3Jlc3MuXG4gICAgICovXG4gICAgY2JBZnRlclJlY2VpdmVOZXdVcGxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuICAgICAgICAvLyBTb21lIGV2ZW50cyAoZS5nLiBhbiBlcnJvciByYWlzZWQgYmVmb3JlIHRoZSB1cGxvYWQgc3RhcnRlZCkgYXJyaXZlIHdpdGhvdXQgYGRhdGFgXG4gICAgICAgIGNvbnN0IGRhdGEgPSBzdGFnZURldGFpbHMuZGF0YSB8fCB7fTtcbiAgICAgICAgLy8gQ2hlY2sgbW9kdWxlIHVwbG9hZCBzdGF0dXNcbiAgICAgICAgaWYgKGRhdGEuZF9zdGF0dXMgPT09ICdVUExPQURfSU5fUFJPR1JFU1MnKSB7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGxvYWRJblByb2dyZXNzLCA0OSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X1VwbG9hZEluUHJvZ3Jlc3MsIDUwKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSB0cnVlICYmIHN0YWdlRGV0YWlscy5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEluc3RhbGwgcGlwZWxpbmU6IGJhcmUgc3RhZ2UgYm91bmRhcnkgd2l0aG91dCB1cGxvYWQgZGV0YWlsc1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgNTApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdXBkYXRlcyBvbiB0aGUgaW5zdGFsbGF0aW9uIHByb2dyZXNzIG9mIGEgbW9kdWxlLlxuICAgICAqIFVwZGF0ZXMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGluZm9ybWF0aW9uIHJlY2VpdmVkIGluIHRoZSBzZXJ2ZXItc2VudCBldmVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZCAtIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbW9kdWxlIGJlaW5nIGluc3RhbGxlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhZ2VEZXRhaWxzIC0gRGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGluc3RhbGxhdGlvbiBwcm9ncmVzcy5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKSB7XG4gICAgICAgIC8vIFNvbWUgZXZlbnRzIChlLmcuIGFuIGVycm9yIHJhaXNlZCBiZWZvcmUgdGhlIGluc3RhbGxhdGlvbiBzdGFydGVkKSBhcnJpdmUgd2l0aG91dCBgZGF0YWBcbiAgICAgICAgY29uc3QgZGF0YSA9IHN0YWdlRGV0YWlscy5kYXRhIHx8IHt9O1xuICAgICAgICAvLyBDaGVjayBtb2R1bGUgaW5zdGFsbGF0aW9uIHN0YXR1c1xuICAgICAgICBpZiAoZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbGxhdGlvblByb2dyZXNzID0gTWF0aC5yb3VuZChwYXJzZUludChkYXRhLmlfc3RhdHVzX3Byb2dyZXNzLCAxMCkvMis1MCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25JblByb2dyZXNzLCBpbnN0YWxsYXRpb25Qcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9DT01QTEVURScpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkluUHJvZ3Jlc3MsIDk4KTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSB0cnVlICYmIHN0YWdlRGV0YWlscy5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEluc3RhbGwgcGlwZWxpbmU6IGJhcmUgc3RhZ2UgYm91bmRhcnkgd2l0aG91dCBpbnN0YWxsYXRpb24gZGV0YWlscztcbiAgICAgICAgICAgIC8vIHRoZSBsZWdhY3kgZmxvdyBzZW5kcyByZXN1bHQ6dHJ1ZSB3aXRoIGRhdGEgYXQgdGhlIFNUQVJUIG9mIHRoaXMgc3RhZ2VcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkluUHJvZ3Jlc3MsIDk4KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldHMgdGhlIFVJIGVsZW1lbnRzIGFzc29jaWF0ZWQgd2l0aCBhIG1vZHVsZSByb3cgdG8gdGhlaXIgZGVmYXVsdCBzdGF0ZS5cbiAgICAgKiBUaGlzIGlzIHR5cGljYWxseSBjYWxsZWQgYWZ0ZXIgYW4gaW5zdGFsbGF0aW9uIHByb2Nlc3MgY29tcGxldGVzIG9yIGZhaWxzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBUaGUgalF1ZXJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJvdyBpbiB0aGUgVUkgYXNzb2NpYXRlZCB3aXRoIHRoZSBtb2R1bGUuXG4gICAgICovXG4gICAgcmVzZXRCdXR0b25WaWV3KCRyb3cpe1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkcm93LmZpbmQoJ2kubG9hZGluZycpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcbiAgICAgICAgJHJvdy5maW5kKCdhLmRvd25sb2FkIGknKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgJHJvdy5maW5kKCdhLnVwZGF0ZSBpJykuYWRkQ2xhc3MoJ3JlZG8nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzcGxheXMgYW4gZXJyb3IgbWVzc2FnZSByZWxhdGVkIHRvIG1vZHVsZSBpbnN0YWxsYXRpb24gaW4gdGhlIFVJLlxuICAgICAqIFRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIHdoZW4gYW4gaW5zdGFsbGF0aW9uIGZhaWxzLCBwcm92aWRpbmcgZmVlZGJhY2sgdG8gdGhlIHVzZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFRoZSBqUXVlcnkgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcm93IGluIHRoZSBVSSBhc3NvY2lhdGVkIHdpdGggdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyIC0gVGhlIGhlYWRlciB0ZXh0IGZvciB0aGUgZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gbWVzc2FnZXMgLSBEZXRhaWxlZCBlcnJvciBtZXNzYWdlcyB0byBiZSBkaXNwbGF5ZWQuXG4gICAgICovXG4gICAgc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGhlYWRlciwgbWVzc2FnZXM9JycpIHtcbiAgICAgICAgaWYgKG1lc3NhZ2VzPT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJHJvdy5sZW5ndGg9PT0wKXtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhtZXNzYWdlcywgaGVhZGVyKTtcbiAgICAgICAgICAgICQoJyNhZGQtbmV3LWJ1dHRvbicpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucmVzZXRCdXR0b25WaWV3KCRyb3cpO1xuICAgICAgICBpZiAobWVzc2FnZXMubGljZW5zZSE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VMaW5rID0gYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZX0gPGEgaHJlZj1cIiR7Q29uZmlnLmtleU1hbmFnZW1lbnRVcmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtDb25maWcua2V5TWFuYWdlbWVudFNpdGV9PC9hPmA7XG4gICAgICAgICAgICBtZXNzYWdlcy5saWNlbnNlLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGV4dERlc2NyaXB0aW9uID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlcyk7XG4gICAgICAgIGNvbnN0IGh0bWxNZXNzYWdlPSAgYDx0ciBjbGFzcz1cInVpIHdhcm5pbmcgdGFibGUtZXJyb3ItbWVzc2FnZXNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dGQgY29sc3Bhbj1cIjVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY2VudGVyIGFsaWduZWQgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2hlYWRlcn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cD4ke3RleHREZXNjcmlwdGlvbn08L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdHI+YDtcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnd2FybmluZycpO1xuICAgICAgICAkcm93LmJlZm9yZShodG1sTWVzc2FnZSk7XG4gICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcbiAgICAgICAgICAgIHNjcm9sbFRvcDogJHJvdy5vZmZzZXQoKS50b3AsXG4gICAgICAgIH0sIDIwMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBwcm9ncmVzcyBiYXIgYW5kIHN0YXR1cyBtZXNzYWdlIHRvIHJlZmxlY3QgdGhlIGN1cnJlbnQgc3RhdGUgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uIHByb2Nlc3MuXG4gICAgICogVGhpcyBmdW5jdGlvbiBpcyB1c2VkIHRocm91Z2hvdXQgZGlmZmVyZW50IHN0YWdlcyBvZiBpbnN0YWxsYXRpb24gdG8gcHJvdmlkZSByZWFsLXRpbWUgZmVlZGJhY2sgdG8gdGhlIHVzZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSWQgLSBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaGVhZGVyIC0gVGhlIHN0YXR1cyBtZXNzYWdlIHRvIGJlIGRpc3BsYXllZCBhYm92ZSB0aGUgcHJvZ3Jlc3MgYmFyLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbcGVyY2VudD0wXSAtIFRoZSBjdXJyZW50IHByb2dyZXNzIHBlcmNlbnRhZ2UgdG8gYmUgcmVmbGVjdGVkIGluIHRoZSBwcm9ncmVzcyBiYXIuXG4gICAgICovXG4gICAgdXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGhlYWRlciwgcGVyY2VudD0wKXtcbiAgICAgICAgaWYgKG1vZHVsZVVuaXF1ZUlkID09PSB1bmRlZmluZWQgfHwgbW9kdWxlVW5pcXVlSWQgPT09ICcnKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbW9kdWxlTmFtZSA9ICQoYHRyLm5ldy1tb2R1bGUtcm93W2RhdGEtaWQ9JHttb2R1bGVVbmlxdWVJZH1dYCkuZGF0YSgnbmFtZScpO1xuICAgICAgICBpZiAobW9kdWxlTmFtZSA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgIG1vZHVsZU5hbWUgPSAnJztcbiAgICAgICAgfVxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJCbG9jay5zaG93KCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5zaG93KCk7XG4gICAgICAgIGlmIChoZWFkZXIpe1xuICAgICAgICAgICAgY29uc3QgYmFyVGV4dD0gbW9kdWxlTmFtZSsnOiAnK2hlYWRlcjtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoYmFyVGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBlcmNlbnQ+MCl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgIHBlcmNlbnQ6IHBlcmNlbnQsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemVzIHRoZSBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciBtb2R1bGUgd2hlbiB0aGUgRE9NIGlzIGZ1bGx5IGxvYWRlZC5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==