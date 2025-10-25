"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, PbxApi, UserMessage, EventBus, Form, SystemAPI */

/**
 * Module for handling the "Delete All Settings" functionality
 * Manages the confirmation modal and statistics display
 */
var generalSettingsDeleteAll = {
  /**
   * jQuery objects - will be initialized in initialize()
   */
  $deleteAllModal: null,
  $statisticsContent: null,
  $deleteAllInput: null,

  /**
   * Async channel ID for WebSocket events
   */
  asyncChannelId: null,

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Generate unique channel ID for this session
    generalSettingsDeleteAll.asyncChannelId = "delete-all-".concat(Date.now()); // Subscribe to WebSocket events

    EventBus.subscribe(generalSettingsDeleteAll.asyncChannelId, function (data) {
      generalSettingsDeleteAll.processDeleteProgress(data);
    }); // Initialize jQuery objects when DOM is ready

    generalSettingsDeleteAll.$deleteAllModal = $('#delete-all-modal');
    generalSettingsDeleteAll.$statisticsContent = $('#delete-statistics-content');
    generalSettingsDeleteAll.$deleteAllInput = $('input[name="deleteAllInput"]'); // Initialize modal settings

    generalSettingsDeleteAll.initializeModal(); // Watch for input changes

    generalSettingsDeleteAll.initializeInputWatcher();
  },

  /**
   * Initialize the delete confirmation modal
   */
  initializeModal: function initializeModal() {
    if (generalSettingsDeleteAll.$deleteAllModal && generalSettingsDeleteAll.$deleteAllModal.length > 0) {
      generalSettingsDeleteAll.$deleteAllModal.modal({
        closable: false,
        onShow: function onShow() {
          // Load statistics when modal is shown
          generalSettingsDeleteAll.loadDeleteStatistics();
        },
        onApprove: function onApprove() {
          // Show loading state in modal
          generalSettingsDeleteAll.showDeletingProgress(); // When user confirms deletion - pass async channel ID

          SystemAPI.restoreDefault({
            asyncChannelId: generalSettingsDeleteAll.asyncChannelId
          }, generalSettingsDeleteAll.cbAfterRestoreDefaultSettings); // Return false to prevent automatic modal closing

          return false;
        },
        onDeny: function onDeny() {
          // When user cancels - mark form as changed to keep save button active
          Form.dataChanged();
        }
      });
    }
  },

  /**
   * Check if the delete phrase was entered correctly and show modal
   * @returns {boolean} - true if phrase matches, false otherwise
   */
  checkDeleteConditions: function checkDeleteConditions() {
    // Get the value of 'deleteAllInput' field and trim spaces
    var deleteAllInput = generalSettingsDeleteAll.$deleteAllInput.val().trim(); // Check if the entered phrase matches the required phrase

    if (deleteAllInput === globalTranslate.gs_EnterDeleteAllPhrase) {
      generalSettingsDeleteAll.showDeleteConfirmationModal();
      return true;
    }

    return false;
  },

  /**
   * Show the delete confirmation modal with statistics
   */
  showDeleteConfirmationModal: function showDeleteConfirmationModal() {
    if (generalSettingsDeleteAll.$deleteAllModal && generalSettingsDeleteAll.$deleteAllModal.length > 0) {
      generalSettingsDeleteAll.$deleteAllModal.modal('show');
    }
  },

  /**
   * Load and display deletion statistics in the modal
   */
  loadDeleteStatistics: function loadDeleteStatistics() {
    var $statisticsContent = generalSettingsDeleteAll.$statisticsContent; // Show loading state

    $statisticsContent.html("\n            <div class=\"ui segment\">\n                <div class=\"ui active centered inline loader\"></div>\n                <p class=\"center aligned\">".concat(globalTranslate.gs_LoadingStatistics, "</p>\n            </div>\n        ")); // Get statistics from API

    SystemAPI.getDeleteStatistics(function (response) {
      // Check for API errors
      if (!response || response.result === false) {
        // Show error if statistics couldn't be loaded
        $statisticsContent.html("\n                    <div class=\"ui segment\">\n                        <div class=\"ui error message\">\n                            <i class=\"exclamation triangle icon\"></i>\n                            ".concat(globalTranslate.gs_ErrorLoadingStatistics, "\n                        </div>\n                    </div>\n                "));
        return;
      } // Extract data from response


      var data = response.data || {}; // Build statistics HTML

      var statisticsHtml = ''; // Users and extensions

      if (data.users > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('users', globalTranslate.gs_StatUsers, data.extensions || data.users, 'user icon');
      } // Providers


      if (data.providers > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('providers', globalTranslate.gs_StatProviders, data.providers, 'server icon');
      } // Call queues


      if (data.callQueues > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('queues', globalTranslate.gs_StatCallQueues, data.callQueues, 'users icon');
      } // IVR Menus


      if (data.ivrMenus > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('ivr', globalTranslate.gs_StatIvrMenus, data.ivrMenus, 'sitemap icon');
      } // Conference rooms


      if (data.conferenceRooms > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('conferences', globalTranslate.gs_StatConferenceRooms, data.conferenceRooms, 'video icon');
      } // Dialplan applications


      if (data.dialplanApplications > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('dialplan', globalTranslate.gs_StatDialplanApplications, data.dialplanApplications, 'code icon');
      } // Sound files


      if (data.customSoundFiles > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('sounds', globalTranslate.gs_StatSoundFiles, data.customSoundFiles, 'music icon');
      } // MOH (Music On Hold) files


      if (data.mohFiles > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('moh', globalTranslate.gs_StatMohFiles, data.mohFiles, 'volume up icon');
      } // Routes


      var totalRoutes = (data.incomingRoutes || 0) + (data.outgoingRoutes || 0);

      if (totalRoutes > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('routes', globalTranslate.gs_StatRoutes, totalRoutes, 'random icon');
      } // Firewall rules


      if (data.firewallRules > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('firewall', globalTranslate.gs_StatFirewallRules, data.firewallRules, 'shield icon');
      } // Modules


      if (data.modules > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('modules', globalTranslate.gs_StatModules, data.modules, 'puzzle piece icon');
      } // Call history


      if (data.callHistory > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('cdr', globalTranslate.gs_StatCallHistory, data.callHistory.toLocaleString(), 'history icon');
      } // Call recordings


      if (data.callRecordings > 0) {
        var sizeStr = generalSettingsDeleteAll.formatBytes(data.callRecordingsSize || 0);
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('recordings', globalTranslate.gs_StatCallRecordings, "".concat(data.callRecordings.toLocaleString(), " (").concat(sizeStr, ")"), 'microphone icon');
      } // Backups


      if (data.backups > 0) {
        var _sizeStr = generalSettingsDeleteAll.formatBytes(data.backupsSize || 0);

        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('backups', globalTranslate.gs_StatBackups, "".concat(data.backups, " (").concat(_sizeStr, ")"), 'archive icon');
      } // Custom files


      if (data.customFiles > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('custom', globalTranslate.gs_StatCustomFiles, data.customFiles, 'file icon');
      } // Out-of-Work Time conditions


      if (data.outWorkTimes > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('outWorkTimes', globalTranslate.gs_StatOutWorkTimes, data.outWorkTimes, 'clock outline icon');
      } // Out-of-Work Time route associations


      if (data.outWorkTimesRouts > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('outWorkTimesRouts', globalTranslate.gs_StatOutWorkTimesRouts, data.outWorkTimesRouts, 'linkify icon');
      } // REST API Keys


      if (data.apiKeys > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('apiKeys', globalTranslate.gs_StatApiKeys, data.apiKeys, 'key icon');
      } // Asterisk REST Interface (ARI) Users


      if (data.asteriskRestUsers > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('asteriskRestUsers', globalTranslate.gs_StatAsteriskRestUsers, data.asteriskRestUsers, 'plug icon');
      } // WebAuthn Passkeys


      if (data.userPasskeys > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('userPasskeys', globalTranslate.gs_StatUserPasskeys, data.userPasskeys, 'fingerprint icon');
      } // If no data will be deleted


      if (statisticsHtml === '') {
        statisticsHtml = "\n                    <div class=\"ui segment\">\n                        <div class=\"ui info message\">\n                            <i class=\"info circle icon\"></i>\n                            ".concat(globalTranslate.gs_NoDataToDelete, "\n                        </div>\n                    </div>\n                ");
      } // Update modal content


      $statisticsContent.html(statisticsHtml);
    });
  },

  /**
   * Create a statistic item HTML
   * @param {string} id - Item identifier
   * @param {string} label - Display label
   * @param {string|number} value - Display value
   * @param {string} icon - Icon class
   * @returns {string} HTML string
   */
  createStatisticItem: function createStatisticItem(id, label, value, icon) {
    return "\n            <div class=\"ui segment\">\n                <div class=\"ui two column grid\">\n                    <div class=\"column\">\n                        <i class=\"".concat(icon, "\"></i> ").concat(label, "\n                    </div>\n                    <div class=\"right aligned column\">\n                        <strong>").concat(value, "</strong>\n                    </div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted string
   */
  formatBytes: function formatBytes(bytes) {
    var decimals = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    if (bytes === 0) return '0 B';
    var k = 1024;
    var dm = decimals < 0 ? 0 : decimals;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Show deleting progress in modal
   */
  showDeletingProgress: function showDeletingProgress() {
    var $content = generalSettingsDeleteAll.$deleteAllModal.find('.content');
    var $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions'); // Hide action buttons initially

    $actions.hide(); // Set initial stage

    generalSettingsDeleteAll.$deleteAllModal.attr('data-stage', 'starting'); // Show loading state

    $content.html("\n            <div class=\"ui segment\">\n                <div class=\"ui active inverted dimmer\">\n                    <div class=\"ui large text loader\">".concat(globalTranslate.gs_DeletingAllSettings, "</div>\n                </div>\n                <p>&nbsp;</p>\n                <p>&nbsp;</p>\n                <p>&nbsp;</p>\n            </div>\n        "));
  },

  /**
   * Process delete progress events from WebSocket
   */
  processDeleteProgress: function processDeleteProgress(response) {
    var stage = response.stage;
    var stageDetails = response.stageDetails;
    var $content = generalSettingsDeleteAll.$deleteAllModal.find('.content');
    var $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions'); // Update data-stage attribute for testing

    generalSettingsDeleteAll.$deleteAllModal.attr('data-stage', stage); // Update progress display

    var progressHtml = "\n            <div class=\"ui segment\">\n                <div class=\"ui progress\" data-percent=\"".concat(stageDetails.progress, "\">\n                    <div class=\"bar\">\n                        <div class=\"progress\">").concat(stageDetails.progress, "%</div>\n                    </div>\n                    <div class=\"label\">").concat(stageDetails.messageKey ? globalTranslate[stageDetails.messageKey] : stageDetails.message, "</div>\n                </div>\n            </div>\n        ");
    $content.html(progressHtml);
    $('.ui.progress').progress(); // Handle final stage - completion

    if (stage === 'DeleteAll_Stage_Final' && stageDetails.progress === 100) {
      if (stageDetails.result === true) {
        // Process completed successfully
        // Do NOT close modal automatically - let user close it
        // Update content to show completion message
        progressHtml = "\n                    <div class=\"ui segment\">\n                        <div class=\"ui success message\">\n                            <i class=\"check circle icon\"></i>\n                            ".concat(globalTranslate.gs_DeleteAllStageCompleted, "\n                        </div>\n                    </div>\n                ");
        $content.html(progressHtml);
      } else if (stageDetails.result === false) {
        // Show error and restore modal
        UserMessage.showMultiString(stageDetails.messages || ['Unknown error']);
        $actions.show();
        generalSettingsDeleteAll.loadDeleteStatistics();
      } // If no result property, just update progress

    } // Handle restart stage


    if (stage === 'DeleteAll_Stage_Restart' && stageDetails.restart === true) {
      // Show restart message in modal content (not as popup)
      progressHtml = "\n                <div class=\"ui segment\">\n                    <div class=\"ui success message\">\n                        <i class=\"check circle icon\"></i>\n                        ".concat(globalTranslate.gs_DeleteAllStageCompleted, "\n                    </div>\n                    <div class=\"ui info message\">\n                        <i class=\"info circle icon\"></i>\n                        ").concat(globalTranslate.gs_DeleteAllStageRestarting, "\n                    </div>\n                </div>\n            ");
      $content.html(progressHtml); // Show Close button only after process completion
      // Use 'ok' class instead of 'positive' to avoid triggering onApprove callback

      var closeButton = $('<button class="ui ok positive button">' + globalTranslate.sl_Close + '</button>'); // Add click handler to simply close the modal

      closeButton.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        generalSettingsDeleteAll.$deleteAllModal.modal('hide');
      });
      $actions.empty().append(closeButton);
      $actions.show(); // Make modal closable now

      generalSettingsDeleteAll.$deleteAllModal.modal('setting', 'closable', true);
    }
  },

  /**
   * Handle response after restoring default settings (updated for async)
   * @param {boolean|object} response - Response from the server
   */
  cbAfterRestoreDefaultSettings: function cbAfterRestoreDefaultSettings(response) {
    if (response === false) {
      // Error occurred
      UserMessage.showMultiString(response); // Restore modal

      var $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions');
      $actions.show();
      generalSettingsDeleteAll.loadDeleteStatistics();
    } // Success case will be handled by WebSocket events

  },

  /**
   * Initialize input watcher to monitor delete phrase input
   */
  initializeInputWatcher: function initializeInputWatcher() {
    var $submitButton = $('#submitbutton');
    var originalButtonText = $submitButton.text(); // Watch for input changes

    generalSettingsDeleteAll.$deleteAllInput.on('input', function () {
      var inputValue = $(this).val().trim(); // Check if the entered phrase matches

      if (inputValue === globalTranslate.gs_EnterDeleteAllPhrase) {
        // Change button text to indicate deletion action
        $submitButton.removeClass('positive').addClass('negative').html("<i class=\"trash icon\"></i> ".concat(globalTranslate.gs_BtnDeleteAll));
      } else {
        // Restore original button text
        $submitButton.removeClass('negative').addClass('positive').html("<i class=\"save icon\"></i> ".concat(originalButtonText));
      }
    });
  }
}; // Initialize when DOM is ready

$(document).ready(function () {
  generalSettingsDeleteAll.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiU3lzdGVtQVBJIiwicmVzdG9yZURlZmF1bHQiLCJjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm9uRGVueSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsImRlbGV0ZUFsbElucHV0IiwidmFsIiwidHJpbSIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwic2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsIiwiaHRtbCIsImdzX0xvYWRpbmdTdGF0aXN0aWNzIiwiZ2V0RGVsZXRlU3RhdGlzdGljcyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyIsInN0YXRpc3RpY3NIdG1sIiwidXNlcnMiLCJjcmVhdGVTdGF0aXN0aWNJdGVtIiwiZ3NfU3RhdFVzZXJzIiwiZXh0ZW5zaW9ucyIsInByb3ZpZGVycyIsImdzX1N0YXRQcm92aWRlcnMiLCJjYWxsUXVldWVzIiwiZ3NfU3RhdENhbGxRdWV1ZXMiLCJpdnJNZW51cyIsImdzX1N0YXRJdnJNZW51cyIsImNvbmZlcmVuY2VSb29tcyIsImdzX1N0YXRDb25mZXJlbmNlUm9vbXMiLCJkaWFscGxhbkFwcGxpY2F0aW9ucyIsImdzX1N0YXREaWFscGxhbkFwcGxpY2F0aW9ucyIsImN1c3RvbVNvdW5kRmlsZXMiLCJnc19TdGF0U291bmRGaWxlcyIsIm1vaEZpbGVzIiwiZ3NfU3RhdE1vaEZpbGVzIiwidG90YWxSb3V0ZXMiLCJpbmNvbWluZ1JvdXRlcyIsIm91dGdvaW5nUm91dGVzIiwiZ3NfU3RhdFJvdXRlcyIsImZpcmV3YWxsUnVsZXMiLCJnc19TdGF0RmlyZXdhbGxSdWxlcyIsIm1vZHVsZXMiLCJnc19TdGF0TW9kdWxlcyIsImNhbGxIaXN0b3J5IiwiZ3NfU3RhdENhbGxIaXN0b3J5IiwidG9Mb2NhbGVTdHJpbmciLCJjYWxsUmVjb3JkaW5ncyIsInNpemVTdHIiLCJmb3JtYXRCeXRlcyIsImNhbGxSZWNvcmRpbmdzU2l6ZSIsImdzX1N0YXRDYWxsUmVjb3JkaW5ncyIsImJhY2t1cHMiLCJiYWNrdXBzU2l6ZSIsImdzX1N0YXRCYWNrdXBzIiwiY3VzdG9tRmlsZXMiLCJnc19TdGF0Q3VzdG9tRmlsZXMiLCJvdXRXb3JrVGltZXMiLCJnc19TdGF0T3V0V29ya1RpbWVzIiwib3V0V29ya1RpbWVzUm91dHMiLCJnc19TdGF0T3V0V29ya1RpbWVzUm91dHMiLCJhcGlLZXlzIiwiZ3NfU3RhdEFwaUtleXMiLCJhc3Rlcmlza1Jlc3RVc2VycyIsImdzX1N0YXRBc3Rlcmlza1Jlc3RVc2VycyIsInVzZXJQYXNza2V5cyIsImdzX1N0YXRVc2VyUGFzc2tleXMiLCJnc19Ob0RhdGFUb0RlbGV0ZSIsImlkIiwibGFiZWwiLCJ2YWx1ZSIsImljb24iLCJieXRlcyIsImRlY2ltYWxzIiwiayIsImRtIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCIkY29udGVudCIsImZpbmQiLCIkYWN0aW9ucyIsImhpZGUiLCJhdHRyIiwiZ3NfRGVsZXRpbmdBbGxTZXR0aW5ncyIsInN0YWdlIiwic3RhZ2VEZXRhaWxzIiwicHJvZ3Jlc3NIdG1sIiwicHJvZ3Jlc3MiLCJtZXNzYWdlS2V5IiwibWVzc2FnZSIsImdzX0RlbGV0ZUFsbFN0YWdlQ29tcGxldGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3ciLCJyZXN0YXJ0IiwiZ3NfRGVsZXRlQWxsU3RhZ2VSZXN0YXJ0aW5nIiwiY2xvc2VCdXR0b24iLCJzbF9DbG9zZSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwiZW1wdHkiLCJhcHBlbmQiLCIkc3VibWl0QnV0dG9uIiwib3JpZ2luYWxCdXR0b25UZXh0IiwidGV4dCIsImlucHV0VmFsdWUiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiZ3NfQnRuRGVsZXRlQWxsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsd0JBQXdCLEdBQUc7QUFFN0I7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRSxJQUxZO0FBTTdCQyxFQUFBQSxrQkFBa0IsRUFBRSxJQU5TO0FBTzdCQyxFQUFBQSxlQUFlLEVBQUUsSUFQWTs7QUFTN0I7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQVphOztBQWM3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFqQjZCLHdCQWlCaEI7QUFDVDtBQUNBTCxJQUFBQSx3QkFBd0IsQ0FBQ0ksY0FBekIsd0JBQXdERSxJQUFJLENBQUNDLEdBQUwsRUFBeEQsRUFGUyxDQUlUOztBQUNBQyxJQUFBQSxRQUFRLENBQUNDLFNBQVQsQ0FBbUJULHdCQUF3QixDQUFDSSxjQUE1QyxFQUE0RCxVQUFBTSxJQUFJLEVBQUk7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Q0FzRyxRQUFBQSxhQUFhLENBQ1JJLFdBREwsQ0FDaUIsVUFEakIsRUFFS0MsUUFGTCxDQUVjLFVBRmQsRUFHS3pHLElBSEwsd0NBR3dDSCxlQUFlLENBQUM2RyxlQUh4RDtBQUlILE9BTkQsTUFNTztBQUNIO0FBQ0FOLFFBQUFBLGFBQWEsQ0FDUkksV0FETCxDQUNpQixVQURqQixFQUVLQyxRQUZMLENBRWMsVUFGZCxFQUdLekcsSUFITCx1Q0FHdUNxRyxrQkFIdkM7QUFJSDtBQUNKLEtBakJEO0FBa0JIO0FBbGlCNEIsQ0FBakMsQyxDQXFpQkE7O0FBQ0E1SCxDQUFDLENBQUNrSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCL0ksRUFBQUEsd0JBQXdCLENBQUNLLFVBQXpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIEV2ZW50QnVzLCBGb3JtLCBTeXN0ZW1BUEkgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIGhhbmRsaW5nIHRoZSBcIkRlbGV0ZSBBbGwgU2V0dGluZ3NcIiBmdW5jdGlvbmFsaXR5XG4gKiBNYW5hZ2VzIHRoZSBjb25maXJtYXRpb24gbW9kYWwgYW5kIHN0YXRpc3RpY3MgZGlzcGxheVxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgLSB3aWxsIGJlIGluaXRpYWxpemVkIGluIGluaXRpYWxpemUoKVxuICAgICAqL1xuICAgICRkZWxldGVBbGxNb2RhbDogbnVsbCxcbiAgICAkc3RhdGlzdGljc0NvbnRlbnQ6IG51bGwsXG4gICAgJGRlbGV0ZUFsbElucHV0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFzeW5jIGNoYW5uZWwgSUQgZm9yIFdlYlNvY2tldCBldmVudHNcbiAgICAgKi9cbiAgICBhc3luY0NoYW5uZWxJZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgY2hhbm5lbCBJRCBmb3IgdGhpcyBzZXNzaW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCA9IGBkZWxldGUtYWxsLSR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIFdlYlNvY2tldCBldmVudHNcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCwgZGF0YSA9PiB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwucHJvY2Vzc0RlbGV0ZVByb2dyZXNzKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IG9iamVjdHMgd2hlbiBET00gaXMgcmVhZHlcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCA9ICQoJyNkZWxldGUtYWxsLW1vZGFsJyk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kc3RhdGlzdGljc0NvbnRlbnQgPSAkKCcjZGVsZXRlLXN0YXRpc3RpY3MtY29udGVudCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0ID0gJCgnaW5wdXRbbmFtZT1cImRlbGV0ZUFsbElucHV0XCJdJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1vZGFsIHNldHRpbmdzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplTW9kYWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFdhdGNoIGZvciBpbnB1dCBjaGFuZ2VzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplSW5wdXRXYXRjaGVyKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBkZWxldGUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1vZGFsKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCAmJiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvblNob3c6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBzdGF0aXN0aWNzIHdoZW4gbW9kYWwgaXMgc2hvd25cbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIGluIG1vZGFsXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5zaG93RGVsZXRpbmdQcm9ncmVzcygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1c2VyIGNvbmZpcm1zIGRlbGV0aW9uIC0gcGFzcyBhc3luYyBjaGFubmVsIElEXG4gICAgICAgICAgICAgICAgICAgIFN5c3RlbUFQSS5yZXN0b3JlRGVmYXVsdCh7YXN5bmNDaGFubmVsSWQ6IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZH0sIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm4gZmFsc2UgdG8gcHJldmVudCBhdXRvbWF0aWMgbW9kYWwgY2xvc2luZ1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1c2VyIGNhbmNlbHMgLSBtYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBrZWVwIHNhdmUgYnV0dG9uIGFjdGl2ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRoZSBkZWxldGUgcGhyYXNlIHdhcyBlbnRlcmVkIGNvcnJlY3RseSBhbmQgc2hvdyBtb2RhbFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgcGhyYXNlIG1hdGNoZXMsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGNoZWNrRGVsZXRlQ29uZGl0aW9ucygpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2YWx1ZSBvZiAnZGVsZXRlQWxsSW5wdXQnIGZpZWxkIGFuZCB0cmltIHNwYWNlc1xuICAgICAgICBjb25zdCBkZWxldGVBbGxJbnB1dCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQudmFsKCkudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGVudGVyZWQgcGhyYXNlIG1hdGNoZXMgdGhlIHJlcXVpcmVkIHBocmFzZVxuICAgICAgICBpZiAoZGVsZXRlQWxsSW5wdXQgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnNob3dEZWxldGVDb25maXJtYXRpb25Nb2RhbCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgdGhlIGRlbGV0ZSBjb25maXJtYXRpb24gbW9kYWwgd2l0aCBzdGF0aXN0aWNzXG4gICAgICovXG4gICAgc2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCAmJiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBhbmQgZGlzcGxheSBkZWxldGlvbiBzdGF0aXN0aWNzIGluIHRoZSBtb2RhbFxuICAgICAqL1xuICAgIGxvYWREZWxldGVTdGF0aXN0aWNzKCkge1xuICAgICAgICBjb25zdCAkc3RhdGlzdGljc0NvbnRlbnQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJHN0YXRpc3RpY3NDb250ZW50O1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICRzdGF0aXN0aWNzQ29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBjZW50ZXJlZCBpbmxpbmUgbG9hZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX0xvYWRpbmdTdGF0aXN0aWNzfTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBzdGF0aXN0aWNzIGZyb20gQVBJXG4gICAgICAgIFN5c3RlbUFQSS5nZXREZWxldGVTdGF0aXN0aWNzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIEFQSSBlcnJvcnNcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgcmVzcG9uc2UucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgc3RhdGlzdGljcyBjb3VsZG4ndCBiZSBsb2FkZWRcbiAgICAgICAgICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19FcnJvckxvYWRpbmdTdGF0aXN0aWNzfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBzdGF0aXN0aWNzIEhUTUxcbiAgICAgICAgICAgIGxldCBzdGF0aXN0aWNzSHRtbCA9ICcnO1xuXG4gICAgICAgICAgICAvLyBVc2VycyBhbmQgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEudXNlcnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICd1c2VycycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0VXNlcnMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZXh0ZW5zaW9ucyB8fCBkYXRhLnVzZXJzLFxuICAgICAgICAgICAgICAgICAgICAndXNlciBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByb3ZpZGVyc1xuICAgICAgICAgICAgaWYgKGRhdGEucHJvdmlkZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncHJvdmlkZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRQcm92aWRlcnMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHJvdmlkZXJzLFxuICAgICAgICAgICAgICAgICAgICAnc2VydmVyIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmNhbGxRdWV1ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdxdWV1ZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxRdWV1ZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbFF1ZXVlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3VzZXJzIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSVZSIE1lbnVzXG4gICAgICAgICAgICBpZiAoZGF0YS5pdnJNZW51cyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2l2cicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0SXZyTWVudXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaXZyTWVudXMsXG4gICAgICAgICAgICAgICAgICAgICdzaXRlbWFwIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgICAgICAgICAgaWYgKGRhdGEuY29uZmVyZW5jZVJvb21zID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY29uZmVyZW5jZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENvbmZlcmVuY2VSb29tcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jb25mZXJlbmNlUm9vbXMsXG4gICAgICAgICAgICAgICAgICAgICd2aWRlbyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpYWxwbGFuIGFwcGxpY2F0aW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEuZGlhbHBsYW5BcHBsaWNhdGlvbnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdkaWFscGxhbicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0RGlhbHBsYW5BcHBsaWNhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGlhbHBsYW5BcHBsaWNhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICdjb2RlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU291bmQgZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmN1c3RvbVNvdW5kRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdzb3VuZHMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFNvdW5kRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VzdG9tU291bmRGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ211c2ljIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTU9IIChNdXNpYyBPbiBIb2xkKSBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEubW9oRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdtb2gnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdE1vaEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLm1vaEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAndm9sdW1lIHVwIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUm91dGVzXG4gICAgICAgICAgICBjb25zdCB0b3RhbFJvdXRlcyA9IChkYXRhLmluY29taW5nUm91dGVzIHx8IDApICsgKGRhdGEub3V0Z29pbmdSb3V0ZXMgfHwgMCk7XG4gICAgICAgICAgICBpZiAodG90YWxSb3V0ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdyb3V0ZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFJvdXRlcyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSb3V0ZXMsXG4gICAgICAgICAgICAgICAgICAgICdyYW5kb20gaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaXJld2FsbCBydWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEuZmlyZXdhbGxSdWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2ZpcmV3YWxsJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRGaXJld2FsbFJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmZpcmV3YWxsUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgICdzaGllbGQgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5tb2R1bGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9kdWxlcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0TW9kdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGVzLFxuICAgICAgICAgICAgICAgICAgICAncHV6emxlIHBpZWNlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCBoaXN0b3J5XG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsSGlzdG9yeSA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2NkcicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0Q2FsbEhpc3RvcnksXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbEhpc3RvcnkudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgJ2hpc3RvcnkgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDYWxsIHJlY29yZGluZ3NcbiAgICAgICAgICAgIGlmIChkYXRhLmNhbGxSZWNvcmRpbmdzID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVTdHIgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuZm9ybWF0Qnl0ZXMoZGF0YS5jYWxsUmVjb3JkaW5nc1NpemUgfHwgMCk7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdyZWNvcmRpbmdzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsUmVjb3JkaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5jYWxsUmVjb3JkaW5ncy50b0xvY2FsZVN0cmluZygpfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnbWljcm9waG9uZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJhY2t1cHNcbiAgICAgICAgICAgIGlmIChkYXRhLmJhY2t1cHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVN0ciA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5mb3JtYXRCeXRlcyhkYXRhLmJhY2t1cHNTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYmFja3VwcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0QmFja3VwcyxcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5iYWNrdXBzfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnYXJjaGl2ZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEuY3VzdG9tRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjdXN0b20nLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEN1c3RvbUZpbGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmN1c3RvbUZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAnZmlsZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE91dC1vZi1Xb3JrIFRpbWUgY29uZGl0aW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEub3V0V29ya1RpbWVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnb3V0V29ya1RpbWVzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRPdXRXb3JrVGltZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3V0V29ya1RpbWVzLFxuICAgICAgICAgICAgICAgICAgICAnY2xvY2sgb3V0bGluZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE91dC1vZi1Xb3JrIFRpbWUgcm91dGUgYXNzb2NpYXRpb25zXG4gICAgICAgICAgICBpZiAoZGF0YS5vdXRXb3JrVGltZXNSb3V0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ291dFdvcmtUaW1lc1JvdXRzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRPdXRXb3JrVGltZXNSb3V0cyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5vdXRXb3JrVGltZXNSb3V0cyxcbiAgICAgICAgICAgICAgICAgICAgJ2xpbmtpZnkgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBLZXlzXG4gICAgICAgICAgICBpZiAoZGF0YS5hcGlLZXlzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYXBpS2V5cycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0QXBpS2V5cyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5hcGlLZXlzLFxuICAgICAgICAgICAgICAgICAgICAna2V5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXN0ZXJpc2sgUkVTVCBJbnRlcmZhY2UgKEFSSSkgVXNlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLmFzdGVyaXNrUmVzdFVzZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYXN0ZXJpc2tSZXN0VXNlcnMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEFzdGVyaXNrUmVzdFVzZXJzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmFzdGVyaXNrUmVzdFVzZXJzLFxuICAgICAgICAgICAgICAgICAgICAncGx1ZyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlYkF1dGhuIFBhc3NrZXlzXG4gICAgICAgICAgICBpZiAoZGF0YS51c2VyUGFzc2tleXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICd1c2VyUGFzc2tleXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFVzZXJQYXNza2V5cyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS51c2VyUGFzc2tleXMsXG4gICAgICAgICAgICAgICAgICAgICdmaW5nZXJwcmludCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIG5vIGRhdGEgd2lsbCBiZSBkZWxldGVkXG4gICAgICAgICAgICBpZiAoc3RhdGlzdGljc0h0bWwgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX05vRGF0YVRvRGVsZXRlfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RhbCBjb250ZW50XG4gICAgICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChzdGF0aXN0aWNzSHRtbCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgc3RhdGlzdGljIGl0ZW0gSFRNTFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIEl0ZW0gaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIERpc3BsYXkgbGFiZWxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IHZhbHVlIC0gRGlzcGxheSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpY29uIC0gSWNvbiBjbGFzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgY3JlYXRlU3RhdGlzdGljSXRlbShpZCwgbGFiZWwsIHZhbHVlLCBpY29uKSB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb259XCI+PC9pPiAke2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7dmFsdWV9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgYnl0ZXMgdG8gaHVtYW4gcmVhZGFibGUgZm9ybWF0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gQnl0ZXMgdG8gZm9ybWF0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlY2ltYWxzIC0gTnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdEJ5dGVzKGJ5dGVzLCBkZWNpbWFscyA9IDIpIHtcbiAgICAgICAgaWYgKGJ5dGVzID09PSAwKSByZXR1cm4gJzAgQic7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBrID0gMTAyNDtcbiAgICAgICAgY29uc3QgZG0gPSBkZWNpbWFscyA8IDAgPyAwIDogZGVjaW1hbHM7XG4gICAgICAgIGNvbnN0IHNpemVzID0gWydCJywgJ0tCJywgJ01CJywgJ0dCJywgJ1RCJ107XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLmxvZyhieXRlcykgLyBNYXRoLmxvZyhrKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCgoYnl0ZXMgLyBNYXRoLnBvdyhrLCBpKSkudG9GaXhlZChkbSkpICsgJyAnICsgc2l6ZXNbaV07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGRlbGV0aW5nIHByb2dyZXNzIGluIG1vZGFsXG4gICAgICovXG4gICAgc2hvd0RlbGV0aW5nUHJvZ3Jlc3MoKSB7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcblxuICAgICAgICAvLyBIaWRlIGFjdGlvbiBidXR0b25zIGluaXRpYWxseVxuICAgICAgICAkYWN0aW9ucy5oaWRlKCk7XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgc3RhZ2VcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5hdHRyKCdkYXRhLXN0YWdlJywgJ3N0YXJ0aW5nJyk7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICRjb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGFyZ2UgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19EZWxldGluZ0FsbFNldHRpbmdzfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBkZWxldGUgcHJvZ3Jlc3MgZXZlbnRzIGZyb20gV2ViU29ja2V0XG4gICAgICovXG4gICAgcHJvY2Vzc0RlbGV0ZVByb2dyZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IHN0YWdlID0gcmVzcG9uc2Uuc3RhZ2U7XG4gICAgICAgIGNvbnN0IHN0YWdlRGV0YWlscyA9IHJlc3BvbnNlLnN0YWdlRGV0YWlscztcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5jb250ZW50Jyk7XG4gICAgICAgIGNvbnN0ICRhY3Rpb25zID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuYWN0aW9ucycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBkYXRhLXN0YWdlIGF0dHJpYnV0ZSBmb3IgdGVzdGluZ1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmF0dHIoJ2RhdGEtc3RhZ2UnLCBzdGFnZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGRpc3BsYXlcbiAgICAgICAgbGV0IHByb2dyZXNzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHByb2dyZXNzXCIgZGF0YS1wZXJjZW50PVwiJHtzdGFnZURldGFpbHMucHJvZ3Jlc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPiR7c3RhZ2VEZXRhaWxzLnByb2dyZXNzfSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7c3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXkgPyBnbG9iYWxUcmFuc2xhdGVbc3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXldIDogc3RhZ2VEZXRhaWxzLm1lc3NhZ2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcblxuICAgICAgICAkY29udGVudC5odG1sKHByb2dyZXNzSHRtbCk7XG4gICAgICAgICQoJy51aS5wcm9ncmVzcycpLnByb2dyZXNzKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGZpbmFsIHN0YWdlIC0gY29tcGxldGlvblxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdEZWxldGVBbGxfU3RhZ2VfRmluYWwnICYmIHN0YWdlRGV0YWlscy5wcm9ncmVzcyA9PT0gMTAwKSB7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFByb2Nlc3MgY29tcGxldGVkIHN1Y2Nlc3NmdWxseVxuICAgICAgICAgICAgICAgIC8vIERvIE5PVCBjbG9zZSBtb2RhbCBhdXRvbWF0aWNhbGx5IC0gbGV0IHVzZXIgY2xvc2UgaXRcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY29udGVudCB0byBzaG93IGNvbXBsZXRpb24gbWVzc2FnZVxuICAgICAgICAgICAgICAgIHByb2dyZXNzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzdWNjZXNzIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX0RlbGV0ZUFsbFN0YWdlQ29tcGxldGVkfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgJGNvbnRlbnQuaHRtbChwcm9ncmVzc0h0bWwpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzIHx8IFsnVW5rbm93biBlcnJvciddKTtcbiAgICAgICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiBubyByZXN1bHQgcHJvcGVydHksIGp1c3QgdXBkYXRlIHByb2dyZXNzXG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgcmVzdGFydCBzdGFnZVxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdEZWxldGVBbGxfU3RhZ2VfUmVzdGFydCcgJiYgc3RhZ2VEZXRhaWxzLnJlc3RhcnQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFNob3cgcmVzdGFydCBtZXNzYWdlIGluIG1vZGFsIGNvbnRlbnQgKG5vdCBhcyBwb3B1cClcbiAgICAgICAgICAgIHByb2dyZXNzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNoZWNrIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfRGVsZXRlQWxsU3RhZ2VDb21wbGV0ZWR9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19EZWxldGVBbGxTdGFnZVJlc3RhcnRpbmd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICRjb250ZW50Lmh0bWwocHJvZ3Jlc3NIdG1sKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBDbG9zZSBidXR0b24gb25seSBhZnRlciBwcm9jZXNzIGNvbXBsZXRpb25cbiAgICAgICAgICAgIC8vIFVzZSAnb2snIGNsYXNzIGluc3RlYWQgb2YgJ3Bvc2l0aXZlJyB0byBhdm9pZCB0cmlnZ2VyaW5nIG9uQXBwcm92ZSBjYWxsYmFja1xuICAgICAgICAgICAgY29uc3QgY2xvc2VCdXR0b24gPSAkKCc8YnV0dG9uIGNsYXNzPVwidWkgb2sgcG9zaXRpdmUgYnV0dG9uXCI+JyArIGdsb2JhbFRyYW5zbGF0ZS5zbF9DbG9zZSArICc8L2J1dHRvbj4nKTtcblxuICAgICAgICAgICAgLy8gQWRkIGNsaWNrIGhhbmRsZXIgdG8gc2ltcGx5IGNsb3NlIHRoZSBtb2RhbFxuICAgICAgICAgICAgY2xvc2VCdXR0b24ub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAkYWN0aW9ucy5lbXB0eSgpLmFwcGVuZChjbG9zZUJ1dHRvbik7XG4gICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIE1ha2UgbW9kYWwgY2xvc2FibGUgbm93XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdzZXR0aW5nJywgJ2Nsb3NhYmxlJywgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXNwb25zZSBhZnRlciByZXN0b3JpbmcgZGVmYXVsdCBzZXR0aW5ncyAodXBkYXRlZCBmb3IgYXN5bmMpXG4gICAgICogQHBhcmFtIHtib29sZWFufG9iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBFcnJvciBvY2N1cnJlZFxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBtb2RhbFxuICAgICAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG4gICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwubG9hZERlbGV0ZVN0YXRpc3RpY3MoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdWNjZXNzIGNhc2Ugd2lsbCBiZSBoYW5kbGVkIGJ5IFdlYlNvY2tldCBldmVudHNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgd2F0Y2hlciB0byBtb25pdG9yIGRlbGV0ZSBwaHJhc2UgaW5wdXRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRXYXRjaGVyKCkge1xuICAgICAgICBjb25zdCAkc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICBjb25zdCBvcmlnaW5hbEJ1dHRvblRleHQgPSAkc3VibWl0QnV0dG9uLnRleHQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFdhdGNoIGZvciBpbnB1dCBjaGFuZ2VzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dFZhbHVlID0gJCh0aGlzKS52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzXG4gICAgICAgICAgICBpZiAoaW5wdXRWYWx1ZSA9PT0gZ2xvYmFsVHJhbnNsYXRlLmdzX0VudGVyRGVsZXRlQWxsUGhyYXNlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIGJ1dHRvbiB0ZXh0IHRvIGluZGljYXRlIGRlbGV0aW9uIGFjdGlvblxuICAgICAgICAgICAgICAgICRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdwb3NpdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVnYXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0cmFzaCBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5nc19CdG5EZWxldGVBbGx9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgYnV0dG9uIHRleHRcbiAgICAgICAgICAgICAgICAkc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbmVnYXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3Bvc2l0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke29yaWdpbmFsQnV0dG9uVGV4dH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplKCk7XG59KTsiXX0=