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

/* global globalRootUrl, PbxApi, globalPBXLicense, globalTranslate, UserMessage, globalPBXVersion, SemanticLocalization, upgradeStatusLoopWorker, PbxExtensionStatus */

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
  checkBoxes: [],

  /**
   * jQuery object for the tabular menu.
   * @type {jQuery}
   */
  $tabMenuItems: $('#pbx-extensions-tab-menu .item'),

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
    PbxApi.ModulesGetAvailable(extensionModules.cbParseModuleUpdates);
    extensionModules.$checkboxes.each(function (index, obj) {
      var uniqId = $(obj).attr('data-value');
      var pageStatus = new PbxExtensionStatus();
      pageStatus.initialize(uniqId, false);
      extensionModules.checkBoxes.push(pageStatus);
    });
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
    /**
     * Event handler for the download link click event.
     * @param {Event} e - The click event object.
     */

    $('a.download').on('click', function (e) {
      e.preventDefault();
      $('a.button').addClass('disabled');
      var params = {};
      var $aLink = $(e.target).closest('a');
      $aLink.removeClass('disabled');
      params.uniqid = $aLink.attr('data-uniqid');
      params.releaseId = $aLink.attr('data-id');
      params.size = $aLink.attr('data-size');
      params.licProductId = $aLink.attr('data-productid');
      params.licFeatureId = $aLink.attr('data-featureid');
      params.action = 'install';
      params.aLink = $aLink;

      if (extensionModules.pbxLicense === '') {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index#/licensing");
      } else {
        PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
      }
    });
    /**
     * Event handler for the update link click event.
     * @param {Event} e - The click event object.
     */

    $('a.update').on('click', function (e) {
      e.preventDefault();
      $('a.button').addClass('disabled');
      var params = {};
      var $aLink = $(e.target).closest('a');
      $aLink.removeClass('disabled');
      params.licProductId = $aLink.attr('data-productid');
      params.licFeatureId = $aLink.attr('data-featureid');
      params.action = 'update';
      params.releaseId = $aLink.attr('data-id');
      params.uniqid = $aLink.attr('data-uniqid');
      params.size = $aLink.attr('data-size');
      params.aLink = $aLink;

      if (extensionModules.pbxLicense === '') {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index#/licensing");
      } else {
        PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
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
      var params = [];
      var $aLink = $(e.target).closest('tr');
      params.uniqid = $aLink.attr('id');
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

    var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui button download disable-if-no-internet\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\t\t\t\t\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>");
    $('#new-modules-table tbody').append(dymanicRow);
  },

  /**
   * Adds an update button to the module row for updating an old version of PBX.
   * @param {Object} obj - The module object containing information.
   */
  addUpdateButtonToRow: function addUpdateButtonToRow(obj) {
    var $moduleRow = $("tr.module-row#".concat(obj.uniqid));
    var $currentUpdateButton = $moduleRow.find('a.update');

    if ($currentUpdateButton.length > 0) {
      var oldVer = $currentUpdateButton.attr('data-ver');
      var newVer = obj.version;

      if (extensionModules.versionCompare(newVer, oldVer) <= 0) {
        return;
      }
    }

    $currentUpdateButton.remove();
    var dynamicButton = "<a href=\"#\" class=\"ui button update popuped disable-if-no-internet\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-ver =\"").concat(obj.version, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t<span class=\"percent\"></span>\n\t\t\t</a>");
    $moduleRow.find('.action-buttons').prepend(dynamicButton);
  },

  /**
   * Callback function after checking the license.
   * If the feature is captured, it makes a request to the server
   * to get the module installation link.
   * @param {Object} params - The parameters for the request.
   * @param {boolean} result - The result of the license check.
   */
  cbAfterLicenseCheck: function cbAfterLicenseCheck(params, result) {
    if (result === true) {
      PbxApi.ModulesGetModuleLink(params, extensionModules.cbGetModuleInstallLinkSuccess, extensionModules.cbGetModuleInstallLinkFailure);
    } else if (result === false && params.length > 0) {
      UserMessage.showMultiString(params);
      $('a.button').removeClass('disabled');
    } else {
      UserMessage.showMultiString(globalTranslate.ext_NoLicenseAvailable);
      $('a.button').removeClass('disabled');
    }
  },

  /**
   * Callback function after successfully obtaining the module installation link from the website.
   * @param {Object} params - The parameters for the request.
   * @param {Object} response - The response containing the module information.
   */
  cbGetModuleInstallLinkSuccess: function cbGetModuleInstallLinkSuccess(params, response) {
    var newParams = params;
    response.modules.forEach(function (obj) {
      newParams.md5 = obj.md5;
      newParams.updateLink = obj.href;

      if (newParams.action === 'update') {
        params.aLink.find('i').addClass('loading');
      } else {
        params.aLink.find('i').addClass('loading redo').removeClass('download');
      }

      extensionModules.installModule(newParams);
    });
  },

  /**
   * Callback function when the website fails to provide the module installation link due to the required feature not being captured.
   * @param {Object} params - The parameters for the request.
   */
  cbGetModuleInstallLinkFailure: function cbGetModuleInstallLinkFailure(params) {
    $('a.button').removeClass('disabled');

    if (params.action === 'update') {
      params.aLink.find('i').removeClass('loading');
    } else {
      params.aLink.find('i').removeClass('loading redo').addClass('download');
    }

    UserMessage.showMultiString(globalTranslate.ext_GetLinkError);
  },

  /**
   * Install a module.
   * @param {Object} params - The request parameters.
   */
  installModule: function installModule(params) {
    PbxApi.ModulesModuleStartDownload(params, function (response) {
      if (response === true) {
        upgradeStatusLoopWorker.initialize(params.uniqid);
      } else {
        if (response.messages !== undefined) {
          UserMessage.showMultiString(response.messages);
        } else {
          UserMessage.showMultiString(globalTranslate.ext_InstallationError);
        }

        params.aLink.removeClass('disabled');

        if (params.action === 'update') {
          params.aLink.find('i').removeClass('loading');
        } else {
          params.aLink.find('i').removeClass('loading redo').addClass('download');
        }
      }
    });
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
  }
}; // When the document is ready, initialize the external modules table

$(document).ready(function () {
  extensionModules.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJGluc3RhbGxlZE1vZHVsZXNUYWJsZSIsIiRjaGVja2JveGVzIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsInBieFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwicmVwbGFjZSIsInBieExpY2Vuc2UiLCJnbG9iYWxQQlhMaWNlbnNlIiwidHJpbSIsImNoZWNrQm94ZXMiLCIkdGFiTWVudUl0ZW1zIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlBieEFwaSIsIk1vZHVsZXNHZXRBdmFpbGFibGUiLCJjYlBhcnNlTW9kdWxlVXBkYXRlcyIsImVhY2giLCJpbmRleCIsIm9iaiIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIiwiUGJ4RXh0ZW5zaW9uU3RhdHVzIiwicHVzaCIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiYXV0b1dpZHRoIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicmVzcG9uc2UiLCJoaWRlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImNvbW1lcmNpYWwiLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiTW9kdWxlc0dldE1vZHVsZUxpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsIk1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwic3RhdHVzIiwiY2hlY2tib3giLCJrZWVwU2V0dGluZ3MiLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJjYkFmdGVyRGVsZXRlIiwiZXJyb3JNZXNzYWdlIiwiZGF0YSIsImV4dF9EZWxldGVNb2R1bGVFcnJvciIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJtYXAiLCJOdW1iZXIiLCJpIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUVyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBTkM7O0FBUXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FaQTs7QUFjckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsc0JBQXNCLEVBQUVGLENBQUMsQ0FBQywwQkFBRCxDQWxCSjs7QUFvQnJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFdBQVcsRUFBRUgsQ0FBQyxDQUFDLHVCQUFELENBeEJPO0FBMEJyQkksRUFBQUEsZ0JBQWdCLEVBQUVKLENBQUMsQ0FBQyxvQkFBRCxDQTFCRTtB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QixFQUE2QjtBQUNoQyxlQUFPLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLENBQUMsQ0FBUjtBQUNIO0FBQ0o7O0FBRUQsUUFBSVYsT0FBTyxDQUFDeEYsTUFBUixLQUFtQjBGLE9BQU8sQ0FBQzFGLE1BQS9CLEVBQXVDO0FBQ25DLGFBQU8sQ0FBQyxDQUFSO0FBQ0g7O0FBRUQsV0FBTyxDQUFQO0FBQ0g7QUF2Ym9CLENBQXpCLEMsQ0EyYkE7O0FBQ0FwRCxDQUFDLENBQUN1SixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCMUosRUFBQUEsZ0JBQWdCLENBQUNnQixVQUFqQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIFBieEV4dGVuc2lvblN0YXR1cyAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgbGlzdCBvZiBleHRlbnNpb24gbW9kdWxlcy5cbiAqIEBjbGFzcyBleHRlbnNpb25Nb2R1bGVzXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpbnN0YWxsZWRNb2R1bGVzVGFibGU6ICQoJyNpbnN0YWxsZWQtbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblxuICAgICRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIHBieExpY2Vuc2U6IGdsb2JhbFBCWExpY2Vuc2UudHJpbSgpLFxuXG4gICAgY2hlY2tCb3hlczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI3BieC1leHRlbnNpb25zLXRhYi1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXMgbGlzdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICBQYnhBcGkuTW9kdWxlc0dldEF2YWlsYWJsZShleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGluc3RhbGxlZE1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXZcbiAgICAgICAgJCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSBkb3dubG9hZCBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZG93bmxvYWQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgY29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgJGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy5wYnhMaWNlbnNlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSB1cGRhdGUgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG4gICAgICAgICAgICBwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMucGJ4TGljZW5zZSA9PT0gJycpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRlbGV0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLnVwZGF0ZScpO1xuICAgICAgICBpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGNoZWNraW5nIHRoZSBsaWNlbnNlLlxuICAgICAqIElmIHRoZSBmZWF0dXJlIGlzIGNhcHR1cmVkLCBpdCBtYWtlcyBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlclxuICAgICAqIHRvIGdldCB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBsaWNlbnNlIGNoZWNrLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJMaWNlbnNlQ2hlY2socGFyYW1zLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRNb2R1bGVMaW5rKFxuICAgICAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUsXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gZmFsc2UgJiYgcGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X05vTGljZW5zZUF2YWlsYWJsZSk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgc3VjY2Vzc2Z1bGx5IG9idGFpbmluZyB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rIGZyb20gdGhlIHdlYnNpdGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciB0aGUgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbW9kdWxlIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpIHtcbiAgICAgICAgY29uc3QgbmV3UGFyYW1zID0gcGFyYW1zO1xuICAgICAgICByZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgbmV3UGFyYW1zLm1kNSA9IG9iai5tZDU7XG4gICAgICAgICAgICBuZXdQYXJhbXMudXBkYXRlTGluayA9IG9iai5ocmVmO1xuICAgICAgICAgICAgaWYgKG5ld1BhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShuZXdQYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aGUgd2Vic2l0ZSBmYWlscyB0byBwcm92aWRlIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGxpbmsgZHVlIHRvIHRoZSByZXF1aXJlZCBmZWF0dXJlIG5vdCBiZWluZyBjYXB0dXJlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSByZXF1ZXN0LlxuICAgICAqL1xuICAgIGNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlKHBhcmFtcykge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICB9XG4gICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGwgYSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICovXG4gICAgaW5zdGFsbE1vZHVsZShwYXJhbXMpIHtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHBhcmFtcy51bmlxaWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHJlcXVlc3QgcGFyYW1ldGVycy5cbiAgICAgKi9cbiAgICBkZWxldGVNb2R1bGUocGFyYW1zKSB7XG4gICAgICAgIC8vIEFzayB0aGUgdXNlciBpZiB0aGV5IHdhbnQgdG8ga2VlcCB0aGUgc2V0dGluZ3NcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG4gICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBlbmFibGVkLCBpZiBlbmFibGVkLCBkaXNhYmxlIGl0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNEaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2VlcFNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNVbkluc3RhbGxNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRlbGV0aW5nIGEgbW9kdWxlLlxuICAgICAqIElmIHN1Y2Nlc3NmdWwsIHJlbG9hZCB0aGUgcGFnZTsgaWYgbm90LCBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBtb2R1bGUgZGVsZXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2hldGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG4gICAgICAgIGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIHRhYmxlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==