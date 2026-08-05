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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL1ZvbHVtZXMvRGV2RGlzay9EZXZlbG9wZW1lbnQvbWlrb3BieC9Db3JlLy5jbGF1ZGUvd29ya3RyZWVzL3Bvc3QtMy40MC1jbGVhbnVwL3NpdGVzL2FkbWluLWNhYmluZXQvYXNzZXRzL2pzL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluc3RhbGwtc3RhdHVzLXdvcmtlci5qcyJdLCJuYW1lcyI6WyJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckJsb2NrIiwiJHByb2dyZXNzQmFyTGFiZWwiLCJldmVudFNvdXJjZSIsImNoYW5uZWxJZCIsImJhdGNoVXBkYXRlIiwiYWN0aXZlIiwiYmF0Y2hJZCIsInRvdGFsIiwiY29tcGxldGVkIiwiU2V0IiwiZmFpbGVkIiwid2F0Y2hkb2ciLCJiYXRjaExhc3RFdmVudEF0IiwiYmF0Y2hXYXRjaFRpbWVyIiwiaW5pdGlhbGl6ZSIsIiQiLCJNb2R1bGVzQVBJIiwiY3JlYXRlT3BlcmF0aW9uV2F0Y2hkb2ciLCJvblRlcm1pbmFsIiwiZGF0YSIsImNiV2F0Y2hkb2dUZXJtaW5hbCIsIm9uU3RhbGxlZCIsImNiV2F0Y2hkb2dTdGFsbGVkIiwiRXZlbnRCdXMiLCJzdWJzY3JpYmUiLCJwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uIiwicmVzdG9yZUFjdGl2ZU9wZXJhdGlvbnMiLCJzdGFydFdhdGNoIiwidHJhY2tpbmdJZCIsInN0YXJ0IiwiZ2V0T3BlcmF0aW9ucyIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN0b3JhYmxlIiwiZmlsdGVyIiwib3AiLCJzdGFsZSIsImluY2x1ZGVzIiwib3BlcmF0aW9uIiwibGVuZ3RoIiwiYWRkQ2xhc3MiLCJEYXRlIiwibm93IiwiYXJtQmF0Y2hXYXRjaCIsInVwZGF0ZUJhdGNoUHJvZ3Jlc3MiLCJNYXRoIiwibWF4IiwicHJvZ3Jlc3MiLCJ1cGRhdGVQcm9ncmVzc0JhciIsIm1vZHVsZVVuaXF1ZUlkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0luc3RhbGxhdGlvbkluUHJvZ3Jlc3MiLCJzdGF0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImhpZGUiLCJyZW1vdmUiLCJyZW1vdmVDbGFzcyIsIiRyb3ciLCJzaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJlcnJvck1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfT3BlcmF0aW9uU3RhbGxlZEVycm9yIiwic2V0SW50ZXJ2YWwiLCJjaGVja0JhdGNoQWxpdmUiLCJkaXNhcm1CYXRjaFdhdGNoIiwiY2xlYXJJbnRlcnZhbCIsInNlZW4iLCJmaW5kIiwidW5kZWZpbmVkIiwiYWxpdmUiLCJzb21lIiwidHJhY2tlZEJhdGNoSWQiLCJyZXNldEJhdGNoVXBkYXRlIiwiYmF0Y2hPcHMiLCJyZWNlbnQiLCJhbGxDb21wbGV0ZWQiLCJldmVyeSIsInJlc3BvbnNlIiwic2F2ZU1lc3NhZ2UiLCJub3RpZnlFdmVudCIsInByb2Nlc3NCYXRjaEV2ZW50Iiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCJleHRfR2V0UmVsZWFzZUluUHJvZ3Jlc3MiLCJleHRfQ2hlY2tMaWNlbnNlSW5Qcm9ncmVzcyIsImNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMiLCJjYkFmdGVyUmVjZWl2ZU5ld1VwbG9hZFN0YXR1cyIsImNiQWZ0ZXJSZWNlaXZlTmV3SW5zdGFsbGF0aW9uU3RhdHVzIiwiYmF0Y2hNb2RlIiwic3RvcCIsInJlc3VsdCIsIm1lc3NhZ2VzIiwibWVzc2FnZSIsImhpc3RvcnkiLCJKU09OIiwicGFyc2UiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwicHVzaCIsInRpbWVzdGFtcCIsInRvSVNPU3RyaW5nIiwic2xpY2UiLCJzZXRJdGVtIiwic3RyaW5naWZ5Iiwic3RhcnRCYXRjaFVwZGF0ZSIsIm1vZHVsZXNGb3JVcGRhdGUiLCJzaG93IiwidGV4dCIsImV4dF9VcGRhdGVBbGxNb2R1bGVzVGl0bGUiLCJwZXJjZW50IiwiYmF0Y2giLCJjYWxjdWxhdGVCYXRjaFBlcmNlbnQiLCJjdXJyZW50IiwiYWRkIiwic2l6ZSIsIm1pbiIsInJvdW5kIiwiZF9zdGF0dXMiLCJkb3dubG9hZFByb2dyZXNzIiwicGFyc2VJbnQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImV4dF9Eb3dubG9hZEluUHJvZ3Jlc3MiLCJleHRfVXBsb2FkSW5Qcm9ncmVzcyIsImlfc3RhdHVzIiwiaW5zdGFsbGF0aW9uUHJvZ3Jlc3MiLCJpX3N0YXR1c19wcm9ncmVzcyIsInJlc2V0QnV0dG9uVmlldyIsImhlYWRlciIsImxpY2Vuc2UiLCJtYW5hZ2VMaW5rIiwibGljX01hbmFnZUxpY2Vuc2UiLCJDb25maWciLCJrZXlNYW5hZ2VtZW50VXJsIiwia2V5TWFuYWdlbWVudFNpdGUiLCJ0ZXh0RGVzY3JpcHRpb24iLCJjb252ZXJ0VG9UZXh0IiwiaHRtbE1lc3NhZ2UiLCJiZWZvcmUiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwibW9kdWxlTmFtZSIsImJhclRleHQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx1QkFBdUIsR0FBRztBQUM1QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQU5jOztBQVE1QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQVpTOztBQWM1QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxJQWxCUzs7QUFvQjVCO0FBQ0o7QUFDQTtBQUNB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SCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgTW9kdWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXZlbnRCdXMgKi9cblxuLyoqXG4gKiBIYW5kbGVzIHJlYWwtdGltZSBtb25pdG9yaW5nIGFuZCB1cGRhdGVzIG9mIG1vZHVsZSBpbnN0YWxsYXRpb24gc3RhdHVzZXMuXG4gKiBVdGlsaXplcyBzZXJ2ZXItc2VudCBldmVudHMgdG8gcmVjZWl2ZSB1cGRhdGVzIGFuZCByZWZsZWN0cyB0aGVzZSBjaGFuZ2VzIGluIHRoZSBVSSxcbiAqIHBhcnRpY3VsYXJseSBpbiB0aGUgcHJvZ3Jlc3MgYmFyIGFuZCBzdGF0dXMgbWVzc2FnZXMgZGlzcGxheWVkIHRvIHRoZSB1c2VyLlxuICpcbiAqIEBtb2R1bGUgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXJcbiAqL1xuY29uc3QgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIgPSB7XG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSBwcm9ncmVzcyBiYXIgZWxlbWVudCBpbiB0aGUgRE9NLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY29udGFpbmVyIG9mIHRoZSBwcm9ncmVzcyBiYXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJCbG9jazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbGFiZWwgZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhckxhYmVsOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIEV2ZW50U291cmNlIG9iamVjdCB1c2VkIGZvciByZWNlaXZpbmcgcmVhbC10aW1lIHVwZGF0ZXMgZnJvbSB0aGUgc2VydmVyIGFib3V0IG1vZHVsZSBpbnN0YWxsYXRpb24gc3RhdHVzZXMuXG4gICAgICogVGhpcyBhbGxvd3MgZm9yIGEgcHVzaC1iYXNlZCBtZWNoYW5pc20gdG8ga2VlcCB0aGUgVUkgdXBkYXRlZCB3aXRoIHRoZSBsYXRlc3QgcHJvZ3Jlc3MgaW5mb3JtYXRpb24uXG4gICAgICogQHR5cGUge0V2ZW50U291cmNlfVxuICAgICAqL1xuICAgIGV2ZW50U291cmNlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGlkZW50aWZpZXIgZm9yIHRoZSBQVUIvU1VCIGNoYW5uZWwgdXNlZCB0byBzdWJzY3JpYmUgdG8gaW5zdGFsbGF0aW9uIHN0YXR1cyB1cGRhdGVzLlxuICAgICAqIFRoaXMgZW5zdXJlcyB0aGF0IHRoZSBjbGllbnQgaXMgbGlzdGVuaW5nIG9uIHRoZSBjb3JyZWN0IGNoYW5uZWwgZm9yIHJlbGV2YW50IGV2ZW50cy5cbiAgICAgKi9cbiAgICBjaGFubmVsSWQ6ICdpbnN0YWxsLW1vZHVsZScsXG5cbiAgICAvKipcbiAgICAgKiBTdGF0ZSBvZiBhIGJ1bGsgbW9kdWxlIHVwZGF0ZSBzZXNzaW9uLlxuICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICovXG4gICAgYmF0Y2hVcGRhdGU6IHtcbiAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgYmF0Y2hJZDogJycsXG4gICAgICAgIHRvdGFsOiAwLFxuICAgICAgICBjb21wbGV0ZWQ6IG5ldyBTZXQoKSxcbiAgICAgICAgZmFpbGVkOiBuZXcgU2V0KCksXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFdhdGNoZG9nIGZvciBhIHNpbmdsZSBpbnN0YWxsL3VwZGF0ZSBvcGVyYXRpb246IHBvbGxzIHRoZSBvcGVyYXRpb25zXG4gICAgICogam91cm5hbCB3aGVuIG5jaGFuIGdvZXMgc2lsZW50LCBzbyBhIGxvc3QgbWVzc2FnZSBjYW4gbm8gbG9uZ2VyIGZyZWV6ZVxuICAgICAqIHRoZSBwcm9ncmVzcyBiYXIgZm9yZXZlci4gQ3JlYXRlZCBpbiBpbml0aWFsaXplKCkuXG4gICAgICovXG4gICAgd2F0Y2hkb2c6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaW1lc3RhbXAgb2YgdGhlIGxhc3QgYmF0Y2gtcmVsYXRlZCBuY2hhbiBldmVudCwgZHJpdmluZyB0aGUgYmF0Y2ggc3RhbGxcbiAgICAgKiBkZXRlY3Rpb24gaW4gY2hlY2tCYXRjaEFsaXZlKCkuXG4gICAgICovXG4gICAgYmF0Y2hMYXN0RXZlbnRBdDogMCxcblxuICAgIC8qKlxuICAgICAqIFRpbWVyIGhhbmRsZSBvZiB0aGUgcGVyaW9kaWMgYmF0Y2ggbGl2ZW5lc3MgY2hlY2suXG4gICAgICovXG4gICAgYmF0Y2hXYXRjaFRpbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxTdGF0dXNMb29wV29ya2VyIG1vZHVsZSBieSBzZXR0aW5nIHVwIHRoZSBjb25uZWN0aW9uIHRvIHJlY2VpdmUgc2VydmVyLXNlbnQgZXZlbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKXtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyID0gJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2sgPSAkKCcjdXBsb2FkLXByb2dyZXNzLWJhci1ibG9jaycpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbCA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWxhYmVsJyk7XG5cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIud2F0Y2hkb2cgPSBNb2R1bGVzQVBJLmNyZWF0ZU9wZXJhdGlvbldhdGNoZG9nKHtcbiAgICAgICAgICAgIG9uVGVybWluYWw6IGRhdGEgPT4gaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2JXYXRjaGRvZ1Rlcm1pbmFsKGRhdGEpLFxuICAgICAgICAgICAgb25TdGFsbGVkOiAoKSA9PiBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYldhdGNoZG9nU3RhbGxlZCgpLFxuICAgICAgICB9KTtcblxuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUodGhpcy5jaGFubmVsSWQsIGRhdGEgPT4ge1xuICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5wcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uKGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXN0b3JlQWN0aXZlT3BlcmF0aW9ucygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgdGhlIHBvbGxpbmcgZmFsbGJhY2sgZm9yIGEganVzdC1sYXVuY2hlZCBpbnN0YWxsL3VwZGF0ZS5cbiAgICAgKiBDYWxsZWQgYnkgdGhlIGZsb3dzIHRoYXQgaW5pdGlhdGUgYW4gb3BlcmF0aW9uIChyZXBvIGluc3RhbGwsIHppcCB1cGxvYWQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRyYWNraW5nSWQgLSBNb2R1bGUgdW5pcXVlIGlkIChvciB1cGxvYWQgZmlsZUlkKS5cbiAgICAgKi9cbiAgICBzdGFydFdhdGNoKHRyYWNraW5nSWQpIHtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIud2F0Y2hkb2cuc3RhcnQodHJhY2tpbmdJZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc3RvcmVzIFVJIHN0YXRlIGZvciBvcGVyYXRpb25zIHRoYXQgYXJlIHN0aWxsIHJ1bm5pbmcgb24gdGhlIGJhY2tlbmRcbiAgICAgKiBhZnRlciBhIHBhZ2UgcmVsb2FkOiBzaG93cyB0aGUgcHJvZ3Jlc3MgYmFyLCBsb2NrcyB0aGUgYWN0aW9uIGJ1dHRvbnMgYW5kXG4gICAgICogYXJtcyB0aGUgcG9sbGluZyBmYWxsYmFjay5cbiAgICAgKi9cbiAgICByZXN0b3JlQWN0aXZlT3BlcmF0aW9ucygpIHtcbiAgICAgICAgTW9kdWxlc0FQSS5nZXRPcGVyYXRpb25zKHt9LCAoZGF0YSwgc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgaWYgKCFzdWNjZXNzIHx8ICFkYXRhIHx8ICFBcnJheS5pc0FycmF5KGRhdGEuYWN0aXZlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFN0YWxlIHJvd3MgYmVsb25nIHRvIGNyYXNoZWQgb3BlcmF0aW9ucyBub2JvZHkgc3VwZXJ2aXNlcyB5ZXQ6XG4gICAgICAgICAgICAvLyByZXN0b3JpbmcgdGhlbSB3b3VsZCBsb2NrIHRoZSBVSSB3aXRoIG5vIHJlY292ZXJ5IHBhdGguIFF1aWNrXG4gICAgICAgICAgICAvLyB0b2dnbGUgb3BlcmF0aW9ucyAoZW5hYmxlL2Rpc2FibGUpIGFyZSBub3Qgd29ydGggcmVzdG9yaW5nXG4gICAgICAgICAgICAvLyBlaXRoZXIg4oCUIHRoZWlyIG93biB3YXRjaGRvZyBoYW5kbGVzIHRoZSBjbGljayBmbG93LlxuICAgICAgICAgICAgY29uc3QgcmVzdG9yYWJsZSA9IGRhdGEuYWN0aXZlLmZpbHRlcihcbiAgICAgICAgICAgICAgICBvcCA9PiBvcC5zdGFsZSAhPT0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAmJiAob3AuYmF0Y2hJZCAhPT0gJycgfHwgWydpbnN0YWxsX3JlcG8nLCAnaW5zdGFsbF9wYWNrYWdlJywgJ3VuaW5zdGFsbCddLmluY2x1ZGVzKG9wLm9wZXJhdGlvbikpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKHJlc3RvcmFibGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgb3AgPSByZXN0b3JhYmxlWzBdO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGlmIChvcC5iYXRjaElkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZS5iYXRjaElkID0gb3AuYmF0Y2hJZDtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaExhc3RFdmVudEF0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5hcm1CYXRjaFdhdGNoKCk7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlQmF0Y2hQcm9ncmVzcyhNYXRoLm1heChvcC5wcm9ncmVzcywgMSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0JhcihcbiAgICAgICAgICAgICAgICAgICAgb3AubW9kdWxlVW5pcXVlSWQsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcyxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5tYXgob3AucHJvZ3Jlc3MsIDEpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zdGFydFdhdGNoKG9wLm1vZHVsZVVuaXF1ZUlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgYSB0ZXJtaW5hbCBqb3VybmFsIHN0YXRlIGRpc2NvdmVyZWQgYnkgcG9sbGluZzogdGhlIG5jaGFuXG4gICAgICogbWVzc2FnZSB3YXMgbG9zdCwgYnV0IHRoZSBiYWNrZW5kIGZpbmlzaGVkIHRoZSBvcGVyYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFRoZSBqb3VybmFsIHJlY29yZCBmcm9tIHRoZSBvcGVyYXRpb25zIEFQSS5cbiAgICAgKi9cbiAgICBjYldhdGNoZG9nVGVybWluYWwoZGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5zdGF0ZSA9PT0gJ2NvbXBsZXRlZCcpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAkKCd0ci50YWJsZS1lcnJvci1tZXNzYWdlcycpLnJlbW92ZSgpO1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke2RhdGEubW9kdWxlVW5pcXVlSWR9XWApO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoXG4gICAgICAgICAgICAkcm93LFxuICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcixcbiAgICAgICAgICAgIGRhdGEuZXJyb3JNZXNzYWdlc1xuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGEgc3RhbGxlZCBvcGVyYXRpb246IG5vIG5jaGFuIGV2ZW50cyBhbmQgbm8gam91cm5hbCBwcm9ncmVzc1xuICAgICAqIGZvciBzZXZlcmFsIG1pbnV0ZXMuXG4gICAgICovXG4gICAgY2JXYXRjaGRvZ1N0YWxsZWQoKSB7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKFxuICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9PcGVyYXRpb25TdGFsbGVkRXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcixcbiAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3JcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXJtcyB0aGUgcGVyaW9kaWMgbGl2ZW5lc3MgY2hlY2sgb2YgYSBiYXRjaCB1cGRhdGUuXG4gICAgICovXG4gICAgYXJtQmF0Y2hXYXRjaCgpIHtcbiAgICAgICAgaWYgKGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoV2F0Y2hUaW1lciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoV2F0Y2hUaW1lciA9IHNldEludGVydmFsKFxuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2hlY2tCYXRjaEFsaXZlLFxuICAgICAgICAgICAgMTUwMDBcbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGlzYXJtcyB0aGUgYmF0Y2ggbGl2ZW5lc3MgY2hlY2suXG4gICAgICovXG4gICAgZGlzYXJtQmF0Y2hXYXRjaCgpIHtcbiAgICAgICAgaWYgKGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoV2F0Y2hUaW1lciAhPT0gbnVsbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFdhdGNoVGltZXIpO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hXYXRjaFRpbWVyID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3Mgd2hldGhlciBhIGJhdGNoIHVwZGF0ZSBpcyBzdGlsbCBhbGl2ZTogYWZ0ZXIgYSBtaW51dGUgb2YgbmNoYW5cbiAgICAgKiBzaWxlbmNlIGFza3MgdGhlIG9wZXJhdGlvbnMgam91cm5hbCwgYW5kIHdoZW4gbm8gYWN0aXZlIG9wZXJhdGlvbiBpc1xuICAgICAqIGxlZnQgdGhlIGJhdGNoIGlzIGRlY2xhcmVkIGRlYWQg4oCUIHRoZSBVSSBpcyB1bmxvY2tlZCBpbnN0ZWFkIG9mXG4gICAgICogc3Bpbm5pbmcgZm9yZXZlci5cbiAgICAgKi9cbiAgICBjaGVja0JhdGNoQWxpdmUoKSB7XG4gICAgICAgIGlmICghaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUuYWN0aXZlKSB7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5kaXNhcm1CYXRjaFdhdGNoKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKERhdGUubm93KCkgLSBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaExhc3RFdmVudEF0IDwgNjAwMDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBNb2R1bGVzQVBJLmdldE9wZXJhdGlvbnMoe30sIChkYXRhLCBzdWNjZXNzKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXN1Y2Nlc3MgfHwgIWRhdGEgfHwgIWluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlLmFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFdpdGggbmNoYW4gZGVhZCBmcm9tIHRoZSB2ZXJ5IHN0YXJ0IHRoZSBiYXRjaElkIHdhcyBuZXZlclxuICAgICAgICAgICAgLy8gbGVhcm5lZCBmcm9tIGV2ZW50cyDigJQgcGljayBpdCB1cCBmcm9tIHRoZSBqb3VybmFsIHNvIHRoZVxuICAgICAgICAgICAgLy8gY29tcGxldGlvbiBjaGVjayBiZWxvdyBjYW4gbWF0Y2ggaGlzdG9yeSByZWNvcmRzLlxuICAgICAgICAgICAgaWYgKGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlLmJhdGNoSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VlbiA9IChkYXRhLmFjdGl2ZSB8fCBbXSkuZmluZChvcCA9PiBvcC5iYXRjaElkICE9PSAnJyk7XG4gICAgICAgICAgICAgICAgaWYgKHNlZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZS5iYXRjaElkID0gc2Vlbi5iYXRjaElkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEEgc3RhbGUgYWN0aXZlIHJvdyBpcyBhIGNyYXNoZWQgb3BlcmF0aW9uLCBub3QgYSBsaXZlIG9uZVxuICAgICAgICAgICAgY29uc3QgYWxpdmUgPSAoZGF0YS5hY3RpdmUgfHwgW10pLnNvbWUob3AgPT4gb3Auc3RhbGUgIT09IHRydWUpO1xuICAgICAgICAgICAgaWYgKGFsaXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBzb21ldGhpbmcgaXMgZ2VudWluZWx5IHJ1bm5pbmcgc2VydmVyLXNpZGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmRpc2FybUJhdGNoV2F0Y2goKTtcbiAgICAgICAgICAgIGNvbnN0IHRyYWNrZWRCYXRjaElkID0gaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUuYmF0Y2hJZDtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnJlc2V0QmF0Y2hVcGRhdGUoKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAvLyBUaGUgQmF0Y2hGaW5pc2hlZCBuY2hhbiBtZXNzYWdlIG1heSBzaW1wbHkgaGF2ZSBiZWVuIGxvc3Qgd2hpbGVcbiAgICAgICAgICAgIC8vIGV2ZXJ5IG1vZHVsZSBmaW5pc2hlZCBmaW5lIOKAlCBjaGVjayB0aGUgam91cm5hbCBoaXN0b3J5IGJlZm9yZVxuICAgICAgICAgICAgLy8gZGVjbGFyaW5nIHRoZSBiYXRjaCBkZWFkLlxuICAgICAgICAgICAgY29uc3QgYmF0Y2hPcHMgPSAoZGF0YS5yZWNlbnQgfHwgW10pLmZpbHRlcihcbiAgICAgICAgICAgICAgICBvcCA9PiB0cmFja2VkQmF0Y2hJZCAhPT0gJycgJiYgb3AuYmF0Y2hJZCA9PT0gdHJhY2tlZEJhdGNoSWRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBhbGxDb21wbGV0ZWQgPSBiYXRjaE9wcy5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgJiYgYmF0Y2hPcHMuZXZlcnkob3AgPT4gb3Auc3RhdGUgPT09ICdjb21wbGV0ZWQnKTtcbiAgICAgICAgICAgIGlmIChhbGxDb21wbGV0ZWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXh0X09wZXJhdGlvblN0YWxsZWRFcnJvciB8fCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3JcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzZXMgaW5jb21pbmcgc2VydmVyLXNlbnQgZXZlbnRzIHJlbGF0ZWQgdG8gbW9kdWxlIGluc3RhbGxhdGlvbi5cbiAgICAgKiBVcGRhdGVzIHRoZSBVSSBiYXNlZCBvbiB0aGUgY3VycmVudCBzdGFnZSBvZiBpbnN0YWxsYXRpb24sIGRvd25sb2FkLCB1cGxvYWQsIG9yIGVycm9yIHN0YXRlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSBkYXRhIHBheWxvYWQgb2YgdGhlIHNlcnZlci1zZW50IGV2ZW50LCBjb250YWluaW5nIGRldGFpbHMgYWJvdXQgdGhlIGluc3RhbGxhdGlvbiBzdGFnZSBhbmQgcHJvZ3Jlc3MuXG4gICAgICovXG4gICAgcHJvY2Vzc01vZHVsZUluc3RhbGxhdGlvbihyZXNwb25zZSl7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnNhdmVNZXNzYWdlKHJlc3BvbnNlKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIud2F0Y2hkb2cubm90aWZ5RXZlbnQocmVzcG9uc2UpO1xuICAgICAgICBpZiAoaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucHJvY2Vzc0JhdGNoRXZlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSByZXNwb25zZS5tb2R1bGVVbmlxdWVJZDtcbiAgICAgICAgY29uc3Qgc3RhZ2UgPSByZXNwb25zZS5zdGFnZTtcbiAgICAgICAgY29uc3Qgc3RhZ2VEZXRhaWxzID0gcmVzcG9uc2Uuc3RhZ2VEZXRhaWxzIHx8IHt9O1xuICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgaWYgKHN0YWdlID09PSdTdGFnZV9JX0dldFJlbGVhc2UnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0dldFJlbGVhc2VJblByb2dyZXNzLCAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lJX0NoZWNrTGljZW5zZScpe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfQ2hlY2tMaWNlbnNlSW5Qcm9ncmVzcywgMik7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9JSUlfR2V0RG93bmxvYWRMaW5rJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9DaGVja0xpY2Vuc2VJblByb2dyZXNzLCAzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lWX0Rvd25sb2FkTW9kdWxlJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYkFmdGVyUmVjZWl2ZU5ld0Rvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMsICRyb3cpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSV9VcGxvYWRNb2R1bGUnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNiQWZ0ZXJSZWNlaXZlTmV3VXBsb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfVl9JbnN0YWxsTW9kdWxlJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX1ZJX0VuYWJsZU1vZHVsZScpe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgOTkpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfVklJX0ZpbmFsU3RhdHVzJyl7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuYmF0Y2hNb2RlID09PSB0cnVlIHx8IHJlc3BvbnNlLmJhdGNoSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLndhdGNoZG9nLnN0b3AoKTtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMucmVzdWx0PT09ZmFsc2Upe1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IsIHN0YWdlRGV0YWlscy5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzYXZlTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIC8vINCf0L7Qu9GD0YfQsNC10Lwg0YLQtdC60YPRidGD0Y4g0LjRgdGC0L7RgNC40Y5cbiAgICAgICAgbGV0IGhpc3RvcnkgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd3c01vZHVsZUluc3RhbGxhdGlvbkhpc3RvcnknKSB8fCAnW10nKTtcbiAgICAgICAgXG4gICAgICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQvdC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtVxuICAgICAgICBoaXN0b3J5LnB1c2goe1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8g0J7Qs9GA0LDQvdC40YfQuNCy0LDQtdC8INGA0LDQt9C80LXRgCDQuNGB0YLQvtGA0LjQuCAo0L3QsNC/0YDQuNC80LXRgCwg0LTQviAxMDAg0YHQvtC+0LHRidC10L3QuNC5KVxuICAgICAgICBpZiAoaGlzdG9yeS5sZW5ndGggPiAxMDApIHtcbiAgICAgICAgICAgIGhpc3RvcnkgPSBoaXN0b3J5LnNsaWNlKGhpc3RvcnkubGVuZ3RoIC0gMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8g0KHQvtGF0YDQsNC90Y/QtdC8INC+0LHQvdC+0LLQu9C10L3QvdGD0Y4g0LjRgdGC0L7RgNC40Y5cbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3dzSGlzdG9yeScsIEpTT04uc3RyaW5naWZ5KGhpc3RvcnkpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIGxvY2FsIFVJIHRyYWNraW5nIGZvciBhIGJhdGNoIHVwZGF0ZS5cbiAgICAgKiBAcGFyYW0ge0FycmF5PHN0cmluZz59IG1vZHVsZXNGb3JVcGRhdGVcbiAgICAgKi9cbiAgICBzdGFydEJhdGNoVXBkYXRlKG1vZHVsZXNGb3JVcGRhdGUpIHtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBiYXRjaElkOiAnJyxcbiAgICAgICAgICAgIHRvdGFsOiBtb2R1bGVzRm9yVXBkYXRlLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogbmV3IFNldCgpLFxuICAgICAgICAgICAgZmFpbGVkOiBuZXcgU2V0KCksXG4gICAgICAgIH07XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoTGFzdEV2ZW50QXQgPSBEYXRlLm5vdygpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5hcm1CYXRjaFdhdGNoKCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNUaXRsZSk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiAxLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgbG9jYWwgVUkgdHJhY2tpbmcgZm9yIGEgYmF0Y2ggdXBkYXRlLlxuICAgICAqL1xuICAgIHJlc2V0QmF0Y2hVcGRhdGUoKSB7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgICAgIGJhdGNoSWQ6ICcnLFxuICAgICAgICAgICAgdG90YWw6IDAsXG4gICAgICAgICAgICBjb21wbGV0ZWQ6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIGZhaWxlZDogbmV3IFNldCgpLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHNlcnZlci1zaWRlIGJhdGNoIHVwZGF0ZSBldmVudHMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgcHJvY2Vzc0JhdGNoRXZlbnQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmJhdGNoTW9kZSAhPT0gdHJ1ZSAmJiByZXNwb25zZS5iYXRjaElkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoTGFzdEV2ZW50QXQgPSBEYXRlLm5vdygpO1xuXG4gICAgICAgIGNvbnN0IHN0YWdlID0gcmVzcG9uc2Uuc3RhZ2U7XG4gICAgICAgIGNvbnN0IHN0YWdlRGV0YWlscyA9IHJlc3BvbnNlLnN0YWdlRGV0YWlscyB8fCB7fTtcbiAgICAgICAgY29uc3QgYmF0Y2ggPSBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZTtcblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaFN0YXJ0ZWQnKSB7XG4gICAgICAgICAgICBiYXRjaC5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgYmF0Y2guYmF0Y2hJZCA9IHJlc3BvbnNlLmJhdGNoSWQgfHwgJyc7XG4gICAgICAgICAgICBiYXRjaC50b3RhbCA9IHN0YWdlRGV0YWlscy50b3RhbCB8fCBiYXRjaC50b3RhbDtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3Moc3RhZ2VEZXRhaWxzLnRvdGFsID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YWdlID09PSAnQmF0Y2hNb2R1bGVTdGFydGVkJykge1xuICAgICAgICAgICAgYmF0Y2guYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIGJhdGNoLmJhdGNoSWQgPSByZXNwb25zZS5iYXRjaElkIHx8IGJhdGNoLmJhdGNoSWQ7XG4gICAgICAgICAgICBiYXRjaC50b3RhbCA9IHN0YWdlRGV0YWlscy50b3RhbCB8fCBiYXRjaC50b3RhbDtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3MoXG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2FsY3VsYXRlQmF0Y2hQZXJjZW50KHN0YWdlRGV0YWlscy5jdXJyZW50IHx8IDEsIGJhdGNoLnRvdGFsKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YWdlID09PSAnQmF0Y2hNb2R1bGVDb21wbGV0ZWQnKSB7XG4gICAgICAgICAgICBiYXRjaC5jb21wbGV0ZWQuYWRkKHN0YWdlRGV0YWlscy5tb2R1bGVVbmlxdWVJZCB8fCByZXNwb25zZS5tb2R1bGVVbmlxdWVJZCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKFxuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNhbGN1bGF0ZUJhdGNoUGVyY2VudChzdGFnZURldGFpbHMuY3VycmVudCB8fCBiYXRjaC5jb21wbGV0ZWQuc2l6ZSwgYmF0Y2gudG90YWwpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaE1vZHVsZUZhaWxlZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZVVuaXF1ZUlkID0gc3RhZ2VEZXRhaWxzLm1vZHVsZVVuaXF1ZUlkIHx8IHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkO1xuICAgICAgICAgICAgYmF0Y2guZmFpbGVkLmFkZChtb2R1bGVVbmlxdWVJZCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKFxuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNhbGN1bGF0ZUJhdGNoUGVyY2VudChzdGFnZURldGFpbHMuY3VycmVudCB8fCBiYXRjaC5jb21wbGV0ZWQuc2l6ZSArIGJhdGNoLmZhaWxlZC5zaXplLCBiYXRjaC50b3RhbClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvciwgc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YWdlID09PSAnQmF0Y2hGaW5pc2hlZCcpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBzdHJhZ2dsZXJzIGZyb20gYSBwcmV2aW91cyBiYXRjaCAoZS5nLiwgdXNlciByZS10cmlnZ2VyZWQgVXBkYXRlIEFsbCkuXG4gICAgICAgICAgICBpZiAoYmF0Y2guYmF0Y2hJZCAhPT0gJycgJiYgcmVzcG9uc2UuYmF0Y2hJZCAmJiByZXNwb25zZS5iYXRjaElkICE9PSBiYXRjaC5iYXRjaElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5kaXNhcm1CYXRjaFdhdGNoKCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKDEwMCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXNldEJhdGNoVXBkYXRlKCk7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyBhZ2dyZWdhdGUgYmF0Y2ggcHJvZ3Jlc3MuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGN1cnJlbnRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdG90YWxcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZUJhdGNoUGVyY2VudChjdXJyZW50LCB0b3RhbCkge1xuICAgICAgICBpZiAodG90YWwgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KE1hdGgucm91bmQoKGN1cnJlbnQgLSAxKSAvIHRvdGFsICogMTAwKSwgMSksIDk5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgYWdncmVnYXRlIGJhdGNoIHByb2dyZXNzIGJhci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyY2VudFxuICAgICAqL1xuICAgIHVwZGF0ZUJhdGNoUHJvZ3Jlc3MocGVyY2VudCkge1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJCbG9jay5zaG93KCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5zaG93KCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVBbGxNb2R1bGVzVGl0bGUpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogcGVyY2VudCxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIFVJIHRvIHJlZmxlY3QgdGhlIHByb2dyZXNzIG9mIGEgbW9kdWxlIGRvd25sb2FkLlxuICAgICAqIEFkanVzdHMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRldGFpbHMgcHJvdmlkZWQgaW4gdGhlIHNlcnZlci1zZW50IGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkIC0gVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBtb2R1bGUgYmVpbmcgZG93bmxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhZ2VEZXRhaWxzIC0gRGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGRvd25sb2FkIHByb2dyZXNzLlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByb3cgaW4gdGhlIFVJIGFzc29jaWF0ZWQgd2l0aCB0aGUgbW9kdWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscywgJHJvdykge1xuICAgICAgICAvLyBTb21lIGV2ZW50cyAoZS5nLiBhbiBlcnJvciByYWlzZWQgYmVmb3JlIHRoZSBkb3dubG9hZCBzdGFydGVkKSBhcnJpdmUgd2l0aG91dCBgZGF0YWBcbiAgICAgICAgY29uc3QgZGF0YSA9IHN0YWdlRGV0YWlscy5kYXRhIHx8IHt9O1xuICAgICAgICAvLyBDaGVjayBtb2R1bGUgZG93bmxvYWQgc3RhdHVzXG4gICAgICAgIGlmIChkYXRhLmRfc3RhdHVzID09PSAnRE9XTkxPQURfSU5fUFJPR1JFU1MnKSB7XG4gICAgICAgICAgICBjb25zdCBkb3dubG9hZFByb2dyZXNzID0gTWF0aC5tYXgoTWF0aC5yb3VuZChwYXJzZUludChkYXRhLmRfc3RhdHVzX3Byb2dyZXNzLCAxMCkvMiktMSwgMyk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9Eb3dubG9hZEluUHJvZ3Jlc3MsIGRvd25sb2FkUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9DT01QTEVURScpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0Rvd25sb2FkSW5Qcm9ncmVzcywgNTApO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9FUlJPUicpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcigkcm93LCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLCBzdGFnZURldGFpbHMubWVzc2FnZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgVUkgdG8gcmVmbGVjdCB0aGUgcHJvZ3Jlc3Mgb2YgYSBtb2R1bGUgdXBsb2FkLlxuICAgICAqIEFkanVzdHMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRldGFpbHMgcHJvdmlkZWQgaW4gdGhlIHNlcnZlci1zZW50IGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkIC0gVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBtb2R1bGUgYmVpbmcgdXBsb2FkZWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHN0YWdlRGV0YWlscyAtIERldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IHRoZSB1cGxvYWQgcHJvZ3Jlc3MuXG4gICAgICovXG4gICAgY2JBZnRlclJlY2VpdmVOZXdVcGxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuICAgICAgICAvLyBTb21lIGV2ZW50cyAoZS5nLiBhbiBlcnJvciByYWlzZWQgYmVmb3JlIHRoZSB1cGxvYWQgc3RhcnRlZCkgYXJyaXZlIHdpdGhvdXQgYGRhdGFgXG4gICAgICAgIGNvbnN0IGRhdGEgPSBzdGFnZURldGFpbHMuZGF0YSB8fCB7fTtcbiAgICAgICAgLy8gQ2hlY2sgbW9kdWxlIHVwbG9hZCBzdGF0dXNcbiAgICAgICAgaWYgKGRhdGEuZF9zdGF0dXMgPT09ICdVUExPQURfSU5fUFJPR1JFU1MnKSB7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGxvYWRJblByb2dyZXNzLCA0OSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGF0YS5kX3N0YXR1cyA9PT0gJ1VQTE9BRF9DT01QTEVURScpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X1VwbG9hZEluUHJvZ3Jlc3MsIDUwKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHVwZGF0ZXMgb24gdGhlIGluc3RhbGxhdGlvbiBwcm9ncmVzcyBvZiBhIG1vZHVsZS5cbiAgICAgKiBVcGRhdGVzIHRoZSBwcm9ncmVzcyBiYXIgYW5kIHN0YXR1cyBtZXNzYWdlIGJhc2VkIG9uIHRoZSBpbmZvcm1hdGlvbiByZWNlaXZlZCBpbiB0aGUgc2VydmVyLXNlbnQgZXZlbnQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSWQgLSBUaGUgdW5pcXVlIGlkZW50aWZpZXIgb2YgdGhlIG1vZHVsZSBiZWluZyBpbnN0YWxsZWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHN0YWdlRGV0YWlscyAtIERldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0IHRoZSBpbnN0YWxsYXRpb24gcHJvZ3Jlc3MuXG4gICAgICovXG4gICAgY2JBZnRlclJlY2VpdmVOZXdJbnN0YWxsYXRpb25TdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuICAgICAgICAvLyBTb21lIGV2ZW50cyAoZS5nLiBhbiBlcnJvciByYWlzZWQgYmVmb3JlIHRoZSBpbnN0YWxsYXRpb24gc3RhcnRlZCkgYXJyaXZlIHdpdGhvdXQgYGRhdGFgXG4gICAgICAgIGNvbnN0IGRhdGEgPSBzdGFnZURldGFpbHMuZGF0YSB8fCB7fTtcbiAgICAgICAgLy8gQ2hlY2sgbW9kdWxlIGluc3RhbGxhdGlvbiBzdGF0dXNcbiAgICAgICAgaWYgKGRhdGEuaV9zdGF0dXMgPT09ICdJTlNUQUxMQVRJT05fSU5fUFJPR1JFU1MnKSB7XG4gICAgICAgICAgICBjb25zdCBpbnN0YWxsYXRpb25Qcm9ncmVzcyA9IE1hdGgucm91bmQocGFyc2VJbnQoZGF0YS5pX3N0YXR1c19wcm9ncmVzcywgMTApLzIrNTApO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgaW5zdGFsbGF0aW9uUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKGRhdGEuaV9zdGF0dXMgPT09ICdJTlNUQUxMQVRJT05fQ09NUExFVEUnKSB7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25JblByb2dyZXNzLCA5OCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXRzIHRoZSBVSSBlbGVtZW50cyBhc3NvY2lhdGVkIHdpdGggYSBtb2R1bGUgcm93IHRvIHRoZWlyIGRlZmF1bHQgc3RhdGUuXG4gICAgICogVGhpcyBpcyB0eXBpY2FsbHkgY2FsbGVkIGFmdGVyIGFuIGluc3RhbGxhdGlvbiBwcm9jZXNzIGNvbXBsZXRlcyBvciBmYWlscy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByb3cgaW4gdGhlIFVJIGFzc29jaWF0ZWQgd2l0aCB0aGUgbW9kdWxlLlxuICAgICAqL1xuICAgIHJlc2V0QnV0dG9uVmlldygkcm93KXtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJHJvdy5maW5kKCdpLmxvYWRpbmcnKS5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgICRyb3cuZmluZCgnYS5kb3dubG9hZCBpJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICRyb3cuZmluZCgnYS51cGRhdGUgaScpLmFkZENsYXNzKCdyZWRvJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXlzIGFuIGVycm9yIG1lc3NhZ2UgcmVsYXRlZCB0byBtb2R1bGUgaW5zdGFsbGF0aW9uIGluIHRoZSBVSS5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aGVuIGFuIGluc3RhbGxhdGlvbiBmYWlscywgcHJvdmlkaW5nIGZlZWRiYWNrIHRvIHRoZSB1c2VyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBUaGUgalF1ZXJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJvdyBpbiB0aGUgVUkgYXNzb2NpYXRlZCB3aXRoIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIFRoZSBoZWFkZXIgdGV4dCBmb3IgdGhlIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2VzIC0gRGV0YWlsZWQgZXJyb3IgbWVzc2FnZXMgdG8gYmUgZGlzcGxheWVkLlxuICAgICAqL1xuICAgIHNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcigkcm93LCBoZWFkZXIsIG1lc3NhZ2VzPScnKSB7XG4gICAgICAgIGlmIChtZXNzYWdlcz09PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCRyb3cubGVuZ3RoPT09MCl7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcobWVzc2FnZXMsIGhlYWRlcik7XG4gICAgICAgICAgICAkKCcjYWRkLW5ldy1idXR0b24nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnJlc2V0QnV0dG9uVmlldygkcm93KTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Q29uZmlnLmtleU1hbmFnZW1lbnRTaXRlfTwvYT5gO1xuICAgICAgICAgICAgbWVzc2FnZXMubGljZW5zZS5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHREZXNjcmlwdGlvbiA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZXMpO1xuICAgICAgICBjb25zdCBodG1sTWVzc2FnZT0gIGA8dHIgY2xhc3M9XCJ1aSB3YXJuaW5nIHRhYmxlLWVycm9yLW1lc3NhZ2VzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNvbHNwYW49XCI1XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNlbnRlciBhbGlnbmVkIGljb24gaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtoZWFkZXJ9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+JHt0ZXh0RGVzY3JpcHRpb259PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RyPmA7XG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ3dhcm5pbmcnKTtcbiAgICAgICAgJHJvdy5iZWZvcmUoaHRtbE1lc3NhZ2UpO1xuICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6ICRyb3cub2Zmc2V0KCkudG9wLFxuICAgICAgICB9LCAyMDAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgcHJvZ3Jlc3MgYmFyIGFuZCBzdGF0dXMgbWVzc2FnZSB0byByZWZsZWN0IHRoZSBjdXJyZW50IHN0YXRlIG9mIGEgbW9kdWxlIGluc3RhbGxhdGlvbiBwcm9jZXNzLlxuICAgICAqIFRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0aHJvdWdob3V0IGRpZmZlcmVudCBzdGFnZXMgb2YgaW5zdGFsbGF0aW9uIHRvIHByb3ZpZGUgcmVhbC10aW1lIGZlZWRiYWNrIHRvIHRoZSB1c2VyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkIC0gVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGhlYWRlciAtIFRoZSBzdGF0dXMgbWVzc2FnZSB0byBiZSBkaXNwbGF5ZWQgYWJvdmUgdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW3BlcmNlbnQ9MF0gLSBUaGUgY3VycmVudCBwcm9ncmVzcyBwZXJjZW50YWdlIHRvIGJlIHJlZmxlY3RlZCBpbiB0aGUgcHJvZ3Jlc3MgYmFyLlxuICAgICAqL1xuICAgIHVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBoZWFkZXIsIHBlcmNlbnQ9MCl7XG4gICAgICAgIGlmIChtb2R1bGVVbmlxdWVJZCA9PT0gdW5kZWZpbmVkIHx8IG1vZHVsZVVuaXF1ZUlkID09PSAnJyl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbGV0IG1vZHVsZU5hbWUgPSAkKGB0ci5uZXctbW9kdWxlLXJvd1tkYXRhLWlkPSR7bW9kdWxlVW5pcXVlSWR9XWApLmRhdGEoJ25hbWUnKTtcbiAgICAgICAgaWYgKG1vZHVsZU5hbWUgPT09IHVuZGVmaW5lZCl7XG4gICAgICAgICAgICBtb2R1bGVOYW1lID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2suc2hvdygpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXIuc2hvdygpO1xuICAgICAgICBpZiAoaGVhZGVyKXtcbiAgICAgICAgICAgIGNvbnN0IGJhclRleHQ9IG1vZHVsZU5hbWUrJzogJytoZWFkZXI7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbC50ZXh0KGJhclRleHQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwZXJjZW50PjApe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICBwZXJjZW50OiBwZXJjZW50LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplcyB0aGUgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIgbW9kdWxlIHdoZW4gdGhlIERPTSBpcyBmdWxseSBsb2FkZWQuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=