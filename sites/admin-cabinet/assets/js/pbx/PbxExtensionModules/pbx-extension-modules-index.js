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
var extensionModules = {
  $checkboxes: $('.module-row .checkbox'),
  $deleteModalForm: $('#delete-modal-form'),
  $keepSettingsCheckbox: $('#keepModuleSettings'),
  $modulesTable: $('#modules-table'),
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),
  checkBoxes: [],
  initialize: function initialize() {
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

    var additionalIcon = '';

    if (obj.commercial !== '0') {
      additionalIcon = '<i class="icon red cart arrow down"></i>';
    }

    var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui button download\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\t\t\t\t\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t") + additionalIcon + "\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>";
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
      PbxApi.SystemDisableModule(params.uniqid, function () {
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
    PbxApi.FilesDownloadNewModule(params, function (response) {
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
          PbxApi.SystemDisableModule(params.uniqid, function () {
            PbxApi.SystemDeleteModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
          });
        } else {
          PbxApi.SystemDeleteModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsInZhbCIsInRyaW0iLCJjb21tZXJjaWFsIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiUGJ4QXBpIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwiY2JBZnRlckxpY2Vuc2VDaGVjayIsImRlbGV0ZU1vZHVsZSIsInBvcHVwIiwic2hvdyIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsInJlc3VsdCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X05vTGljZW5zZUF2YWlsYWJsZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsImV4dF9HZXRMaW5rRXJyb3IiLCJzdGF0dXMiLCJjaGVja2JveCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJuZWVkRW5hYmxlIiwiRmlsZXNEb3dubG9hZE5ld01vZHVsZSIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImNiQWZ0ZXJEZWxldGUiLCJlcnJvck1lc3NhZ2UiLCJkYXRhIiwiZXh0X0RlbGV0ZU1vZHVsZUVycm9yIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJldmVyeSIsIk5hTiIsIm1hcCIsIk51bWJlciIsImkiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFHQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUNyQkMsRUFBQUEsV0FBVyxFQUFFQyxDQUFDLENBQUMsdUJBQUQsQ0FETztBQUVyQkMsRUFBQUEsZ0JBQWdCLEVBQUVELENBQUMsQ0FBQyxvQkFBRCxDQUZFO0FBR3JCRSxFQUFBQSxxQkFBcUIsRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBSEg7QUFJckJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLGdCQUFELENBSks7QUFLckJJLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBTFM7QUFNckJDLEVBQUFBLFVBQVUsRUFBRSxFQU5TO0FBT3JCQyxFQUFBQSxVQVBxQix3QkFPUjtBQUNUVixJQUFBQSxnQkFBZ0IsQ0FBQ0csZ0JBQWpCLENBQWtDUSxLQUFsQztBQUNBWCxJQUFBQSxnQkFBZ0IsQ0FBQ1ksbUJBQWpCO0FBQ0FDLElBQUFBLFNBQVMsQ0FBQ0MsaUJBQVYsQ0FBNEJkLGdCQUFnQixDQUFDZSxvQkFBN0M7QUFDQWYs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Q0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNoQyxlQUFPLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLENBQUMsQ0FBUjtBQUNIO0FBQ0o7O0FBRUQsUUFBSVYsT0FBTyxDQUFDN0YsTUFBUixLQUFtQitGLE9BQU8sQ0FBQy9GLE1BQS9CLEVBQXVDO0FBQ25DLGFBQU8sQ0FBQyxDQUFSO0FBQ0g7O0FBRUQsV0FBTyxDQUFQO0FBQ0g7QUF0Wm9CLENBQXpCLEMsQ0EwWkE7O0FBQ0ExQyxDQUFDLENBQUNrSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCckosRUFBQUEsZ0JBQWdCLENBQUNVLFVBQWpCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXBkYXRlQXBpLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMgKi9cblxuXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuICAgICRjaGVja2JveGVzOiAkKCcubW9kdWxlLXJvdyAuY2hlY2tib3gnKSxcbiAgICAkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcbiAgICAka2VlcFNldHRpbmdzQ2hlY2tib3g6ICQoJyNrZWVwTW9kdWxlU2V0dGluZ3MnKSxcbiAgICAkbW9kdWxlc1RhYmxlOiAkKCcjbW9kdWxlcy10YWJsZScpLFxuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG4gICAgY2hlY2tCb3hlczogW10sXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICBVcGRhdGVBcGkuZ2V0TW9kdWxlc1VwZGF0ZXMoZXh0ZW5zaW9uTW9kdWxlcy5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuJGNoZWNrYm94ZXMuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdW5pcUlkID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG4gICAgICAgICAgICBwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCBmYWxzZSk7XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNoZWNrQm94ZXMucHVzaChwYWdlU3RhdHVzKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy4kbW9kdWxlc1RhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiBmYWxzZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE1vdmUgdGhlIFwiQWRkIE5ld1wiIGJ1dHRvbiB0byB0aGUgZmlyc3QgZWlnaHQtY29sdW1uIGRpdlxuICAgICAgICAkKCcuYWRkLW5ldycpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyB0aGUgbGlzdCBvZiBtb2R1bGVzIHJlY2VpdmVkIGZyb20gdGhlIHdlYnNpdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpc3Qgb2YgbW9kdWxlcy5cbiAgICAgKi9cbiAgICBjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuICAgICAgICByZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBtb2R1bGUgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBQQlggYmFzZWQgb24gdmVyc2lvbiBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IGV4dGVuc2lvbk1vZHVsZXMucGJ4VmVyc2lvbjtcbiAgICAgICAgICAgIGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgb2ZmZXIgYW4gdXBkYXRlXG4gICAgICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgICAgICBpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJG5ld01vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJG5ld01vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9sZFZlciA9ICRuZXdNb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgIGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRuZXdNb2R1bGVSb3cucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGhlIGRvd25sb2FkIGxpbmsgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnYS5kb3dubG9hZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG4gICAgICAgICAgICAkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcbiAgICAgICAgICAgIHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuICAgICAgICAgICAgcGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmFjdGlvbiA9ICdpbnN0YWxsJztcbiAgICAgICAgICAgIHBhcmFtcy5hTGluayA9ICRhTGluaztcbiAgICAgICAgICAgIGlmICgkKCcjbGljZW5zZS1rZXknKS52YWwoKS50cmltKCkgPT09ICcnICYmIHBhcmFtcy5jb21tZXJjaWFsICE9PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9tb2RpZnkvcGJ4LWV4dGVuc2lvbi1tb2R1bGVzYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgdXBkYXRlIGxpbmsgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnYS51cGRhdGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgY29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICAgICAgJGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuICAgICAgICAgICAgcGFyYW1zLmFjdGlvbiA9ICd1cGRhdGUnO1xuICAgICAgICAgICAgcGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG4gICAgICAgICAgICBwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcbiAgICAgICAgICAgIHBhcmFtcy5hTGluayA9ICRhTGluaztcbiAgICAgICAgICAgIGlmICgkKCcjbGljZW5zZS1rZXknKS52YWwoKS50cmltKCkgPT09ICcnICYmIHBhcmFtcy5jb21tZXJjaWFsICE9PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9tb2RpZnkvcGJ4LWV4dGVuc2lvbi1tb2R1bGVzYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0aGUgZGVsZXRlIGxpbmsgY2xpY2sgZXZlbnQuXG4gICAgICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0LlxuICAgICAgICAgKi9cbiAgICAgICAgJCgnYS5kZWxldGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IFtdO1xuICAgICAgICAgICAgY29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuZGVsZXRlTW9kdWxlKHBhcmFtcyk7XG4gICAgICAgIH0pO1xuICAgICAgICAkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgZGVzY3JpcHRpb24gZm9yIGFuIGF2YWlsYWJsZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG4gICAgICAgICQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICcnO1xuICAgICAgICBpZiAob2JqLmNvbW1lcmNpYWwgIT09ICcwJykge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJpY29uIHJlZCBjYXJ0IGFycm93IGRvd25cIj48L2k+JztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwibmV3LW1vZHVsZS1yb3dcIiBpZD1cIiR7b2JqLnVuaXFpZH1cIj5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9PGJyPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbil9ICR7cHJvbW9MaW5rfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRldmVsb3Blcil9PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHZlcnNpb25cIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgXHRcdFx0XHRcdFx0XHQ8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIGRvd25sb2FkXCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHRgICsgYWRkaXRpb25hbEljb24gKyBgXG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLnVwZGF0ZScpO1xuICAgICAgICBpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcblx0XHRcdGRhdGEtdmVyID1cIiR7b2JqLnZlcnNpb259XCJcblx0XHRcdGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcblx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBjaGVja2luZyB0aGUgbGljZW5zZS5cbiAgICAgKiBJZiB0aGUgZmVhdHVyZSBpcyBjYXB0dXJlZCwgaXQgbWFrZXMgYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXJcbiAgICAgKiB0byBnZXQgdGhlIG1vZHVsZSBpbnN0YWxsYXRpb24gbGluay5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSByZXF1ZXN0LlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcmVzdWx0IC0gVGhlIHJlc3VsdCBvZiB0aGUgbGljZW5zZSBjaGVjay5cbiAgICAgKi9cbiAgICBjYkFmdGVyTGljZW5zZUNoZWNrKHBhcmFtcywgcmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcbiAgICAgICAgICAgICAgICBwYXJhbXMsXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXN1bHQgPT09IGZhbHNlICYmIHBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zKTtcbiAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0xpY2Vuc2VBdmFpbGFibGUpO1xuICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciBzdWNjZXNzZnVsbHkgb2J0YWluaW5nIHRoZSBtb2R1bGUgaW5zdGFsbGF0aW9uIGxpbmsgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtZXRlcnMgZm9yIHRoZSByZXF1ZXN0LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBtb2R1bGUgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSkge1xuICAgICAgICBjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG4gICAgICAgIHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICBuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcbiAgICAgICAgICAgIG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG4gICAgICAgICAgICBpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy51cGRhdGVNb2R1bGUobmV3UGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZyByZWRvJykucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJyk7XG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcywgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHdoZW4gdGhlIHdlYnNpdGUgZmFpbHMgdG8gcHJvdmlkZSB0aGUgbW9kdWxlIGluc3RhbGxhdGlvbiBsaW5rIGR1ZSB0byB0aGUgcmVxdWlyZWQgZmVhdHVyZSBub3QgYmVpbmcgY2FwdHVyZWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSBwYXJhbWV0ZXJzIGZvciB0aGUgcmVxdWVzdC5cbiAgICAgKi9cbiAgICBjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZShwYXJhbXMpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgfVxuICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9HZXRMaW5rRXJyb3IpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIG1vZHVsZSBieSBmaXJzdCBkaXNhYmxpbmcgaXQsIGlmIHBvc3NpYmxlLCB0aGVuIHNlbmRpbmcgYSBjb21tYW5kIGZvciB1cGRhdGUsIGFuZCByZWZyZXNoaW5nIHRoZSBwYWdlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcmVxdWVzdCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIHVwZGF0ZU1vZHVsZShwYXJhbXMpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBlbmFibGVkLCBpZiBzbywgZGlzYWJsZSBpdFxuICAgICAgICBjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IHRydWUpIHtcbiAgICAgICAgICAgIFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcbiAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGwgYSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIFRoZSByZXF1ZXN0IHBhcmFtZXRlcnMuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBuZWVkRW5hYmxlIC0gV2hldGhlciB0byBlbmFibGUgdGhlIG1vZHVsZSBhZnRlciBpbnN0YWxsYXRpb24uXG4gICAgICovXG4gICAgaW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcbiAgICAgICAgUGJ4QXBpLkZpbGVzRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogRGVsZXRlIGEgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcmVxdWVzdCBwYXJhbWV0ZXJzLlxuICAgICAqL1xuICAgIGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcbiAgICAgICAgLy8gQXNrIHRoZSB1c2VyIGlmIHRoZXkgd2FudCB0byBrZWVwIHRoZSBzZXR0aW5nc1xuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cbiAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uRGVueTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGVuYWJsZWQsIGlmIGVuYWJsZWQsIGRpc2FibGUgaXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2VlcFNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIGRlbGV0aW5nIGEgbW9kdWxlLlxuICAgICAqIElmIHN1Y2Nlc3NmdWwsIHJlbG9hZCB0aGUgcGFnZTsgaWYgbm90LCBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2UuXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBUaGUgcmVzdWx0IG9mIHRoZSBtb2R1bGUgZGVsZXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgaWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENvbXBhcmUgdmVyc2lvbnMgb2YgbW9kdWxlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjEgLSBUaGUgZmlyc3QgdmVyc2lvbiB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MiAtIFRoZSBzZWNvbmQgdmVyc2lvbiB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gLSBPcHRpb25hbCBjb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZXhpY29ncmFwaGljYWxdIC0gV2hldGhlciB0byBwZXJmb3JtIGxleGljb2dyYXBoaWNhbCBjb21wYXJpc29uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy56ZXJvRXh0ZW5kXSAtIFdoZXRoZXIgdG8gemVyby1leHRlbmQgdGhlIHNob3J0ZXIgdmVyc2lvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IC0gQSBudW1iZXIgaW5kaWNhdGluZyB0aGUgY29tcGFyaXNvbiByZXN1bHQ6IDAgaWYgdmVyc2lvbnMgYXJlIGVxdWFsLCAxIGlmIHYxIGlzIGdyZWF0ZXIsIC0xIGlmIHYyIGlzIGdyZWF0ZXIsIG9yIE5hTiBpZiB0aGUgdmVyc2lvbnMgYXJlIGludmFsaWQuXG4gICAgICovXG4gICAgdmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG4gICAgICAgIGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcbiAgICAgICAgbGV0IHYxcGFydHMgPSB2MS5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgdjJwYXJ0cyA9IHYyLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuICAgICAgICAgICAgcmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcbiAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoemVyb0V4dGVuZCkge1xuICAgICAgICAgICAgd2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuICAgICAgICAgICAgd2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFsZXhpY29ncmFwaGljYWwpIHtcbiAgICAgICAgICAgIHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgdjJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LFxuXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlcyB0YWJsZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=