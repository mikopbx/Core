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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCIkbWFya2V0cGxhY2VMb2FkZXIiLCIkaW5zdGFsbGVkTW9kdWxlc1RhYmxlIiwiJGNoZWNrYm94ZXMiLCIkZGVsZXRlTW9kYWxGb3JtIiwiJGtlZXBTZXR0aW5nc0NoZWNrYm94IiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwicGJ4TGljZW5zZSIsImdsb2JhbFBCWExpY2Vuc2UiLCJ0cmltIiwiY2hlY2tCb3hlcyIsIiR0YWJNZW51SXRlbXMiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwibW9kYWwiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiUGJ4QXBpIiwiTW9kdWxlc0dldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwidW5pcUlkIiwiYXR0ciIsInBhZ2VTdGF0dXMiLCJQYnhFeHRlbnNpb25TdGF0dXMiLCJwdXNoIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJhdXRvV2lkdGgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJyZXNwb25zZSIsImhpZGUiLCJtb2R1bGVzIiwiZm9yRWFjaCIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCIkbW9kdWxlUm93IiwidW5pcWlkIiwibGVuZ3RoIiwib2xkVmVyIiwiZmluZCIsInRleHQiLCJuZXdWZXIiLCJ2ZXJzaW9uIiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCIkbmV3TW9kdWxlUm93IiwicmVtb3ZlIiwiYWRkTW9kdWxlRGVzY3JpcHRpb24iLCJzaG93Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsImR5bWFuaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsImxpY19wcm9kdWN0X2lkIiwibGljX2ZlYXR1cmVfaWQiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJGN1cnJlbnRVcGRhdGVCdXR0b24iLCJkeW5hbWljQnV0dG9uIiwiZXh0X1VwZGF0ZU1vZHVsZSIsInByZXBlbmQiLCJyZXN1bHQiLCJNb2R1bGVzR2V0TW9kdWxlTGluayIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUiLCJVc2VyTWVzc2FnZSIsInNob3dMaWNlbnNlRXJyb3IiLCJleHRfTGljZW5zZVByb2JsZW1IZWFkZXIiLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJpbnN0YWxsTW9kdWxlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X0dldExpbmtFcnJvciIsIk1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwic3RhdHVzIiwiY2hlY2tib3giLCJrZWVwU2V0dGluZ3MiLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJjYkFmdGVyRGVsZXRlIiwiZXJyb3JNZXNzYWdlIiwiZGF0YSIsImV4dF9EZWxldGVNb2R1bGVFcnJvciIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJtYXAiLCJOdW1iZXIiLCJpIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUVyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBTkM7O0FBUXJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFRCxDQUFDLENBQUMseUJBQUQsQ0FaRjs7QUFjckI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsa0JBQWtCLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQWxCQTs7QUFvQnJCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLHNCQUFzQixFQUFFSCxD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aW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMsIGtleUNoZWNrICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBsaXN0IG9mIGV4dGVuc2lvbiBtb2R1bGVzLlxuICogQGNsYXNzIGV4dGVuc2lvbk1vZHVsZXNcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VUYWJsZTogJCgnI25ldy1tb2R1bGVzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRpbnN0YWxsZWRNb2R1bGVzVGFibGU6ICQoJyNpbnN0YWxsZWQtbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGNoZWNrYm94ZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblxuICAgICRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIHBieExpY2Vuc2U6IGdsb2JhbFBCWExpY2Vuc2UudHJpbSgpLFxuXG4gICAgY2hlY2tCb3hlczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFidWxhciBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI3BieC1leHRlbnNpb25zLXRhYi1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXMgbGlzdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblxuICAgICAgICBQYnhBcGkuTW9kdWxlc0dldEF2YWlsYWJsZShleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcbiAgICAgICAgICAgIHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGluc3RhbGxlZE1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBNb3ZlIHRoZSBcIkFkZCBOZXdcIiBidXR0b24gdG8gdGhlIGZpcnN0IGVpZ2h0LWNvbHVtbiBkaXZcbiAgICAgICAgJCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoPjApe1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZG93bmxvYWQgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLmRvd25sb2FkJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgICRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICRhTGluay5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy5wYnhMaWNlbnNlID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSB1cGRhdGUgbGluayBjbGljayBldmVudC5cbiAgICAgICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QuXG4gICAgICAgICAqL1xuICAgICAgICAkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG4gICAgICAgICAgICBwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG4gICAgICAgICAgICBwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMucGJ4TGljZW5zZSA9PT0gJycpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRlbGV0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLnVwZGF0ZScpO1xuICAgICAgICBpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGNoZWNraW5nIHRoZSBsaWNlbnNlLlxuICAgICAqIElmIHRoZSBmZWF0dXJlIGlzIGNhcHR1cmVkLCBpdCBtYWtlcyBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlclxuICAgICAqIHRvIGdldCB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBsaWNlbnNlIGNoZWNrLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJMaWNlbnNlQ2hlY2socGFyYW1zLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRNb2R1bGVMaW5rKFxuICAgICAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUsXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gZmFsc2UgJiYgcGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9MaWNlbnNlUHJvYmxlbUhlYWRlciwgcGFyYW1zKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dMaWNlbnNlRXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9MaWNlbnNlUHJvYmxlbUhlYWRlciwgW2dsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlXSk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzdWNjZXNzZnVsbHkgb2J0YWluaW5nIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGxpbmsgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSByZXF1ZXN0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBtb2R1bGUgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSkge1xuICAgICAgICBjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG4gICAgICAgIHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICBuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcbiAgICAgICAgICAgIG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG4gICAgICAgICAgICBpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLnJlbW92ZUNsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB3aGVuIHRoZSB3ZWJzaXRlIGZhaWxzIHRvIHByb3ZpZGUgdGhlIG1vZHVsZSBpbnN0YWxsYXRpb24gbGluayBkdWUgdG8gdGhlIHJlcXVpcmVkIGZlYXR1cmUgbm90IGJlaW5nIGNhcHR1cmVkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICovXG4gICAgY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgIH1cbiAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfR2V0TGlua0Vycm9yKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbCBhIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHJlcXVlc3QgcGFyYW1ldGVycy5cbiAgICAgKi9cbiAgICBpbnN0YWxsTW9kdWxlKHBhcmFtcykge1xuICAgICAgICBQYnhBcGkuTW9kdWxlc01vZHVsZVN0YXJ0RG93bmxvYWQocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcmVxdWVzdCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcbiAgICAgICAgLy8gQXNrIHRoZSB1c2VyIGlmIHRoZXkgd2FudCB0byBrZWVwIHRoZSBzZXR0aW5nc1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cbiAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGVuYWJsZWQsIGlmIGVuYWJsZWQsIGRpc2FibGUgaXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0Rpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFBieEFwaS5Nb2R1bGVzVW5JbnN0YWxsTW9kdWxlKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXMudW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZWVwU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgZGVsZXRpbmcgYSBtb2R1bGUuXG4gICAgICogSWYgc3VjY2Vzc2Z1bCwgcmVsb2FkIHRoZSBwYWdlOyBpZiBub3QsIGRpc3BsYXkgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIFRoZSByZXN1bHQgb2YgdGhlIG1vZHVsZSBkZWxldGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG4gICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXaGV0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZXMgdGFibGVcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19