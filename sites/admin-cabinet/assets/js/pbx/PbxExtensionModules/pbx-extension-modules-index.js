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


    $('a.download').on('click', function (e) {
      e.preventDefault();
      $('a.button').addClass('disabled');
      var params = {};
      var $aLink = $(e.target).closest('a');
      $aLink.removeClass('disabled');
      $aLink.addClass('loading');
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
    $moduleRow.find('.action-buttons').prepend(dynamicButton); // extensionModules.$btnUpdateAllModules.show(); TODO::We have to refactor the class before
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
      UserMessage.showLicenseError(globalTranslate.ext_LicenseProblemHeader, params);
      $('a.button').removeClass('disabled').removeClass('loading');
    } else {
      UserMessage.showLicenseError(globalTranslate.ext_LicenseProblemHeader, [globalTranslate.ext_NoLicenseAvailable]);
      $('a.button').removeClass('disabled').removeClass('loading');
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
        params.aLink.removeClass('loading');
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
   * Callback function after click on the update all modules button
   */
  updateAllModules: function updateAllModules() {// TODO:AfterRefactoring
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCIkbWFya2V0cGxhY2VMb2FkZXIiLCIkaW5zdGFsbGVkTW9kdWxlc1RhYmxlIiwiJGNoZWNrYm94ZXMiLCIkZGVsZXRlTW9kYWxGb3JtIiwiJGtlZXBTZXR0aW5nc0NoZWNrYm94IiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwicGJ4TGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJ0cmltIiwiJGJ0blVwZGF0ZUFsbE1vZHVsZXMiLCJjaGVja0JveGVzIiwiJHBvcHVwT25DbGljayIsIiR0YWJNZW51SXRlbXMiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwibW9kYWwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwicG9wdXAiLCJvbiIsImNsYXNzTmFtZSIsIlBieEFwaSIsIk1vZHVsZXNHZXRBdmFpbGFibGUiLCJjYlBhcnNlTW9kdWxlVXBkYXRlcyIsImVhY2giLCJpbmRleCIsIm9iaiIsInVuaXFJZCIsImF0dHIiLCJwYWdlU3RhdHVzIiwiUGJ4RXh0ZW5zaW9uU3RhdHVzIiwicHVzaCIsImhpZGUiLCJ1cGRhdGVBbGxNb2R1bGVzIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJhdXRvV2lkdGgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJyZXNwb25zZSIsIm1vZHVsZXMiLCJmb3JFYWNoIiwibWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYIiwibWluX3BieF92ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJsZW5ndGgiLCJvbGRWZXIiLCJmaW5kIiwidGV4dCIsIm5ld1ZlciIsInZlcnNpb24iLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsIiRuZXdNb2R1bGVSb3ciLCJyZW1vdmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsInNob3ciLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImNvbW1lcmNpYWwiLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiTW9kdWxlc0dldE1vZHVsZUxpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TGljZW5zZUVycm9yIiwiZXh0X0xpY2Vuc2VQcm9ibGVtSGVhZGVyIiwiZXh0X05vTGljZW5zZUF2YWlsYWJsZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwiaW5zdGFsbE1vZHVsZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9HZXRMaW5rRXJyb3IiLCJNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsInN0YXR1cyIsImNoZWNrYm94Iiwia2VlcFNldHRpbmdzIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJNb2R1bGVzVW5JbnN0YWxsTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFFckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQU5DOztBQVFyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRUQsQ0FBQyxDQUFDLHlCQUFELENBWkY7O0FBY3JCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixD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LEVBQTRDO0FBQ3hDLFVBQUlSLE9BQU8sQ0FBQzFGLE1BQVIsS0FBbUJrRyxDQUF2QixFQUEwQjtBQUN0QixlQUFPLENBQVA7QUFDSDs7QUFDRCxVQUFJVixPQUFPLENBQUNVLENBQUQsQ0FBUCxLQUFlUixPQUFPLENBQUNRLENBQUQsQ0FBMUIsRUFBK0IsQ0FDM0I7QUFDSCxPQUZELE1BRU8sSUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsR0FBYVIsT0FBTyxDQUFDUSxDQUFELENBQXhCLEVBQTZCO0FBQ2hDLGVBQU8sQ0FBUDtBQUNILE9BRk0sTUFFQTtBQUNILGVBQU8sQ0FBQyxDQUFSO0FBQ0g7QUFDSjs7QUFFRCxRQUFJVixPQUFPLENBQUN4RixNQUFSLEtBQW1CMEYsT0FBTyxDQUFDMUYsTUFBL0IsRUFBdUM7QUFDbkMsYUFBTyxDQUFDLENBQVI7QUFDSDs7QUFFRCxXQUFPLENBQVA7QUFDSDtBQW5lb0IsQ0FBekIsQyxDQXVlQTs7QUFDQTNELENBQUMsQ0FBQzhKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJqSyxFQUFBQSxnQkFBZ0IsQ0FBQ21CLFVBQWpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFBCWExpY2Vuc2UsIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgUGJ4RXh0ZW5zaW9uU3RhdHVzLCBrZXlDaGVjayAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgbGlzdCBvZiBleHRlbnNpb24gbW9kdWxlcy5cbiAqIEBjbGFzcyBleHRlbnNpb25Nb2R1bGVzXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGluZm9ybWF0aW9uIHdoZW4gbm8gYW55IG1vZHVsZXMgYXZhaWxhYmxlIHRvIGluc3RhbGwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm9OZXdNb2R1bGVzU2VnbWVudDogJCgnI25vLW5ldy1tb2R1bGVzLXNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2FkZXIgaW5zdGVhZCBvZiBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZUxvYWRlcjogJCgnI25ldy1tb2R1bGVzLWxvYWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggaW5zdGFsbGVkIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaW5zdGFsbGVkTW9kdWxlc1RhYmxlOiAkKCcjaW5zdGFsbGVkLW1vZHVsZXMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBjaGVja2JveGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXG4gICAgJGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG5cbiAgICAka2VlcFNldHRpbmdzQ2hlY2tib3g6ICQoJyNrZWVwTW9kdWxlU2V0dGluZ3MnKSxcblxuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICBwYnhMaWNlbnNlOiBnbG9iYWxQQlhMaWNlbnNlLnRyaW0oKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gd2hpY2ggcmVzcG9uc2libGUgZm9yIHVwZGF0ZSBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRidG5VcGRhdGVBbGxNb2R1bGVzOiAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpLFxuXG4gICAgY2hlY2tCb3hlczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBpY29uIHdpdGggcG9wdXAgdGV4dFxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHBvcHVwT25DbGljazogJCgnaS5wb3B1cC1vbi1jbGljaycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYnVsYXIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51SXRlbXM6ICQoJyNwYngtZXh0ZW5zaW9ucy10YWItbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb25Nb2R1bGVzIGxpc3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kcG9wdXBPbkNsaWNrLnBvcHVwKHtcbiAgICAgICAgICAgIG9uICAgIDogJ2NsaWNrJyxcbiAgICAgICAgICAgIGNsYXNzTmFtZToge1xuICAgICAgICAgICAgICAgIHBvcHVwOiAndWkgcG9wdXAgd2lkZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRBdmFpbGFibGUoZXh0ZW5zaW9uTW9kdWxlcy5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGNoZWNrYm94ZXMuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdW5pcUlkID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG4gICAgICAgICAgICBwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCBmYWxzZSk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNoZWNrQm94ZXMucHVzaChwYWdlU3RhdHVzKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kYnRuVXBkYXRlQWxsTW9kdWxlcy5oaWRlKCk7IC8vIFVudGlsIGF0IGxlYXN0IG9uZSB1cGRhdGUgYXZhaWxhYmxlXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGJ0blVwZGF0ZUFsbE1vZHVsZXMub24oJ2NsaWNrJywgZXh0ZW5zaW9uTW9kdWxlcy51cGRhdGVBbGxNb2R1bGVzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGluc3RhbGxlZE1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXZcbiAgICAgICAgJCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoPjApe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZG93bmxvYWQgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLmRvd25sb2FkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgICRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICRhTGluay5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy5wYnhMaWNlbnNlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSB1cGRhdGUgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG4gICAgICAgICAgICBwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMucGJ4TGljZW5zZSA9PT0gJycpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRlbGV0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLnVwZGF0ZScpO1xuICAgICAgICBpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgICAgIC8vIGV4dGVuc2lvbk1vZHVsZXMuJGJ0blVwZGF0ZUFsbE1vZHVsZXMuc2hvdygpOyBUT0RPOjpXZSBoYXZlIHRvIHJlZmFjdG9yIHRoZSBjbGFzcyBiZWZvcmVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgY2hlY2tpbmcgdGhlIGxpY2Vuc2UuXG4gICAgICogSWYgdGhlIGZlYXR1cmUgaXMgY2FwdHVyZWQsIGl0IG1ha2VzIGEgcmVxdWVzdCB0byB0aGUgc2VydmVyXG4gICAgICogdG8gZ2V0IHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGxpbmsuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciB0aGUgcmVxdWVzdC5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIFRoZSByZXN1bHQgb2YgdGhlIGxpY2Vuc2UgY2hlY2suXG4gICAgICovXG4gICAgY2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0dldE1vZHVsZUxpbmsoXG4gICAgICAgICAgICAgICAgcGFyYW1zLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ID09PSBmYWxzZSAmJiBwYXJhbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXh0X0xpY2Vuc2VQcm9ibGVtSGVhZGVyLCBwYXJhbXMpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0xpY2Vuc2VFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXh0X0xpY2Vuc2VQcm9ibGVtSGVhZGVyLCBbZ2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0xpY2Vuc2VBdmFpbGFibGVdKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHN1Y2Nlc3NmdWxseSBvYnRhaW5pbmcgdGhlIG1vZHVsZSBpbnN0YWxsYXRpb24gbGluayBmcm9tIHRoZSB3ZWJzaXRlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIG1vZHVsZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IG5ld1BhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuICAgICAgICAgICAgbmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcbiAgICAgICAgICAgIGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZyByZWRvJykucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUobmV3UGFyYW1zKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIHdlYnNpdGUgZmFpbHMgdG8gcHJvdmlkZSB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rIGR1ZSB0byB0aGUgcmVxdWlyZWQgZmVhdHVyZSBub3QgYmVpbmcgY2FwdHVyZWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciB0aGUgcmVxdWVzdC5cbiAgICAgKi9cbiAgICBjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZShwYXJhbXMpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgfVxuICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9HZXRMaW5rRXJyb3IpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnN0YWxsIGEgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcmVxdWVzdCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIGluc3RhbGxNb2R1bGUocGFyYW1zKSB7XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZChwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShwYXJhbXMudW5pcWlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBEZWxldGUgYSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICovXG4gICAgZGVsZXRlTW9kdWxlKHBhcmFtcykge1xuICAgICAgICAvLyBBc2sgdGhlIHVzZXIgaWYgdGhleSB3YW50IHRvIGtlZXAgdGhlIHNldHRpbmdzXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybVxuICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgZW5hYmxlZCwgaWYgZW5hYmxlZCwgZGlzYWJsZSBpdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGtlZXBTZXR0aW5ncyA9IGV4dGVuc2lvbk1vZHVsZXMuJGtlZXBTZXR0aW5nc0NoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNVbkluc3RhbGxNb2R1bGUoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy51bmlxaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtlZXBTZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzVW5JbnN0YWxsTW9kdWxlKHBhcmFtcy51bmlxaWQsIGtlZXBTZXR0aW5ncywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBjbGljayBvbiB0aGUgdXBkYXRlIGFsbCBtb2R1bGVzIGJ1dHRvblxuICAgICAqL1xuICAgIHVwZGF0ZUFsbE1vZHVsZXMoKXtcbiAgICAgICAgLy8gVE9ETzpBZnRlclJlZmFjdG9yaW5nXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRlbGV0aW5nIGEgbW9kdWxlLlxuICAgICAqIElmIHN1Y2Nlc3NmdWwsIHJlbG9hZCB0aGUgcGFnZTsgaWYgbm90LCBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBtb2R1bGUgZGVsZXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2hldGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG4gICAgICAgIGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIHRhYmxlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==