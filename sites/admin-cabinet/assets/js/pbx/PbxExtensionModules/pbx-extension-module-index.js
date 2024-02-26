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


      var $moduleRow = $("tr.module-row#".concat(obj.uniqid));

      if ($moduleRow.length > 0) {
        var oldVer = $moduleRow.find('td.version').text();
        var newVer = obj.version;

        if (extensionModules.versionCompare(newVer, oldVer) > 0) {
          extensionModules.addUpdateButtonToRow(obj);
        }
      } else {
        var $newModuleRow = $("tr.new-module-row#".concat(obj.uniqid));

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


    $('a.download, a.update').on('click', function (e) {
      e.preventDefault();
      $('a.button').addClass('disabled');
      var $currentButton = $(e.target).closest('tr').find('a.button');
      $currentButton.removeClass('disabled');
      $currentButton.find('i').removeClass('download').removeClass('redo').addClass('spinner loading');
      $currentButton.find('span.percent').text('0%');
      var params = {};
      params.uniqid = $currentButton.attr('data-uniqid');
      params.releaseId = $currentButton.attr('data-id');
      params.channelId = extensionModules.channelId;
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
      params.uniqid = $(e.target).closest('tr').attr('id');
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

    var dynamicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui icon basic button download popuped disable-if-no-internet\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t    </td>\t\t\n\t\t\t</tr>");
    $('#new-modules-table tbody').append(dynamicRow);
  },

  /**
   * Adds an update button to the module row for updating an old version of PBX.
   * @param {Object} obj - The module object containing information.
   */
  addUpdateButtonToRow: function addUpdateButtonToRow(obj) {
    var $moduleRow = $("tr.module-row#".concat(obj.uniqid));
    var $currentUpdateButton = $moduleRow.find('a.download');

    if ($currentUpdateButton.length > 0) {
      var oldVer = $currentUpdateButton.attr('data-ver');
      var newVer = obj.version;

      if (extensionModules.versionCompare(newVer, oldVer) <= 0) {
        return;
      }
    }

    $currentUpdateButton.remove();
    var dynamicButton = "<a href=\"#\" class=\"ui basic button update popuped disable-if-no-internet\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-ver =\"").concat(obj.version, "\"\n\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t<span class=\"percent\"></span>\n\t\t\t</a>");
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
   * @param {boolean} [options.zeroExtend] - Whether to zero-extend the shorter version (default: false).
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
    var $row = $("#".concat(moduleUniqueId)); // Check module download status

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
    var $row = $("#".concat(moduleUniqueId));

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluZGV4LmpzIl0sIm5hbWVzIjpbImV4dGVuc2lvbk1vZHVsZXMiLCIkbWFya2V0cGxhY2VUYWJsZSIsIiQiLCIkbm9OZXdNb2R1bGVzU2VnbWVudCIsIiRtYXJrZXRwbGFjZUxvYWRlciIsIiRpbnN0YWxsZWRNb2R1bGVzVGFibGUiLCIkY2hlY2tib3hlcyIsIiRkZWxldGVNb2RhbEZvcm0iLCIka2VlcFNldHRpbmdzQ2hlY2tib3giLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJwYnhMaWNlbnNlIiwiZ2xvYmFsUEJYTGljZW5zZSIsInRyaW0iLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImNoZWNrQm94ZXMiLCIkcG9wdXBPbkNsaWNrIiwiJHRhYk1lbnVJdGVtcyIsImV2ZW50U291cmNlIiwiY2hhbm5lbElkIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsInBvcHVwIiwib24iLCJjbGFzc05hbWUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJoaWRlIiwidXBkYXRlQWxsTW9kdWxlcyIsInN0YXJ0TGlzdGVuUHVzaE5vdGlmaWNhdGlvbnMiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwic2hvdyIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiJGN1cnJlbnRCdXR0b24iLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJwYXJhbXMiLCJyZWxlYXNlSWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJNb2R1bGVzSW5zdGFsbEZyb21SZXBvIiwiY29uc29sZSIsImxvZyIsImRlbGV0ZU1vZHVsZSIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsImR5bmFtaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsInNpemUiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJGN1cnJlbnRVcGRhdGVCdXR0b24iLCJkeW5hbWljQnV0dG9uIiwiZXh0X1VwZGF0ZU1vZHVsZSIsInByZXBlbmQiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsInN0YXR1cyIsImNoZWNrYm94Iiwia2VlcFNldHRpbmdzIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJNb2R1bGVzVW5JbnN0YWxsTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsIk1vZHVsZXNVcGRhdGVBbGwiLCJyZXN1bHQiLCJlcnJvck1lc3NhZ2UiLCJkYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImxhc3RFdmVudElkS2V5IiwibGFzdEV2ZW50SWQiLCJsb2NhbFN0b3JhZ2UiLCJnZXRJdGVtIiwic3ViUGF0aCIsIkV2ZW50U291cmNlIiwiYWRkRXZlbnRMaXN0ZW5lciIsIkpTT04iLCJwYXJzZSIsInByb2Nlc3NNb2R1bGVJbnN0YWxsYXRpb24iLCJzZXRJdGVtIiwibW9kdWxlVW5pcXVlSWQiLCJzdGFnZSIsInN0YWdlRGV0YWlscyIsIiRyb3ciLCJjYkFmdGVyUmVjZWl2ZU5ld0Rvd25sb2FkU3RhdHVzIiwiY2JBZnRlclJlY2VpdmVOZXdJbnN0YWxsYXRpb25TdGF0dXMiLCJtZXNzYWdlcyIsInNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvciIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImRfc3RhdHVzIiwiZG93bmxvYWRQcm9ncmVzcyIsIk1hdGgiLCJtYXgiLCJyb3VuZCIsInBhcnNlSW50IiwiZF9zdGF0dXNfcHJvZ3Jlc3MiLCJpX3N0YXR1cyIsImluc3RhbGxhdGlvblByb2dyZXNzIiwiaV9zdGF0dXNfcHJvZ3Jlc3MiLCJyZXNldEJ1dHRvblZpZXciLCJoZWFkZXIiLCJsaWNlbnNlIiwibWFuYWdlTGluayIsImxpY19NYW5hZ2VMaWNlbnNlIiwiQ29uZmlnIiwia2V5TWFuYWdlbWVudFVybCIsImtleU1hbmFnZW1lbnRTaXRlIiwidGV4dERlc2NyaXB0aW9uIiwiY29udmVydFRvVGV4dCIsImh0bWxNZXNzYWdlIiwiYmVmb3JlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FB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LFdBQVo7QUFDSDtBQXBnQm9CLENBQXpCLEMsQ0F1Z0JBOztBQUNBckwsQ0FBQyxDQUFDdUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFMLEVBQUFBLGdCQUFnQixDQUFDcUIsVUFBakI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMsIGtleUNoZWNrICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBsaXN0IG9mIGV4dGVuc2lvbiBtb2R1bGVzLlxuICogQGNsYXNzIGV4dGVuc2lvbk1vZHVsZXNcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VUYWJsZTogJCgnI25ldy1tb2R1bGVzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpbnN0YWxsZWRNb2R1bGVzVGFibGU6ICQoJyNpbnN0YWxsZWQtbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblxuICAgICRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIHBieExpY2Vuc2U6IGdsb2JhbFBCWExpY2Vuc2UudHJpbSgpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGJ1dHRvbiB3aGljaCByZXNwb25zaWJsZSBmb3IgdXBkYXRlIGFsbCBpbnN0YWxsZWQgbW9kdWxlc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJ0blVwZGF0ZUFsbE1vZHVsZXM6ICQoJyN1cGRhdGUtYWxsLW1vZHVsZXMtYnV0dG9uJyksXG5cbiAgICBjaGVja0JveGVzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIGljb24gd2l0aCBwb3B1cCB0ZXh0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcG9wdXBPbkNsaWNrOiAkKCdpLnBvcHVwLW9uLWNsaWNrJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI3BieC1leHRlbnNpb25zLXRhYi1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBFdmVudFNvdXJjZSBvYmplY3QgZm9yIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGFuZCB1cGdyYWRlIHN0YXR1c1xuICAgICAqIEB0eXBlIHtFdmVudFNvdXJjZX1cbiAgICAgKi9cbiAgICBldmVudFNvdXJjZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFBVQi9TVUIgY2hhbm5lbCBJRFxuICAgICAqL1xuICAgIGNoYW5uZWxJZDogJ2luc3RhbGwtbW9kdWxlJyxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uTW9kdWxlcyBsaXN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJHBvcHVwT25DbGljay5wb3B1cCh7XG4gICAgICAgICAgICBvbiAgICA6ICdjbGljaycsXG4gICAgICAgICAgICBjbGFzc05hbWU6IHtcbiAgICAgICAgICAgICAgICBwb3B1cDogJ3VpIHBvcHVwIHdpZGUnXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIFBieEFwaS5Nb2R1bGVzR2V0QXZhaWxhYmxlKGV4dGVuc2lvbk1vZHVsZXMuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuICAgICAgICAgICAgcGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGJ0blVwZGF0ZUFsbE1vZHVsZXMuaGlkZSgpOyAvLyBVbnRpbCBhdCBsZWFzdCBvbmUgdXBkYXRlIGF2YWlsYWJsZVxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRidG5VcGRhdGVBbGxNb2R1bGVzLm9uKCdjbGljaycsIGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlQWxsTW9kdWxlcyk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5zdGFydExpc3RlblB1c2hOb3RpZmljYXRpb25zKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGluc3RhbGxlZE1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXZcbiAgICAgICAgJCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoPjApe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZG93bmxvYWQgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLmRvd25sb2FkLCBhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgJGN1cnJlbnRCdXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmZpbmQoJ2EuYnV0dG9uJyk7XG4gICAgICAgICAgICAkY3VycmVudEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICRjdXJyZW50QnV0dG9uLmZpbmQoJ2knKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZG93bmxvYWQnKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncmVkbycpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcbiAgICAgICAgICAgICRjdXJyZW50QnV0dG9uLmZpbmQoJ3NwYW4ucGVyY2VudCcpLnRleHQoJzAlJyk7XG4gICAgICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGN1cnJlbnRCdXR0b24uYXR0cignZGF0YS11bmlxaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5yZWxlYXNlSWQgPSAkY3VycmVudEJ1dHRvbi5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuY2hhbm5lbElkID0gZXh0ZW5zaW9uTW9kdWxlcy5jaGFubmVsSWQ7XG4gICAgICAgICAgICAkKCd0ci50YWJsZS1lcnJvci1tZXNzYWdlcycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgJCgndHIuZXJyb3InKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25Nb2R1bGVzLnBieExpY2Vuc2UgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzSW5zdGFsbEZyb21SZXBvKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSBkZWxldGUgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLmRlbGV0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgnYScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5kZWxldGVNb2R1bGUocGFyYW1zKTtcbiAgICAgICAgfSk7XG4gICAgICAgICQoJ2FbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBkZXNjcmlwdGlvbiBmb3IgYW4gYXZhaWxhYmxlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbWFya2V0cGxhY2VUYWJsZS5zaG93KCk7XG4gICAgICAgIGxldCBwcm9tb0xpbmsgPSAnJztcbiAgICAgICAgaWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4nO1xuICAgICAgICBpZiAob2JqLmNvbW1lcmNpYWwgIT09ICcwJykge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJ1aSBkb25hdGUgaWNvblwiPjwvaT4nO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGR5bmFtaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7YWRkaXRpb25hbEljb259ICR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gYmFzaWMgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2E+XG4gICAgXHRcdFx0XHQgICAgPC90ZD5cdFx0XG5cdFx0XHQ8L3RyPmA7XG4gICAgICAgICQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW5hbWljUm93KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiB1cGRhdGUgYnV0dG9uIHRvIHRoZSBtb2R1bGUgcm93IGZvciB1cGRhdGluZyBhbiBvbGQgdmVyc2lvbiBvZiBQQlguXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnRVcGRhdGVCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EuZG93bmxvYWQnKTtcbiAgICAgICAgaWYgKCRjdXJyZW50VXBkYXRlQnV0dG9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRjdXJyZW50VXBkYXRlQnV0dG9uLmF0dHIoJ2RhdGEtdmVyJyk7XG4gICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRjdXJyZW50VXBkYXRlQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcblx0XHRcdGRhdGEtdmVyID1cIiR7b2JqLnZlcnNpb259XCJcblx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRidG5VcGRhdGVBbGxNb2R1bGVzLnNob3coKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICovXG4gICAgZGVsZXRlTW9kdWxlKHBhcmFtcykge1xuICAgICAgICAvLyBBc2sgdGhlIHVzZXIgaWYgdGhleSB3YW50IHRvIGtlZXAgdGhlIHNldHRpbmdzXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybVxuICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgZW5hYmxlZCwgaWYgZW5hYmxlZCwgZGlzYWJsZSBpdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtlZXBTZXR0aW5ncyA9IGV4dGVuc2lvbk1vZHVsZXMuJGtlZXBTZXR0aW5nc0NoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNVbkluc3RhbGxNb2R1bGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzVW5JbnN0YWxsTW9kdWxlKHBhcmFtcy51bmlxaWQsIGtlZXBTZXR0aW5ncywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBjbGljayBvbiB0aGUgdXBkYXRlIGFsbCBtb2R1bGVzIGJ1dHRvblxuICAgICAqL1xuICAgIHVwZGF0ZUFsbE1vZHVsZXMoKXtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnRCdXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICRjdXJyZW50QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkY3VycmVudEJ1dHRvbi5jbG9zZXN0KCdpLmljb24nKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWRvJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgIGxldCBwYXJhbXMgPSB7fTtcbiAgICAgICAgcGFyYW1zLmNoYW5uZWxJZCA9IGV4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkO1xuICAgICAgICBQYnhBcGkuTW9kdWxlc1VwZGF0ZUFsbChwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2cocmVzcG9uc2UpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZGVsZXRpbmcgYSBtb2R1bGUuXG4gICAgICogSWYgc3VjY2Vzc2Z1bCwgcmVsb2FkIHRoZSBwYWdlOyBpZiBub3QsIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIFRoZSByZXN1bHQgb2YgdGhlIG1vZHVsZSBkZWxldGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXaGV0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFN0YXJ0cyBsaXN0ZW4gdG8gcHVzaCBub3RpZmljYXRpb25zIGZyb20gYmFja2VuZFxuICAgICAqL1xuICAgIHN0YXJ0TGlzdGVuUHVzaE5vdGlmaWNhdGlvbnMoKSB7XG4gICAgICAgIGNvbnN0IGxhc3RFdmVudElkS2V5ID0gYGxhc3RFdmVudElkYDtcbiAgICAgICAgbGV0IGxhc3RFdmVudElkID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0obGFzdEV2ZW50SWRLZXkpO1xuICAgICAgICBjb25zdCBzdWJQYXRoID0gbGFzdEV2ZW50SWQgPyBgL3BieGNvcmUvYXBpL25jaGFuL3N1Yi8ke2V4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkfT9sYXN0X2V2ZW50X2lkPSR7bGFzdEV2ZW50SWR9YCA6IGAvcGJ4Y29yZS9hcGkvbmNoYW4vc3ViLyR7ZXh0ZW5zaW9uTW9kdWxlcy5jaGFubmVsSWR9YDtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5ldmVudFNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZShzdWJQYXRoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmV2ZW50U291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBlID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShlLmRhdGEpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05ldyBtZXNzYWdlOiAnLCByZXNwb25zZSk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLnByb2Nlc3NNb2R1bGVJbnN0YWxsYXRpb24ocmVzcG9uc2UpO1xuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0obGFzdEV2ZW50SWRLZXksIGUubGFzdEV2ZW50SWQpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFBhcnNlcyBwdXNoIGV2ZW50cyBmcm9tIGJhY2tlbmQgYW5kIHByb2Nlc3MgdGhlbVxuICAgICAqIEBwYXJhbSByZXNwb25zZVxuICAgICAqL1xuICAgIHByb2Nlc3NNb2R1bGVJbnN0YWxsYXRpb24ocmVzcG9uc2Upe1xuICAgICAgICBjb25zdCBtb2R1bGVVbmlxdWVJZCA9IHJlc3BvbnNlLm1vZHVsZVVuaXF1ZUlkO1xuICAgICAgICBjb25zdCBzdGFnZSA9IHJlc3BvbnNlLnN0YWdlO1xuICAgICAgICBjb25zdCBzdGFnZURldGFpbHMgPSByZXNwb25zZS5zdGFnZURldGFpbHM7XG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHttb2R1bGVVbmlxdWVJZH1gKTtcbiAgICAgICAgaWYgKHN0YWdlID09PSdTdGFnZV9JX0dldFJlbGVhc2UnKXtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMSUnKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lJX0NoZWNrTGljZW5zZScpe1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCcyJScpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSUlJX0dldERvd25sb2FkTGluaycpe1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCczJScpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfSVZfRG93bmxvYWRNb2R1bGUnKXtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlclJlY2VpdmVOZXdEb3dubG9hZFN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX1ZfSW5zdGFsbE1vZHVsZScpe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX1ZJX0VuYWJsZU1vZHVsZScpe1xuXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9WSUlfRmluYWxTdGF0dXMnKXtcblxuICAgICAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5yZXN1bHQ9PT10cnVlKXtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IsIHN0YWdlRGV0YWlscy5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5zaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHJlZnJlc2ggdGhlIG1vZHVsZSBkb3dubG9hZCBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHN0YWdlRGV0YWlscyAtIFRoZSByZXNwb25zZSBvYmplY3QgY29udGFpbmluZyB0aGUgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuXG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHttb2R1bGVVbmlxdWVJZH1gKTtcblxuICAgICAgICAvLyBDaGVjayBtb2R1bGUgZG93bmxvYWQgc3RhdHVzXG4gICAgICAgIGlmIChzdGFnZURldGFpbHMuZGF0YS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuICAgICAgICAgICAgY29uc3QgZG93bmxvYWRQcm9ncmVzcyA9IE1hdGgubWF4KE1hdGgucm91bmQocGFyc2VJbnQoc3RhZ2VEZXRhaWxzLmRhdGEuZF9zdGF0dXNfcHJvZ3Jlc3MsIDEwKS8yKSwgMyk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4ucGVyY2VudCcpLnRleHQoYCR7ZG93bmxvYWRQcm9ncmVzc30lYCk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2VEZXRhaWxzLmRfc3RhdHVzID09PSAnRE9XTkxPQURfQ09NUExFVEUnKSB7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4ucGVyY2VudCcpLnRleHQoJzUwJScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHJlY2VpdmluZyB0aGUgbmV3IGluc3RhbGxhdGlvbiBzdGF0dXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZHVsZVVuaXF1ZUlkXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHN0YWdlRGV0YWlscyAtIFRoZSByZXNwb25zZSBvYmplY3QgY29udGFpbmluZyB0aGUgaW5zdGFsbGF0aW9uIHN0YXR1cy5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVjZWl2ZU5ld0luc3RhbGxhdGlvblN0YXR1cyhtb2R1bGVVbmlxdWVJZCwgc3RhZ2VEZXRhaWxzKSB7XG4gICAgICAgIC8vIENoZWNrIG1vZHVsZSBpbnN0YWxsYXRpb24gc3RhdHVzXG4gICAgICAgIGNvbnN0ICRyb3cgPSAkKGAjJHttb2R1bGVVbmlxdWVJZH1gKTtcbiAgICAgICAgaWYgKHN0YWdlRGV0YWlscy5kYXRhLmlfc3RhdHVzID09PSAnSU5TVEFMTEFUSU9OX0lOX1BST0dSRVNTJykge1xuICAgICAgICAgICAgY29uc3QgaW5zdGFsbGF0aW9uUHJvZ3Jlc3MgPSBNYXRoLnJvdW5kKHBhcnNlSW50KHN0YWdlRGV0YWlscy5kYXRhLmlfc3RhdHVzX3Byb2dyZXNzLCAxMCkvMis1MCk7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4ucGVyY2VudCcpLnRleHQoYCR7aW5zdGFsbGF0aW9uUHJvZ3Jlc3N9JWApO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5kYXRhLmlfc3RhdHVzID09PSAnSU5TVEFMTEFUSU9OX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCcxMDAlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgdGhlIGRvd25sb2FkL3VwZGF0ZSBidXR0b24gdG8gZGVmYXVsdCBzdGFnZVxuICAgICAqIEBwYXJhbSAkcm93XG4gICAgICovXG4gICAgcmVzZXRCdXR0b25WaWV3KCRyb3cpe1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkcm93LmZpbmQoJ2kubG9hZGluZycpLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcbiAgICAgICAgJHJvdy5maW5kKCdhLmRvd25sb2FkIGknKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgJHJvdy5maW5kKCdhLnVwZGF0ZSBpJykuYWRkQ2xhc3MoJ3JlZG8nKTtcbiAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgbW9kdWxlIGluc3RhbGxhdGlvbiBlcnJvciBhYm92ZSB0aGUgbW9kdWxlIHJvd1xuICAgICAqIEBwYXJhbSAkcm93XG4gICAgICogQHBhcmFtIGhlYWRlclxuICAgICAqIEBwYXJhbSBtZXNzYWdlc1xuICAgICAqL1xuICAgIHNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcigkcm93LCBoZWFkZXIsIG1lc3NhZ2VzPScnKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMucmVzZXRCdXR0b25WaWV3KCRyb3cpO1xuICAgICAgICBpZiAobWVzc2FnZXMubGljZW5zZSE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VMaW5rID0gYDxicj4ke2dsb2JhbFRyYW5zbGF0ZS5saWNfTWFuYWdlTGljZW5zZX0gPGEgaHJlZj1cIiR7Q29uZmlnLmtleU1hbmFnZW1lbnRVcmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtDb25maWcua2V5TWFuYWdlbWVudFNpdGV9PC9hPmA7XG4gICAgICAgICAgICBtZXNzYWdlcy5saWNlbnNlLnB1c2gobWFuYWdlTGluayk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdGV4dERlc2NyaXB0aW9uID0gVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChtZXNzYWdlcyk7XG4gICAgICAgIGNvbnN0IGh0bWxNZXNzYWdlPSAgYDx0ciBjbGFzcz1cInVpIGVycm9yIGNlbnRlciBhbGlnbmVkIHRhYmxlLWVycm9yLW1lc3NhZ2VzXCI+PHRkIGNvbHNwYW49XCI0XCI+PGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7aGVhZGVyfTwvZGl2PjxwPiR7dGV4dERlc2NyaXB0aW9ufTwvcD48L2Rpdj48L3RkPjwvdHI+YDtcbiAgICAgICAgJHJvdy5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgJHJvdy5iZWZvcmUoaHRtbE1lc3NhZ2UpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIHRhYmxlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==