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

          SystemAPI.restoreDefault(generalSettingsDeleteAll.cbAfterRestoreDefaultSettings); // Return false to prevent automatic modal closing

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
    var $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions'); // Hide action buttons

    $actions.hide(); // Show loading state

    $content.html("\n            <div class=\"ui segment\">\n                <div class=\"ui active inverted dimmer\">\n                    <div class=\"ui large text loader\">".concat(globalTranslate.gs_DeletingAllSettings, "</div>\n                </div>\n                <p>&nbsp;</p>\n                <p>&nbsp;</p>\n                <p>&nbsp;</p>\n            </div>\n        "));
  },

  /**
   * Process delete progress events from WebSocket
   */
  processDeleteProgress: function processDeleteProgress(response) {
    var stage = response.stage;
    var stageDetails = response.stageDetails;
    var $content = generalSettingsDeleteAll.$deleteAllModal.find('.content'); // Update progress display

    var progressHtml = "\n            <div class=\"ui segment\">\n                <div class=\"ui progress\" data-percent=\"".concat(stageDetails.progress, "\">\n                    <div class=\"bar\">\n                        <div class=\"progress\">").concat(stageDetails.progress, "%</div>\n                    </div>\n                    <div class=\"label\">").concat(stageDetails.messageKey ? globalTranslate[stageDetails.messageKey] : stageDetails.message, "</div>\n                </div>\n            </div>\n        ");
    $content.html(progressHtml);
    $('.ui.progress').progress(); // Handle final stage

    if (stage === 'DeleteAll_Stage_Final' && stageDetails.progress === 100) {
      if (stageDetails.result === true) {
        // Close modal
        generalSettingsDeleteAll.$deleteAllModal.modal('hide'); // Show success message

        UserMessage.showInformation(globalTranslate.gs_AllSettingsDeleted); // Don't redirect - system will restart
      } else if (stageDetails.result === false) {
        // Show error and restore modal
        UserMessage.showMultiString(stageDetails.messages || ['Unknown error']);
        var $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions');
        $actions.show();
        generalSettingsDeleteAll.loadDeleteStatistics();
      } // If no result property, just update progress

    } // Handle restart stage


    if (stage === 'DeleteAll_Stage_Restart' && stageDetails.restart === true) {
      // Just show info message, EventBus will handle the disconnection UI
      UserMessage.showInformation(globalTranslate.gs_SystemWillRestart);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiU3lzdGVtQVBJIiwicmVzdG9yZURlZmF1bHQiLCJjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm9uRGVueSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsImRlbGV0ZUFsbElucHV0IiwidmFsIiwidHJpbSIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwic2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsIiwiaHRtbCIsImdzX0xvYWRpbmdTdGF0aXN0aWNzIiwiZ2V0RGVsZXRlU3RhdGlzdGljcyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyIsInN0YXRpc3RpY3NIdG1sIiwidXNlcnMiLCJjcmVhdGVTdGF0aXN0aWNJdGVtIiwiZ3NfU3RhdFVzZXJzIiwiZXh0ZW5zaW9ucyIsInByb3ZpZGVycyIsImdzX1N0YXRQcm92aWRlcnMiLCJjYWxsUXVldWVzIiwiZ3NfU3RhdENhbGxRdWV1ZXMiLCJpdnJNZW51cyIsImdzX1N0YXRJdnJNZW51cyIsImNvbmZlcmVuY2VSb29tcyIsImdzX1N0YXRDb25mZXJlbmNlUm9vbXMiLCJkaWFscGxhbkFwcGxpY2F0aW9ucyIsImdzX1N0YXREaWFscGxhbkFwcGxpY2F0aW9ucyIsImN1c3RvbVNvdW5kRmlsZXMiLCJnc19TdGF0U291bmRGaWxlcyIsIm1vaEZpbGVzIiwiZ3NfU3RhdE1vaEZpbGVzIiwidG90YWxSb3V0ZXMiLCJpbmNvbWluZ1JvdXRlcyIsIm91dGdvaW5nUm91dGVzIiwiZ3NfU3RhdFJvdXRlcyIsImZpcmV3YWxsUnVsZXMiLCJnc19TdGF0RmlyZXdhbGxSdWxlcyIsIm1vZHVsZXMiLCJnc19TdGF0TW9kdWxlcyIsImNhbGxIaXN0b3J5IiwiZ3NfU3RhdENhbGxIaXN0b3J5IiwidG9Mb2NhbGVTdHJpbmciLCJjYWxsUmVjb3JkaW5ncyIsInNpemVTdHIiLCJmb3JtYXRCeXRlcyIsImNhbGxSZWNvcmRpbmdzU2l6ZSIsImdzX1N0YXRDYWxsUmVjb3JkaW5ncyIsImJhY2t1cHMiLCJiYWNrdXBzU2l6ZSIsImdzX1N0YXRCYWNrdXBzIiwiY3VzdG9tRmlsZXMiLCJnc19TdGF0Q3VzdG9tRmlsZXMiLCJvdXRXb3JrVGltZXMiLCJnc19TdGF0T3V0V29ya1RpbWVzIiwib3V0V29ya1RpbWVzUm91dHMiLCJnc19TdGF0T3V0V29ya1RpbWVzUm91dHMiLCJhcGlLZXlzIiwiZ3NfU3RhdEFwaUtleXMiLCJhc3Rlcmlza1Jlc3RVc2VycyIsImdzX1N0YXRBc3Rlcmlza1Jlc3RVc2VycyIsInVzZXJQYXNza2V5cyIsImdzX1N0YXRVc2VyUGFzc2tleXMiLCJnc19Ob0RhdGFUb0RlbGV0ZSIsImlkIiwibGFiZWwiLCJ2YWx1ZSIsImljb24iLCJieXRlcyIsImRlY2ltYWxzIiwiayIsImRtIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCIkY29udGVudCIsImZpbmQiLCIkYWN0aW9ucyIsImhpZGUiLCJnc19EZWxldGluZ0FsbFNldHRpbmdzIiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCJwcm9ncmVzc0h0bWwiLCJwcm9ncmVzcyIsIm1lc3NhZ2VLZXkiLCJtZXNzYWdlIiwiVXNlck1lc3NhZ2UiLCJzaG93SW5mb3JtYXRpb24iLCJnc19BbGxTZXR0aW5nc0RlbGV0ZWQiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3ciLCJyZXN0YXJ0IiwiZ3NfU3lzdGVtV2lsbFJlc3RhcnQiLCIkc3VibWl0QnV0dG9uIiwib3JpZ2luYWxCdXR0b25UZXh0IiwidGV4dCIsIm9uIiwiaW5wdXRWYWx1ZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJnc19CdG5EZWxldGVBbGwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx3QkFBd0IsR0FBRztBQUU3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBTFk7QUFNN0JDLEVBQUFBLGtCQUFrQixFQUFFLElBTlM7QUFPN0JDLEVBQUFBLGVBQWUsRUFBRSxJQVBZOztBQVM3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBWmE7O0FBYzdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWpCNkIsd0JBaUJoQjtBQUNUO0FBQ0FMLElBQUFBLHdCQUF3QixDQUFDSSxjQUF6Qix3QkFBd0RFLElBQUksQ0FBQ0MsR0FBTCxFQUF4RCxFQUZTLENBSVQ7O0FBQ0FDLElBQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQlQsd0JBQXdCLENBQUNJLGNBQTVDLEVBQTRELFVBQUFNLElBQUksRUFBSTtBQUNoRVYsTUFBQUEsd0JBQXdCLENBQUNXLHFCQUF6QixDQUErQ0QsSUFBL0M7QUFDSCxLQUZELEVBTFMsQ0FTVDs7QUFDQVYsSUFBQUEsd0JB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UixHQUFjQyxJQUFkLEVBQW5CLENBRDRELENBRzVEOztBQUNBLFVBQUlvRyxVQUFVLEtBQUtuRyxlQUFlLENBQUNDLHVCQUFuQyxFQUE0RDtBQUN4RDtBQUNBOEYsUUFBQUEsYUFBYSxDQUNSSyxXQURMLENBQ2lCLFVBRGpCLEVBRUtDLFFBRkwsQ0FFYyxVQUZkLEVBR0tsRyxJQUhMLHdDQUd3Q0gsZUFBZSxDQUFDc0csZUFIeEQ7QUFJSCxPQU5ELE1BTU87QUFDSDtBQUNBUCxRQUFBQSxhQUFhLENBQ1JLLFdBREwsQ0FDaUIsVUFEakIsRUFFS0MsUUFGTCxDQUVjLFVBRmQsRUFHS2xHLElBSEwsdUNBR3VDNkYsa0JBSHZDO0FBSUg7QUFDSixLQWpCRDtBQWtCSDtBQTFmNEIsQ0FBakMsQyxDQTZmQTs7QUFDQXBILENBQUMsQ0FBQzJILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ4SSxFQUFBQSx3QkFBd0IsQ0FBQ0ssVUFBekI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgRXZlbnRCdXMsIEZvcm0sIFN5c3RlbUFQSSAqL1xuXG4vKipcbiAqIE1vZHVsZSBmb3IgaGFuZGxpbmcgdGhlIFwiRGVsZXRlIEFsbCBTZXR0aW5nc1wiIGZ1bmN0aW9uYWxpdHlcbiAqIE1hbmFnZXMgdGhlIGNvbmZpcm1hdGlvbiBtb2RhbCBhbmQgc3RhdGlzdGljcyBkaXNwbGF5XG4gKi9cbmNvbnN0IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0cyAtIHdpbGwgYmUgaW5pdGlhbGl6ZWQgaW4gaW5pdGlhbGl6ZSgpXG4gICAgICovXG4gICAgJGRlbGV0ZUFsbE1vZGFsOiBudWxsLFxuICAgICRzdGF0aXN0aWNzQ29udGVudDogbnVsbCxcbiAgICAkZGVsZXRlQWxsSW5wdXQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogQXN5bmMgY2hhbm5lbCBJRCBmb3IgV2ViU29ja2V0IGV2ZW50c1xuICAgICAqL1xuICAgIGFzeW5jQ2hhbm5lbElkOiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEdlbmVyYXRlIHVuaXF1ZSBjaGFubmVsIElEIGZvciB0aGlzIHNlc3Npb25cbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmFzeW5jQ2hhbm5lbElkID0gYGRlbGV0ZS1hbGwtJHtEYXRlLm5vdygpfWA7XG4gICAgICAgIFxuICAgICAgICAvLyBTdWJzY3JpYmUgdG8gV2ViU29ja2V0IGV2ZW50c1xuICAgICAgICBFdmVudEJ1cy5zdWJzY3JpYmUoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmFzeW5jQ2hhbm5lbElkLCBkYXRhID0+IHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5wcm9jZXNzRGVsZXRlUHJvZ3Jlc3MoZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgb2JqZWN0cyB3aGVuIERPTSBpcyByZWFkeVxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsID0gJCgnI2RlbGV0ZS1hbGwtbW9kYWwnKTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRzdGF0aXN0aWNzQ29udGVudCA9ICQoJyNkZWxldGUtc3RhdGlzdGljcy1jb250ZW50Jyk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQgPSAkKCdpbnB1dFtuYW1lPVwiZGVsZXRlQWxsSW5wdXRcIl0nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgbW9kYWwgc2V0dGluZ3NcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmluaXRpYWxpemVNb2RhbCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gV2F0Y2ggZm9yIGlucHV0IGNoYW5nZXNcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmluaXRpYWxpemVJbnB1dFdhdGNoZXIoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGRlbGV0ZSBjb25maXJtYXRpb24gbW9kYWxcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTW9kYWwoKSB7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsICYmIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uU2hvdzogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIHN0YXRpc3RpY3Mgd2hlbiBtb2RhbCBpcyBzaG93blxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwubG9hZERlbGV0ZVN0YXRpc3RpY3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGUgaW4gbW9kYWxcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnNob3dEZWxldGluZ1Byb2dyZXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVzZXIgY29uZmlybXMgZGVsZXRpb24gLSBwYXNzIGFzeW5jIGNoYW5uZWwgSURcbiAgICAgICAgICAgICAgICAgICAgU3lzdGVtQVBJLnJlc3RvcmVEZWZhdWx0KGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm4gZmFsc2UgdG8gcHJldmVudCBhdXRvbWF0aWMgbW9kYWwgY2xvc2luZ1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1c2VyIGNhbmNlbHMgLSBtYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBrZWVwIHNhdmUgYnV0dG9uIGFjdGl2ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRoZSBkZWxldGUgcGhyYXNlIHdhcyBlbnRlcmVkIGNvcnJlY3RseSBhbmQgc2hvdyBtb2RhbFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgcGhyYXNlIG1hdGNoZXMsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGNoZWNrRGVsZXRlQ29uZGl0aW9ucygpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2YWx1ZSBvZiAnZGVsZXRlQWxsSW5wdXQnIGZpZWxkIGFuZCB0cmltIHNwYWNlc1xuICAgICAgICBjb25zdCBkZWxldGVBbGxJbnB1dCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQudmFsKCkudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGVudGVyZWQgcGhyYXNlIG1hdGNoZXMgdGhlIHJlcXVpcmVkIHBocmFzZVxuICAgICAgICBpZiAoZGVsZXRlQWxsSW5wdXQgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnNob3dEZWxldGVDb25maXJtYXRpb25Nb2RhbCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgdGhlIGRlbGV0ZSBjb25maXJtYXRpb24gbW9kYWwgd2l0aCBzdGF0aXN0aWNzXG4gICAgICovXG4gICAgc2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCAmJiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBhbmQgZGlzcGxheSBkZWxldGlvbiBzdGF0aXN0aWNzIGluIHRoZSBtb2RhbFxuICAgICAqL1xuICAgIGxvYWREZWxldGVTdGF0aXN0aWNzKCkge1xuICAgICAgICBjb25zdCAkc3RhdGlzdGljc0NvbnRlbnQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJHN0YXRpc3RpY3NDb250ZW50O1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICRzdGF0aXN0aWNzQ29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBjZW50ZXJlZCBpbmxpbmUgbG9hZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX0xvYWRpbmdTdGF0aXN0aWNzfTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBzdGF0aXN0aWNzIGZyb20gQVBJXG4gICAgICAgIFN5c3RlbUFQSS5nZXREZWxldGVTdGF0aXN0aWNzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIEFQSSBlcnJvcnNcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgcmVzcG9uc2UucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgc3RhdGlzdGljcyBjb3VsZG4ndCBiZSBsb2FkZWRcbiAgICAgICAgICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19FcnJvckxvYWRpbmdTdGF0aXN0aWNzfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gcmVzcG9uc2VcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhIHx8IHt9O1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBzdGF0aXN0aWNzIEhUTUxcbiAgICAgICAgICAgIGxldCBzdGF0aXN0aWNzSHRtbCA9ICcnO1xuXG4gICAgICAgICAgICAvLyBVc2VycyBhbmQgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEudXNlcnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICd1c2VycycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0VXNlcnMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZXh0ZW5zaW9ucyB8fCBkYXRhLnVzZXJzLFxuICAgICAgICAgICAgICAgICAgICAndXNlciBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFByb3ZpZGVyc1xuICAgICAgICAgICAgaWYgKGRhdGEucHJvdmlkZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncHJvdmlkZXJzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRQcm92aWRlcnMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHJvdmlkZXJzLFxuICAgICAgICAgICAgICAgICAgICAnc2VydmVyIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmNhbGxRdWV1ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdxdWV1ZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxRdWV1ZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbFF1ZXVlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3VzZXJzIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSVZSIE1lbnVzXG4gICAgICAgICAgICBpZiAoZGF0YS5pdnJNZW51cyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2l2cicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0SXZyTWVudXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaXZyTWVudXMsXG4gICAgICAgICAgICAgICAgICAgICdzaXRlbWFwIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgICAgICAgICAgaWYgKGRhdGEuY29uZmVyZW5jZVJvb21zID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY29uZmVyZW5jZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENvbmZlcmVuY2VSb29tcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jb25mZXJlbmNlUm9vbXMsXG4gICAgICAgICAgICAgICAgICAgICd2aWRlbyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpYWxwbGFuIGFwcGxpY2F0aW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEuZGlhbHBsYW5BcHBsaWNhdGlvbnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdkaWFscGxhbicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0RGlhbHBsYW5BcHBsaWNhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZGlhbHBsYW5BcHBsaWNhdGlvbnMsXG4gICAgICAgICAgICAgICAgICAgICdjb2RlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU291bmQgZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmN1c3RvbVNvdW5kRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdzb3VuZHMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFNvdW5kRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VzdG9tU291bmRGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ211c2ljIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTU9IIChNdXNpYyBPbiBIb2xkKSBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEubW9oRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdtb2gnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdE1vaEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLm1vaEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAndm9sdW1lIHVwIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUm91dGVzXG4gICAgICAgICAgICBjb25zdCB0b3RhbFJvdXRlcyA9IChkYXRhLmluY29taW5nUm91dGVzIHx8IDApICsgKGRhdGEub3V0Z29pbmdSb3V0ZXMgfHwgMCk7XG4gICAgICAgICAgICBpZiAodG90YWxSb3V0ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdyb3V0ZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFJvdXRlcyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSb3V0ZXMsXG4gICAgICAgICAgICAgICAgICAgICdyYW5kb20gaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaXJld2FsbCBydWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEuZmlyZXdhbGxSdWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2ZpcmV3YWxsJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRGaXJld2FsbFJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmZpcmV3YWxsUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgICdzaGllbGQgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5tb2R1bGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9kdWxlcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0TW9kdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGVzLFxuICAgICAgICAgICAgICAgICAgICAncHV6emxlIHBpZWNlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCBoaXN0b3J5XG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsSGlzdG9yeSA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2NkcicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0Q2FsbEhpc3RvcnksXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbEhpc3RvcnkudG9Mb2NhbGVTdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgJ2hpc3RvcnkgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDYWxsIHJlY29yZGluZ3NcbiAgICAgICAgICAgIGlmIChkYXRhLmNhbGxSZWNvcmRpbmdzID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVTdHIgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuZm9ybWF0Qnl0ZXMoZGF0YS5jYWxsUmVjb3JkaW5nc1NpemUgfHwgMCk7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdyZWNvcmRpbmdzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsUmVjb3JkaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5jYWxsUmVjb3JkaW5ncy50b0xvY2FsZVN0cmluZygpfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnbWljcm9waG9uZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEJhY2t1cHNcbiAgICAgICAgICAgIGlmIChkYXRhLmJhY2t1cHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVN0ciA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5mb3JtYXRCeXRlcyhkYXRhLmJhY2t1cHNTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYmFja3VwcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0QmFja3VwcyxcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5iYWNrdXBzfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnYXJjaGl2ZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEuY3VzdG9tRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjdXN0b20nLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEN1c3RvbUZpbGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmN1c3RvbUZpbGVzLFxuICAgICAgICAgICAgICAgICAgICAnZmlsZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE91dC1vZi1Xb3JrIFRpbWUgY29uZGl0aW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEub3V0V29ya1RpbWVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnb3V0V29ya1RpbWVzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRPdXRXb3JrVGltZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEub3V0V29ya1RpbWVzLFxuICAgICAgICAgICAgICAgICAgICAnY2xvY2sgb3V0bGluZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE91dC1vZi1Xb3JrIFRpbWUgcm91dGUgYXNzb2NpYXRpb25zXG4gICAgICAgICAgICBpZiAoZGF0YS5vdXRXb3JrVGltZXNSb3V0cyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ291dFdvcmtUaW1lc1JvdXRzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRPdXRXb3JrVGltZXNSb3V0cyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5vdXRXb3JrVGltZXNSb3V0cyxcbiAgICAgICAgICAgICAgICAgICAgJ2xpbmtpZnkgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSRVNUIEFQSSBLZXlzXG4gICAgICAgICAgICBpZiAoZGF0YS5hcGlLZXlzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYXBpS2V5cycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0QXBpS2V5cyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5hcGlLZXlzLFxuICAgICAgICAgICAgICAgICAgICAna2V5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXN0ZXJpc2sgUkVTVCBJbnRlcmZhY2UgKEFSSSkgVXNlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLmFzdGVyaXNrUmVzdFVzZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYXN0ZXJpc2tSZXN0VXNlcnMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEFzdGVyaXNrUmVzdFVzZXJzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmFzdGVyaXNrUmVzdFVzZXJzLFxuICAgICAgICAgICAgICAgICAgICAncGx1ZyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFdlYkF1dGhuIFBhc3NrZXlzXG4gICAgICAgICAgICBpZiAoZGF0YS51c2VyUGFzc2tleXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICd1c2VyUGFzc2tleXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFVzZXJQYXNza2V5cyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS51c2VyUGFzc2tleXMsXG4gICAgICAgICAgICAgICAgICAgICdmaW5nZXJwcmludCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIG5vIGRhdGEgd2lsbCBiZSBkZWxldGVkXG4gICAgICAgICAgICBpZiAoc3RhdGlzdGljc0h0bWwgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX05vRGF0YVRvRGVsZXRlfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RhbCBjb250ZW50XG4gICAgICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChzdGF0aXN0aWNzSHRtbCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgc3RhdGlzdGljIGl0ZW0gSFRNTFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIEl0ZW0gaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIERpc3BsYXkgbGFiZWxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IHZhbHVlIC0gRGlzcGxheSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpY29uIC0gSWNvbiBjbGFzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgY3JlYXRlU3RhdGlzdGljSXRlbShpZCwgbGFiZWwsIHZhbHVlLCBpY29uKSB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb259XCI+PC9pPiAke2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7dmFsdWV9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgYnl0ZXMgdG8gaHVtYW4gcmVhZGFibGUgZm9ybWF0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gQnl0ZXMgdG8gZm9ybWF0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlY2ltYWxzIC0gTnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdEJ5dGVzKGJ5dGVzLCBkZWNpbWFscyA9IDIpIHtcbiAgICAgICAgaWYgKGJ5dGVzID09PSAwKSByZXR1cm4gJzAgQic7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBrID0gMTAyNDtcbiAgICAgICAgY29uc3QgZG0gPSBkZWNpbWFscyA8IDAgPyAwIDogZGVjaW1hbHM7XG4gICAgICAgIGNvbnN0IHNpemVzID0gWydCJywgJ0tCJywgJ01CJywgJ0dCJywgJ1RCJ107XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLmxvZyhieXRlcykgLyBNYXRoLmxvZyhrKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCgoYnl0ZXMgLyBNYXRoLnBvdyhrLCBpKSkudG9GaXhlZChkbSkpICsgJyAnICsgc2l6ZXNbaV07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGRlbGV0aW5nIHByb2dyZXNzIGluIG1vZGFsXG4gICAgICovXG4gICAgc2hvd0RlbGV0aW5nUHJvZ3Jlc3MoKSB7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgYWN0aW9uIGJ1dHRvbnNcbiAgICAgICAgJGFjdGlvbnMuaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICRjb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGFyZ2UgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19EZWxldGluZ0FsbFNldHRpbmdzfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBkZWxldGUgcHJvZ3Jlc3MgZXZlbnRzIGZyb20gV2ViU29ja2V0XG4gICAgICovXG4gICAgcHJvY2Vzc0RlbGV0ZVByb2dyZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IHN0YWdlID0gcmVzcG9uc2Uuc3RhZ2U7XG4gICAgICAgIGNvbnN0IHN0YWdlRGV0YWlscyA9IHJlc3BvbnNlLnN0YWdlRGV0YWlscztcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5jb250ZW50Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgZGlzcGxheVxuICAgICAgICBsZXQgcHJvZ3Jlc3NIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcHJvZ3Jlc3NcIiBkYXRhLXBlcmNlbnQ9XCIke3N0YWdlRGV0YWlscy5wcm9ncmVzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzXCI+JHtzdGFnZURldGFpbHMucHJvZ3Jlc3N9JTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtzdGFnZURldGFpbHMubWVzc2FnZUtleSA/IGdsb2JhbFRyYW5zbGF0ZVtzdGFnZURldGFpbHMubWVzc2FnZUtleV0gOiBzdGFnZURldGFpbHMubWVzc2FnZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGNvbnRlbnQuaHRtbChwcm9ncmVzc0h0bWwpO1xuICAgICAgICAkKCcudWkucHJvZ3Jlc3MnKS5wcm9ncmVzcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGZpbmFsIHN0YWdlXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0RlbGV0ZUFsbF9TdGFnZV9GaW5hbCcgJiYgc3RhZ2VEZXRhaWxzLnByb2dyZXNzID09PSAxMDApIHtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xvc2UgbW9kYWxcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbFNldHRpbmdzRGVsZXRlZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgcmVkaXJlY3QgLSBzeXN0ZW0gd2lsbCByZXN0YXJ0XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgcmVzdG9yZSBtb2RhbFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhzdGFnZURldGFpbHMubWVzc2FnZXMgfHwgWydVbmtub3duIGVycm9yJ10pO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhY3Rpb25zID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuYWN0aW9ucycpO1xuICAgICAgICAgICAgICAgICRhY3Rpb25zLnNob3coKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwubG9hZERlbGV0ZVN0YXRpc3RpY3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIG5vIHJlc3VsdCBwcm9wZXJ0eSwganVzdCB1cGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHJlc3RhcnQgc3RhZ2VcbiAgICAgICAgaWYgKHN0YWdlID09PSAnRGVsZXRlQWxsX1N0YWdlX1Jlc3RhcnQnICYmIHN0YWdlRGV0YWlscy5yZXN0YXJ0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBKdXN0IHNob3cgaW5mbyBtZXNzYWdlLCBFdmVudEJ1cyB3aWxsIGhhbmRsZSB0aGUgZGlzY29ubmVjdGlvbiBVSVxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19TeXN0ZW1XaWxsUmVzdGFydCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXNwb25zZSBhZnRlciByZXN0b3JpbmcgZGVmYXVsdCBzZXR0aW5ncyAodXBkYXRlZCBmb3IgYXN5bmMpXG4gICAgICogQHBhcmFtIHtib29sZWFufG9iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBFcnJvciBvY2N1cnJlZFxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBtb2RhbFxuICAgICAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG4gICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwubG9hZERlbGV0ZVN0YXRpc3RpY3MoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdWNjZXNzIGNhc2Ugd2lsbCBiZSBoYW5kbGVkIGJ5IFdlYlNvY2tldCBldmVudHNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgd2F0Y2hlciB0byBtb25pdG9yIGRlbGV0ZSBwaHJhc2UgaW5wdXRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRXYXRjaGVyKCkge1xuICAgICAgICBjb25zdCAkc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICBjb25zdCBvcmlnaW5hbEJ1dHRvblRleHQgPSAkc3VibWl0QnV0dG9uLnRleHQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFdhdGNoIGZvciBpbnB1dCBjaGFuZ2VzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dFZhbHVlID0gJCh0aGlzKS52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzXG4gICAgICAgICAgICBpZiAoaW5wdXRWYWx1ZSA9PT0gZ2xvYmFsVHJhbnNsYXRlLmdzX0VudGVyRGVsZXRlQWxsUGhyYXNlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIGJ1dHRvbiB0ZXh0IHRvIGluZGljYXRlIGRlbGV0aW9uIGFjdGlvblxuICAgICAgICAgICAgICAgICRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdwb3NpdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVnYXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0cmFzaCBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5nc19CdG5EZWxldGVBbGx9YCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgYnV0dG9uIHRleHRcbiAgICAgICAgICAgICAgICAkc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnbmVnYXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3Bvc2l0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwic2F2ZSBpY29uXCI+PC9pPiAke29yaWdpbmFsQnV0dG9uVGV4dH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gSW5pdGlhbGl6ZSB3aGVuIERPTSBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplKCk7XG59KTsiXX0=