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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCIkbWFya2V0cGxhY2VMb2FkZXIiLCIkaW5zdGFsbGVkTW9kdWxlc1RhYmxlIiwiJGNoZWNrYm94ZXMiLCIkZGVsZXRlTW9kYWxGb3JtIiwiJGtlZXBTZXR0aW5nc0NoZWNrYm94IiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwicGJ4TGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJ0cmltIiwiY2hlY2tCb3hlcyIsIiRwb3B1cE9uQ2xpY2siLCIkdGFiTWVudUl0ZW1zIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsInBvcHVwIiwib24iLCJjbGFzc05hbWUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwiaGlkZSIsIm1vZHVsZXMiLCJmb3JFYWNoIiwibWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYIiwibWluX3BieF92ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJsZW5ndGgiLCJvbGRWZXIiLCJmaW5kIiwidGV4dCIsIm5ld1ZlciIsInZlcnNpb24iLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsIiRuZXdNb2R1bGVSb3ciLCJyZW1vdmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsInNob3ciLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImNvbW1lcmNpYWwiLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiTW9kdWxlc0dldE1vZHVsZUxpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TGljZW5zZUVycm9yIiwiZXh0X0xpY2Vuc2VQcm9ibGVtSGVhZGVyIiwiZXh0X05vTGljZW5zZUF2YWlsYWJsZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwiaW5zdGFsbE1vZHVsZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9HZXRMaW5rRXJyb3IiLCJNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsInN0YXR1cyIsImNoZWNrYm94Iiwia2VlcFNldHRpbmdzIiwiTW9kdWxlc0Rpc2FibGVNb2R1bGUiLCJNb2R1bGVzVW5JbnN0YWxsTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFFckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQU5DOztBQVFyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRUQsQ0FBQyxDQUFDLHlCQUFELENBWkY7O0FBY3JCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGtCQUFrQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FsQkE7O0FBb0JyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxzQkFBc0IsRUFBRUgsQ0FBQyxDQUFDLDBCQUFELENBeEJKOztBQTBCckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FBVyxFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0E5Qk87QUFnQ3JCSyxFQUFBQSxnQkFBZ0IsRUFBRUwsQ0FBQyxDQUFDLG9CQUFELENBaENFO0FBa0NyQk0sRUFBQUEscUJBQXFCLEVBQUVOLENBQUMsQ0FBQyxxQkFBRCxDQWxDSDtBQW9DckJPLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBcENTO0FBc0NyQkMsRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsSUFBakIsRUF0Q1M7QUF3Q3JCQyxFQUFBQSxVQUFVLEVBQUUsRUF4Q1M7O0FBMENyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVkLENBQUMsQ0FBQyxrQkFBRCxDQTlDSzs7QUFnRHJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0llLEVBQUFBLGFBQWEsRUFBRWYsQ0FBQyxDQUFDLGdDQUFELENBcERLOztBQXNEckI7QUFDSjtBQUNBO0FBQ0lnQixFQUFBQSxVQXpEcUIsd0JBeURSO0FBQ1Q7QUFDQWxCLElBQUFBLGdCQUFnQixDQUFDaUIsYUFBakIsQ0FBK0JFLEdBQS9CLENBQW1DO0FBQy9CQyxNQUFBQSxPQUFPLEVBQUUsSUFEc0I7QUFFL0JDLE1BQUFBLFdBQVcsRUFBRTtBQUZrQixLQUFuQztBQUtBckIsSUFBQUEsZ0JBQWdCLENBQUNPLGdCQUFqQixDQUFrQ2UsS0FBbEM7QUFFQXRCLElBQUFBLGdCQUFnQixDQUFDdUIsbUJBQWpCO0FBRUF2QixJQUFBQSxnQkFBZ0IsQ0FBQ2dCLGFBQWpCLENBQStCUSxLQUEvQixDQUFxQztBQUNqQ0MsTUFBQUEsRUFBRSxFQUFNLE9BRHlCO0FBRWpDQyxNQUFBQSxTQUFTLEVBQUU7QUFDUEYsUUFBQUEsS0FBSyxFQUFFO0FBREE7QUFGc0IsS0FBckM7QUFPQUcsSUFBQUEsTUFBTSxDQUFDQyxtQkFBUCxDQUEyQjVCLGdCQUFnQixDQUFDNkIsb0JBQTVDO0FBQ0E3QixJQUFBQSxnQkFBZ0IsQ0FBQ00sV0FBakIsQ0FBNkJ3QixJQUE3QixDQUFrQyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDOUMsVUFBTUMsTUFBTSxHQUFHL0IsQ0FBQyxDQUFDOEIsR0FBRCxDQUFELENBQU9FLElBQVAsQ0FBWSxZQUFaLENBQWY7QUFDQSxVQUFNQyxVQUFVLEdBQUcsSUFBSUMsa0JBQUosRUFBbkI7QUFDQUQsTUFBQUEsVUFBVSxDQUFDakIsVUFBWCxDQUFzQmUsTUFBdEIsRUFBOEIsS0FBOUI7QUFDQWpDLE1BQUFBLGdCQUFnQixDQUFDZSxVQUFqQixDQUE0QnNCLElBQTVCLENBQWlDRixVQUFqQztBQUNILEtBTEQ7QUFNSCxHQWxGb0I7O0FBb0ZyQjtBQUNKO0FBQ0E7QUFDSVosRUFBQUEsbUJBdkZxQixpQ0F1RkM7QUFDbEJ2QixJQUFBQSxnQkFBZ0IsQ0FBQ0ssc0JBQWpCLENBQXdDaUMsU0FBeEMsQ0FBa0Q7QUFDOUNDLE1BQUFBLFlBQVksRUFBRSxLQURnQztBQUU5Q0MsTUFBQUEsTUFBTSxFQUFFLEtBRnNDO0FBRzlDQyxNQUFBQSxPQUFPLEVBQUUsQ0FDTDtBQUFDQyxRQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsUUFBQUEsVUFBVSxFQUFFO0FBQS9CLE9BREssRUFFTCxJQUZLLEVBR0wsSUFISyxFQUlMLElBSkssRUFLTDtBQUFDRCxRQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsUUFBQUEsVUFBVSxFQUFFO0FBQS9CLE9BTEssQ0FIcUM7QUFVOUNDLE1BQUFBLFNBQVMsRUFBRSxLQVZtQztBQVc5Q0MsTUFBQUEsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0M7QUFYZSxLQUFsRCxFQURrQixDQWVsQjs7QUFDQTdDLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzhDLFFBQWQsQ0FBdUI5QyxDQUFDLENBQUMsd0JBQUQsQ0FBeEI7QUFDSCxHQXhHb0I7O0FBMEdyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJMkIsRUFBQUEsb0JBOUdxQixnQ0E4R0FvQixRQTlHQSxFQThHVTtBQUMzQmpELElBQUFBLGdCQUFnQixDQUFDSSxrQkFBakIsQ0FBb0M4QyxJQUFwQztBQUNBRCxJQUFBQSxRQUFRLENBQUNFLE9BQVQsQ0FBaUJDLE9BQWpCLENBQXlCLFVBQUNwQixHQUFELEVBQVM7QUFDOUI7QUFDQSxVQUFNcUIsd0JBQXdCLEdBQUdyQixHQUFHLENBQUNzQixlQUFyQztBQUNBLFVBQU1DLGlCQUFpQixHQUFHdkQsZ0JBQWdCLENBQUNTLFVBQTNDOztBQUNBLFVBQUlULGdCQUFnQixDQUFDd0QsY0FBakIsQ0FBZ0NELGlCQUFoQyxFQUFtREYsd0JBQW5ELElBQStFLENBQW5GLEVBQXNGO0FBQ2xGO0FBQ0gsT0FONkIsQ0FROUI7OztBQUNBLFVBQU1JLFVBQVUsR0FBR3ZELENBQUMseUJBQWtCOEIsR0FBRyxDQUFDMEIsTUFBdEIsRUFBcEI7O0FBQ0EsVUFBSUQsVUFBVSxDQUFDRSxNQUFYLEdBQW9CLENBQXhCLEVBQTJCO0FBQ3ZCLFlBQU1DLE1BQU0sR0FBR0gsVUFBVSxDQUFDSSxJQUFYLENBQWdCLFlBQWhCLEVBQThCQyxJQUE5QixFQUFmO0FBQ0EsWUFBTUMsTUFBTSxHQUFHL0IsR0FBRyxDQUFDZ0MsT0FBbkI7O0FBQ0EsWUFBSWhFLGdCQUFnQixDQUFDd0QsY0FBakIsQ0FBZ0NPLE1BQWhDLEVBQXdDSCxNQUF4QyxJQUFrRCxDQUF0RCxFQUF5RDtBQUNyRDVELFVBQUFBLGdCQUFnQixDQUFDaUUsb0JBQWpCLENBQXNDakMsR0FBdEM7QUFDSDtBQUNKLE9BTkQsTUFNTztBQUNILFlBQU1rQyxhQUFhLEdBQUdoRSxDQUFDLDZCQUFzQjhCLEdBQUcsQ0FBQzBCLE1BQTFCLEVBQXZCOztBQUNBLFlBQUlRLGFBQWEsQ0FBQ1AsTUFBZCxHQUF1QixDQUEzQixFQUE4QjtBQUMxQixjQUFNQyxPQUFNLEdBQUdNLGFBQWEsQ0FBQ0wsSUFBZCxDQUFtQixZQUFuQixFQUFpQ0MsSUFBakMsRUFBZjs7QUFDQSxjQUFNQyxPQUFNLEdBQUcvQixHQUFHLENBQUNnQyxPQUFuQjs7QUFDQSxjQUFJaEUsZ0JBQWdCLENBQUN3RCxjQUFqQixDQUFnQ08sT0FBaEMsRUFBd0NILE9BQXhDLElBQWtELENBQXRELEVBQXlEO0FBQ3JETSxZQUFBQSxhQUFhLENBQUNDLE1BQWQ7QUFDQW5FLFlBQUFBLGdCQUFnQixDQUFDb0Usb0JBQWpCLENBQXNDcEMsR0FBdEM7QUFDSDtBQUNKLFNBUEQsTUFPTztBQUNIaEMsVUFBQUEsZ0JBQWdCLENBQUNvRSxvQkFBakIsQ0FBc0NwQyxHQUF0QztBQUNIO0FBQ0o7QUFDSixLQTdCRDs7QUErQkEsUUFBSTlCLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCeUQsTUFBdkIsR0FBOEIsQ0FBbEMsRUFBb0M7QUFDaEMzRCxNQUFBQSxnQkFBZ0IsQ0FBQ0csb0JBQWpCLENBQXNDK0MsSUFBdEM7QUFDSCxLQUZELE1BRU87QUFDSGxELE1BQUFBLGdCQUFnQixDQUFDRyxvQkFBakIsQ0FBc0NrRSxJQUF0QztBQUNIO0FBRUQ7QUFDUjtBQUNBO0FBQ0E7OztBQUNRbkUsSUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQnVCLEVBQWhCLENBQW1CLE9BQW5CLEVBQTRCLFVBQUM2QyxDQUFELEVBQU87QUFDL0JBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBckUsTUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjc0UsUUFBZCxDQUF1QixVQUF2QjtBQUNBLFVBQU1DLE1BQU0sR0FBRyxFQUFmO0FBQ0EsVUFBTUMsTUFBTSxHQUFHeEUsQ0FBQyxDQUFDb0UsQ0FBQyxDQUFDSyxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixHQUFwQixDQUFmO0FBQ0FGLE1BQUFBLE1BQU0sQ0FBQ0csV0FBUCxDQUFtQixVQUFuQjtBQUNBSCxNQUFBQSxNQUFNLENBQUNGLFFBQVAsQ0FBZ0IsU0FBaEI7QUFDQUMsTUFBQUEsTUFBTSxDQUFDZixNQUFQLEdBQWdCZ0IsTUFBTSxDQUFDeEMsSUFBUCxDQUFZLGFBQVosQ0FBaEI7QUFDQXVDLE1BQUFBLE1BQU0sQ0FBQ0ssU0FBUCxHQUFtQkosTUFBTSxDQUFDeEMsSUFBUCxDQUFZLFNBQVosQ0FBbkI7QUFDQXVDLE1BQUFBLE1BQU0sQ0FBQ00sSUFBUCxHQUFjTCxNQUFNLENBQUN4QyxJQUFQLENBQVksV0FBWixDQUFkO0FBQ0F1QyxNQUFBQSxNQUFNLENBQUNPLFlBQVAsR0FBc0JOLE1BQU0sQ0FBQ3hDLElBQVAsQ0FBWSxnQkFBWixDQUF0QjtBQUNBdUMsTUFBQUEsTUFBTSxDQUFDUSxZQUFQLEdBQXNCUCxNQUFNLENBQUN4QyxJQUFQLENBQVksZ0JBQVosQ0FBdEI7QUFDQXVDLE1BQUFBLE1BQU0sQ0FBQ1MsTUFBUCxHQUFnQixTQUFoQjtBQUNBVCxNQUFBQSxNQUFNLENBQUNVLEtBQVAsR0FBZVQsTUFBZjs7QUFDQSxVQUFJMUUsZ0JBQWdCLENBQUNZLFVBQWpCLEtBQWdDLEVBQXBDLEVBQXdDO0FBQ3BDd0UsUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQjtBQUNILE9BRkQsTUFFTztBQUNIM0QsUUFBQUEsTUFBTSxDQUFDNEQsaUNBQVAsQ0FBeUNkLE1BQXpDLEVBQWlEekUsZ0JBQWdCLENBQUN3RixtQkFBbEU7QUFDSDtBQUNKLEtBbkJEO0FBcUJBO0FBQ1I7QUFDQTtBQUNBOztBQUNRdEYsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjdUIsRUFBZCxDQUFpQixPQUFqQixFQUEwQixVQUFDNkMsQ0FBRCxFQUFPO0FBQzdCQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXJFLE1BQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY3NFLFFBQWQsQ0FBdUIsVUFBdkI7QUFDQSxVQUFNQyxNQUFNLEdBQUcsRUFBZjtBQUNBLFVBQU1DLE1BQU0sR0FBR3hFLENBQUMsQ0FBQ29FLENBQUMsQ0FBQ0ssTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsR0FBcEIsQ0FBZjtBQUNBRixNQUFBQSxNQUFNLENBQUNHLFdBQVAsQ0FBbUIsVUFBbkI7QUFDQUosTUFBQUEsTUFBTSxDQUFDTyxZQUFQLEdBQXNCTixNQUFNLENBQUN4QyxJQUFQLENBQVksZ0JBQVosQ0FBdEI7QUFDQXVDLE1BQUFBLE1BQU0sQ0FBQ1EsWUFBUCxHQUFzQlAsTUFBTSxDQUFDeEMsSUFBUCxDQUFZLGdCQUFaLENBQXRCO0FBQ0F1QyxNQUFBQSxNQUFNLENBQUNTLE1BQVAsR0FBZ0IsUUFBaEI7QUFDQVQsTUFBQUEsTUFBTSxDQUFDSyxTQUFQLEdBQW1CSixNQUFNLENBQUN4QyxJQUFQLENBQVksU0FBWixDQUFuQjtBQUNBdUMsTUFBQUEsTUFBTSxDQUFDZixNQUFQLEdBQWdCZ0IsTUFBTSxDQUFDeEMsSUFBUCxDQUFZLGFBQVosQ0FBaEI7QUFDQXVDLE1BQUFBLE1BQU0sQ0FBQ00sSUFBUCxHQUFjTCxNQUFNLENBQUN4QyxJQUFQLENBQVksV0FBWixDQUFkO0FBQ0F1QyxNQUFBQSxNQUFNLENBQUNVLEtBQVAsR0FBZVQsTUFBZjs7QUFDQSxVQUFJMUUsZ0JBQWdCLENBQUNZLFVBQWpCLEtBQWdDLEVBQXBDLEVBQ0E7QUFDSXdFLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckI7QUFDSCxPQUhELE1BR087QUFDSDNELFFBQUFBLE1BQU0sQ0FBQzRELGlDQUFQLENBQXlDZCxNQUF6QyxFQUFpRHpFLGdCQUFnQixDQUFDd0YsbUJBQWxFO0FBQ0g7QUFDSixLQW5CRDtBQXFCQTtBQUNSO0FBQ0E7QUFDQTs7QUFDUXRGLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY3VCLEVBQWQsQ0FBaUIsT0FBakIsRUFBMEIsVUFBQzZDLENBQUQsRUFBTztBQUM3QkEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0FyRSxNQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWNzRSxRQUFkLENBQXVCLFVBQXZCO0FBQ0F0RSxNQUFBQSxDQUFDLENBQUNvRSxDQUFDLENBQUNLLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLEdBQXBCLEVBQXlCQyxXQUF6QixDQUFxQyxVQUFyQztBQUNBLFVBQU1KLE1BQU0sR0FBRyxFQUFmO0FBQ0EsVUFBTUMsTUFBTSxHQUFHeEUsQ0FBQyxDQUFDb0UsQ0FBQyxDQUFDSyxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixDQUFmO0FBQ0FILE1BQUFBLE1BQU0sQ0FBQ2YsTUFBUCxHQUFnQmdCLE1BQU0sQ0FBQ3hDLElBQVAsQ0FBWSxJQUFaLENBQWhCO0FBQ0FsQyxNQUFBQSxnQkFBZ0IsQ0FBQ3lGLFlBQWpCLENBQThCaEIsTUFBOUI7QUFDSCxLQVJEO0FBU0F2RSxJQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQnNCLEtBQXJCO0FBQ0gsR0FyTm9COztBQXVOckI7QUFDSjtBQUNBO0FBQ0E7QUFDSTRDLEVBQUFBLG9CQTNOcUIsZ0NBMk5BcEMsR0EzTkEsRUEyTks7QUFDdEJoQyxJQUFBQSxnQkFBZ0IsQ0FBQ0MsaUJBQWpCLENBQW1Db0UsSUFBbkM7QUFDQSxRQUFJcUIsU0FBUyxHQUFHLEVBQWhCOztBQUNBLFFBQUkxRCxHQUFHLENBQUMyRCxVQUFKLEtBQW1CQyxTQUFuQixJQUFnQzVELEdBQUcsQ0FBQzJELFVBQUosS0FBbUIsSUFBdkQsRUFBNkQ7QUFDekRELE1BQUFBLFNBQVMsMkJBQW1CMUQsR0FBRyxDQUFDMkQsVUFBdkIsa0NBQXNERSxlQUFlLENBQUNDLHVCQUF0RSxTQUFUO0FBQ0g7O0FBRUQsUUFBSUMsY0FBYyxHQUFHLG1DQUFyQjs7QUFDQSxRQUFJL0QsR0FBRyxDQUFDZ0UsVUFBSixLQUFtQixHQUF2QixFQUE0QjtBQUN4QkQsTUFBQUEsY0FBYyxHQUFHLGdDQUFqQjtBQUNIOztBQUNELFFBQU1FLFVBQVUsdURBQ1lqRSxHQUFHLENBQUMwQixNQURoQixrQ0FFWnFDLGNBRlksY0FFTUcsa0JBQWtCLENBQUNsRSxHQUFHLENBQUNtRSxJQUFMLENBRnhCLHdEQUdPRCxrQkFBa0IsQ0FBQ2xFLEdBQUcsQ0FBQ29FLFdBQUwsQ0FIekIsY0FHOENWLFNBSDlDLHlEQUtaUSxrQkFBa0IsQ0FBQ2xFLEdBQUcsQ0FBQ3FFLFNBQUwsQ0FMTixxRUFNbUJyRSxHQUFHLENBQUNnQyxPQU52Qiw2UUFVRTZCLGVBQWUsQ0FBQ1MsaUJBVmxCLG1EQVdFdEUsR0FBRyxDQUFDMEIsTUFYTixpREFZQTFCLEdBQUcsQ0FBQytDLElBWkosc0RBYUsvQyxHQUFHLENBQUN1RSxjQWJULHNEQWNLdkUsR0FBRyxDQUFDd0UsY0FkVCwrQ0FlSHhFLEdBQUcsQ0FBQ3lFLFVBZkQsK0tBQWhCO0FBcUJBdkcsSUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJ3RyxNQUE5QixDQUFxQ1QsVUFBckM7QUFDSCxHQTVQb0I7O0FBOFByQjtBQUNKO0FBQ0E7QUFDQTtBQUNJaEMsRUFBQUEsb0JBbFFxQixnQ0FrUUFqQyxHQWxRQSxFQWtRSztBQUN0QixRQUFNeUIsVUFBVSxHQUFHdkQsQ0FBQyx5QkFBa0I4QixHQUFHLENBQUMwQixNQUF0QixFQUFwQjtBQUNBLFFBQU1pRCxvQkFBb0IsR0FBR2xELFVBQVUsQ0FBQ0ksSUFBWCxDQUFnQixVQUFoQixDQUE3Qjs7QUFDQSxRQUFJOEMsb0JBQW9CLENBQUNoRCxNQUFyQixHQUE4QixDQUFsQyxFQUFxQztBQUNqQyxVQUFNQyxNQUFNLEdBQUcrQyxvQkFBb0IsQ0FBQ3pFLElBQXJCLENBQTBCLFVBQTFCLENBQWY7QUFDQSxVQUFNNkIsTUFBTSxHQUFHL0IsR0FBRyxDQUFDZ0MsT0FBbkI7O0FBQ0EsVUFBSWhFLGdCQUFnQixDQUFDd0QsY0FBakIsQ0FBZ0NPLE1BQWhDLEVBQXdDSCxNQUF4QyxLQUFtRCxDQUF2RCxFQUEwRDtBQUN0RDtBQUNIO0FBQ0o7O0FBQ0QrQyxJQUFBQSxvQkFBb0IsQ0FBQ3hDLE1BQXJCO0FBQ0EsUUFBTXlDLGFBQWEsNEdBRVJmLGVBQWUsQ0FBQ2dCLGdCQUZSLG1DQUdYN0UsR0FBRyxDQUFDZ0MsT0FITyxzQ0FJUmhDLEdBQUcsQ0FBQzBCLE1BSkksMkNBS0oxQixHQUFHLENBQUN1RSxjQUxBLDBDQU1KdkUsR0FBRyxDQUFDd0UsY0FOQSxtQ0FPWnhFLEdBQUcsQ0FBQ3lFLFVBUFEsb0dBQW5CO0FBV0FoRCxJQUFBQSxVQUFVLENBQUNJLElBQVgsQ0FBZ0IsaUJBQWhCLEVBQW1DaUQsT0FBbkMsQ0FBMkNGLGFBQTNDO0FBQ0gsR0F6Um9COztBQTJSckI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXBCLEVBQUFBLG1CQWxTcUIsK0JBa1NEZixNQWxTQyxFQWtTT3NDLE1BbFNQLEVBa1NlO0FBQ2hDLFFBQUlBLE1BQU0sS0FBSyxJQUFmLEVBQXFCO0FBQ2pCcEYsTUFBQUEsTUFBTSxDQUFDcUYsb0JBQVAsQ0FDSXZDLE1BREosRUFFSXpFLGdCQUFnQixDQUFDaUgsNkJBRnJCLEVBR0lqSCxnQkFBZ0IsQ0FBQ2tILDZCQUhyQjtBQUtILEtBTkQsTUFNTyxJQUFJSCxNQUFNLEtBQUssS0FBWCxJQUFvQnRDLE1BQU0sQ0FBQ2QsTUFBUCxHQUFnQixDQUF4QyxFQUEyQztBQUM5Q3dELE1BQUFBLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJ2QixlQUFlLENBQUN3Qix3QkFBN0MsRUFBdUU1QyxNQUF2RTtBQUNBdkUsTUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjMkUsV0FBZCxDQUEwQixVQUExQixFQUFzQ0EsV0FBdEMsQ0FBa0QsU0FBbEQ7QUFDSCxLQUhNLE1BR0E7QUFDSHNDLE1BQUFBLFdBQVcsQ0FBQ0MsZ0JBQVosQ0FBNkJ2QixlQUFlLENBQUN3Qix3QkFBN0MsRUFBdUUsQ0FBQ3hCLGVBQWUsQ0FBQ3lCLHNCQUFqQixDQUF2RTtBQUNBcEgsTUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjMkUsV0FBZCxDQUEwQixVQUExQixFQUFzQ0EsV0FBdEMsQ0FBa0QsU0FBbEQ7QUFDSDtBQUVKLEdBalRvQjs7QUFtVHJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW9DLEVBQUFBLDZCQXhUcUIseUNBd1RTeEMsTUF4VFQsRUF3VGlCeEIsUUF4VGpCLEVBd1QyQjtBQUM1QyxRQUFNc0UsU0FBUyxHQUFHOUMsTUFBbEI7QUFDQXhCLElBQUFBLFFBQVEsQ0FBQ0UsT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsVUFBQ3BCLEdBQUQsRUFBUztBQUM5QnVGLE1BQUFBLFNBQVMsQ0FBQ0MsR0FBVixHQUFnQnhGLEdBQUcsQ0FBQ3dGLEdBQXBCO0FBQ0FELE1BQUFBLFNBQVMsQ0FBQ0UsVUFBVixHQUF1QnpGLEdBQUcsQ0FBQzBGLElBQTNCOztBQUNBLFVBQUlILFNBQVMsQ0FBQ3JDLE1BQVYsS0FBcUIsUUFBekIsRUFBbUM7QUFDL0JULFFBQUFBLE1BQU0sQ0FBQ1UsS0FBUCxDQUFhdEIsSUFBYixDQUFrQixHQUFsQixFQUF1QlcsUUFBdkIsQ0FBZ0MsU0FBaEM7QUFDSCxPQUZELE1BRU87QUFDSEMsUUFBQUEsTUFBTSxDQUFDVSxLQUFQLENBQWFOLFdBQWIsQ0FBeUIsU0FBekI7QUFDQUosUUFBQUEsTUFBTSxDQUFDVSxLQUFQLENBQWF0QixJQUFiLENBQWtCLEdBQWxCLEVBQXVCVyxRQUF2QixDQUFnQyxjQUFoQyxFQUFnREssV0FBaEQsQ0FBNEQsVUFBNUQ7QUFDSDs7QUFDRDdFLE1BQUFBLGdCQUFnQixDQUFDMkgsYUFBakIsQ0FBK0JKLFNBQS9CO0FBQ0gsS0FWRDtBQVdILEdBclVvQjs7QUF1VXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lMLEVBQUFBLDZCQTNVcUIseUNBMlVTekMsTUEzVVQsRUEyVWlCO0FBQ2xDdkUsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjMkUsV0FBZCxDQUEwQixVQUExQjs7QUFDQSxRQUFJSixNQUFNLENBQUNTLE1BQVAsS0FBa0IsUUFBdEIsRUFBZ0M7QUFDNUJULE1BQUFBLE1BQU0sQ0FBQ1UsS0FBUCxDQUFhdEIsSUFBYixDQUFrQixHQUFsQixFQUF1QmdCLFdBQXZCLENBQW1DLFNBQW5DO0FBQ0gsS0FGRCxNQUVPO0FBQ0hKLE1BQUFBLE1BQU0sQ0FBQ1UsS0FBUCxDQUFhdEIsSUFBYixDQUFrQixHQUFsQixFQUF1QmdCLFdBQXZCLENBQW1DLGNBQW5DLEVBQW1ETCxRQUFuRCxDQUE0RCxVQUE1RDtBQUNIOztBQUNEMkMsSUFBQUEsV0FBVyxDQUFDUyxlQUFaLENBQTRCL0IsZUFBZSxDQUFDZ0MsZ0JBQTVDO0FBQ0gsR0FuVm9COztBQXFWckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUYsRUFBQUEsYUF6VnFCLHlCQXlWUGxELE1BelZPLEVBeVZDO0FBQ2xCOUMsSUFBQUEsTUFBTSxDQUFDbUcsMEJBQVAsQ0FBa0NyRCxNQUFsQyxFQUEwQyxVQUFDeEIsUUFBRCxFQUFjO0FBQ3BELFVBQUlBLFFBQVEsS0FBSyxJQUFqQixFQUF1QjtBQUNuQjhFLFFBQUFBLHVCQUF1QixDQUFDN0csVUFBeEIsQ0FBbUN1RCxNQUFNLENBQUNmLE1BQTFDO0FBQ0gsT0FGRCxNQUVPO0FBQ0gsWUFBSVQsUUFBUSxDQUFDK0UsUUFBVCxLQUFzQnBDLFNBQTFCLEVBQXFDO0FBQ2pDdUIsVUFBQUEsV0FBVyxDQUFDUyxlQUFaLENBQTRCM0UsUUFBUSxDQUFDK0UsUUFBckM7QUFDSCxTQUZELE1BRU87QUFDSGIsVUFBQUEsV0FBVyxDQUFDUyxlQUFaLENBQTRCL0IsZUFBZSxDQUFDb0MscUJBQTVDO0FBQ0g7O0FBQ0R4RCxRQUFBQSxNQUFNLENBQUNVLEtBQVAsQ0FBYU4sV0FBYixDQUF5QixVQUF6Qjs7QUFDQSxZQUFJSixNQUFNLENBQUNTLE1BQVAsS0FBa0IsUUFBdEIsRUFBZ0M7QUFDNUJULFVBQUFBLE1BQU0sQ0FBQ1UsS0FBUCxDQUFhdEIsSUFBYixDQUFrQixHQUFsQixFQUF1QmdCLFdBQXZCLENBQW1DLFNBQW5DO0FBQ0gsU0FGRCxNQUVPO0FBQ0hKLFVBQUFBLE1BQU0sQ0FBQ1UsS0FBUCxDQUFhdEIsSUFBYixDQUFrQixHQUFsQixFQUF1QmdCLFdBQXZCLENBQW1DLGNBQW5DLEVBQW1ETCxRQUFuRCxDQUE0RCxVQUE1RDtBQUNIO0FBQ0o7QUFDSixLQWhCRDtBQWlCSCxHQTNXb0I7O0FBNFdyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJaUIsRUFBQUEsWUFoWHFCLHdCQWdYUmhCLE1BaFhRLEVBZ1hBO0FBQ2pCO0FBQ0F6RSxJQUFBQSxnQkFBZ0IsQ0FBQ08sZ0JBQWpCLENBQ0tlLEtBREwsQ0FDVztBQUNINEcsTUFBQUEsUUFBUSxFQUFFLEtBRFA7QUFFSEMsTUFBQUEsTUFBTSxFQUFFLGtCQUFNO0FBQ1ZqSSxRQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWMyRSxXQUFkLENBQTBCLFVBQTFCO0FBQ0EsZUFBTyxJQUFQO0FBQ0gsT0FMRTtBQU1IdUQsTUFBQUEsU0FBUyxFQUFFLHFCQUFNO0FBQ2I7QUFDQSxZQUFNQyxNQUFNLEdBQUduSSxDQUFDLFlBQUt1RSxNQUFNLENBQUNmLE1BQVosRUFBRCxDQUF1QkcsSUFBdkIsQ0FBNEIsV0FBNUIsRUFBeUN5RSxRQUF6QyxDQUFrRCxZQUFsRCxDQUFmO0FBQ0EsWUFBTUMsWUFBWSxHQUFHdkksZ0JBQWdCLENBQUNRLHFCQUFqQixDQUF1QzhILFFBQXZDLENBQWdELFlBQWhELENBQXJCOztBQUNBLFlBQUlELE1BQU0sS0FBSyxJQUFmLEVBQXFCO0FBQ2pCMUcsVUFBQUEsTUFBTSxDQUFDNkcsb0JBQVAsQ0FBNEIvRCxNQUFNLENBQUNmLE1BQW5DLEVBQTJDLFlBQU07QUFDN0MvQixZQUFBQSxNQUFNLENBQUM4RyxzQkFBUCxDQUNJaEUsTUFBTSxDQUFDZixNQURYLEVBRUk2RSxZQUZKLEVBR0l2SSxnQkFBZ0IsQ0FBQzBJLGFBSHJCO0FBS0gsV0FORDtBQU9ILFNBUkQsTUFRTztBQUNIL0csVUFBQUEsTUFBTSxDQUFDOEcsc0JBQVAsQ0FBOEJoRSxNQUFNLENBQUNmLE1BQXJDLEVBQTZDNkUsWUFBN0MsRUFBMkR2SSxnQkFBZ0IsQ0FBQzBJLGFBQTVFO0FBQ0g7O0FBQ0QsZUFBTyxJQUFQO0FBQ0g7QUF0QkUsS0FEWCxFQXlCS3BILEtBekJMLENBeUJXLE1BekJYO0FBMEJILEdBNVlvQjs7QUE4WXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSW9ILEVBQUFBLGFBblpxQix5QkFtWlAzQixNQW5aTyxFQW1aQztBQUNsQjdHLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJFLFdBQWQsQ0FBMEIsVUFBMUI7O0FBQ0EsUUFBSWtDLE1BQU0sS0FBSyxJQUFmLEVBQXFCO0FBQ2pCM0IsTUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQjtBQUNILEtBRkQsTUFFTztBQUNIcEYsTUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0JpRSxNQUF0QjtBQUNBLFVBQUl3RSxZQUFZLEdBQUk1QixNQUFNLENBQUM2QixJQUFQLEtBQWdCaEQsU0FBakIsR0FBOEJtQixNQUFNLENBQUM2QixJQUFyQyxHQUE0QyxFQUEvRDtBQUNBRCxNQUFBQSxZQUFZLEdBQUdBLFlBQVksQ0FBQ2hJLE9BQWIsQ0FBcUIsS0FBckIsRUFBNEIsTUFBNUIsQ0FBZjtBQUNBd0csTUFBQUEsV0FBVyxDQUFDUyxlQUFaLENBQTRCZSxZQUE1QixFQUEwQzlDLGVBQWUsQ0FBQ2dELHFCQUExRDtBQUNIO0FBQ0osR0E3Wm9COztBQStackI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lyRixFQUFBQSxjQXhhcUIsMEJBd2FOc0YsRUF4YU0sRUF3YUZDLEVBeGFFLEVBd2FFQyxPQXhhRixFQXdhVztBQUM1QixRQUFNQyxlQUFlLEdBQUdELE9BQU8sSUFBSUEsT0FBTyxDQUFDQyxlQUEzQztBQUNBLFFBQU1DLFVBQVUsR0FBR0YsT0FBTyxJQUFJQSxPQUFPLENBQUNFLFVBQXRDO0FBQ0EsUUFBSUMsT0FBTyxHQUFHTCxFQUFFLENBQUNNLEtBQUgsQ0FBUyxHQUFULENBQWQ7QUFDQSxRQUFJQyxPQUFPLEdBQUdOLEVBQUUsQ0FBQ0ssS0FBSCxDQUFTLEdBQVQsQ0FBZDs7QUFFQSxhQUFTRSxXQUFULENBQXFCQyxDQUFyQixFQUF3QjtBQUNwQixhQUFPLENBQUNOLGVBQWUsR0FBRyxnQkFBSCxHQUFzQixPQUF0QyxFQUErQ08sSUFBL0MsQ0FBb0RELENBQXBELENBQVA7QUFDSDs7QUFFRCxRQUFJLENBQUNKLE9BQU8sQ0FBQ00sS0FBUixDQUFjSCxXQUFkLENBQUQsSUFBK0IsQ0FBQ0QsT0FBTyxDQUFDSSxLQUFSLENBQWNILFdBQWQsQ0FBcEMsRUFBZ0U7QUFDNUQsYUFBT0ksR0FBUDtBQUNIOztBQUVELFFBQUlSLFVBQUosRUFBZ0I7QUFDWixhQUFPQyxPQUFPLENBQUN4RixNQUFSLEdBQWlCMEYsT0FBTyxDQUFDMUYsTUFBaEM7QUFBd0N3RixRQUFBQSxPQUFPLENBQUM5RyxJQUFSLENBQWEsR0FBYjtBQUF4Qzs7QUFDQSxhQUFPZ0gsT0FBTyxDQUFDMUYsTUFBUixHQUFpQndGLE9BQU8sQ0FBQ3hGLE1BQWhDO0FBQXdDMEYsUUFBQUEsT0FBTyxDQUFDaEgsSUFBUixDQUFhLEdBQWI7QUFBeEM7QUFDSDs7QUFFRCxRQUFJLENBQUM0RyxlQUFMLEVBQXNCO0FBQ2xCRSxNQUFBQSxPQUFPLEdBQUdBLE9BQU8sQ0FBQ1EsR0FBUixDQUFZQyxNQUFaLENBQVY7QUFDQVAsTUFBQUEsT0FBTyxHQUFHQSxPQUFPLENBQUNNLEdBQVIsQ0FBWUMsTUFBWixDQUFWO0FBQ0g7O0FBRUQsU0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHVixPQUFPLENBQUN4RixNQUE1QixFQUFvQ2tHLENBQUMsSUFBSSxDQUF6QyxFQUE0QztBQUN4QyxVQUFJUixPQUFPLENBQUMxRixNQUFSLEtBQW1Ca0csQ0FBdkIsRUFBMEI7QUFDdEIsZUFBTyxDQUFQO0FBQ0g7O0FBQ0QsVUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsS0FBZVIsT0FBTyxDQUFDUSxDQUFELENBQTFCLEVBQStCLENBQzNCO0FBQ0gsT0FGRCxNQUVPLElBQUlWLE9BQU8sQ0FBQ1UsQ0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNoQyxlQUFPLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLENBQUMsQ0FBUjtBQUNIO0FBQ0o7O0FBRUQsUUFBSVYsT0FBTyxDQUFDeEYsTUFBUixLQUFtQjBGLE9BQU8sQ0FBQzFGLE1BQS9CLEVBQXVDO0FBQ25DLGFBQU8sQ0FBQyxDQUFSO0FBQ0g7O0FBRUQsV0FBTyxDQUFQO0FBQ0g7QUFsZG9CLENBQXpCLEMsQ0FzZEE7O0FBQ0F6RCxDQUFDLENBQUM0SixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCL0osRUFBQUEsZ0JBQWdCLENBQUNrQixVQUFqQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIFBieEV4dGVuc2lvblN0YXR1cywga2V5Q2hlY2sgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgZXh0ZW5zaW9uTW9kdWxlc1xuICogQG1lbWJlcm9mIG1vZHVsZTpQYnhFeHRlbnNpb25Nb2R1bGVzXG4gKi9cbmNvbnN0IGV4dGVuc2lvbk1vZHVsZXMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZVRhYmxlOiAkKCcjbmV3LW1vZHVsZXMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbmZvcm1hdGlvbiB3aGVuIG5vIGFueSBtb2R1bGVzIGF2YWlsYWJsZSB0byBpbnN0YWxsLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG5vTmV3TW9kdWxlc1NlZ21lbnQ6ICQoJyNuby1uZXctbW9kdWxlcy1zZWdtZW50JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9hZGVyIGluc3RlYWQgb2YgYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VMb2FkZXI6ICQoJyNuZXctbW9kdWxlcy1sb2FkZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGluc3RhbGxlZCBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGluc3RhbGxlZE1vZHVsZXNUYWJsZTogJCgnI2luc3RhbGxlZC1tb2R1bGVzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgY2hlY2tib3hlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRjaGVja2JveGVzOiAkKCcubW9kdWxlLXJvdyAuY2hlY2tib3gnKSxcblxuICAgICRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuXG4gICAgJGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cbiAgICBwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXG4gICAgcGJ4TGljZW5zZTogZ2xvYmFsUEJYTGljZW5zZS50cmltKCksXG5cbiAgICBjaGVja0JveGVzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIGljb24gd2l0aCBwb3B1cCB0ZXh0XG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcG9wdXBPbkNsaWNrOiAkKCdpLnBvcHVwLW9uLWNsaWNrJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI3BieC1leHRlbnNpb25zLXRhYi1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXMgbGlzdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRwb3B1cE9uQ2xpY2sucG9wdXAoe1xuICAgICAgICAgICAgb24gICAgOiAnY2xpY2snLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiB7XG4gICAgICAgICAgICAgICAgcG9wdXA6ICd1aSBwb3B1cCB3aWRlJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBQYnhBcGkuTW9kdWxlc0dldEF2YWlsYWJsZShleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGluc3RhbGxlZE1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXZcbiAgICAgICAgJCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoPjApe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZG93bmxvYWQgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLmRvd25sb2FkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgICRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICRhTGluay5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy5wYnhMaWNlbnNlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSB1cGRhdGUgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG4gICAgICAgICAgICBwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMucGJ4TGljZW5zZSA9PT0gJycpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRlbGV0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLnVwZGF0ZScpO1xuICAgICAgICBpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGNoZWNraW5nIHRoZSBsaWNlbnNlLlxuICAgICAqIElmIHRoZSBmZWF0dXJlIGlzIGNhcHR1cmVkLCBpdCBtYWtlcyBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlclxuICAgICAqIHRvIGdldCB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBsaWNlbnNlIGNoZWNrLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJMaWNlbnNlQ2hlY2socGFyYW1zLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRNb2R1bGVMaW5rKFxuICAgICAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUsXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gZmFsc2UgJiYgcGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9MaWNlbnNlUHJvYmxlbUhlYWRlciwgcGFyYW1zKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9MaWNlbnNlUHJvYmxlbUhlYWRlciwgW2dsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlXSk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzdWNjZXNzZnVsbHkgb2J0YWluaW5nIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGxpbmsgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSByZXF1ZXN0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBtb2R1bGUgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSkge1xuICAgICAgICBjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG4gICAgICAgIHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICBuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcbiAgICAgICAgICAgIG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG4gICAgICAgICAgICBpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLnJlbW92ZUNsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSB3ZWJzaXRlIGZhaWxzIHRvIHByb3ZpZGUgdGhlIG1vZHVsZSBpbnN0YWxsYXRpb24gbGluayBkdWUgdG8gdGhlIHJlcXVpcmVkIGZlYXR1cmUgbm90IGJlaW5nIGNhcHR1cmVkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICovXG4gICAgY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgIH1cbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfR2V0TGlua0Vycm9yKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbCBhIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHJlcXVlc3QgcGFyYW1ldGVycy5cbiAgICAgKi9cbiAgICBpbnN0YWxsTW9kdWxlKHBhcmFtcykge1xuICAgICAgICBQYnhBcGkuTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcmVxdWVzdCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcbiAgICAgICAgLy8gQXNrIHRoZSB1c2VyIGlmIHRoZXkgd2FudCB0byBrZWVwIHRoZSBzZXR0aW5nc1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cbiAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGVuYWJsZWQsIGlmIGVuYWJsZWQsIGRpc2FibGUgaXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0Rpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzVW5JbnN0YWxsTW9kdWxlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZWVwU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZGVsZXRpbmcgYSBtb2R1bGUuXG4gICAgICogSWYgc3VjY2Vzc2Z1bCwgcmVsb2FkIHRoZSBwYWdlOyBpZiBub3QsIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIFRoZSByZXN1bHQgb2YgdGhlIG1vZHVsZSBkZWxldGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXaGV0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZXMgdGFibGVcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19