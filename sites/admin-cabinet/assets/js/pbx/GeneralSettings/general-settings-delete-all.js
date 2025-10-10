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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiU3lzdGVtQVBJIiwicmVzdG9yZURlZmF1bHQiLCJjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsIm9uRGVueSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNoZWNrRGVsZXRlQ29uZGl0aW9ucyIsImRlbGV0ZUFsbElucHV0IiwidmFsIiwidHJpbSIsImdsb2JhbFRyYW5zbGF0ZSIsImdzX0VudGVyRGVsZXRlQWxsUGhyYXNlIiwic2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsIiwiaHRtbCIsImdzX0xvYWRpbmdTdGF0aXN0aWNzIiwiZ2V0RGVsZXRlU3RhdGlzdGljcyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyIsInN0YXRpc3RpY3NIdG1sIiwidXNlcnMiLCJjcmVhdGVTdGF0aXN0aWNJdGVtIiwiZ3NfU3RhdFVzZXJzIiwiZXh0ZW5zaW9ucyIsInByb3ZpZGVycyIsImdzX1N0YXRQcm92aWRlcnMiLCJjYWxsUXVldWVzIiwiZ3NfU3RhdENhbGxRdWV1ZXMiLCJpdnJNZW51cyIsImdzX1N0YXRJdnJNZW51cyIsImNvbmZlcmVuY2VSb29tcyIsImdzX1N0YXRDb25mZXJlbmNlUm9vbXMiLCJkaWFscGxhbkFwcGxpY2F0aW9ucyIsImdzX1N0YXREaWFscGxhbkFwcGxpY2F0aW9ucyIsImN1c3RvbVNvdW5kRmlsZXMiLCJnc19TdGF0U291bmRGaWxlcyIsIm1vaEZpbGVzIiwiZ3NfU3RhdE1vaEZpbGVzIiwidG90YWxSb3V0ZXMiLCJpbmNvbWluZ1JvdXRlcyIsIm91dGdvaW5nUm91dGVzIiwiZ3NfU3RhdFJvdXRlcyIsImZpcmV3YWxsUnVsZXMiLCJnc19TdGF0RmlyZXdhbGxSdWxlcyIsIm1vZHVsZXMiLCJnc19TdGF0TW9kdWxlcyIsImNhbGxIaXN0b3J5IiwiZ3NfU3RhdENhbGxIaXN0b3J5IiwidG9Mb2NhbGVTdHJpbmciLCJjYWxsUmVjb3JkaW5ncyIsInNpemVTdHIiLCJmb3JtYXRCeXRlcyIsImNhbGxSZWNvcmRpbmdzU2l6ZSIsImdzX1N0YXRDYWxsUmVjb3JkaW5ncyIsImJhY2t1cHMiLCJiYWNrdXBzU2l6ZSIsImdzX1N0YXRCYWNrdXBzIiwiY3VzdG9tRmlsZXMiLCJnc19TdGF0Q3VzdG9tRmlsZXMiLCJnc19Ob0RhdGFUb0RlbGV0ZSIsImlkIiwibGFiZWwiLCJ2YWx1ZSIsImljb24iLCJieXRlcyIsImRlY2ltYWxzIiwiayIsImRtIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCIkY29udGVudCIsImZpbmQiLCIkYWN0aW9ucyIsImhpZGUiLCJnc19EZWxldGluZ0FsbFNldHRpbmdzIiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCJwcm9ncmVzc0h0bWwiLCJwcm9ncmVzcyIsIm1lc3NhZ2VLZXkiLCJtZXNzYWdlIiwiVXNlck1lc3NhZ2UiLCJzaG93SW5mb3JtYXRpb24iLCJnc19BbGxTZXR0aW5nc0RlbGV0ZWQiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3ciLCJyZXN0YXJ0IiwiZ3NfU3lzdGVtV2lsbFJlc3RhcnQiLCIkc3VibWl0QnV0dG9uIiwib3JpZ2luYWxCdXR0b25UZXh0IiwidGV4dCIsIm9uIiwiaW5wdXRWYWx1ZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJnc19CdG5EZWxldGVBbGwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx3QkFBd0IsR0FBRztBQUU3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsZUFBZSxFQUFFLElBTFk7QUFNN0JDLEVBQUFBLGtCQUFrQixFQUFFLElBTlM7QUFPN0JDLEVBQUFBLGVBQWUsRUFBRSxJQVBZOztBQVM3QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBWmE7O0FBYzdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQWpCNkIsd0JBaUJoQjtBQUNUO0FBQ0FMLElBQUFBLHdCQUF3QixDQUFDSSxjQUF6Qix3QkFBd0RFLElBQUksQ0FBQ0MsR0FBTCxFQUF4RCxFQUZTLENBSVQ7O0FBQ0FDLElBQUFBLFFBQVEsQ0FBQ0MsU0FBVCxDQUFtQlQsd0JBQXdCLENBQUNJLGNBQTVDLEVBQTRELFVBQUFNLElBQUksRUFBSTtBQUNoRVYsTUFBQUEsd0JBQXdCLENBQUNXLHFCQUF6QixDQUErQ0QsSUFBL0M7QUFDSCxLQUZELEVBTFMsQ0FTVDs7QUFDQVYsSUFBQUEsd0JBQXdCLENBQUNDLGVBQXpCLEdBQTJDVyxDQUFDLENBQUMsbUJBQUQsQ0FBNUM7QUFDQVosSUFBQUEsd0JBQXdCLENBQUNFLGtCQUF6QixHQUE4Q1UsQ0FBQyxDQUFDLDRCQUFELENBQS9DO0FBQ0FaLElBQUFBLHdCQUF3QixDQUFDRyxlQUF6QixHQUEyQ1MsQ0FBQyxDQUFDLDhCQUFELENBQTVDLENBWlMsQ0FjVDs7QUFDQVosSUFBQUEsd0JBQXdC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RUtDLFFBRkwsQ0FFYyxVQUZkLEVBR0t4RixJQUhMLHVDQUd1Q21GLGtCQUh2QztBQUlIO0FBQ0osS0FqQkQ7QUFrQkg7QUF4YzRCLENBQWpDLEMsQ0EyY0E7O0FBQ0ExRyxDQUFDLENBQUNpSCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUgsRUFBQUEsd0JBQXdCLENBQUNLLFVBQXpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIEV2ZW50QnVzLCBGb3JtLCBTeXN0ZW1BUEkgKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIGhhbmRsaW5nIHRoZSBcIkRlbGV0ZSBBbGwgU2V0dGluZ3NcIiBmdW5jdGlvbmFsaXR5XG4gKiBNYW5hZ2VzIHRoZSBjb25maXJtYXRpb24gbW9kYWwgYW5kIHN0YXRpc3RpY3MgZGlzcGxheVxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgLSB3aWxsIGJlIGluaXRpYWxpemVkIGluIGluaXRpYWxpemUoKVxuICAgICAqL1xuICAgICRkZWxldGVBbGxNb2RhbDogbnVsbCxcbiAgICAkc3RhdGlzdGljc0NvbnRlbnQ6IG51bGwsXG4gICAgJGRlbGV0ZUFsbElucHV0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFzeW5jIGNoYW5uZWwgSUQgZm9yIFdlYlNvY2tldCBldmVudHNcbiAgICAgKi9cbiAgICBhc3luY0NoYW5uZWxJZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgY2hhbm5lbCBJRCBmb3IgdGhpcyBzZXNzaW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCA9IGBkZWxldGUtYWxsLSR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIFdlYlNvY2tldCBldmVudHNcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCwgZGF0YSA9PiB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwucHJvY2Vzc0RlbGV0ZVByb2dyZXNzKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IG9iamVjdHMgd2hlbiBET00gaXMgcmVhZHlcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCA9ICQoJyNkZWxldGUtYWxsLW1vZGFsJyk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kc3RhdGlzdGljc0NvbnRlbnQgPSAkKCcjZGVsZXRlLXN0YXRpc3RpY3MtY29udGVudCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0ID0gJCgnaW5wdXRbbmFtZT1cImRlbGV0ZUFsbElucHV0XCJdJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1vZGFsIHNldHRpbmdzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplTW9kYWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFdhdGNoIGZvciBpbnB1dCBjaGFuZ2VzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplSW5wdXRXYXRjaGVyKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBkZWxldGUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1vZGFsKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCAmJiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvblNob3c6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBzdGF0aXN0aWNzIHdoZW4gbW9kYWwgaXMgc2hvd25cbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIGluIG1vZGFsXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5zaG93RGVsZXRpbmdQcm9ncmVzcygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1c2VyIGNvbmZpcm1zIGRlbGV0aW9uIC0gcGFzcyBhc3luYyBjaGFubmVsIElEXG4gICAgICAgICAgICAgICAgICAgIFN5c3RlbUFQSS5yZXN0b3JlRGVmYXVsdChnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIGZhbHNlIHRvIHByZXZlbnQgYXV0b21hdGljIG1vZGFsIGNsb3NpbmdcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdXNlciBjYW5jZWxzIC0gbWFyayBmb3JtIGFzIGNoYW5nZWQgdG8ga2VlcCBzYXZlIGJ1dHRvbiBhY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aGUgZGVsZXRlIHBocmFzZSB3YXMgZW50ZXJlZCBjb3JyZWN0bHkgYW5kIHNob3cgbW9kYWxcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIHBocmFzZSBtYXRjaGVzLCBmYWxzZSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBjaGVja0RlbGV0ZUNvbmRpdGlvbnMoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdmFsdWUgb2YgJ2RlbGV0ZUFsbElucHV0JyBmaWVsZCBhbmQgdHJpbSBzcGFjZXNcbiAgICAgICAgY29uc3QgZGVsZXRlQWxsSW5wdXQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0LnZhbCgpLnRyaW0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzIHRoZSByZXF1aXJlZCBwaHJhc2VcbiAgICAgICAgaWYgKGRlbGV0ZUFsbElucHV0ID09PSBnbG9iYWxUcmFuc2xhdGUuZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5zaG93RGVsZXRlQ29uZmlybWF0aW9uTW9kYWwoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHRoZSBkZWxldGUgY29uZmlybWF0aW9uIG1vZGFsIHdpdGggc3RhdGlzdGljc1xuICAgICAqL1xuICAgIHNob3dEZWxldGVDb25maXJtYXRpb25Nb2RhbCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgJiYgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgYW5kIGRpc3BsYXkgZGVsZXRpb24gc3RhdGlzdGljcyBpbiB0aGUgbW9kYWxcbiAgICAgKi9cbiAgICBsb2FkRGVsZXRlU3RhdGlzdGljcygpIHtcbiAgICAgICAgY29uc3QgJHN0YXRpc3RpY3NDb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRzdGF0aXN0aWNzQ29udGVudDtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgY2VudGVyZWQgaW5saW5lIGxvYWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19Mb2FkaW5nU3RhdGlzdGljc308L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgc3RhdGlzdGljcyBmcm9tIEFQSVxuICAgICAgICBTeXN0ZW1BUEkuZ2V0RGVsZXRlU3RhdGlzdGljcygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBBUEkgZXJyb3JzXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8IHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIHN0YXRpc3RpY3MgY291bGRuJ3QgYmUgbG9hZGVkXG4gICAgICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljc31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgZGF0YSBmcm9tIHJlc3BvbnNlXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YSB8fCB7fTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgc3RhdGlzdGljcyBIVE1MXG4gICAgICAgICAgICBsZXQgc3RhdGlzdGljc0h0bWwgPSAnJztcblxuICAgICAgICAgICAgLy8gVXNlcnMgYW5kIGV4dGVuc2lvbnNcbiAgICAgICAgICAgIGlmIChkYXRhLnVzZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAndXNlcnMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFVzZXJzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmV4dGVuc2lvbnMgfHwgZGF0YS51c2VycyxcbiAgICAgICAgICAgICAgICAgICAgJ3VzZXIgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQcm92aWRlcnNcbiAgICAgICAgICAgIGlmIChkYXRhLnByb3ZpZGVycyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3Byb3ZpZGVycycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0UHJvdmlkZXJzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLnByb3ZpZGVycyxcbiAgICAgICAgICAgICAgICAgICAgJ3NlcnZlciBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGwgcXVldWVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsUXVldWVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncXVldWVzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsUXVldWVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxRdWV1ZXMsXG4gICAgICAgICAgICAgICAgICAgICd1c2VycyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElWUiBNZW51c1xuICAgICAgICAgICAgaWYgKGRhdGEuaXZyTWVudXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdpdnInLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEl2ck1lbnVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLml2ck1lbnVzLFxuICAgICAgICAgICAgICAgICAgICAnc2l0ZW1hcCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENvbmZlcmVuY2Ugcm9vbXNcbiAgICAgICAgICAgIGlmIChkYXRhLmNvbmZlcmVuY2VSb29tcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2NvbmZlcmVuY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDb25mZXJlbmNlUm9vbXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY29uZmVyZW5jZVJvb21zLFxuICAgICAgICAgICAgICAgICAgICAndmlkZW8gaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaWFscGxhbiBhcHBsaWNhdGlvbnNcbiAgICAgICAgICAgIGlmIChkYXRhLmRpYWxwbGFuQXBwbGljYXRpb25zID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnZGlhbHBsYW4nLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdERpYWxwbGFuQXBwbGljYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmRpYWxwbGFuQXBwbGljYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICAnY29kZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNvdW5kIGZpbGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jdXN0b21Tb3VuZEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnc291bmRzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRTb3VuZEZpbGVzLFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmN1c3RvbVNvdW5kRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICdtdXNpYyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1PSCAoTXVzaWMgT24gSG9sZCkgZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLm1vaEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9oJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRNb2hGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2hGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3ZvbHVtZSB1cCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJvdXRlc1xuICAgICAgICAgICAgY29uc3QgdG90YWxSb3V0ZXMgPSAoZGF0YS5pbmNvbWluZ1JvdXRlcyB8fCAwKSArIChkYXRhLm91dGdvaW5nUm91dGVzIHx8IDApO1xuICAgICAgICAgICAgaWYgKHRvdGFsUm91dGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncm91dGVzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRSb3V0ZXMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUm91dGVzLFxuICAgICAgICAgICAgICAgICAgICAncmFuZG9tIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmlyZXdhbGwgcnVsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmZpcmV3YWxsUnVsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdmaXJld2FsbCcsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0RmlyZXdhbGxSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5maXJld2FsbFJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICAnc2hpZWxkIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW9kdWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEubW9kdWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ21vZHVsZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdE1vZHVsZXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3B1enpsZSBwaWVjZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENhbGwgaGlzdG9yeVxuICAgICAgICAgICAgaWYgKGRhdGEuY2FsbEhpc3RvcnkgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjZHInLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxIaXN0b3J5LFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxIaXN0b3J5LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICdoaXN0b3J5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2FsbCByZWNvcmRpbmdzXG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsUmVjb3JkaW5ncyA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplU3RyID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmZvcm1hdEJ5dGVzKGRhdGEuY2FsbFJlY29yZGluZ3NTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncmVjb3JkaW5ncycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0Q2FsbFJlY29yZGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIGAke2RhdGEuY2FsbFJlY29yZGluZ3MudG9Mb2NhbGVTdHJpbmcoKX0gKCR7c2l6ZVN0cn0pYCxcbiAgICAgICAgICAgICAgICAgICAgJ21pY3JvcGhvbmUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCYWNrdXBzXG4gICAgICAgICAgICBpZiAoZGF0YS5iYWNrdXBzID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVTdHIgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuZm9ybWF0Qnl0ZXMoZGF0YS5iYWNrdXBzU2l6ZSB8fCAwKTtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2JhY2t1cHMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEJhY2t1cHMsXG4gICAgICAgICAgICAgICAgICAgIGAke2RhdGEuYmFja3Vwc30gKCR7c2l6ZVN0cn0pYCxcbiAgICAgICAgICAgICAgICAgICAgJ2FyY2hpdmUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmN1c3RvbUZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY3VzdG9tJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDdXN0b21GaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jdXN0b21GaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbGUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiBubyBkYXRhIHdpbGwgYmUgZGVsZXRlZFxuICAgICAgICAgICAgaWYgKHN0YXRpc3RpY3NIdG1sID09PSAnJykge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Ob0RhdGFUb0RlbGV0ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbW9kYWwgY29udGVudFxuICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoc3RhdGlzdGljc0h0bWwpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHN0YXRpc3RpYyBpdGVtIEhUTUxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBJdGVtIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBEaXNwbGF5IGxhYmVsXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSB2YWx1ZSAtIERpc3BsYXkgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWNvbiAtIEljb24gY2xhc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZVN0YXRpc3RpY0l0ZW0oaWQsIGxhYmVsLCB2YWx1ZSwgaWNvbikge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29ufVwiPjwvaT4gJHtsYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3ZhbHVlfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGJ5dGVzIHRvIGh1bWFuIHJlYWRhYmxlIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIEJ5dGVzIHRvIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWNpbWFscyAtIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRCeXRlcyhieXRlcywgZGVjaW1hbHMgPSAyKSB7XG4gICAgICAgIGlmIChieXRlcyA9PT0gMCkgcmV0dXJuICcwIEInO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgayA9IDEwMjQ7XG4gICAgICAgIGNvbnN0IGRtID0gZGVjaW1hbHMgPCAwID8gMCA6IGRlY2ltYWxzO1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coaykpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGJ5dGVzIC8gTWF0aC5wb3coaywgaSkpLnRvRml4ZWQoZG0pKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBkZWxldGluZyBwcm9ncmVzcyBpbiBtb2RhbFxuICAgICAqL1xuICAgIHNob3dEZWxldGluZ1Byb2dyZXNzKCkge1xuICAgICAgICBjb25zdCAkY29udGVudCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmNvbnRlbnQnKTtcbiAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGFjdGlvbiBidXR0b25zXG4gICAgICAgICRhY3Rpb25zLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkY29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxhcmdlIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfRGVsZXRpbmdBbGxTZXR0aW5nc308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZGVsZXRlIHByb2dyZXNzIGV2ZW50cyBmcm9tIFdlYlNvY2tldFxuICAgICAqL1xuICAgIHByb2Nlc3NEZWxldGVQcm9ncmVzcyhyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHM7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGRpc3BsYXlcbiAgICAgICAgbGV0IHByb2dyZXNzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHByb2dyZXNzXCIgZGF0YS1wZXJjZW50PVwiJHtzdGFnZURldGFpbHMucHJvZ3Jlc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPiR7c3RhZ2VEZXRhaWxzLnByb2dyZXNzfSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7c3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXkgPyBnbG9iYWxUcmFuc2xhdGVbc3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXldIDogc3RhZ2VEZXRhaWxzLm1lc3NhZ2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRjb250ZW50Lmh0bWwocHJvZ3Jlc3NIdG1sKTtcbiAgICAgICAgJCgnLnVpLnByb2dyZXNzJykucHJvZ3Jlc3MoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBmaW5hbCBzdGFnZVxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdEZWxldGVBbGxfU3RhZ2VfRmluYWwnICYmIHN0YWdlRGV0YWlscy5wcm9ncmVzcyA9PT0gMTAwKSB7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENsb3NlIG1vZGFsXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxTZXR0aW5nc0RlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHJlZGlyZWN0IC0gc3lzdGVtIHdpbGwgcmVzdGFydFxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzIHx8IFsnVW5rbm93biBlcnJvciddKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcbiAgICAgICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiBubyByZXN1bHQgcHJvcGVydHksIGp1c3QgdXBkYXRlIHByb2dyZXNzXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSByZXN0YXJ0IHN0YWdlXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0RlbGV0ZUFsbF9TdGFnZV9SZXN0YXJ0JyAmJiBzdGFnZURldGFpbHMucmVzdGFydCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gSnVzdCBzaG93IGluZm8gbWVzc2FnZSwgRXZlbnRCdXMgd2lsbCBoYW5kbGUgdGhlIGRpc2Nvbm5lY3Rpb24gVUlcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihnbG9iYWxUcmFuc2xhdGUuZ3NfU3lzdGVtV2lsbFJlc3RhcnQpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVzcG9uc2UgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MgKHVwZGF0ZWQgZm9yIGFzeW5jKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXG4gICAgICovXG4gICAgY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gRXJyb3Igb2NjdXJyZWRcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgIGNvbnN0ICRhY3Rpb25zID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuYWN0aW9ucycpO1xuICAgICAgICAgICAgJGFjdGlvbnMuc2hvdygpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VjY2VzcyBjYXNlIHdpbGwgYmUgaGFuZGxlZCBieSBXZWJTb2NrZXQgZXZlbnRzXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IHdhdGNoZXIgdG8gbW9uaXRvciBkZWxldGUgcGhyYXNlIGlucHV0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0V2F0Y2hlcigpIHtcbiAgICAgICAgY29uc3QgJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxCdXR0b25UZXh0ID0gJHN1Ym1pdEJ1dHRvbi50ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYXRjaCBmb3IgaW5wdXQgY2hhbmdlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0Lm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRWYWx1ZSA9ICQodGhpcykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgZW50ZXJlZCBwaHJhc2UgbWF0Y2hlc1xuICAgICAgICAgICAgaWYgKGlucHV0VmFsdWUgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgICAgIC8vIENoYW5nZSBidXR0b24gdGV4dCB0byBpbmRpY2F0ZSBkZWxldGlvbiBhY3Rpb25cbiAgICAgICAgICAgICAgICAkc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncG9zaXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZ2F0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwidHJhc2ggaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZ3NfQnRuRGVsZXRlQWxsfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ25lZ2F0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdwb3NpdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtvcmlnaW5hbEJ1dHRvblRleHR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZSgpO1xufSk7Il19