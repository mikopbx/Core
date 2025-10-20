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

      $actions.html('<button class="ui positive button">' + globalTranslate.sl_Close + '</button>');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiU3lzdGVtQVBJIiwicmVzdG9yZURlZmF1bHQiLCJjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm9uRGVueSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsImRlbGV0ZUFsbElucHV0IiwidmFsIiwidHJpbSIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwic2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsIiwiaHRtbCIsImdzX0xvYWRpbmdTdGF0aXN0aWNzIiwiZ2V0RGVsZXRlU3RhdGlzdGljcyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyIsInN0YXRpc3RpY3NIdG1sIiwidXNlcnMiLCJjcmVhdGVTdGF0aXN0aWNJdGVtIiwiZ3NfU3RhdFVzZXJzIiwiZXh0ZW5zaW9ucyIsInByb3ZpZGVycyIsImdzX1N0YXRQcm92aWRlcnMiLCJjYWxsUXVldWVzIiwiZ3NfU3RhdENhbGxRdWV1ZXMiLCJpdnJNZW51cyIsImdzX1N0YXRJdnJNZW51cyIsImNvbmZlcmVuY2VSb29tcyIsImdzX1N0YXRDb25mZXJlbmNlUm9vbXMiLCJkaWFscGxhbkFwcGxpY2F0aW9ucyIsImdzX1N0YXREaWFscGxhbkFwcGxpY2F0aW9ucyIsImN1c3RvbVNvdW5kRmlsZXMiLCJnc19TdGF0U291bmRGaWxlcyIsIm1vaEZpbGVzIiwiZ3NfU3RhdE1vaEZpbGVzIiwidG90YWxSb3V0ZXMiLCJpbmNvbWluZ1JvdXRlcyIsIm91dGdvaW5nUm91dGVzIiwiZ3NfU3RhdFJvdXRlcyIsImZpcmV3YWxsUnVsZXMiLCJnc19TdGF0RmlyZXdhbGxSdWxlcyIsIm1vZHVsZXMiLCJnc19TdGF0TW9kdWxlcyIsImNhbGxIaXN0b3J5IiwiZ3NfU3RhdENhbGxIaXN0b3J5IiwidG9Mb2NhbGVTdHJpbmciLCJjYWxsUmVjb3JkaW5ncyIsInNpemVTdHIiLCJmb3JtYXRCeXRlcyIsImNhbGxSZWNvcmRpbmdzU2l6ZSIsImdzX1N0YXRDYWxsUmVjb3JkaW5ncyIsImJhY2t1cHMiLCJiYWNrdXBzU2l6ZSIsImdzX1N0YXRCYWNrdXBzIiwiY3VzdG9tRmlsZXMiLCJnc19TdGF0Q3VzdG9tRmlsZXMiLCJvdXRXb3JrVGltZXMiLCJnc19TdGF0T3V0V29ya1RpbWVzIiwib3V0V29ya1RpbWVzUm91dHMiLCJnc19TdGF0T3V0V29ya1RpbWVzUm91dHMiLCJhcGlLZXlzIiwiZ3NfU3RhdEFwaUtleXMiLCJhc3Rlcmlza1Jlc3RVc2VycyIsImdzX1N0YXRBc3Rlcmlza1Jlc3RVc2VycyIsInVzZXJQYXNza2V5cyIsImdzX1N0YXRVc2VyUGFzc2tleXMiLCJnc19Ob0RhdGFUb0RlbGV0ZSIsImlkIiwibGFiZWwiLCJ2YWx1ZSIsImljb24iLCJieXRlcyIsImRlY2ltYWxzIiwiayIsImRtIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCIkY29udGVudCIsImZpbmQiLCIkYWN0aW9ucyIsImhpZGUiLCJhdHRyIiwiZ3NfRGVsZXRpbmdBbGxTZXR0aW5ncyIsInN0YWdlIiwic3RhZ2VEZXRhaWxzIiwicHJvZ3Jlc3NIdG1sIiwicHJvZ3Jlc3MiLCJtZXNzYWdlS2V5IiwibWVzc2FnZSIsImdzX0RlbGV0ZUFsbFN0YWdlQ29tcGxldGVkIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3ciLCJyZXN0YXJ0IiwiZ3NfRGVsZXRlQWxsU3RhZ2VSZXN0YXJ0aW5nIiwic2xfQ2xvc2UiLCIkc3VibWl0QnV0dG9uIiwib3JpZ2luYWxCdXR0b25UZXh0IiwidGV4dCIsIm9uIiwiaW5wdXRWYWx1ZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJnc19CdG5EZWxldGVBbGwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx3QkFBd0IsR0FBRztBQUU3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBTFk7QUFNN0JDLEVBQUFBLGtCQUFrQixFQUFFLElBTlM7QUFPN0JDLEVBQUFBLGVBQWUsRUFBRSxJQVBZOztBQVM3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBWmE7O0FBYzdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWpCNkIsd0JBaUJoQjtBQUNUO0FBQ0FMLElBQUFBLHdCQUF3QixDQUFDSSxjQUF6Qix3QkFBd0RFLElBQUksQ0FBQ0MsR0FBTCxFQUF4RCxFQUZTLENBSVQ7O0FBQ0FDLElBQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQlQsd0JBQXdCLENBQUNJLGNBQTVDLEVBQTRELFVBQUFNLElBQUksRUFBSTtBQUNoRVYsTUFBQUEsd0JBQXdCLENBQUNXLHFCQUF6QixDQUErQ0QsSUFBL0M7QUFDSCxLQUZELEVBTFMsQ0FTVDs7QUFD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QUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIFVzZXJNZXNzYWdlLCBFdmVudEJ1cywgRm9ybSwgU3lzdGVtQVBJICovXG5cbi8qKlxuICogTW9kdWxlIGZvciBoYW5kbGluZyB0aGUgXCJEZWxldGUgQWxsIFNldHRpbmdzXCIgZnVuY3Rpb25hbGl0eVxuICogTWFuYWdlcyB0aGUgY29uZmlybWF0aW9uIG1vZGFsIGFuZCBzdGF0aXN0aWNzIGRpc3BsYXlcbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIC0gd2lsbCBiZSBpbml0aWFsaXplZCBpbiBpbml0aWFsaXplKClcbiAgICAgKi9cbiAgICAkZGVsZXRlQWxsTW9kYWw6IG51bGwsXG4gICAgJHN0YXRpc3RpY3NDb250ZW50OiBudWxsLFxuICAgICRkZWxldGVBbGxJbnB1dDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBc3luYyBjaGFubmVsIElEIGZvciBXZWJTb2NrZXQgZXZlbnRzXG4gICAgICovXG4gICAgYXN5bmNDaGFubmVsSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgdW5pcXVlIGNoYW5uZWwgSUQgZm9yIHRoaXMgc2Vzc2lvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWQgPSBgZGVsZXRlLWFsbC0ke0RhdGUubm93KCl9YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBXZWJTb2NrZXQgZXZlbnRzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZShnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWQsIGRhdGEgPT4ge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnByb2Nlc3NEZWxldGVQcm9ncmVzcyhkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBvYmplY3RzIHdoZW4gRE9NIGlzIHJlYWR5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgPSAkKCcjZGVsZXRlLWFsbC1tb2RhbCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJHN0YXRpc3RpY3NDb250ZW50ID0gJCgnI2RlbGV0ZS1zdGF0aXN0aWNzLWNvbnRlbnQnKTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJkZWxldGVBbGxJbnB1dFwiXScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RhbCBzZXR0aW5nc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZU1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYXRjaCBmb3IgaW5wdXQgY2hhbmdlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZUlucHV0V2F0Y2hlcigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZGVsZXRlIGNvbmZpcm1hdGlvbiBtb2RhbFxuICAgICAqL1xuICAgIGluaXRpYWxpemVNb2RhbCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgJiYgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25TaG93OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExvYWQgc3RhdGlzdGljcyB3aGVuIG1vZGFsIGlzIHNob3duXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5sb2FkRGVsZXRlU3RhdGlzdGljcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBpbiBtb2RhbFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuc2hvd0RlbGV0aW5nUHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdXNlciBjb25maXJtcyBkZWxldGlvbiAtIHBhc3MgYXN5bmMgY2hhbm5lbCBJRFxuICAgICAgICAgICAgICAgICAgICBTeXN0ZW1BUEkucmVzdG9yZURlZmF1bHQoe2FzeW5jQ2hhbm5lbElkOiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWR9LCBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIGZhbHNlIHRvIHByZXZlbnQgYXV0b21hdGljIG1vZGFsIGNsb3NpbmdcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdXNlciBjYW5jZWxzIC0gbWFyayBmb3JtIGFzIGNoYW5nZWQgdG8ga2VlcCBzYXZlIGJ1dHRvbiBhY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aGUgZGVsZXRlIHBocmFzZSB3YXMgZW50ZXJlZCBjb3JyZWN0bHkgYW5kIHNob3cgbW9kYWxcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIHBocmFzZSBtYXRjaGVzLCBmYWxzZSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBjaGVja0RlbGV0ZUNvbmRpdGlvbnMoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdmFsdWUgb2YgJ2RlbGV0ZUFsbElucHV0JyBmaWVsZCBhbmQgdHJpbSBzcGFjZXNcbiAgICAgICAgY29uc3QgZGVsZXRlQWxsSW5wdXQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0LnZhbCgpLnRyaW0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzIHRoZSByZXF1aXJlZCBwaHJhc2VcbiAgICAgICAgaWYgKGRlbGV0ZUFsbElucHV0ID09PSBnbG9iYWxUcmFuc2xhdGUuZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5zaG93RGVsZXRlQ29uZmlybWF0aW9uTW9kYWwoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHRoZSBkZWxldGUgY29uZmlybWF0aW9uIG1vZGFsIHdpdGggc3RhdGlzdGljc1xuICAgICAqL1xuICAgIHNob3dEZWxldGVDb25maXJtYXRpb25Nb2RhbCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgJiYgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgYW5kIGRpc3BsYXkgZGVsZXRpb24gc3RhdGlzdGljcyBpbiB0aGUgbW9kYWxcbiAgICAgKi9cbiAgICBsb2FkRGVsZXRlU3RhdGlzdGljcygpIHtcbiAgICAgICAgY29uc3QgJHN0YXRpc3RpY3NDb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRzdGF0aXN0aWNzQ29udGVudDtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgY2VudGVyZWQgaW5saW5lIGxvYWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19Mb2FkaW5nU3RhdGlzdGljc308L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgc3RhdGlzdGljcyBmcm9tIEFQSVxuICAgICAgICBTeXN0ZW1BUEkuZ2V0RGVsZXRlU3RhdGlzdGljcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBBUEkgZXJyb3JzXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIHN0YXRpc3RpY3MgY291bGRuJ3QgYmUgbG9hZGVkXG4gICAgICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljc31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZGF0YSBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgc3RhdGlzdGljcyBIVE1MXG4gICAgICAgICAgICBsZXQgc3RhdGlzdGljc0h0bWwgPSAnJztcblxuICAgICAgICAgICAgLy8gVXNlcnMgYW5kIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIGlmIChkYXRhLnVzZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAndXNlcnMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFVzZXJzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmV4dGVuc2lvbnMgfHwgZGF0YS51c2VycyxcbiAgICAgICAgICAgICAgICAgICAgJ3VzZXIgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm92aWRlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLnByb3ZpZGVycyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3Byb3ZpZGVycycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0UHJvdmlkZXJzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnByb3ZpZGVycyxcbiAgICAgICAgICAgICAgICAgICAgJ3NlcnZlciBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGwgcXVldWVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsUXVldWVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncXVldWVzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsUXVldWVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxRdWV1ZXMsXG4gICAgICAgICAgICAgICAgICAgICd1c2VycyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElWUiBNZW51c1xuICAgICAgICAgICAgaWYgKGRhdGEuaXZyTWVudXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdpdnInLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEl2ck1lbnVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLml2ck1lbnVzLFxuICAgICAgICAgICAgICAgICAgICAnc2l0ZW1hcCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENvbmZlcmVuY2Ugcm9vbXNcbiAgICAgICAgICAgIGlmIChkYXRhLmNvbmZlcmVuY2VSb29tcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2NvbmZlcmVuY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDb25mZXJlbmNlUm9vbXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY29uZmVyZW5jZVJvb21zLFxuICAgICAgICAgICAgICAgICAgICAndmlkZW8gaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaWFscGxhbiBhcHBsaWNhdGlvbnNcbiAgICAgICAgICAgIGlmIChkYXRhLmRpYWxwbGFuQXBwbGljYXRpb25zID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnZGlhbHBsYW4nLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdERpYWxwbGFuQXBwbGljYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmRpYWxwbGFuQXBwbGljYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICAnY29kZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNvdW5kIGZpbGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jdXN0b21Tb3VuZEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnc291bmRzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRTb3VuZEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmN1c3RvbVNvdW5kRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICdtdXNpYyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1PSCAoTXVzaWMgT24gSG9sZCkgZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLm1vaEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9oJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRNb2hGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2hGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3ZvbHVtZSB1cCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJvdXRlc1xuICAgICAgICAgICAgY29uc3QgdG90YWxSb3V0ZXMgPSAoZGF0YS5pbmNvbWluZ1JvdXRlcyB8fCAwKSArIChkYXRhLm91dGdvaW5nUm91dGVzIHx8IDApO1xuICAgICAgICAgICAgaWYgKHRvdGFsUm91dGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncm91dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRSb3V0ZXMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUm91dGVzLFxuICAgICAgICAgICAgICAgICAgICAncmFuZG9tIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmlyZXdhbGwgcnVsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmZpcmV3YWxsUnVsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdmaXJld2FsbCcsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0RmlyZXdhbGxSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5maXJld2FsbFJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICAnc2hpZWxkIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW9kdWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEubW9kdWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ21vZHVsZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdE1vZHVsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3B1enpsZSBwaWVjZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGwgaGlzdG9yeVxuICAgICAgICAgICAgaWYgKGRhdGEuY2FsbEhpc3RvcnkgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjZHInLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxIaXN0b3J5LFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxIaXN0b3J5LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICdoaXN0b3J5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCByZWNvcmRpbmdzXG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsUmVjb3JkaW5ncyA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplU3RyID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmZvcm1hdEJ5dGVzKGRhdGEuY2FsbFJlY29yZGluZ3NTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncmVjb3JkaW5ncycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0Q2FsbFJlY29yZGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGAke2RhdGEuY2FsbFJlY29yZGluZ3MudG9Mb2NhbGVTdHJpbmcoKX0gKCR7c2l6ZVN0cn0pYCxcbiAgICAgICAgICAgICAgICAgICAgJ21pY3JvcGhvbmUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCYWNrdXBzXG4gICAgICAgICAgICBpZiAoZGF0YS5iYWNrdXBzID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVTdHIgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuZm9ybWF0Qnl0ZXMoZGF0YS5iYWNrdXBzU2l6ZSB8fCAwKTtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2JhY2t1cHMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEJhY2t1cHMsXG4gICAgICAgICAgICAgICAgICAgIGAke2RhdGEuYmFja3Vwc30gKCR7c2l6ZVN0cn0pYCxcbiAgICAgICAgICAgICAgICAgICAgJ2FyY2hpdmUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmN1c3RvbUZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY3VzdG9tJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDdXN0b21GaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jdXN0b21GaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbGUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBPdXQtb2YtV29yayBUaW1lIGNvbmRpdGlvbnNcbiAgICAgICAgICAgIGlmIChkYXRhLm91dFdvcmtUaW1lcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ291dFdvcmtUaW1lcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0T3V0V29ya1RpbWVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLm91dFdvcmtUaW1lcyxcbiAgICAgICAgICAgICAgICAgICAgJ2Nsb2NrIG91dGxpbmUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBPdXQtb2YtV29yayBUaW1lIHJvdXRlIGFzc29jaWF0aW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEub3V0V29ya1RpbWVzUm91dHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdvdXRXb3JrVGltZXNSb3V0cycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0T3V0V29ya1RpbWVzUm91dHMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3V0V29ya1RpbWVzUm91dHMsXG4gICAgICAgICAgICAgICAgICAgICdsaW5raWZ5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUkVTVCBBUEkgS2V5c1xuICAgICAgICAgICAgaWYgKGRhdGEuYXBpS2V5cyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2FwaUtleXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEFwaUtleXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuYXBpS2V5cyxcbiAgICAgICAgICAgICAgICAgICAgJ2tleSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFzdGVyaXNrIFJFU1QgSW50ZXJmYWNlIChBUkkpIFVzZXJzXG4gICAgICAgICAgICBpZiAoZGF0YS5hc3Rlcmlza1Jlc3RVc2VycyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2FzdGVyaXNrUmVzdFVzZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRBc3Rlcmlza1Jlc3RVc2VycyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5hc3Rlcmlza1Jlc3RVc2VycyxcbiAgICAgICAgICAgICAgICAgICAgJ3BsdWcgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBXZWJBdXRobiBQYXNza2V5c1xuICAgICAgICAgICAgaWYgKGRhdGEudXNlclBhc3NrZXlzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAndXNlclBhc3NrZXlzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRVc2VyUGFzc2tleXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEudXNlclBhc3NrZXlzLFxuICAgICAgICAgICAgICAgICAgICAnZmluZ2VycHJpbnQgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiBubyBkYXRhIHdpbGwgYmUgZGVsZXRlZFxuICAgICAgICAgICAgaWYgKHN0YXRpc3RpY3NIdG1sID09PSAnJykge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Ob0RhdGFUb0RlbGV0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbW9kYWwgY29udGVudFxuICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoc3RhdGlzdGljc0h0bWwpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHN0YXRpc3RpYyBpdGVtIEhUTUxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBJdGVtIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBEaXNwbGF5IGxhYmVsXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSB2YWx1ZSAtIERpc3BsYXkgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWNvbiAtIEljb24gY2xhc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZVN0YXRpc3RpY0l0ZW0oaWQsIGxhYmVsLCB2YWx1ZSwgaWNvbikge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29ufVwiPjwvaT4gJHtsYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3ZhbHVlfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGJ5dGVzIHRvIGh1bWFuIHJlYWRhYmxlIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIEJ5dGVzIHRvIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWNpbWFscyAtIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRCeXRlcyhieXRlcywgZGVjaW1hbHMgPSAyKSB7XG4gICAgICAgIGlmIChieXRlcyA9PT0gMCkgcmV0dXJuICcwIEInO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgayA9IDEwMjQ7XG4gICAgICAgIGNvbnN0IGRtID0gZGVjaW1hbHMgPCAwID8gMCA6IGRlY2ltYWxzO1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coaykpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGJ5dGVzIC8gTWF0aC5wb3coaywgaSkpLnRvRml4ZWQoZG0pKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBkZWxldGluZyBwcm9ncmVzcyBpbiBtb2RhbFxuICAgICAqL1xuICAgIHNob3dEZWxldGluZ1Byb2dyZXNzKCkge1xuICAgICAgICBjb25zdCAkY29udGVudCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmNvbnRlbnQnKTtcbiAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG5cbiAgICAgICAgLy8gSGlkZSBhY3Rpb24gYnV0dG9ucyBpbml0aWFsbHlcbiAgICAgICAgJGFjdGlvbnMuaGlkZSgpO1xuXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHN0YWdlXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuYXR0cignZGF0YS1zdGFnZScsICdzdGFydGluZycpO1xuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkY29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxhcmdlIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfRGVsZXRpbmdBbGxTZXR0aW5nc308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZGVsZXRlIHByb2dyZXNzIGV2ZW50cyBmcm9tIFdlYlNvY2tldFxuICAgICAqL1xuICAgIHByb2Nlc3NEZWxldGVQcm9ncmVzcyhyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHM7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcblxuICAgICAgICAvLyBVcGRhdGUgZGF0YS1zdGFnZSBhdHRyaWJ1dGUgZm9yIHRlc3RpbmdcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5hdHRyKCdkYXRhLXN0YWdlJywgc3RhZ2UpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBkaXNwbGF5XG4gICAgICAgIGxldCBwcm9ncmVzc0h0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBwcm9ncmVzc1wiIGRhdGEtcGVyY2VudD1cIiR7c3RhZ2VEZXRhaWxzLnByb2dyZXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmFyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3NcIj4ke3N0YWdlRGV0YWlscy5wcm9ncmVzc30lPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibGFiZWxcIj4ke3N0YWdlRGV0YWlscy5tZXNzYWdlS2V5ID8gZ2xvYmFsVHJhbnNsYXRlW3N0YWdlRGV0YWlscy5tZXNzYWdlS2V5XSA6IHN0YWdlRGV0YWlscy5tZXNzYWdlfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG5cbiAgICAgICAgJGNvbnRlbnQuaHRtbChwcm9ncmVzc0h0bWwpO1xuICAgICAgICAkKCcudWkucHJvZ3Jlc3MnKS5wcm9ncmVzcygpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBmaW5hbCBzdGFnZSAtIGNvbXBsZXRpb25cbiAgICAgICAgaWYgKHN0YWdlID09PSAnRGVsZXRlQWxsX1N0YWdlX0ZpbmFsJyAmJiBzdGFnZURldGFpbHMucHJvZ3Jlc3MgPT09IDEwMCkge1xuICAgICAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAvLyBQcm9jZXNzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHlcbiAgICAgICAgICAgICAgICAvLyBEbyBOT1QgY2xvc2UgbW9kYWwgYXV0b21hdGljYWxseSAtIGxldCB1c2VyIGNsb3NlIGl0XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGNvbnRlbnQgdG8gc2hvdyBjb21wbGV0aW9uIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBwcm9ncmVzc0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc3VjY2VzcyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19EZWxldGVBbGxTdGFnZUNvbXBsZXRlZH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgICRjb250ZW50Lmh0bWwocHJvZ3Jlc3NIdG1sKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGFuZCByZXN0b3JlIG1vZGFsXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHN0YWdlRGV0YWlscy5tZXNzYWdlcyB8fCBbJ1Vua25vd24gZXJyb3InXSk7XG4gICAgICAgICAgICAgICAgJGFjdGlvbnMuc2hvdygpO1xuICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5sb2FkRGVsZXRlU3RhdGlzdGljcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgbm8gcmVzdWx0IHByb3BlcnR5LCBqdXN0IHVwZGF0ZSBwcm9ncmVzc1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHJlc3RhcnQgc3RhZ2VcbiAgICAgICAgaWYgKHN0YWdlID09PSAnRGVsZXRlQWxsX1N0YWdlX1Jlc3RhcnQnICYmIHN0YWdlRGV0YWlscy5yZXN0YXJ0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBTaG93IHJlc3RhcnQgbWVzc2FnZSBpbiBtb2RhbCBjb250ZW50IChub3QgYXMgcG9wdXApXG4gICAgICAgICAgICBwcm9ncmVzc0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHN1Y2Nlc3MgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjaGVjayBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX0RlbGV0ZUFsbFN0YWdlQ29tcGxldGVkfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfRGVsZXRlQWxsU3RhZ2VSZXN0YXJ0aW5nfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkY29udGVudC5odG1sKHByb2dyZXNzSHRtbCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgQ2xvc2UgYnV0dG9uIG9ubHkgYWZ0ZXIgcHJvY2VzcyBjb21wbGV0aW9uXG4gICAgICAgICAgICAkYWN0aW9ucy5odG1sKCc8YnV0dG9uIGNsYXNzPVwidWkgcG9zaXRpdmUgYnV0dG9uXCI+JyArIGdsb2JhbFRyYW5zbGF0ZS5zbF9DbG9zZSArICc8L2J1dHRvbj4nKTtcbiAgICAgICAgICAgICRhY3Rpb25zLnNob3coKTtcblxuICAgICAgICAgICAgLy8gTWFrZSBtb2RhbCBjbG9zYWJsZSBub3dcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoJ3NldHRpbmcnLCAnY2xvc2FibGUnLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHJlc3BvbnNlIGFmdGVyIHJlc3RvcmluZyBkZWZhdWx0IHNldHRpbmdzICh1cGRhdGVkIGZvciBhc3luYylcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW58b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gdGhlIHNlcnZlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIC8vIEVycm9yIG9jY3VycmVkXG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIG1vZGFsXG4gICAgICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcbiAgICAgICAgICAgICRhY3Rpb25zLnNob3coKTtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5sb2FkRGVsZXRlU3RhdGlzdGljcygpO1xuICAgICAgICB9XG4gICAgICAgIC8vIFN1Y2Nlc3MgY2FzZSB3aWxsIGJlIGhhbmRsZWQgYnkgV2ViU29ja2V0IGV2ZW50c1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnB1dCB3YXRjaGVyIHRvIG1vbml0b3IgZGVsZXRlIHBocmFzZSBpbnB1dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnB1dFdhdGNoZXIoKSB7XG4gICAgICAgIGNvbnN0ICRzdWJtaXRCdXR0b24gPSAkKCcjc3VibWl0YnV0dG9uJyk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsQnV0dG9uVGV4dCA9ICRzdWJtaXRCdXR0b24udGV4dCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gV2F0Y2ggZm9yIGlucHV0IGNoYW5nZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxJbnB1dC5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0VmFsdWUgPSAkKHRoaXMpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGVudGVyZWQgcGhyYXNlIG1hdGNoZXNcbiAgICAgICAgICAgIGlmIChpbnB1dFZhbHVlID09PSBnbG9iYWxUcmFuc2xhdGUuZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGFuZ2UgYnV0dG9uIHRleHQgdG8gaW5kaWNhdGUgZGVsZXRpb24gYWN0aW9uXG4gICAgICAgICAgICAgICAgJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3Bvc2l0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCduZWdhdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInRyYXNoIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLmdzX0J0bkRlbGV0ZUFsbH1gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBidXR0b24gdGV4dFxuICAgICAgICAgICAgICAgICRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCduZWdhdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygncG9zaXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7b3JpZ2luYWxCdXR0b25UZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==