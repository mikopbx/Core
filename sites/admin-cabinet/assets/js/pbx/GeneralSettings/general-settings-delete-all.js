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

/* global globalRootUrl, globalTranslate, PbxApi, UserMessage, EventBus, Form */

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

          PbxApi.SystemRestoreDefaultSettings(generalSettingsDeleteAll.asyncChannelId, generalSettingsDeleteAll.cbAfterRestoreDefaultSettings); // Return false to prevent automatic modal closing

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

    $statisticsContent.html("\n            <div class=\"ui segment\">\n                <div class=\"ui active centered inline loader\"></div>\n                <p class=\"center aligned\">".concat(globalTranslate.gs_LoadingStatistics || 'Loading statistics...', "</p>\n            </div>\n        ")); // Get statistics from API

    PbxApi.SystemGetDeleteStatistics(function (data) {
      if (data === false) {
        // Show error if statistics couldn't be loaded
        $statisticsContent.html("\n                    <div class=\"ui segment\">\n                        <div class=\"ui error message\">\n                            <i class=\"exclamation triangle icon\"></i>\n                            ".concat(globalTranslate.gs_ErrorLoadingStatistics || 'Error loading statistics', "\n                        </div>\n                    </div>\n                "));
        return;
      } // Build statistics HTML


      var statisticsHtml = ''; // Users and extensions

      if (data.users > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('users', globalTranslate.gs_StatUsers || 'Users/Extensions', data.extensions || data.users, 'user icon');
      } // Providers


      if (data.providers > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('providers', globalTranslate.gs_StatProviders || 'SIP Providers', data.providers, 'server icon');
      } // Call queues


      if (data.callQueues > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('queues', globalTranslate.gs_StatCallQueues || 'Call Queues', data.callQueues, 'users icon');
      } // IVR Menus


      if (data.ivrMenus > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('ivr', globalTranslate.gs_StatIvrMenus || 'IVR Menus', data.ivrMenus, 'sitemap icon');
      } // Conference rooms


      if (data.conferenceRooms > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('conferences', globalTranslate.gs_StatConferenceRooms || 'Conference Rooms', data.conferenceRooms, 'video icon');
      } // Dialplan applications


      if (data.dialplanApplications > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('dialplan', globalTranslate.gs_StatDialplanApplications || 'Dialplan Applications', data.dialplanApplications, 'code icon');
      } // Sound files


      if (data.customSoundFiles > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('sounds', globalTranslate.gs_StatSoundFiles || 'Custom Sound Files', data.customSoundFiles, 'music icon');
      } // Routes


      var totalRoutes = (data.incomingRoutes || 0) + (data.outgoingRoutes || 0);

      if (totalRoutes > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('routes', globalTranslate.gs_StatRoutes || 'Call Routes', totalRoutes, 'random icon');
      } // Firewall rules


      if (data.firewallRules > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('firewall', globalTranslate.gs_StatFirewallRules || 'Firewall Rules', data.firewallRules, 'shield icon');
      } // Modules


      if (data.modules > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('modules', globalTranslate.gs_StatModules || 'Installed Modules', data.modules, 'puzzle piece icon');
      } // Call history


      if (data.callHistory > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('cdr', globalTranslate.gs_StatCallHistory || 'Call History Records', data.callHistory.toLocaleString(), 'history icon');
      } // Call recordings


      if (data.callRecordings > 0) {
        var sizeStr = generalSettingsDeleteAll.formatBytes(data.callRecordingsSize || 0);
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('recordings', globalTranslate.gs_StatCallRecordings || 'Call Recordings', "".concat(data.callRecordings.toLocaleString(), " (").concat(sizeStr, ")"), 'microphone icon');
      } // Backups


      if (data.backups > 0) {
        var _sizeStr = generalSettingsDeleteAll.formatBytes(data.backupsSize || 0);

        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('backups', globalTranslate.gs_StatBackups || 'Backup Files', "".concat(data.backups, " (").concat(_sizeStr, ")"), 'archive icon');
      } // Custom files


      if (data.customFiles > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('custom', globalTranslate.gs_StatCustomFiles || 'Custom Files', data.customFiles, 'file icon');
      } // If no data will be deleted


      if (statisticsHtml === '') {
        statisticsHtml = "\n                    <div class=\"ui segment\">\n                        <div class=\"ui info message\">\n                            <i class=\"info circle icon\"></i>\n                            ".concat(globalTranslate.gs_NoDataToDelete || 'No data to delete', "\n                        </div>\n                    </div>\n                ");
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

    $content.html("\n            <div class=\"ui segment\">\n                <div class=\"ui active inverted dimmer\">\n                    <div class=\"ui large text loader\">".concat(globalTranslate.gs_DeletingAllSettings || 'Deleting all settings...', "</div>\n                </div>\n                <p>&nbsp;</p>\n                <p>&nbsp;</p>\n                <p>&nbsp;</p>\n            </div>\n        "));
  },

  /**
   * Process delete progress events from WebSocket
   */
  processDeleteProgress: function processDeleteProgress(response) {
    var stage = response.stage;
    var stageDetails = response.stageDetails;
    var $content = generalSettingsDeleteAll.$deleteAllModal.find('.content'); // Update progress display

    var progressHtml = "\n            <div class=\"ui segment\">\n                <div class=\"ui progress\" data-percent=\"".concat(stageDetails.progress, "\">\n                    <div class=\"bar\">\n                        <div class=\"progress\">").concat(stageDetails.progress, "%</div>\n                    </div>\n                    <div class=\"label\">").concat(stageDetails.message, "</div>\n                </div>\n            </div>\n        ");
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
      UserMessage.showInformation(globalTranslate.gs_SystemWillRestart || 'System will restart in a few seconds...');
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
        $submitButton.removeClass('positive').addClass('negative').html("<i class=\"trash icon\"></i> ".concat(globalTranslate.gs_BtnDeleteAll || 'Delete All Settings'));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiUGJ4QXBpIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsImNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwib25EZW55IiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiZGVsZXRlQWxsSW5wdXQiLCJ2YWwiLCJ0cmltIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UiLCJzaG93RGVsZXRlQ29uZmlybWF0aW9uTW9kYWwiLCJodG1sIiwiZ3NfTG9hZGluZ1N0YXRpc3RpY3MiLCJTeXN0ZW1HZXREZWxldGVTdGF0aXN0aWNzIiwiZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyIsInN0YXRpc3RpY3NIdG1sIiwidXNlcnMiLCJjcmVhdGVTdGF0aXN0aWNJdGVtIiwiZ3NfU3RhdFVzZXJzIiwiZXh0ZW5zaW9ucyIsInByb3ZpZGVycyIsImdzX1N0YXRQcm92aWRlcnMiLCJjYWxsUXVldWVzIiwiZ3NfU3RhdENhbGxRdWV1ZXMiLCJpdnJNZW51cyIsImdzX1N0YXRJdnJNZW51cyIsImNvbmZlcmVuY2VSb29tcyIsImdzX1N0YXRDb25mZXJlbmNlUm9vbXMiLCJkaWFscGxhbkFwcGxpY2F0aW9ucyIsImdzX1N0YXREaWFscGxhbkFwcGxpY2F0aW9ucyIsImN1c3RvbVNvdW5kRmlsZXMiLCJnc19TdGF0U291bmRGaWxlcyIsInRvdGFsUm91dGVzIiwiaW5jb21pbmdSb3V0ZXMiLCJvdXRnb2luZ1JvdXRlcyIsImdzX1N0YXRSb3V0ZXMiLCJmaXJld2FsbFJ1bGVzIiwiZ3NfU3RhdEZpcmV3YWxsUnVsZXMiLCJtb2R1bGVzIiwiZ3NfU3RhdE1vZHVsZXMiLCJjYWxsSGlzdG9yeSIsImdzX1N0YXRDYWxsSGlzdG9yeSIsInRvTG9jYWxlU3RyaW5nIiwiY2FsbFJlY29yZGluZ3MiLCJzaXplU3RyIiwiZm9ybWF0Qnl0ZXMiLCJjYWxsUmVjb3JkaW5nc1NpemUiLCJnc19TdGF0Q2FsbFJlY29yZGluZ3MiLCJiYWNrdXBzIiwiYmFja3Vwc1NpemUiLCJnc19TdGF0QmFja3VwcyIsImN1c3RvbUZpbGVzIiwiZ3NfU3RhdEN1c3RvbUZpbGVzIiwiZ3NfTm9EYXRhVG9EZWxldGUiLCJpZCIsImxhYmVsIiwidmFsdWUiLCJpY29uIiwiYnl0ZXMiLCJkZWNpbWFscyIsImsiLCJkbSIsInNpemVzIiwiaSIsIk1hdGgiLCJmbG9vciIsImxvZyIsInBhcnNlRmxvYXQiLCJwb3ciLCJ0b0ZpeGVkIiwiJGNvbnRlbnQiLCJmaW5kIiwiJGFjdGlvbnMiLCJoaWRlIiwiZ3NfRGVsZXRpbmdBbGxTZXR0aW5ncyIsInJlc3BvbnNlIiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCJwcm9ncmVzc0h0bWwiLCJwcm9ncmVzcyIsIm1lc3NhZ2UiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbFNldHRpbmdzRGVsZXRlZCIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwic2hvdyIsInJlc3RhcnQiLCJnc19TeXN0ZW1XaWxsUmVzdGFydCIsIiRzdWJtaXRCdXR0b24iLCJvcmlnaW5hbEJ1dHRvblRleHQiLCJ0ZXh0Iiwib24iLCJpbnB1dFZhbHVlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImdzX0J0bkRlbGV0ZUFsbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHdCQUF3QixHQUFHO0FBRTdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsSUFMWTtBQU03QkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFOUztBQU83QkMsRUFBQUEsZUFBZSxFQUFFLElBUFk7O0FBUzdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUFaYTs7QUFjN0I7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBakI2Qix3QkFpQmhCO0FBQ1Q7QUFDQUwsSUFBQUEsd0JBQXdCLENBQUNJLGNBQXpCLHdCQUF3REUsSUFBSSxDQUFDQyxHQUFMLEVBQXhELEVBRlMsQ0FJVDs7QUFDQUMsSUFBQUEsUUFBUSxDQUFDQyxTQUFULENBQW1CVCx3QkFBd0IsQ0FBQ0ksY0FBNUMsRUFBNEQsVUFBQU0sSUFBSSxFQUFJO0FBQ2hFVixNQUFBQSx3QkFBd0IsQ0FBQ1cscUJBQXpCLENBQStDRCxJQUEvQztBQUNILEtBRkQsRUFMUyxDQVNUOztBQUNBVixJQUFBQSx3QkFBd0IsQ0FBQ0MsZUFBekIsR0FBMkNXLENBQUMsQ0FBQyxtQkFBRCxDQUE1QztBQUNBWixJQUFBQSx3QkFBd0IsQ0FBQ0Usa0JBQXpCLEdBQThDVSxDQUFDLENBQUMsNEJBQUQsQ0FBL0M7QUFDQVosSUFBQUEsd0JBQXdCLENBQUNHLGVBQXpCLEdBQTJDUyxDQUFDLENBQUMsOEJBQUQsQ0FBNUMsQ0FaUyxDQWNUOztBQUNBWixJQUFBQSx3QkFBd0IsQ0FBQ2EsZUFBekIsR0FmUyxDQWlCVDs7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QUMsQ0FBQzhHLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIzSCxFQUFBQSx3QkFBd0IsQ0FBQ0ssVUFBekI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgUGJ4QXBpLCBVc2VyTWVzc2FnZSwgRXZlbnRCdXMsIEZvcm0gKi9cblxuLyoqXG4gKiBNb2R1bGUgZm9yIGhhbmRsaW5nIHRoZSBcIkRlbGV0ZSBBbGwgU2V0dGluZ3NcIiBmdW5jdGlvbmFsaXR5XG4gKiBNYW5hZ2VzIHRoZSBjb25maXJtYXRpb24gbW9kYWwgYW5kIHN0YXRpc3RpY3MgZGlzcGxheVxuICovXG5jb25zdCBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdHMgLSB3aWxsIGJlIGluaXRpYWxpemVkIGluIGluaXRpYWxpemUoKVxuICAgICAqL1xuICAgICRkZWxldGVBbGxNb2RhbDogbnVsbCxcbiAgICAkc3RhdGlzdGljc0NvbnRlbnQ6IG51bGwsXG4gICAgJGRlbGV0ZUFsbElucHV0OiBudWxsLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFzeW5jIGNoYW5uZWwgSUQgZm9yIFdlYlNvY2tldCBldmVudHNcbiAgICAgKi9cbiAgICBhc3luY0NoYW5uZWxJZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgY2hhbm5lbCBJRCBmb3IgdGhpcyBzZXNzaW9uXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCA9IGBkZWxldGUtYWxsLSR7RGF0ZS5ub3coKX1gO1xuICAgICAgICBcbiAgICAgICAgLy8gU3Vic2NyaWJlIHRvIFdlYlNvY2tldCBldmVudHNcbiAgICAgICAgRXZlbnRCdXMuc3Vic2NyaWJlKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCwgZGF0YSA9PiB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwucHJvY2Vzc0RlbGV0ZVByb2dyZXNzKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IG9iamVjdHMgd2hlbiBET00gaXMgcmVhZHlcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCA9ICQoJyNkZWxldGUtYWxsLW1vZGFsJyk7XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kc3RhdGlzdGljc0NvbnRlbnQgPSAkKCcjZGVsZXRlLXN0YXRpc3RpY3MtY29udGVudCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0ID0gJCgnaW5wdXRbbmFtZT1cImRlbGV0ZUFsbElucHV0XCJdJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIG1vZGFsIHNldHRpbmdzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplTW9kYWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFdhdGNoIGZvciBpbnB1dCBjaGFuZ2VzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5pbml0aWFsaXplSW5wdXRXYXRjaGVyKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBkZWxldGUgY29uZmlybWF0aW9uIG1vZGFsXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU1vZGFsKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCAmJiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvblNob3c6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTG9hZCBzdGF0aXN0aWNzIHdoZW4gbW9kYWwgaXMgc2hvd25cbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlIGluIG1vZGFsXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5zaG93RGVsZXRpbmdQcm9ncmVzcygpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1c2VyIGNvbmZpcm1zIGRlbGV0aW9uIC0gcGFzcyBhc3luYyBjaGFubmVsIElEXG4gICAgICAgICAgICAgICAgICAgIFBieEFwaS5TeXN0ZW1SZXN0b3JlRGVmYXVsdFNldHRpbmdzKFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmFzeW5jQ2hhbm5lbElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm4gZmFsc2UgdG8gcHJldmVudCBhdXRvbWF0aWMgbW9kYWwgY2xvc2luZ1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2hlbiB1c2VyIGNhbmNlbHMgLSBtYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBrZWVwIHNhdmUgYnV0dG9uIGFjdGl2ZVxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRoZSBkZWxldGUgcGhyYXNlIHdhcyBlbnRlcmVkIGNvcnJlY3RseSBhbmQgc2hvdyBtb2RhbFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSAtIHRydWUgaWYgcGhyYXNlIG1hdGNoZXMsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGNoZWNrRGVsZXRlQ29uZGl0aW9ucygpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB2YWx1ZSBvZiAnZGVsZXRlQWxsSW5wdXQnIGZpZWxkIGFuZCB0cmltIHNwYWNlc1xuICAgICAgICBjb25zdCBkZWxldGVBbGxJbnB1dCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQudmFsKCkudHJpbSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGVudGVyZWQgcGhyYXNlIG1hdGNoZXMgdGhlIHJlcXVpcmVkIHBocmFzZVxuICAgICAgICBpZiAoZGVsZXRlQWxsSW5wdXQgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnNob3dEZWxldGVDb25maXJtYXRpb25Nb2RhbCgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgdGhlIGRlbGV0ZSBjb25maXJtYXRpb24gbW9kYWwgd2l0aCBzdGF0aXN0aWNzXG4gICAgICovXG4gICAgc2hvd0RlbGV0ZUNvbmZpcm1hdGlvbk1vZGFsKCkge1xuICAgICAgICBpZiAoZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbCAmJiBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBhbmQgZGlzcGxheSBkZWxldGlvbiBzdGF0aXN0aWNzIGluIHRoZSBtb2RhbFxuICAgICAqL1xuICAgIGxvYWREZWxldGVTdGF0aXN0aWNzKCkge1xuICAgICAgICBjb25zdCAkc3RhdGlzdGljc0NvbnRlbnQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJHN0YXRpc3RpY3NDb250ZW50O1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICRzdGF0aXN0aWNzQ29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBjZW50ZXJlZCBpbmxpbmUgbG9hZGVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmdzX0xvYWRpbmdTdGF0aXN0aWNzIHx8ICdMb2FkaW5nIHN0YXRpc3RpY3MuLi4nfTwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBzdGF0aXN0aWNzIGZyb20gQVBJXG4gICAgICAgIFBieEFwaS5TeXN0ZW1HZXREZWxldGVTdGF0aXN0aWNzKChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIHN0YXRpc3RpY3MgY291bGRuJ3QgYmUgbG9hZGVkXG4gICAgICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyB8fCAnRXJyb3IgbG9hZGluZyBzdGF0aXN0aWNzJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEJ1aWxkIHN0YXRpc3RpY3MgSFRNTFxuICAgICAgICAgICAgbGV0IHN0YXRpc3RpY3NIdG1sID0gJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZXJzIGFuZCBleHRlbnNpb25zXG4gICAgICAgICAgICBpZiAoZGF0YS51c2VycyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3VzZXJzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0VXNlcnMgfHwgJ1VzZXJzL0V4dGVuc2lvbnMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5leHRlbnNpb25zIHx8IGRhdGEudXNlcnMsXG4gICAgICAgICAgICAgICAgICAgICd1c2VyIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJvdmlkZXJzXG4gICAgICAgICAgICBpZiAoZGF0YS5wcm92aWRlcnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdwcm92aWRlcnMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRQcm92aWRlcnMgfHwgJ1NJUCBQcm92aWRlcnMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wcm92aWRlcnMsXG4gICAgICAgICAgICAgICAgICAgICdzZXJ2ZXIgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDYWxsIHF1ZXVlc1xuICAgICAgICAgICAgaWYgKGRhdGEuY2FsbFF1ZXVlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3F1ZXVlcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxRdWV1ZXMgfHwgJ0NhbGwgUXVldWVzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY2FsbFF1ZXVlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3VzZXJzIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSVZSIE1lbnVzXG4gICAgICAgICAgICBpZiAoZGF0YS5pdnJNZW51cyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2l2cicsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEl2ck1lbnVzIHx8ICdJVlIgTWVudXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5pdnJNZW51cyxcbiAgICAgICAgICAgICAgICAgICAgJ3NpdGVtYXAgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb25mZXJlbmNlIHJvb21zXG4gICAgICAgICAgICBpZiAoZGF0YS5jb25mZXJlbmNlUm9vbXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjb25mZXJlbmNlcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENvbmZlcmVuY2VSb29tcyB8fCAnQ29uZmVyZW5jZSBSb29tcycsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNvbmZlcmVuY2VSb29tcyxcbiAgICAgICAgICAgICAgICAgICAgJ3ZpZGVvIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGlhbHBsYW4gYXBwbGljYXRpb25zXG4gICAgICAgICAgICBpZiAoZGF0YS5kaWFscGxhbkFwcGxpY2F0aW9ucyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2RpYWxwbGFuJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0RGlhbHBsYW5BcHBsaWNhdGlvbnMgfHwgJ0RpYWxwbGFuIEFwcGxpY2F0aW9ucycsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmRpYWxwbGFuQXBwbGljYXRpb25zLFxuICAgICAgICAgICAgICAgICAgICAnY29kZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNvdW5kIGZpbGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jdXN0b21Tb3VuZEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnc291bmRzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0U291bmRGaWxlcyB8fCAnQ3VzdG9tIFNvdW5kIEZpbGVzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VzdG9tU291bmRGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ211c2ljIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUm91dGVzXG4gICAgICAgICAgICBjb25zdCB0b3RhbFJvdXRlcyA9IChkYXRhLmluY29taW5nUm91dGVzIHx8IDApICsgKGRhdGEub3V0Z29pbmdSb3V0ZXMgfHwgMCk7XG4gICAgICAgICAgICBpZiAodG90YWxSb3V0ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdyb3V0ZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRSb3V0ZXMgfHwgJ0NhbGwgUm91dGVzJywgXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsUm91dGVzLFxuICAgICAgICAgICAgICAgICAgICAncmFuZG9tIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmlyZXdhbGwgcnVsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmZpcmV3YWxsUnVsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdmaXJld2FsbCcsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEZpcmV3YWxsUnVsZXMgfHwgJ0ZpcmV3YWxsIFJ1bGVzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZmlyZXdhbGxSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3NoaWVsZCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1vZHVsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLm1vZHVsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdtb2R1bGVzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0TW9kdWxlcyB8fCAnSW5zdGFsbGVkIE1vZHVsZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2R1bGVzLFxuICAgICAgICAgICAgICAgICAgICAncHV6emxlIHBpZWNlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBoaXN0b3J5XG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsSGlzdG9yeSA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2NkcicsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxIaXN0b3J5IHx8ICdDYWxsIEhpc3RvcnkgUmVjb3JkcycsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxIaXN0b3J5LnRvTG9jYWxlU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICdoaXN0b3J5IGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCByZWNvcmRpbmdzXG4gICAgICAgICAgICBpZiAoZGF0YS5jYWxsUmVjb3JkaW5ncyA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzaXplU3RyID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmZvcm1hdEJ5dGVzKGRhdGEuY2FsbFJlY29yZGluZ3NTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncmVjb3JkaW5ncycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdENhbGxSZWNvcmRpbmdzIHx8ICdDYWxsIFJlY29yZGluZ3MnLCBcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5jYWxsUmVjb3JkaW5ncy50b0xvY2FsZVN0cmluZygpfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnbWljcm9waG9uZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEJhY2t1cHNcbiAgICAgICAgICAgIGlmIChkYXRhLmJhY2t1cHMgPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVN0ciA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5mb3JtYXRCeXRlcyhkYXRhLmJhY2t1cHNTaXplIHx8IDApO1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnYmFja3VwcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEJhY2t1cHMgfHwgJ0JhY2t1cCBGaWxlcycsIFxuICAgICAgICAgICAgICAgICAgICBgJHtkYXRhLmJhY2t1cHN9ICgke3NpemVTdHJ9KWAsXG4gICAgICAgICAgICAgICAgICAgICdhcmNoaXZlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3VzdG9tIGZpbGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5jdXN0b21GaWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2N1c3RvbScsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdEN1c3RvbUZpbGVzIHx8ICdDdXN0b20gRmlsZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jdXN0b21GaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbGUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiBubyBkYXRhIHdpbGwgYmUgZGVsZXRlZFxuICAgICAgICAgICAgaWYgKHN0YXRpc3RpY3NIdG1sID09PSAnJykge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sID0gYFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5nc19Ob0RhdGFUb0RlbGV0ZSB8fCAnTm8gZGF0YSB0byBkZWxldGUnfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBtb2RhbCBjb250ZW50XG4gICAgICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChzdGF0aXN0aWNzSHRtbCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgc3RhdGlzdGljIGl0ZW0gSFRNTFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIEl0ZW0gaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsYWJlbCAtIERpc3BsYXkgbGFiZWxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xudW1iZXJ9IHZhbHVlIC0gRGlzcGxheSB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpY29uIC0gSWNvbiBjbGFzc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nXG4gICAgICovXG4gICAgY3JlYXRlU3RhdGlzdGljSXRlbShpZCwgbGFiZWwsIHZhbHVlLCBpY29uKSB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIGdyaWRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb259XCI+PC9pPiAke2xhYmVsfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8c3Ryb25nPiR7dmFsdWV9PC9zdHJvbmc+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtYXQgYnl0ZXMgdG8gaHVtYW4gcmVhZGFibGUgZm9ybWF0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gQnl0ZXMgdG8gZm9ybWF0XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRlY2ltYWxzIC0gTnVtYmVyIG9mIGRlY2ltYWwgcGxhY2VzXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRm9ybWF0dGVkIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdEJ5dGVzKGJ5dGVzLCBkZWNpbWFscyA9IDIpIHtcbiAgICAgICAgaWYgKGJ5dGVzID09PSAwKSByZXR1cm4gJzAgQic7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBrID0gMTAyNDtcbiAgICAgICAgY29uc3QgZG0gPSBkZWNpbWFscyA8IDAgPyAwIDogZGVjaW1hbHM7XG4gICAgICAgIGNvbnN0IHNpemVzID0gWydCJywgJ0tCJywgJ01CJywgJ0dCJywgJ1RCJ107XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLmxvZyhieXRlcykgLyBNYXRoLmxvZyhrKSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCgoYnl0ZXMgLyBNYXRoLnBvdyhrLCBpKSkudG9GaXhlZChkbSkpICsgJyAnICsgc2l6ZXNbaV07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGRlbGV0aW5nIHByb2dyZXNzIGluIG1vZGFsXG4gICAgICovXG4gICAgc2hvd0RlbGV0aW5nUHJvZ3Jlc3MoKSB7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZGUgYWN0aW9uIGJ1dHRvbnNcbiAgICAgICAgJGFjdGlvbnMuaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICRjb250ZW50Lmh0bWwoYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGludmVydGVkIGRpbW1lclwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgbGFyZ2UgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19EZWxldGluZ0FsbFNldHRpbmdzIHx8ICdEZWxldGluZyBhbGwgc2V0dGluZ3MuLi4nfTwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvY2VzcyBkZWxldGUgcHJvZ3Jlc3MgZXZlbnRzIGZyb20gV2ViU29ja2V0XG4gICAgICovXG4gICAgcHJvY2Vzc0RlbGV0ZVByb2dyZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IHN0YWdlID0gcmVzcG9uc2Uuc3RhZ2U7XG4gICAgICAgIGNvbnN0IHN0YWdlRGV0YWlscyA9IHJlc3BvbnNlLnN0YWdlRGV0YWlscztcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5jb250ZW50Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgZGlzcGxheVxuICAgICAgICBsZXQgcHJvZ3Jlc3NIdG1sID0gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcHJvZ3Jlc3NcIiBkYXRhLXBlcmNlbnQ9XCIke3N0YWdlRGV0YWlscy5wcm9ncmVzc31cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJhclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzXCI+JHtzdGFnZURldGFpbHMucHJvZ3Jlc3N9JTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxhYmVsXCI+JHtzdGFnZURldGFpbHMubWVzc2FnZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgJGNvbnRlbnQuaHRtbChwcm9ncmVzc0h0bWwpO1xuICAgICAgICAkKCcudWkucHJvZ3Jlc3MnKS5wcm9ncmVzcygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGZpbmFsIHN0YWdlXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0RlbGV0ZUFsbF9TdGFnZV9GaW5hbCcgJiYgc3RhZ2VEZXRhaWxzLnByb2dyZXNzID09PSAxMDApIHtcbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xvc2UgbW9kYWxcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBzdWNjZXNzIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24oZ2xvYmFsVHJhbnNsYXRlLmdzX0FsbFNldHRpbmdzRGVsZXRlZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRG9uJ3QgcmVkaXJlY3QgLSBzeXN0ZW0gd2lsbCByZXN0YXJ0XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgcmVzdG9yZSBtb2RhbFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhzdGFnZURldGFpbHMubWVzc2FnZXMgfHwgWydVbmtub3duIGVycm9yJ10pO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRhY3Rpb25zID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuYWN0aW9ucycpO1xuICAgICAgICAgICAgICAgICRhY3Rpb25zLnNob3coKTtcbiAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwubG9hZERlbGV0ZVN0YXRpc3RpY3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIG5vIHJlc3VsdCBwcm9wZXJ0eSwganVzdCB1cGRhdGUgcHJvZ3Jlc3NcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHJlc3RhcnQgc3RhZ2VcbiAgICAgICAgaWYgKHN0YWdlID09PSAnRGVsZXRlQWxsX1N0YWdlX1Jlc3RhcnQnICYmIHN0YWdlRGV0YWlscy5yZXN0YXJ0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBKdXN0IHNob3cgaW5mbyBtZXNzYWdlLCBFdmVudEJ1cyB3aWxsIGhhbmRsZSB0aGUgZGlzY29ubmVjdGlvbiBVSVxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19TeXN0ZW1XaWxsUmVzdGFydCB8fCAnU3lzdGVtIHdpbGwgcmVzdGFydCBpbiBhIGZldyBzZWNvbmRzLi4uJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSByZXNwb25zZSBhZnRlciByZXN0b3JpbmcgZGVmYXVsdCBzZXR0aW5ncyAodXBkYXRlZCBmb3IgYXN5bmMpXG4gICAgICogQHBhcmFtIHtib29sZWFufG9iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBjYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAvLyBFcnJvciBvY2N1cnJlZFxuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBtb2RhbFxuICAgICAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG4gICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwubG9hZERlbGV0ZVN0YXRpc3RpY3MoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdWNjZXNzIGNhc2Ugd2lsbCBiZSBoYW5kbGVkIGJ5IFdlYlNvY2tldCBldmVudHNcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgaW5wdXQgd2F0Y2hlciB0byBtb25pdG9yIGRlbGV0ZSBwaHJhc2UgaW5wdXRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSW5wdXRXYXRjaGVyKCkge1xuICAgICAgICBjb25zdCAkc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICBjb25zdCBvcmlnaW5hbEJ1dHRvblRleHQgPSAkc3VibWl0QnV0dG9uLnRleHQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFdhdGNoIGZvciBpbnB1dCBjaGFuZ2VzXG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsSW5wdXQub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dFZhbHVlID0gJCh0aGlzKS52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzXG4gICAgICAgICAgICBpZiAoaW5wdXRWYWx1ZSA9PT0gZ2xvYmFsVHJhbnNsYXRlLmdzX0VudGVyRGVsZXRlQWxsUGhyYXNlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIGJ1dHRvbiB0ZXh0IHRvIGluZGljYXRlIGRlbGV0aW9uIGFjdGlvblxuICAgICAgICAgICAgICAgICRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdwb3NpdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnbmVnYXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJ0cmFzaCBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5nc19CdG5EZWxldGVBbGwgfHwgJ0RlbGV0ZSBBbGwgU2V0dGluZ3MnfWApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGJ1dHRvbiB0ZXh0XG4gICAgICAgICAgICAgICAgJHN1Ym1pdEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ25lZ2F0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdwb3NpdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5odG1sKGA8aSBjbGFzcz1cInNhdmUgaWNvblwiPjwvaT4gJHtvcmlnaW5hbEJ1dHRvblRleHR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBET00gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZSgpO1xufSk7Il19