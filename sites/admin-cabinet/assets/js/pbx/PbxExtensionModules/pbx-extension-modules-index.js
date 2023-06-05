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

/* global globalRootUrl, PbxApi, globalTranslate, UpdateApi, UserMessage, globalPBXVersion, SemanticLocalization, upgradeStatusLoopWorker, PbxExtensionStatus */

/**
 * Represents list of extension modules.
 * @class extensionModules
 * @memberof module:PbxExtensionModules
 */
var extensionModules = {
  $checkboxes: $('.module-row .checkbox'),
  $deleteModalForm: $('#delete-modal-form'),
  $keepSettingsCheckbox: $('#keepModuleSettings'),
  $modulesTable: $('#modules-table'),
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),
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
    UpdateApi.getModulesUpdates(extensionModules.cbParseModuleUpdates);
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
    extensionModules.$modulesTable.DataTable({
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

      if ($('#license-key').val().trim() === '' && params.commercial !== '0') {
        window.location = "".concat(globalRootUrl, "licensing/modify/pbx-extension-modules");
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

      if ($('#license-key').val().trim() === '' && params.commercial !== '0') {
        window.location = "".concat(globalRootUrl, "licensing/modify/pbx-extension-modules");
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
    $('#online-updates-block').show();
    var promoLink = '';

    if (obj.promo_link !== undefined && obj.promo_link !== null) {
      promoLink = "<br><a href=\"".concat(obj.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a>");
    }

    var additionalIcon = '<i class="puzzle piece icon"></i>';

    if (obj.commercial !== '0') {
      additionalIcon = '<i class="ui donate icon"></i>';
    }

    var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui button download\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\t\t\t\t\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>");
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
    var dynamicButton = "<a href=\"#\" class=\"ui button update popuped\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-ver =\"").concat(obj.version, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t<span class=\"percent\"></span>\n\t\t\t</a>");
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
      UpdateApi.GetModuleInstallLink(params, extensionModules.cbGetModuleInstallLinkSuccess, extensionModules.cbGetModuleInstallLinkFailure);
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
        extensionModules.updateModule(newParams);
      } else {
        params.aLink.find('i').addClass('loading redo').removeClass('download');
        extensionModules.installModule(newParams, false);
      }
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
   * Update the module by first disabling it, if possible, then sending a command for update, and refreshing the page.
   * @param {Object} params - The request parameters.
   */
  updateModule: function updateModule(params) {
    // Check if the module is enabled, if so, disable it
    var status = $("#".concat(params.uniqid)).find('.checkbox').checkbox('is checked');

    if (status === true) {
      PbxApi.ModulesDisableModule(params.uniqid, function () {
        extensionModules.installModule(params, true);
      });
    } else {
      extensionModules.installModule(params, false);
    }
  },

  /**
   * Install a module.
   * @param {Object} params - The request parameters.
   * @param {boolean} needEnable - Whether to enable the module after installation.
   */
  installModule: function installModule(params, needEnable) {
    PbxApi.ModulesModuleStartDownload(params, function (response) {
      if (response === true) {
        upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiJHRhYk1lbnVJdGVtcyIsImluaXRpYWxpemUiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJtb2RhbCIsImluaXRpYWxpemVEYXRhVGFibGUiLCJVcGRhdGVBcGkiLCJnZXRNb2R1bGVzVXBkYXRlcyIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiZWFjaCIsImluZGV4Iiwib2JqIiwidW5pcUlkIiwiYXR0ciIsInBhZ2VTdGF0dXMiLCJQYnhFeHRlbnNpb25TdGF0dXMiLCJwdXNoIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJhdXRvV2lkdGgiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiYXBwZW5kVG8iLCJyZXNwb25zZSIsIm1vZHVsZXMiLCJmb3JFYWNoIiwibWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYIiwibWluX3BieF92ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJsZW5ndGgiLCJvbGRWZXIiLCJmaW5kIiwidGV4dCIsIm5ld1ZlciIsInZlcnNpb24iLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsIiRuZXdNb2R1bGVSb3ciLCJyZW1vdmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJwYXJhbXMiLCIkYUxpbmsiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlQ2xhc3MiLCJyZWxlYXNlSWQiLCJzaXplIiwibGljUHJvZHVjdElkIiwibGljRmVhdHVyZUlkIiwiYWN0aW9uIiwiYUxpbmsiLCJ2YWwiLCJ0cmltIiwiY29tbWVyY2lhbCIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIlBieEFwaSIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImR5bWFuaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsImxpY19wcm9kdWN0X2lkIiwibGljX2ZlYXR1cmVfaWQiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJGN1cnJlbnRVcGRhdGVCdXR0b24iLCJkeW5hbWljQnV0dG9uIiwiZXh0X1VwZGF0ZU1vZHVsZSIsInByZXBlbmQiLCJyZXN1bHQiLCJHZXRNb2R1bGVJbnN0YWxsTGluayIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9Ob0xpY2Vuc2VBdmFpbGFibGUiLCJuZXdQYXJhbXMiLCJtZDUiLCJ1cGRhdGVMaW5rIiwiaHJlZiIsInVwZGF0ZU1vZHVsZSIsImluc3RhbGxNb2R1bGUiLCJleHRfR2V0TGlua0Vycm9yIiwic3RhdHVzIiwiY2hlY2tib3giLCJNb2R1bGVzRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJNb2R1bGVzTW9kdWxlU3RhcnREb3dubG9hZCIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImtlZXBTZXR0aW5ncyIsIk1vZHVsZXNVbkluc3RhbGxNb2R1bGUiLCJjYkFmdGVyRGVsZXRlIiwiZXJyb3JNZXNzYWdlIiwiZGF0YSIsImV4dF9EZWxldGVNb2R1bGVFcnJvciIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJtYXAiLCJOdW1iZXIiLCJpIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQkMsRUFBQUEsV0FBVyxFQUFFQyxDQUFDLENBQUMsdUJBQUQsQ0FETztBQUVyQkMsRUFBQUEsZ0JBQWdCLEVBQUVELENBQUMsQ0FBQyxvQkFBRCxDQUZFO0FBR3JCRSxFQUFBQSxxQkFBcUIsRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBSEg7QUFJckJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLGdCQUFELENBSks7QUFLckJJLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBTFM7QUFNckJDLEVBQUFBLFVBQVUsRUFBRSxFQU5TOztBQVFyQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVSLENBQUMsQ0FBQyxnQ0FBRCxDQVpLOztBQWNyQjtBQUNKO0FBQ0E7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TUFBWixDQUFWO0FBQ0g7O0FBRUQsU0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHVixPQUFPLENBQUM3RixNQUE1QixFQUFvQ3VHLENBQUMsSUFBSSxDQUF6QyxFQUE0QztBQUN4QyxVQUFJUixPQUFPLENBQUMvRixNQUFSLEtBQW1CdUcsQ0FBdkIsRUFBMEI7QUFDdEIsZUFBTyxDQUFQO0FBQ0g7O0FBQ0QsVUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsS0FBZVIsT0FBTyxDQUFDUSxDQUFELENBQTFCLEVBQStCLENBQzNCO0FBQ0gsT0FGRCxNQUVPLElBQUlWLE9BQU8sQ0FBQ1UsQ0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNoQyxlQUFPLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLENBQUMsQ0FBUjtBQUNIO0FBQ0o7O0FBRUQsUUFBSVYsT0FBTyxDQUFDN0YsTUFBUixLQUFtQitGLE9BQU8sQ0FBQy9GLE1BQS9CLEVBQXVDO0FBQ25DLGFBQU8sQ0FBQyxDQUFSO0FBQ0g7O0FBRUQsV0FBTyxDQUFQO0FBQ0g7QUFyYW9CLENBQXpCLEMsQ0F5YUE7O0FBQ0E5QyxDQUFDLENBQUNzSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCekosRUFBQUEsZ0JBQWdCLENBQUNXLFVBQWpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXBkYXRlQXBpLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgZXh0ZW5zaW9uTW9kdWxlc1xuICogQG1lbWJlcm9mIG1vZHVsZTpQYnhFeHRlbnNpb25Nb2R1bGVzXG4gKi9cbmNvbnN0IGV4dGVuc2lvbk1vZHVsZXMgPSB7XG4gICAgJGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuICAgICRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuICAgICRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuICAgICRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcbiAgICBjaGVja0JveGVzOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJ1bGFyIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjcGJ4LWV4dGVuc2lvbnMtdGFiLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uTW9kdWxlcyBsaXN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgVXBkYXRlQXBpLmdldE1vZHVsZXNVcGRhdGVzKGV4dGVuc2lvbk1vZHVsZXMuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuICAgICAgICAgICAgcGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbW9kdWxlc1RhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIFwiQWRkIE5ld1wiIGJ1dHRvbiB0byB0aGUgZmlyc3QgZWlnaHQtY29sdW1uIGRpdlxuICAgICAgICAkKCcuYWRkLW5ldycpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgdGhlIGxpc3Qgb2YgbW9kdWxlcyByZWNlaXZlZCBmcm9tIHRoZSB3ZWJzaXRlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaXN0IG9mIG1vZHVsZXMuXG4gICAgICovXG4gICAgY2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2UpIHtcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRoZSBkb3dubG9hZCBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZG93bmxvYWQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgY29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgJGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG4gICAgICAgICAgICBpZiAoJCgnI2xpY2Vuc2Uta2V5JykudmFsKCkudHJpbSgpID09PSAnJyAmJiBwYXJhbXMuY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvbW9kaWZ5L3BieC1leHRlbnNpb24tbW9kdWxlc2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIHVwZGF0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EudXBkYXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgICAgICRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hY3Rpb24gPSAndXBkYXRlJztcbiAgICAgICAgICAgIHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG4gICAgICAgICAgICBpZiAoJCgnI2xpY2Vuc2Uta2V5JykudmFsKCkudHJpbSgpID09PSAnJyAmJiBwYXJhbXMuY29tbWVyY2lhbCAhPT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvbW9kaWZ5L3BieC1leHRlbnNpb24tbW9kdWxlc2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRlbGV0ZSBsaW5rIGNsaWNrIGV2ZW50LlxuICAgICAgICAgKiBAcGFyYW0ge0V2ZW50fSBlIC0gVGhlIGNsaWNrIGV2ZW50IG9iamVjdC5cbiAgICAgICAgICovXG4gICAgICAgICQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBbXTtcbiAgICAgICAgICAgIGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgJCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICAkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG4gICAgICAgIGxldCBwcm9tb0xpbmsgPSAnJztcbiAgICAgICAgaWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4nO1xuICAgICAgICBpZiAob2JqLmNvbW1lcmNpYWwgIT09ICcwJykge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJ1aSBkb25hdGUgaWNvblwiPjwvaT4nO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7YWRkaXRpb25hbEljb259ICR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2E+XG4gICAgXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L3RyPmA7XG4gICAgICAgICQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiB1cGRhdGUgYnV0dG9uIHRvIHRoZSBtb2R1bGUgcm93IGZvciB1cGRhdGluZyBhbiBvbGQgdmVyc2lvbiBvZiBQQlguXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnRVcGRhdGVCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EudXBkYXRlJyk7XG4gICAgICAgIGlmICgkY3VycmVudFVwZGF0ZUJ1dHRvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBvbGRWZXIgPSAkY3VycmVudFVwZGF0ZUJ1dHRvbi5hdHRyKCdkYXRhLXZlcicpO1xuICAgICAgICAgICAgY29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPD0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvblxuICAgICAgICAgICAgPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGNoZWNraW5nIHRoZSBsaWNlbnNlLlxuICAgICAqIElmIHRoZSBmZWF0dXJlIGlzIGNhcHR1cmVkLCBpdCBtYWtlcyBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlclxuICAgICAqIHRvIGdldCB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBsaWNlbnNlIGNoZWNrLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJMaWNlbnNlQ2hlY2socGFyYW1zLCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgVXBkYXRlQXBpLkdldE1vZHVsZUluc3RhbGxMaW5rKFxuICAgICAgICAgICAgICAgIHBhcmFtcyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUsXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCA9PT0gZmFsc2UgJiYgcGFyYW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X05vTGljZW5zZUF2YWlsYWJsZSk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHN1Y2Nlc3NmdWxseSBvYnRhaW5pbmcgdGhlIG1vZHVsZSBpbnN0YWxsYXRpb24gbGluayBmcm9tIHRoZSB3ZWJzaXRlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1ldGVycyBmb3IgdGhlIHJlcXVlc3QuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIG1vZHVsZSBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnN0IG5ld1BhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgIG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuICAgICAgICAgICAgbmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcbiAgICAgICAgICAgIGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLnVwZGF0ZU1vZHVsZShuZXdQYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUobmV3UGFyYW1zLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gd2hlbiB0aGUgd2Vic2l0ZSBmYWlscyB0byBwcm92aWRlIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGxpbmsgZHVlIHRvIHRoZSByZXF1aXJlZCBmZWF0dXJlIG5vdCBiZWluZyBjYXB0dXJlZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSByZXF1ZXN0LlxuICAgICAqL1xuICAgIGNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlKHBhcmFtcykge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICBpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuICAgICAgICB9XG4gICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgbW9kdWxlIGJ5IGZpcnN0IGRpc2FibGluZyBpdCwgaWYgcG9zc2libGUsIHRoZW4gc2VuZGluZyBhIGNvbW1hbmQgZm9yIHVwZGF0ZSwgYW5kIHJlZnJlc2hpbmcgdGhlIHBhZ2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICovXG4gICAgdXBkYXRlTW9kdWxlKHBhcmFtcykge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGVuYWJsZWQsIGlmIHNvLCBkaXNhYmxlIGl0XG4gICAgICAgIGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNEaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGwgYSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBuZWVkRW5hYmxlIC0gV2hldGhlciB0byBlbmFibGUgdGhlIG1vZHVsZSBhZnRlciBpbnN0YWxsYXRpb24uXG4gICAgICovXG4gICAgaW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNNb2R1bGVTdGFydERvd25sb2FkKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHBhcmFtcy51bmlxaWQsIG5lZWRFbmFibGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBhIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHJlcXVlc3QgcGFyYW1ldGVycy5cbiAgICAgKi9cbiAgICBkZWxldGVNb2R1bGUocGFyYW1zKSB7XG4gICAgICAgIC8vIEFzayB0aGUgdXNlciBpZiB0aGV5IHdhbnQgdG8ga2VlcCB0aGUgc2V0dGluZ3NcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG4gICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBlbmFibGVkLCBpZiBlbmFibGVkLCBkaXNhYmxlIGl0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNEaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc1VuSW5zdGFsbE1vZHVsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2VlcFNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNVbkluc3RhbGxNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBkZWxldGluZyBhIG1vZHVsZS5cbiAgICAgKiBJZiBzdWNjZXNzZnVsLCByZWxvYWQgdGhlIHBhZ2U7IGlmIG5vdCwgZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzdWx0IC0gVGhlIHJlc3VsdCBvZiB0aGUgbW9kdWxlIGRlbGV0aW9uLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGUocmVzdWx0KSB7XG4gICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgICAgICBsZXQgZXJyb3JNZXNzYWdlID0gKHJlc3VsdC5kYXRhICE9PSB1bmRlZmluZWQpID8gcmVzdWx0LmRhdGEgOiAnJztcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfRGVsZXRlTW9kdWxlRXJyb3IpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXaGV0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZXMgdGFibGVcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19