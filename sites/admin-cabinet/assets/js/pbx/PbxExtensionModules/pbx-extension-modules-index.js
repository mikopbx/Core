"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
    });
    $('.add-new').appendTo($('div.eight.column:eq(0)'));
  },

  /**
   * Обработка списка модулей полученнх с сайта
   * @param response
   */
  cbParseModuleUpdates: function cbParseModuleUpdates(response) {
    response.modules.forEach(function (obj) {
      // Проверим подходит ли по номеру версии этот модуль к АТС
      var minAppropriateVersionPBX = obj.min_pbx_version;
      var currentVersionPBX = extensionModules.pbxVersion;

      if (extensionModules.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
        return;
      } // Ищем среди установленных, предложим обновление


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
   * Добавляет описание доступного модуля
   * @param obj
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
   * Добавляет кнопку обновления старой версии PBX
   * @param obj
   */
  addUpdateButtonToRow: function addUpdateButtonToRow(obj) {
    var $moduleRow = $("tr.module-row#".concat(obj.uniqid));
    var $currentUpdateButton = $("tr.module-row#".concat(obj.uniqid)).find('a.update');

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
   * Если фича захвачена, обращаемся к серверу
   * обновлений за получениием дистрибутива
   * @param params
   * @param result
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
   * Если сайт вернул ссылку на обновление
   * @param params
   * @param response
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
   * Если сайт отказал в обновлении, не захвачена нужная фича
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
   * Сначала отключим модуль, если получится, то отправим команду на обновление
   * и обновим страничку
   * @param params - параметры запроса
   */
  updateModule: function updateModule(params) {
    // Проверим включен ли модуль, если включен, вырубим его
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
   * Обновление модуля
   * @param params - параметры запроса
   * @param needEnable - включить ли модуль после установки?
   */
  installModule: function installModule(params, needEnable) {
    PbxApi.FilesDownloadNewModule(params, function (response) {
      if (response === true) {
        upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
        window.location.reload();
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
   * Сначала отключим модуль, если получится, то отправим команду на удаление
   * и обновим страничку
   * @param params - параметры запроса.
   */
  deleteModule: function deleteModule(params) {
    // Cпросим пользователя сохранять ли настройки
    extensionModules.$deleteModalForm.modal({
      closable: false,
      onDeny: function onDeny() {
        $('a.button').removeClass('disabled');
        return true;
      },
      onApprove: function onApprove() {
        // Проверим включен ли модуль, если включен, вырубим его
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
   * Обработчик команды uninstall для модуля
   * Если успешно, перегрузим страницу, если нет, то сообщим об ошибке
   * @param result - результат удаления модуля
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
   * Сравнение версий модулей
   * @param v1
   * @param v2
   * @param options
   * @returns {number}
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
};
$(document).ready(function () {
  extensionModules.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsInZhbCIsInRyaW0iLCJjb21tZXJjaWFsIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiUGJ4QXBpIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwiY2JBZnRlckxpY2Vuc2VDaGVjayIsImRlbGV0ZU1vZHVsZSIsInBvcHVwIiwic2hvdyIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsInJlc3VsdCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X05vTGljZW5zZUF2YWlsYWJsZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsImV4dF9HZXRMaW5rRXJyb3IiLCJzdGF0dXMiLCJjaGVja2JveCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJuZWVkRW5hYmxlIiwiRmlsZXNEb3dubG9hZE5ld01vZHVsZSIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwicmVsb2FkIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImNiQWZ0ZXJEZWxldGUiLCJlcnJvck1lc3NhZ2UiLCJkYXRhIiwiZXh0X0RlbGV0ZU1vZHVsZUVycm9yIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJldmVyeSIsIk5hTiIsIm1hcCIsIk51bWJlciIsImkiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFHQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUN4QkMsRUFBQUEsV0FBVyxFQUFFQyxDQUFDLENBQUMsdUJBQUQsQ0FEVTtBQUV4QkMsRUFBQUEsZ0JBQWdCLEVBQUVELENBQUMsQ0FBQyxvQkFBRCxDQUZLO0FBR3hCRSxFQUFBQSxxQkFBcUIsRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBSEE7QUFJeEJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLGdCQUFELENBSlE7QUFLeEJJLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBTFk7QUFNeEJDLEVBQUFBLFVBQVUsRUFBRSxFQU5ZO0FBT3hCQyxFQUFBQSxVQVB3Qix3QkFPWDtBQUNaVixJQUFBQSxnQkFBZ0IsQ0FBQ0csZ0JBQWpCLENBQWtDUSxLQUFsQztBQUNBWCxJQUFBQSxnQkFBZ0IsQ0FBQ1ksbUJBQWpCO0FBQ0FDLElBQUFBLFNBQVMsQ0FBQ0MsaUJBQVYsQ0FBNEJkLGdCQUFnQixDQUFDZSxvQkFB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Q0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNuQyxlQUFPLENBQVA7QUFDQSxPQUZNLE1BRUE7QUFDTixlQUFPLENBQUMsQ0FBUjtBQUNBO0FBQ0Q7O0FBRUQsUUFBSVYsT0FBTyxDQUFDOUYsTUFBUixLQUFtQmdHLE9BQU8sQ0FBQ2hHLE1BQS9CLEVBQXVDO0FBQ3RDLGFBQU8sQ0FBQyxDQUFSO0FBQ0E7O0FBRUQsV0FBTyxDQUFQO0FBQ0E7QUE5WHVCLENBQXpCO0FBa1lBMUMsQ0FBQyxDQUFDbUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnRKLEVBQUFBLGdCQUFnQixDQUFDVSxVQUFqQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVcGRhdGVBcGksIFVzZXJNZXNzYWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIFBieEV4dGVuc2lvblN0YXR1cyAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbk1vZHVsZXMgPSB7XG5cdCRjaGVja2JveGVzOiAkKCcubW9kdWxlLXJvdyAuY2hlY2tib3gnKSxcblx0JGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG5cdCRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXHQkbW9kdWxlc1RhYmxlOiAkKCcjbW9kdWxlcy10YWJsZScpLFxuXHRwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXHRjaGVja0JveGVzOiBbXSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0XHRVcGRhdGVBcGkuZ2V0TW9kdWxlc1VwZGF0ZXMoZXh0ZW5zaW9uTW9kdWxlcy5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcblx0XHRcdHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRtb2R1bGVzVGFibGUuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdF0sXG5cdFx0XHRhdXRvV2lkdGg6IGZhbHNlLFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHR9KTtcblx0XHQkKCcuYWRkLW5ldycpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0YHQv9C40YHQutCwINC80L7QtNGD0LvQtdC5INC/0L7Qu9GD0YfQtdC90L3RhSDRgSDRgdCw0LnRgtCwXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2UpIHtcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQv9C+0LTRhdC+0LTQuNGCINC70Lgg0L/QviDQvdC+0LzQtdGA0YMg0LLQtdGA0YHQuNC4INGN0YLQvtGCINC80L7QtNGD0LvRjCDQuiDQkNCi0KFcblx0XHRcdGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG5cdFx0XHRjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IGV4dGVuc2lvbk1vZHVsZXMucGJ4VmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyDQmNGJ0LXQvCDRgdGA0LXQtNC4INGD0YHRgtCw0L3QvtCy0LvQtdC90L3Ri9GFLCDQv9GA0LXQtNC70L7QttC40Lwg0L7QsdC90L7QstC70LXQvdC40LVcblx0XHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgJG5ld01vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdFx0aWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRuZXdNb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0XHQkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoJ2EuZG93bmxvYWQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cdFx0XHRpZigkKCcjbGljZW5zZS1rZXknKS52YWwoKS50cmltKCkgPT09ICcnICYmIHBhcmFtcy5jb21tZXJjaWFsICE9PSAnMCcpe1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWxpY2Vuc2luZy9tb2RpZnkvcGJ4LWV4dGVuc2lvbi1tb2R1bGVzYDtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXHRcdFx0aWYoJCgnI2xpY2Vuc2Uta2V5JykudmFsKCkudHJpbSgpID09PSAnJyAmJiBwYXJhbXMuY29tbWVyY2lhbCAhPT0gJzAnKXtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvbW9kaWZ5L3BieC1leHRlbnNpb24tbW9kdWxlc2A7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0UGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0JCgnYS5kZWxldGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IFtdO1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignaWQnKTtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuZGVsZXRlTW9kdWxlKHBhcmFtcyk7XG5cdFx0fSk7XG5cdFx0JCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcblx0fSxcblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQvtC/0LjRgdCw0L3QuNC1INC00L7RgdGC0YPQv9C90L7Qs9C+INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gb2JqXG5cdCAqL1xuXHRhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IHByb21vTGluayA9ICcnO1xuXHRcdGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG5cdFx0XHRwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuXHRcdH1cblxuXHRcdGxldCBhZGRpdGlvbmFsSWNvbiA9ICcnO1xuXHRcdGlmKG9iai5jb21tZXJjaWFsICE9PSAnMCcpe1xuXHRcdFx0YWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJpY29uIHJlZCBjYXJ0IGFycm93IGRvd25cIj48L2k+Jztcblx0XHR9XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZFwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0XHRcdFx0XHRcdFx0YCthZGRpdGlvbmFsSWNvbitgXG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuXHRcdCQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcblx0fSxcblxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC60L3QvtC/0LrRgyDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGC0LDRgNC+0Lkg0LLQtdGA0YHQuNC4IFBCWFxuXHQgKiBAcGFyYW0gb2JqXG5cdCAqL1xuXHRhZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopIHtcblx0XHRjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0Y29uc3QgJGN1cnJlbnRVcGRhdGVCdXR0b24gPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKS5maW5kKCdhLnVwZGF0ZScpO1xuXHRcdGlmICgkY3VycmVudFVwZGF0ZUJ1dHRvbi5sZW5ndGggPiAwKSB7XG5cdFx0XHRjb25zdCBvbGRWZXIgPSAkY3VycmVudFVwZGF0ZUJ1dHRvbi5hdHRyKCdkYXRhLXZlcicpO1xuXHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPD0gMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCRjdXJyZW50VXBkYXRlQnV0dG9uLnJlbW92ZSgpO1xuXHRcdGNvbnN0IGR5bmFtaWNCdXR0b25cblx0XHRcdD0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcblx0XHRcdGRhdGEtdmVyID1cIiR7b2JqLnZlcnNpb259XCJcblx0XHRcdGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcblx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHQ8L2E+YDtcblx0XHQkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRhNC40YfQsCDQt9Cw0YXQstCw0YfQtdC90LAsINC+0LHRgNCw0YnQsNC10LzRgdGPINC6INGB0LXRgNCy0LXRgNGDXG5cdCAqINC+0LHQvdC+0LLQu9C10L3QuNC5INC30LAg0L/QvtC70YPRh9C10L3QuNC40LXQvCDQtNC40YHRgtGA0LjQsdGD0YLQuNCy0LBcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzdWx0XG5cdCAqL1xuXHRjYkFmdGVyTGljZW5zZUNoZWNrKHBhcmFtcywgcmVzdWx0KSB7XG5cdFx0aWYgKHJlc3VsdD09PXRydWUpe1xuXHRcdFx0VXBkYXRlQXBpLkdldE1vZHVsZUluc3RhbGxMaW5rKFxuXHRcdFx0XHRwYXJhbXMsXG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MsXG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzdWx0PT09ZmFsc2UgJiYgcGFyYW1zLmxlbmd0aCA+IDApe1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcyk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0xpY2Vuc2VBdmFpbGFibGUpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINCy0LXRgNC90YPQuyDRgdGB0YvQu9C60YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSkge1xuXHRcdGNvbnN0IG5ld1BhcmFtcyA9IHBhcmFtcztcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0bmV3UGFyYW1zLm1kNSA9IG9iai5tZDU7XG5cdFx0XHRuZXdQYXJhbXMudXBkYXRlTGluayA9IG9iai5ocmVmO1xuXHRcdFx0aWYgKG5ld1BhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy51cGRhdGVNb2R1bGUobmV3UGFyYW1zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLnJlbW92ZUNsYXNzKCdkb3dubG9hZCcpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUobmV3UGFyYW1zLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQvtGC0LrQsNC30LDQuyDQsiDQvtCx0L3QvtCy0LvQtdC90LjQuCwg0L3QtSDQt9Cw0YXQstCw0YfQtdC90LAg0L3Rg9C20L3QsNGPINGE0LjRh9CwXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZShwYXJhbXMpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHR9XG5cdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfR2V0TGlua0Vycm9yKTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqINC4INC+0LHQvdC+0LLQuNC8INGB0YLRgNCw0L3QuNGH0LrRg1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqL1xuXHR1cGRhdGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShwYXJhbXMsIHRydWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShwYXJhbXMsIGZhbHNlKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvQtdC90LjQtSDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKiBAcGFyYW0gbmVlZEVuYWJsZSAtINCy0LrQu9GO0YfQuNGC0Ywg0LvQuCDQvNC+0LTRg9C70Ywg0L/QvtGB0LvQtSDRg9GB0YLQsNC90L7QstC60Lg/XG5cdCAqL1xuXHRpbnN0YWxsTW9kdWxlKHBhcmFtcywgbmVlZEVuYWJsZSkge1xuXHRcdFBieEFwaS5GaWxlc0Rvd25sb2FkTmV3TW9kdWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcblx0XHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShwYXJhbXMudW5pcWlkLCBuZWVkRW5hYmxlKTtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwYXJhbXMuYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0YPQtNCw0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsC5cblx0ICovXG5cdGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyBD0L/RgNC+0YHQuNC8INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjyDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cblx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0b25EZW55OiAoKSA9PiB7XG5cdFx0XHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdFx0XHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRcdFx0XHRcdGtlZXBTZXR0aW5ncyxcblx0XHRcdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSlcblx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0LrQvtC80LDQvdC00YsgdW5pbnN0YWxsINC00LvRjyDQvNC+0LTRg9C70Y9cblx0ICog0JXRgdC70Lgg0YPRgdC/0LXRiNC90L4sINC/0LXRgNC10LPRgNGD0LfQuNC8INGB0YLRgNCw0L3QuNGG0YMsINC10YHQu9C4INC90LXRgiwg0YLQviDRgdC+0L7QsdGJ0LjQvCDQvtCxINC+0YjQuNCx0LrQtVxuXHQgKiBAcGFyYW0gcmVzdWx0IC0g0YDQtdC30YPQu9GM0YLQsNGCINGD0LTQsNC70LXQvdC40Y8g0LzQvtC00YPQu9GPXG5cdCAqL1xuXHRjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdFx0bGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG5cdFx0XHRlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQodGA0LDQstC90LXQvdC40LUg0LLQtdGA0YHQuNC5INC80L7QtNGD0LvQtdC5XG5cdCAqIEBwYXJhbSB2MVxuXHQgKiBAcGFyYW0gdjJcblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICogQHJldHVybnMge251bWJlcn1cblx0ICovXG5cdHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuXHRcdGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG5cdFx0Y29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuXHRcdGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcblx0XHRsZXQgdjJwYXJ0cyA9IHYyLnNwbGl0KCcuJyk7XG5cblx0XHRmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG5cdFx0XHRyZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcblx0XHRcdHJldHVybiBOYU47XG5cdFx0fVxuXG5cdFx0aWYgKHplcm9FeHRlbmQpIHtcblx0XHRcdHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcblx0XHRcdHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcblx0XHR9XG5cblx0XHRpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuXHRcdFx0djFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG5cdFx0XHR2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblx0XHRcdGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdC8vXG5cdFx0XHR9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gMDtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19