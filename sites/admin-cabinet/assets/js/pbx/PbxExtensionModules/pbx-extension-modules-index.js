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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCIkbWFya2V0cGxhY2VMb2FkZXIiLCIkaW5zdGFsbGVkTW9kdWxlc1RhYmxlIiwiJGNoZWNrYm94ZXMiLCIkZGVsZXRlTW9kYWxGb3JtIiwiJGtlZXBTZXR0aW5nc0NoZWNrYm94IiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwicGJ4TGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJ0cmltIiwiJGJ0blVwZGF0ZUFsbE1vZHVsZXMiLCJjaGVja0JveGVzIiwiJHBvcHVwT25DbGljayIsIiR0YWJNZW51SXRlbXMiLCJldmVudFNvdXJjZSIsImNoYW5uZWxJZCIsImluaXRpYWxpemUiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJtb2RhbCIsImluaXRpYWxpemVEYXRhVGFibGUiLCJwb3B1cCIsIm9uIiwiY2xhc3NOYW1lIiwiUGJ4QXBpIiwiTW9kdWxlc0dldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwidW5pcUlkIiwiYXR0ciIsInBhZ2VTdGF0dXMiLCJQYnhFeHRlbnNpb25TdGF0dXMiLCJwdXNoIiwiaGlkZSIsInVwZGF0ZUFsbE1vZHVsZXMiLCJzdGFydExpc3RlblB1c2hOb3RpZmljYXRpb25zIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJhdXRvV2lkdGgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJyZXNwb25zZSIsIm1vZHVsZXMiLCJmb3JFYWNoIiwibWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYIiwibWluX3BieF92ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJsZW5ndGgiLCJvbGRWZXIiLCJmaW5kIiwidGV4dCIsIm5ld1ZlciIsInZlcnNpb24iLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsIiRuZXdNb2R1bGVSb3ciLCJyZW1vdmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsInNob3ciLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIiRjdXJyZW50QnV0dG9uIiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwicGFyYW1zIiwicmVsZWFzZUlkIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiTW9kdWxlc0luc3RhbGxGcm9tUmVwbyIsImNvbnNvbGUiLCJsb2ciLCJkZWxldGVNb2R1bGUiLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImNvbW1lcmNpYWwiLCJkeW5hbWljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJzaXplIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJzdGF0dXMiLCJjaGVja2JveCIsImtlZXBTZXR0aW5ncyIsIk1vZHVsZXNEaXNhYmxlTW9kdWxlIiwiTW9kdWxlc1VuSW5zdGFsbE1vZHVsZSIsImNiQWZ0ZXJEZWxldGUiLCJNb2R1bGVzVXBkYXRlQWxsIiwicmVzdWx0IiwiZXJyb3JNZXNzYWdlIiwiZGF0YSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X0RlbGV0ZU1vZHVsZUVycm9yIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJldmVyeSIsIk5hTiIsIm1hcCIsIk51bWJlciIsImkiLCJsYXN0RXZlbnRJZEtleSIsImxhc3RFdmVudElkIiwibG9jYWxTdG9yYWdlIiwiZ2V0SXRlbSIsInN1YlBhdGgiLCJFdmVudFNvdXJjZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJKU09OIiwicGFyc2UiLCJwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uIiwic2V0SXRlbSIsIm1vZHVsZVVuaXF1ZUlkIiwic3RhZ2UiLCJzdGFnZURldGFpbHMiLCIkcm93IiwiY2JBZnRlclJlY2VpdmVOZXdEb3dubG9hZFN0YXR1cyIsImNiQWZ0ZXJSZWNlaXZlTmV3SW5zdGFsbGF0aW9uU3RhdHVzIiwibWVzc2FnZXMiLCJzaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJkX3N0YXR1cyIsImRvd25sb2FkUHJvZ3Jlc3MiLCJNYXRoIiwibWF4Iiwicm91bmQiLCJwYXJzZUludCIsImRfc3RhdHVzX3Byb2dyZXNzIiwiaV9zdGF0dXMiLCJpbnN0YWxsYXRpb25Qcm9ncmVzcyIsImlfc3RhdHVzX3Byb2dyZXNzIiwicmVzZXRCdXR0b25WaWV3IiwiaGVhZGVyIiwibGljZW5zZSIsIm1hbmFnZUxpbmsiLCJsaWNfTWFuYWdlTGljZW5zZSIsIkNvbmZpZyIsImtleU1hbmFnZW1lbnRVcmwiLCJrZXlNYW5hZ2VtZW50U2l0ZSIsInRleHREZXNjcmlwdGlvbiIsImNvbnZlcnRUb1RleHQiLCJodG1sTWVzc2FnZSIsImJlZm9yZSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtB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RCxXQUFaO0FBQ0g7QUFwZ0JvQixDQUF6QixDLENBdWdCQTs7QUFDQXJMLENBQUMsQ0FBQ3VMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxTCxFQUFBQSxnQkFBZ0IsQ0FBQ3FCLFVBQWpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFBCWExpY2Vuc2UsIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgUGJ4RXh0ZW5zaW9uU3RhdHVzLCBrZXlDaGVjayAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgbGlzdCBvZiBleHRlbnNpb24gbW9kdWxlcy5cbiAqIEBjbGFzcyBleHRlbnNpb25Nb2R1bGVzXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGluZm9ybWF0aW9uIHdoZW4gbm8gYW55IG1vZHVsZXMgYXZhaWxhYmxlIHRvIGluc3RhbGwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm9OZXdNb2R1bGVzU2VnbWVudDogJCgnI25vLW5ldy1tb2R1bGVzLXNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2FkZXIgaW5zdGVhZCBvZiBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZUxvYWRlcjogJCgnI25ldy1tb2R1bGVzLWxvYWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggaW5zdGFsbGVkIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaW5zdGFsbGVkTW9kdWxlc1RhYmxlOiAkKCcjaW5zdGFsbGVkLW1vZHVsZXMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXG4gICAgJGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG5cbiAgICAka2VlcFNldHRpbmdzQ2hlY2tib3g6ICQoJyNrZWVwTW9kdWxlU2V0dGluZ3MnKSxcblxuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICBwYnhMaWNlbnNlOiBnbG9iYWxQQlhMaWNlbnNlLnRyaW0oKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gd2hpY2ggcmVzcG9uc2libGUgZm9yIHVwZGF0ZSBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRidG5VcGRhdGVBbGxNb2R1bGVzOiAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpLFxuXG4gICAgY2hlY2tCb3hlczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBpY29uIHdpdGggcG9wdXAgdGV4dFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBvcHVwT25DbGljazogJCgnaS5wb3B1cC1vbi1jbGljaycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNwYngtZXh0ZW5zaW9ucy10YWItbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogRXZlbnRTb3VyY2Ugb2JqZWN0IGZvciB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBhbmQgdXBncmFkZSBzdGF0dXNcbiAgICAgKiBAdHlwZSB7RXZlbnRTb3VyY2V9XG4gICAgICovXG4gICAgZXZlbnRTb3VyY2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBQVUIvU1VCIGNoYW5uZWwgSURcbiAgICAgKi9cbiAgICBjaGFubmVsSWQ6ICdpbnN0YWxsLW1vZHVsZScsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXMgbGlzdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRwb3B1cE9uQ2xpY2sucG9wdXAoe1xuICAgICAgICAgICAgb24gICAgOiAnY2xpY2snLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiB7XG4gICAgICAgICAgICAgICAgcG9wdXA6ICd1aSBwb3B1cCB3aWRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBQYnhBcGkuTW9kdWxlc0dldEF2YWlsYWJsZShleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRidG5VcGRhdGVBbGxNb2R1bGVzLmhpZGUoKTsgLy8gVW50aWwgYXQgbGVhc3Qgb25lIHVwZGF0ZSBhdmFpbGFibGVcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kYnRuVXBkYXRlQWxsTW9kdWxlcy5vbignY2xpY2snLCBleHRlbnNpb25Nb2R1bGVzLnVwZGF0ZUFsbE1vZHVsZXMpO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuc3RhcnRMaXN0ZW5QdXNoTm90aWZpY2F0aW9ucygpO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRpbnN0YWxsZWRNb2R1bGVzVGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTW92ZSB0aGUgXCJBZGQgTmV3XCIgYnV0dG9uIHRvIHRoZSBmaXJzdCBlaWdodC1jb2x1bW4gZGl2XG4gICAgICAgICQoJy5hZGQtbmV3JykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyB0aGUgbGlzdCBvZiBtb2R1bGVzIHJlY2VpdmVkIGZyb20gdGhlIHdlYnNpdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpc3Qgb2YgbW9kdWxlcy5cbiAgICAgKi9cbiAgICBjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRtYXJrZXRwbGFjZUxvYWRlci5oaWRlKCk7XG4gICAgICAgIHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIG1vZHVsZSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIFBCWCBiYXNlZCBvbiB2ZXJzaW9uIG51bWJlclxuICAgICAgICAgICAgY29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gZXh0ZW5zaW9uTW9kdWxlcy5wYnhWZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGFscmVhZHkgaW5zdGFsbGVkIGFuZCBvZmZlciBhbiB1cGRhdGVcbiAgICAgICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcbiAgICAgICAgICAgIGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG4gICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkbmV3TW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgICAgIGlmICgkbmV3TW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJG5ld01vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG5ld01vZHVsZVJvdy5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCd0ci5uZXctbW9kdWxlLXJvdycpLmxlbmd0aD4wKXtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG5vTmV3TW9kdWxlc1NlZ21lbnQuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbm9OZXdNb2R1bGVzU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRvd25sb2FkIGxpbmsgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnYS5kb3dubG9hZCwgYS51cGRhdGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0ICRjdXJyZW50QnV0dG9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5maW5kKCdhLmJ1dHRvbicpO1xuICAgICAgICAgICAgJGN1cnJlbnRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkY3VycmVudEJ1dHRvbi5maW5kKCdpJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZG8nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgICAgICAkY3VycmVudEJ1dHRvbi5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCcwJScpO1xuICAgICAgICAgICAgbGV0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRjdXJyZW50QnV0dG9uLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMucmVsZWFzZUlkID0gJGN1cnJlbnRCdXR0b24uYXR0cignZGF0YS1pZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmNoYW5uZWxJZCA9IGV4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkO1xuICAgICAgICAgICAgJCgndHIudGFibGUtZXJyb3ItbWVzc2FnZXMnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICQoJ3RyLmVycm9yJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy5wYnhMaWNlbnNlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0luc3RhbGxGcm9tUmVwbyhwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZGVsZXRlIGxpbmsgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnYS5kZWxldGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuZGVsZXRlTW9kdWxlKHBhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgZGVzY3JpcHRpb24gZm9yIGFuIGF2YWlsYWJsZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlVGFibGUuc2hvdygpO1xuICAgICAgICBsZXQgcHJvbW9MaW5rID0gJyc7XG4gICAgICAgIGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+JztcbiAgICAgICAgaWYgKG9iai5jb21tZXJjaWFsICE9PSAnMCcpIHtcbiAgICAgICAgICAgIGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwidWkgZG9uYXRlIGljb25cIj48L2k+JztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkeW5hbWljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwibmV3LW1vZHVsZS1yb3dcIiBpZD1cIiR7b2JqLnVuaXFpZH1cIj5cblx0XHRcdFx0XHRcdDx0ZD4ke2FkZGl0aW9uYWxJY29ufSAke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9PGJyPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbil9ICR7cHJvbW9MaW5rfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRldmVsb3Blcil9PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHZlcnNpb25cIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0ICAgIDwvdGQ+XHRcdFxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHluYW1pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgIGlmICgkY3VycmVudFVwZGF0ZUJ1dHRvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkY3VycmVudFVwZGF0ZUJ1dHRvbi5hdHRyKCdkYXRhLXZlcicpO1xuICAgICAgICAgICAgY29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvblxuICAgICAgICAgICAgPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kYnRuVXBkYXRlQWxsTW9kdWxlcy5zaG93KCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcmVxdWVzdCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcbiAgICAgICAgLy8gQXNrIHRoZSB1c2VyIGlmIHRoZXkgd2FudCB0byBrZWVwIHRoZSBzZXR0aW5nc1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cbiAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGVuYWJsZWQsIGlmIGVuYWJsZWQsIGRpc2FibGUgaXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0Rpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzVW5JbnN0YWxsTW9kdWxlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZWVwU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgY2xpY2sgb24gdGhlIHVwZGF0ZSBhbGwgbW9kdWxlcyBidXR0b25cbiAgICAgKi9cbiAgICB1cGRhdGVBbGxNb2R1bGVzKCl7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50QnV0dG9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAkY3VycmVudEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJGN1cnJlbnRCdXR0b24uY2xvc2VzdCgnaS5pY29uJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncmVkbycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuICAgICAgICBsZXQgcGFyYW1zID0ge307XG4gICAgICAgIHBhcmFtcy5jaGFubmVsSWQgPSBleHRlbnNpb25Nb2R1bGVzLmNoYW5uZWxJZDtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNVcGRhdGVBbGwocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRlbGV0aW5nIGEgbW9kdWxlLlxuICAgICAqIElmIHN1Y2Nlc3NmdWwsIHJlbG9hZCB0aGUgcGFnZTsgaWYgbm90LCBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBtb2R1bGUgZGVsZXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2hldGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG4gICAgICAgIGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTdGFydHMgbGlzdGVuIHRvIHB1c2ggbm90aWZpY2F0aW9ucyBmcm9tIGJhY2tlbmRcbiAgICAgKi9cbiAgICBzdGFydExpc3RlblB1c2hOb3RpZmljYXRpb25zKCkge1xuICAgICAgICBjb25zdCBsYXN0RXZlbnRJZEtleSA9IGBsYXN0RXZlbnRJZGA7XG4gICAgICAgIGxldCBsYXN0RXZlbnRJZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGxhc3RFdmVudElkS2V5KTtcbiAgICAgICAgY29uc3Qgc3ViUGF0aCA9IGxhc3RFdmVudElkID8gYC9wYnhjb3JlL2FwaS9uY2hhbi9zdWIvJHtleHRlbnNpb25Nb2R1bGVzLmNoYW5uZWxJZH0/bGFzdF9ldmVudF9pZD0ke2xhc3RFdmVudElkfWAgOiBgL3BieGNvcmUvYXBpL25jaGFuL3N1Yi8ke2V4dGVuc2lvbk1vZHVsZXMuY2hhbm5lbElkfWA7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuZXZlbnRTb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2Uoc3ViUGF0aCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5ldmVudFNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UoZS5kYXRhKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOZXcgbWVzc2FnZTogJywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5wcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGxhc3RFdmVudElkS2V5LCBlLmxhc3RFdmVudElkKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBQYXJzZXMgcHVzaCBldmVudHMgZnJvbSBiYWNrZW5kIGFuZCBwcm9jZXNzIHRoZW1cbiAgICAgKiBAcGFyYW0gcmVzcG9uc2VcbiAgICAgKi9cbiAgICBwcm9jZXNzTW9kdWxlSW5zdGFsbGF0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSByZXNwb25zZS5tb2R1bGVVbmlxdWVJZDtcbiAgICAgICAgY29uc3Qgc3RhZ2UgPSByZXNwb25zZS5zdGFnZTtcbiAgICAgICAgY29uc3Qgc3RhZ2VEZXRhaWxzID0gcmVzcG9uc2Uuc3RhZ2VEZXRhaWxzO1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7bW9kdWxlVW5pcXVlSWR9YCk7XG4gICAgICAgIGlmIChzdGFnZSA9PT0nU3RhZ2VfSV9HZXRSZWxlYXNlJyl7XG4gICAgICAgICAgICAkcm93LmZpbmQoJ3NwYW4ucGVyY2VudCcpLnRleHQoJzElJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9JSV9DaGVja0xpY2Vuc2UnKXtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMiUnKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lJSV9HZXREb3dubG9hZExpbmsnKXtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMyUnKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZSA9PT0gJ1N0YWdlX0lWX0Rvd25sb2FkTW9kdWxlJyl7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJSZWNlaXZlTmV3RG93bmxvYWRTdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9WX0luc3RhbGxNb2R1bGUnKXtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlclJlY2VpdmVOZXdJbnN0YWxsYXRpb25TdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscyk7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhZ2UgPT09ICdTdGFnZV9WSV9FbmFibGVNb2R1bGUnKXtcblxuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlID09PSAnU3RhZ2VfVklJX0ZpbmFsU3RhdHVzJyl7XG5cbiAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMucmVzdWx0PT09dHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChzdGFnZURldGFpbHMubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLnNob3dNb2R1bGVJbnN0YWxsYXRpb25FcnJvcigkcm93LCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yLCBzdGFnZURldGFpbHMubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuc2hvd01vZHVsZUluc3RhbGxhdGlvbkVycm9yKCRyb3csIGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byByZWZyZXNoIHRoZSBtb2R1bGUgZG93bmxvYWQgc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzdGFnZURldGFpbHMgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGRvd25sb2FkIHN0YXR1cy5cbiAgICAgKi9cbiAgICBjYkFmdGVyUmVjZWl2ZU5ld0Rvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlkLCBzdGFnZURldGFpbHMpIHtcblxuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7bW9kdWxlVW5pcXVlSWR9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgbW9kdWxlIGRvd25sb2FkIHN0YXR1c1xuICAgICAgICBpZiAoc3RhZ2VEZXRhaWxzLmRhdGEuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGRvd25sb2FkUHJvZ3Jlc3MgPSBNYXRoLm1heChNYXRoLnJvdW5kKHBhcnNlSW50KHN0YWdlRGV0YWlscy5kYXRhLmRfc3RhdHVzX3Byb2dyZXNzLCAxMCkvMiksIDMpO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KGAke2Rvd25sb2FkUHJvZ3Jlc3N9JWApO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YWdlRGV0YWlscy5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KCc1MCUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciByZWNlaXZpbmcgdGhlIG5ldyBpbnN0YWxsYXRpb24gc3RhdHVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2R1bGVVbmlxdWVJZFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzdGFnZURldGFpbHMgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGluc3RhbGxhdGlvbiBzdGF0dXMuXG4gICAgICovXG4gICAgY2JBZnRlclJlY2VpdmVOZXdJbnN0YWxsYXRpb25TdGF0dXMobW9kdWxlVW5pcXVlSWQsIHN0YWdlRGV0YWlscykge1xuICAgICAgICAvLyBDaGVjayBtb2R1bGUgaW5zdGFsbGF0aW9uIHN0YXR1c1xuICAgICAgICBjb25zdCAkcm93ID0gJChgIyR7bW9kdWxlVW5pcXVlSWR9YCk7XG4gICAgICAgIGlmIChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9JTl9QUk9HUkVTUycpIHtcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbGxhdGlvblByb2dyZXNzID0gTWF0aC5yb3VuZChwYXJzZUludChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1c19wcm9ncmVzcywgMTApLzIrNTApO1xuICAgICAgICAgICAgJHJvdy5maW5kKCdzcGFuLnBlcmNlbnQnKS50ZXh0KGAke2luc3RhbGxhdGlvblByb2dyZXNzfSVgKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGFnZURldGFpbHMuZGF0YS5pX3N0YXR1cyA9PT0gJ0lOU1RBTExBVElPTl9DT01QTEVURScpIHtcbiAgICAgICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnMTAwJScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRoZSBkb3dubG9hZC91cGRhdGUgYnV0dG9uIHRvIGRlZmF1bHQgc3RhZ2VcbiAgICAgKiBAcGFyYW0gJHJvd1xuICAgICAqL1xuICAgIHJlc2V0QnV0dG9uVmlldygkcm93KXtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJHJvdy5maW5kKCdpLmxvYWRpbmcnKS5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG4gICAgICAgICRyb3cuZmluZCgnYS5kb3dubG9hZCBpJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICRyb3cuZmluZCgnYS51cGRhdGUgaScpLmFkZENsYXNzKCdyZWRvJyk7XG4gICAgICAgICRyb3cuZmluZCgnc3Bhbi5wZXJjZW50JykudGV4dCgnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3dzIG1vZHVsZSBpbnN0YWxsYXRpb24gZXJyb3IgYWJvdmUgdGhlIG1vZHVsZSByb3dcbiAgICAgKiBAcGFyYW0gJHJvd1xuICAgICAqIEBwYXJhbSBoZWFkZXJcbiAgICAgKiBAcGFyYW0gbWVzc2FnZXNcbiAgICAgKi9cbiAgICBzaG93TW9kdWxlSW5zdGFsbGF0aW9uRXJyb3IoJHJvdywgaGVhZGVyLCBtZXNzYWdlcz0nJykge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLnJlc2V0QnV0dG9uVmlldygkcm93KTtcbiAgICAgICAgaWYgKG1lc3NhZ2VzLmxpY2Vuc2UhPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlTGluayA9IGA8YnI+JHtnbG9iYWxUcmFuc2xhdGUubGljX01hbmFnZUxpY2Vuc2V9IDxhIGhyZWY9XCIke0NvbmZpZy5rZXlNYW5hZ2VtZW50VXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Q29uZmlnLmtleU1hbmFnZW1lbnRTaXRlfTwvYT5gO1xuICAgICAgICAgICAgbWVzc2FnZXMubGljZW5zZS5wdXNoKG1hbmFnZUxpbmspO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHREZXNjcmlwdGlvbiA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQobWVzc2FnZXMpO1xuICAgICAgICBjb25zdCBodG1sTWVzc2FnZT0gIGA8dHIgY2xhc3M9XCJ1aSBlcnJvciBjZW50ZXIgYWxpZ25lZCB0YWJsZS1lcnJvci1tZXNzYWdlc1wiPjx0ZCBjb2xzcGFuPVwiNFwiPjxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke2hlYWRlcn08L2Rpdj48cD4ke3RleHREZXNjcmlwdGlvbn08L3A+PC9kaXY+PC90ZD48L3RyPmA7XG4gICAgICAgICRyb3cuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICRyb3cuYmVmb3JlKGh0bWxNZXNzYWdlKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlcyB0YWJsZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=