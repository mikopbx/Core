"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, globalPBXLicense, globalTranslate, UserMessage, globalPBXVersion, SemanticLocalization, upgradeStatusLoopWorker, PbxExtensionStatus, keyCheck */

/**
 * Represents list of extension modules.
 * @class extensionModules
 * @memberof module:PbxExtensionModules
 */
var extensionModules = {
  /**
   * jQuery object for the table with available modules.
   * @type {jQuery}
   */
  $marketplaceTable: $('#new-modules-table'),

  /**
   * jQuery object for the information when no any modules available to install.
   * @type {jQuery}
   */
  $noNewModulesSegment: $('#no-new-modules-segment'),

  /**
   * jQuery object for the loader instead of available modules.
   * @type {jQuery}
   */
  $marketplaceLoader: $('#new-modules-loader'),

  /**
   * jQuery object for the table with installed modules.
   * @type {jQuery}
   */
  $installedModulesTable: $('#installed-modules-table'),

  /**
   * jQuery object for the checkboxes.
   * @type {jQuery}
   */
  $checkboxes: $('.module-row .checkbox'),
  $deleteModalForm: $('#delete-modal-form'),
  $keepSettingsCheckbox: $('#keepModuleSettings'),
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),
  pbxLicense: globalPBXLicense.trim(),

  /**
   * jQuery object for the button which responsible for update all installed modules
   * @type {jQuery}
   */
  $btnUpdateAllModules: $('#update-all-modules-button'),
  checkBoxes: [],

  /**
   * jQuery object for icon with popup text
   * @type {jQuery}
   */
  $popupOnClick: $('i.popup-on-click'),

  /**
   * jQuery object for the tabular menu.
   * @type {jQuery}
   */
  $tabMenuItems: $('#pbx-extensions-tab-menu .item'),

  /**
   * EventSource object for the module installation and upgrade status
   * @type {EventSource}
   */
  eventSource: null,

  /**
   * PUB/SUB channel ID
   */
  channelId: 'install-module',

  /**
   * Initialize extensionModules list
   */
  initialize: function initialize() {
    // Enable tab navigation with history support
    extensionModules.$tabMenuItems.tab({
      history: true,
      historyType: 'hash'
    });
    extensionModules.$deleteModalForm.modal();
    extensionModules.initializeDataTable();
    extensionModules.$popupOnClick.popup({
      on: 'click',
      className: {
        popup: 'ui popup wide'
      }
    });
    PbxApi.ModulesGetAvailable(extensionModules.cbParseModuleUpdates);
    extensionModules.$checkboxes.each(function (index, obj) {
      var uniqId = $(obj).attr('data-value');
      var pageStatus = new PbxExtensionStatus();
      pageStatus.initialize(uniqId, false);
      extensionModules.checkBoxes.push(pageStatus);
    });
    extensionModules.$btnUpdateAllModules.hide(); // Until at least one update available

    extensionModules.$btnUpdateAllModules.on('click', extensionModules.updateAllModules);
    extensionModules.startListenPushNotifications();
  },

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function initializeDataTable() {
    extensionModules.$installedModulesTable.DataTable({
      lengthChange: false,
      paging: false,
      columns: [{
        orderable: false,
        searchable: false
      }, null, null, null, {
        orderable: false,
        searchable: false
      }],
      autoWidth: false,
      language: SemanticLocalization.dataTableLocalisation
    }); // Move the "Add New" button to the first eight-column div

    $('.add-new').appendTo($('div.eight.column:eq(0)'));
  },

  /**
   * Callback function to process the list of modules received from the website.
   * @param {object} response - The response containing the list of modules.
   */
  cbParseModuleUpdates: function cbParseModuleUpdates(response) {
    extensionModules.$marketplaceLoader.hide();
    response.modules.forEach(function (obj) {
      // Check if this module is compatible with the PBX based on version number
      var minAppropriateVersionPBX = obj.min_pbx_version;
      var currentVersionPBX = extensionModules.pbxVersion;

      if (extensionModules.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
        return;
      } // Check if the module is already installed and offer an update


      var $moduleRow = $("tr.module-row[data-id=".concat(obj.uniqid, "]"));

      if ($moduleRow.length > 0) {
        var oldVer = $moduleRow.find('td.version').text();
        var newVer = obj.version;

        if (extensionModules.versionCompare(newVer, oldVer) > 0) {
          extensionModules.addUpdateButtonToRow(obj);
        }
      } else {
        var $newModuleRow = $("tr.new-module-row[data-id=".concat(obj.uniqid, "]"));

        if ($newModuleRow.length > 0) {
          var _oldVer = $newModuleRow.find('td.version').text();

          var _newVer = obj.version;

          if (extensionModules.versionCompare(_newVer, _oldVer) > 0) {
            $newModuleRow.remove();
            extensionModules.addModuleDescription(obj);
          }
        } else {
          extensionModules.addModuleDescription(obj);
        }
      }
    });

    if ($('tr.new-module-row').length > 0) {
      extensionModules.$noNewModulesSegment.hide();
    } else {
      extensionModules.$noNewModulesSegment.show();
    }
    /**
     * Event handler for the download link click event.
     * @param {Event} e - The click event object.
     */


    $(document).on('click', 'a.download, a.update', function (e) {
      e.preventDefault();
      $('a.button').addClass('disabled');
      var $currentButton = $(e.target).closest('a.button');
      var params = {};
      params.uniqid = $currentButton.data('uniqid');
      params.releaseId = $currentButton.data('releaseid');
      params.channelId = extensionModules.channelId;
      $("#modal-".concat(params.uniqid)).modal('hide');
      var $moduleButtons = $("a[data-uniqid=".concat(params.uniqid, "]"));
      $moduleButtons.removeClass('disabled');
      $moduleButtons.find('i').removeClass('download').removeClass('redo').addClass('spinner loading');
      $moduleButtons.find('span.percent').text('0%');
      $('tr.table-error-messages').remove();
      $('tr.error').removeClass('error');

      if (extensionModules.pbxLicense === '') {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index#/licensing");
      } else {
        PbxApi.ModulesInstallFromRepo(params, function (response) {
          console.log(response);
        });
      }
    });
    /**
     * Event handler for the delete link click event.
     * @param {Event} e - The click event object.
     */

    $('a.delete').on('click', function (e) {
      e.preventDefault();
      $('a.button').addClass('disabled');
      $(e.target).closest('a').removeClass('disabled');
      var params = {};
      params.uniqid = $(e.target).closest('tr').data('id');
      extensionModules.deleteModule(params);
    });
    $('a[data-content]').popup();
  },

  /**
   * Adds a description for an available module.
   * @param {Object} obj - The module object containing information.
   */
  addModuleDescription: function addModuleDescription(obj) {
    extensionModules.$marketplaceTable.show();
    var promoLink = '';

    if (obj.promo_link !== undefined && obj.promo_link !== null) {
      promoLink = "<br><a href=\"".concat(obj.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a>");
    }

    var additionalIcon = '<i class="puzzle piece icon"></i>';

    if (obj.commercial !== '0') {
      additionalIcon = '<i class="ui donate icon"></i>';
    }

    var dynamicRow = "\n\t\t\t<tr class=\"new-module-row\" data-id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t    <span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version show-details-on-click\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui icon basic button download popuped disable-if-no-internet\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-releaseid =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t    </td>\t\t\n\t\t\t</tr>");
    $('#new-modules-table tbody').append(dynamicRow);
  },

  /**
   * Adds an update button to the module row for updating an old version of PBX.
   * @param {Object} obj - The module object containing information.
   */
  addUpdateButtonToRow: function addUpdateButtonToRow(obj) {
    var $moduleRow = $("tr.module-row[data-id=".concat(obj.uniqid, "]"));
    var $currentUpdateButton = $moduleRow.find('a.download');

    if ($currentUpdateButton.length > 0) {
      var oldVer = $currentUpdateButton.attr('data-ver');
      var newVer = obj.version;

      if (extensionModules.versionCompare(newVer, oldVer) <= 0) {
        return;
      }
    }

    $currentUpdateButton.remove();
    var dynamicButton = "<a href=\"#\" class=\"ui basic button update popuped disable-if-no-internet\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-ver =\"").concat(obj.version, "\"\n\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-releaseid =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t<span class=\"percent\"></span>\n\t\t\t</a>");
    $moduleRow.find('.action-buttons').prepend(dynamicButton);
    extensionModules.$btnUpdateAllModules.show();
  },

  /**
   * Delete a module.
   * @param {Object} params - The request parameters.
   */
  deleteModule: function deleteModule(params) {
    // Ask the user if they want to keep the settings
    extensionModules.$deleteModalForm.modal({
      closable: false,
      onDeny: function onDeny() {
        $('a.button').removeClass('disabled');
        return true;
      },
      onApprove: function onApprove() {
        // Check if the module is enabled, if enabled, disable it
        var status = $("#".concat(params.uniqid)).find('.checkbox').checkbox('is checked');
        var keepSettings = extensionModules.$keepSettingsCheckbox.checkbox('is checked');

        if (status === true) {
          PbxApi.ModulesDisableModule(params.uniqid, function () {
            PbxApi.ModulesUnInstallModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
          });
        } else {
          PbxApi.ModulesUnInstallModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
        }

        return true;
      }
    }).modal('show');
  },

  /**
   * Callback function after click on the update all modules button
   */
  updateAllModules: function updateAllModules() {
    $('a.button').addClass('disabled');
    var $currentButton = $(e.target).closest('a');
    $currentButton.removeClass('disabled');
    $currentButton.closest('i.icon').removeClass('redo').addClass('spinner loading');
    var params = {};
    params.channelId = extensionModules.channelId;
    PbxApi.ModulesUpdateAll(params, function (response) {
      console.log(response);
    });
  },

  /**
   * Callback function after deleting a module.
   * If successful, reload the page; if not, display an error message.
   * @param {boolean} result - The result of the module deletion.
   */
  cbAfterDelete: function cbAfterDelete(result) {
    $('a.button').removeClass('disabled');

    if (result === true) {
      window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
    } else {
      $('.ui.message.ajax').remove();
      var errorMessage = result.data !== undefined ? result.data : '';
      errorMessage = errorMessage.replace(/\n/g, '<br>');
      UserMessage.showMultiString(errorMessage, globalTranslate.ext_DeleteModuleError);
    }
  },

  /**
   * Compare versions of modules.
   * @param {string} v1 - The first version to compare.
   * @param {string} v2 - The second version to compare.
   * @param {object} [options] - Optional configuration options.
   * @param {boolean} [options.lexicographical] - Whether to perform lexicographical comparison (default: false).
   * @param {boolean} [options.zeroExtend] - Weather to zero-extend the shorter version (default: false).
   * @returns {number} - A number indicating the comparison result: 0 if versions are equal, 1 if v1 is greater, -1 if v2 is greater, or NaN if the versions are invalid.
   */
  versionCompare: function versionCompare(v1, v2, options) {
    var lexicographical = options && options.lexicographical;
    var zeroExtend = options && options.zeroExtend;
    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    function isValidPart(x) {
      return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
      return NaN;
    }

    if (zeroExtend) {
      while (v1parts.length < v2parts.length) {
        v1parts.push('0');
      }

      while (v2parts.length < v1parts.length) {
        v2parts.push('0');
      }
    }

    if (!lexicographical) {
      v1parts = v1parts.map(Number);
      v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; i += 1) {
      if (v2parts.length === i) {
        return 1;
      }

      if (v1parts[i] === v2parts[i]) {//
      } else if (v1parts[i] > v2parts[i]) {
        return 1;
      } else {
        return -1;
      }
    }

    if (v1parts.length !== v2parts.length) {
      return -1;
    }

    return 0;
  },

  /**
   * Starts listen to push notifications from backend
   */
  startListenPushNotifications: function startListenPushNotifications() {
    var lastEventIdKey = "lastEventId";
    var lastEventId = localStorage.getItem(lastEventIdKey);
    var subPath = lastEventId ? "/pbxcore/api/nchan/sub/".concat(extensionModules.channelId, "?last_event_id=").concat(lastEventId) : "/pbxcore/api/nchan/sub/".concat(extensionModules.channelId);
    extensionModules.eventSource = new EventSource(subPath);
    extensionModules.eventSource.addEventListener('message', function (e) {
      var response = JSON.parse(e.data);
      console.log('New message: ', response);
      extensionModules.processModuleInstallation(response);
      localStorage.setItem(lastEventIdKey, e.lastEventId);
    });
  },

  /**
   * Parses push events from backend and process them
   * @param response
   */
  processModuleInstallation: function processModuleInstallation(response) {
    var moduleUniqueId = response.moduleUniqueId;
    var stage = response.stage;
    var stageDetails = response.stageDetails;
    var $row = $("#".concat(moduleUniqueId));

    if (stage === 'Stage_I_GetRelease') {
      $row.find('span.percent').text('1%');
    } else if (stage === 'Stage_II_CheckLicense') {
      $row.find('span.percent').text('2%');
    } else if (stage === 'Stage_III_GetDownloadLink') {
      $row.find('span.percent').text('3%');
    } else if (stage === 'Stage_IV_DownloadModule') {
      extensionModules.cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails);
    } else if (stage === 'Stage_V_InstallModule') {
      extensionModules.cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails);
    } else if (stage === 'Stage_VI_EnableModule') {} else if (stage === 'Stage_VII_FinalStatus') {
      if (stageDetails.result === true) {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
      } else {
        if (stageDetails.messages !== undefined) {
          extensionModules.showModuleInstallationError($row, globalTranslate.ext_InstallationError, stageDetails.messages);
        } else {
          extensionModules.showModuleInstallationError($row, globalTranslate.ext_InstallationError);
        }
      }
    }
  },

  /**
   * Callback function to refresh the module download status.
   * @param {string} moduleUniqueId
   * @param {object} stageDetails - The response object containing the download status.
   */
  cbAfterReceiveNewDownloadStatus: function cbAfterReceiveNewDownloadStatus(moduleUniqueId, stageDetails) {
    var $row = $("tr[data-uniqid=".concat(moduleUniqueId, "]")); // Check module download status

    if (stageDetails.data.d_status === 'DOWNLOAD_IN_PROGRESS') {
      var downloadProgress = Math.max(Math.round(parseInt(stageDetails.data.d_status_progress, 10) / 2), 3);
      $row.find('span.percent').text("".concat(downloadProgress, "%"));
    } else if (stageDetails.d_status === 'DOWNLOAD_COMPLETE') {
      $row.find('span.percent').text('50%');
    }
  },

  /**
   * Callback function after receiving the new installation status.
   * @param {string} moduleUniqueId
   * @param {object} stageDetails - The response object containing the installation status.
   */
  cbAfterReceiveNewInstallationStatus: function cbAfterReceiveNewInstallationStatus(moduleUniqueId, stageDetails) {
    // Check module installation status
    var $row = $("tr[data-uniqid=".concat(moduleUniqueId, "]"));

    if (stageDetails.data.i_status === 'INSTALLATION_IN_PROGRESS') {
      var installationProgress = Math.round(parseInt(stageDetails.data.i_status_progress, 10) / 2 + 50);
      $row.find('span.percent').text("".concat(installationProgress, "%"));
    } else if (stageDetails.data.i_status === 'INSTALLATION_COMPLETE') {
      $row.find('span.percent').text('100%');
    }
  },

  /**
   * Reset the download/update button to default stage
   * @param $row
   */
  resetButtonView: function resetButtonView($row) {
    $('a.button').removeClass('disabled');
    $row.find('i.loading').removeClass('spinner loading');
    $row.find('a.download i').addClass('download');
    $row.find('a.update i').addClass('redo');
    $row.find('span.percent').text('');
  },

  /**
   * Shows module installation error above the module row
   * @param $row
   * @param header
   * @param messages
   */
  showModuleInstallationError: function showModuleInstallationError($row, header) {
    var messages = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    extensionModules.resetButtonView($row);

    if (messages.license !== undefined) {
      var manageLink = "<br>".concat(globalTranslate.lic_ManageLicense, " <a href=\"").concat(Config.keyManagementUrl, "\" target=\"_blank\">").concat(Config.keyManagementSite, "</a>");
      messages.license.push(manageLink);
    }

    var textDescription = UserMessage.convertToText(messages);
    var htmlMessage = "<tr class=\"ui error center aligned table-error-messages\"><td colspan=\"4\"><div class=\"ui header\">".concat(header, "</div><p>").concat(textDescription, "</p></div></td></tr>");
    $row.addClass('error');
    $row.before(htmlMessage);
  }
}; // When the document is ready, initialize the external modules table

$(document).ready(function () {
  extensionModules.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluZGV4LmpzIl0sIm5hbWVzIjpbImV4dGVuc2lvbk1vZHVsZXMiLCIkbWFya2V0cGxhY2VUYWJsZSIsIiQiLCIkbm9OZXdNb2R1bGVzU2VnbWVudCIsIiRtYXJrZXRwbGFjZUxvYWRlciIsIiRpbnN0YWxsZWRNb2R1bGVzVGFibGUiLCIkY2hlY2tib3hlcyIsIiRkZWxldGVNb2RhbEZvcm0iLCIka2VlcFNldHRpbmdzQ2hlY2tib3giLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJwYnhMaWNlbnNlIiwiZ2xvYmFsUEJYTGljZW5zZSIsInRyaW0iLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImNoZWNrQm94ZXMiLCIkcG9wdXBPbkNsaWNrIiwiJHRhYk1lbnVJdGVtcyIsImV2ZW50U291cmNlIiwiY2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsInBvcHVwIiwib24iLCJjbGFzc05hbWUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJoaWRlIiwidXBkYXRlQWxsTW9kdWxlcyIsInN0YXJ0TGlzdGVuUHVzaE5vdGlmaWNhdGlvbnMiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwic2hvdyIsImRvY3VtZW50IiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCIkY3VycmVudEJ1dHRvbiIsInRhcmdldCIsImNsb3Nlc3QiLCJwYXJhbXMiLCJkYXRhIiwicmVsZWFzZUlkIiwiJG1vZHVsZUJ1dHRvbnMiLCJyZW1vdmVDbGFzcyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIk1vZHVsZXNJbnN0YWxsRnJvbVJlcG8iLCJjb25zb2xlIiwibG9nIiwiZGVsZXRlTW9kdWxlIiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiYWRkaXRpb25hbEljb24iLCJjb21tZXJjaWFsIiwiZHluYW1pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwic2l6ZSIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwic3RhdHVzIiwiY2hlY2tib3giLCJrZWVwU2V0dGluZ3MiLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJjYkFmdGVyRGVsZXRlIiwiTW9kdWxlc1VwZGF0ZUFsbCIsInJlc3VsdCIsImVycm9yTWVzc2FnZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X0RlbGV0ZU1vZHVsZUVycm9yIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJldmVyeSIsIk5hTiIsIm1hcCIsIk51bWJlciIsImkiLCJsYXN0RXZlbnRJZEtleSIsImxhc3RFdmVudElkIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsInN1YlBhdGgiLCJFdmVudFNvdXJjZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJKU09OIiwicGFyc2UiLCJwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uIiwic2V0SXRlbSIsIm1vZHVsZVVuaXF1ZUlkIiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCIkcm93IiwiY2JBZnRlclJlY2VpdmVOZXdEb3dubG9hZFN0YXR1cyIsImNiQWZ0ZXJSZWNlaXZlTmV3SW5zdGFsbGF0aW9uU3RhdHVzIiwibWVzc2FnZXMiLCJzaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJkX3N0YXR1cyIsImRvd25sb2FkUHJvZ3Jlc3MiLCJNYXRoIiwibWF4Iiwicm91bmQiLCJwYXJzZUludCIsImRfc3RhdHVzX3Byb2dyZXNzIiwiaV9zdGF0dXMiLCJpbnN0YWxsYXRpb25Qcm9ncmVzcyIsImlfc3RhdHVzX3Byb2dyZXNzIiwicmVzZXRCdXR0b25WaWV3IiwiaGVhZGVyIiwibGljZW5zZSIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsInRleHREZXNjcmlwdGlvbiIsImNvbnZlcnRUb1RleHQiLCJodG1sTWVzc2FnZSIsImJlZm9yZSIsInJlYWR5Il0sIm1hcHBpbmdz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YUFBWixDQUEwQnRCLFFBQTFCLENBQXhCO0FBQ0EsUUFBTXVCLFdBQVcsbUhBQXNHVCxNQUF0RyxzQkFBd0hPLGVBQXhILHlCQUFqQjtBQUNBeEIsSUFBQUEsSUFBSSxDQUFDakYsUUFBTCxDQUFjLE9BQWQ7QUFDQWlGLElBQUFBLElBQUksQ0FBQzJCLE1BQUwsQ0FBWUQsV0FBWjtBQUNIO0FBdGdCb0IsQ0FBekIsQyxDQXlnQkE7O0FBQ0F2TCxDQUFDLENBQUN5RSxRQUFELENBQUQsQ0FBWWdILEtBQVosQ0FBa0IsWUFBTTtBQUNwQjNMLEVBQUFBLGdCQUFnQixDQUFDcUIsVUFBakI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMsIGtleUNoZWNrICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBsaXN0IG9mIGV4dGVuc2lvbiBtb2R1bGVzLlxuICogQGNsYXNzIGV4dGVuc2lvbk1vZHVsZXNcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VUYWJsZTogJCgnI25ldy1tb2R1bGVzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpbnN0YWxsZWRNb2R1bGVzVGFibGU6ICQoJyNpbnN0YWxsZWQtbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblxuICAgICRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIHBieExpY2Vuc2U6IGdsb2JhbFBCWExpY2Vuc2UudHJpbSgpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGJ1dHRvbiB3aGljaCByZXNwb25zaWJsZSBmb3IgdXBkYXRlIGFsbCBpbnN0YWxsZWQgbW9kdWxlc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJ0blVwZGF0ZUFsbE1vZHVsZXM6ICQoJyN1cGRhdGUtYWxsLW1vZHVsZXMtYnV0dG9uJyksXG5cbiAgICBjaGVja0JveGVzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIGljb24gd2l0aCBwb3B1cCB0ZXh0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcG9wdXBPbkNsaWNrOiAkKCdpLnBvcHVwLW9uLWNsaWNrJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI3BieC1leHRlbnNpb25zLXRhYi1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBFdmVudFNvdXJjZSBvYmplY3QgZm9yIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGFuZCB1cGdyYWRlIHN0YXR1c1xuICAgICAqIEB0eXBlIHtFdmVudFNvdXJjZX1cbiAgICAgKi9cbiAgICBldmVudFNvdXJjZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFBVQi9TVUIgY2hhbm5lbCBJRFxuICAgICAqL1xuICAgIGNoYW5uZWxJZDogJ2luc3RhbGwtbW9kdWxlJyxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uTW9kdWxlcyBsaXN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJHBvcHVwT25DbGljay5wb3B1cCh7XG4gICAgICAgICAgICBvbiAgICA6ICdjbGljaycsXG4gICAgICAgICAgICBjbGFzc05hbWU6IHtcbiAgICAgICAgICAgICAgICBwb3B1cDogJ3VpIHBvcHVwIHdpZGUnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFBieEFwaS5Nb2R1bGVzR2V0QXZhaWxhYmxlKGV4dGVuc2lvbk1vZHVsZXMuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuICAgICAgICAgICAgcGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGJ0blVwZGF0ZUFsbE1vZHVsZXMuaGlkZSgpOyAvLyBVbnRpbCBhdCBsZWFzdCBvbmUgdXBkYXRlIGF2YWlsYWJsZVxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRidG5VcGRhdGVBbGxNb2R1bGVzLm9uKCdjbGljaycsIGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlQWxsTW9kdWxlcyk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5zdGFydExpc3RlblB1c2hOb3RpZmljYXRpb25zKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGluc3RhbGxlZE1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXZcbiAgICAgICAgJCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoPjApe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZG93bmxvYWQgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCdhLmRvd25sb2FkLCBhLnVwZGF0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgJGN1cnJlbnRCdXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhLmJ1dHRvbicpO1xuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRjdXJyZW50QnV0dG9uLmRhdGEoJ3VuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRjdXJyZW50QnV0dG9uLmRhdGEoJ3JlbGVhc2VpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmNoYW5uZWxJZCA9IGV4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkO1xuICAgICAgICAgICAgJChgI21vZGFsLSR7cGFyYW1zLnVuaXFpZH1gKS5tb2RhbCgnaGlkZScpO1xuXG4gICAgICAgICAgICBjb25zdCAkbW9kdWxlQnV0dG9ucyA9ICQoYGFbZGF0YS11bmlxaWQ9JHtwYXJhbXMudW5pcWlkfV1gKTtcbiAgICAgICAgICAgICRtb2R1bGVCdXR0b25zLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgJG1vZHVsZUJ1dHRvbnMuZmluZCgnaScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkb3dubG9hZCcpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWRvJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuICAgICAgICAgICAgJG1vZHVsZUJ1dHRvbnMuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMCUnKTtcbiAgICAgICAgICAgICQoJ3RyLnRhYmxlLWVycm9yLW1lc3NhZ2VzJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkKCd0ci5lcnJvcicpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMucGJ4TGljZW5zZSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleCMvbGljZW5zaW5nYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNJbnN0YWxsRnJvbVJlcG8ocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRlbGV0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmRhdGEoJ2lkJyk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHluYW1pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgZGF0YS1pZD1cIiR7b2JqLnVuaXFpZH1cIj5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7YWRkaXRpb25hbEljb259ICR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQgICAgPHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbil9ICR7cHJvbW9MaW5rfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvbiBzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdCAgICA8L3RkPlx0XHRcblx0XHRcdDwvdHI+YDtcbiAgICAgICAgJCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bmFtaWNSb3cpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIHVwZGF0ZSBidXR0b24gdG8gdGhlIG1vZHVsZSByb3cgZm9yIHVwZGF0aW5nIGFuIG9sZCB2ZXJzaW9uIG9mIFBCWC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBjb25zdCAkY3VycmVudFVwZGF0ZUJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICBpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRidG5VcGRhdGVBbGxNb2R1bGVzLnNob3coKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICovXG4gICAgZGVsZXRlTW9kdWxlKHBhcmFtcykge1xuICAgICAgICAvLyBBc2sgdGhlIHVzZXIgaWYgdGhleSB3YW50IHRvIGtlZXAgdGhlIHNldHRpbmdzXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybVxuICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgZW5hYmxlZCwgaWYgZW5hYmxlZCwgZGlzYWJsZSBpdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtlZXBTZXR0aW5ncyA9IGV4dGVuc2lvbk1vZHVsZXMuJGtlZXBTZXR0aW5nc0NoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNVbkluc3RhbGxNb2R1bGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzVW5JbnN0YWxsTW9kdWxlKHBhcmFtcy51bmlxaWQsIGtlZXBTZXR0aW5ncywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBjbGljayBvbiB0aGUgdXBkYXRlIGFsbCBtb2R1bGVzIGJ1dHRvblxuICAgICAqL1xuICAgIHVwZGF0ZUFsbE1vZHVsZXMoKXtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnRCdXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICRjdXJyZW50QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkY3VycmVudEJ1dHRvbi5jbG9zZXN0KCdpLmljb24nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWRvJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAgcGFyYW1zLmNoYW5uZWxJZCA9IGV4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkO1xuICAgICAgICBQYnhBcGkuTW9kdWxlc1VwZGF0ZUFsbChwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZGVsZXRpbmcgYSBtb2R1bGUuXG4gICAgICogSWYgc3VjY2Vzc2Z1bCwgcmVsb2FkIHRoZSBwYWdlOyBpZiBub3QsIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIFRoZSByZXN1bHQgb2YgdGhlIG1vZHVsZSBkZWxldGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXZWF0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyBsaXN0ZW4gdG8gcHVzaCBub3RpZmljYXRpb25zIGZyb20gYmFja2VuZFxuICAgICAqL1xuICAgIHN0YXJ0TGlzdGVuUHVzaE5vdGlmaWNhdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0IGxhc3RFdmVudElkS2V5ID0gYGxhc3RFdmVudElkYDtcbiAgICAgICAgbGV0IGxhc3RFdmVudElkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obGFzdEV2ZW50SWRLZXkpO1xuICAgICAgICBjb25zdCBzdWJQYXRoID0gbGFzdEV2ZW50SWQgPyBgL3BieGNvcmUvYXBpL25jaGFuL3N1Yi8ke2V4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkfT9sYXN0X2V2ZW50X2lkPSR7bGFzdEV2ZW50SWR9YCA6IGAvcGJ4Y29yZS9hcGkvbmNoYW4vc3ViLyR7ZXh0ZW5zaW9uTW9kdWxlcy5jaGFubmVsSWR9YDtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5ldmVudFNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZShzdWJQYXRoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmV2ZW50U291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05ldyBtZXNzYWdlOiAnLCByZXNwb25zZSk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLnByb2Nlc3NNb2R1bGVJbnN0YWxsYXRpb24ocmVzcG9uc2UpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0obGFzdEV2ZW50SWRLZXksIGUubGFzdEV2ZW50SWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFBhcnNlcyBwdXNoIGV2ZW50cyBmcm9tIGJhY2tlbmQgYW5kIHByb2Nlc3MgdGhlbVxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqL1xuICAgIHByb2Nlc3NNb2R1bGVJbnN0YWxsYXRpb24ocmVzcG9uc2Upe1xuICAgICAgICBjb25zdCBtb2R1bGVVbmlxdWVJZCA9IHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkO1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHM7XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHttb2R1bGVVbmlxdWVJZH1gKTtcbiAgICAgICAgaWYgKHN0YWdlID09PSdTdGFnZV9JX0dldFJlbGVhc2UnKXtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMSUnKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lJX0NoZWNrTGljZW5zZScpe1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCcyJScpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSUlJX0dldERvd25sb2FkTGluaycpe1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCczJScpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSVZfRG93bmxvYWRNb2R1bGUnKXtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlclJlY2VpdmVOZXdEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX1ZfSW5zdGFsbE1vZHVsZScpe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX1ZJX0VuYWJsZU1vZHVsZScpe1xuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9WSUlfRmluYWxTdGF0dXMnKXtcblxuICAgICAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5yZXN1bHQ9PT10cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IsIHN0YWdlRGV0YWlscy5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlZnJlc2ggdGhlIG1vZHVsZSBkb3dubG9hZCBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHN0YWdlRGV0YWlscyAtIFRoZSByZXNwb25zZSBvYmplY3QgY29udGFpbmluZyB0aGUgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuXG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGB0cltkYXRhLXVuaXFpZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgLy8gQ2hlY2sgbW9kdWxlIGRvd25sb2FkIHN0YXR1c1xuICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLmRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkUHJvZ3Jlc3MgPSBNYXRoLm1heChNYXRoLnJvdW5kKHBhcnNlSW50KHN0YWdlRGV0YWlscy5kYXRhLmRfc3RhdHVzX3Byb2dyZXNzLCAxMCkvMiksIDMpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KGAke2Rvd25sb2FkUHJvZ3Jlc3N9JWApO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCc1MCUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciByZWNlaXZpbmcgdGhlIG5ldyBpbnN0YWxsYXRpb24gc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzdGFnZURldGFpbHMgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGluc3RhbGxhdGlvbiBzdGF0dXMuXG4gICAgICovXG4gICAgY2JBZnRlclJlY2VpdmVOZXdJbnN0YWxsYXRpb25TdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuICAgICAgICAvLyBDaGVjayBtb2R1bGUgaW5zdGFsbGF0aW9uIHN0YXR1c1xuICAgICAgICBjb25zdCAkcm93ID0gJChgdHJbZGF0YS11bmlxaWQ9JHttb2R1bGVVbmlxdWVJZH1dYCk7XG4gICAgICAgIGlmIChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbGxhdGlvblByb2dyZXNzID0gTWF0aC5yb3VuZChwYXJzZUludChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1c19wcm9ncmVzcywgMTApLzIrNTApO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KGAke2luc3RhbGxhdGlvblByb2dyZXNzfSVgKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9DT01QTEVURScpIHtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMTAwJScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRoZSBkb3dubG9hZC91cGRhdGUgYnV0dG9uIHRvIGRlZmF1bHQgc3RhZ2VcbiAgICAgKiBAcGFyYW0gJHJvd1xuICAgICAqL1xuICAgIHJlc2V0QnV0dG9uVmlldygkcm93KXtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJHJvdy5maW5kKCdpLmxvYWRpbmcnKS5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgICRyb3cuZmluZCgnYS5kb3dubG9hZCBpJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICRyb3cuZmluZCgnYS51cGRhdGUgaScpLmFkZENsYXNzKCdyZWRvJyk7XG4gICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG1vZHVsZSBpbnN0YWxsYXRpb24gZXJyb3IgYWJvdmUgdGhlIG1vZHVsZSByb3dcbiAgICAgKiBAcGFyYW0gJHJvd1xuICAgICAqIEBwYXJhbSBoZWFkZXJcbiAgICAgKiBAcGFyYW0gbWVzc2FnZXNcbiAgICAgKi9cbiAgICBzaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgaGVhZGVyLCBtZXNzYWdlcz0nJykge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLnJlc2V0QnV0dG9uVmlldygkcm93KTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Q29uZmlnLmtleU1hbmFnZW1lbnRTaXRlfTwvYT5gO1xuICAgICAgICAgICAgbWVzc2FnZXMubGljZW5zZS5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHREZXNjcmlwdGlvbiA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZXMpO1xuICAgICAgICBjb25zdCBodG1sTWVzc2FnZT0gIGA8dHIgY2xhc3M9XCJ1aSBlcnJvciBjZW50ZXIgYWxpZ25lZCB0YWJsZS1lcnJvci1tZXNzYWdlc1wiPjx0ZCBjb2xzcGFuPVwiNFwiPjxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj48cD4ke3RleHREZXNjcmlwdGlvbn08L3A+PC9kaXY+PC90ZD48L3RyPmA7XG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICRyb3cuYmVmb3JlKGh0bWxNZXNzYWdlKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlcyB0YWJsZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=