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

    SystemAPI.getDeleteStatistics(function (data) {
      if (data === false) {
        // Show error if statistics couldn't be loaded
        $statisticsContent.html("\n                    <div class=\"ui segment\">\n                        <div class=\"ui error message\">\n                            <i class=\"exclamation triangle icon\"></i>\n                            ".concat(globalTranslate.gs_ErrorLoadingStatistics, "\n                        </div>\n                    </div>\n                "));
        return;
      } // Build statistics HTML


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiU3lzdGVtQVBJIiwicmVzdG9yZURlZmF1bHQiLCJjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm9uRGVueSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsImRlbGV0ZUFsbElucHV0IiwidmFsIiwidHJpbSIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwic2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsIiwiaHRtbCIsImdzX0xvYWRpbmdTdGF0aXN0aWNzIiwiZ2V0RGVsZXRlU3RhdGlzdGljcyIsImdzX0Vycm9yTG9hZGluZ1N0YXRpc3RpY3MiLCJzdGF0aXN0aWNzSHRtbCIsInVzZXJzIiwiY3JlYXRlU3RhdGlzdGljSXRlbSIsImdzX1N0YXRVc2VycyIsImV4dGVuc2lvbnMiLCJwcm92aWRlcnMiLCJnc19TdGF0UHJvdmlkZXJzIiwiY2FsbFF1ZXVlcyIsImdzX1N0YXRDYWxsUXVldWVzIiwiaXZyTWVudXMiLCJnc19TdGF0SXZyTWVudXMiLCJjb25mZXJlbmNlUm9vbXMiLCJnc19TdGF0Q29uZmVyZW5jZVJvb21zIiwiZGlhbHBsYW5BcHBsaWNhdGlvbnMiLCJnc19TdGF0RGlhbHBsYW5BcHBsaWNhdGlvbnMiLCJjdXN0b21Tb3VuZEZpbGVzIiwiZ3NfU3RhdFNvdW5kRmlsZXMiLCJtb2hGaWxlcyIsImdzX1N0YXRNb2hGaWxlcyIsInRvdGFsUm91dGVzIiwiaW5jb21pbmdSb3V0ZXMiLCJvdXRnb2luZ1JvdXRlcyIsImdzX1N0YXRSb3V0ZXMiLCJmaXJld2FsbFJ1bGVzIiwiZ3NfU3RhdEZpcmV3YWxsUnVsZXMiLCJtb2R1bGVzIiwiZ3NfU3RhdE1vZHVsZXMiLCJjYWxsSGlzdG9yeSIsImdzX1N0YXRDYWxsSGlzdG9yeSIsInRvTG9jYWxlU3RyaW5nIiwiY2FsbFJlY29yZGluZ3MiLCJzaXplU3RyIiwiZm9ybWF0Qnl0ZXMiLCJjYWxsUmVjb3JkaW5nc1NpemUiLCJnc19TdGF0Q2FsbFJlY29yZGluZ3MiLCJiYWNrdXBzIiwiYmFja3Vwc1NpemUiLCJnc19TdGF0QmFja3VwcyIsImN1c3RvbUZpbGVzIiwiZ3NfU3RhdEN1c3RvbUZpbGVzIiwiZ3NfTm9EYXRhVG9EZWxldGUiLCJpZCIsImxhYmVsIiwidmFsdWUiLCJpY29uIiwiYnl0ZXMiLCJkZWNpbWFscyIsImsiLCJkbSIsInNpemVzIiwiaSIsIk1hdGgiLCJmbG9vciIsImxvZyIsInBhcnNlRmxvYXQiLCJwb3ciLCJ0b0ZpeGVkIiwiJGNvbnRlbnQiLCJmaW5kIiwiJGFjdGlvbnMiLCJoaWRlIiwiZ3NfRGVsZXRpbmdBbGxTZXR0aW5ncyIsInJlc3BvbnNlIiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCJwcm9ncmVzc0h0bWwiLCJwcm9ncmVzcyIsIm1lc3NhZ2VLZXkiLCJtZXNzYWdlIiwicmVzdWx0IiwiVXNlck1lc3NhZ2UiLCJzaG93SW5mb3JtYXRpb24iLCJnc19BbGxTZXR0aW5nc0RlbGV0ZWQiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3ciLCJyZXN0YXJ0IiwiZ3NfU3lzdGVtV2lsbFJlc3RhcnQiLCIkc3VibWl0QnV0dG9uIiwib3JpZ2luYWxCdXR0b25UZXh0IiwidGV4dCIsIm9uIiwiaW5wdXRWYWx1ZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJnc19CdG5EZWxldGVBbGwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx3QkFBd0IsR0FBRztBQUU3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBTFk7QUFNN0JDLEVBQUFBLGtCQUFrQixFQUFFLElBTlM7QUFPN0JDLEVBQUFBLGVBQWUsRUFBRSxJQVBZOztBQVM3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBWmE7O0FBYzdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWpCNkIsd0JBaUJoQjtBQUNUO0FBQ0FMLElBQUFBLHdCQUF3QixDQUFDSSxjQUF6Qix3QkFBd0RFLElBQUksQ0FBQ0MsR0FBTCxFQUF4RCxFQUZTLENBSVQ7O0FBQ0FDLElBQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQlQsd0JBQXdCLENBQUNJLGNBQTVDLEVBQTRELFVBQUFNLElBQUksRUFBSTtBQUNoRVYsTUFBQUEsd0JBQXdCLENBQUNXLHFCQUF6QixDQUErQ0QsSUFBL0M7QUFDSCxLQUZELEVBTFMsQ0FTVDs7QUFDQVYsSUFBQUEsd0JBQXdCLENBQUNDLGVBQXpCLEdBQTJDVyxDQUFDLENBQUMsbUJBQUQsQ0FBNUM7QUFDQVosSUFBQUEsd0JBQXdCLENBQUNFLGtCQUF6QixHQUE4Q1UsQ0FBQyxDQUFDLDRCQUFELENBQS9DO0FBQ0FaLElBQUFBLHdCQUF3QixDQUFDRyxlQUF6QixHQUEyQ1MsQ0FBQyxDQUFDLDhCQUFELENBQTVDLENBWlMsQ0FjVDs7QUFDQVosSUFBQUEsd0JBQXdC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RCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlILEVBQUFBLHdCQUF3QixDQUFDSyxVQUF6QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBQYnhBcGksIFVzZXJNZXNzYWdlLCBFdmVudEJ1cywgRm9ybSwgU3lzdGVtQVBJICovXG5cbi8qKlxuICogTW9kdWxlIGZvciBoYW5kbGluZyB0aGUgXCJEZWxldGUgQWxsIFNldHRpbmdzXCIgZnVuY3Rpb25hbGl0eVxuICogTWFuYWdlcyB0aGUgY29uZmlybWF0aW9uIG1vZGFsIGFuZCBzdGF0aXN0aWNzIGRpc3BsYXlcbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIC0gd2lsbCBiZSBpbml0aWFsaXplZCBpbiBpbml0aWFsaXplKClcbiAgICAgKi9cbiAgICAkZGVsZXRlQWxsTW9kYWw6IG51bGwsXG4gICAgJHN0YXRpc3RpY3NDb250ZW50OiBudWxsLFxuICAgICRkZWxldGVBbGxJbnB1dDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBc3luYyBjaGFubmVsIElEIGZvciBXZWJTb2NrZXQgZXZlbnRzXG4gICAgICovXG4gICAgYXN5bmNDaGFubmVsSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgdW5pcXVlIGNoYW5uZWwgSUQgZm9yIHRoaXMgc2Vzc2lvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWQgPSBgZGVsZXRlLWFsbC0ke0RhdGUubm93KCl9YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBXZWJTb2NrZXQgZXZlbnRzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZShnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWQsIGRhdGEgPT4ge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnByb2Nlc3NEZWxldGVQcm9ncmVzcyhkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBvYmplY3RzIHdoZW4gRE9NIGlzIHJlYWR5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgPSAkKCcjZGVsZXRlLWFsbC1tb2RhbCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJHN0YXRpc3RpY3NDb250ZW50ID0gJCgnI2RlbGV0ZS1zdGF0aXN0aWNzLWNvbnRlbnQnKTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJkZWxldGVBbGxJbnB1dFwiXScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RhbCBzZXR0aW5nc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZU1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYXRjaCBmb3IgaW5wdXQgY2hhbmdlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZUlucHV0V2F0Y2hlcigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZGVsZXRlIGNvbmZpcm1hdGlvbiBtb2RhbFxuICAgICAqL1xuICAgIGluaXRpYWxpemVNb2RhbCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgJiYgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25TaG93OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExvYWQgc3RhdGlzdGljcyB3aGVuIG1vZGFsIGlzIHNob3duXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5sb2FkRGVsZXRlU3RhdGlzdGljcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBpbiBtb2RhbFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuc2hvd0RlbGV0aW5nUHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdXNlciBjb25maXJtcyBkZWxldGlvbiAtIHBhc3MgYXN5bmMgY2hhbm5lbCBJRFxuICAgICAgICAgICAgICAgICAgICBTeXN0ZW1BUEkucmVzdG9yZURlZmF1bHQoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFJldHVybiBmYWxzZSB0byBwcmV2ZW50IGF1dG9tYXRpYyBtb2RhbCBjbG9zaW5nXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBXaGVuIHVzZXIgY2FuY2VscyAtIG1hcmsgZm9ybSBhcyBjaGFuZ2VkIHRvIGtlZXAgc2F2ZSBidXR0b24gYWN0aXZlXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdGhlIGRlbGV0ZSBwaHJhc2Ugd2FzIGVudGVyZWQgY29ycmVjdGx5IGFuZCBzaG93IG1vZGFsXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IC0gdHJ1ZSBpZiBwaHJhc2UgbWF0Y2hlcywgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICovXG4gICAgY2hlY2tEZWxldGVDb25kaXRpb25zKCkge1xuICAgICAgICAvLyBHZXQgdGhlIHZhbHVlIG9mICdkZWxldGVBbGxJbnB1dCcgZmllbGQgYW5kIHRyaW0gc3BhY2VzXG4gICAgICAgIGNvbnN0IGRlbGV0ZUFsbElucHV0ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxJbnB1dC52YWwoKS50cmltKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgZW50ZXJlZCBwaHJhc2UgbWF0Y2hlcyB0aGUgcmVxdWlyZWQgcGhyYXNlXG4gICAgICAgIGlmIChkZWxldGVBbGxJbnB1dCA9PT0gZ2xvYmFsVHJhbnNsYXRlLmdzX0VudGVyRGVsZXRlQWxsUGhyYXNlKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuc2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyB0aGUgZGVsZXRlIGNvbmZpcm1hdGlvbiBtb2RhbCB3aXRoIHN0YXRpc3RpY3NcbiAgICAgKi9cbiAgICBzaG93RGVsZXRlQ29uZmlybWF0aW9uTW9kYWwoKSB7XG4gICAgICAgIGlmIChnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsICYmIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5tb2RhbCgnc2hvdycpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIGFuZCBkaXNwbGF5IGRlbGV0aW9uIHN0YXRpc3RpY3MgaW4gdGhlIG1vZGFsXG4gICAgICovXG4gICAgbG9hZERlbGV0ZVN0YXRpc3RpY3MoKSB7XG4gICAgICAgIGNvbnN0ICRzdGF0aXN0aWNzQ29udGVudCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kc3RhdGlzdGljc0NvbnRlbnQ7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGNlbnRlcmVkIGlubGluZSBsb2FkZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzcz1cImNlbnRlciBhbGlnbmVkXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfTG9hZGluZ1N0YXRpc3RpY3N9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHN0YXRpc3RpY3MgZnJvbSBBUElcbiAgICAgICAgU3lzdGVtQVBJLmdldERlbGV0ZVN0YXRpc3RpY3MoKGRhdGEpID0+IHtcbiAgICAgICAgICAgIGlmIChkYXRhID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgc3RhdGlzdGljcyBjb3VsZG4ndCBiZSBsb2FkZWRcbiAgICAgICAgICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgZXJyb3IgbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19FcnJvckxvYWRpbmdTdGF0aXN0aWNzfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQnVpbGQgc3RhdGlzdGljcyBIVE1MXG4gICAgICAgICAgICBsZXQgc3RhdGlzdGljc0h0bWwgPSAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlcnMgYW5kIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIGlmIChkYXRhLnVzZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAndXNlcnMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRVc2VycywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZXh0ZW5zaW9ucyB8fCBkYXRhLnVzZXJzLFxuICAgICAgICAgICAgICAgICAgICAndXNlciBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb3ZpZGVyc1xuICAgICAgICAgICAgaWYgKGRhdGEucHJvdmlkZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncHJvdmlkZXJzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0UHJvdmlkZXJzLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcm92aWRlcnMsXG4gICAgICAgICAgICAgICAgICAgICdzZXJ2ZXIgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIHF1ZXVlc1xuICAgICAgICAgICAgaWYgKGRhdGEuY2FsbFF1ZXVlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3F1ZXVlcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxRdWV1ZXMsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxRdWV1ZXMsXG4gICAgICAgICAgICAgICAgICAgICd1c2VycyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElWUiBNZW51c1xuICAgICAgICAgICAgaWYgKGRhdGEuaXZyTWVudXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdpdnInLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRJdnJNZW51cywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaXZyTWVudXMsXG4gICAgICAgICAgICAgICAgICAgICdzaXRlbWFwIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgICAgICAgICAgaWYgKGRhdGEuY29uZmVyZW5jZVJvb21zID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY29uZmVyZW5jZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDb25mZXJlbmNlUm9vbXMsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbmZlcmVuY2VSb29tcyxcbiAgICAgICAgICAgICAgICAgICAgJ3ZpZGVvIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGlhbHBsYW4gYXBwbGljYXRpb25zXG4gICAgICAgICAgICBpZiAoZGF0YS5kaWFscGxhbkFwcGxpY2F0aW9ucyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2RpYWxwbGFuJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0RGlhbHBsYW5BcHBsaWNhdGlvbnMsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmRpYWxwbGFuQXBwbGljYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICAnY29kZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvdW5kIGZpbGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jdXN0b21Tb3VuZEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnc291bmRzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0U291bmRGaWxlcywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VzdG9tU291bmRGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ211c2ljIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTU9IIChNdXNpYyBPbiBIb2xkKSBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEubW9oRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdtb2gnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRNb2hGaWxlcywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9oRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICd2b2x1bWUgdXAgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSb3V0ZXNcbiAgICAgICAgICAgIGNvbnN0IHRvdGFsUm91dGVzID0gKGRhdGEuaW5jb21pbmdSb3V0ZXMgfHwgMCkgKyAoZGF0YS5vdXRnb2luZ1JvdXRlcyB8fCAwKTtcbiAgICAgICAgICAgIGlmICh0b3RhbFJvdXRlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3JvdXRlcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFJvdXRlcywgXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUm91dGVzLFxuICAgICAgICAgICAgICAgICAgICAncmFuZG9tIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlyZXdhbGwgcnVsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmZpcmV3YWxsUnVsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdmaXJld2FsbCcsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEZpcmV3YWxsUnVsZXMsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmZpcmV3YWxsUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgICdzaGllbGQgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNb2R1bGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5tb2R1bGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9kdWxlcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdE1vZHVsZXMsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLm1vZHVsZXMsXG4gICAgICAgICAgICAgICAgICAgICdwdXp6bGUgcGllY2UgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIGhpc3RvcnlcbiAgICAgICAgICAgIGlmIChkYXRhLmNhbGxIaXN0b3J5ID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY2RyJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0Q2FsbEhpc3RvcnksIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxIaXN0b3J5LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICdoaXN0b3J5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCByZWNvcmRpbmdzXG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsUmVjb3JkaW5ncyA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplU3RyID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmZvcm1hdEJ5dGVzKGRhdGEuY2FsbFJlY29yZGluZ3NTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncmVjb3JkaW5ncycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxSZWNvcmRpbmdzLCBcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5jYWxsUmVjb3JkaW5ncy50b0xvY2FsZVN0cmluZygpfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnbWljcm9waG9uZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEJhY2t1cHNcbiAgICAgICAgICAgIGlmIChkYXRhLmJhY2t1cHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVN0ciA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5mb3JtYXRCeXRlcyhkYXRhLmJhY2t1cHNTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYmFja3VwcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEJhY2t1cHMsIFxuICAgICAgICAgICAgICAgICAgICBgJHtkYXRhLmJhY2t1cHN9ICgke3NpemVTdHJ9KWAsXG4gICAgICAgICAgICAgICAgICAgICdhcmNoaXZlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3VzdG9tIGZpbGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jdXN0b21GaWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2N1c3RvbScsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEN1c3RvbUZpbGVzLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jdXN0b21GaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbGUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBubyBkYXRhIHdpbGwgYmUgZGVsZXRlZFxuICAgICAgICAgICAgaWYgKHN0YXRpc3RpY3NIdG1sID09PSAnJykge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Ob0RhdGFUb0RlbGV0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgbW9kYWwgY29udGVudFxuICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoc3RhdGlzdGljc0h0bWwpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHN0YXRpc3RpYyBpdGVtIEhUTUxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBJdGVtIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBEaXNwbGF5IGxhYmVsXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSB2YWx1ZSAtIERpc3BsYXkgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWNvbiAtIEljb24gY2xhc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZVN0YXRpc3RpY0l0ZW0oaWQsIGxhYmVsLCB2YWx1ZSwgaWNvbikge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29ufVwiPjwvaT4gJHtsYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3ZhbHVlfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGJ5dGVzIHRvIGh1bWFuIHJlYWRhYmxlIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIEJ5dGVzIHRvIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWNpbWFscyAtIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRCeXRlcyhieXRlcywgZGVjaW1hbHMgPSAyKSB7XG4gICAgICAgIGlmIChieXRlcyA9PT0gMCkgcmV0dXJuICcwIEInO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgayA9IDEwMjQ7XG4gICAgICAgIGNvbnN0IGRtID0gZGVjaW1hbHMgPCAwID8gMCA6IGRlY2ltYWxzO1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coaykpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGJ5dGVzIC8gTWF0aC5wb3coaywgaSkpLnRvRml4ZWQoZG0pKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBkZWxldGluZyBwcm9ncmVzcyBpbiBtb2RhbFxuICAgICAqL1xuICAgIHNob3dEZWxldGluZ1Byb2dyZXNzKCkge1xuICAgICAgICBjb25zdCAkY29udGVudCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmNvbnRlbnQnKTtcbiAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGFjdGlvbiBidXR0b25zXG4gICAgICAgICRhY3Rpb25zLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkY29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxhcmdlIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfRGVsZXRpbmdBbGxTZXR0aW5nc308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZGVsZXRlIHByb2dyZXNzIGV2ZW50cyBmcm9tIFdlYlNvY2tldFxuICAgICAqL1xuICAgIHByb2Nlc3NEZWxldGVQcm9ncmVzcyhyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHM7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGRpc3BsYXlcbiAgICAgICAgbGV0IHByb2dyZXNzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHByb2dyZXNzXCIgZGF0YS1wZXJjZW50PVwiJHtzdGFnZURldGFpbHMucHJvZ3Jlc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPiR7c3RhZ2VEZXRhaWxzLnByb2dyZXNzfSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7c3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXkgPyBnbG9iYWxUcmFuc2xhdGVbc3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXldIDogc3RhZ2VEZXRhaWxzLm1lc3NhZ2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRjb250ZW50Lmh0bWwocHJvZ3Jlc3NIdG1sKTtcbiAgICAgICAgJCgnLnVpLnByb2dyZXNzJykucHJvZ3Jlc3MoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBmaW5hbCBzdGFnZVxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdEZWxldGVBbGxfU3RhZ2VfRmluYWwnICYmIHN0YWdlRGV0YWlscy5wcm9ncmVzcyA9PT0gMTAwKSB7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENsb3NlIG1vZGFsXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxTZXR0aW5nc0RlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHJlZGlyZWN0IC0gc3lzdGVtIHdpbGwgcmVzdGFydFxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzIHx8IFsnVW5rbm93biBlcnJvciddKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcbiAgICAgICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiBubyByZXN1bHQgcHJvcGVydHksIGp1c3QgdXBkYXRlIHByb2dyZXNzXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSByZXN0YXJ0IHN0YWdlXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0RlbGV0ZUFsbF9TdGFnZV9SZXN0YXJ0JyAmJiBzdGFnZURldGFpbHMucmVzdGFydCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gSnVzdCBzaG93IGluZm8gbWVzc2FnZSwgRXZlbnRCdXMgd2lsbCBoYW5kbGUgdGhlIGRpc2Nvbm5lY3Rpb24gVUlcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihnbG9iYWxUcmFuc2xhdGUuZ3NfU3lzdGVtV2lsbFJlc3RhcnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVzcG9uc2UgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MgKHVwZGF0ZWQgZm9yIGFzeW5jKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXG4gICAgICovXG4gICAgY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gRXJyb3Igb2NjdXJyZWRcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgIGNvbnN0ICRhY3Rpb25zID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuYWN0aW9ucycpO1xuICAgICAgICAgICAgJGFjdGlvbnMuc2hvdygpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VjY2VzcyBjYXNlIHdpbGwgYmUgaGFuZGxlZCBieSBXZWJTb2NrZXQgZXZlbnRzXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IHdhdGNoZXIgdG8gbW9uaXRvciBkZWxldGUgcGhyYXNlIGlucHV0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0V2F0Y2hlcigpIHtcbiAgICAgICAgY29uc3QgJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxCdXR0b25UZXh0ID0gJHN1Ym1pdEJ1dHRvbi50ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYXRjaCBmb3IgaW5wdXQgY2hhbmdlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0Lm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRWYWx1ZSA9ICQodGhpcykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgZW50ZXJlZCBwaHJhc2UgbWF0Y2hlc1xuICAgICAgICAgICAgaWYgKGlucHV0VmFsdWUgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgICAgIC8vIENoYW5nZSBidXR0b24gdGV4dCB0byBpbmRpY2F0ZSBkZWxldGlvbiBhY3Rpb25cbiAgICAgICAgICAgICAgICAkc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncG9zaXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZ2F0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwidHJhc2ggaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZ3NfQnRuRGVsZXRlQWxsfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ25lZ2F0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdwb3NpdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtvcmlnaW5hbEJ1dHRvblRleHR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZSgpO1xufSk7Il19