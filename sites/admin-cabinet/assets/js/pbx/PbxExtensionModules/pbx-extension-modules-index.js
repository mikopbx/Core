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

      if ($('#license-key').val().trim() === '' && params.licProductId !== '0') {
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
      PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsInZhbCIsInRyaW0iLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJQYnhBcGkiLCJMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJjYkFmdGVyTGljZW5zZUNoZWNrIiwiZGVsZXRlTW9kdWxlIiwicG9wdXAiLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiYWRkaXRpb25hbEljb24iLCJjb21tZXJjaWFsIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsInJlc3VsdCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X05vTGljZW5zZUF2YWlsYWJsZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsImV4dF9HZXRMaW5rRXJyb3IiLCJzdGF0dXMiLCJjaGVja2JveCIsIlN5c3RlbURpc2FibGVNb2R1bGUiLCJuZWVkRW5hYmxlIiwiRmlsZXNEb3dubG9hZE5ld01vZHVsZSIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwicGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uIiwidXBkYXRlU2lkZWJhck1lbnUiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUdBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCLHdCQU9YO0FBQ1pWLElBQUFBLGdCQUFnQixDQUFDRyxnQkFBakIsQ0FBa0NRLEtBQWxDO0FBQ0FYLElBQUFBLGdCQUFnQixDQUFDWSxtQkFBakI7QUFDQUMsSUFBQUEsU0FB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QUFSO0FBQ0E7QUFDRDs7QUFFRCxRQUFJVixPQUFPLENBQUMvRixNQUFSLEtBQW1CaUcsT0FBTyxDQUFDakcsTUFBL0IsRUFBdUM7QUFDdEMsYUFBTyxDQUFDLENBQVI7QUFDQTs7QUFFRCxXQUFPLENBQVA7QUFDQTtBQTVYdUIsQ0FBekI7QUFnWUExQyxDQUFDLENBQUNvSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCdkosRUFBQUEsZ0JBQWdCLENBQUNVLFVBQWpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVwZGF0ZUFwaSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgUGJ4RXh0ZW5zaW9uU3RhdHVzICovXG5cblxuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblx0JGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cdCRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG5cdHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdGNoZWNrQm94ZXM6IFtdLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXHRcdFVwZGF0ZUFwaS5nZXRNb2R1bGVzVXBkYXRlcyhleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuXHRcdFx0cGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG5cdCAqL1xuXHRpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJG1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XSxcblx0XHRcdGF1dG9XaWR0aDogZmFsc2UsXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3JykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC/0LjRgdC60LAg0LzQvtC00YPQu9C10Lkg0L/QvtC70YPRh9C10L3QvdGFINGBINGB0LDQudGC0LBcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC/0L7QtNGF0L7QtNC40YIg0LvQuCDQv9C+INC90L7QvNC10YDRgyDQstC10YDRgdC40Lgg0Y3RgtC+0YIg0LzQvtC00YPQu9GMINC6INCQ0KLQoVxuXHRcdFx0Y29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcblx0XHRcdGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gZXh0ZW5zaW9uTW9kdWxlcy5wYnhWZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vINCY0YnQtdC8INGB0YDQtdC00Lgg0YPRgdGC0LDQvdC+0LLQu9C10L3QvdGL0YUsINC/0YDQtdC00LvQvtC20LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHRcdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0aWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCAkbmV3TW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0XHRpZiAoJG5ld01vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG5ld01vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRcdCRuZXdNb2R1bGVSb3cucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JCgnYS5kb3dubG9hZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICdpbnN0YWxsJztcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblx0XHRcdGlmKCQoJyNsaWNlbnNlLWtleScpLnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgcGFyYW1zLmxpY1Byb2R1Y3RJZCAhPT0gJzAnKXtcblx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1saWNlbnNpbmcvbW9kaWZ5L3BieC1leHRlbnNpb24tbW9kdWxlc2A7XG5cdFx0XHR9ZWxzZXtcblx0XHRcdFx0UGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0JCgnYS51cGRhdGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICd1cGRhdGUnO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuXHRcdH0pO1xuXHRcdCQoJ2FbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0L7Qv9C40YHQsNC90LjQtSDQtNC+0YHRgtGD0L/QvdC+0LPQviDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG5cdFx0JCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuXHRcdGxldCBwcm9tb0xpbmsgPSAnJztcblx0XHRpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuXHRcdFx0cHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcblx0XHR9XG5cblx0XHRsZXQgYWRkaXRpb25hbEljb24gPSAnJztcblx0XHRpZihvYmouY29tbWVyY2lhbCAhPT0gJzAnKXtcblx0XHRcdGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwiaWNvbiByZWQgY2FydCBhcnJvdyBkb3duXCI+PC9pPic7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdGArYWRkaXRpb25hbEljb24rYFxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvdHI+YDtcblx0XHQkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQutC90L7Qv9C60YMg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0YDQvtC5INCy0LXRgNGB0LjQuCBQQlhcblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG5cdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCkuZmluZCgnYS51cGRhdGUnKTtcblx0XHRpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuXHRcdFx0Y29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcblx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcblx0XHRjb25zdCBkeW5hbWljQnV0dG9uXG5cdFx0XHQ9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkXCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG5cdFx0JG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YTQuNGH0LAg0LfQsNGF0LLQsNGH0LXQvdCwLCDQvtCx0YDQsNGJ0LDQtdC80YHRjyDQuiDRgdC10YDQstC10YDRg1xuXHQgKiDQvtCx0L3QvtCy0LvQtdC90LjQuSDQt9CwINC/0L7Qu9GD0YfQtdC90LjQuNC10Lwg0LTQuNGB0YLRgNC40LHRg9GC0LjQstCwXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3VsdFxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMsIHJlc3VsdCkge1xuXHRcdGlmIChyZXN1bHQ9PT10cnVlKXtcblx0XHRcdFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcblx0XHRcdFx0cGFyYW1zLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3VsdD09PWZhbHNlICYmIHBhcmFtcy5sZW5ndGggPiAwKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQstC10YDQvdGD0Lsg0YHRgdGL0LvQutGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpIHtcblx0XHRjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuXHRcdFx0bmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcblx0XHRcdGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlTW9kdWxlKG5ld1BhcmFtcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0L7RgtC60LDQt9Cw0Lsg0LIg0L7QsdC90L7QstC70LXQvdC40LgsINC90LUg0LfQsNGF0LLQsNGH0LXQvdCwINC90YPQttC90LDRjyDRhNC40YfQsFxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0fVxuXHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKi9cblx0dXBkYXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70LXQvdC40LUg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICogQHBhcmFtIG5lZWRFbmFibGUgLSDQstC60LvRjtGH0LjRgtGMINC70Lgg0LzQvtC00YPQu9GMINC/0L7RgdC70LUg0YPRgdGC0LDQvdC+0LLQutC4P1xuXHQgKi9cblx0aW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcblx0XHRQYnhBcGkuRmlsZXNEb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG5cdFx0XHRcdGlmKHdpbmRvdy5wYnhFeHRlbnNpb25NZW51QWRkaXRpb24gIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnVwZGF0ZVNpZGViYXJNZW51KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINGD0LTQsNC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAuXG5cdCAqL1xuXHRkZWxldGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8gQ9C/0YDQvtGB0LjQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdG9uRGVueTogKCkgPT4ge1xuXHRcdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRcdFx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0Y29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUoXG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0XHRcdFx0XHRrZWVwU2V0dGluZ3MsXG5cdFx0XHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdH0pXG5cdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC60L7QvNCw0L3QtNGLIHVuaW5zdGFsbCDQtNC70Y8g0LzQvtC00YPQu9GPXG5cdCAqINCV0YHQu9C4INGD0YHQv9C10YjQvdC+LCDQv9C10YDQtdCz0YDRg9C30LjQvCDRgdGC0YDQsNC90LjRhtGDLCDQtdGB0LvQuCDQvdC10YIsINGC0L4g0YHQvtC+0LHRidC40Lwg0L7QsSDQvtGI0LjQsdC60LVcblx0ICogQHBhcmFtIHJlc3VsdCAtINGA0LXQt9GD0LvRjNGC0LDRgiDRg9C00LDQu9C10L3QuNGPINC80L7QtNGD0LvRj1xuXHQgKi9cblx0Y2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRcdGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuXHRcdFx0ZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0KHRgNCw0LLQvdC10L3QuNC1INCy0LXRgNGB0LjQuSDQvNC+0LTRg9C70LXQuVxuXHQgKiBAcGFyYW0gdjFcblx0ICogQHBhcmFtIHYyXG5cdCAqIEBwYXJhbSBvcHRpb25zXG5cdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdCAqL1xuXHR2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuXHRcdGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcblx0XHRsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG5cdFx0bGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuXHRcdFx0cmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuXHRcdH1cblxuXHRcdGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG5cdFx0XHRyZXR1cm4gTmFOO1xuXHRcdH1cblxuXHRcdGlmICh6ZXJvRXh0ZW5kKSB7XG5cdFx0XHR3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0XHR3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFsZXhpY29ncmFwaGljYWwpIHtcblx0XHRcdHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdFx0djJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHQvL1xuXHRcdFx0fSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH0sXG5cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==