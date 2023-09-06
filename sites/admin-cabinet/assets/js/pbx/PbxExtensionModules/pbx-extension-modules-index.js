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

        if (window.pbxExtensionMenuAddition !== undefined) {
          pbxExtensionMenuAddition.updateSidebarMenu();
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsInZhbCIsInRyaW0iLCJjb21tZXJjaWFsIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiUGJ4QXBpIiwiTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkIiwiY2JBZnRlckxpY2Vuc2VDaGVjayIsImRlbGV0ZU1vZHVsZSIsInBvcHVwIiwic2hvdyIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsInJlc3VsdCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X05vTGljZW5zZUF2YWlsYWJsZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsImV4dF9HZXRMaW5rRXJyb3IiLCJzdGF0dXMiLCJjaGVja2JveCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJuZWVkRW5hYmxlIiwiRmlsZXNEb3dubG9hZE5ld01vZHVsZSIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwicGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUdBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCLHdCQU9YO0FBQ1pWLElBQUFBLGdCQUFnQixDQUFDRyxnQkFBakIsQ0FBa0NRLEtBQWxDO0FBQ0FYLElBQUFBLGdCQUFnQixDQUFDWSxtQkFBakI7QUFDQUMsSUFBQUEsU0FB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Q1UsQ0FBRCxDQUFQLEtBQWVSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUExQixFQUErQixDQUM5QjtBQUNBLE9BRkQsTUFFTyxJQUFJVixPQUFPLENBQUNVLENBQUQsQ0FBUCxHQUFhUixPQUFPLENBQUNRLENBQUQsQ0FBeEIsRUFBNkI7QUFDbkMsZUFBTyxDQUFQO0FBQ0EsT0FGTSxNQUVBO0FBQ04sZUFBTyxDQUFDLENBQVI7QUFDQTtBQUNEOztBQUVELFFBQUlWLE9BQU8sQ0FBQy9GLE1BQVIsS0FBbUJpRyxPQUFPLENBQUNqRyxNQUEvQixFQUF1QztBQUN0QyxhQUFPLENBQUMsQ0FBUjtBQUNBOztBQUVELFdBQU8sQ0FBUDtBQUNBO0FBaFl1QixDQUF6QjtBQW9ZQTFDLENBQUMsQ0FBQ29KLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ2SixFQUFBQSxnQkFBZ0IsQ0FBQ1UsVUFBakI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXBkYXRlQXBpLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMgKi9cblxuXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuXHQkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cdCRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuXHQka2VlcFNldHRpbmdzQ2hlY2tib3g6ICQoJyNrZWVwTW9kdWxlU2V0dGluZ3MnKSxcblx0JG1vZHVsZXNUYWJsZTogJCgnI21vZHVsZXMtdGFibGUnKSxcblx0cGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblx0Y2hlY2tCb3hlczogW10sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cdFx0VXBkYXRlQXBpLmdldE1vZHVsZXNVcGRhdGVzKGV4dGVuc2lvbk1vZHVsZXMuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGNoZWNrYm94ZXMuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgdW5pcUlkID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG5cdFx0XHRwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCBmYWxzZSk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNoZWNrQm94ZXMucHVzaChwYWdlU3RhdHVzKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kbW9kdWxlc1RhYmxlLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0YXV0b1dpZHRoOiBmYWxzZSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0JCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L/QuNGB0LrQsCDQvNC+0LTRg9C70LXQuSDQv9C+0LvRg9GH0LXQvdC90YUg0YEg0YHQsNC50YLQsFxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L/QvtC00YXQvtC00LjRgiDQu9C4INC/0L4g0L3QvtC80LXRgNGDINCy0LXRgNGB0LjQuCDRjdGC0L7RgiDQvNC+0LTRg9C70Ywg0Log0JDQotChXG5cdFx0XHRjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuXHRcdFx0Y29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG5cdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8g0JjRidC10Lwg0YHRgNC10LTQuCDRg9GB0YLQsNC90L7QstC70LXQvdC90YvRhSwg0L/RgNC10LTQu9C+0LbQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdFx0XHRjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0XHRpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0XHRcdGlmICgkbmV3TW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdFx0JG5ld01vZHVsZVJvdy5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkKCdhLmRvd25sb2FkJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ2luc3RhbGwnO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXHRcdFx0aWYoJCgnI2xpY2Vuc2Uta2V5JykudmFsKCkudHJpbSgpID09PSAnJyAmJiBwYXJhbXMuY29tbWVyY2lhbCAhPT0gJzAnKXtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvbW9kaWZ5L3BieC1leHRlbnNpb24tbW9kdWxlc2A7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0UGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0JCgnYS51cGRhdGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICd1cGRhdGUnO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblx0XHRcdGlmKCQoJyNsaWNlbnNlLWtleScpLnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgcGFyYW1zLmNvbW1lcmNpYWwgIT09ICcwJyl7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL21vZGlmeS9wYngtZXh0ZW5zaW9uLW1vZHVsZXNgO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdCQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuXHRcdH0pO1xuXHRcdCQoJ2FbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0L7Qv9C40YHQsNC90LjQtSDQtNC+0YHRgtGD0L/QvdC+0LPQviDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG5cdFx0JCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuXHRcdGxldCBwcm9tb0xpbmsgPSAnJztcblx0XHRpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuXHRcdFx0cHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcblx0XHR9XG5cblx0XHRsZXQgYWRkaXRpb25hbEljb24gPSAnJztcblx0XHRpZihvYmouY29tbWVyY2lhbCAhPT0gJzAnKXtcblx0XHRcdGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwiaWNvbiByZWQgY2FydCBhcnJvdyBkb3duXCI+PC9pPic7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdGArYWRkaXRpb25hbEljb24rYFxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvdHI+YDtcblx0XHQkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQutC90L7Qv9C60YMg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0YDQvtC5INCy0LXRgNGB0LjQuCBQQlhcblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG5cdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCkuZmluZCgnYS51cGRhdGUnKTtcblx0XHRpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuXHRcdFx0Y29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcblx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcblx0XHRjb25zdCBkeW5hbWljQnV0dG9uXG5cdFx0XHQ9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkXCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG5cdFx0JG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YTQuNGH0LAg0LfQsNGF0LLQsNGH0LXQvdCwLCDQvtCx0YDQsNGJ0LDQtdC80YHRjyDQuiDRgdC10YDQstC10YDRg1xuXHQgKiDQvtCx0L3QvtCy0LvQtdC90LjQuSDQt9CwINC/0L7Qu9GD0YfQtdC90LjQuNC10Lwg0LTQuNGB0YLRgNC40LHRg9GC0LjQstCwXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3VsdFxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMsIHJlc3VsdCkge1xuXHRcdGlmIChyZXN1bHQ9PT10cnVlKXtcblx0XHRcdFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcblx0XHRcdFx0cGFyYW1zLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3VsdD09PWZhbHNlICYmIHBhcmFtcy5sZW5ndGggPiAwKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQstC10YDQvdGD0Lsg0YHRgdGL0LvQutGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpIHtcblx0XHRjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuXHRcdFx0bmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcblx0XHRcdGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlTW9kdWxlKG5ld1BhcmFtcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0L7RgtC60LDQt9Cw0Lsg0LIg0L7QsdC90L7QstC70LXQvdC40LgsINC90LUg0LfQsNGF0LLQsNGH0LXQvdCwINC90YPQttC90LDRjyDRhNC40YfQsFxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0fVxuXHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKi9cblx0dXBkYXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70LXQvdC40LUg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICogQHBhcmFtIG5lZWRFbmFibGUgLSDQstC60LvRjtGH0LjRgtGMINC70Lgg0LzQvtC00YPQu9GMINC/0L7RgdC70LUg0YPRgdGC0LDQvdC+0LLQutC4P1xuXHQgKi9cblx0aW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcblx0XHRQYnhBcGkuRmlsZXNEb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG5cdFx0XHRcdGlmKHdpbmRvdy5wYnhFeHRlbnNpb25NZW51QWRkaXRpb24gIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnVwZGF0ZVNpZGViYXJNZW51KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINGD0LTQsNC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAuXG5cdCAqL1xuXHRkZWxldGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8gQ9C/0YDQvtGB0LjQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdG9uRGVueTogKCkgPT4ge1xuXHRcdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRcdFx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0Y29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUoXG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0XHRcdFx0XHRrZWVwU2V0dGluZ3MsXG5cdFx0XHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdH0pXG5cdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC60L7QvNCw0L3QtNGLIHVuaW5zdGFsbCDQtNC70Y8g0LzQvtC00YPQu9GPXG5cdCAqINCV0YHQu9C4INGD0YHQv9C10YjQvdC+LCDQv9C10YDQtdCz0YDRg9C30LjQvCDRgdGC0YDQsNC90LjRhtGDLCDQtdGB0LvQuCDQvdC10YIsINGC0L4g0YHQvtC+0LHRidC40Lwg0L7QsSDQvtGI0LjQsdC60LVcblx0ICogQHBhcmFtIHJlc3VsdCAtINGA0LXQt9GD0LvRjNGC0LDRgiDRg9C00LDQu9C10L3QuNGPINC80L7QtNGD0LvRj1xuXHQgKi9cblx0Y2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRcdGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuXHRcdFx0ZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0KHRgNCw0LLQvdC10L3QuNC1INCy0LXRgNGB0LjQuSDQvNC+0LTRg9C70LXQuVxuXHQgKiBAcGFyYW0gdjFcblx0ICogQHBhcmFtIHYyXG5cdCAqIEBwYXJhbSBvcHRpb25zXG5cdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdCAqL1xuXHR2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuXHRcdGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcblx0XHRsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG5cdFx0bGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuXHRcdFx0cmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuXHRcdH1cblxuXHRcdGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG5cdFx0XHRyZXR1cm4gTmFOO1xuXHRcdH1cblxuXHRcdGlmICh6ZXJvRXh0ZW5kKSB7XG5cdFx0XHR3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0XHR3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFsZXhpY29ncmFwaGljYWwpIHtcblx0XHRcdHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdFx0djJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHQvL1xuXHRcdFx0fSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH0sXG5cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==