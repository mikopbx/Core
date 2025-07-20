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
      } // MOH (Music On Hold) files


      if (data.mohFiles > 0) {
        statisticsHtml += generalSettingsDeleteAll.createStatisticItem('moh', globalTranslate.gs_StatMohFiles || 'Music On Hold', data.mohFiles, 'volume up icon');
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

    var progressHtml = "\n            <div class=\"ui segment\">\n                <div class=\"ui progress\" data-percent=\"".concat(stageDetails.progress, "\">\n                    <div class=\"bar\">\n                        <div class=\"progress\">").concat(stageDetails.progress, "%</div>\n                    </div>\n                    <div class=\"label\">").concat(stageDetails.messageKey ? globalTranslate[stageDetails.messageKey] || stageDetails.messageKey : stageDetails.message, "</div>\n                </div>\n            </div>\n        ");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9HZW5lcmFsU2V0dGluZ3MvZ2VuZXJhbC1zZXR0aW5ncy1kZWxldGUtYWxsLmpzIl0sIm5hbWVzIjpbImdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbCIsIiRkZWxldGVBbGxNb2RhbCIsIiRzdGF0aXN0aWNzQ29udGVudCIsIiRkZWxldGVBbGxJbnB1dCIsImFzeW5jQ2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsIkRhdGUiLCJub3ciLCJFdmVudEJ1cyIsInN1YnNjcmliZSIsImRhdGEiLCJwcm9jZXNzRGVsZXRlUHJvZ3Jlc3MiLCIkIiwiaW5pdGlhbGl6ZU1vZGFsIiwiaW5pdGlhbGl6ZUlucHV0V2F0Y2hlciIsImxlbmd0aCIsIm1vZGFsIiwiY2xvc2FibGUiLCJvblNob3ciLCJsb2FkRGVsZXRlU3RhdGlzdGljcyIsIm9uQXBwcm92ZSIsInNob3dEZWxldGluZ1Byb2dyZXNzIiwiUGJ4QXBpIiwiU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyIsImNiQWZ0ZXJSZXN0b3JlRGVmYXVsdFNldHRpbmdzIiwib25EZW55IiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY2hlY2tEZWxldGVDb25kaXRpb25zIiwiZGVsZXRlQWxsSW5wdXQiLCJ2YWwiLCJ0cmltIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UiLCJzaG93RGVsZXRlQ29uZmlybWF0aW9uTW9kYWwiLCJodG1sIiwiZ3NfTG9hZGluZ1N0YXRpc3RpY3MiLCJTeXN0ZW1HZXREZWxldGVTdGF0aXN0aWNzIiwiZ3NfRXJyb3JMb2FkaW5nU3RhdGlzdGljcyIsInN0YXRpc3RpY3NIdG1sIiwidXNlcnMiLCJjcmVhdGVTdGF0aXN0aWNJdGVtIiwiZ3NfU3RhdFVzZXJzIiwiZXh0ZW5zaW9ucyIsInByb3ZpZGVycyIsImdzX1N0YXRQcm92aWRlcnMiLCJjYWxsUXVldWVzIiwiZ3NfU3RhdENhbGxRdWV1ZXMiLCJpdnJNZW51cyIsImdzX1N0YXRJdnJNZW51cyIsImNvbmZlcmVuY2VSb29tcyIsImdzX1N0YXRDb25mZXJlbmNlUm9vbXMiLCJkaWFscGxhbkFwcGxpY2F0aW9ucyIsImdzX1N0YXREaWFscGxhbkFwcGxpY2F0aW9ucyIsImN1c3RvbVNvdW5kRmlsZXMiLCJnc19TdGF0U291bmRGaWxlcyIsIm1vaEZpbGVzIiwiZ3NfU3RhdE1vaEZpbGVzIiwidG90YWxSb3V0ZXMiLCJpbmNvbWluZ1JvdXRlcyIsIm91dGdvaW5nUm91dGVzIiwiZ3NfU3RhdFJvdXRlcyIsImZpcmV3YWxsUnVsZXMiLCJnc19TdGF0RmlyZXdhbGxSdWxlcyIsIm1vZHVsZXMiLCJnc19TdGF0TW9kdWxlcyIsImNhbGxIaXN0b3J5IiwiZ3NfU3RhdENhbGxIaXN0b3J5IiwidG9Mb2NhbGVTdHJpbmciLCJjYWxsUmVjb3JkaW5ncyIsInNpemVTdHIiLCJmb3JtYXRCeXRlcyIsImNhbGxSZWNvcmRpbmdzU2l6ZSIsImdzX1N0YXRDYWxsUmVjb3JkaW5ncyIsImJhY2t1cHMiLCJiYWNrdXBzU2l6ZSIsImdzX1N0YXRCYWNrdXBzIiwiY3VzdG9tRmlsZXMiLCJnc19TdGF0Q3VzdG9tRmlsZXMiLCJnc19Ob0RhdGFUb0RlbGV0ZSIsImlkIiwibGFiZWwiLCJ2YWx1ZSIsImljb24iLCJieXRlcyIsImRlY2ltYWxzIiwiayIsImRtIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCIkY29udGVudCIsImZpbmQiLCIkYWN0aW9ucyIsImhpZGUiLCJnc19EZWxldGluZ0FsbFNldHRpbmdzIiwicmVzcG9uc2UiLCJzdGFnZSIsInN0YWdlRGV0YWlscyIsInByb2dyZXNzSHRtbCIsInByb2dyZXNzIiwibWVzc2FnZUtleSIsIm1lc3NhZ2UiLCJyZXN1bHQiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsImdzX0FsbFNldHRpbmdzRGVsZXRlZCIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwic2hvdyIsInJlc3RhcnQiLCJnc19TeXN0ZW1XaWxsUmVzdGFydCIsIiRzdWJtaXRCdXR0b24iLCJvcmlnaW5hbEJ1dHRvblRleHQiLCJ0ZXh0Iiwib24iLCJpbnB1dFZhbHVlIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImdzX0J0bkRlbGV0ZUFsbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHdCQUF3QixHQUFHO0FBRTdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsSUFMWTtBQU03QkMsRUFBQUEsa0JBQWtCLEVBQUUsSUFOUztBQU83QkMsRUFBQUEsZUFBZSxFQUFFLElBUFk7O0FBUzdCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUFaYTs7QUFjN0I7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBakI2Qix3QkFpQmhCO0FBQ1Q7QUFDQUwsSUFBQUEsd0JBQXdCLENBQUNJLGNBQXpCLHdCQUF3REUsSUFBSSxDQUFDQyxHQUFMLEVBQXhELEVBRlMsQ0FJVDs7QUFDQUMsSUFBQUEsUUFBUSxDQUFDQyxTQUFULENBQW1CVCx3QkFBd0IsQ0FBQ0ksY0FBNUMsRUFBNEQsVUFBQU0sSUFBSSxFQUFJO0FBQ2hFVixNQUFBQSx3QkFBd0IsQ0FBQ1cscUJBQXpCLENBQStDRCxJQUEvQztBQUNILEtBRkQsRUFMUyxDQVNUOztBQUNBVixJQUFBQSx3QkFBd0IsQ0FBQ0MsZUFBekIsR0FBMkNXLENBQUMsQ0FBQyxtQkFBRCxDQUE1QztBQUNBWixJQUFBQSx3QkFBd0IsQ0FBQ0Usa0JBQXpCLEdBQThDVSxDQUFDLENBQUMsNEJBQUQsQ0FBL0M7QUFDQVosSUFBQUEsd0JBQXdCLENBQUNHLGVBQXpCLEdBQTJDUyxDQUFDLENBQUMsOEJBQUQsQ0FBNUMsQ0FaUyxDQWNUOztB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RzVEOztBQUNBLFVBQUkwRixVQUFVLEtBQUt6RixlQUFlLENBQUNDLHVCQUFuQyxFQUE0RDtBQUN4RDtBQUNBb0YsUUFBQUEsYUFBYSxDQUNSSyxXQURMLENBQ2lCLFVBRGpCLEVBRUtDLFFBRkwsQ0FFYyxVQUZkLEVBR0t4RixJQUhMLHdDQUd3Q0gsZUFBZSxDQUFDNEYsZUFBaEIsSUFBbUMscUJBSDNFO0FBSUgsT0FORCxNQU1PO0FBQ0g7QUFDQVAsUUFBQUEsYUFBYSxDQUNSSyxXQURMLENBQ2lCLFVBRGpCLEVBRUtDLFFBRkwsQ0FFYyxVQUZkLEVBR0t4RixJQUhMLHVDQUd1Q21GLGtCQUh2QztBQUlIO0FBQ0osS0FqQkQ7QUFrQkg7QUF2YzRCLENBQWpDLEMsQ0EwY0E7O0FBQ0ExRyxDQUFDLENBQUNpSCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUgsRUFBQUEsd0JBQXdCLENBQUNLLFVBQXpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIFBieEFwaSwgVXNlck1lc3NhZ2UsIEV2ZW50QnVzLCBGb3JtICovXG5cbi8qKlxuICogTW9kdWxlIGZvciBoYW5kbGluZyB0aGUgXCJEZWxldGUgQWxsIFNldHRpbmdzXCIgZnVuY3Rpb25hbGl0eVxuICogTWFuYWdlcyB0aGUgY29uZmlybWF0aW9uIG1vZGFsIGFuZCBzdGF0aXN0aWNzIGRpc3BsYXlcbiAqL1xuY29uc3QgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3RzIC0gd2lsbCBiZSBpbml0aWFsaXplZCBpbiBpbml0aWFsaXplKClcbiAgICAgKi9cbiAgICAkZGVsZXRlQWxsTW9kYWw6IG51bGwsXG4gICAgJHN0YXRpc3RpY3NDb250ZW50OiBudWxsLFxuICAgICRkZWxldGVBbGxJbnB1dDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBc3luYyBjaGFubmVsIElEIGZvciBXZWJTb2NrZXQgZXZlbnRzXG4gICAgICovXG4gICAgYXN5bmNDaGFubmVsSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgdW5pcXVlIGNoYW5uZWwgSUQgZm9yIHRoaXMgc2Vzc2lvblxuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWQgPSBgZGVsZXRlLWFsbC0ke0RhdGUubm93KCl9YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFN1YnNjcmliZSB0byBXZWJTb2NrZXQgZXZlbnRzXG4gICAgICAgIEV2ZW50QnVzLnN1YnNjcmliZShnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuYXN5bmNDaGFubmVsSWQsIGRhdGEgPT4ge1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLnByb2Nlc3NEZWxldGVQcm9ncmVzcyhkYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBvYmplY3RzIHdoZW4gRE9NIGlzIHJlYWR5XG4gICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgPSAkKCcjZGVsZXRlLWFsbC1tb2RhbCcpO1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJHN0YXRpc3RpY3NDb250ZW50ID0gJCgnI2RlbGV0ZS1zdGF0aXN0aWNzLWNvbnRlbnQnKTtcbiAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJkZWxldGVBbGxJbnB1dFwiXScpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBtb2RhbCBzZXR0aW5nc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZU1vZGFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYXRjaCBmb3IgaW5wdXQgY2hhbmdlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuaW5pdGlhbGl6ZUlucHV0V2F0Y2hlcigpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZGVsZXRlIGNvbmZpcm1hdGlvbiBtb2RhbFxuICAgICAqL1xuICAgIGluaXRpYWxpemVNb2RhbCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgJiYgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25TaG93OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIExvYWQgc3RhdGlzdGljcyB3aGVuIG1vZGFsIGlzIHNob3duXG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5sb2FkRGVsZXRlU3RhdGlzdGljcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZSBpbiBtb2RhbFxuICAgICAgICAgICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuc2hvd0RlbGV0aW5nUHJvZ3Jlc3MoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdXNlciBjb25maXJtcyBkZWxldGlvbiAtIHBhc3MgYXN5bmMgY2hhbm5lbCBJRFxuICAgICAgICAgICAgICAgICAgICBQYnhBcGkuU3lzdGVtUmVzdG9yZURlZmF1bHRTZXR0aW5ncyhcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5hc3luY0NoYW5uZWxJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jYkFmdGVyUmVzdG9yZURlZmF1bHRTZXR0aW5nc1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJuIGZhbHNlIHRvIHByZXZlbnQgYXV0b21hdGljIG1vZGFsIGNsb3NpbmdcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdoZW4gdXNlciBjYW5jZWxzIC0gbWFyayBmb3JtIGFzIGNoYW5nZWQgdG8ga2VlcCBzYXZlIGJ1dHRvbiBhY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aGUgZGVsZXRlIHBocmFzZSB3YXMgZW50ZXJlZCBjb3JyZWN0bHkgYW5kIHNob3cgbW9kYWxcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSB0cnVlIGlmIHBocmFzZSBtYXRjaGVzLCBmYWxzZSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBjaGVja0RlbGV0ZUNvbmRpdGlvbnMoKSB7XG4gICAgICAgIC8vIEdldCB0aGUgdmFsdWUgb2YgJ2RlbGV0ZUFsbElucHV0JyBmaWVsZCBhbmQgdHJpbSBzcGFjZXNcbiAgICAgICAgY29uc3QgZGVsZXRlQWxsSW5wdXQgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0LnZhbCgpLnRyaW0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBlbnRlcmVkIHBocmFzZSBtYXRjaGVzIHRoZSByZXF1aXJlZCBwaHJhc2VcbiAgICAgICAgaWYgKGRlbGV0ZUFsbElucHV0ID09PSBnbG9iYWxUcmFuc2xhdGUuZ3NfRW50ZXJEZWxldGVBbGxQaHJhc2UpIHtcbiAgICAgICAgICAgIGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5zaG93RGVsZXRlQ29uZmlybWF0aW9uTW9kYWwoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHRoZSBkZWxldGUgY29uZmlybWF0aW9uIG1vZGFsIHdpdGggc3RhdGlzdGljc1xuICAgICAqL1xuICAgIHNob3dEZWxldGVDb25maXJtYXRpb25Nb2RhbCgpIHtcbiAgICAgICAgaWYgKGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwgJiYgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgYW5kIGRpc3BsYXkgZGVsZXRpb24gc3RhdGlzdGljcyBpbiB0aGUgbW9kYWxcbiAgICAgKi9cbiAgICBsb2FkRGVsZXRlU3RhdGlzdGljcygpIHtcbiAgICAgICAgY29uc3QgJHN0YXRpc3RpY3NDb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRzdGF0aXN0aWNzQ29udGVudDtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkc3RhdGlzdGljc0NvbnRlbnQuaHRtbChgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgY2VudGVyZWQgaW5saW5lIGxvYWRlclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiY2VudGVyIGFsaWduZWRcIj4ke2dsb2JhbFRyYW5zbGF0ZS5nc19Mb2FkaW5nU3RhdGlzdGljcyB8fCAnTG9hZGluZyBzdGF0aXN0aWNzLi4uJ308L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgc3RhdGlzdGljcyBmcm9tIEFQSVxuICAgICAgICBQYnhBcGkuU3lzdGVtR2V0RGVsZXRlU3RhdGlzdGljcygoZGF0YSkgPT4ge1xuICAgICAgICAgICAgaWYgKGRhdGEgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBpZiBzdGF0aXN0aWNzIGNvdWxkbid0IGJlIGxvYWRlZFxuICAgICAgICAgICAgICAgICRzdGF0aXN0aWNzQ29udGVudC5odG1sKGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBlcnJvciBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmdzX0Vycm9yTG9hZGluZ1N0YXRpc3RpY3MgfHwgJ0Vycm9yIGxvYWRpbmcgc3RhdGlzdGljcyd9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBCdWlsZCBzdGF0aXN0aWNzIEhUTUxcbiAgICAgICAgICAgIGxldCBzdGF0aXN0aWNzSHRtbCA9ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2VycyBhbmQgZXh0ZW5zaW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEudXNlcnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICd1c2VycycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFVzZXJzIHx8ICdVc2Vycy9FeHRlbnNpb25zJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuZXh0ZW5zaW9ucyB8fCBkYXRhLnVzZXJzLFxuICAgICAgICAgICAgICAgICAgICAndXNlciBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb3ZpZGVyc1xuICAgICAgICAgICAgaWYgKGRhdGEucHJvdmlkZXJzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncHJvdmlkZXJzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0UHJvdmlkZXJzIHx8ICdTSVAgUHJvdmlkZXJzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHJvdmlkZXJzLFxuICAgICAgICAgICAgICAgICAgICAnc2VydmVyIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2FsbCBxdWV1ZXNcbiAgICAgICAgICAgIGlmIChkYXRhLmNhbGxRdWV1ZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdxdWV1ZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsUXVldWVzIHx8ICdDYWxsIFF1ZXVlcycsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmNhbGxRdWV1ZXMsXG4gICAgICAgICAgICAgICAgICAgICd1c2VycyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElWUiBNZW51c1xuICAgICAgICAgICAgaWYgKGRhdGEuaXZyTWVudXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdpdnInLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRJdnJNZW51cyB8fCAnSVZSIE1lbnVzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuaXZyTWVudXMsXG4gICAgICAgICAgICAgICAgICAgICdzaXRlbWFwIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ29uZmVyZW5jZSByb29tc1xuICAgICAgICAgICAgaWYgKGRhdGEuY29uZmVyZW5jZVJvb21zID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnY29uZmVyZW5jZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDb25mZXJlbmNlUm9vbXMgfHwgJ0NvbmZlcmVuY2UgUm9vbXMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jb25mZXJlbmNlUm9vbXMsXG4gICAgICAgICAgICAgICAgICAgICd2aWRlbyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERpYWxwbGFuIGFwcGxpY2F0aW9uc1xuICAgICAgICAgICAgaWYgKGRhdGEuZGlhbHBsYW5BcHBsaWNhdGlvbnMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdkaWFscGxhbicsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdERpYWxwbGFuQXBwbGljYXRpb25zIHx8ICdEaWFscGxhbiBBcHBsaWNhdGlvbnMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5kaWFscGxhbkFwcGxpY2F0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgJ2NvZGUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTb3VuZCBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEuY3VzdG9tU291bmRGaWxlcyA+IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3NvdW5kcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdFNvdW5kRmlsZXMgfHwgJ0N1c3RvbSBTb3VuZCBGaWxlcycsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmN1c3RvbVNvdW5kRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICdtdXNpYyBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1PSCAoTXVzaWMgT24gSG9sZCkgZmlsZXNcbiAgICAgICAgICAgIGlmIChkYXRhLm1vaEZpbGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9oJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0TW9oRmlsZXMgfHwgJ011c2ljIE9uIEhvbGQnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5tb2hGaWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3ZvbHVtZSB1cCBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJvdXRlc1xuICAgICAgICAgICAgY29uc3QgdG90YWxSb3V0ZXMgPSAoZGF0YS5pbmNvbWluZ1JvdXRlcyB8fCAwKSArIChkYXRhLm91dGdvaW5nUm91dGVzIHx8IDApO1xuICAgICAgICAgICAgaWYgKHRvdGFsUm91dGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAncm91dGVzJywgXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5nc19TdGF0Um91dGVzIHx8ICdDYWxsIFJvdXRlcycsIFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFJvdXRlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3JhbmRvbSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcmV3YWxsIHJ1bGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5maXJld2FsbFJ1bGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnZmlyZXdhbGwnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRGaXJld2FsbFJ1bGVzIHx8ICdGaXJld2FsbCBSdWxlcycsIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLmZpcmV3YWxsUnVsZXMsXG4gICAgICAgICAgICAgICAgICAgICdzaGllbGQgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNb2R1bGVzXG4gICAgICAgICAgICBpZiAoZGF0YS5tb2R1bGVzID4gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRpc3RpY3NIdG1sICs9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5jcmVhdGVTdGF0aXN0aWNJdGVtKFxuICAgICAgICAgICAgICAgICAgICAnbW9kdWxlcycsIFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZ3NfU3RhdE1vZHVsZXMgfHwgJ0luc3RhbGxlZCBNb2R1bGVzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEubW9kdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgJ3B1enpsZSBwaWVjZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgaGlzdG9yeVxuICAgICAgICAgICAgaWYgKGRhdGEuY2FsbEhpc3RvcnkgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjZHInLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsSGlzdG9yeSB8fCAnQ2FsbCBIaXN0b3J5IFJlY29yZHMnLCBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5jYWxsSGlzdG9yeS50b0xvY2FsZVN0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAnaGlzdG9yeSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENhbGwgcmVjb3JkaW5nc1xuICAgICAgICAgICAgaWYgKGRhdGEuY2FsbFJlY29yZGluZ3MgPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVN0ciA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC5mb3JtYXRCeXRlcyhkYXRhLmNhbGxSZWNvcmRpbmdzU2l6ZSB8fCAwKTtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ3JlY29yZGluZ3MnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDYWxsUmVjb3JkaW5ncyB8fCAnQ2FsbCBSZWNvcmRpbmdzJywgXG4gICAgICAgICAgICAgICAgICAgIGAke2RhdGEuY2FsbFJlY29yZGluZ3MudG9Mb2NhbGVTdHJpbmcoKX0gKCR7c2l6ZVN0cn0pYCxcbiAgICAgICAgICAgICAgICAgICAgJ21pY3JvcGhvbmUgaWNvbidcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBCYWNrdXBzXG4gICAgICAgICAgICBpZiAoZGF0YS5iYWNrdXBzID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVTdHIgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuZm9ybWF0Qnl0ZXMoZGF0YS5iYWNrdXBzU2l6ZSB8fCAwKTtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCArPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuY3JlYXRlU3RhdGlzdGljSXRlbShcbiAgICAgICAgICAgICAgICAgICAgJ2JhY2t1cHMnLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRCYWNrdXBzIHx8ICdCYWNrdXAgRmlsZXMnLCBcbiAgICAgICAgICAgICAgICAgICAgYCR7ZGF0YS5iYWNrdXBzfSAoJHtzaXplU3RyfSlgLFxuICAgICAgICAgICAgICAgICAgICAnYXJjaGl2ZSBpY29uJ1xuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgaWYgKGRhdGEuY3VzdG9tRmlsZXMgPiAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGlzdGljc0h0bWwgKz0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmNyZWF0ZVN0YXRpc3RpY0l0ZW0oXG4gICAgICAgICAgICAgICAgICAgICdjdXN0b20nLCBcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmdzX1N0YXRDdXN0b21GaWxlcyB8fCAnQ3VzdG9tIEZpbGVzJywgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuY3VzdG9tRmlsZXMsXG4gICAgICAgICAgICAgICAgICAgICdmaWxlIGljb24nXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWYgbm8gZGF0YSB3aWxsIGJlIGRlbGV0ZWRcbiAgICAgICAgICAgIGlmIChzdGF0aXN0aWNzSHRtbCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWNzSHRtbCA9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZ3NfTm9EYXRhVG9EZWxldGUgfHwgJ05vIGRhdGEgdG8gZGVsZXRlJ31cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgbW9kYWwgY29udGVudFxuICAgICAgICAgICAgJHN0YXRpc3RpY3NDb250ZW50Lmh0bWwoc3RhdGlzdGljc0h0bWwpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHN0YXRpc3RpYyBpdGVtIEhUTUxcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBJdGVtIGlkZW50aWZpZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGFiZWwgLSBEaXNwbGF5IGxhYmVsXG4gICAgICogQHBhcmFtIHtzdHJpbmd8bnVtYmVyfSB2YWx1ZSAtIERpc3BsYXkgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWNvbiAtIEljb24gY2xhc3NcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZVN0YXRpc3RpY0l0ZW0oaWQsIGxhYmVsLCB2YWx1ZSwgaWNvbikge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBncmlkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29ufVwiPjwvaT4gJHtsYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3ZhbHVlfTwvc3Ryb25nPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybWF0IGJ5dGVzIHRvIGh1bWFuIHJlYWRhYmxlIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIEJ5dGVzIHRvIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkZWNpbWFscyAtIE51bWJlciBvZiBkZWNpbWFsIHBsYWNlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRCeXRlcyhieXRlcywgZGVjaW1hbHMgPSAyKSB7XG4gICAgICAgIGlmIChieXRlcyA9PT0gMCkgcmV0dXJuICcwIEInO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgayA9IDEwMjQ7XG4gICAgICAgIGNvbnN0IGRtID0gZGVjaW1hbHMgPCAwID8gMCA6IGRlY2ltYWxzO1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coaykpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHBhcnNlRmxvYXQoKGJ5dGVzIC8gTWF0aC5wb3coaywgaSkpLnRvRml4ZWQoZG0pKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBkZWxldGluZyBwcm9ncmVzcyBpbiBtb2RhbFxuICAgICAqL1xuICAgIHNob3dEZWxldGluZ1Byb2dyZXNzKCkge1xuICAgICAgICBjb25zdCAkY29udGVudCA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmNvbnRlbnQnKTtcbiAgICAgICAgY29uc3QgJGFjdGlvbnMgPSBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbE1vZGFsLmZpbmQoJy5hY3Rpb25zJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIGFjdGlvbiBidXR0b25zXG4gICAgICAgICRhY3Rpb25zLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkY29udGVudC5odG1sKGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGxhcmdlIHRleHQgbG9hZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZ3NfRGVsZXRpbmdBbGxTZXR0aW5ncyB8fCAnRGVsZXRpbmcgYWxsIHNldHRpbmdzLi4uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8cD4mbmJzcDs8L3A+XG4gICAgICAgICAgICAgICAgPHA+Jm5ic3A7PC9wPlxuICAgICAgICAgICAgICAgIDxwPiZuYnNwOzwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgZGVsZXRlIHByb2dyZXNzIGV2ZW50cyBmcm9tIFdlYlNvY2tldFxuICAgICAqL1xuICAgIHByb2Nlc3NEZWxldGVQcm9ncmVzcyhyZXNwb25zZSkge1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHM7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuY29udGVudCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGRpc3BsYXlcbiAgICAgICAgbGV0IHByb2dyZXNzSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHByb2dyZXNzXCIgZGF0YS1wZXJjZW50PVwiJHtzdGFnZURldGFpbHMucHJvZ3Jlc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJiYXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzc1wiPiR7c3RhZ2VEZXRhaWxzLnByb2dyZXNzfSU8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsYWJlbFwiPiR7c3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXkgPyBnbG9iYWxUcmFuc2xhdGVbc3RhZ2VEZXRhaWxzLm1lc3NhZ2VLZXldIHx8IHN0YWdlRGV0YWlscy5tZXNzYWdlS2V5IDogc3RhZ2VEZXRhaWxzLm1lc3NhZ2V9PC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgICRjb250ZW50Lmh0bWwocHJvZ3Jlc3NIdG1sKTtcbiAgICAgICAgJCgnLnVpLnByb2dyZXNzJykucHJvZ3Jlc3MoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBmaW5hbCBzdGFnZVxuICAgICAgICBpZiAoc3RhZ2UgPT09ICdEZWxldGVBbGxfU3RhZ2VfRmluYWwnICYmIHN0YWdlRGV0YWlscy5wcm9ncmVzcyA9PT0gMTAwKSB7XG4gICAgICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIC8vIENsb3NlIG1vZGFsXG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKGdsb2JhbFRyYW5zbGF0ZS5nc19BbGxTZXR0aW5nc0RlbGV0ZWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERvbid0IHJlZGlyZWN0IC0gc3lzdGVtIHdpbGwgcmVzdGFydFxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMucmVzdWx0ID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoc3RhZ2VEZXRhaWxzLm1lc3NhZ2VzIHx8IFsnVW5rbm93biBlcnJvciddKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkYWN0aW9ucyA9IGdlbmVyYWxTZXR0aW5nc0RlbGV0ZUFsbC4kZGVsZXRlQWxsTW9kYWwuZmluZCgnLmFjdGlvbnMnKTtcbiAgICAgICAgICAgICAgICAkYWN0aW9ucy5zaG93KCk7XG4gICAgICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiBubyByZXN1bHQgcHJvcGVydHksIGp1c3QgdXBkYXRlIHByb2dyZXNzXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSByZXN0YXJ0IHN0YWdlXG4gICAgICAgIGlmIChzdGFnZSA9PT0gJ0RlbGV0ZUFsbF9TdGFnZV9SZXN0YXJ0JyAmJiBzdGFnZURldGFpbHMucmVzdGFydCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gSnVzdCBzaG93IGluZm8gbWVzc2FnZSwgRXZlbnRCdXMgd2lsbCBoYW5kbGUgdGhlIGRpc2Nvbm5lY3Rpb24gVUlcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihnbG9iYWxUcmFuc2xhdGUuZ3NfU3lzdGVtV2lsbFJlc3RhcnQgfHwgJ1N5c3RlbSB3aWxsIHJlc3RhcnQgaW4gYSBmZXcgc2Vjb25kcy4uLicpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcmVzcG9uc2UgYWZ0ZXIgcmVzdG9yaW5nIGRlZmF1bHQgc2V0dGluZ3MgKHVwZGF0ZWQgZm9yIGFzeW5jKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyXG4gICAgICovXG4gICAgY2JBZnRlclJlc3RvcmVEZWZhdWx0U2V0dGluZ3MocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgLy8gRXJyb3Igb2NjdXJyZWRcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlc3RvcmUgbW9kYWxcbiAgICAgICAgICAgIGNvbnN0ICRhY3Rpb25zID0gZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLiRkZWxldGVBbGxNb2RhbC5maW5kKCcuYWN0aW9ucycpO1xuICAgICAgICAgICAgJGFjdGlvbnMuc2hvdygpO1xuICAgICAgICAgICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmxvYWREZWxldGVTdGF0aXN0aWNzKCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gU3VjY2VzcyBjYXNlIHdpbGwgYmUgaGFuZGxlZCBieSBXZWJTb2NrZXQgZXZlbnRzXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGlucHV0IHdhdGNoZXIgdG8gbW9uaXRvciBkZWxldGUgcGhyYXNlIGlucHV0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlucHV0V2F0Y2hlcigpIHtcbiAgICAgICAgY29uc3QgJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24nKTtcbiAgICAgICAgY29uc3Qgb3JpZ2luYWxCdXR0b25UZXh0ID0gJHN1Ym1pdEJ1dHRvbi50ZXh0KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBXYXRjaCBmb3IgaW5wdXQgY2hhbmdlc1xuICAgICAgICBnZW5lcmFsU2V0dGluZ3NEZWxldGVBbGwuJGRlbGV0ZUFsbElucHV0Lm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRWYWx1ZSA9ICQodGhpcykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgZW50ZXJlZCBwaHJhc2UgbWF0Y2hlc1xuICAgICAgICAgICAgaWYgKGlucHV0VmFsdWUgPT09IGdsb2JhbFRyYW5zbGF0ZS5nc19FbnRlckRlbGV0ZUFsbFBocmFzZSkge1xuICAgICAgICAgICAgICAgIC8vIENoYW5nZSBidXR0b24gdGV4dCB0byBpbmRpY2F0ZSBkZWxldGlvbiBhY3Rpb25cbiAgICAgICAgICAgICAgICAkc3VibWl0QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncG9zaXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ25lZ2F0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLmh0bWwoYDxpIGNsYXNzPVwidHJhc2ggaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuZ3NfQnRuRGVsZXRlQWxsIHx8ICdEZWxldGUgQWxsIFNldHRpbmdzJ31gKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBidXR0b24gdGV4dFxuICAgICAgICAgICAgICAgICRzdWJtaXRCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCduZWdhdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygncG9zaXRpdmUnKVxuICAgICAgICAgICAgICAgICAgICAuaHRtbChgPGkgY2xhc3M9XCJzYXZlIGljb25cIj48L2k+ICR7b3JpZ2luYWxCdXR0b25UZXh0fWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gRE9NIGlzIHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZ2VuZXJhbFNldHRpbmdzRGVsZXRlQWxsLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==