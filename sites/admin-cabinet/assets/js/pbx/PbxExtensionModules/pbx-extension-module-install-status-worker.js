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

/* global globalRootUrl, PbxApi, globalTranslate, UserMessage, EventBus */

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
   * Initializes the installStatusLoopWorker module by setting up the connection to receive server-sent events.
   */
  initialize: function initialize() {
    installStatusLoopWorker.$progressBar = $('#upload-progress-bar');
    installStatusLoopWorker.$progressBarBlock = $('#upload-progress-bar-block');
    installStatusLoopWorker.$progressBarLabel = $('#upload-progress-bar-label');
    EventBus.subscribe(this.channelId, function (data) {
      installStatusLoopWorker.processModuleInstallation(data);
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

    if (installStatusLoopWorker.processBatchEvent(response)) {
      return;
    }

    var moduleUniqueId = response.moduleUniqueId;
    var stage = response.stage;
    var stageDetails = response.stageDetails;
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
    // Check module download status
    if (stageDetails.data.d_status === 'DOWNLOAD_IN_PROGRESS') {
      var downloadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10) / 2) - 1, 3);
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, downloadProgress);
    } else if (stageDetails.data.d_status === 'DOWNLOAD_COMPLETE') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_DownloadInProgress, 50);
    } else if (stageDetails.data.d_status === 'DOWNLOAD_ERROR') {
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
    // Check module upload status
    if (stageDetails.data.d_status === 'UPLOAD_IN_PROGRESS') {
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_UploadInProgress, 49);
    } else if (stageDetails.data.d_status === 'UPLOAD_COMPLETE') {
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
    // Check module installation status
    if (stageDetails.data.i_status === 'INSTALLATION_IN_PROGRESS') {
      var installationProgress = Math.round(parseInt(stageDetails.data.i_status_progress, 10) / 2 + 50);
      installStatusLoopWorker.updateProgressBar(moduleUniqueId, globalTranslate.ext_InstallationInProgress, installationProgress);
    } else if (stageDetails.data.i_status === 'INSTALLATION_COMPLETE') {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluc3RhbGwtc3RhdHVzLXdvcmtlci5qcyJdLCJuYW1lcyI6WyJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsIiRwcm9ncmVzc0JhciIsIiRwcm9ncmVzc0JhckJsb2NrIiwiJHByb2dyZXNzQmFyTGFiZWwiLCJldmVudFNvdXJjZSIsImNoYW5uZWxJZCIsImJhdGNoVXBkYXRlIiwiYWN0aXZlIiwiYmF0Y2hJZCIsInRvdGFsIiwiY29tcGxldGVkIiwiU2V0IiwiZmFpbGVkIiwiaW5pdGlhbGl6ZSIsIiQiLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uIiwicmVzcG9uc2UiLCJzYXZlTWVzc2FnZSIsInByb2Nlc3NCYXRjaEV2ZW50IiwibW9kdWxlVW5pcXVlSWQiLCJzdGFnZSIsInN0YWdlRGV0YWlscyIsIiRyb3ciLCJ1cGRhdGVQcm9ncmVzc0JhciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9HZXRSZWxlYXNlSW5Qcm9ncmVzcyIsImV4dF9DaGVja0xpY2Vuc2VJblByb2dyZXNzIiwiY2JBZnRlclJlY2VpdmVOZXdEb3dubG9hZFN0YXR1cyIsImNiQWZ0ZXJSZWNlaXZlTmV3VXBsb2FkU3RhdHVzIiwiY2JBZnRlclJlY2VpdmVOZXdJbnN0YWxsYXRpb25TdGF0dXMiLCJleHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcyIsImJhdGNoTW9kZSIsInVuZGVmaW5lZCIsInJlc3VsdCIsImhpZGUiLCJtZXNzYWdlcyIsInNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvciIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIm1lc3NhZ2UiLCJoaXN0b3J5IiwiSlNPTiIsInBhcnNlIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsInB1c2giLCJ0aW1lc3RhbXAiLCJEYXRlIiwidG9JU09TdHJpbmciLCJsZW5ndGgiLCJzbGljZSIsInNldEl0ZW0iLCJzdHJpbmdpZnkiLCJzdGFydEJhdGNoVXBkYXRlIiwibW9kdWxlc0ZvclVwZGF0ZSIsInNob3ciLCJ0ZXh0IiwiZXh0X1VwZGF0ZUFsbE1vZHVsZXNUaXRsZSIsInByb2dyZXNzIiwicGVyY2VudCIsInJlc2V0QmF0Y2hVcGRhdGUiLCJiYXRjaCIsInVwZGF0ZUJhdGNoUHJvZ3Jlc3MiLCJjYWxjdWxhdGVCYXRjaFBlcmNlbnQiLCJjdXJyZW50IiwiYWRkIiwic2l6ZSIsInJlbW92ZUNsYXNzIiwiTWF0aCIsIm1pbiIsIm1heCIsInJvdW5kIiwiZF9zdGF0dXMiLCJkb3dubG9hZFByb2dyZXNzIiwicGFyc2VJbnQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImV4dF9Eb3dubG9hZEluUHJvZ3Jlc3MiLCJleHRfVXBsb2FkSW5Qcm9ncmVzcyIsImlfc3RhdHVzIiwiaW5zdGFsbGF0aW9uUHJvZ3Jlc3MiLCJpX3N0YXR1c19wcm9ncmVzcyIsInJlc2V0QnV0dG9uVmlldyIsImZpbmQiLCJhZGRDbGFzcyIsImhlYWRlciIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibGljZW5zZSIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsInRleHREZXNjcmlwdGlvbiIsImNvbnZlcnRUb1RleHQiLCJodG1sTWVzc2FnZSIsImJlZm9yZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJtb2R1bGVOYW1lIiwiYmFyVGV4dCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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M0MsT0FBTyxHQUFDLENBQVosRUFBYztBQUNWaEUsTUFBQUEsdUJBQXVCLENBQUNDLFlBQXhCLENBQXFDOEQsUUFBckMsQ0FBOEM7QUFDMUNDLFFBQUFBLE9BQU8sRUFBRUE7QUFEaUMsT0FBOUM7QUFHSDtBQUNKO0FBMVkyQixDQUFoQyxDLENBNllBOztBQUNBbEQsQ0FBQyxDQUFDOEYsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdHLEVBQUFBLHVCQUF1QixDQUFDYSxVQUF4QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBFdmVudEJ1cyAqL1xuXG4vKipcbiAqIEhhbmRsZXMgcmVhbC10aW1lIG1vbml0b3JpbmcgYW5kIHVwZGF0ZXMgb2YgbW9kdWxlIGluc3RhbGxhdGlvbiBzdGF0dXNlcy5cbiAqIFV0aWxpemVzIHNlcnZlci1zZW50IGV2ZW50cyB0byByZWNlaXZlIHVwZGF0ZXMgYW5kIHJlZmxlY3RzIHRoZXNlIGNoYW5nZXMgaW4gdGhlIFVJLFxuICogcGFydGljdWxhcmx5IGluIHRoZSBwcm9ncmVzcyBiYXIgYW5kIHN0YXR1cyBtZXNzYWdlcyBkaXNwbGF5ZWQgdG8gdGhlIHVzZXIuXG4gKlxuICogQG1vZHVsZSBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlclxuICovXG5jb25zdCBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciA9IHtcbiAgICAvKipcbiAgICAgKiBUaGUgalF1ZXJ5IG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHByb2dyZXNzIGJhciBlbGVtZW50IGluIHRoZSBET00uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHByb2dyZXNzQmFyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjb250YWluZXIgb2YgdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcm9ncmVzc0JhckJsb2NrOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsYWJlbCBlbGVtZW50IGFzc29jaWF0ZWQgd2l0aCB0aGUgcHJvZ3Jlc3MgYmFyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHByb2dyZXNzQmFyTGFiZWw6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgRXZlbnRTb3VyY2Ugb2JqZWN0IHVzZWQgZm9yIHJlY2VpdmluZyByZWFsLXRpbWUgdXBkYXRlcyBmcm9tIHRoZSBzZXJ2ZXIgYWJvdXQgbW9kdWxlIGluc3RhbGxhdGlvbiBzdGF0dXNlcy5cbiAgICAgKiBUaGlzIGFsbG93cyBmb3IgYSBwdXNoLWJhc2VkIG1lY2hhbmlzbSB0byBrZWVwIHRoZSBVSSB1cGRhdGVkIHdpdGggdGhlIGxhdGVzdCBwcm9ncmVzcyBpbmZvcm1hdGlvbi5cbiAgICAgKiBAdHlwZSB7RXZlbnRTb3VyY2V9XG4gICAgICovXG4gICAgZXZlbnRTb3VyY2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUaGUgaWRlbnRpZmllciBmb3IgdGhlIFBVQi9TVUIgY2hhbm5lbCB1c2VkIHRvIHN1YnNjcmliZSB0byBpbnN0YWxsYXRpb24gc3RhdHVzIHVwZGF0ZXMuXG4gICAgICogVGhpcyBlbnN1cmVzIHRoYXQgdGhlIGNsaWVudCBpcyBsaXN0ZW5pbmcgb24gdGhlIGNvcnJlY3QgY2hhbm5lbCBmb3IgcmVsZXZhbnQgZXZlbnRzLlxuICAgICAqL1xuICAgIGNoYW5uZWxJZDogJ2luc3RhbGwtbW9kdWxlJyxcblxuICAgIC8qKlxuICAgICAqIFN0YXRlIG9mIGEgYnVsayBtb2R1bGUgdXBkYXRlIHNlc3Npb24uXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBiYXRjaFVwZGF0ZToge1xuICAgICAgICBhY3RpdmU6IGZhbHNlLFxuICAgICAgICBiYXRjaElkOiAnJyxcbiAgICAgICAgdG90YWw6IDAsXG4gICAgICAgIGNvbXBsZXRlZDogbmV3IFNldCgpLFxuICAgICAgICBmYWlsZWQ6IG5ldyBTZXQoKSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxTdGF0dXNMb29wV29ya2VyIG1vZHVsZSBieSBzZXR0aW5nIHVwIHRoZSBjb25uZWN0aW9uIHRvIHJlY2VpdmUgc2VydmVyLXNlbnQgZXZlbnRzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKXtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyID0gJCgnI3VwbG9hZC1wcm9ncmVzcy1iYXInKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyQmxvY2sgPSAkKCcjdXBsb2FkLXByb2dyZXNzLWJhci1ibG9jaycpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJMYWJlbCA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWxhYmVsJyk7XG5cbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKHRoaXMuY2hhbm5lbElkLCBkYXRhID0+IHtcbiAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucHJvY2Vzc01vZHVsZUluc3RhbGxhdGlvbihkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByb2Nlc3NlcyBpbmNvbWluZyBzZXJ2ZXItc2VudCBldmVudHMgcmVsYXRlZCB0byBtb2R1bGUgaW5zdGFsbGF0aW9uLlxuICAgICAqIFVwZGF0ZXMgdGhlIFVJIGJhc2VkIG9uIHRoZSBjdXJyZW50IHN0YWdlIG9mIGluc3RhbGxhdGlvbiwgZG93bmxvYWQsIHVwbG9hZCwgb3IgZXJyb3Igc3RhdGVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIGRhdGEgcGF5bG9hZCBvZiB0aGUgc2VydmVyLXNlbnQgZXZlbnQsIGNvbnRhaW5pbmcgZGV0YWlscyBhYm91dCB0aGUgaW5zdGFsbGF0aW9uIHN0YWdlIGFuZCBwcm9ncmVzcy5cbiAgICAgKi9cbiAgICBwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2F2ZU1lc3NhZ2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucHJvY2Vzc0JhdGNoRXZlbnQocmVzcG9uc2UpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSByZXNwb25zZS5tb2R1bGVVbmlxdWVJZDtcbiAgICAgICAgY29uc3Qgc3RhZ2UgPSByZXNwb25zZS5zdGFnZTtcbiAgICAgICAgY29uc3Qgc3RhZ2VEZXRhaWxzID0gcmVzcG9uc2Uuc3RhZ2VEZXRhaWxzO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgaWYgKHN0YWdlID09PSdTdGFnZV9JX0dldFJlbGVhc2UnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0dldFJlbGVhc2VJblByb2dyZXNzLCAxKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lJX0NoZWNrTGljZW5zZScpe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfQ2hlY2tMaWNlbnNlSW5Qcm9ncmVzcywgMik7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9JSUlfR2V0RG93bmxvYWRMaW5rJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9DaGVja0xpY2Vuc2VJblByb2dyZXNzLCAzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lWX0Rvd25sb2FkTW9kdWxlJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYkFmdGVyUmVjZWl2ZU5ld0Rvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMsICRyb3cpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSV9VcGxvYWRNb2R1bGUnKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNiQWZ0ZXJSZWNlaXZlTmV3VXBsb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfVl9JbnN0YWxsTW9kdWxlJyl7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX1ZJX0VuYWJsZU1vZHVsZScpe1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgOTkpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfVklJX0ZpbmFsU3RhdHVzJyl7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuYmF0Y2hNb2RlID09PSB0cnVlIHx8IHJlc3BvbnNlLmJhdGNoSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMucmVzdWx0PT09ZmFsc2Upe1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IsIHN0YWdlRGV0YWlscy5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBzYXZlTWVzc2FnZShtZXNzYWdlKSB7XG4gICAgICAgIC8vINCf0L7Qu9GD0YfQsNC10Lwg0YLQtdC60YPRidGD0Y4g0LjRgdGC0L7RgNC40Y5cbiAgICAgICAgbGV0IGhpc3RvcnkgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCd3c01vZHVsZUluc3RhbGxhdGlvbkhpc3RvcnknKSB8fCAnW10nKTtcbiAgICAgICAgXG4gICAgICAgIC8vINCU0L7QsdCw0LLQu9GP0LXQvCDQvdC+0LLQvtC1INGB0L7QvtCx0YnQtdC90LjQtVxuICAgICAgICBoaXN0b3J5LnB1c2goe1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8g0J7Qs9GA0LDQvdC40YfQuNCy0LDQtdC8INGA0LDQt9C80LXRgCDQuNGB0YLQvtGA0LjQuCAo0L3QsNC/0YDQuNC80LXRgCwg0LTQviAxMDAg0YHQvtC+0LHRidC10L3QuNC5KVxuICAgICAgICBpZiAoaGlzdG9yeS5sZW5ndGggPiAxMDApIHtcbiAgICAgICAgICAgIGhpc3RvcnkgPSBoaXN0b3J5LnNsaWNlKGhpc3RvcnkubGVuZ3RoIC0gMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8g0KHQvtGF0YDQsNC90Y/QtdC8INC+0LHQvdC+0LLQu9C10L3QvdGD0Y4g0LjRgdGC0L7RgNC40Y5cbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ3dzSGlzdG9yeScsIEpTT04uc3RyaW5naWZ5KGhpc3RvcnkpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIGxvY2FsIFVJIHRyYWNraW5nIGZvciBhIGJhdGNoIHVwZGF0ZS5cbiAgICAgKiBAcGFyYW0ge0FycmF5PHN0cmluZz59IG1vZHVsZXNGb3JVcGRhdGVcbiAgICAgKi9cbiAgICBzdGFydEJhdGNoVXBkYXRlKG1vZHVsZXNGb3JVcGRhdGUpIHtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuYmF0Y2hVcGRhdGUgPSB7XG4gICAgICAgICAgICBhY3RpdmU6IHRydWUsXG4gICAgICAgICAgICBiYXRjaElkOiAnJyxcbiAgICAgICAgICAgIHRvdGFsOiBtb2R1bGVzRm9yVXBkYXRlLmxlbmd0aCxcbiAgICAgICAgICAgIGNvbXBsZXRlZDogbmV3IFNldCgpLFxuICAgICAgICAgICAgZmFpbGVkOiBuZXcgU2V0KCksXG4gICAgICAgIH07XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNUaXRsZSk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICBwZXJjZW50OiAxLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgbG9jYWwgVUkgdHJhY2tpbmcgZm9yIGEgYmF0Y2ggdXBkYXRlLlxuICAgICAqL1xuICAgIHJlc2V0QmF0Y2hVcGRhdGUoKSB7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmJhdGNoVXBkYXRlID0ge1xuICAgICAgICAgICAgYWN0aXZlOiBmYWxzZSxcbiAgICAgICAgICAgIGJhdGNoSWQ6ICcnLFxuICAgICAgICAgICAgdG90YWw6IDAsXG4gICAgICAgICAgICBjb21wbGV0ZWQ6IG5ldyBTZXQoKSxcbiAgICAgICAgICAgIGZhaWxlZDogbmV3IFNldCgpLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIHNlcnZlci1zaWRlIGJhdGNoIHVwZGF0ZSBldmVudHMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgcHJvY2Vzc0JhdGNoRXZlbnQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmJhdGNoTW9kZSAhPT0gdHJ1ZSAmJiByZXNwb25zZS5iYXRjaElkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0YWdlID0gcmVzcG9uc2Uuc3RhZ2U7XG4gICAgICAgIGNvbnN0IHN0YWdlRGV0YWlscyA9IHJlc3BvbnNlLnN0YWdlRGV0YWlscyB8fCB7fTtcbiAgICAgICAgY29uc3QgYmF0Y2ggPSBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5iYXRjaFVwZGF0ZTtcblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaFN0YXJ0ZWQnKSB7XG4gICAgICAgICAgICBiYXRjaC5hY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgYmF0Y2guYmF0Y2hJZCA9IHJlc3BvbnNlLmJhdGNoSWQgfHwgJyc7XG4gICAgICAgICAgICBiYXRjaC50b3RhbCA9IHN0YWdlRGV0YWlscy50b3RhbCB8fCBiYXRjaC50b3RhbDtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3Moc3RhZ2VEZXRhaWxzLnRvdGFsID4gMCA/IDEgOiAwKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YWdlID09PSAnQmF0Y2hNb2R1bGVTdGFydGVkJykge1xuICAgICAgICAgICAgYmF0Y2guYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgIGJhdGNoLmJhdGNoSWQgPSByZXNwb25zZS5iYXRjaElkIHx8IGJhdGNoLmJhdGNoSWQ7XG4gICAgICAgICAgICBiYXRjaC50b3RhbCA9IHN0YWdlRGV0YWlscy50b3RhbCB8fCBiYXRjaC50b3RhbDtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZUJhdGNoUHJvZ3Jlc3MoXG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2FsY3VsYXRlQmF0Y2hQZXJjZW50KHN0YWdlRGV0YWlscy5jdXJyZW50IHx8IDEsIGJhdGNoLnRvdGFsKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YWdlID09PSAnQmF0Y2hNb2R1bGVDb21wbGV0ZWQnKSB7XG4gICAgICAgICAgICBiYXRjaC5jb21wbGV0ZWQuYWRkKHN0YWdlRGV0YWlscy5tb2R1bGVVbmlxdWVJZCB8fCByZXNwb25zZS5tb2R1bGVVbmlxdWVJZCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKFxuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNhbGN1bGF0ZUJhdGNoUGVyY2VudChzdGFnZURldGFpbHMuY3VycmVudCB8fCBiYXRjaC5jb21wbGV0ZWQuc2l6ZSwgYmF0Y2gudG90YWwpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdCYXRjaE1vZHVsZUZhaWxlZCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZVVuaXF1ZUlkID0gc3RhZ2VEZXRhaWxzLm1vZHVsZVVuaXF1ZUlkIHx8IHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkO1xuICAgICAgICAgICAgYmF0Y2guZmFpbGVkLmFkZChtb2R1bGVVbmlxdWVJZCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKFxuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNhbGN1bGF0ZUJhdGNoUGVyY2VudChzdGFnZURldGFpbHMuY3VycmVudCB8fCBiYXRjaC5jb21wbGV0ZWQuc2l6ZSArIGJhdGNoLmZhaWxlZC5zaXplLCBiYXRjaC50b3RhbClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvciwgc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YWdlID09PSAnQmF0Y2hGaW5pc2hlZCcpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBzdHJhZ2dsZXJzIGZyb20gYSBwcmV2aW91cyBiYXRjaCAoZS5nLiwgdXNlciByZS10cmlnZ2VyZWQgVXBkYXRlIEFsbCkuXG4gICAgICAgICAgICBpZiAoYmF0Y2guYmF0Y2hJZCAhPT0gJycgJiYgcmVzcG9uc2UuYmF0Y2hJZCAmJiByZXNwb25zZS5iYXRjaElkICE9PSBiYXRjaC5iYXRjaElkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci51cGRhdGVCYXRjaFByb2dyZXNzKDEwMCk7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXNldEJhdGNoVXBkYXRlKCk7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsY3VsYXRlcyBhZ2dyZWdhdGUgYmF0Y2ggcHJvZ3Jlc3MuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGN1cnJlbnRcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdG90YWxcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNhbGN1bGF0ZUJhdGNoUGVyY2VudChjdXJyZW50LCB0b3RhbCkge1xuICAgICAgICBpZiAodG90YWwgPD0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGgubWluKE1hdGgubWF4KE1hdGgucm91bmQoKGN1cnJlbnQgLSAxKSAvIHRvdGFsICogMTAwKSwgMSksIDk5KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgYWdncmVnYXRlIGJhdGNoIHByb2dyZXNzIGJhci5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyY2VudFxuICAgICAqL1xuICAgIHVwZGF0ZUJhdGNoUHJvZ3Jlc3MocGVyY2VudCkge1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJCbG9jay5zaG93KCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5zaG93KCk7XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckxhYmVsLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVBbGxNb2R1bGVzVGl0bGUpO1xuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXIucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgcGVyY2VudDogcGVyY2VudCxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIFVJIHRvIHJlZmxlY3QgdGhlIHByb2dyZXNzIG9mIGEgbW9kdWxlIGRvd25sb2FkLlxuICAgICAqIEFkanVzdHMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGRldGFpbHMgcHJvdmlkZWQgaW4gdGhlIHNlcnZlci1zZW50IGV2ZW50LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkIC0gVGhlIHVuaXF1ZSBpZGVudGlmaWVyIG9mIHRoZSBtb2R1bGUgYmVpbmcgZG93bmxvYWRlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhZ2VEZXRhaWxzIC0gRGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGRvd25sb2FkIHByb2dyZXNzLlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByb3cgaW4gdGhlIFVJIGFzc29jaWF0ZWQgd2l0aCB0aGUgbW9kdWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscywgJHJvdykge1xuICAgICAgICAvLyBDaGVjayBtb2R1bGUgZG93bmxvYWQgc3RhdHVzXG4gICAgICAgIGlmIChzdGFnZURldGFpbHMuZGF0YS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRQcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgucm91bmQocGFyc2VJbnQoc3RhZ2VEZXRhaWxzLmRhdGEuZF9zdGF0dXNfcHJvZ3Jlc3MsIDEwKS8yKS0xLCAzKTtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0Rvd25sb2FkSW5Qcm9ncmVzcywgZG93bmxvYWRQcm9ncmVzcyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2VEZXRhaWxzLmRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9DT01QTEVURScpIHtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnVwZGF0ZVByb2dyZXNzQmFyKG1vZHVsZVVuaXF1ZUlkLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0Rvd25sb2FkSW5Qcm9ncmVzcywgNTApO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5kYXRhLmRfc3RhdHVzID09PSAnRE9XTkxPQURfRVJST1InKSB7XG4gICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci4kcHJvZ3Jlc3NCYXJCbG9jay5oaWRlKCk7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvciwgc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIFVJIHRvIHJlZmxlY3QgdGhlIHByb2dyZXNzIG9mIGEgbW9kdWxlIHVwbG9hZC5cbiAgICAgKiBBZGp1c3RzIHRoZSBwcm9ncmVzcyBiYXIgYW5kIHN0YXR1cyBtZXNzYWdlIGJhc2VkIG9uIHRoZSBkZXRhaWxzIHByb3ZpZGVkIGluIHRoZSBzZXJ2ZXItc2VudCBldmVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZCAtIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbW9kdWxlIGJlaW5nIHVwbG9hZGVkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdGFnZURldGFpbHMgLSBEZXRhaWxlZCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgdXBsb2FkIHByb2dyZXNzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZWNlaXZlTmV3VXBsb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMpIHtcbiAgICAgICAgLy8gQ2hlY2sgbW9kdWxlIHVwbG9hZCBzdGF0dXNcbiAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5kYXRhLmRfc3RhdHVzID09PSAnVVBMT0FEX0lOX1BST0dSRVNTJykge1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkSW5Qcm9ncmVzcywgNDkpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5kYXRhLmRfc3RhdHVzID09PSAnVVBMT0FEX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBsb2FkSW5Qcm9ncmVzcywgNTApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdXBkYXRlcyBvbiB0aGUgaW5zdGFsbGF0aW9uIHByb2dyZXNzIG9mIGEgbW9kdWxlLlxuICAgICAqIFVwZGF0ZXMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgYmFzZWQgb24gdGhlIGluZm9ybWF0aW9uIHJlY2VpdmVkIGluIHRoZSBzZXJ2ZXItc2VudCBldmVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZCAtIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbW9kdWxlIGJlaW5nIGluc3RhbGxlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhZ2VEZXRhaWxzIC0gRGV0YWlsZWQgaW5mb3JtYXRpb24gYWJvdXQgdGhlIGluc3RhbGxhdGlvbiBwcm9ncmVzcy5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKSB7XG4gICAgICAgIC8vIENoZWNrIG1vZHVsZSBpbnN0YWxsYXRpb24gc3RhdHVzXG4gICAgICAgIGlmIChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbGxhdGlvblByb2dyZXNzID0gTWF0aC5yb3VuZChwYXJzZUludChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1c19wcm9ncmVzcywgMTApLzIrNTApO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgaW5zdGFsbGF0aW9uUHJvZ3Jlc3MpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5kYXRhLmlfc3RhdHVzID09PSAnSU5TVEFMTEFUSU9OX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIudXBkYXRlUHJvZ3Jlc3NCYXIobW9kdWxlVW5pcXVlSWQsIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uSW5Qcm9ncmVzcywgOTgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0cyB0aGUgVUkgZWxlbWVudHMgYXNzb2NpYXRlZCB3aXRoIGEgbW9kdWxlIHJvdyB0byB0aGVpciBkZWZhdWx0IHN0YXRlLlxuICAgICAqIFRoaXMgaXMgdHlwaWNhbGx5IGNhbGxlZCBhZnRlciBhbiBpbnN0YWxsYXRpb24gcHJvY2VzcyBjb21wbGV0ZXMgb3IgZmFpbHMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFRoZSBqUXVlcnkgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcm93IGluIHRoZSBVSSBhc3NvY2lhdGVkIHdpdGggdGhlIG1vZHVsZS5cbiAgICAgKi9cbiAgICByZXNldEJ1dHRvblZpZXcoJHJvdyl7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICRyb3cuZmluZCgnaS5sb2FkaW5nJykucmVtb3ZlQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuICAgICAgICAkcm93LmZpbmQoJ2EuZG93bmxvYWQgaScpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICAkcm93LmZpbmQoJ2EudXBkYXRlIGknKS5hZGRDbGFzcygncmVkbycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5cyBhbiBlcnJvciBtZXNzYWdlIHJlbGF0ZWQgdG8gbW9kdWxlIGluc3RhbGxhdGlvbiBpbiB0aGUgVUkuXG4gICAgICogVGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgd2hlbiBhbiBpbnN0YWxsYXRpb24gZmFpbHMsIHByb3ZpZGluZyBmZWVkYmFjayB0byB0aGUgdXNlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkcm93IC0gVGhlIGpRdWVyeSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByb3cgaW4gdGhlIFVJIGFzc29jaWF0ZWQgd2l0aCB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXIgLSBUaGUgaGVhZGVyIHRleHQgZm9yIHRoZSBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlcyAtIERldGFpbGVkIGVycm9yIG1lc3NhZ2VzIHRvIGJlIGRpc3BsYXllZC5cbiAgICAgKi9cbiAgICBzaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgaGVhZGVyLCBtZXNzYWdlcz0nJykge1xuICAgICAgICBpZiAobWVzc2FnZXM9PT11bmRlZmluZWQpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICgkcm93Lmxlbmd0aD09PTApe1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKG1lc3NhZ2VzLCBoZWFkZXIpO1xuICAgICAgICAgICAgJCgnI2FkZC1uZXctYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXNldEJ1dHRvblZpZXcoJHJvdyk7XG4gICAgICAgIGlmIChtZXNzYWdlcy5saWNlbnNlIT09dW5kZWZpbmVkKXtcbiAgICAgICAgICAgIGNvbnN0IG1hbmFnZUxpbmsgPSBgPGJyPiR7Z2xvYmFsVHJhbnNsYXRlLmxpY19NYW5hZ2VMaWNlbnNlfSA8YSBocmVmPVwiJHtDb25maWcua2V5TWFuYWdlbWVudFVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke0NvbmZpZy5rZXlNYW5hZ2VtZW50U2l0ZX08L2E+YDtcbiAgICAgICAgICAgIG1lc3NhZ2VzLmxpY2Vuc2UucHVzaChtYW5hZ2VMaW5rKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0ZXh0RGVzY3JpcHRpb24gPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KG1lc3NhZ2VzKTtcbiAgICAgICAgY29uc3QgaHRtbE1lc3NhZ2U9ICBgPHRyIGNsYXNzPVwidWkgd2FybmluZyB0YWJsZS1lcnJvci1tZXNzYWdlc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjb2xzcGFuPVwiNVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjZW50ZXIgYWxpZ25lZCBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aGVhZGVyfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPiR7dGV4dERlc2NyaXB0aW9ufTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90cj5gO1xuICAgICAgICAkcm93LmFkZENsYXNzKCd3YXJuaW5nJyk7XG4gICAgICAgICRyb3cuYmVmb3JlKGh0bWxNZXNzYWdlKTtcbiAgICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgICAgICAgc2Nyb2xsVG9wOiAkcm93Lm9mZnNldCgpLnRvcCxcbiAgICAgICAgfSwgMjAwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIHByb2dyZXNzIGJhciBhbmQgc3RhdHVzIG1lc3NhZ2UgdG8gcmVmbGVjdCB0aGUgY3VycmVudCBzdGF0ZSBvZiBhIG1vZHVsZSBpbnN0YWxsYXRpb24gcHJvY2Vzcy5cbiAgICAgKiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgdGhyb3VnaG91dCBkaWZmZXJlbnQgc3RhZ2VzIG9mIGluc3RhbGxhdGlvbiB0byBwcm92aWRlIHJlYWwtdGltZSBmZWVkYmFjayB0byB0aGUgdXNlci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZCAtIFRoZSB1bmlxdWUgaWRlbnRpZmllciBvZiB0aGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBoZWFkZXIgLSBUaGUgc3RhdHVzIG1lc3NhZ2UgdG8gYmUgZGlzcGxheWVkIGFib3ZlIHRoZSBwcm9ncmVzcyBiYXIuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtwZXJjZW50PTBdIC0gVGhlIGN1cnJlbnQgcHJvZ3Jlc3MgcGVyY2VudGFnZSB0byBiZSByZWZsZWN0ZWQgaW4gdGhlIHByb2dyZXNzIGJhci5cbiAgICAgKi9cbiAgICB1cGRhdGVQcm9ncmVzc0Jhcihtb2R1bGVVbmlxdWVJZCwgaGVhZGVyLCBwZXJjZW50PTApe1xuICAgICAgICBpZiAobW9kdWxlVW5pcXVlSWQgPT09IHVuZGVmaW5lZCB8fCBtb2R1bGVVbmlxdWVJZCA9PT0gJycpe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxldCBtb2R1bGVOYW1lID0gJChgdHIubmV3LW1vZHVsZS1yb3dbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKS5kYXRhKCduYW1lJyk7XG4gICAgICAgIGlmIChtb2R1bGVOYW1lID09PSB1bmRlZmluZWQpe1xuICAgICAgICAgICAgbW9kdWxlTmFtZSA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0JhckJsb2NrLnNob3coKTtcbiAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyLnNob3coKTtcbiAgICAgICAgaWYgKGhlYWRlcil7XG4gICAgICAgICAgICBjb25zdCBiYXJUZXh0PSBtb2R1bGVOYW1lKyc6ICcraGVhZGVyO1xuICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuJHByb2dyZXNzQmFyTGFiZWwudGV4dChiYXJUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGVyY2VudD4wKXtcbiAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLiRwcm9ncmVzc0Jhci5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgcGVyY2VudDogcGVyY2VudCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxTdGF0dXNMb29wV29ya2VyIG1vZHVsZSB3aGVuIHRoZSBET00gaXMgZnVsbHkgbG9hZGVkLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19